import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker

# Carichiamo le variabili d'ambiente dal file .env (utile per lo sviluppo locale)
load_dotenv()

# Lettura URL del DB dall'ambiente. Fallback: SQLite locale
SQLALCHEMY_DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./portfolio.db")

# SQLAlchemy 1.4+ vuole 'postgresql://' invece di 'postgres://'
if SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)

# connect_args={"check_same_thread": False} serve solo per SQLite
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
    )
else:
    engine = create_engine(SQLALCHEMY_DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()
