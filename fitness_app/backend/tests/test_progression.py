"""Unit tests for the progression algorithm over a 30-day simulated period."""

from __future__ import annotations

from datetime import date, timedelta

import pytest

from app.progression import (
    INCREMENT,
    START_REPS,
    next_day_after_completion,
    reps_for_day,
    required_day_for,
)


def test_day_one_is_nine_reps() -> None:
    assert reps_for_day(1) == 9


def test_day_two_is_eleven_reps() -> None:
    assert reps_for_day(2) == 11


def test_day_three_is_thirteen_reps() -> None:
    assert reps_for_day(3) == 13


def test_thirty_day_simulation_arithmetic() -> None:
    expected = [9 + 2 * (n - 1) for n in range(1, 31)]
    actual = [reps_for_day(n) for n in range(1, 31)]
    assert actual == expected
    assert actual[0] == 9
    assert actual[-1] == 67
    diffs = [actual[i + 1] - actual[i] for i in range(len(actual) - 1)]
    assert all(d == INCREMENT for d in diffs)


def test_thirty_day_streak_advances_correctly() -> None:
    """Simulate 30 consecutive days of completion; current_day must reach 30."""
    start = date(2026, 1, 1)
    current_day = 1
    last_completed: date | None = None

    for offset in range(30):
        today = start + timedelta(days=offset)
        update = next_day_after_completion(current_day, last_completed, today)
        last_completed = today
        if offset < 29:
            current_day = update.new_day
        else:
            assert current_day == 30
            assert reps_for_day(current_day) == 67

    assert reps_for_day(30) == 67


def test_streak_resets_after_missed_day() -> None:
    today = date(2026, 1, 5)
    yesterday_minus_one = today - timedelta(days=2)  # missed yesterday
    update = next_day_after_completion(
        current_day=10, last_completed=yesterday_minus_one, today=today
    )
    assert update.reset is True
    assert update.new_day == 1


def test_same_day_double_submit_is_idempotent() -> None:
    today = date(2026, 1, 5)
    update = next_day_after_completion(
        current_day=7, last_completed=today, today=today
    )
    assert update.new_day == 7
    assert update.reset is False


def test_consecutive_day_increments() -> None:
    yesterday = date(2026, 1, 4)
    today = date(2026, 1, 5)
    update = next_day_after_completion(
        current_day=12, last_completed=yesterday, today=today
    )
    assert update.new_day == 13
    assert update.reset is False


def test_required_day_first_ever_visit() -> None:
    assert required_day_for(date(2026, 1, 1), None, 0) == 1


def test_required_day_after_consecutive() -> None:
    yesterday = date(2026, 1, 4)
    today = date(2026, 1, 5)
    assert required_day_for(today, yesterday, 12) == 13


def test_required_day_resets_after_gap() -> None:
    today = date(2026, 1, 10)
    last = date(2026, 1, 4)
    assert required_day_for(today, last, 20) == 1


def test_required_day_same_day() -> None:
    today = date(2026, 1, 5)
    assert required_day_for(today, today, 7) == 7


def test_reps_for_day_rejects_zero() -> None:
    with pytest.raises(ValueError):
        reps_for_day(0)


def test_start_constants() -> None:
    assert START_REPS == 9
    assert INCREMENT == 2
