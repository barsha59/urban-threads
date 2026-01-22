# backend/seed.py
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import app
from extensions import db
from models import Product

# Sample fashion products for Urban Threads
sample_products = [
    {
        "name": "Blue Denim Jacket",
        "price": 45.99,
        "rating": 4.7,
        "review_count": 189,
        "category": "Jackets",
        "stock": 35,
        "image_url": "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=300",
        "description": "Classic blue denim jacket, perfect for casual outings."
    },
    {
        "name": "White Summer Dress",
        "price": 39.99,
        "rating": 4.8,
        "review_count": 245,
        "category": "Dresses",
        "stock": 50,
        "image_url": "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=300",
        "description": "Light and breezy white summer dress with floral pattern."
    },
    {
        "name": "Leather Ankle Boots",
        "price": 79.99,
        "rating": 4.6,
        "review_count": 178,
        "category": "Footwear",
        "stock": 25,
        "image_url": "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=300",
        "description": "Genuine leather ankle boots for all seasons."
    },
    {
        "name": "Cashmere Sweater",
        "price": 89.99,
        "rating": 4.9,
        "review_count": 312,
        "category": "Sweaters",
        "stock": 40,
        "image_url": "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=300",
        "description": "100% cashmere sweater, ultra soft and warm."
    },
    {
        "name": "Slim Fit Chinos",
        "price": 34.99,
        "rating": 4.5,
        "review_count": 267,
        "category": "Pants",
        "stock": 60,
        "image_url": "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=300",
        "description": "Comfortable slim fit chinos in multiple colors."
    },
    {
        "name": "Designer Handbag",
        "price": 129.99,
        "rating": 4.7,
        "review_count": 156,
        "category": "Accessories",
        "stock": 20,
        "image_url": "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=300",
        "description": "Premium designer handbag with multiple compartments."
    },
    {
        "name": "Cotton T-Shirt Pack",
        "price": 29.99,
        "rating": 4.4,
        "review_count": 421,
        "category": "T-Shirts",
        "stock": 100,
        "image_url": "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=300",
        "description": "Pack of 3 basic cotton t-shirts in assorted colors."
    },
    {
        "name": "Wool Winter Coat",
        "price": 149.99,
        "rating": 4.8,
        "review_count": 89,
        "category": "Coats",
        "stock": 15,
        "image_url": "https://images.unsplash.com/photo-1539533017444-6d1c6a40c4b4?w=300",
        "description": "Warm wool winter coat with faux fur lining."
    }
]

def seed_database():
    with app.app_context():
        db.create_all()  # Create tables if not exist
        for prod in sample_products:
            existing = Product.query.filter_by(name=prod['name']).first()
            if not existing:
                new_prod = Product(
                    name=prod['name'],
                    price=prod['price'],
                    rating=prod['rating'],
                    review_count=prod['review_count'],
                    category=prod['category'],
                    stock=prod['stock'],
                    image_url=prod['image_url'],
                    description=prod['description']
                )
                db.session.add(new_prod)
        db.session.commit()
        print("✅ Fashion products inserted into database!")

if __name__ == "__main__":
    seed_database()
