import { useEffect, useState, useRef } from "react";
import TrackCanvas from "./components/TrackCanvas";
import "./App.css";

// Helper for binary search interpolation
function interpolate(time, times, values) {
  if (!times || !values || times.length === 0) return 0;

  let low = 0, high = times.length - 1;
  while (low <= high) {
    const mid = (low + high) >>> 1;
    if (times[mid] < time) low = mid + 1;
    else high = mid - 1;
  }

  if (low === 0) return values[0];
  if (low >= times.length) return values[times.length - 1];

  const i = low - 1;
  const j = low;
  const t1 = times[i], t2 = times[j];
  const range = t2 - t1;
  if (range === 0) return values[i];

  const f = (time - t1) / range;
  return values[i] + (values[j] - values[i]) * f;
}

function getCarState(car, time) {
  const { telemetry, lap_intervals, pit_intervals } = car;

  // Physical State
  const dist = interpolate(time, telemetry.time, telemetry.dist);
  const speed = interpolate(time, telemetry.time, telemetry.speed);

  // Logical State (Lap, Tire)
  let currentLap = 0;
  let currentTire = "SOFT";

  let foundInterval = null;
  for (let i = lap_intervals.length - 1; i >= 0; i--) {
    if (lap_intervals[i].start <= time) {
      foundInterval = lap_intervals[i];
      break;
    }
  }

  if (foundInterval) {
    currentLap = foundInterval.lap;
    currentTire = foundInterval.tire;
  }

  // Pit Status
  const inPit = pit_intervals.some(p => time >= p[0] && time < p[1]);

  return { dist, speed, lap: currentLap, tire: currentTire, inPit };
}

export default function App() {
  const [data, setData] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [maxTime, setMaxTime] = useState(7200);
  const [sessionStartTime, setSessionStartTime] = useState(0);

  // Selection State
  const [year, setYear] = useState(2023);
  const [raceList, setRaceList] = useState([]);
  const [selectedRace, setSelectedRace] = useState(null);
  const [selectedCarId, setSelectedCarId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

  // UI State
  const [showSpeedControls, setShowSpeedControls] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);

  // Drag State
  const [position, setPosition] = useState(null); // null = default center bottom
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const lastFrameTime = useRef(0);
  const requestRef = useRef();
  const speedRef = useRef(speed);

  useEffect(() => {
    speedRef.current = speed; // Sync ref for animation loop
  }, [speed]);

  // Handle Global Drag Events
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;

      const newX = e.clientX - dragOffset.current.x;
      const newY = e.clientY - dragOffset.current.y;

      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  const startDrag = (e) => {
    // Only drag if clicking the container itself or non-interactive parts
    if (e.target.tagName === "BUTTON" || e.target.tagName === "INPUT") return;

    // Calculate offset
    const rect = e.currentTarget.getBoundingClientRect();
    dragOffset.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    setIsDragging(true);

    // If first drag, set initial position to current computed rect
    if (!position) {
      setPosition({ x: rect.left, y: rect.top });
    }
  };


  // Fetch Schedule on Year Change
  useEffect(() => {
    setLoading(true);
    fetch(`http://127.0.0.1:8000/schedule/${year}`)
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d)) {
          setRaceList(d);
          if (d.length > 0) setSelectedRace(d[0]); // Default to first race
        } else {
          setLoadError("Failed to load schedule");
        }
        setLoading(false);
      })
      .catch(e => {
        setLoadError(e.message);
        setLoading(false);
      });
  }, [year]);

  const loadRace = () => {
    if (!selectedRace) return;
    setLoading(true);
    setPlaying(false);
    setData(null);
    setLoadError(null);

    const identifier = selectedRace.RoundNumber;

    fetch(`http://127.0.0.1:8000/replay/${year}/${identifier}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) {
          setLoadError(d.error);
          setLoading(false);
          return;
        }
        setData(d);
        const firstCar = Object.values(d.cars)[0];
        if (firstCar && firstCar.telemetry.time.length) {
          const start = firstCar.telemetry.time[0];
          let max = 0;
          Object.values(d.cars).forEach(c => {
            const t = c.telemetry.time;
            if (t.length) max = Math.max(max, t[t.length - 1]);
          });
          setCurrentTime(start);
          setSessionStartTime(start);
          setMaxTime(max);
        }
        setLoading(false);
      })
      .catch(e => {
        setLoadError(e.message);
        setLoading(false);
      });
  };

  const animate = (time) => {
    if (lastFrameTime.current !== undefined) {
      const deltaTime = (time - lastFrameTime.current) / 1000;
      setCurrentTime(prev => {
        const next = prev + deltaTime * speedRef.current;
        return next > maxTime ? maxTime : next; // Stop at end? Loop? Stop is better.
      });
    }
    lastFrameTime.current = time;
    if (playing) {
      requestRef.current = requestAnimationFrame(animate);
    }
  };

  useEffect(() => {
    if (playing) {
      lastFrameTime.current = performance.now();
      requestRef.current = requestAnimationFrame(animate);
    } else {
      cancelAnimationFrame(requestRef.current);
      lastFrameTime.current = undefined;
    }
    return () => cancelAnimationFrame(requestRef.current);
  }, [playing, maxTime]);

  // Loading Screen
  if (loading || !data) {
    return (
      <div className="loading-screen">
        <div style={{ textAlign: "center" }}>
          <h1 style={{ fontSize: "3rem", marginBottom: "1rem" }}>F1<span style={{ color: "var(--accent-red)" }}>Sync</span></h1>
          <p style={{ color: "var(--text-secondary)" }}>Select a session to begin visualization</p>
        </div>

        <div className="race-select-container">
          <select
            value={year}
            onChange={e => setYear(parseInt(e.target.value))}
          >
            {[2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018].map(y => <option key={y} value={y}>{y}</option>)}
          </select>

          <select
            value={selectedRace ? selectedRace.RoundNumber : ""}
            onChange={e => {
              const r = raceList.find(x => x.RoundNumber === parseInt(e.target.value));
              setSelectedRace(r);
            }}
            disabled={raceList.length === 0}
          >
            {raceList.map(r => (
              <option key={r.RoundNumber} value={r.RoundNumber}>
                {r.EventName} ({r.Location})
              </option>
            ))}
          </select>

          <button
            className="btn-primary"
            onClick={loadRace}
            disabled={loading || !selectedRace}
          >
            {loading ? "INITIALIZING..." : "LAUNCH SESSION"}
          </button>
        </div>

        {loadError && <div style={{ color: "var(--accent-red)" }}>Error: {loadError}</div>}
        {loading && <div style={{ color: "var(--text-dim)" }}>Fetching Telemetry Data...</div>}
      </div>
    );
  }

  // --- Dynamic Leaderboard Calculation ---
  let currentTrackStatus = "1";
  if (data.track_status && data.track_status.length > 0) {
    for (let i = data.track_status.length - 1; i >= 0; i--) {
      if (data.track_status[i].Time <= currentTime) {
        currentTrackStatus = data.track_status[i].Status;
        break;
      }
    }
  }

  const leaderboardState = Object.values(data.cars).map(car => {
    const state = getCarState(car, currentTime);

    // Check for DNF / Out
    const lastDataTime = car.telemetry.time[car.telemetry.time.length - 1];
    const isOut = currentTime > lastDataTime + 5 && !["Finished", "+1 Lap", "+2 Laps", "+3 Laps", "+4 Laps", "+5 Laps", "+6 Laps"].includes(car.status);


    let score = state.lap * 100000 + state.dist;
    if (isOut) score = -1;

    return {
      ...car,
      ...state,
      isOut,
      score
    };
  }).sort((a, b) => b.score - a.score);

  const leaderScore = leaderboardState[0]?.score || 0;
  const displayTime = Math.max(0, currentTime - sessionStartTime);

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="brand">
          <h1>F1Sync</h1>
          <span className="live-badge">REPLAY</span>
        </div>

        <div style={{ textAlign: "right" }}>
          <div>{data.session_info.year} {data.session_info.race}</div>
          <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{data.session_info.name}</div>
        </div>

        <button onClick={() => setData(null)} style={{ background: "transparent", color: "var(--text-dim)", fontSize: "12px" }}>
          EXIT SESSION
        </button>
      </header>

      {/* Main Map Content */}
      <div className="main-content">
        <TrackCanvas
          track={data.track_map}
          cars={leaderboardState.map((c, i) => ({ ...c, position: i + 1 }))}
          currentTime={currentTime}
          trackStatus={currentTrackStatus}
          selectedCarId={selectedCarId}
        />

        {/* Track Status Banner */}
        {currentTrackStatus !== "1" && (
          <div style={{
            position: "absolute", top: 20, left: "50%", transform: "translateX(-50%)",
            padding: "8px 20px", borderRadius: 4, fontWeight: "bold",
            background: currentTrackStatus === "5" ? "var(--accent-red)" : currentTrackStatus === "2" ? "var(--accent-yellow)" : "orange",
            color: "#000",
            boxShadow: "0 0 20px rgba(0,0,0,0.5)"
          }}>
            {currentTrackStatus === "5" ? "RED FLAG" : currentTrackStatus === "2" ? "YELLOW FLAG" : currentTrackStatus === "4" ? "SAFETY CAR" : "VSC"}
          </div>
        )}
      </div>

      {/* Sidebar / Leaderboard */}
      <div className="sidebar">
        <div className="lb-header">
          <div>#</div>
          <div>DRIVER</div>
          <div className="lb-col-lap" style={{ textAlign: 'center' }}>LAP</div>
          <div className="lb-col-speed" style={{ textAlign: 'right' }}>KMH</div>
          <div className="lb-col-tyre" style={{ textAlign: 'center' }}>TYRE</div>
          <div className="lb-col-gap" style={{ textAlign: 'right' }}>GAP</div>
        </div>

        <div style={{ overflowY: "auto", flex: 1 }}>
          {leaderboardState.map((c, i) => (
            <div
              key={c.driver_number}
              className={`lb-row ${selectedCarId === c.driver_number ? "selected" : ""}`}
              onClick={() => setSelectedCarId(c.driver_number === selectedCarId ? null : c.driver_number)}
              style={{ opacity: c.isOut ? 0.5 : 1 }}
            >
              <div className="lb-pos" style={{ color: i === 0 ? "var(--accent-yellow)" : "inherit" }}>{i + 1}</div>
              <div className="lb-driver">
                <div className="team-pill" style={{ background: c.color }}></div>
                <div>
                  {c.name.split(" ").slice(-1)[0].toUpperCase()}
                </div>
                <span style={{ fontSize: 10, color: "var(--text-dim)" }}>{c.team.slice(0, 3).toUpperCase()}</span>
              </div>
              <div className="lb-val" style={{ textAlign: 'center' }}>{c.lap}</div>
              <div className="lb-val lb-col-speed" style={{ textAlign: 'right', fontFamily: 'monospace', color: 'var(--accent-cyan)' }}>
                {Math.round(c.speed)}
              </div>
              <div className="lb-val lb-col-tyre" style={{
                textAlign: 'center',
                color: c.tire === "SOFT" ? "var(--accent-red)" : c.tire === "MEDIUM" ? "var(--accent-yellow)" : "white"
              }}>
                {c.tire ? c.tire[0] : "-"}
              </div>
              <div className="lb-val" style={{ fontSize: 11, textAlign: 'right' }}>
                {c.isOut ? (
                  <span style={{ color: "var(--accent-red)", fontWeight: "bold" }}>OUT</span>
                ) : (
                  i === 0 ? "LDR" : `+${Math.max(0, leaderScore - c.score).toFixed(0)}m`
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Toggle Button for Controls */}
      {!controlsVisible && (
        <button
          className="controls-toggle-btn show"
          onClick={() => setControlsVisible(true)}
        >
          SHOW CONTROLS
        </button>
      )}

      {/* Control Bar (Collapsible & Draggable) */}
      <div
        className={`control-bar ${!controlsVisible ? "collapsed" : ""} ${isDragging ? "dragging" : ""}`}
        onMouseDown={startDrag}
        style={position ? {
          left: position.x,
          top: position.y,
          bottom: "auto",
          transform: "none" // Remove default center transform if dragged
        } : {}}
      >
        {/* Scrubber */}
        <div className="scrubber-container">
          <input
            type="range"
            min={sessionStartTime}
            max={maxTime}
            step={0.1}
            value={currentTime}
            onChange={(e) => {
              const t = parseFloat(e.target.value);
              setCurrentTime(t);
            }}
            onMouseDown={(e) => e.stopPropagation()} // Prevent drag when using scrubber
            className="scrubber-input"
          />
        </div>

        <div className="controls-row">
          <button
            className="controls-toggle-btn hide"
            onClick={(e) => { e.stopPropagation(); setControlsVisible(false); }}
            title="Hide Controls"
          >
            ↓
          </button>

          <div style={{
            marginRight: "20px",
            fontFamily: "monospace",
            fontSize: "16px",
            color: "var(--accent-cyan)",
            textShadow: "0 0 10px rgba(0, 240, 255, 0.5)"
          }}>
            {new Date(displayTime * 1000).toISOString().substr(11, 8)}
          </div>

          <button
            className="control-btn play-pause"
            onClick={(e) => { e.stopPropagation(); setPlaying(p => !p); }}
          >
            {playing ? "⏸" : "▶"}
          </button>

          {/* Speed Controls (Collapsible) */}
          <div className="speed-control-container">
            <button
              className={`control-btn speed-toggle ${showSpeedControls ? "active" : ""}`}
              onClick={(e) => { e.stopPropagation(); setShowSpeedControls(prev => !prev); }}
            >
              {speed}x
            </button>

            <div className={`speed-options ${showSpeedControls ? "show" : ""}`}>
              {[1, 2, 5, 10, 20].map(s => (
                <button
                  key={s}
                  className={`control-btn speed-opt ${speed === s ? "active" : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSpeed(s);
                    setShowSpeedControls(false);
                  }}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="watermark">Designed by Nabajyoti</div>
    </div>
  );
}
