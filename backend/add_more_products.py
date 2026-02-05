# backend/add_more_products.py
from app import app
from extensions import db
from models import Product
import random
from urllib.parse import quote  # <-- for URL encoding

def add_products():
    with app.app_context():
        try:
            # -----------------------------
            # 20 Unique Products
            # -----------------------------
            unique_products = [
                {"name": "Urban Threads Graphic Tee", "price": 25.99, "category": "T-Shirts"},
                {"name": "Classic Fit Denim Jeans", "price": 49.99, "category": "Jeans"},
                {"name": "Floral Summer Dress", "price": 39.99, "category": "Dresses"},
                {"name": "Leather Biker Jacket", "price": 89.99, "category": "Jackets"},
                {"name": "Running Sneakers", "price": 59.99, "category": "Footwear"},
                {"name": "Wool Winter Scarf", "price": 19.99, "category": "Accessories"},
                {"name": "Slim Fit Blazer", "price": 79.99, "category": "Suits & Blazers"},
                {"name": "Yoga Crop Top", "price": 29.99, "category": "Activewear"},
                {"name": "Laptop Backpack", "price": 49.99, "category": "Accessories"},
                {"name": "Casual Hoodie", "price": 34.99, "category": "Sweaters"},
                {"name": "Corduroy Pants", "price": 39.99, "category": "Pants"},
                {"name": "Trench Coat", "price": 129.99, "category": "Coats"},
                {"name": "Bluetooth Headphones", "price": 79.99, "category": "Electronics"},
                {"name": "Smartwatch Series 5", "price": 199.99, "category": "Electronics"},
                {"name": "Classic Leather Belt", "price": 24.99, "category": "Accessories"},
                {"name": "Denim Skirt", "price": 44.99, "category": "Dresses"},
                {"name": "High-Top Sneakers", "price": 69.99, "category": "Footwear"},
                {"name": "Cashmere Cardigan", "price": 89.99, "category": "Sweaters"},
                {"name": "Chino Shorts", "price": 29.99, "category": "Pants"},
                {"name": "Sport Jacket", "price": 99.99, "category": "Jackets"},
            ]

            # Add Unique Products
            for p in unique_products:
                encoded_name = quote(p["name"])  # <-- encode the name
                product = Product(
                    name=p["name"],
                    price=p["price"],
                    rating=round(random.uniform(4.0, 5.0), 1),
                    review_count=random.randint(10, 300),
                    category=p["category"],
                    stock=random.randint(10, 100),
                    image_url=f"https://via.placeholder.com/200?text={encoded_name}",
                    description=f"{p['name']} - High quality {p['category']} product."
                )
                db.session.add(product)

            db.session.commit()
            print(f"✅ Added {len(unique_products)} unique products.")

            # -----------------------------
            # 30 Variations
            # -----------------------------
            base_products = unique_products
            colors = ["Red", "Blue", "Green", "Black", "White", "Yellow", "Purple", "Pink", "Grey"]
            sizes = ["S", "M", "L", "XL"]
            variation_count = 30

            for i in range(variation_count):
                base = random.choice(base_products)
                color = random.choice(colors)
                size = random.choice(sizes)
                name = f"{base['name']} ({color} / {size})"
                price = round(base['price'] * random.uniform(0.9, 1.1), 2)
                encoded_name = quote(name)  # <-- encode the name
                product = Product(
                    name=name,
                    price=price,
                    rating=round(random.uniform(4.0, 5.0), 1),
                    review_count=random.randint(5, 200),
                    category=base["category"],
                    stock=random.randint(5, 50),
                    image_url=f"https://via.placeholder.com/200?text={encoded_name}",
                    description=f"{name} - Variant of {base['name']}."
                )
                db.session.add(product)

            db.session.commit()
            print(f"✅ Added {variation_count} product variations.")

        except Exception as e:
            print("❌ Error adding products:", e)

if __name__ == "__main__":
    add_products()
