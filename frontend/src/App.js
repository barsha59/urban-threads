// src/App.js - UPDATED VERSION
import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import ProductList from "./components/ProductList";
import ProductDetail from "./components/ProductDetail";
import Cart from "./components/Cart";
import Checkout from "./components/Checkout";
import OrderSuccess from "./components/OrderSuccess";
import Login from "./components/Login";
import Register from "./components/Register";
import Navbar from "./components/Navbar";
import Wishlist from "./components/Wishlist";

function App() {
  const [cart, setCart] = useState([]);
  const [user, setUser] = useState(null);

  // Check for existing user on load
useEffect(() => {
  try {
    const storedUser = localStorage.getItem("user");
    if (storedUser && storedUser !== "undefined") {
      setUser(JSON.parse(storedUser));
    }
  } catch (error) {
    console.error("Error parsing user from localStorage:", error);
    localStorage.removeItem("user");
  }

  try {
    const storedCart = localStorage.getItem("cart");
    if (storedCart && storedCart !== "undefined") {
      setCart(JSON.parse(storedCart));
    }
  } catch (error) {
    console.error("Error parsing cart from localStorage:", error);
    localStorage.removeItem("cart");
  }
}, []);

  // Add product to cart
  const addToCart = (product) => {
    const existing = cart.find(item => item.id === product.id);
    let newCart;
    if (existing) {
      newCart = cart.map(item =>
        item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      );
    } else {
      newCart = [...cart, { ...product, quantity: 1 }];
    }
    setCart(newCart);
    localStorage.setItem("cart", JSON.stringify(newCart));
  };

  // Handle login
  const handleLogin = (userData) => {
    setUser(userData);
  };

  // Handle logout
  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("user");
  };

  return (
    <Router>
      {/* Only show Navbar if user is logged in */}
      {user && <Navbar user={user} onLogout={handleLogout} cartCount={cart.length} />}
      
      <div style={{ padding: "20px" }}>
        <Routes>
          {/* Root path shows Login if not logged in, Products if logged in */}
          <Route path="/" element={
            user ? <Navigate to="/products" /> : <Login onLogin={handleLogin} />
          } />
          
          <Route path="/login" element={
            user ? <Navigate to="/products" /> : <Login onLogin={handleLogin} />
          } />
          
          <Route path="/register" element={
            user ? <Navigate to="/products" /> : <Register onRegister={handleLogin} />
          } />
          
          {/* Protected routes - only accessible when logged in */}
          <Route path="/products" element={
            user ? <ProductList addToCart={addToCart} /> : <Navigate to="/login" />
          } />
          
          <Route path="/product/:id" element={
            user ? <ProductDetail addToCart={addToCart} /> : <Navigate to="/login" />
          } />
          
          <Route path="/cart" element={
            user ? <Cart cart={cart} setCart={setCart} /> : <Navigate to="/login" />
          } />
          <Route path="/wishlist" element={  // ← ADD THIS LINE
    user ? <Wishlist /> : <Navigate to="/login" />
  } />
          
          <Route path="/checkout" element={
            user ? <Checkout /> : <Navigate to="/login" />
          } />
          
          <Route path="/order-success" element={
            user ? <OrderSuccess /> : <Navigate to="/login" />
          } />
          
        </Routes>
      </div>
    </Router>
  );
}

export default App;