import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { API_URL } from '../config';  // ✅ correct for named export

const OrderSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [products, setProducts] = useState([]);
  const [reviews, setReviews] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState({});
  const [orderDetails, setOrderDetails] = useState({
    orderId: Date.now().toString().slice(-8), // Generate a fake order ID for demo
    date: new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }),
    estimatedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  });

  useEffect(() => {
    const purchasedItems = location.state?.items || location.state?.purchasedProducts || [];
    const customerName = location.state?.customerName || "Customer";
    const orderTotal = location.state?.total || 0;
    const orderId = location.state?.orderId || Date.now().toString().slice(-8);
    
    if (purchasedItems.length === 0) {
      navigate("/products");
      return;
    }

    // Update order details
    setOrderDetails(prev => ({
      ...prev,
      orderId: orderId,
      customerName: customerName,
      total: orderTotal
    }));

    // Fetch actual product details for each ID
    const fetchProductDetails = async () => {
      try {
        const productPromises = purchasedItems.map(async (item) => {
          const response = await axios.get(`${API_URL}/api/products/${item.product_id}`);
          return {
            ...response.data,
            quantity: item.quantity
          };
        });

        const productsData = await Promise.all(productPromises);
        setProducts(productsData);
        
        // Initialize reviews
        const initialReviews = {};
        productsData.forEach((p) => {
          initialReviews[p.id] = { rating: 5, comment: "", submitted: false };
        });
        setReviews(initialReviews);
      } catch (error) {
        console.error("Error fetching product details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProductDetails();
  }, [location.state, navigate]);

  const handleChange = (productId, field, value) => {
    setReviews((prev) => ({
      ...prev,
      [productId]: { ...prev[productId], [field]: value },
    }));
  };

  const submitReview = async (productId) => {
    setSubmitting(prev => ({ ...prev, [productId]: true }));
    
    try {
      const review = reviews[productId];
      await axios.post(`${API_URL}/api/reviews`, {
        product_id: productId,
        rating: review.rating,
        comment: review.comment || ""
      });
      
      // Mark as submitted
      setReviews(prev => ({
        ...prev,
        [productId]: { ...prev[productId], submitted: true }
      }));
      
      // Show success message
      alert("✓ Review submitted successfully!");
    } catch (err) {
      console.error("Review submission error:", err);
      alert("Failed to submit review. Please try again.");
    } finally {
      setSubmitting(prev => ({ ...prev, [productId]: false }));
    }
  };

  const renderStars = (rating, interactive = false, onChange = null) => {
    return (
      <div style={{ display: "flex", gap: "5px", fontSize: "24px" }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            onClick={() => interactive && onChange && onChange(star)}
            style={{
              cursor: interactive ? "pointer" : "default",
              color: star <= rating ? "#ffa41c" : "#ddd",
              transition: "color 0.2s"
            }}
          >
            {star <= rating ? "★" : "☆"}
          </span>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ 
        textAlign: "center", 
        padding: "60px 20px",
        maxWidth: "800px",
        margin: "0 auto"
      }}>
        <div style={{ fontSize: "48px", marginBottom: "20px" }}>⏳</div>
        <h3 style={{ color: "#555" }}>Loading your order details...</h3>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div style={{ 
        textAlign: "center", 
        padding: "60px 20px",
        maxWidth: "800px",
        margin: "0 auto"
      }}>
        <h3>No order found</h3>
        <p>Redirecting you to products page...</p>
      </div>
    );
  }

  return (
    <div style={{ 
      maxWidth: "1200px", 
      margin: "0 auto", 
      padding: "20px",
      fontFamily: "Arial, sans-serif"
    }}>
      {/* Success Header */}
      <div style={{ 
        textAlign: "center", 
        padding: "40px 20px",
        backgroundColor: "#e8f5e9",
        borderRadius: "15px",
        marginBottom: "40px",
        border: "2px solid #4caf50"
      }}>
        <div style={{ fontSize: "80px", marginBottom: "20px" }}>🎉</div>
        <h1 style={{ color: "#2e7d32", marginBottom: "10px" }}>
          Order Confirmed!
        </h1>
        <p style={{ fontSize: "18px", color: "#555", marginBottom: "20px" }}>
          Thank you for your purchase. Your order has been successfully placed.
        </p>
        
        <div style={{ 
          display: "flex", 
          justifyContent: "center", 
          gap: "30px",
          flexWrap: "wrap",
          marginTop: "30px"
        }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "14px", color: "#666", marginBottom: "5px" }}>Order ID</div>
            <div style={{ fontSize: "18px", fontWeight: "bold", color: "#232f3e" }}>
              #{orderDetails.orderId}
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "14px", color: "#666", marginBottom: "5px" }}>Order Date</div>
            <div style={{ fontSize: "18px", fontWeight: "bold", color: "#232f3e" }}>
              {orderDetails.date}
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "14px", color: "#666", marginBottom: "5px" }}>Estimated Delivery</div>
            <div style={{ fontSize: "18px", fontWeight: "bold", color: "#232f3e" }}>
              {orderDetails.estimatedDelivery}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: "40px", flexWrap: "wrap" }}>
        {/* Left Column - Order Items */}
        <div style={{ flex: "1", minWidth: "300px" }}>
          <h2 style={{ 
            color: "#232f3e", 
            borderBottom: "2px solid #ffa41c", 
            paddingBottom: "10px",
            marginBottom: "30px"
          }}>
            Your Purchased Items
          </h2>

          <div style={{ marginBottom: "40px" }}>
            {products.map((p) => (
              <div key={p.id} style={{ 
                display: "flex",
                border: "1px solid #e0e0e0",
                borderRadius: "10px",
                padding: "25px",
                marginBottom: "25px",
                backgroundColor: "white",
                boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
                alignItems: "center",
                gap: "20px"
              }}>
                <div style={{ flex: "0 0 100px" }}>
                  <img 
                    src={p.image_url || p.image} 
                    alt={p.name}
                    style={{ 
                      width: "100px", 
                      height: "100px", 
                      objectFit: "cover",
                      borderRadius: "8px"
                    }}
                  />
                </div>
                
                <div style={{ flex: "1" }}>
                  <h3 style={{ margin: "0 0 10px 0", color: "#232f3e" }}>
                    {p.name}
                  </h3>
                  <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "15px" }}>
                    <span style={{ color: "#b12704", fontSize: "18px", fontWeight: "bold" }}>
                      ₹{p.price}
                    </span>
                    <span style={{ 
                      backgroundColor: "#e8f4f8",
                      color: "#007185",
                      padding: "3px 10px",
                      borderRadius: "15px",
                      fontSize: "14px"
                    }}>
                      Qty: {p.quantity}
                    </span>
                    <span style={{ 
                      backgroundColor: "#e8f5e9",
                      color: "#2e7d32",
                      padding: "3px 10px",
                      borderRadius: "15px",
                      fontSize: "14px",
                      fontWeight: "bold"
                    }}>
                      Purchased
                    </span>
                  </div>
                  
                  {renderStars(p.rating, false)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column - Reviews */}
        <div style={{ 
          flex: "0 0 400px",
          backgroundColor: "#f8f9fa",
          borderRadius: "10px",
          padding: "30px",
          height: "fit-content"
        }}>
          <h2 style={{ 
            color: "#232f3e", 
            borderBottom: "2px solid #ffa41c", 
            paddingBottom: "10px",
            marginBottom: "25px"
          }}>
            ✍️ Leave a Review
          </h2>
          
          <p style={{ color: "#555", marginBottom: "30px", lineHeight: "1.6" }}>
            Help other shoppers by sharing your experience with these products. 
            Your feedback is valuable!
          </p>

          {products.map((p) => (
            <div key={p.id} style={{ 
              backgroundColor: "white",
              borderRadius: "10px",
              padding: "20px",
              marginBottom: "25px",
              border: reviews[p.id]?.submitted ? "2px solid #4caf50" : "1px solid #e0e0e0"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "15px", marginBottom: "15px" }}>
                <img 
                  src={p.image_url || p.image} 
                  alt={p.name}
                  style={{ 
                    width: "60px", 
                    height: "60px", 
                    objectFit: "cover",
                    borderRadius: "8px"
                  }}
                />
                <div>
                  <h4 style={{ margin: "0 0 5px 0", color: "#232f3e" }}>{p.name}</h4>
                  <p style={{ margin: "0", color: "#b12704", fontWeight: "bold" }}>₹{p.price}</p>
                </div>
              </div>

              {reviews[p.id]?.submitted ? (
                <div style={{ 
                  textAlign: "center", 
                  padding: "20px",
                  backgroundColor: "#e8f5e9",
                  borderRadius: "8px"
                }}>
                  <div style={{ fontSize: "32px", marginBottom: "10px" }}>✓</div>
                  <p style={{ color: "#2e7d32", fontWeight: "bold", margin: "0" }}>
                    Review Submitted!
                  </p>
                  <p style={{ color: "#666", marginTop: "5px", fontSize: "14px" }}>
                    Thank you for your feedback
                  </p>
                </div>
              ) : (
                <>
                  <div style={{ marginBottom: "20px" }}>
                    <label style={{ 
                      display: "block", 
                      marginBottom: "10px",
                      fontWeight: "bold",
                      color: "#555"
                    }}>
                      Your Rating:
                    </label>
                    <div style={{ marginBottom: "10px" }}>
                      {renderStars(reviews[p.id]?.rating || 5, true, 
                        (rating) => handleChange(p.id, "rating", rating)
                      )}
                    </div>
                    <div style={{ 
                      display: "flex", 
                      justifyContent: "space-between",
                      fontSize: "14px",
                      color: "#777",
                      marginTop: "5px"
                    }}>
                      <span>Poor</span>
                      <span>Excellent</span>
                    </div>
                  </div>

                  <div style={{ marginBottom: "20px" }}>
                    <label style={{ 
                      display: "block", 
                      marginBottom: "10px",
                      fontWeight: "bold",
                      color: "#555"
                    }}>
                      Your Review:
                    </label>
                    <textarea
                      value={reviews[p.id]?.comment || ""}
                      onChange={(e) => handleChange(p.id, "comment", e.target.value)}
                      placeholder="Share your experience with this product..."
                      rows="3"
                      style={{
                        width: "100%",
                        padding: "12px",
                        border: "1px solid #ddd",
                        borderRadius: "8px",
                        fontSize: "14px",
                        boxSizing: "border-box",
                        resize: "vertical"
                      }}
                    />
                  </div>

                  <button 
                    onClick={() => submitReview(p.id)}
                    disabled={submitting[p.id]}
                    style={{
                      width: "100%",
                      padding: "12px",
                      backgroundColor: submitting[p.id] ? "#ccc" : "#4caf50",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      fontSize: "16px",
                      cursor: submitting[p.id] ? "not-allowed" : "pointer",
                      fontWeight: "bold",
                      transition: "background-color 0.3s"
                    }}
                  >
                    {submitting[p.id] ? (
                      <>
                        <span style={{ marginRight: "8px" }}>⏳</span>
                        Submitting...
                      </>
                    ) : (
                      "Submit Review"
                    )}
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Next Steps */}
      <div style={{ 
        backgroundColor: "#e3f2fd",
        borderRadius: "10px",
        padding: "30px",
        marginTop: "40px",
        textAlign: "center"
      }}>
        <h3 style={{ color: "#1565c0", marginBottom: "20px" }}>What's Next?</h3>
        <div style={{ 
          display: "flex", 
          justifyContent: "center", 
          gap: "30px",
          flexWrap: "wrap"
        }}>
          <div style={{ textAlign: "center", maxWidth: "250px" }}>
            <div style={{ fontSize: "32px", marginBottom: "10px" }}>📧</div>
            <h4 style={{ margin: "0 0 10px 0", color: "#232f3e" }}>Order Confirmation</h4>
            <p style={{ color: "#555", fontSize: "14px" }}>
              You'll receive an email confirmation with your order details.
            </p>
          </div>
          <div style={{ textAlign: "center", maxWidth: "250px" }}>
            <div style={{ fontSize: "32px", marginBottom: "10px" }}>🚚</div>
            <h4 style={{ margin: "0 0 10px 0", color: "#232f3e" }}>Shipping Updates</h4>
            <p style={{ color: "#555", fontSize: "14px" }}>
              We'll notify you when your order ships and provide tracking information.
            </p>
          </div>
          <div style={{ textAlign: "center", maxWidth: "250px" }}>
            <div style={{ fontSize: "32px", marginBottom: "10px" }}>🔄</div>
            <h4 style={{ margin: "0 0 10px 0", color: "#232f3e" }}>Need Help?</h4>
            <p style={{ color: "#555", fontSize: "14px" }}>
              Visit our help center or contact customer support.
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ 
        display: "flex", 
        justifyContent: "center", 
        gap: "20px",
        marginTop: "40px",
        flexWrap: "wrap"
      }}>
        <Link to="/products">
          <button style={{
            padding: "15px 30px",
            backgroundColor: "#ffa41c",
            color: "white",
            border: "none",
            borderRadius: "25px",
            fontSize: "16px",
            cursor: "pointer",
            fontWeight: "bold",
            minWidth: "200px"
          }}>
            Continue Shopping
          </button>
        </Link>
        
        <Link to="/">
          <button style={{
            padding: "15px 30px",
            backgroundColor: "transparent",
            color: "#232f3e",
            border: "1px solid #ddd",
            borderRadius: "25px",
            fontSize: "16px",
            cursor: "pointer",
            fontWeight: "bold",
            minWidth: "200px"
          }}>
            Go to Home
          </button>
        </Link>
        
        <button 
          onClick={() => window.print()}
          style={{
            padding: "15px 30px",
            backgroundColor: "#f0f2f2",
            color: "#232f3e",
            border: "1px solid #ddd",
            borderRadius: "25px",
            fontSize: "16px",
            cursor: "pointer",
            fontWeight: "bold",
            minWidth: "200px"
          }}
        >
          Print Receipt
        </button>
      </div>
    </div>
  );
};

export default OrderSuccess;