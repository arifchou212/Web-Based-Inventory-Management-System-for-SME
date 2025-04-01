import React, { useState, useEffect } from 'react';
import { getUsers, promoteUser, removeUser } from '../api';
import { FaUserShield, FaTrash } from 'react-icons/fa';
import "../styles/ManageUsersPage.css";

const ManageUsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Retrieve admin UID and company name from localStorage (set during login/signup)
  const adminUid = localStorage.getItem('uid');
  const companyName = localStorage.getItem('company');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const userData = await getUsers(adminUid, companyName);
      setUsers(userData);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handlePromote = async (userId, userEmail) => {
    const password = prompt("Enter your password to confirm promotion:");
    if (!password) return;
    if (window.confirm("Are you sure you want to promote this user to Manager?")) {
      try {
        await promoteUser(userId, password, adminUid, companyName);
        alert("User promoted successfully.");
        fetchUsers();
      } catch (error) {
        alert("Failed to promote user: " + error.message);
      }
    }
  };

  const handleRemove = async (userId, userEmail) => {
    const password = prompt("Enter your password to confirm removal:");
    if (!password) return;
    if (window.confirm("Are you sure you want to remove this user? This action is irreversible.")) {
      try {
        await removeUser(userId, password, adminUid, companyName);
        alert("User removed successfully.");
        fetchUsers();
      } catch (error) {
        alert("Failed to remove user: " + error.message);
      }
    }
  };

  return (
    <div className="manage-users">
      <h1>Manage Users</h1>
      {loading ? <p>Loading users...</p> : error ? <p className="error">{error}</p> : (
        <table className="users-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td>{user.firstName} {user.lastName}</td>
                <td>{user.email}</td>
                <td className={`role-${user.role}`}>{user.role}</td>
                <td>
                  {user.role !== 'admin' && (
                    <>
                      <button className="btn-promote" onClick={() => handlePromote(user.id, user.email)}>
                        <FaUserShield /> Promote
                      </button>
                      <button className="btn-remove" onClick={() => handleRemove(user.id, user.email)}>
                        <FaTrash /> Remove
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default ManageUsersPage;