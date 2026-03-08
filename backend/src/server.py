import os
from contextlib import asynccontextmanager
from src.db.db import init_db
from fastapi import FastAPI
from src.core.config import UPLOAD_DIR
from fastapi.middleware.cors import CORSMiddleware
from src.api.v1.routes.auth import router as auth_router
from src.api.v1.routes.media import router as media_router
from src.api.v1.routes.media_bin import router as media_bin_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    init_db()
    yield

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://localhost:3000",
    "https://127.0.0.1:3000",
]
app = FastAPI(title="memohub_server", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth_router)
app.include_router(media_router)
app.include_router(media_bin_router)
