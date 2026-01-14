/**
 * raceRoutes.js
 * --------------
 * Defines all race-related API endpoints for F1Sync.
 *
 * Responsibilities:
 * - Handle HTTP requests
 * - Validate inputs
 * - Call service / utility layers
 * - Return clean JSON responses
 *
 * IMPORTANT:
 * - No business logic here
 * - No replay logic here
 * - No external API calls here
 */

import express from "express";
import { getRacesByYear } from "../services/f1Service.js";
import { generateMockReplay } from "../utils/replayGenerator.js";

const router = express.Router();

/**
 * =====================================================
 * GET /api/race/info
 * =====================================================
 * Purpose:
 * - Fetch all races (meetings) for a given year
 * - Used by frontend for race selection
 *
 * Example:
 * /api/race/info?year=2023
 */
router.get("/info", async (req, res) => {
  const { year } = req.query;

  // Input validation
  if (!year) {
    return res.status(400).json({
      success: false,
      message: "'year' query parameter is required",
    });
  }

  try {
    // Fetch races from OpenF1 via service layer
    const races = await getRacesByYear(year);

    res.json({
      success: true,
      data: races,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * =====================================================
 * GET /api/race/replay
 * =====================================================
 * Purpose:
 * - Generate replay timeline for a selected race
 * - Returns metadata + normalized frames
 *
 * Example:
 * /api/race/replay?meeting_key=1219
 */
router.get("/replay", (req, res) => {
  const { meeting_key } = req.query;

  // Input validation
  if (!meeting_key) {
    return res.status(400).json({
      success: false,
      message: "'meeting_key' query parameter is required",
    });
  }

  /**
   * Generate replay data
   * NOTE:
   * - Currently mock data
   * - Will be replaced with real telemetry later
   */
  const replayData = generateMockReplay(120, 2); // 120s duration, 2 FPS

  res.json({
    success: true,
    meeting_key,
    metadata: replayData.metadata,
    frames: replayData.frames,
  });
});

export default router;
