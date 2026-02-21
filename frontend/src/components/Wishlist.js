// src/components/Wishlist.js
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { API_URL } from '../config';  // ✅ correct for named export

const Wishlist = () => {
  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchWishlist();
  }, []);

  const fetchWishlist = async () => {
    try {
      // Get current user from localStorage
      const user = JSON.parse(localStorage.getItem("user"));
      if (!user) {
        setError("Please login to view wishlist");
        setLoading(false);
        return;
      }

      const response = await axios.get(`${API_URL}/api/wishlist?user_id=${user.id}`);
      setWishlistItems(response.data);
    } catch (err) {
      setError("Failed to load wishlist");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const removeFromWishlist = async (productId) => {
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      await axios.post(`${API_URL}/api/wishlist/remove`, {
        user_id: user.id,
        product_id: productId
      });
      
      // Refresh wishlist
      fetchWishlist();
    } catch (err) {
      console.error("Failed to remove from wishlist:", err);
      alert("Failed to remove from wishlist");
    }
  };

  const addToCartFromWishlist = (product) => {
    // This would need your addToCart function from App.js
    // For now, just show a message
    alert(`Added ${product.name} to cart!`);
    // In real implementation, you would call addToCart function
  };

  if (loading) return <div style={{ padding: "20px" }}>Loading wishlist...</div>;
  if (error) return <div style={{ padding: "20px", color: "red" }}>{error}</div>;

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "20px" }}>
      <h2>My Wishlist</h2>
      
      {wishlistItems.length === 0 ? (
        <div style={{ 
          textAlign: "center", 
          padding: "40px",
          border: "1px dashed #ddd",
          borderRadius: "10px",
          marginTop: "20px"
        }}>
          <p style={{ fontSize: "18px", marginBottom: "20px" }}>Your wishlist is empty</p>
          <Link to="/products">
            <button style={{ 
              padding: "12px 24px", 
              background: "#ffd814",
              border: "none",
              borderRadius: "20px",
              cursor: "pointer",
              fontSize: "16px"
            }}>
              Browse Products
            </button>
          </Link>
        </div>
      ) : (
        <>
          <p style={{ marginBottom: "20px", color: "#555" }}>
            You have {wishlistItems.length} items in your wishlist
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "20px" }}>
            {wishlistItems.map(item => (
              <div key={item.wishlist_id} style={{
                border: "1px solid #ddd",
                padding: "15px",
                width: "220px",
                borderRadius: "10px",
                position: "relative",
                boxShadow: "0 2px 5px rgba(0,0,0,0.1)"
              }}>
                <button
                  onClick={() => removeFromWishlist(item.product_id)}
                  style={{
                    position: "absolute",
                    top: "10px",
                    right: "10px",
                    background: "#ff6b6b",
                    color: "white",
                    border: "none",
                    borderRadius: "50%",
                    width: "30px",
                    height: "30px",
                    cursor: "pointer",
                    fontSize: "18px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                  title="Remove from wishlist"
                >
                  ×
                </button>
                
                <Link to={`/product/${item.product_id}`} style={{ textDecoration: "none", color: "inherit" }}>
                  <img 
                    src={item.image} 
                    alt={item.name} 
                    width="180" 
                    height="180"
                    style={{ 
                      objectFit: "cover",
                      display: "block",
                      margin: "0 auto 15px auto",
                      borderRadius: "5px"
                    }}
                  />
                  <h4 style={{ 
                    margin: "0 0 10px 0", 
                    fontSize: "16px",
                    minHeight: "40px",
                    lineHeight: "1.4"
                  }}>
                    {item.name}
                  </h4>
                  <p style={{ 
                    color: "#b12704", 
                    fontSize: "20px", 
                    fontWeight: "bold",
                    margin: "10px 0"
                  }}>
                    ₹{item.price}
                  </p>
                </Link>
                
                <div style={{ display: "flex", gap: "10px", marginTop: "15px" }}>
                  <button 
                    onClick={() => addToCartFromWishlist(item)}
                    style={{
                      flex: "1",
                      padding: "10px",
                      background: "#ffd814",
                      border: "none",
                      borderRadius: "5px",
                      cursor: "pointer",
                      fontWeight: "bold"
                    }}
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default Wishlist;