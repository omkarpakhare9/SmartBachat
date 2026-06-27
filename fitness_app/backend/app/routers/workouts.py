from __future__ import annotations

from datetime import date as date_cls

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..progression import (
    next_day_after_completion,
    reps_for_day,
    required_day_for,
)

router = APIRouter(prefix="/users/{user_id}/workouts", tags=["workouts"])


def _get_or_create_today_log(
    db: Session, user: models.User, today: date_cls
) -> models.WorkoutLog:
    log = (
        db.query(models.WorkoutLog)
        .filter_by(user_id=user.id, log_date=today)
        .one_or_none()
    )
    if log:
        return log

    day_number = required_day_for(today, user.last_completed, user.current_day or 0)
    if day_number < 1:
        day_number = 1
    log = models.WorkoutLog(
        user_id=user.id,
        log_date=today,
        day_number=day_number,
        target_reps=reps_for_day(day_number),
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


@router.get("/today", response_model=schemas.TodayView)
def today(user_id: int, db: Session = Depends(get_db)) -> schemas.TodayView:
    user = db.get(models.User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="user not found")
    log = _get_or_create_today_log(db, user, date_cls.today())
    return schemas.TodayView(
        day_number=log.day_number,
        target_reps=log.target_reps,
        pushups_done=log.pushups_done,
        situps_done=log.situps_done,
        completed=log.completed,
    )


@router.post("/today/check", response_model=schemas.TodayView)
def check(
    user_id: int,
    payload: schemas.CheckRequest,
    db: Session = Depends(get_db),
) -> schemas.TodayView:
    user = db.get(models.User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="user not found")
    if payload.exercise not in {"pushups", "situps"}:
        raise HTTPException(status_code=400, detail="exercise must be pushups|situps")

    today_d = date_cls.today()
    log = _get_or_create_today_log(db, user, today_d)

    if payload.exercise == "pushups":
        log.pushups_done = payload.done
    else:
        log.situps_done = payload.done

    was_completed = log.completed
    log.completed = log.pushups_done and log.situps_done

    if log.completed and not was_completed:
        update = next_day_after_completion(
            current_day=log.day_number,
            last_completed=user.last_completed,
            today=today_d,
        )
        user.current_day = log.day_number
        user.last_completed = today_d
        _ = update  # reserved for future streak-history bookkeeping

    db.commit()
    db.refresh(log)
    return schemas.TodayView(
        day_number=log.day_number,
        target_reps=log.target_reps,
        pushups_done=log.pushups_done,
        situps_done=log.situps_done,
        completed=log.completed,
    )


@router.get("/history", response_model=list[schemas.WorkoutLogOut])
def history(user_id: int, db: Session = Depends(get_db)) -> list[models.WorkoutLog]:
    user = db.get(models.User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="user not found")
    return (
        db.query(models.WorkoutLog)
        .filter_by(user_id=user_id)
        .order_by(models.WorkoutLog.log_date.desc())
        .all()
    )
