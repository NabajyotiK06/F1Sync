import fastf1
import pandas as pd

# Setup cache
fastf1.Cache.enable_cache("cache")

print("Loading Austria 2023 (known for penalties)...")
session = fastf1.get_session(2023, "Austria", "R")
session.load(telemetry=False, weather=False, messages=True)

print("\n--- Rows from session.results (first 5) ---")
# Check for penalty columns
cols = session.results.columns.tolist()
print(f"Columns: {cols}")
print(session.results[['Abbreviation', 'Time', 'Status', 'GridPosition', 'ClassifiedPosition']].head(5))

print("\n--- Checking for extraction of penalties ---")
# 'Time' column usually contains the final time including penalties for classified drivers
# But we want specific penalty info. 
# fastf1 3.x usually doesn't have a direct 'Penalty' column in results unless computed?
# Let's check available columns again.

# Let's check race control messages for "PENALTY"
print("\n--- Race Control Messages (Time Penalties) ---")
msgs = session.race_control_messages
if msgs is not None:
    print(f"Message Columns: {msgs.columns.tolist()}")
    penalties = msgs[msgs['Message'].str.contains("PENALTY", case=False, na=False)]
    if not penalties.empty:
        print(penalties.head(10))
else:
    print("No race control messages found.")
