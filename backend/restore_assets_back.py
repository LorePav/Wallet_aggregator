from database import SessionLocal
import models

def restore():
    db = SessionLocal()
    ID_A = 'b0cdcf40-4149-4751-a643-f7f93c605fe2' # Where the data is right now
    ID_B = '32d50cde-dd5b-458f-8cc2-74ca8ee3a1c5' # The real account
    
    try:
        # Move all data from ID_A to ID_B
        a_count = db.query(models.Asset).filter(models.Asset.user_id == ID_A).update({"user_id": ID_B})
        t_count = db.query(models.Transaction).filter(models.Transaction.user_id == ID_A).update({"user_id": ID_B})
        s_count = db.query(models.DailySnapshot).filter(models.DailySnapshot.user_id == ID_A).update({"user_id": ID_B})
        
        db.commit()
        print(f"Moved {a_count} assets, {t_count} tx, and {s_count} snaps BACK to {ID_B}")
    except Exception as e:
        db.rollback()
        print(f"Error during restore: {e}")
    finally:
        db.close()

if __name__ == '__main__':
    restore()
