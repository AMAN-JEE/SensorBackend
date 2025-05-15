import express from "express";
import cors from "cors";
import mongoose from "mongoose";

const patientSchema = new mongoose.Schema({
  heartRate: Number,
  spo2: Number,
  ecg: Number
}, {
  timestamps: true // ⚠️ Needed for `createdAt`
});

const Patient = mongoose.model('Patient', patientSchema);

const app = express();
const PORT = 4000;

// Middleware
app.use(cors());
app.use(express.json());

// Function to start server after DB connects
async function startServer() {
  try {
    await mongoose.connect("mongodb+srv://cvdproject:cvd123456@cvd-cluster.arfmy9f.mongodb.net/CVD_DB?retryWrites=true&w=majority&appName=CVD-CLUSTER");

    console.log("✅ Connected to MongoDB!");

    // Define route here
    app.post("/data", async (req, res) => {
      try {
        console.log("📥 Received Request:", req.body);

        const { heartRate, spo2, ecg } = req.body;

        if (heartRate === undefined || spo2 === undefined || ecg === undefined) {
          console.log("❌ Missing Data Fields");
          return res.status(400).send("❌ Missing Data Fields");
        }

        console.log("Connection State:", mongoose.connection.readyState);
        const patient = await Patient.findOne().sort({ createdAt: -1 }).exec();

        if (!patient) {
          return res.status(404).json({ error: "No patient data found to update." });
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

    // Start Express server
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on http://localhost:${PORT}`);
    });

  } catch (error) {
    console.error("❌ Failed to connect to MongoDB:", error.message);
    process.exit(1);
  }
}

startServer();
