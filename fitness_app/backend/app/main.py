from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import Base, engine
from .routers import users, workouts

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Fitness Progression API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router)
app.include_router(workouts.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
