# routes.py - FASHION E-COMMERCE SITE
from flask import Blueprint, request, jsonify, current_app
from extensions import db
from models import Product, Order, Review, User, Wishlist 
import stripe
import os
import traceback
from werkzeug.security import generate_password_hash


print("✅ routes.py loaded - Fashion Store")

routes_bp = Blueprint("routes", __name__)
# Stripe secret key
stripe.api_key = os.environ.get("STRIPE_SECRET_KEY", "")

# ----------------------
# USER AUTHENTICATION
# ----------------------
@routes_bp.route('/api/register', methods=['POST'])
def register():
    data = request.json
    email = data.get('email')
    name = data.get('name')
    password = data.get('password')
    
    if not email or not name or not password:
        return jsonify({"error": "All fields are required"}), 400

    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        return jsonify({"error": "Email already registered"}), 400

    user = User(email=email, name=name)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    
    return jsonify({
        "message": "User registered successfully",
        "user": {"id": user.id, "email": user.email, "name": user.name}
    })


@routes_bp.route('/api/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return jsonify({"error": "Email and password required"}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({"error": "Invalid email or password"}), 401

    return jsonify({
        "message": "Login successful",
        "user": {"id": user.id, "email": user.email, "name": user.name}
    })



# ----------------------
# GET all products
# ----------------------
@routes_bp.route('/api/products', methods=['GET'])
def get_products():
    sort_by = request.args.get('sort')
    if sort_by == "price":
        products = Product.query.order_by(Product.price.asc()).all()
    elif sort_by == "rating":
        products = Product.query.order_by(Product.rating.desc()).all()
    else:
        products = Product.query.all()

    return jsonify([
        {
            "id": p.id,
            "name": p.name,
            "price": p.price,
            "rating": p.rating,
            "reviews": p.review_count,
            "category": p.category,
            "stock": p.stock,
            "image_url": p.image_url,  # always use image_url key
            "description": p.description
        }
        for p in products
    ])

@routes_bp.route('/api/products/<int:product_id>', methods=['GET'])
def get_product(product_id):
    product = Product.query.get(product_id)
    if not product:
        return jsonify({"error": "Product not found"}), 404
    
    return jsonify({
        "id": product.id,
        "name": product.name,
        "price": product.price,
        "rating": product.rating,
        "reviews": product.review_count,
        "category": product.category,
        "stock": product.stock,
        "image_url": product.image_url,
        "description": product.description
    })

# ----------------------
# ADD SAMPLE PRODUCTS (UPDATED FOR WORKING IMAGES)
# ----------------------
@routes_bp.route('/api/add-sample-products')
def add_sample_products():
    """Add sample fashion products to database with working images"""
    try:
        current_count = Product.query.count()
        if current_count > 0:
            return jsonify({
                "status": "info",
                "message": f"Already have {current_count} products. No need to add samples."
            })

        sample_products = [
            {"name": "Urban Threads Premium T-Shirt", "price": 24.99, "rating": 4.5, "review_count": 128,
             "category": "T-Shirts", "stock": 100,
             "image_url": "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w-400-h-400",
             "description": "100% Cotton, comfortable fit, modern design"},
            {"name": "Designer Denim Jeans", "price": 59.99, "rating": 4.3, "review_count": 89,
             "category": "Jeans", "stock": 50,
             "image_url": "https://images.unsplash.com/photo-1610945264815-d3e49530c1a0?w-400-h-400",
             "description": "Slim fit, stretch denim, premium quality"},
            {"name": "Summer Floral Dress", "price": 39.99, "rating": 4.7, "review_count": 203,
             "category": "Dresses", "stock": 30,
             "image_url": "https://images.unsplash.com/photo-1587760489475-8f6c6c876d64?w-400-h-400",
             "description": "Lightweight floral pattern, perfect for summer"},
            {"name": "Classic Leather Jacket", "price": 89.99, "rating": 4.6, "review_count": 67,
             "category": "Jackets", "stock": 20,
             "image_url": "https://images.unsplash.com/photo-1551028719-00167b16eac5?w-400-h-400",
             "description": "Genuine leather, timeless style"},
            {"name": "Casual Sneakers", "price": 49.99, "rating": 4.4, "review_count": 156,
             "category": "Footwear", "stock": 75,
             "image_url": "https://images.unsplash.com/photo-1549298916-b41d501d3772?w-400-h-400",
             "description": "Comfortable everyday shoes, versatile style"},
            {"name": "Winter Beanie", "price": 19.99, "rating": 4.2, "review_count": 45,
             "category": "Accessories", "stock": 150,
             "image_url": "https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?w-400-h-400",
             "description": "Warm woolen beanie, multiple colors available"},
            {"name": "Formal Blazer", "price": 79.99, "rating": 4.5, "review_count": 92,
             "category": "Suits & Blazers", "stock": 25,
             "image_url": "https://images.unsplash.com/photo-1594938374182-2510c5c63f8a?w-400-h-400",
             "description": "Professional look, perfect for office wear"},
            {"name": "Yoga Leggings", "price": 34.99, "rating": 4.8, "review_count": 210,
             "category": "Activewear", "stock": 60,
             "image_url": "https://images.unsplash.com/photo-1587563871167-1ee9c731c62a?w-400-h-400",
             "description": "High-waisted, moisture-wicking, comfortable fit"}
        ]

        added_count = 0
        for prod_data in sample_products:
            product = Product(
                name=prod_data["name"],
                price=prod_data["price"],
                rating=prod_data["rating"],
                review_count=prod_data["review_count"],
                category=prod_data["category"],
                stock=prod_data["stock"],
                image_url=prod_data["image_url"],
                description=prod_data["description"]
            )
            db.session.add(product)
            added_count += 1

        db.session.commit()

        return jsonify({
            "status": "success",
            "message": f"Added {added_count} fashion products to database",
            "products_added": [p["name"] for p in sample_products]
        })

    except Exception as e:
        return jsonify({
            "status": "error",
            "error": str(e),
            "traceback": traceback.format_exc() if traceback else None
        }), 500
