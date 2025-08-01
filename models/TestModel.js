import mongoose from "mongoose";

const attemptSchema = new mongoose.Schema(
  {
    score: { type: Number, required: true },
    timestamp: { type: Date, default: Date.now },
    userAnswers: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { _id: false }
);

const quizReportSchema = new mongoose.Schema(
  {
    quizName: { type: String, required: true },
    totalQuestions: { type: Number, default: 0 },
    correct: { type: Number, default: 0 },
    incorrect: { type: Number, default: 0 },
    percent: { type: Number, default: 0 },
    maxScore: { type: Number, default: 0 },
    lastScore: { type: Number, default: 0 },
    lastUserAnswers: { type: mongoose.Schema.Types.Mixed, default: {} },
    attempts: { type: [attemptSchema], default: [] }, 
  },
  { _id: false }
);

const testDataSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    courseId: {
      type: String,
    },
    certificates: {
      type: [String],
      default: [],
    },
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
    attemptCount: {
      type: Map,
      of: Number,
      default: {},
    },
    quizReports: {
      type: Map,
      of: quizReportSchema,
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
testDataSchema.pre("save", function (next) {
  const quizReports = this.quizReports || new Map();
  const attemptCount = this.attemptCount || new Map();

  quizReports.forEach((report, quizId) => {
    if (Array.isArray(report.attempts)) {
      if (report.attempts.length > 3) {
        report.attempts = report.attempts.slice(-3); 
      }
      attemptCount.set(quizId, report.attempts.length);
    }
  });

  this.attemptCount = attemptCount;
  next();
});

testDataSchema.index({ userId: 1, courseId: 1 }, { unique: true });

const TestData = mongoose.model("TestData", testDataSchema);
export default TestData;
