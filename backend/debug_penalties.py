import fastf1
import pandas as pd
import re

# Setup cache
fastf1.Cache.enable_cache("cache")

print("Loading Austria 2023 for penalty debug...")
session = fastf1.get_session(2023, "Austria", "R")
session.load(telemetry=True, weather=False, messages=True)

penalty_data = []

if hasattr(session, 'race_control_messages') and session.race_control_messages is not None:
    rcm = session.race_control_messages
    # filter for PENALTY
    print(f"Total messages: {len(rcm)}")
    penalty_msgs = rcm[rcm['Message'].str.contains("PENALTY", case=False, na=False)]
    print(f"Penalty messages found: {len(penalty_msgs)}")
    
    for idx, row in penalty_msgs.iterrows():
        msg = str(row['Message']).upper()
        print(f"Processing: {msg}")
        
        # Extract Seconds
        sec_match = re.search(r'(\d+)\s+SECOND\s+TIME\s+PENALTY', msg)
        if not sec_match:
            print("  -> No time match")
            continue
        
        seconds = int(sec_match.group(1))
        
        # Extract Driver
        driver_num = row.get('RacingNumber')
        if not driver_num or pd.isna(driver_num):
             drv_match = re.search(r'CAR\s+(\d+)', msg)
             if drv_match:
                 driver_num = drv_match.group(1)
        
        # Calculate Elapsed Time
        # row['Time'] is a Timestamp (datetime), need timedelta relative to session start
        t0 = session.t0_date if hasattr(session, 't0_date') else session.date
        print(f"  DEBUG: row['Time'] type: {type(row['Time'])}, value: {row['Time']}")
        print(f"  DEBUG: t0 type: {type(t0)}, value: {t0}")
        
        try:
             elapsed = row['Time'] - t0
             print(f"  DEBUG: elapsed type: {type(elapsed)}")
             elapsed_seconds = elapsed.total_seconds()
        except Exception as e:
             print(f"  DEBUG: Error calculating elapsed: {e}")
             # fallback if it's already a timedelta?
             if hasattr(row['Time'], 'total_seconds'):
                 elapsed_seconds = row['Time'].total_seconds()
             else:
                 continue
        
        if driver_num:
            print(f"  -> Extracted: Driver {driver_num}, {seconds}s at T+{elapsed_seconds:.1f}s")
            penalty_data.append({
                "time": elapsed_seconds,
                "driver": str(int(driver_num)) if str(driver_num).isdigit() else str(driver_num),
                "seconds": seconds,
                "message": row['Message']
            })
        else:
            print("  -> No driver match")

print("\nFinal Extracted Data:")
print(penalty_data)
