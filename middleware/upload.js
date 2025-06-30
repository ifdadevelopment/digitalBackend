import multer from "multer";
import path from "path";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    console.log('Uploaded photo path:', req.file);
    cb(null, "../uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
    console.log('Uploaded photo path:', req.file); 
  },
});

const upload = multer({ storage });

export default upload;
