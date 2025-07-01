import express from "express";
import cors from "cors";
import { connectDB } from "./config/DB.js";
import userRouter from "./routes/userRoute.js";
import "dotenv/config";
import fileUpload from "express-fileupload";
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

const allowedOrigins = [
  CLIENT_URL,
  "http://localhost:4173"
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);


// db connection
connectDB();
app.get("/", (req, res) => {
  res.send("server start");
});
// app.use('/uploads', express.static('uploads'));
app.use("/api/user", userRouter);




// cloudinary.config({
//   cloud_name: process.env.APP_CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.APP_CLOUDINARY_API_KEY,
//   api_secret: process.env.APP_CLOUDINARY_API_SECRET,
// });

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
