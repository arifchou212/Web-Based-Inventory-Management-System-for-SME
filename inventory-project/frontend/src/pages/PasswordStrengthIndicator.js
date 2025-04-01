import React from "react";

const PasswordStrengthIndicator = ({ errors, password }) => {
  const getStrength = () => {
    if (!password || password.length === 0) {
      return "empty"; 
    }
    const errorCount = errors.length;
    if (errorCount === 0) return "strong";
    if (errorCount <= 2) return "medium";
    return "weak";
  };

  const strength = getStrength();

  const getStrengthText = (s) => {
    if (s === "empty") return "No Password"; 
    return s.charAt(0).toUpperCase() + s.slice(1) + " Password";
  };

  return (
    <div className="password-strength">
      <div className={`strength-bar ${strength}`} />
      <span className={`strength-text ${strength}`}>
        {getStrengthText(strength)}
      </span>
    </div>
  );
};

export default PasswordStrengthIndicator;