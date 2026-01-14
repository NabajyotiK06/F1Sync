/**
 * server.js
 * -----------
 * This is the ENTRY POINT of the backend.
 * It creates the Express server and connects routes.
 */

import express from "express";
import cors from "cors";
import raceRoutes from "./routes/raceRoutes.js";

const app = express();
const PORT = 5000;

/**
 * MIDDLEWARE
 * ----------
 * Runs before every request
 */
app.use(cors()); // Allows frontend (later) to talk to backend
app.use(express.json()); // Parses incoming JSON request bodies

/**
 * ROUTES
 * ------
 * All race-related APIs start with /api/race
 */
app.use("/api/race", raceRoutes);

/**
 * ROOT TEST ROUTE
 */
app.get("/", (req, res) => {
  res.send("F1Sync backend is running");
});

/**
 * START SERVER
 */
app.listen(PORT, () => {
  console.log(`🚀 F1Sync backend running on port ${PORT}`);
});
