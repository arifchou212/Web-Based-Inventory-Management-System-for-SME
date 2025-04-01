import React from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import "../styles/LandingPage.css";

const LandingPage = () => {
  return (
    <div className="landing-container">
      {/* Optional Reusable Navbar */}
      <Navbar />

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-overlay">
          <div className="hero-content">
            <h1 className="hero-title">Elevate Your Inventory</h1>
            <p className="hero-subtitle">
              An all-in-one solution for real-time tracking,
              bulk uploads, and secure role-based management.
            </p>
            <div className="hero-buttons">
              <Link to="/demo" className="btn btn-primary-hero">
                Get a Free Demo
              </Link>
              <Link to="/auth" className="btn btn-outline-hero">
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="section-header">
          <h2 className="section-title">Key Features</h2>
          <p className="section-subtitle">
            Discover the prime elements that make our system stand out.
          </p>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <h3>Real-Time Tracking</h3>
            <p>
              Stay informed on live stock changes and never miss a critical update.
            </p>
          </div>
          <div className="feature-card">
            <h3>Role-Based Control</h3>
            <p>
              Assign Admin, Manager, or Employee roles with tailored permissions.
            </p>
          </div>
          <div className="feature-card">
            <h3>Bulk CSV Uploads</h3>
            <p>
              Effortlessly import thousands of items at once with built-in validation.
            </p>
          </div>
          <div className="feature-card">
            <h3>Data Security</h3>
            <p>
              Safeguard your data with encryption, optional 2FA, and precise user logs.
            </p>
          </div>
          <div className="feature-card">
            <h3>Custom Alerts</h3>
            <p>
              Get notified for low stock, expiry dates, or custom triggers.
            </p>
          </div>
          <div className="feature-card">
            <h3>Analytics & Reports</h3>
            <p>
              Generate insight-driven analytics to forecast demand and optimize inventory.
            </p>
          </div>
        </div>
      </section>

      {/* Info / CTA Section */}
      <section className="info-section">
        <div className="info-content">
          <div className="info-text">
            <h2>Why Choose Our System?</h2>
            <p>
              Enjoy real-time data, secure role-based access, 
              and advanced analytics under one unified, 
              easy-to-use dashboard.
            </p>
            <Link to="/auth" className="btn btn-primary-info">
              Get Started
            </Link>
          </div>
          <div className="info-image">
            <img
              src="https://via.placeholder.com/550x350/111/aaa?text=Inventory+Snapshot"
              alt="Inventory Snapshot"
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <p className="footer-text">
          &copy; {new Date().getFullYear()} Inventory Management.
        </p>
        <div className="footer-links">
          <Link to="/privacy-policy" className="footer-link">
            Privacy Policy
          </Link>
          <Link to="/terms" className="footer-link">
            Terms of Service
          </Link>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;