import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

load_dotenv(".env")
DATABASE_URL = os.environ.get("DATABASE_URL")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def enable_rls():
    db = SessionLocal()
    try:
        # Abilita RLS
        db.execute(text("ALTER TABLE assets ENABLE ROW LEVEL SECURITY;"))
        db.execute(text("ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;"))
        db.execute(text("ALTER TABLE daily_snapshots ENABLE ROW LEVEL SECURITY;"))
        
        tables = ["assets", "transactions", "daily_snapshots"]
        
        for table in tables:
            # Rimuovi policy se presenti (per poter eseguire più volte lo script senza errori)
            db.execute(text(f'DROP POLICY IF EXISTS "Users can only read their own {table}" ON {table};'))
            db.execute(text(f'DROP POLICY IF EXISTS "Users can only insert their own {table}" ON {table};'))
            db.execute(text(f'DROP POLICY IF EXISTS "Users can only update their own {table}" ON {table};'))
            db.execute(text(f'DROP POLICY IF EXISTS "Users can only delete their own {table}" ON {table};'))
            
            db.execute(text(f"""
                CREATE POLICY "Users can only read their own {table}" ON {table} 
                FOR SELECT USING (auth.uid()::text = user_id);
            """))
            db.execute(text(f"""
                CREATE POLICY "Users can only insert their own {table}" ON {table} 
                FOR INSERT WITH CHECK (auth.uid()::text = user_id);
            """))
            db.execute(text(f"""
                CREATE POLICY "Users can only update their own {table}" ON {table} 
                FOR UPDATE USING (auth.uid()::text = user_id);
            """))
            db.execute(text(f"""
                CREATE POLICY "Users can only delete their own {table}" ON {table} 
                FOR DELETE USING (auth.uid()::text = user_id);
            """))
            
        db.commit()
        print("RLS (Row Level Security) abilitata con successo su tutte le tabelle!")
    except Exception as e:
        print("Errore durante l'abilitazione di RLS:", e)
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("Inizio abilitazione RLS su Supabase...")
    enable_rls()
