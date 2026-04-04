import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv(".env")
DATABASE_URL = os.environ.get("DATABASE_URL")

engine = create_engine(DATABASE_URL)

try:
    with engine.connect() as conn:
        with conn.begin():
            print("Dropping old unique index if exists...")
            # Supabase Postgres: DROP INDEX name CASCADE will drop constraints relying on it.
            conn.execute(text("DROP INDEX IF EXISTS ix_daily_snapshots_date CASCADE;"))
            
            print("Creating new non-unique index on date...")
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_daily_snapshots_date ON daily_snapshots(date);"))
            
            print("Dropping uq_user_date constraint if it exists...")
            conn.execute(text("ALTER TABLE daily_snapshots DROP CONSTRAINT IF EXISTS uq_user_date;"))
            
            print("Adding uq_user_date unique constraint...")
            conn.execute(text("ALTER TABLE daily_snapshots ADD CONSTRAINT uq_user_date UNIQUE (user_id, date);"))
            
    print("Migrazione vincoli DB completata con successo!")
except Exception as e:
    print(f"Errore durante la migrazione: {e}")
