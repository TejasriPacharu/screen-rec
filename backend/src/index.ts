// backend/src/index.ts
import express from "express";
import mongoose from "mongoose";
import { MONGO_CONN_STR, PORT } from "./config";
import { authRouter } from "./auth";
import { recordingsRouter } from "./recordings";
import { startWorker } from "./workers/reading.worker";

const app = express();

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "http://localhost:3000");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Credentials", "true");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

app.use(express.json());
app.use("/auth", authRouter);
app.use("/recordings", recordingsRouter);

mongoose.connect(MONGO_CONN_STR).then(() => {
  console.log("✅ MongoDB connected");
  startWorker(); // start BullMQ worker after DB is ready
  app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
});