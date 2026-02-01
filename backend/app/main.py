from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .replay import generate_replay, get_schedule

app = FastAPI(title="F1Sync API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"status": "F1Sync backend running"}

@app.get("/replay/{year}/{race}")
def replay(year: int, race: str):
    return generate_replay(year, race)

@app.get("/schedule/{year}")
def schedule(year: int):
    return get_schedule(year)
