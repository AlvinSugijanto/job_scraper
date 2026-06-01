import sqlite3

conn = sqlite3.connect("jobs.db")
cur = conn.cursor()

cur.execute("SELECT COUNT(*) FROM jobs WHERE job_type != 'remote' OR job_type IS NULL")
print("Rows to delete:", cur.fetchone()[0])

cur.execute("DELETE FROM jobs WHERE job_type != 'remote' OR job_type IS NULL")
conn.commit()

print("Done, rows remaining:", conn.execute("SELECT COUNT(*) FROM jobs").fetchone()[0])
conn.close()
