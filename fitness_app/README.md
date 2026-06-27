# Fitness Progression App

Daily workout tracker for **Hindu Push-ups** and **Sit-ups**.

- **Day 1** = 9 reps for each exercise.
- Every consecutive day adds **+2 reps**.
- Missing a day resets the streak back to Day 1.
- Each day shows two checkboxes — push-ups and sit-ups. Both must be checked to complete the day.

## Stack

| Layer    | Tech                                   |
| -------- | -------------------------------------- |
| Mobile   | Flutter + Provider                     |
| Backend  | FastAPI + SQLAlchemy + SQLite          |
| Testing  | pytest (unit) + Playwright (API E2E)   |

## Layout

```
fitness_app/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entry
│   │   ├── progression.py       # Rep calculation engine
│   │   ├── database.py          # SQLAlchemy engine + session
│   │   ├── models.py            # User, WorkoutLog, StreakHistory ORM
│   │   ├── schemas.py           # Pydantic request/response
│   │   └── routers/
│   │       ├── users.py
│   │       └── workouts.py      # /today, /today/check, /history
│   └── tests/
│       └── test_progression.py  # 14 unit tests, 30-day simulation
├── mobile/
│   └── lib/
│       ├── main.dart
│       ├── models/workout_day.dart
│       ├── services/
│       │   ├── api_client.dart
│       │   └── progression.dart # Client-side mirror of the algorithm
│       ├── state/workout_state.dart   # Provider, persists via SharedPreferences
│       └── screens/daily_workout_screen.dart
└── e2e/
    ├── playwright.config.ts
    └── tests/workout-flow.spec.ts
```

## Run

### Backend

```bash
cd fitness_app/backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Backend unit tests

```bash
cd fitness_app/backend
.venv/bin/pytest tests/ -v
```

### Mobile

```bash
cd fitness_app/mobile
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8000 --dart-define=USER_ID=1
```

(`10.0.2.2` is how the Android emulator reaches the host. Use `http://localhost:8000` for iOS sim or web.)

### E2E

Backend must be running on `http://localhost:8000`.

```bash
cd fitness_app/e2e
npm install
npx playwright install chromium
npm test
```
