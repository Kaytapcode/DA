"""One-shot — promote test_sysadmin user to SysAdmin role for live-stack tests."""
import psycopg2

conn = psycopg2.connect(
    host='160.187.247.136', port=5432,
    database='smart_lms_db', user='admin101', password='Khoa_Long_123'
)
cur = conn.cursor()
cur.execute("UPDATE users SET role='SysAdmin' WHERE username='test_sysadmin'")
print(f'rows updated: {cur.rowcount}')
conn.commit()
cur.execute("SELECT username, role FROM users WHERE username='test_sysadmin'")
print(cur.fetchone())
conn.close()
