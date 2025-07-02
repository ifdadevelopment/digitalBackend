import FormModel from "../models/formModel.js";

export const submitForm = async (req, res) => {
  try {
    const form = await FormModel.create(req.body);
    res.status(201).json({ message: "Form submitted successfully", form });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
export const getAllForms = async (req, res) => {
  try {
    const forms = await FormModel.find();
    res.status(200).json(forms);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};