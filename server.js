import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import ControlFlag from "./models/controlFlagModel.js";

const patientSchema = new mongoose.Schema(
  {
    heartRate: Number,
    spo2: Number,
    ecg: Number,
  },
  {
    timestamps: true, // ⚠️ Needed for `createdAt`
  }
);

const Patient = mongoose.model("Patient", patientSchema);

const app = express();
const PORT = 4000;

// Middleware
app.use(cors());
app.use(express.json()); // required for POST body parsing

// Function to start server after DB connects
async function startServer() {
  try {
    await mongoose.connect(
      "mongodb+srv://cvdproject:cvd123456@cvd-cluster.arfmy9f.mongodb.net/CVD_DB?retryWrites=true&w=majority&appName=CVD-CLUSTER"
    );

    console.log("✅ Connected to MongoDB!");

    // POST /data → ESP sends sensor data
    app.post("/data", async (req, res) => {
      try {
        console.log("📥 Received Sensor Data:", req.body);

        const { heartRate, spo2, ecg } = req.body;

        if (
          heartRate === undefined ||
          spo2 === undefined ||
          ecg === undefined
        ) {
          console.log("❌ Missing Data Fields");
          return res.status(400).send("❌ Missing Data Fields");
        }

        console.log("Connection State:", mongoose.connection.readyState);
        const patient = await Patient.findOne().sort({ createdAt: -1 }).exec();

        if (!patient) {
          return res
            .status(404)
            .json({ error: "No patient data found to update." });
        }

        patient.heartRate = heartRate;
        patient.spo2 = spo2;
        patient.ecg = ecg;

        await patient.save();
        console.log("✅ Data successfully stored in MongoDB!");
        res.status(200).send("✅ Data saved to MongoDB");
      } catch (error) {
        console.error("❌ Error saving data:", error);
        res.status(500).send("❌ Server Error");
      }
    });

    // GET /data → for testing sensor data
    app.get("/data", async (req, res) => {
      try {
        const patient = await Patient.findOne().sort({ createdAt: -1 }).exec();

        if (!patient) {
          return res.status(404).send("❌ No patient data found.");
        }

        const dataString = `Heart Rate: ${patient.heartRate} BPM | SpO2: ${patient.spo2} % | ECG Signal: ${patient.ecg}`;
        res.status(200).send(dataString);
      } catch (error) {
        console.error("❌ Error fetching data:", error);
        res.status(500).send("❌ Server Error");
      }
    });

    // GET /get-flag → ESP polls this
    app.get("/get-flag", async (req, res) => {
      try {
        const flagDoc = await ControlFlag.findOne({ name: "sensorFlag" });

        if (!flagDoc) {
          console.log("⚠️ No flag found, returning default 0");
          return res.status(200).json({ flag: 0 }); // Default 0 if not set
        }

        res.status(200).json({ flag: flagDoc.value });
      } catch (error) {
        console.error("❌ Error fetching flag:", error);
        res.status(500).json({ error: "Server Error" });
      }
    });

    // POST /set-flag → React calls this
    app.post("/set-flag", async (req, res) => {
      try {
        const { value } = req.body;

        if (typeof value !== "number" || (value !== 0 && value !== 1)) {
          return res.status(400).json({ error: "Invalid flag value" });
        }

        const updatedFlag = await ControlFlag.findOneAndUpdate(
          { name: "sensorFlag" },
          { value: value },
          { upsert: true, new: true }
        );

        console.log(`✅ Sensor flag updated to: ${updatedFlag.value}`);
        res.status(200).json({ status: "ok", flag: updatedFlag.value });
      } catch (error) {
        console.error("❌ Error updating flag:", error);
        res.status(500).json({ error: "Server Error" });
      }
    });

    // Start Express server
    app.listen(PORT, () => {
      console.log(`🚀 Sensor Server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("❌ Failed to connect to MongoDB:", error.message);
    process.exit(1);
  }
}

startServer();
