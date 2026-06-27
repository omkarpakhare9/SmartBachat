from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr


class UserCreate(BaseModel):
    email: EmailStr
    name: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    name: str
    current_day: int
    last_completed: date | None


class WorkoutLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    log_date: date
    day_number: int
    target_reps: int
    pushups_done: bool
    situps_done: bool
    completed: bool
    created_at: datetime


class TodayView(BaseModel):
    day_number: int
    target_reps: int
    pushups_done: bool
    situps_done: bool
    completed: bool


class CheckRequest(BaseModel):
    exercise: str  # "pushups" | "situps"
    done: bool = True
