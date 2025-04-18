import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { getAuth, signOut } from "firebase/auth";
import { useAuth } from "../context/AuthContext";
import "../styles/Navbar.css";

// Helper function to capitalize the first letter of a string
const capitalizeFirstLetter = (string) => {
  if (!string) return "";
  return string.charAt(0).toUpperCase() + string.slice(1);
};

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, setUser } = useAuth();
  const auth = getAuth();

  // Determine if we are on a dashboard page 
  const hidePaths = ["/", "/auth"];
  const isDashboardPage = !hidePaths.includes(location.pathname);

  useEffect(() => {
    console.log("Navbar re-rendered. User:", user);
  }, [user]);

  // Sign-out handler: clear user-specific data from localStorage and update state.
  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      localStorage.removeItem("token");
      localStorage.removeItem("uid");
      localStorage.removeItem("role");
      localStorage.removeItem("company");
      localStorage.removeItem("fullname");
      navigate("/"); // Redirect to landing page
    } catch (error) {
      console.error("Logout failed:", error.message);
    }
  };


  const storedCompany = user ? localStorage.getItem("company") : null;
  const brandName = storedCompany ? capitalizeFirstLetter(storedCompany) : "Inventory System";

  // Function to get the appropriate dashboard route based on role.
  const getDashboardRoute = () => {
    const role = localStorage.getItem("role");
    if (role === "admin" || role === "manager") {
      return "/admin-dashboard";
    } else if (role) {
      return "/dashboard";
    }
    return "/";
  };

  // Set the brand link destination: if user is logged in, go to dashboard; otherwise, landing page.
  const brandLink = user ? getDashboardRoute() : "/";

  return (
    <nav className="dashboard-navbar">
      <Link className="navbar-brand" to={brandLink}>
        {brandName}
      </Link>

      {user && isDashboardPage && (
        <div className="nav-right">
          <div className="notification-container">
          </div>
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