// controlFlagModel.js
import mongoose from "mongoose";

const controlFlagSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  value: { type: Number, required: true },
});

const ControlFlag = mongoose.model("ControlFlag", controlFlagSchema);

export default ControlFlag;
