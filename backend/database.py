import sqlite3
import json
from pathlib import Path
from datetime import datetime

# Store db in data folder
DB_PATH = Path(__file__).parent.parent / "data" / "agrismart.db"

def init_db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Farms table (GeoJSON mapping)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS farms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        geojson TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    
    # Alerts table (NDVI Crop Stress)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        farm_id INTEGER,
        message TEXT NOT NULL,
        ndvi_value REAL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (farm_id) REFERENCES farms (id)
    )
    ''')
    
    conn.commit()
    conn.close()

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

# Execute on import
init_db()
