import React from 'react';
import { Link } from 'react-router-dom';
import { FaHome, FaBox, FaUsers, FaChartLine, FaClipboardList } from 'react-icons/fa';
import '../styles/Sidebar.css';

const Sidebar = ({ userRole }) => {
  console.log("Sidebar Received User Role:", userRole); // Debugging

  if (!userRole) {
    console.log("Sidebar is NOT rendering because userRole is undefined or null.");
    return null; // Prevents rendering if userRole is missing
  }

  const dashboardRoute = userRole === 'admin' || userRole === 'manager' ? '/admin-dashboard' : '/dashboard';

  return (
    <div className="sidebar">
      <ul>
        <li>
          <Link to={dashboardRoute} className="sidebar-link">
            <FaHome className="icon" /> Dashboard
          </Link>
        </li>

        <li>
          <Link to="/tasks" className="sidebar-link">
            <FaClipboardList className="icon" /> Notifications
          </Link>
        </li>

        {(userRole === 'admin' || userRole === 'manager') && (
          <>
            <li>
              <Link to="/inventory" className="sidebar-link">
                <FaBox className="icon" /> Inventory
              </Link>
            </li>
            <li>
              <Link to="/manage-users" className="sidebar-link">
                <FaUsers className="icon" /> Manage Users
              </Link>
            </li>
            <li>
              <Link to="/reports" className="sidebar-link">
                <FaChartLine className="icon" /> Reports
              </Link>
            </li>
          </>
        )}
      </ul>
    </div>
  );
};

export default Sidebar;