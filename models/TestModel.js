import mongoose from "mongoose";

const attemptSchema = new mongoose.Schema({
  score: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now },
  userAnswers: { type: mongoose.Schema.Types.Mixed, default: {} },
});

const reportSchema = new mongoose.Schema({
  quizName: { type: String, default: "Untitled Quiz" },
  totalQuestions: { type: Number, default: 0 },
  maxScore: { type: Number, default: 0 },
  lastScore: { type: Number, default: 0 },
  lastUserAnswers: { type: mongoose.Schema.Types.Mixed, default: {} },
  correct: { type: Number, default: 0 },
  incorrect: { type: Number, default: 0 },
  percent: { type: Number, default: 0 },
  attempts: [attemptSchema],
});

const testSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  quizId: { type: String, required: true },
  score: { type: Number, required: true },
  userAnswers: { type: mongoose.Schema.Types.Mixed, default: {} },
  attemptCount: { type: Number, default: 1 },
  quizReport: reportSchema,
});

testSchema.index({ userId: 1, quizId: 1 }, { unique: true });

const Test = mongoose.model("Test", testSchema);
export default Test;
