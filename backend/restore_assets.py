from database import SessionLocal
import models

def restore():
    db = SessionLocal()
    OLD_ID = '32d50cde-dd5b-458f-8cc2-74ca8ee3a1c5'
    NEW_ID = 'b0cdcf40-4149-4751-a643-f7f93c605fe2'
    
    try:
        # First, delete all the test data from the NEW_ID that the user created today
        db.query(models.Transaction).filter(models.Transaction.user_id == NEW_ID).delete()
        db.query(models.Asset).filter(models.Asset.user_id == NEW_ID).delete()
        db.query(models.DailySnapshot).filter(models.DailySnapshot.user_id == NEW_ID).delete()
        
        # Now we can safely migrate the old data
        a_count = db.query(models.Asset).filter(models.Asset.user_id == OLD_ID).update({"user_id": NEW_ID})
        t_count = db.query(models.Transaction).filter(models.Transaction.user_id == OLD_ID).update({"user_id": NEW_ID})
        s_count = db.query(models.DailySnapshot).filter(models.DailySnapshot.user_id == OLD_ID).update({"user_id": NEW_ID})
        
        db.commit()
        print(f"Restored {a_count} assets, {t_count} transactions, and {s_count} snapshots to your current account.")
    except Exception as e:
        db.rollback()
        print(f"Error during restore: {e}")
    finally:
        db.close()

if __name__ == '__main__':
    restore()
