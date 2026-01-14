/**
 * replayGenerator.js
 * ------------------
 * Generates frontend-ready replay frames
 */

import { getTrackPosition } from "./trackPath.js";

/**
 * Generate normalized replay timeline
 *
 * @param {number} durationSeconds
 * @param {number} fps - frames per second
 * @returns {Object} replay data
 */
export function generateMockReplay(durationSeconds = 120, fps = 1) {
  const totalFrames = durationSeconds * fps;
  const timeline = [];

  const cars = [
    { driver: "VER", speedFactor: 1.0 },
    { driver: "HAM", speedFactor: 0.98 },
    { driver: "LEC", speedFactor: 0.96 },
  ];

  for (let frame = 0; frame <= totalFrames; frame++) {
    const timestamp = frame / fps;

    const frameCars = cars.map((car, index) => {
      /**
       * Progress loops from 0 → 1
       */
      const progress =
        ((timestamp * car.speedFactor) % durationSeconds) /
        durationSeconds;

      const position = getTrackPosition(progress);

      return {
        driver: car.driver,
        x: position.x,
        y: position.y,
        speed: Math.round(300 * car.speedFactor),
        lap: Math.floor((timestamp * car.speedFactor) / durationSeconds) + 1,
        position: index + 1,
      };
    });

    timeline.push({
      timestamp,
      cars: frameCars,
    });
  }

  return {
    metadata: {
      durationSeconds,
      fps,
      totalFrames,
    },
    frames: timeline,
  };
}
