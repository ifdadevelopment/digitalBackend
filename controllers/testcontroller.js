import Test from "../models/TestModel.js";

export const saveTestData = async (req, res) => {
  try {
    const { userId, quizId, score, userAnswers, attemptCount, report } = req.body;

    if (!userId || !quizId) {
      return res.status(400).json({ error: "Missing userId or quizId" });
    }

    const existing = await Test.findOne({ userId, quizId });

    if (existing) {
      const updatedAttempts = [...(existing.quizReport?.attempts || []), {
        score,
        timestamp: new Date(),
        userAnswers,
      }].slice(-3);

      existing.score = score;
      existing.userAnswers = userAnswers;
      existing.attemptCount = updatedAttempts.length;

      existing.quizReport = {
        ...existing.quizReport,
        quizName: report?.quizName || existing.quizReport.quizName,
        totalQuestions: report?.totalQuestions || existing.quizReport.totalQuestions,
        maxScore: Math.max(existing.quizReport.maxScore, score),
        lastScore: score,
        lastUserAnswers: userAnswers,
        correct: report?.correct || 0,
        incorrect: report?.incorrect || 0,
        percent: report?.percent || 0,
        attempts: updatedAttempts,
      };

      await existing.save();
      return res.json(existing);
    }

    // New entry
    const newTest = new Test({
      userId,
      quizId,
      score,
      userAnswers,
      attemptCount,
      quizReport: {
        quizName: report?.quizName || "Untitled Quiz",
        totalQuestions: report?.totalQuestions || 0,
        maxScore: score,
        lastScore: score,
        lastUserAnswers: userAnswers,
        correct: report?.correct || 0,
        incorrect: report?.incorrect || 0,
        percent: report?.percent || 0,
        attempts: [{
          score,
          timestamp: new Date(),
          userAnswers,
        }],
      },
    });

    await newTest.save();
    return res.json(newTest);

  } catch (error) {
    console.error("Save Test Error:", error);
    return res.status(500).json({ error: "Failed to save test data" });
  }
};

export const getTestData = async (req, res) => {
  try {
    const { userId, quizId } = req.query;

    if (!userId || !quizId) {
      return res.status(400).json({ error: "Missing userId or quizId" });
    }

    const testData = await Test.findOne({ userId, quizId });

    if (!testData) {
      return res.json({
        userAnswers: { [quizId]: {} },
        score: { [quizId]: 0 },
        attemptCount: { [quizId]: 0 },
        quizReports: { [quizId]: {
          quizName: "",
          totalQuestions: 0,
          attempts: [],
          maxScore: 0,
          lastScore: 0,
          lastUserAnswers: {},
          correct: 0,
          incorrect: 0,
          percent: 0
        }},
      });
    }

    const report = testData.quizReport || {};
    
    const formattedResponse = {
      userAnswers: { [quizId]: testData.userAnswers || {} },
      score: { [quizId]: testData.score || 0 },
      attemptCount: { [quizId]: testData.attemptCount || 0 },
      quizReports: {
        [quizId]: {
          quizName: report.quizName || "",
          totalQuestions: report.totalQuestions || 0,
          attempts: (report.attempts || []).slice(-3),
          maxScore: report.maxScore || 0,
          lastScore: report.lastScore || 0,
          lastUserAnswers: report.lastUserAnswers || {},
          correct: report.correct || 0,
          incorrect: report.incorrect || 0,
          percent: report.percent || 0,
        }
      }
    };

    return res.json(formattedResponse);
  } catch (error) {
    console.error("Get Test Error:", error);
    return res.status(500).json({ error: "Failed to fetch test data" });
  }
};
