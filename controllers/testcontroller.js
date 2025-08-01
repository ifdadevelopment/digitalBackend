import TestData from "../models/TestModel.js";

function sanitizeKey(key) {
  return key.replace(/\./g, "_");
}

export const saveTestData = async (req, res, next) => {
  try {
    const {
      userId,
      quizId,
      score = null,
      userAnswers = null,
      courseId = null,
      report: quizReport = null,
    } = req.body;

    if (!userId || !quizId) {
      return res.status(400).json({ error: "Missing userId or quizId" });
    }

    const safeQuizId = sanitizeKey(quizId);
    let testData = await TestData.findOne({ userId, courseId });

    if (!testData) {
      testData = new TestData({ userId, courseId });
    }

    const attempt = quizReport?.attempts?.[0];

    if (!attempt) {
      return res.status(400).json({ error: "Missing attempt data in report." });
    }

    const existingReport = testData.quizReports.get(safeQuizId) || {
      quizName: quizReport?.quizName || quizId,
      totalQuestions: quizReport?.totalQuestions || 0,
      attempts: [],
      maxScore: 0,
      lastScore: 0,
      lastUserAnswers: {},
      correct: 0,
      incorrect: 0,
      percent: 0,
    };
    const updatedAttempts = [...(existingReport.attempts || []), attempt];
    if (updatedAttempts.length > 3) {
      updatedAttempts.splice(0, updatedAttempts.length - 3);
    }

    const maxScore = Math.max(existingReport.maxScore, quizReport?.maxScore ?? attempt.score ?? 0);

    const updatedReport = {
      quizName: quizReport?.quizName || existingReport.quizName || quizId,
      totalQuestions: quizReport?.totalQuestions ?? existingReport.totalQuestions ?? 0,
      attempts: updatedAttempts,
      maxScore,
      lastScore: attempt.score,
      lastUserAnswers: attempt.userAnswers || {},
      correct: quizReport?.correct ?? 0,
      incorrect: quizReport?.incorrect ?? 0,
      percent: quizReport?.percent ?? 0,
    };

    testData.quizReports.set(safeQuizId, updatedReport);
    testData.attemptCount.set(safeQuizId, updatedAttempts.length);
    testData.score.set(safeQuizId, attempt.score);
    testData.userAnswers.set(safeQuizId, attempt.userAnswers || {});

    await testData.save();

    return res.status(200).json({
      message: "✅ Test data saved successfully",
      quizId,
      data: {
        quizReports: Object.fromEntries(testData.quizReports),
        userAnswers: Object.fromEntries(testData.userAnswers),
        score: Object.fromEntries(testData.score),
        attemptCount: Object.fromEntries(testData.attemptCount),
      },
    });
  } catch (err) {
    console.error("❌ Error saving test data:", err);
    next(err);
  }
};

export const getTestData = async (req, res, next) => {
  try {
    const { userId, quizId, courseId } = req.query;

    if (!userId || !quizId) {
      return res.status(400).json({ error: "Missing userId or quizId" });
    }

    const safeQuizId = sanitizeKey(quizId);
    const query = { userId };
    if (courseId) query.courseId = courseId;

    const testDataDoc = await TestData.findOne(query);
    if (!testDataDoc) {
      return res.status(200).json({
        quizId,
        userAnswers: {},
        score: {},
        attemptCount: {},
        quizReports: {},
        progressPercentage: 0,
        isCompleted: false,
      });
    }

    // Convert Maps to plain objects
    const userAnswers = Object.fromEntries(testDataDoc.userAnswers || []);
    const score = Object.fromEntries(testDataDoc.score || []);
    const attemptCount = Object.fromEntries(testDataDoc.attemptCount || []);
    const quizReports = Object.fromEntries(testDataDoc.quizReports || []);
    const completedContent = testDataDoc.completedContent || {};

    const quizData = {
      userAnswers,
      score,
      attemptCount,
      quizReports,
    };

    const totalContent = Object.keys(completedContent).length;
    const completedCount = Object.values(completedContent).filter(Boolean).length;

    const progressPercentage = totalContent
      ? Math.round((completedCount / totalContent) * 100)
      : 0;

    const isCompleted = totalContent > 0 && completedCount === totalContent;

    return res.status(200).json({
      quizId,
      ...quizData,
      progressPercentage,
      isCompleted,
    });
  } catch (err) {
    console.error("❌ Error getting test data:", err);
    next(err);
  }
};

