# F1Sync

F1Sync is a modern, real-time Formula 1 race replay and visualization dashboard. It allows users to replay historical races (2018-2025) with synchronized telemetry, track mapping, and a dynamic leaderboard.

## Features

- **Real-time Telemetry Visualization**: Watch races unfold with accurate driver positions, speeds, and lap times.
- **Dynamic Leaderboard**: Live-updating leaderboard with driver status, tyre compounds, intervals, and fastest lap indicators.
- **Interactive Track Map**: 2D track visualization showing real-time car positions and pit lane activity.
- **Race Control**: Play, pause, scrub through the race, and adjust playback speed (up to 20x).
- **Session Select**: easy access to the full archive of past F1 seasons.
- **Minimalist Aesthetic**: High-contrast, glassmorphism-inspired UI designed for clarity and immersion.

## Tech Stack

- **Frontend**: React, Vite, Canvas API
- **Backend**: FastAPI, Pandas, NumPy
- **Data Source**: [FastF1](https://github.com/theOehrly/Fast-F1) (Ergast API & F1 Live Timing)

## Getting Started

### Prerequisites

- Python 3.9+
- Node.js 16+ & npm

### 1. Start the Backend

The backend handles data fetching and processing from FastF1.

```bash
cd backend
# Install Python dependencies
pip install -r requirements.txt
# Run the server
python -m uvicorn app.main:app --reload
```
Server will start at `http://127.0.0.1:8000`.

### 2. Start the Frontend

The frontend visualizes the race data.

```bash
cd frontend
# Install Node dependencies
npm install
# Start the dev server
npm run dev
```
Open `http://localhost:5173` in your browser.

## Usage

1. Select a **Year** and **Grand Prix** from the main menu.
2. Click **Launch Session** to load the race data (this may take a moment for the first load as data is cached).
3. Use the playback controls at the bottom to watch the race.
   - **Play/Pause**: Toggle playback.
   - **Seek Bar**: Jump to any point in the race.
   - **Speed**: Toggle between 1x, 5x, 10x, and 20x speeds.
