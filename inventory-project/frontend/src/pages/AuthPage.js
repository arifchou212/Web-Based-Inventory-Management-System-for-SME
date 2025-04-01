import React, { useState, useEffect } from "react";
import { auth, googleProvider } from "../firebase";
import { signInWithPopup, sendEmailVerification, sendPasswordResetEmail, signInWithEmailAndPassword } from "firebase/auth";
import { signUp, login, googleSignIn, requestPasswordReset } from "../api"; 
import { useAuth } from "../context/AuthContext";

import PasswordStrengthIndicator from "./PasswordStrengthIndicator"; 
import "../styles/AuthPage.css";

const AuthPage = () => {
  const {user} = useAuth();
  // Toggle: login or signup
  const [isLogin, setIsLogin] = useState(true);

  // Form data for login or signup
  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    companyName: "",
    firstName: "",
    lastName: "",
  });

  const [passwordErrors, setPasswordErrors] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [showVerifyMessage, setShowVerifyMessage] = useState(false);

  const [errors, setErrors] = useState({}); // For form errors
  const [googlePending, setGooglePending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");


  // Forgot Password Modal
  const [isForgotPasswordModalOpen, setIsForgotPasswordModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  // Additional Info for brand-new Google user
  const [showAdditionalInfoForm, setShowAdditionalInfoForm] = useState(false);
  const [additionalInfo, setAdditionalInfo] = useState({
    companyName: "",
    firstName: "",
    lastName: "",
  });

  // Validate password complexity
  const validatePassword = (password) => {
    const errs = [];
    if (password.length < 8) errs.push("min_length");
    if (!/[A-Z]/.test(password)) errs.push("uppercase");
    if (!/[a-z]/.test(password)) errs.push("lowercase");
    if (!/\d/.test(password)) errs.push("digit");
    if (!/[!@#$%^&*(),.?\":{}|<>]/.test(password)) errs.push("symbol");

    setPasswordErrors(errs);
    return errs.length === 0 && password.length > 0;
  };

  // Basic front-end form checks
  const validateForm = () => {
    const newErrors = {};

    if (isLogin) {
      // For signup, these fields required
      if (!form.companyName.trim()) newErrors.companyName = "Company name is required";
      if (!form.firstName.trim()) newErrors.firstName = "First name is required";
      if (!form.lastName.trim()) newErrors.lastName = "Last name is required";
    }

    // Email format
    const emailRegex = /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/;
    if (!emailRegex.test(form.email)) {
      newErrors.email = "Invalid email address";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const sendVerificationEmail = async () => {
    if (auth.currentUser) {
      try {
        await sendEmailVerification(auth.currentUser);
        alert("📧 A verification email has been sent. Please check your inbox.");
      } catch (error) {
        console.error("Failed to send verification email:", error.message);
        alert("❌ Error sending verification email. Try again later.");
      }
    }
  };
  
  // handleAuth (login / signup)

  const handleAuth = async () => {
    if (!validateForm()) return;

    try {
        let data;
        if (!isLogin) {  
            data = await login({ email: form.email, password: form.password });
            const userCred = await signInWithEmailAndPassword(auth, form.email, form.password);
      
            if (!userCred.user.emailVerified) {
                await auth.signOut(); // Prevent unverified login
                setErrorMessage("❌ Please verify your email before logging in.");
                return;
              }

              // Save user session (use localStorage)
              localStorage.setItem("token", data.token);
              localStorage.setItem("uid", userCred.user.uid);
              localStorage.setItem("role", data.role || "user");
              localStorage.setItem("company", data.company || "");

              // Redirect to correct dashboard
              redirectUser(data.role);
        } else {
            
            if (form.password !== form.confirmPassword) {
                setErrors({ confirmPassword: "Passwords do not match" });
                return;
            }
            if (!validatePassword(form.password)) {
                return;
            }
            data = await signUp(form);

            if (auth.currentUser) {
              await sendEmailVerification(auth.currentUser);
              setShowVerifyMessage(true);
              setTimeout(() => setShowVerifyMessage(false), 10000);
              alert("📧 A verification email has been sent. Check your inbox.");
          }
        }
        handleAuthSuccess(data);
    } catch (error) {
        setErrors({ general: error.message });
        setTimeout(() => setErrorMessage(""), 5000)
    }
};

const redirectUser = (role) => {
  if (role === "admin" || role === "manager") {
    window.location.href = "/admin-dashboard";
  } else {
    window.location.href = "/dashboard";
  }
};


  // Google Sign-In Flow
  const handleGoogleSignIn = async () => {
    try {
      setGooglePending(true);

      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();

      const data = await googleSignIn(idToken); 
      if (data.requiresAdditionalInfo) {
        setShowAdditionalInfoForm(true);
        return;
      }
      handleAuthSuccess(data);
    } catch (error) {
      console.error("Google Sign-In Error:", error);
      setErrors({ general: error.message });
    } finally {
      setGooglePending(false);
    }
  };

  // If user is brand-new, they fill in a form
  const submitAdditionalInfo = async () => {
    try {
      // Must retrieve current ID token for final call
      const idToken = await auth.currentUser.getIdToken();

      const data = await googleSignIn(idToken, additionalInfo);
      setShowAdditionalInfoForm(false);
      handleAuthSuccess(data);
    } catch (error) {
      console.error("Error submitting additional info:", error);
      alert(error.message);
    }
  };

  // Handle Auth Success
  const handleAuthSuccess = (data) => {
    if (data.requiresVerification) {
        setShowVerifyMessage(true);
        setTimeout(() => setShowVerifyMessage(false), 10000);
        return; 
    }

    if (data.token) {
        localStorage.setItem("token", data.token);
    }
    localStorage.setItem("uid", data.uid || "");
    localStorage.setItem("role", data.role || "");
    localStorage.setItem("company", data.company || "");

    if (data.role === "admin" || data.role === "manager") {
        window.location.href = "/admin-dashboard";
    } else if (data.role) {
        window.location.href = "/dashboard";
    }
};

  // Input Handlers
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors((prev) => ({ ...prev, [e.target.name]: "" }));
  };

const toggleForm = (event) => {
  event.preventDefault();
  setIsLogin((prev) => !prev);
  // Clear all form state
  setForm({
    email: "",
    password: "",
    confirmPassword: "",
    companyName: "",
    firstName: "",
    lastName: "",
  });
  setErrors({});
  setPasswordErrors([]);
};


  // Forgot Password
  const handleResetPassword = async () => {
    // Basic email check
    const emailRegex = /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/;
    if (!emailRegex.test(resetEmail)) {
      setErrors({ reset: "Invalid email address" });
      return;
    }
    try {
      const data = await requestPasswordReset(resetEmail);
      alert(data.message || "Password reset email sent!");
      setIsForgotPasswordModalOpen(false);
    } catch (error) {
      setErrors({ reset: error.message });
    }
  };

  const checkEmailVerification = async () => {
    const user = auth.currentUser;
    if (user) {
        await user.reload();  // Refresh user data
        if (user.emailVerified) {
            alert("Your email has been verified! You can now log in.");
            setShowVerifyMessage(false);
        }
    }
};

  return (
    <div className="auth-container">

      {showVerifyMessage && (
        <div className="email-verification-message">
            A verification email has been sent. Please check your email before logging in.
        </div>
      )}

      {/* General Errors */}
      {errorMessage && <div className="error-banner">{errorMessage}</div>}
      <div className={`auth-box ${isLogin ? "login-mode" : "signup-mode"}`}>
        
        {/* ====== Login Form ====== */}
        <div className={`form-container left-side ${!isLogin ? "active" : "inactive"}`}>
          <h2>Welcome Back</h2>

          <div className="input-group">
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={form.email}
              onChange={handleChange}
              className={errors.email ? "error" : ""}
            />
            {errors.email && <span className="error-message">{errors.email}</span>}
          </div>

          <div className="input-group">
            <div className="password-field">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Password"
                value={form.password}
                onChange={handleChange}
              />
              <i
                className={`fa-solid ${showPassword ? "fa-eye-slash" : "fa-eye"} password-toggle`}
                onClick={() => setShowPassword(!showPassword)}
              />
            </div>
          </div>

          <button onClick={handleAuth} className="primary-btn">
            Login
          </button>

          <button onClick={handleGoogleSignIn} className="google-btn" disabled={googlePending}>
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg"
              alt="Google"
            />
            {googlePending ? "Processing..." : "Continue with Google"}
          </button>

          {/* Link row for toggling signup & forgot password */}
          <div className="login-extra">
            <p className="toggle-text" onClick={toggleForm}>
              New user? Create an Account
            </p>
            <p className="forgot-password" onClick={() => {
                  console.log("Forgot password clicked!");
                  setIsForgotPasswordModalOpen(true);
            }}>
                  Forgot Password?
            </p>
          </div>
        </div>
        
        {/* ====== Signup Form ====== */}
        <div className={`form-container right-side ${isLogin ? "active" : "inactive"}`}>
          <h2>Create Account</h2>

          <div className="name-fields">
            <div className="input-group">
              <input
                type="text"
                name="firstName"
                placeholder="First Name"
                value={form.firstName}
                onChange={handleChange}
                className={errors.firstName ? "error" : ""}
              />
              {errors.firstName && <span className="error-message">{errors.firstName}</span>}
            </div>
            <div className="input-group">
              <input
                type="text"
                name="lastName"
                placeholder="Last Name"
                value={form.lastName}
                onChange={handleChange}
                className={errors.lastName ? "error" : ""}
              />
              {errors.lastName && <span className="error-message">{errors.lastName}</span>}
            </div>
          </div>

          <div className="input-group">
            <input
              type="text"
              name="companyName"
              placeholder="Company Name"
              value={form.companyName}
              onChange={handleChange}
              className={errors.companyName ? "error" : ""}
            />
            {errors.companyName && <span className="error-message">{errors.companyName}</span>}
          </div>

          <div className="input-group">
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={form.email}
              onChange={handleChange}
              className={errors.email ? "error" : ""}
            />
            {errors.email && <span className="error-message">{errors.email}</span>}
          </div>

          <div className="password-group">
            {/* Password Field */}
            <div className="input-group">
              <div className="password-field">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Password"
                  value={form.password}
                  onChange={(e) => {
                    handleChange(e);
                    validatePassword(e.target.value); // check complexity
                  }}
                />
                <i
                  className={`fa-solid ${showPassword ? "fa-eye-slash" : "fa-eye"} password-toggle`}
                  onClick={() => setShowPassword(!showPassword)}
                />
              </div>
              {/* Password Strength Indicator here */}
              <PasswordStrengthIndicator 
                  errors={passwordErrors} 
                  password={form.password} 
              />

            </div>

            {/* Confirm Password Field */}
            <div className="input-group">
              <div className="password-field">
                <input
                  type={showPassword ? "text" : "password"}
                  name="confirmPassword"
                  placeholder="Confirm Password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  className={errors.confirmPassword ? "error" : ""}
                />
                <i
                  className={`fa-solid ${showPassword ? "fa-eye-slash" : "fa-eye"} password-toggle`}
                  onClick={() => setShowPassword(!showPassword)}
                />
                {errors.confirmPassword && (
                  <span className="error-message">{errors.confirmPassword}</span>
                )}
              </div>
            </div>
          </div>

          <button onClick={handleAuth} className="primary-btn">
            Create Account
          </button>

          <p className="toggle-text" onClick={toggleForm}>
            Existing user? Login
          </p>
        </div>

        {/* Cover Panel */}
        <div className="cover-panel">
          <div className="cover-content">
            <h2>{isLogin ? "Already have an Account?" : "New Here?"}</h2>
            <p>
              {isLogin ? "Login to access your account" : "Create an account to get started"}
            </p>
            <button className="outline-btn" onClick={toggleForm}>
              {isLogin ? "Login" : "Create an Account"}
            </button>
          </div>
        </div>
      </div>

       {/* Forgot Password Modal */}
       {isForgotPasswordModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Reset Password</h3>
            <input
              type="email"
              placeholder="Enter your email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
            />
            <div className="modal-actions">
              <button className="primary-btn" onClick={handleResetPassword}>
                Send Reset Link
              </button>
              <button
                className="text-btn"
                onClick={() => setIsForgotPasswordModalOpen(false)}
              >
                Cancel
              </button>
            </div>
            {errors.reset && <div className="error-message">{errors.reset}</div>}
          </div>
        </div>
      )}

      {/* Additional Info for brand-new Google user */}
      {showAdditionalInfoForm && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Complete Your Profile</h3>
            <input
              type="text"
              placeholder="Company Name"
              value={additionalInfo.companyName}
              onChange={(e) =>
                setAdditionalInfo({ ...additionalInfo, companyName: e.target.value })
              }
            />
            <input
              type="text"
              placeholder="First Name"
              value={additionalInfo.firstName}
              onChange={(e) =>
                setAdditionalInfo({ ...additionalInfo, firstName: e.target.value })
              }
            />
            <input
              type="text"
              placeholder="Last Name"
              value={additionalInfo.lastName}
              onChange={(e) =>
                setAdditionalInfo({ ...additionalInfo, lastName: e.target.value })
              }
            />
            <button className="primary-btn" onClick={submitAdditionalInfo}>
              Submit
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuthPage;
