/**
 * f1Service.js
 * -------------
 * Service layer for fetching Formula 1 race metadata
 * using the OpenF1 API.
 *
 * OpenF1 is modern, reliable, and telemetry-focused.
 */

const OPENF1_BASE_URL = "https://api.openf1.org/v1";

/**
 * Fetch race (meeting) info by year
 *
 * @param {number} year
 * @returns {Object[]} list of races
 */
export async function getRacesByYear(year) {
  try {
    const url = `${OPENF1_BASE_URL}/meetings?year=${year}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`OpenF1 error ${response.status}`);
    }

    const data = await response.json();

    /**
     * Normalize data
     */
    return data.map((race) => ({
      meeting_key: race.meeting_key,
      raceName: race.meeting_name,
      location: race.location,
      country: race.country_name,
      dateStart: race.date_start,
      dateEnd: race.date_end,
    }));
  } catch (error) {
    console.error("❌ OpenF1 fetch failed:", error.message);
    throw new Error("Failed to fetch race data from OpenF1 API");
  }
}
