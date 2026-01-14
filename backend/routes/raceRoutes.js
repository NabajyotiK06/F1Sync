/**
 * raceRoutes.js
 * --------------
 * This file defines all race-related API endpoints for F1Sync.
 *
 * Responsibilities:
 * - Handle HTTP requests
 * - Validate query parameters
 * - Call service-layer functions
 * - Send clean JSON responses
 *
 * IMPORTANT:
 * - NO business logic here
 * - NO external API calls here
 */

import express from "express";
import { getRacesByYear } from "../services/f1Service.js";

const router = express.Router();

/**
 * GET /api/race/info
 * ------------------
 * Purpose:
 * - Fetch all F1 races (meetings) for a given year
 *
 * Example request:
 * /api/race/info?year=2023
 *
 * Example response:
 * {
 *   success: true,
 *   data: [ { race objects... } ]
 * }
 */
router.get("/info", async (req, res) => {
  const { year } = req.query;

  /**
   * BASIC VALIDATION
   */
  if (!year) {
    return res.status(400).json({
      success: false,
      message: "'year' query parameter is required",
    });
  }

  try {
    /**
     * Call service layer
     * The service handles:
     * - External API call
     * - Data normalization
     */
    const races = await getRacesByYear(year);

    /**
     * Successful response
     */
    res.json({
      success: true,
      data: races,
    });
  } catch (error) {
    /**
     * Error response
     * We send only clean message to client
     */
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

export default router;
