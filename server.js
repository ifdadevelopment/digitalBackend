import express from "express";
import cors from "cors";
import "dotenv/config";
import { connectDB } from "./config/DB.js";
import userRouter from "./routes/userRoute.js";
import courseRouter from "./routes/courseRoute.js";
import formRouter from "./routes/formRoutes.js";
import paymentRouter from "./routes/paymentRoute.js";
import courseStudentRouter from "./routes/courseStudentRoutes.js";
import blogRouter from "./routes/blogRoutes.js";
import cartRouter from "./routes/cartRoutes.js";

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_URL =
  process.env.NODE_ENV === "production"
    ? process.env.CLIENT_URL_PROD
    : process.env.CLIENT_URL_DEV;

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:4173",
  "https://digitalmarketing890.netlify.app",
  "https://digitaladmin.netlify.app"
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

console.log(`CORS Origin: ${CLIENT_URL}`);
app.options("*", cors());
app.use(express.json({ limit: "4gb" }));
app.use(express.urlencoded({ extended: true, limit: "4gb" }));
app.use(express.static("public"));

connectDB();
app.get("/", (req, res) => {
  res.send("✅ Server is running.");
});

app.use("/api/user", userRouter);
app.use("/api/courses", courseRouter);
app.use("/api/forms", formRouter);
app.use("/api/payment", paymentRouter);
app.use("/api/courseStudent", courseStudentRouter);
app.use("/api/blogs", blogRouter);
app.use("/api/carts", cartRouter);

app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  return res.status(statusCode).json({
    success: false,
    statusCode,
    message,
  });
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
