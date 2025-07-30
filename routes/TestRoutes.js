import express from "express";
import { saveTestData, getTestData } from "../controllers/testcontroller.js";

const testRouter = express.Router();
testRouter.post("/save", saveTestData);
testRouter.get("/get", getTestData);

export default testRouter;