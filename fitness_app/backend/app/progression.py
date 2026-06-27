"""Daily rep progression engine.

Day 1 starts at 9 reps. Every subsequent consecutive day adds exactly 2 reps.
Missing a day resets the streak back to Day 1.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta

START_REPS = 9
INCREMENT = 2


def reps_for_day(day_number: int) -> int:
    if day_number < 1:
        raise ValueError("day_number must be >= 1")
    return START_REPS + INCREMENT * (day_number - 1)


@dataclass(frozen=True)
class StreakUpdate:
    new_day: int
    reset: bool


def next_day_after_completion(
    current_day: int,
    last_completed: date | None,
    today: date,
) -> StreakUpdate:
    """Given the day just completed, compute the next day's number.

    - First-ever completion: returns day 2 (today was day 1).
    - Same-day double-submit: no-op, returns current_day unchanged.
    - Consecutive day (yesterday): increments.
    - Gap of 2+ days: streak reset, next day is day 1 (caller starts over tomorrow).
    """
    if last_completed is None:
        return StreakUpdate(new_day=current_day + 1, reset=False)

    if today == last_completed:
        return StreakUpdate(new_day=current_day, reset=False)

    gap = (today - last_completed).days
    if gap == 1:
        return StreakUpdate(new_day=current_day + 1, reset=False)

    return StreakUpdate(new_day=1, reset=True)


def required_day_for(today: date, last_completed: date | None, current_day: int) -> int:
    """The day-number the user should perform today (before completing it).

    Used by the UI to show today's target reps.
    """
    if last_completed is None:
        return 1 if current_day == 0 else current_day
    if today == last_completed:
        return current_day
    gap = (today - last_completed).days
    if gap == 1:
        return current_day + 1
    return 1
