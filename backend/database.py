import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker

# Carichiamo le variabili d'ambiente dal file .env (utile per lo sviluppo locale)
load_dotenv()

# Lettura URL del DB dall'ambiente. Fallback: SQLite locale
DATABASE_URL_ENV = os.environ.get("DATABASE_URL")
if not DATABASE_URL_ENV:
    print(
        "[database] ATTENZIONE: DATABASE_URL non impostata. "
        "Uso il SQLite locale (backend/portfolio.db), che è un vecchio file "
        "di test senza user_id. L'app reale usa Supabase: imposta DATABASE_URL "
        "in backend/.env."
    )
SQLALCHEMY_DATABASE_URL = DATABASE_URL_ENV or "sqlite:///./portfolio.db"

# SQLAlchemy 1.4+ vuole 'postgresql://' invece di 'postgres://'
if SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Forziamo il driver psycopg2 (già presente in requirements.txt).
# Le versioni più recenti di SQLAlchemy, su Python 3.14, scelgono di default
# psycopg3 ("psycopg"), che non è installato su Render: senza questa riga il
# deploy fallisce con "ModuleNotFoundError: No module named 'psycopg'".
if SQLALCHEMY_DATABASE_URL.startswith("postgresql://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace(
        "postgresql://", "postgresql+psycopg2://", 1
    )

# connect_args={"check_same_thread": False} serve solo per SQLite
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
    )
else:
    engine = create_engine(SQLALCHEMY_DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()
