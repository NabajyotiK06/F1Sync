import express from "express";

const router = express.Router();

// GET basic race info
router.get("/info", (req, res) => {
  const { year, race, session } = req.query;

  if (!year || !race || !session) {
    return res.status(400).json({
      error: "year, race, and session are required",
    });
  }

  res.json({
    message: "Race info received",
    data: {
      year,
      race,
      session,
    },
  });
});

export default router;