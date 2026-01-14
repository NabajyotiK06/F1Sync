/**
 * trackPath.js
 * -------------
 * Defines a simplified race track as a loop of points.
 * All coordinates are NORMALIZED (0 → 1).
 */

export const TRACK_PATH = [
  { x: 0.2, y: 0.2 },
  { x: 0.8, y: 0.2 },
  { x: 0.8, y: 0.8 },
  { x: 0.2, y: 0.8 },
];

/**
 * Get a point on the track based on progress (0 → 1)
 *
 * @param {number} progress - value between 0 and 1
 * @returns {Object} { x, y }
 */
export function getTrackPosition(progress) {
  const segmentCount = TRACK_PATH.length;
  const totalProgress = progress * segmentCount;

  const index = Math.floor(totalProgress);
  const nextIndex = (index + 1) % segmentCount;

  const localProgress = totalProgress - index;

  const start = TRACK_PATH[index];
  const end = TRACK_PATH[nextIndex];

  return {
    x: start.x + (end.x - start.x) * localProgress,
    y: start.y + (end.y - start.y) * localProgress,
  };
}
