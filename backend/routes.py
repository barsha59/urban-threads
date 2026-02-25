# routes.py - FASHION E-COMMERCE SITE
from flask import Blueprint, request, jsonify, current_app
from extensions import db
from models import Product, Order, Review, User, Wishlist 
import stripe
import os
import traceback
from werkzeug.security import generate_password_hash

# ----------------------
# API KEY AUTH MIDDLEWARE
# ----------------------
from functools import wraps

API_KEY = os.environ.get("API_KEY")  # should be set in your .env / docker-compose
print("Loaded API_KEY:", API_KEY) 


def require_api_key(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        key = request.headers.get("x-api-key")
        if not key or key != API_KEY:
            return jsonify({"error": "Unauthorized"}), 401
        return f(*args, **kwargs)
    return decorated

# -------------------------------------------------------


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



# ----------------------
# SECURE GET PRODUCTS (API KEY REQUIRED)
# ----------------------
@routes_bp.route('/api/secure/products', methods=['GET'])
@require_api_key
def get_secure_products():
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
            "image": p.image_url,
            "description": p.description
        }
        for p in products
    ])
# ---------------------------------------------------------------------------------------------------



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



@routes_bp.route("/products/search", methods=["GET"])
def search_products():
    """
    Search products by query string 'q' and optional 'limit'
    Example: /products/search?q=jacket&limit=20
    """
    query = request.args.get("q", "").strip()
    limit = int(request.args.get("limit", 20))

    if not query:
        return jsonify({"products": []}), 200

    # Simple search: name or description contains query (case-insensitive)
    products = (
        Product.query
        .filter(
            (Product.name.ilike(f"%{query}%")) |
            (Product.description.ilike(f"%{query}%"))
        )
        .limit(limit)
        .all()
    )

    results = []
    for p in products:
        results.append({
            "id": p.id,
            "name": p.name,
            "price": float(p.price),
            "rating": float(getattr(p, "rating", 0)),
            "review_count": int(getattr(p, "review_count", 0)),
            "category": p.category or "Unknown",
            "stock": int(getattr(p, "stock", 0)),
            "image_url": p.image_url or "",
            "description": p.description or "",
            "brand": getattr(p, "brand", ""),
            "url": getattr(p, "url", ""),
        })

    return jsonify({"products": results}), 200

@routes_bp.route("/api/orders", methods=["POST", "OPTIONS"])
def create_order():
    if request.method == "OPTIONS":
        return "", 200

    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        # Create a simple order record (even with only first product)
        cart_items = data.get("cart", [])
        if not cart_items:
            return jsonify({"error": "Cart is empty"}), 400

        product_id = cart_items[0]["product_id"]  # take first product
        order = Order(
            product_id=product_id,
            customer_name=data.get("customer_name"),
            address=data.get("address"),
            phone=data.get("phone")
        )
        db.session.add(order)
        db.session.commit()

        # Calculate total
        subtotal = sum(Product.query.get(item["product_id"]).price * item["quantity"] for item in cart_items)
        tax = subtotal * 0.18
        total_amount = subtotal + tax

        # Stripe PaymentIntent
        intent = stripe.PaymentIntent.create(
            amount=int(total_amount * 100),  # in cents
            currency="usd",
            payment_method_types=["card"]
        )

        return jsonify({
            "order_ids": [order.id],   # <-- return as array
            "client_secret": intent.client_secret
        })

    except Exception as e:
        print("🔥 /api/orders error:", e)
        return jsonify({"error": str(e)}), 500

@routes_bp.route("/api/pay", methods=["POST", "OPTIONS"])
def handle_pay():
    if request.method == "OPTIONS":
        return "", 200

    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        intent = stripe.PaymentIntent.create(
            amount=int(data.get("amount", 1000)),  # in cents
            currency="usd",
            payment_method_types=["card"]
        )

        return jsonify({"client_secret": intent.client_secret})
    except Exception as e:
        print("🔥 /api/pay error:", e)
        return jsonify({"error": str(e)}), 500



# ----------------------
# CONFIRM ORDER PAYMENT
# ----------------------
@routes_bp.route('/api/orders/<int:order_id>/pay', methods=['POST'])
def confirm_payment(order_id):
    order = Order.query.get(order_id)
    if not order:
        return jsonify({"error": "Order not found"}), 404

    order.status = "Paid"
    db.session.commit()
    return jsonify({"message": f"Order {order_id} marked as Paid"})
