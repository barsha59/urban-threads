// src/components/ProductList.js
import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import API_URL from "../config"; // Your backend URL

const ProductList = ({ addToCart }) => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [wishlistStatus, setWishlistStatus] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [imgErrors, setImgErrors] = useState({}); // Track fallback images
  const searchTimeout = useRef(null);

  // Fetch products initially
  useEffect(() => {
    fetchProducts();
  }, []);

  // Update wishlist status whenever products change
  useEffect(() => {
    if (products.length > 0) checkAllWishlistStatus();
  }, [products]);

  // Fetch products with optional category & search
  const fetchProducts = async (category = "", search = "") => {
    try {
      let url = `${API_URL}/api/products`;
      if (category) url += `/category/${category}`;
      if (search) url += `?search=${encodeURIComponent(search)}`;

      const response = await axios.get(url);
      setProducts(response.data);

      // Extract unique categories
      const uniqueCategories = [...new Set(response.data.map(p => p.category))];
      setCategories(uniqueCategories);
    } catch (err) {
      console.error("Error fetching products:", err);
    }
  };

  // Check wishlist for all products
  const checkAllWishlistStatus = async () => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) return;

    const status = {};
    for (const product of products) {
      try {
        const response = await axios.get(
          `${API_URL}/api/wishlist/check?user_id=${user.id}&product_id=${product.id}`
        );
        status[product.id] = response.data.in_wishlist;
      } catch {
        status[product.id] = false;
      }
    }
    setWishlistStatus(status);
  };

  // Toggle wishlist status
  const toggleWishlist = async (productId) => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) return alert("Please login to use wishlist");

    try {
      const isInWishlist = wishlistStatus[productId];
      const url = `${API_URL}/api/wishlist/${isInWishlist ? "remove" : "add"}`;
      await axios.post(url, { user_id: user.id, product_id: productId });
      setWishlistStatus(prev => ({ ...prev, [productId]: !isInWishlist }));
    } catch (err) {
      console.error("Wishlist toggle error:", err);
      alert("Error updating wishlist");
    }
  };

  // Handle category change
  const handleCategoryFilter = (category) => {
    setSelectedCategory(category);
    fetchProducts(category, searchQuery);
  };

  // Handle search input with debounce
  const handleSearch = (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      fetchProducts(selectedCategory, query);
    }, 300); // 300ms debounce
  };

  // Get cart count
  const cartCount = JSON.parse(localStorage.getItem("cart") || "[]").length;

  // Handle image fallback
  const handleImgError = (id) => {
    setImgErrors(prev => ({ ...prev, [id]: true }));
  };

  return (
    <div>
      <h2 style={{ marginBottom: "20px" }}>Products</h2>

      {/* Search + Category Filter */}
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "20px" }}>
        <input
          type="text"
          placeholder="Search products..."
          value={searchQuery}
          onChange={handleSearch}
          style={{ padding: "5px", flexGrow: 1, minWidth: "200px" }}
        />
        <select
          value={selectedCategory}
          onChange={(e) => handleCategoryFilter(e.target.value)}
          style={{ padding: "5px" }}
        >
          <option value="">All Categories</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Navigation Buttons */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <Link to="/cart">
          <button style={{ padding: "8px 16px", cursor: "pointer" }}>
            🛒 Go to Cart ({cartCount})
          </button>
        </Link>
        <Link to="/wishlist">
          <button style={{ padding: "8px 16px", cursor: "pointer", background: "#ff6b6b", color: "white", border: "none", borderRadius: "5px" }}>
            ❤️ My Wishlist
          </button>
        </Link>
      </div>

      {/* Products Grid */}
      <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
        {products.map(p => (
          <div key={p.id} style={{
            border: "1px solid #ddd",
            padding: "15px",
            width: "220px",
            borderRadius: "5px",
            boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
            position: "relative"
          }}>
            {/* Wishlist Heart */}
            <button
              onClick={() => toggleWishlist(p.id)}
              style={{
                position: "absolute",
                top: "10px",
                right: "10px",
                background: "white",
                border: "1px solid #ddd",
                borderRadius: "50%",
                width: "36px",
                height: "36px",
                fontSize: "20px",
                cursor: "pointer",
                color: wishlistStatus[p.id] ? "red" : "#ccc",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
                zIndex: 1
              }}
            >
              {wishlistStatus[p.id] ? "♥" : "♡"}
            </button>

            <Link to={`/product/${p.id}`} style={{ textDecoration: "none", color: "inherit" }}>
              <img
                src={imgErrors[p.id] ? "/fallback.png" : p.image_url}
                alt={p.name}
                width="200"
                height="200"
                style={{ objectFit: "cover" }}
                onError={() => handleImgError(p.id)}
              />
              <h4 style={{ margin: "10px 0", minHeight: "40px" }}>{p.name}</h4>
              <p style={{ color: "#b12704", fontSize: "18px", fontWeight: "bold" }}>₹{p.price}</p>
              <div style={{ display: "flex", alignItems: "center", marginBottom: "10px" }}>
                <span style={{ color: "#ffa41c" }}>{"★".repeat(Math.floor(p.rating))}</span>
                <span style={{ marginLeft: "5px", color: "#007185" }}>
                  {p.rating.toFixed(1)} ({p.reviews})
                </span>
              </div>
            </Link>

            <button
              onClick={() => addToCart(p)}
              style={{
                padding: "8px 16px",
                cursor: "pointer",
                background: "#ffd814",
                border: "none",
                borderRadius: "20px",
                width: "100%",
                marginTop: "10px"
              }}
            >
              Add to Cart
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProductList;
