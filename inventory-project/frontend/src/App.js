import React from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import InventoryPage from "./pages/InventoryPage";
import ManageUsersPage from "./pages/ManageUsersPage";
import SettingsPage from "./pages/SettingsPage";
import ReportsPage from "./pages/ReportsAnalytics";
import AuthPage from "./pages/AuthPage";
import LandingPage from "./pages/LandingPage";
import { ThemeProvider } from "./context/ThemeContext";

function AppContent() {
  const location = useLocation();
  const { user, loading } = useAuth();

  if (loading) {
    console.log("App is still loading user data...");
    return <p>Loading...</p>; // Prevents rendering while user data is loading
  }

  console.log("App Loaded User:", user); // Debugging

  const userRole = user?.role || "staff";  
  console.log("Determined User Role in App:", userRole); // Debugging

  const showSidebarRoutes = ["/dashboard", "/admin-dashboard", "/inventory", "/manage-users", "/settings", "/reports"];
  const showSidebar = showSidebarRoutes.includes(location.pathname);

  return (
    <>
      <Navbar user={user} />
      <div className="container">
        {showSidebar && <Sidebar userRole={userRole} />}
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<AuthPage />} />

          <Route path="/dashboard" element={<ProtectedRoute allowedRoles={["staff"]}><Dashboard /></ProtectedRoute>} />
          <Route path="/admin-dashboard" element={<ProtectedRoute allowedRoles={["admin", "manager"]}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/inventory" element={<ProtectedRoute allowedRoles={["admin", "manager"]}><InventoryPage /></ProtectedRoute>} />
          <Route path="/manage-users" element={<ProtectedRoute allowedRoles={["admin"]}><ManageUsersPage /></ProtectedRoute>} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/reports" element={<ProtectedRoute allowedRoles={["admin", "manager"]}><ReportsPage /></ProtectedRoute>} />
        </Routes>
      </div>
    </>
  );
}


function App() {
  return (
    <ThemeProvider>
      <Router>
        <AppContent />
      </Router>
    </ThemeProvider>
  );
}
export default App;