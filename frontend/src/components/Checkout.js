import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { API_URL, STRIPE_PUBLISHABLE_KEY } from '../config';

// Stripe public key
const stripePromise = loadStripe(
  "pk_test_51Sl1TM2YdULA0kvG2JENo4pXukqssFkAHNfEYoeqzdGrkIxBLJh8YirmBdusf6yaCJxQXWq1W7usBupkDNupbPHf00AVabIsFL"
);

const CheckoutForm = ({ cart }) => {
  const navigate = useNavigate();
  const stripe = useStripe();
  const elements = useElements();

  const [customer, setCustomer] = useState({ 
    name: "", 
    address: "", 
    phone: "",
    email: ""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [orderSummary, setOrderSummary] = useState([]);

  useEffect(() => {
    // Prepare order summary
    const summary = cart.map(item => ({
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      subtotal: item.price * item.quantity
    }));
    setOrderSummary(summary);
  }, [cart]);

  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const tax = subtotal * 0.18;
  const total = subtotal + tax;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCustomer(prev => ({
      ...prev,
      [name]: value.trimStart()
    }));
  };

  const handlePay = async (e) => {
    e.preventDefault();
    setError("");

    if (!customer.name || !customer.address || !customer.phone || !customer.email) {
      setError("All fields are required");
      return;
    }
    if (!cart || cart.length === 0) {
      setError("Your cart is empty");
      return;
    }
    if (!stripe || !elements) return;

    setLoading(true);

    try {
      // 1️⃣ Create order first
      const cartPayload = cart.map(item => ({
        product_id: item.id,
        quantity: item.quantity,
      }));

      const { data: orderData } = await axios.post(`${API_URL}/api/orders`,  {
        customer_name: customer.name,
        address: customer.address,
        phone: customer.phone,
        cart: cartPayload,
      });

      const orderId = orderData.order_ids[0];

      // 2️⃣ Create Stripe PaymentIntent
      const { data: paymentData } = await axios.post(`${API_URL}/api/pay`, {
        amount: Math.round(total * 100), // in cents
      });

      // 3️⃣ Confirm card payment
      const cardElement = elements.getElement(CardElement);
      const result = await stripe.confirmCardPayment(paymentData.client_secret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: customer.name,
            email: customer.email,
            address: {
              line1: customer.address
            }
          },
        },
      });

      if (result.error) {
        setError(result.error.message);
        setLoading(false);
        return;
      }

      if (result.paymentIntent.status === "succeeded") {
        // 4️⃣ Mark order as Paid
        await axios.post(`${API_URL}/api/orders/${orderId}/pay`);

        // 5️⃣ Clear cart and redirect
        navigate("/order-success", { state: { 
          orderId: orderId,
          customerName: customer.name,
          total: total,
          items: cartPayload 
        }});
        localStorage.removeItem("cart");
      }
    } catch (err) {
      console.error(err.response?.data || err.message);
      setError(err.response?.data?.error || "Error processing payment. Try again.");
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      maxWidth: "1200px", 
      margin: "0 auto", 
      padding: "20px",
      fontFamily: "Arial, sans-serif"
    }}>
      <h1 style={{ 
        color: "#232f3e", 
        borderBottom: "2px solid #ffa41c", 
        paddingBottom: "10px",
        marginBottom: "30px"
      }}>
        🛍️ Checkout
      </h1>

      <div style={{ display: "flex", gap: "40px", flexWrap: "wrap" }}>
        {/* Left Column - Shipping & Payment */}
        <div style={{ flex: "1", minWidth: "300px" }}>
          <div style={{ 
            backgroundColor: "white",
            borderRadius: "10px",
            padding: "25px",
            boxShadow: "0 2px 15px rgba(0,0,0,0.05)",
            marginBottom: "30px"
          }}>
            <h3 style={{ color: "#232f3e", marginBottom: "25px" }}>
              <span style={{ 
                background: "#ffa41c", 
                color: "white",
                padding: "5px 10px",
                borderRadius: "50%",
                marginRight: "10px"
              }}>1</span>
              Shipping Information
            </h3>
            
            <form onSubmit={handlePay}>
              {error && (
                <div style={{ 
                  backgroundColor: "#ffebee", 
                  color: "#c62828",
                  padding: "15px",
                  borderRadius: "5px",
                  marginBottom: "20px",
                  borderLeft: "4px solid #c62828"
                }}>
                  ⚠️ {error}
                </div>
              )}

              <div style={{ marginBottom: "20px" }}>
                <label style={{ 
                  display: "block", 
                  marginBottom: "8px",
                  fontWeight: "bold",
                  color: "#555"
                }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={customer.name}
                  onChange={handleChange}
                  required
                  placeholder="Enter your full name"
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    fontSize: "16px",
                    boxSizing: "border-box"
                  }}
                />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ 
                  display: "block", 
                  marginBottom: "8px",
                  fontWeight: "bold",
                  color: "#555"
                }}>
                  Email Address *
                </label>
                <input
                  type="email"
                  name="email"
                  value={customer.email}
                  onChange={handleChange}
                  required
                  placeholder="your.email@example.com"
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    fontSize: "16px",
                    boxSizing: "border-box"
                  }}
                />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ 
                  display: "block", 
                  marginBottom: "8px",
                  fontWeight: "bold",
                  color: "#555"
                }}>
                  Phone Number *
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={customer.phone}
                  onChange={handleChange}
                  required
                  placeholder="Enter your phone number"
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    fontSize: "16px",
                    boxSizing: "border-box"
                  }}
                />
              </div>

              <div style={{ marginBottom: "30px" }}>
                <label style={{ 
                  display: "block", 
                  marginBottom: "8px",
                  fontWeight: "bold",
                  color: "#555"
                }}>
                  Shipping Address *
                </label>
                <textarea
                  name="address"
                  value={customer.address}
                  onChange={handleChange}
                  required
                  placeholder="Enter your complete shipping address"
                  rows="4"
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    fontSize: "16px",
                    boxSizing: "border-box",
                    resize: "vertical"
                  }}
                />
              </div>

              <div style={{ 
                backgroundColor: "white",
                borderRadius: "10px",
                padding: "25px",
                boxShadow: "0 2px 15px rgba(0,0,0,0.05)",
                marginBottom: "30px"
              }}>
                <h3 style={{ color: "#232f3e", marginBottom: "25px" }}>
                  <span style={{ 
                    background: "#ffa41c", 
                    color: "white",
                    padding: "5px 10px",
                    borderRadius: "50%",
                    marginRight: "10px"
                  }}>2</span>
                  Payment Information
                </h3>

                <div style={{ marginBottom: "20px" }}>
                  <label style={{ 
                    display: "block", 
                    marginBottom: "15px",
                    fontWeight: "bold",
                    color: "#555"
                  }}>
                    Card Details *
                  </label>
                  <div style={{
                    border: "1px solid #ddd",
                    padding: "20px",
                    borderRadius: "8px",
                    backgroundColor: "#f8f9fa"
                  }}>
                    <CardElement 
                      options={{
                        style: {
                          base: {
                            fontSize: '16px',
                            color: '#424770',
                            '::placeholder': {
                              color: '#aab7c4',
                            },
                          },
                        },
                      }}
                    />
                  </div>
                  <p style={{ 
                    fontSize: "12px", 
                    color: "#777", 
                    marginTop: "10px",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px"
                  }}>
                    🔒 Secured by Stripe | Test Card: 4242 4242 4242 4242
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", gap: "15px" }}>
                <Link to="/cart" style={{ textDecoration: "none", flex: "1" }}>
                  <button
                    type="button"
                    style={{
                      width: "100%",
                      padding: "15px",
                      backgroundColor: "transparent",
                      color: "#232f3e",
                      border: "1px solid #ddd",
                      borderRadius: "8px",
                      fontSize: "16px",
                      cursor: "pointer",
                      fontWeight: "bold"
                    }}
                  >
                    ← Back to Cart
                  </button>
                </Link>
                
                <button 
                  type="submit" 
                  disabled={loading || !stripe}
                  style={{
                    flex: "2",
                    padding: "15px",
                    backgroundColor: loading ? "#ccc" : "#ffa41c",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "16px",
                    cursor: loading ? "not-allowed" : "pointer",
                    fontWeight: "bold",
                    transition: "background-color 0.3s"
                  }}
                  onMouseOver={(e) => !loading && (e.target.style.backgroundColor = "#ff9900")}
                  onMouseOut={(e) => !loading && (e.target.style.backgroundColor = "#ffa41c")}
                >
                  {loading ? (
                    <>
                      <span style={{ marginRight: "10px" }}>⏳</span>
                      Processing Payment...
                    </>
                  ) : (
                    `Pay ₹${total.toFixed(2)}`
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column - Order Summary */}
        <div style={{ 
          flex: "0 0 350px",
          backgroundColor: "#f8f9fa",
          borderRadius: "10px",
          padding: "25px",
          height: "fit-content"
        }}>
          <h3 style={{ 
            color: "#232f3e", 
            borderBottom: "1px solid #ddd", 
            paddingBottom: "15px",
            marginBottom: "25px"
          }}>
            Order Summary
          </h3>

          <div style={{ marginBottom: "25px" }}>
            {orderSummary.map((item, index) => (
              <div key={index} style={{ 
                display: "flex", 
                justifyContent: "space-between",
                marginBottom: "15px",
                paddingBottom: "15px",
                borderBottom: "1px solid #eee"
              }}>
                <div>
                  <p style={{ margin: "0 0 5px 0", fontWeight: "bold" }}>{item.name}</p>
                  <p style={{ margin: "0", color: "#777", fontSize: "14px" }}>
                    Qty: {item.quantity} × ₹{item.price}
                  </p>
                </div>
                <span style={{ fontWeight: "bold" }}>₹{item.subtotal.toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div style={{ marginBottom: "25px" }}>
            <div style={{ 
              display: "flex", 
              justifyContent: "space-between",
              marginBottom: "10px"
            }}>
              <span style={{ color: "#555" }}>Subtotal:</span>
              <span style={{ fontWeight: "bold" }}>₹{subtotal.toFixed(2)}</span>
            </div>
            
            <div style={{ 
              display: "flex", 
              justifyContent: "space-between",
              marginBottom: "10px"
            }}>
              <span style={{ color: "#555" }}>Shipping:</span>
              <span style={{ color: "#007600", fontWeight: "bold" }}>FREE</span>
            </div>
            
            <div style={{ 
              display: "flex", 
              justifyContent: "space-between",
              marginBottom: "15px"
            }}>
              <span style={{ color: "#555" }}>Tax (18%):</span>
              <span>₹{tax.toFixed(2)}</span>
            </div>
            
            <div style={{ 
              display: "flex", 
              justifyContent: "space-between",
              borderTop: "2px solid #ddd",
              paddingTop: "15px",
              marginTop: "15px",
              fontSize: "18px",
              fontWeight: "bold"
            }}>
              <span>Total:</span>
              <span style={{ color: "#b12704", fontSize: "20px" }}>
                ₹{total.toFixed(2)}
              </span>
            </div>
          </div>

          <div style={{ 
            backgroundColor: "#e8f4f8",
            borderRadius: "8px",
            padding: "15px",
            marginBottom: "20px"
          }}>
            <p style={{ 
              margin: "0 0 10px 0", 
              fontWeight: "bold",
              color: "#007185",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}>
              🔒 Secure Payment
            </p>
            <p style={{ 
              margin: "0", 
              fontSize: "13px", 
              color: "#007185",
              lineHeight: "1.5"
            }}>
              Your payment information is encrypted and processed securely by Stripe. We never store your card details.
            </p>
          </div>

          <div style={{ 
            backgroundColor: "#fff8e1",
            borderRadius: "8px",
            padding: "15px",
            fontSize: "14px",
            color: "#5d4037"
          }}>
            <p style={{ 
              margin: "0 0 10px 0", 
              fontWeight: "bold",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}>
              💡 Demo Mode
            </p>
            <p style={{ margin: "0", lineHeight: "1.5" }}>
              This is a demo. Use test card: <strong>4242 4242 4242 4242</strong>. Any future date for expiry, any 3 digits for CVC.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const Checkout = () => {
  const [cart, setCart] = useState([]);

  useEffect(() => {
    const storedCart = JSON.parse(localStorage.getItem("cart")) || [];
    setCart(storedCart);
  }, []);

  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm cart={cart} />
    </Elements>
  );
};

export default Checkout;