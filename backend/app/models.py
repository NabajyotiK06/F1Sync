from pydantic import BaseModel
from typing import List

class Point(BaseModel):
    x: float
    y: float

class CarReplay(BaseModel):
    driver: str
    points: List[Point]
