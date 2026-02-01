import { useEffect, useRef } from "react";

function getInterpolatedState(telemetry, time) {
  const { time: tArr, x: xArr, y: yArr, speed: sArr, gear: gArr = [], drs: dArr = [] } = telemetry;

  // Binary search for the index
  let low = 0, high = tArr.length - 1;
  while (low <= high) {
    const mid = (low + high) >>> 1;
    if (tArr[mid] < time) low = mid + 1;
    else high = mid - 1;
  }

  // 'low' is the insertion point. 
  // If low == 0, time is before start. 
  // If low >= length, time is after end.
  if (low === 0) return { x: xArr[0], y: yArr[0], speed: sArr[0], gear: gArr[0], drs: dArr[0] };
  if (low >= tArr.length) {
    const last = tArr.length - 1;
    return { x: xArr[last], y: yArr[last], speed: sArr[last], gear: gArr[last], drs: dArr[last] };
  }

  const i = low - 1;
  const j = low;

  const t1 = tArr[i], t2 = tArr[j];
  const range = t2 - t1;
  if (range === 0) return { x: xArr[i], y: yArr[i], speed: sArr[i], gear: gArr[i], drs: dArr[i] };

  const f = (time - t1) / range;

  // Interpolate
  return {
    x: xArr[i] + (xArr[j] - xArr[i]) * f,
    y: yArr[i] + (yArr[j] - yArr[i]) * f,
    speed: sArr[i],
    gear: gArr ? gArr[i] : 0,
    drs: dArr ? dArr[i] : 0
  };
}

export default function TrackCanvas({ track, cars, currentTime, trackStatus, selectedCarId }) {
  const canvasRef = useRef();

  useEffect(() => {
    if (!track?.length || !canvasRef.current) return;

    const c = canvasRef.current;
    const ctx = c.getContext("2d");

    const W = c.width;
    const H = c.height;

    ctx.clearRect(0, 0, W, H);

    // Draw Track
    const statusColor = {
      "1": "#444", // Green/Normal (dark grey track)
      "2": "#ffd700", // Yellow
      "4": "#ff8800", // SC
      "5": "#ff0000", // Red
      "6": "#ff8800", // VSC
      "7": "#ff8800"  // VSC Ending
    }[trackStatus] || "#444";

    ctx.strokeStyle = statusColor;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();

    track.forEach(([x, y], i) => {
      const px = x * W;
      const py = y * H;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    });
    ctx.stroke();

    // Draw Start/Finish Line
    if (track.length > 0) {
      const [sx, sy] = track[0];
      const [nextX, nextY] = track[1] || track[0];
      const dx = (nextX - sx) * W;
      const dy = (nextY - sy) * H;
      const len = Math.sqrt(dx * dx + dy * dy);
      const nx = -dy / len;
      const ny = dx / len;
      const slX = sx * W;
      const slY = sy * H;

      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(slX - nx * 5, slY - ny * 5);
      ctx.lineTo(slX + nx * 5, slY + ny * 5);
      ctx.stroke();
    }

    // Draw Cars
    // First, separate selected car to draw it last
    const sortedCars = Object.values(cars).sort((a, b) => {
      if (a.driver_number === selectedCarId) return 1;
      if (b.driver_number === selectedCarId) return -1;
      return 0;
    });

    sortedCars.forEach(car => {
      const state = getInterpolatedState(car.telemetry, currentTime);
      const inPit = car.pit_intervals?.some(p => currentTime >= p[0] && currentTime < p[1]);
      const cx = state.x * W;
      const cy = state.y * H;

      const isSelected = selectedCarId != null && car.driver_number === selectedCarId;

      ctx.beginPath();

      if (isSelected) {
        // Highlight Effect: Pulse/Glow
        ctx.shadowBlur = 15;
        ctx.shadowColor = car.color || "#00f0ff";
        ctx.fillStyle = "#ffffff"; // inner white core
        ctx.arc(cx, cy, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0; // reset

        // Ring
        ctx.strokeStyle = car.color || "#00f0ff";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, 10, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Draw standard car dot (if not highlighted, or draw smaller on top?)
      if (!isSelected) {
        if (inPit) {
          ctx.strokeStyle = car.color;
          ctx.lineWidth = 2;
          ctx.arc(cx, cy, 3, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          ctx.fillStyle = car.color;
          ctx.arc(cx, cy, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Draw Name Label
      if (isSelected || !inPit) {
        ctx.fillStyle = isSelected ? "#fff" : (inPit ? "#888" : "#ccc");
        ctx.font = isSelected ? "bold 12px sans-serif" : "10px sans-serif";
        const nameText = car.name.split(" ").pop().slice(0, 3).toUpperCase();
        const posText = car.position ? `${car.position} ` : "";
        ctx.fillText(posText + nameText, cx + (isSelected ? 12 : 6), cy + 3);
      }
    });

  }, [track, cars, currentTime, trackStatus, selectedCarId]);

  return <canvas ref={canvasRef} width={800} height={800} style={{ width: "100%", height: "100%" }} />;
}
