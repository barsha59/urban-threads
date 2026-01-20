# routes.py - FASHION E-COMMERCE SITE
from flask import Blueprint, request, jsonify, current_app
from extensions import db
from models import Product, Order, Review, User, Wishlist 
import stripe
import os
import traceback

print("✅ routes.py loaded - Fashion Store")

routes_bp = Blueprint("routes", __name__)

# Stripe test secret key
stripe.api_key = os.environ.get("STRIPE_SECRET_KEY")

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
            "image": p.image_url,
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
# CREATE ORDER
# ----------------------
@routes_bp.route('/api/orders', methods=['POST'])
def create_order():
    data = request.json
    customer_name = data.get("customer_name")
    address = data.get("address")
    phone = data.get("phone")
    cart_items = data.get("cart")  # Expecting: [{"product_id":1,"quantity":2}, ...]

    if not customer_name or not address or not phone:
        return jsonify({"error": "Customer info is required"}), 400

    if not cart_items or not isinstance(cart_items, list):
        return jsonify({"error": "Cart is empty or invalid"}), 400

    orders_created = []

    for item in cart_items:
        product_id = item.get("product_id")
        quantity = item.get("quantity", 1)

        product = Product.query.get(product_id)
        if not product:
            return jsonify({"error": f"Product ID {product_id} not found"}), 404

        if product.stock < quantity:
            return jsonify({"error": f"{product.name} out of stock"}), 400

        # Create one Order record per cart item
        order = Order(
            product_id=product.id,
            customer_name=customer_name,
            address=address,
            phone=phone,
            status="Pending"
        )
        db.session.add(order)
        orders_created.append(order)

        # Reduce product stock
        product.stock -= quantity

    db.session.commit()

    return jsonify({
        "message": "Orders placed successfully",
        "order_ids": [o.id for o in orders_created]
    })


# ----------------------
# ADD REVIEW
# ----------------------
@routes_bp.route('/api/reviews', methods=['POST'])
def add_review():
    data = request.json
    print("DEBUG - Received review data:", data)
    product_id = data.get("product_id")
    rating = data.get("rating")
    comment = data.get("comment", "")

    if product_id is None or rating is None:
        return jsonify({"error": "Product ID and rating are required"}), 400

    review = Review(product_id=product_id, rating=rating, comment=comment)
    db.session.add(review)

    product = Product.query.get(product_id)
    if product:
        all_reviews = Review.query.filter_by(product_id=product_id).all()
        product.review_count = len(all_reviews)
        product.rating = sum(r.rating for r in all_reviews) / len(all_reviews)

    db.session.commit()
    return jsonify({"message": "Review added successfully"})

# ----------------------
# STRIPE PAYMENT
# ----------------------
@routes_bp.route('/api/pay', methods=['POST'])
def create_payment():
    data = request.json
    amount = data.get("amount")  # in cents

    if not amount:
        return jsonify({"error": "Amount is required"}), 400

    try:
        intent = stripe.PaymentIntent.create(
            amount=int(amount),
            currency="usd",
            payment_method_types=["card"],
        )
        return jsonify({"client_secret": intent.client_secret})
    except Exception as e:
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
    
    # Check if user exists
    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        return jsonify({"error": "Email already registered"}), 400
    
    # Create new user
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
# PRODUCT SEARCH (FOR CHATBOT)
# ----------------------
@routes_bp.route('/api/products/search', methods=['GET'])
def search_products():
    query = request.args.get('q', '').lower()
    category = request.args.get('category', '')
    min_price = request.args.get('min_price')
    max_price = request.args.get('max_price')
    
    # Start with all products
    products_query = Product.query
    
    # Apply filters
    if query:
        products_query = products_query.filter(
            Product.name.ilike(f'%{query}%') | 
            Product.description.ilike(f'%{query}%')
        )
    
    if category:
        products_query = products_query.filter_by(category=category)
    
    if min_price:
        try:
            products_query = products_query.filter(Product.price >= float(min_price))
        except:
            pass
    
    if max_price:
        try:
            products_query = products_query.filter(Product.price <= float(max_price))
        except:
            pass
    
    products = products_query.all()
    
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

# ----------------------
# GET PRODUCT DETAILS WITH REVIEWS
# ----------------------
@routes_bp.route('/api/products/<int:product_id>/details', methods=['GET'])
def get_product_details(product_id):
    product = Product.query.get(product_id)
    if not product:
        return jsonify({"error": "Product not found"}), 404
    
    # Get reviews for this product
    reviews = Review.query.filter_by(product_id=product_id).all()
    
    return jsonify({
        "id": product.id,
        "name": product.name,
        "price": product.price,
        "rating": product.rating,
        "reviews": product.review_count,
        "category": product.category,
        "stock": product.stock,
        "image_url": product.image_url,
        "description": product.description,
        "all_reviews": [
            {
                "id": r.id,
                "rating": r.rating,
                "comment": r.comment,
                "created_at": r.created_at.isoformat() if r.created_at else None
            }
            for r in reviews
        ]
    })

# ----------------------
# GET PRODUCTS BY CATEGORY
# ----------------------
@routes_bp.route('/api/products/category/<category>', methods=['GET'])
def get_products_by_category(category):
    products = Product.query.filter_by(category=category).all()
    return jsonify([
        {
            "id": p.id,
            "name": p.name,
            "price": p.price,
            "rating": p.rating,
            "category": p.category,
            "image": p.image_url
        }
        for p in products
    ])

# ----------------------
# WISHLIST ROUTES
# ----------------------
@routes_bp.route('/api/wishlist', methods=['GET'])
def get_wishlist():
    user_id = request.args.get('user_id')
    
    if not user_id:
        return jsonify({"error": "User ID required"}), 400
    
    wishlist_items = Wishlist.query.filter_by(user_id=user_id).all()
    
    # Get product details for each wishlist item
    items_with_details = []
    for item in wishlist_items:
        product = Product.query.get(item.product_id)
        if product:
            items_with_details.append({
                "wishlist_id": item.id,
                "product_id": product.id,
                "name": product.name,
                "price": product.price,
                "image": product.image_url,
                "added_at": item.added_at.isoformat() if item.added_at else None
            })
    
    return jsonify(items_with_details)

@routes_bp.route('/api/wishlist/add', methods=['POST'])
def add_to_wishlist():
    data = request.json
    user_id = data.get('user_id')
    product_id = data.get('product_id')
    
    if not user_id or not product_id:
        return jsonify({"error": "User ID and Product ID required"}), 400
    
    # Check if already in wishlist
    existing = Wishlist.query.filter_by(user_id=user_id, product_id=product_id).first()
    if existing:
        return jsonify({"message": "Product already in wishlist"}), 200
    
    # Check if product exists
    product = Product.query.get(product_id)
    if not product:
        return jsonify({"error": "Product not found"}), 404
    
    # Add to wishlist
    wishlist_item = Wishlist(user_id=user_id, product_id=product_id)
    db.session.add(wishlist_item)
    db.session.commit()
    
    return jsonify({
        "message": "Added to wishlist",
        "wishlist_id": wishlist_item.id
    })

@routes_bp.route('/api/wishlist/remove', methods=['POST'])
def remove_from_wishlist():
    data = request.json
    user_id = data.get('user_id')
    product_id = data.get('product_id')
    
    if not user_id or not product_id:
        return jsonify({"error": "User ID and Product ID required"}), 400
    
    # Find and remove
    wishlist_item = Wishlist.query.filter_by(user_id=user_id, product_id=product_id).first()
    if wishlist_item:
        db.session.delete(wishlist_item)
        db.session.commit()
        return jsonify({"message": "Removed from wishlist"})
    
    return jsonify({"error": "Item not found in wishlist"}), 404

@routes_bp.route('/api/wishlist/check', methods=['GET'])
def check_wishlist():
    user_id = request.args.get('user_id')
    product_id = request.args.get('product_id')
    
    if not user_id or not product_id:
        return jsonify({"error": "User ID and Product ID required"}), 400
    
    exists = Wishlist.query.filter_by(user_id=user_id, product_id=product_id).first() is not None
    return jsonify({"in_wishlist": exists})

# ======================
# DEBUG & DATABASE CHECK ROUTES
# ======================

@routes_bp.route('/api/check-db')
def check_database():
    """Check if database has products"""
    try:
        product_count = Product.query.count()
        
        return jsonify({
            "status": "success",
            "product_count": product_count,
            "message": f"Found {product_count} products in database",
            "is_empty": product_count == 0
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500

@routes_bp.route('/api/add-sample-products')
def add_sample_products():
    """Add sample fashion products to empty database"""
    try:
        # Check current count
        current_count = Product.query.count()
        
        if current_count > 0:
            return jsonify({
                "status": "info",
                "message": f"Already have {current_count} products. No need to add samples."
            })
        
        # SAMPLE FASHION PRODUCTS
        sample_products = [
            {
                "name": "Urban Threads Premium T-Shirt",
                "price": 24.99,
                "rating": 4.5,
                "review_count": 128,
                "category": "T-Shirts",
                "stock": 100,
                "image_url": "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop",
                "description": "100% Cotton, comfortable fit, modern design"
            },
            {
                "name": "Designer Denim Jeans",
                "price": 59.99,
                "rating": 4.3,
                "review_count": 89,
                "category": "Jeans",
                "stock": 50,
                "image_url": "https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&h=400&fit=crop",
                "description": "Slim fit, stretch denim, premium quality"
            },
            {
                "name": "Summer Floral Dress",
                "price": 39.99,
                "rating": 4.7,
                "review_count": 203,
                "category": "Dresses",
                "stock": 30,
                "image_url": "https://images.unsplash.com/photo-1567095761054-7a02e69e5c43?w=400&h=400&fit=crop",
                "description": "Lightweight floral pattern, perfect for summer"
            },
            {
                "name": "Classic Leather Jacket",
                "price": 89.99,
                "rating": 4.6,
                "review_count": 67,
                "category": "Jackets",
                "stock": 20,
                "image_url": "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400&h=400&fit=crop",
                "description": "Genuine leather, timeless style"
            },
            {
                "name": "Casual Sneakers",
                "price": 49.99,
                "rating": 4.4,
                "review_count": 156,
                "category": "Footwear",
                "stock": 75,
                "image_url": "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400&h=400&fit=crop",
                "description": "Comfortable everyday shoes, versatile style"
            },
            {
                "name": "Winter Beanie",
                "price": 19.99,
                "rating": 4.2,
                "review_count": 45,
                "category": "Accessories",
                "stock": 150,
                "image_url": "https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?w=400&h=400&fit=crop",
                "description": "Warm woolen beanie, multiple colors available"
            },
            {
                "name": "Formal Blazer",
                "price": 79.99,
                "rating": 4.5,
                "review_count": 92,
                "category": "Suits & Blazers",
                "stock": 25,
                "image_url": "https://images.unsplash.com/photo-1594938374182-2510c5c63f8a?w=400&h=400&fit=crop",
                "description": "Professional look, perfect for office wear"
            },
            {
                "name": "Yoga Leggings",
                "price": 34.99,
                "rating": 4.8,
                "review_count": 210,
                "category": "Activewear",
                "stock": 60,
                "image_url": "https://images.unsplash.com/photo-1587563871167-1ee9c731c62a?w=400&h=400&fit=crop",
                "description": "High-waisted, moisture-wicking, comfortable fit"
            }
        ]
        
        added_count = 0
        for prod_data in sample_products:
            # Create Product object
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
        
        # Commit to database
        db.session.commit()
        
        return jsonify({
            "status": "success",
            "message": f"Added {added_count} fashion products to database",
            "products_added": [p["name"] for p in sample_products]
        })
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500

@routes_bp.route('/api/debug-info')
def debug_info():
    """Get debug information about the backend"""
    import os
    
    return jsonify({
        "backend_running": True,
        "store_type": "Fashion E-commerce",
        "database_url_exists": bool(os.environ.get('DATABASE_URL')),
        "total_products": Product.query.count(),
        "total_users": User.query.count(),
        "total_orders": Order.query.count(),
        "environment": "production"
    })
# ======================
# DATABASE INITIALIZATION
# ======================

@routes_bp.route('/api/init-db')
def init_database():
    """Initialize/Recreate all database tables"""
    try:
        from extensions import db
        
        # Drop all tables (for development/testing only!)
        # db.drop_all()
        
        # Create all tables
        db.create_all()
        
        return jsonify({
            "success": True,
            "message": "Database tables created successfully"
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc() if traceback else None
        }), 500