import express from "express";
import cors from "cors";
import { connectDB } from "./config/DB.js";
import userRouter from "./routes/userRoute.js";
import "dotenv/config";
import fileUpload from "express-fileupload";
import courseRouter from "./routes/courseRoute.js";
import formRouter from "./routes/formRoutes.js";
import paymentRouter from "./routes/paymentRoute.js";
import courseStudentRouter from "./routes/courseStudentRoutes.js";
import blogRouter from "./routes/blogRoutes.js";
import cartRouter from "./routes/cartRoutes.js";
import uploadRouter from "./routes/uploadRoutes.js";

// import { v2 as cloudinary } from "cloudinary";

// app config
const app = express();
const PORT = process.env.PORT || 5000;

//middleware
app.use(express.json());

app.use(fileUpload({ createParentPath: true }));

app.use(express.static("public"));

app.use(express.urlencoded({ extended: true }));

const CLIENT_URL =
  process.env.NODE_ENV === "production"
    ? process.env.CLIENT_URL_PROD
    : process.env.CLIENT_URL_DEV;

app.use(
  cors({
    origin:[CLIENT_URL,"http://localhost:4173","http://localhost:5173","https://digitalmarketing890.netlify.app"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
console.log(`CORS Origin: ${CLIENT_URL}`);
app.options("*", cors());

// db connection
connectDB();
app.get("/", (req, res) => {
  res.send("server start");
});
// app.use('/uploads', express.static('uploads'));
app.use("/api/user", userRouter);
app.use("/api/courses", courseRouter);
app.use("/api/forms", formRouter);
app.use("/api/payment", paymentRouter);
app.use("/api/courseStudent", courseStudentRouter);
app.use("/api/blogs", blogRouter);
app.use("/api/carts", cartRouter);
app.use("/api/upload", uploadRouter);

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
  console.log(`Server running on http://localhost:${PORT}`);
});
