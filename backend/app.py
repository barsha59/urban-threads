# app.py
from flask import Flask
from flask_cors import CORS
from extensions import db
from routes import routes_bp
import os
import models  # 👈 IMPORTANT: ensures models are registered

app = Flask(__name__)
CORS(app)

# ---- DATABASE CONFIGURATION FOR RENDER POSTGRESQL ----
database_url = os.environ.get('DATABASE_URL')

if database_url:
    # Render provides 'postgres://' but SQLAlchemy needs 'postgresql://'
    if database_url.startswith('postgres://'):
        database_url = database_url.replace('postgres://', 'postgresql+pg8000://', 1)
    else:
        # Ensure we're using pg8000 driver
        database_url = database_url.replace('postgresql://', 'postgresql+pg8000://', 1)
    app.config["SQLALCHEMY_DATABASE_URI"] = database_url
    print("✅ Using PostgreSQL database from Render")
else:
    # Fallback to SQLite for local development
    basedir = os.path.abspath(os.path.dirname(__file__))
    instance_path = os.path.join(basedir, "instance")
    os.makedirs(instance_path, exist_ok=True)
    
    app.config["SQLALCHEMY_DATABASE_URI"] = (
        "sqlite:///" + os.path.join(instance_path, "database.db")
    )
    print("⚠️ Using SQLite database (local development)")

app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key')

# ---- INIT DB ----
db.init_app(app)

# 🔥 CREATE TABLES HERE
with app.app_context():
    db.create_all()
    print("✅ Database & tables created")

# ---- REGISTER ROUTES ----
app.register_blueprint(routes_bp)

@app.route("/")
def home():
    return {"message": "Urban-Threads Website 2 API Running - PostgreSQL Edition"}

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))  # Uses PORT from environment or defaults to 5001
    app.run(host="0.0.0.0", port=port)