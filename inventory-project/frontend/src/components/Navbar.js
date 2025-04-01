import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { getAuth, signOut } from "firebase/auth";
import { useAuth } from "../context/AuthContext";
import "../styles/Navbar.css";

function Navbar({ lowStockProducts = [] }) {
  const [showNotifications, setShowNotifications] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, setUser } = useAuth();
  const auth = getAuth();

  // Hide navbar updates on landing and auth pages
  const isDashboardPage = !["/", "/auth"].includes(location.pathname);

  useEffect(() => {
    console.log("Navbar re-rendered. User:", user);
  }, [user]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      navigate("/"); // Redirect to landing page
    } catch (error) {
      console.error("Logout failed:", error.message);
    }
  };

  return (
    <nav className="dashboard-navbar">
      <Link className="navbar-brand" to="/">
        Inventory System
      </Link>

      {user && isDashboardPage && (
        <div className="nav-right">
          {/* Notification Bell */}
          <div className="notification-container">
            <div
              className="notification-bell"
              onClick={() => setShowNotifications(!showNotifications)}
            >
              🔔{" "}
              {lowStockProducts.length > 0 && (
                <span className="badge">{lowStockProducts.length}</span>
              )}
            </div>

            {/* Notification Dropdown */}
            {showNotifications && (
              <div className="notification-dropdown">
                <h4>Low Stock Alerts</h4>
                {lowStockProducts.length > 0 ? (
                  <ul>
                    {lowStockProducts.map((product) => (
                      <li key={product.id}>
                        {product.name} - Stock: {product.stock}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No low-stock products.</p>
                )}
              </div>
            )}
          </div>

          {/* Sign Out Button */}
          <button className="btn logout-btn" onClick={handleLogout}>
            Sign Out
          </button>
        </div>
      )}

      {!user && (
        <div className="nav-right">
          <Link className="btn login-btn" to="/auth">
            Sign In
          </Link>
        </div>
      )}
    </nav>
  );
}

export default Navbar;