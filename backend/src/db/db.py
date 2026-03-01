from fastapi import Depends
from typing import Generator
from src.models import User
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from src.db.sql_alchemy import engine, Base

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

def init_db():
    Base.metadata.create_all(bind=engine)

def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
