import React from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import "../styles/LandingPage.css";


const LandingPage = () => {
  return (
    <div className="landing-container">
      {/* Navbar */}
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
            <p>Monitor live changes in inventory, including additions and sales.</p>
          </div>
          <div className="feature-card">
            <h3>Role-Based Control</h3>
            <p>Admin, Manager, and Employee roles with controlled access levels.</p>
          </div>
          <div className="feature-card">
            <h3>Bulk CSV Uploads</h3>
            <p>Upload large inventories in one go with data validation checks.</p>
          </div>
          <div className="feature-card">
            <h3>Data Security</h3>
            <p>Authentication via Firebase, ensuring secure and authorized access.</p>
          </div>
          <div className="feature-card">
            <h3>Custom Alerts</h3>
            <p>Notifications for low stock or critical updates.</p>
          </div>
          <div className="feature-card">
            <h3>Analytics & Reports</h3>
            <p>Generate reports on inventory actions and sales trends.</p>
          </div>
          <div className="feature-card">
            <h3>Interactive Dashboard</h3>
            <p>Access all key features from one easy-to-use interface.</p>
          </div>
          <div className="feature-card">
            <h3>User Activity Logs</h3>
            <p>Track user actions for clear accountability and record-keeping.</p>
          </div>
          <div className="feature-card">
            <h3>User-Friendly Interface</h3>
            <p>Navigate and manage your inventory effortlessly with a clean and intuitive UI.</p>
          </div>
        </div>
      </section>

      {/* Info / CTA Section */}
      <section className="info-section">
      <div className="info-content">
        <div className="info-text">
          <h2>Why Choose Our System?</h2>
          <p>
            Managing your inventory doesn't have to be complicated. 
            Our system combines simplicity, efficiency, and security to 
            help you take control of your business with ease.
          </p>
          <div className="why-choose-list">
            <div className="why-choose-item">
              <span>🚀</span>
              <p><strong>Stay in Control:</strong> Real-time updates keep you aware of stock levels and changes.</p>
            </div>
            <div className="why-choose-item">
              <span>🔒</span>
              <p><strong>Secure and Reliable:</strong> Role-based access ensures data integrity and protection.</p>
            </div>
            <div className="why-choose-item">
              <span>📊</span>
              <p><strong>Make Informed Decisions:</strong> Generate reports and analyze trends to optimize inventory.</p>
            </div>
            <div className="why-choose-item">
              <span>📁</span>
              <p><strong>Fast Data Entry:</strong> Bulk CSV uploads save time and reduce errors.</p>
            </div>
            <div className="why-choose-item">
              <span>📂</span>
              <p><strong>Easy Data Export:</strong> Download reports in CSV, Excel, or PDF format to share and analyze.</p>
            </div>
            <div className="why-choose-item">
              <span>📝</span>
              <p><strong>Clear Accountability:</strong> User activity logs help track changes and maintain records.</p>
            </div>
            <div className="why-choose-item">
              <span>💡</span>
              <p><strong>Simple and Intuitive:</strong> Designed for small businesses with a user-friendly interface.</p>
            </div>
          </div>
          <Link to="/auth" className="btn btn-primary-info">
            Get Started
          </Link>
          </div>
          <div className="info-image">
            <img
              src="\images\image.png"
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