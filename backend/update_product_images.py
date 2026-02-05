# backend/update_product_images.py
from app import app
from extensions import db
from models import Product
from urllib.parse import quote

with app.app_context():
    products = Product.query.all()
    for p in products:
        # Only update if it does not have a custom text in URL
        if "text=" not in p.image_url:
            p.image_url = f"https://via.placeholder.com/200?text={quote(p.name)}"
            print(f"Updated: {p.name}")
    db.session.commit()
    print("✅ All existing product images updated.")
