import express from "express";
import { saveTestData, getTestData } from "../controllers/testcontroller.js";
import { verifyUser } from "../middleware/auth.js";

const testRouter = express.Router();
testRouter.post("/save", saveTestData);
testRouter.get("/get", getTestData);

export default testRouter;