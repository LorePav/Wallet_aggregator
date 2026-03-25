import sqlite3

conn = sqlite3.connect('portfolio.db')
conn.row_factory = sqlite3.Row
c = conn.cursor()
c.execute("SELECT * FROM transactions ORDER BY id DESC LIMIT 5")
for row in c.fetchall():
    print(dict(row))
