import os
import fastf1
import numpy as np
import pandas as pd
from fastf1 import Cache

if not os.path.exists("cache"):
    os.makedirs("cache")

Cache.enable_cache("cache")

def normalize_track(points, padding=0.1):
    """
    Normalize points to 0-1 range while reshaping to maintain aspect ratio.
    """
    min_x, max_x = points[:, 0].min(), points[:, 0].max()
    min_y, max_y = points[:, 1].min(), points[:, 1].max()
    
    range_x = max_x - min_x
    range_y = max_y - min_y
    
    # Use the larger range to maintain aspect ratio
    max_range = max(range_x, range_y)
    
    # Apply padding
    max_range *= (1 + padding)
    
    # Center the track in the normalized square
    center_x = (min_x + max_x) / 2
    center_y = (min_y + max_y) / 2
    
    normalized = np.empty_like(points)
    normalized[:, 0] = 0.5 + (points[:, 0] - center_x) / max_range
    normalized[:, 1] = 0.5 + (points[:, 1] - center_y) / max_range
    
    return normalized

def generate_replay(year: int, race: str):
    print(f"Generating replay for {year} Round {race}...")
    try:
        # Handle race identifier (convert string "11" to int 11 if possible)
        try:
            if str(race).isdigit():
                race = int(race)
        except:
            pass

        # Load the race session
        session = fastf1.get_session(year, race, "R")
        
        # Load data (telemetry, weather, etc.)
        session.load(telemetry=True, weather=False, messages=False)
        print("Session loaded successfully.")
        
    except Exception as e:
        print(f"Error loading session: {str(e)}")
        return {"error": f"Failed to load session: {str(e)}"}

    # --- 1. Global Bounds Calculation ---
    all_x = []
    all_y = []
    
    # Pre-load drivers
    driver_data_cache = {}
    
    drivers = session.drivers
    
    try:
        if session.laps.empty:
             return {"error": "Session has no lap data"}
    except Exception:
         return {"error": "Session data (laps) failed to load"}

    for drv in drivers:
        try:
            laps = session.laps.pick_drivers(drv)
        except:
            continue
            
        if laps.empty: continue
        try:
            # Pick only useful columns
            tel = laps.get_telemetry()[['X', 'Y', 'Time', 'Speed', 'nGear', 'DRS', 'Distance']]
            if not tel.empty:
                driver_data_cache[drv] = (laps, tel)
                # Subsample for bounds
                sub = tel.iloc[::10]
                all_x.extend(sub['X'].values)
                all_y.extend(sub['Y'].values)
        except:
            continue
            
    if not all_x:
        return {"error": "No telemetry data found related to track map"}

    min_x, max_x = np.min(all_x), np.max(all_x)
    min_y, max_y = np.min(all_y), np.max(all_y)
    
    range_x, range_y = max_x - min_x, max_y - min_y
    max_range = max(range_x, range_y) * 1.1 # 10% padding
    center_x, center_y = (min_x + max_x) / 2, (min_y + max_y) / 2

    def normalize_coords(coords):
        norm = np.empty_like(coords)
        norm[:, 0] = 0.5 + (coords[:, 0] - center_x) / max_range
        norm[:, 1] = 0.5 + (coords[:, 1] - center_y) / max_range 
        return norm

    # --- 2. Track Map ---
    # Use fastest lap for the "Track Line"
    fastest_lap = session.laps.pick_fastest()
    track_tel = fastest_lap.get_telemetry()[["X", "Y"]].dropna().to_numpy()
    track_norm = normalize_coords(track_tel)

    # --- 3. Track Status & Penalties ---
    track_status_data = []
    penalty_data = []
    
    if hasattr(session, 'track_status') and session.track_status is not None:
        ts = session.track_status.copy()
        ts['Time'] = ts['Time'].dt.total_seconds()
        track_status_data = ts[['Time', 'Status']].to_dict('records')


    # --- 4. Process Drivers ---
    cars_data = {}
    
    for drv, (laps, telemetry) in driver_data_cache.items():
        drv_info = session.get_driver(drv)
        
        # Merge Lap Numbers into Telemetry
        # get_telemetry() usually returns 'Source' etc but not always 'LapNumber' explicit/continuous 
        # correctly if it crosses lines. 
        # fastf1 3.x: get_telemetry() effectively merges. 'Distance' is continuous-ish? 
        # Actually 'Distance' resets per lap in some versions or is cumulative?
        # Let's check: fastf1 usually has 'Distance' as distance from start of LAP.
        # We need to construct a robust "Total Distance" or "Lap + Distance" metric for sorting.
        
        # We will iterate laps to build a lookup or injection
        # Efficient way: The telemetry index allows looking up the lap but that's slow.
        # fastf1 provides `session.laps.get_telemetry()` which returns a huge DF.
        # It DOES NOT preserve LapNumber row-by-row by default in all versions.
        # BUT `laps` df has `LapNumber`, `StartTime`, `EndTime`.
        # We can merge on Time.
        
        # Simplified approach: Use `Distance` for interpolation + `LapNumber` from a time-lookup.
        # Since we are sending arrays, we can generate a `laps_array`.
        
        # Create a time-based lookup for Tire Compound and Lap Number
        # We'll create a list of spans: [{start: t1, end: t2, lap: 1, tire: 'SOFT'}, ...]
        lap_intervals = []
        for i, lap in laps.iterrows():
            # Handle potential NaT
            start_t = lap["LapStartTime"]
            if pd.isna(start_t):
                if lap["LapNumber"] == 1:
                    start_t = pd.Timedelta(seconds=0)
                else:
                    # Skip invalid laps or try to infer?
                    continue
            
            start_sec = start_t.total_seconds()
            
            end_t = lap["LapStartTime"] + lap["LapTime"] if pd.notna(lap["LapTime"]) else None
            if pd.isna(end_t):
                 # If last lap or DNF, extend to infinity or session end
                 end_sec = 999999
            else:
                 end_sec = end_t.total_seconds()

            lap_intervals.append({
                "start": start_sec,
                "end": end_sec,
                "lap": int(lap["LapNumber"]),
                "tire": str(lap["Compound"]) if lap["Compound"] else "UNKNOWN"
            })
            
        # Reduce data (every 4th point)
        # Use SessionTime (Time + First Lap Start)
        # We need SessionTime to align with LapIntervals which use SessionTime.
        # laps.get_telemetry() returns "Time" relative to start of first lap in set.
        
        # Calculate offset
        time_offset = 0
        if not laps.empty:
            start_t = laps.iloc[0]['LapStartTime']
            if pd.notna(start_t):
                time_offset = start_t.total_seconds()
        
        tel_data = telemetry[['Time', 'X', 'Y', 'Speed', 'nGear', 'DRS', 'Distance']].dropna().iloc[::4]
        
        coords = tel_data[['X', 'Y']].to_numpy()
        norm_coords = normalize_coords(coords)
        
        # Convert relative Time to SessionTime
        times = (tel_data['Time'].dt.total_seconds() + time_offset).round(3).tolist()
        xs = np.round(norm_coords[:, 0], 5).tolist()
        ys = np.round(norm_coords[:, 1], 5).tolist()
        speeds = tel_data['Speed'].round(1).tolist()
        gears = tel_data['nGear'].tolist()
        drs = tel_data['DRS'].tolist()
        distances = tel_data['Distance'].round(1).tolist()
        
        # Pit Lane Detection
        # Heuristic: If we are significantly far from the 'racing line' (Track Map) we are likely in pits?
        # Better: use 'PitInTime' and 'PitOutTime' from laps
        pit_intervals = []
        for i, lap in laps.iterrows():
            if pd.notna(lap['PitInTime']) and pd.notna(lap['PitOutTime']):
                pit_intervals.append([
                    lap['PitInTime'].total_seconds(),
                    lap['PitOutTime'].total_seconds()
                ])
                
        cars_data[drv] = {
            "name": drv_info["BroadcastName"],
            "team": drv_info["TeamName"],
            "driver_number": drv,
            "color": f"#{drv_info['TeamColor']}" if drv_info['TeamColor'] else "#888888",
            "status": str(drv_info['Status']), # e.g. "Finished", "Collision", "+1 Lap"
            "telemetry": {
                "time": times,
                "x": xs,
                "y": ys,
                "speed": speeds,
                "gear": gears,
                "drs": drs,
                "dist": distances
            },
            "lap_intervals": lap_intervals, # List of {start, end, lap, tire}
            "pit_intervals": pit_intervals # List of [start, end]
        }

    return {
        "track_map": track_norm.tolist(),
        "track_status": track_status_data,
        "penalties": penalty_data,
        "cars": cars_data,
        "session_info": {
            "year": year,
            "race": race,
            "name": session.event["EventName"]
        }
    }

def get_schedule(year: int):
    try:
        schedule = fastf1.get_event_schedule(year)
        # Filter out testing if possible, or just send relevant info
        # We want RoundNumber, EventName, Location, OfficialEventName, EventDate
        # fastf1 3.x columns: RoundNumber, Country, Location, OfficialEventName, EventDate, EventName, Session1...
        
        # Convert to list of dicts
        # Handle cases where schedule might be empty or restricted
        data = []
        for i, row in schedule.iterrows():
            # Skip if no RoundNumber (usually testing)
            if row['RoundNumber'] == 0:
                continue
                
            data.append({
                "RoundNumber": int(row['RoundNumber']),
                "EventName": row['EventName'],
                "Location": row['Location'],
                "OfficialEventName": row['OfficialEventName'],
                # Convert Timestamp to string
                "EventDate": row['EventDate'].strftime('%Y-%m-%d') if pd.notna(row['EventDate']) else ""
            })
        return data
    except Exception as e:
        return {"error": str(e)}
