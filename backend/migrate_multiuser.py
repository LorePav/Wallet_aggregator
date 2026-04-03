import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

load_dotenv(".env")
DATABASE_URL = os.environ.get("DATABASE_URL")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def migrate():
    db = SessionLocal()
    try:
        user_id = "32d50cde-dd5b-458f-8cc2-74ca8ee3a1c5"
        
        # Aggiungi colonne se non esistono
        db.execute(text("ALTER TABLE assets ADD COLUMN IF NOT EXISTS user_id VARCHAR;"))
        db.execute(text("CREATE INDEX IF NOT EXISTS ix_assets_user_id ON assets (user_id);"))
        
        db.execute(text("ALTER TABLE transactions ADD COLUMN IF NOT EXISTS user_id VARCHAR;"))
        db.execute(text("CREATE INDEX IF NOT EXISTS ix_transactions_user_id ON transactions (user_id);"))
        
        db.execute(text("ALTER TABLE daily_snapshots ADD COLUMN IF NOT EXISTS user_id VARCHAR;"))
        db.execute(text("CREATE INDEX IF NOT EXISTS ix_snapshots_user_id ON daily_snapshots (user_id);"))
        
        db.commit()
        
        # Assegna l'user_id ai dati storici nulli
        db.execute(text(f"UPDATE assets SET user_id = '{user_id}' WHERE user_id IS NULL;"))
        db.execute(text(f"UPDATE transactions SET user_id = '{user_id}' WHERE user_id IS NULL;"))
        db.execute(text(f"UPDATE daily_snapshots SET user_id = '{user_id}' WHERE user_id IS NULL;"))
        db.commit()
        
        print("Migrazione completata con successo al database Postgres su Supabase!")
    except Exception as e:
        print("Errore durante la migrazione:", e)
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("Inizio migrazione...")
    migrate()
