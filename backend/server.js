import express from "express";
import cors from "cors";
import raceRoutes from "./routes/raceRoutes.js";


const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

app.use("/api/race", raceRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
