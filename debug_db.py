import sqlite3
import pprint

conn = sqlite3.connect('backend/portfolio.db')
c = conn.cursor()

c.execute("SELECT * FROM assets")
print("ASSETS:")
for row in c.fetchall():
    print(row)

c.execute("SELECT * FROM transactions")
print("TRANSACTIONS:")
for row in c.fetchall():
    print(row)
