import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../styles/UnauthorisedPage.css"; 

const UnauthorisedPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Function to go back to the previous page
  const handleGoBack = () => {
    // If there is a previous page, go back; otherwise, navigate to the dashboard
    if (location.state && location.state.from) {
      navigate(-1);
    } else {
      navigate("/dashboard");
    }
  };

  // Function to navigate to the sign-in page
  const handleSignIn = () => {
    navigate("/auth");
  };

  return (
    <div className="unauthorised-container">
      <div className="unauthorised-content">
        <h1>Unauthorised Access</h1>
        <p>You do not have permission to view this page.</p>
        <div className="btn-group">
          <button className="btn go-back-btn" onClick={handleGoBack}>
            Go Back
          </button>
          <button className="btn sign-in-btn" onClick={handleSignIn}>
            Sign In
          </button>
        </div>
      </div>
    </div>
  );
};

export default UnauthorisedPage;