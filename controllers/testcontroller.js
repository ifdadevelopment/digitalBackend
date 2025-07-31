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
      attemptCount = null,
      report: quizReport = null,
      courseId = null,
    } = req.body;

    if (!userId || !quizId) {
      return res.status(400).json({ error: "Missing userId or quizId" });
    }

    const safeQuizId = sanitizeKey(quizId);
    let testData = await TestData.findOne({ userId, courseId });

    if (!testData) {
      testData = new TestData({ userId, courseId });
    }

    if (score !== null) testData.score.set(safeQuizId, score);
    if (userAnswers) testData.userAnswers.set(safeQuizId, userAnswers);
    if (attemptCount !== null) testData.attemptCount.set(safeQuizId, attemptCount);
    const defaultReport = {
      quizName: quizId,
      totalQuestions: 0,
      attempts: [],
      maxScore: 0,
      lastScore: 0,
      lastUserAnswers: {},
      correct: 0,
      incorrect: 0,
      percent: 0,
    };

    const existingReport = testData.quizReports.get(safeQuizId) || defaultReport;

    const incomingAttempt = quizReport?.attempts?.[0];
    const updatedAttempts = [
      ...(existingReport.attempts || []),
      ...(incomingAttempt ? [incomingAttempt] : []),
    ];

    const updatedReport = {
      quizName: quizReport?.quizName || existingReport.quizName || quizId,
      totalQuestions: quizReport?.totalQuestions ?? existingReport.totalQuestions ?? 0,
      attempts: updatedAttempts,
      maxScore: Math.max(existingReport.maxScore ?? 0, quizReport?.maxScore ?? 0),
      lastScore: quizReport?.lastScore ?? existingReport.lastScore ?? 0,
      lastUserAnswers: quizReport?.lastUserAnswers ?? existingReport.lastUserAnswers ?? {},
      correct: quizReport?.correct ?? 0,
      incorrect: quizReport?.incorrect ?? 0,
      percent: quizReport?.percent ?? 0,
    };

    testData.quizReports.set(safeQuizId, updatedReport);

    await testData.save();

    return res.status(200).json({
      message: "✅ Test data saved successfully",
      data: {
        quizReports: Object.fromEntries(testData.quizReports),
        userAnswers: Object.fromEntries(testData.userAnswers),
        score: Object.fromEntries(testData.score),
        attemptCount: Object.fromEntries(testData.attemptCount),
      },
      quizId,
    });
  } catch (err) {
    console.error("❌ Error saving test data:", err);
    next(err);
  }
};



const convertMapToObj = (map) => {
  if (!map || typeof map !== 'object') return null;
  if (typeof map.get === 'function') return Object.fromEntries(map);
  return map;
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

    const testData = await TestData.findOne(query).lean();

    if (!testData) {
      return res.status(200).json({
        quizId,
        userAnswers: null,
        score: null,
        attemptCount: null,
        quizReport: null,
        progressPercentage: 0,
        isCompleted: false,
      });
    }

    const {
      userAnswers,
      score,
      attemptCount,
      quizReports,
      completedContent,
    } = testData;

    const quizData = {
      userAnswers: userAnswers?.[safeQuizId] ?? null,
      score: score?.[safeQuizId] ?? null,
      attemptCount: attemptCount?.[safeQuizId] ?? null,
      quizReport: quizReports?.[safeQuizId] ?? null,
    };

    const totalContent = completedContent ? Object.keys(completedContent).length : 0;
    const completedCount = completedContent
      ? Object.values(completedContent).filter(Boolean).length
      : 0;

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


