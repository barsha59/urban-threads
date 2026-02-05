# app.py
from flask import Flask
from flask_cors import CORS
from extensions import db
from routes import routes_bp
import os
import models  
from dotenv import load_dotenv

load_dotenv()

import stripe
stripe.api_key = os.environ.get("STRIPE_SECRET_KEY")
print("Stripe key loaded:", stripe.api_key[:10] + "..." if stripe.api_key else "Not found")

app = Flask(__name__)
CORS(app)


# ---- SIMPLE SQLITE DATABASE CONFIGURATION ----
basedir = os.path.abspath(os.path.dirname(__file__))
instance_path = os.path.join(basedir, "instance")
os.makedirs(instance_path, exist_ok=True)

# Configure SQLite database
app.config["SQLALCHEMY_DATABASE_URI"] = (
    "sqlite:///" + os.path.join(instance_path, "database.db")
)
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key')

print("✅ Using SQLite database (local development)")
print(f"📁 Database file location: {os.path.join(instance_path, 'database.db')}")

# ---- INIT DB ----
db.init_app(app)

# 🔥 CREATE TABLES
with app.app_context():
    db.create_all()
    print("✅ Database & tables created")

# ---- REGISTER ROUTES ----
app.register_blueprint(routes_bp)

@app.route("/")
def home():
    return {"message": "Urban-Threads Website 2 API Running - Local Development"}

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    app.run(host="0.0.0.0", port=port, debug=True)