// src/components/ProductDetail.js
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { API_URL } from '../config';  // ✅ correct for named export

const ProductDetail = ({ addToCart }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [quantity, setQuantity] = useState(1);

  const fetchProductDetails = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/products/${id}/details`);
      setProduct(response.data);
    } catch (err) {
      console.log("Error fetching product details:", err);
      // Try the regular endpoint if details endpoint fails
      try {
        const response = await axios.get(`${API_URL}/api/products/${id}`);
        setProduct(response.data);
      } catch (err2) {
        setError("Failed to load product details");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductDetails();
  }, [id]);

  const handleAddToCart = () => {
    if (!product) return;
    
    const productToAdd = {
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image_url || product.image
    };
    
    // Add to cart using parent function
    for (let i = 0; i < quantity; i++) {
      addToCart(productToAdd);
    }
    
    navigate("/cart");
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;
  if (!product) return <div>Product not found</div>;

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "20px" }}>
      <button onClick={() => navigate(-1)} style={{ marginBottom: "20px" }}>
        ← Back
      </button>
      
      <div style={{ display: "flex", gap: "40px" }}>
        {/* Product Image */}
        <div style={{ flex: "0 0 300px" }}>
          <img 
            src={product.image_url || product.image} 
            alt={product.name} 
            style={{ width: "100%", border: "1px solid #ddd" }}
          />
        </div>
        
        {/* Product Details */}
        <div style={{ flex: "1" }}>
          <h1>{product.name}</h1>
          <p style={{ fontSize: "24px", color: "#b12704", margin: "10px 0" }}>
            ₹{product.price}
          </p>
          
          <div style={{ margin: "20px 0" }}>
            <span style={{ background: "#ffa41c", color: "white", padding: "3px 8px", borderRadius: "3px" }}>
              {product.rating.toFixed(1)} ★
            </span>
            <span style={{ marginLeft: "10px", color: "#007185" }}>
              {product.reviews || product.review_count} ratings
            </span>
          </div>
          
          <div style={{ margin: "20px 0" }}>
            <h3>Description</h3>
            <p>{product.description || "No description available."}</p>
          </div>
          
          <div style={{ margin: "20px 0" }}>
            <h3>Stock Status</h3>
            <p style={{ color: product.stock > 0 ? "#007600" : "#cc0c39" }}>
              {product.stock > 0 ? `In Stock (${product.stock} available)` : "Out of Stock"}
            </p>
          </div>
          
          {/* Quantity Selector */}
          <div style={{ margin: "20px 0" }}>
            <label style={{ marginRight: "10px" }}>Quantity:</label>
            <select 
              value={quantity} 
              onChange={(e) => setQuantity(parseInt(e.target.value))}
              style={{ padding: "5px" }}
            >
              {[...Array(Math.min(10, product.stock || 10)).keys()].map(num => (
                <option key={num + 1} value={num + 1}>
                  {num + 1}
                </option>
              ))}
            </select>
          </div>
          
          {/* Add to Cart Button */}
          <button
            onClick={handleAddToCart}
            disabled={product.stock === 0}
            style={{
              padding: "10px 30px",
              fontSize: "16px",
              background: product.stock > 0 ? "#ffd814" : "#ccc",
              border: "none",
              borderRadius: "20px",
              cursor: product.stock > 0 ? "pointer" : "not-allowed",
              marginRight: "10px"
            }}
          >
            Add to Cart
          </button>
          
          <button
            onClick={() => navigate("/cart")}
            style={{
              padding: "10px 20px",
              fontSize: "16px",
              background: "#ffa41c",
              border: "none",
              borderRadius: "20px",
              cursor: "pointer"
            }}
          >
            Go to Cart
          </button>
        </div>
      </div>
      
      {/* Reviews Section */}
      <div style={{ marginTop: "40px" }}>
        <h2>Customer Reviews</h2>
        {product.all_reviews && product.all_reviews.length > 0 ? (
          <div>
            {product.all_reviews.map(review => (
              <div key={review.id} style={{ borderBottom: "1px solid #eee", padding: "15px 0" }}>
                <div style={{ display: "flex", alignItems: "center", marginBottom: "5px" }}>
                  <span style={{ color: "#ffa41c", marginRight: "5px" }}>
                    {"★".repeat(Math.floor(review.rating))}
                  </span>
                  <span style={{ fontSize: "14px", color: "#555" }}>
                    {review.rating.toFixed(1)} stars
                  </span>
                </div>
                <p style={{ margin: "5px 0" }}>{review.comment}</p>
                {review.created_at && (
                  <small style={{ color: "#888" }}>
                    {new Date(review.created_at).toLocaleDateString()}
                  </small>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p>No reviews yet. Be the first to review!</p>
        )}
      </div>
    </div>
  );
};

export default ProductDetail;