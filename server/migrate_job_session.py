import sqlite3
import os

def run_migration():
    db_path = os.path.join(os.path.dirname(__file__), "jobs.db")
    print(f"Connecting to database: {db_path}")

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    try:
        cursor.execute("ALTER TABLE jobs ADD COLUMN session_id INTEGER REFERENCES list_sessions(id) ON DELETE SET NULL;")
        conn.commit()
        print("Database altered successfully: session_id column added to jobs table.")
    except sqlite3.OperationalError as e:
        print("Database alter skipped / column might already exist:", e)
    finally:
        conn.close()

if __name__ == "__main__":
    run_migration()
