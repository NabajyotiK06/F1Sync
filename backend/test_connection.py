import fastf1
import logging
import sys
import shutil
import os

# Configure logging to stdout
logging.basicConfig(level=logging.DEBUG)

# Enable cache
if not os.path.exists("cache"):
    os.makedirs("cache")
fastf1.Cache.enable_cache("cache")

print("Testing data load for Monaco 2023 (known good)...")

try:
    session = fastf1.get_session(2023, "Monaco", "R")
    session.load(telemetry=True, weather=False, messages=False)
    
    print("Session loaded successfully!")
    print(f"Laps: {len(session.laps)}")
    print(f"Drivers: {len(session.drivers)}")
    
    if session.laps.empty:
        print("ERROR: Laps are empty despite no exception!")
    
except Exception as e:
    print(f"CRITICAL FAILURE: {e}")
    import traceback
    traceback.print_exc()

print("-" * 20)
print("Testing data load for Belgium 2020 (User reported failure)...")
try:
    session = fastf1.get_session(2020, "Spa", "R")
    session.load(telemetry=True, weather=False, messages=False)
    print(f"Laps: {len(session.laps)}")
except Exception as e:
    print(f"CRITICAL FAILURE: {e}")
