import TestData from "../models/TestModel.js";
export const saveTestData = async (req, res) => {
  const {
    userId,
    courseId,
    quizId,
    score,
    userAnswers,
    quizName,
    totalQuestions,
  } = req.body;

  if (!userId || !courseId || !quizId) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const numericTotalQuestions = Number(totalQuestions || 0);
  const numericScore = Number(score || 0);
  const correct = numericScore;
  const incorrect = numericTotalQuestions - numericScore;
  const percent = numericTotalQuestions
    ? Math.round((numericScore / numericTotalQuestions) * 100)
    : 0;

  try {
    let testData = await TestData.findOne({ userId, courseId });

    const newQuizReport = {
      quizName: quizName || quizId,
      totalQuestions: numericTotalQuestions,
      correct,
      incorrect,
      percent,
      attempts: [numericScore],
      maxScore: numericScore,
      lastScore: numericScore,
      lastUserAnswers: userAnswers || {},
    };

    if (testData) {
      const prevReport = testData.quizReports.get(quizId);
      if (prevReport) {
        newQuizReport.attempts = [...(prevReport.attempts || []), numericScore];
        newQuizReport.maxScore = Math.max(prevReport.maxScore || 0, numericScore);
      }

      testData.set(`score.${quizId}`, numericScore);
      testData.set(`userAnswers.${quizId}`, userAnswers);
      testData.set(`attemptCount.${quizId}`, (prevReport?.attempts?.length || 0) + 1);
      testData.quizReports.set(quizId, newQuizReport);

      await testData.save();
      return res.status(200).json({ message: "✅ Test data updated", data: testData });
    } else {
      const newData = new TestData({
        userId,
        courseId,
        score: { [quizId]: numericScore },
        userAnswers: { [quizId]: userAnswers },
        attemptCount: { [quizId]: 1 },
        quizReports: { [quizId]: newQuizReport },
      });

      await newData.save();
      return res.status(201).json({ message: "✅ Test data created", data: newData });
    }
  } catch (err) {
    console.error("❌ DB Error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// GET test data by userId and courseId
export const getTestData = async (req, res) => {
  const { userId, courseId } = req.query;
  try {
    const data = await TestData.findOne({ userId, courseId });
    if (!data) return res.status(404).json({ message: "No data found" });

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};