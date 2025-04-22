import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getAuth, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { FaUserShield, FaTrash } from 'react-icons/fa';
import "../styles/ManageUsersPage.css";

const ManageUsersPage = () => {
  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const companyName = localStorage.getItem('company');

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      const idToken = await getAuth().currentUser.getIdToken();
      const res = await axios.get('/api/users', {
        headers: {
          Authorization: `Bearer ${idToken}`,
           companyName
        }
      });
      setUsers(res.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }

  async function withReauthAndApi(actionFn) {
    const auth = getAuth();
    const user = auth.currentUser;
    const password = prompt('Please re‑enter your password to confirm:');
    if (!password) return;

    // reauthenticate
    const cred = EmailAuthProvider.credential(user.email, password);
    try {
      await reauthenticateWithCredential(user, cred);
    } catch {
      return alert('❌ Password incorrect — action aborted.');
    }

    // fresh ID token
    const idToken = await user.getIdToken(true);

    try {
      await actionFn(idToken);
      alert('✅ Action completed successfully.');
      fetchUsers();
    } catch (err) {
      alert('❌ Failed: ' + (err.response?.data?.error || err.message));
    }
  }

  const handlePromote = (targetUid) => {
    withReauthAndApi(idToken =>
      axios.put(`/api/users/${targetUid}/promote`, {}, {
        headers: { Authorization: `Bearer ${idToken}`, companyName }
      })
    );
  };

  const handleDemote = (targetUid) => {
    withReauthAndApi(idToken =>
      axios.put(`/api/users/${targetUid}/demote`, {}, {
        headers: { Authorization: `Bearer ${idToken}`, companyName }
      })
    );
  };

  const handleRemove = (targetUid) => {
    withReauthAndApi(idToken =>
      axios.delete(`/api/users/${targetUid}/remove`, {
        headers: { Authorization: `Bearer ${idToken}`, companyName }
      })
    );
  };

  if (loading) return <p>Loading users…</p>;
  if (error)   return <p className="error">{error}</p>;

  return (
    <div className="manage-users">
      <h1>Manage Users</h1>
      <table className="users-table">
        <thead>
          <tr>
            <th>Name</th><th>Email</th><th>Role</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id}>
              <td>{u.firstName} {u.lastName}</td>
              <td>{u.email}</td>
              <td>{u.role}</td>
              <td>
                {u.role === 'staff' && (
                  <button onClick={() => handlePromote(u.id)} className="btn-promote">
                    <FaUserShield /> Promote
                  </button>
                )}
                {u.role === 'manager' && (
                  <button onClick={() => handleDemote(u.id)} className="btn-demote">
                    Demote
                  </button>
                )}
                {u.role !== 'admin' && (
                  <button onClick={() => handleRemove(u.id)} className="btn-remove">
                    <FaTrash /> Remove
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ManageUsersPage;