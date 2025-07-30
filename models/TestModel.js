import mongoose from "mongoose";
const quizReportSchema = new mongoose.Schema(
  {
    quizName: String,
    totalQuestions: Number,
    correct: Number,   
    incorrect: Number,     
    percent: Number,       
    attempts: [Number],
    maxScore: Number,
    lastScore: Number,
    lastUserAnswers: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { _id: false }
);

const testDataSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    courseId: {
      type: String,
      required: true,
    },
    certificates: { type: [String], default: [] },
    score: {
      type: Map,
      of: Number,
      default: {},
    },
    userAnswers: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },
    quizReports: {
      type: Map,
      of: quizReportSchema,
      default: {},
    },
    attemptCount: {
      type: Map,
      of: Number,
      default: {},
    },
    completedContent: {
      type: Map,
      of: Boolean,
      default: {},
    },
    activeModule: {
      type: String,
      default: null,
    },
    selectedTopic: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

testDataSchema.index({ userId: 1, courseId: 1 }, { unique: true });

const TestData = mongoose.model("TestData", testDataSchema);
export default TestData;
