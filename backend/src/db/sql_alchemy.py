from sqlalchemy.orm import declarative_base
from sqlalchemy import create_engine
from src.core.config import DATABASE_URL

Base = declarative_base()

engine = create_engine(DATABASE_URL, echo=True)
