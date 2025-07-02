import express from "express";
import { getAllForms, submitForm } from "../controllers/formController.js";

const formRouter = express.Router();

formRouter.post("/submit", submitForm);
formRouter.get("/all", getAllForms);
export default formRouter;
