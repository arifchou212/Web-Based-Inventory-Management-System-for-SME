import React, { useState, useEffect } from 'react';
import ThemeToggle from '../components/ThemeToggle'; // Ensure the path is correct
import { useAuth } from '../context/AuthContext';
import '../styles/SettingsPage.css';

const SettingsPage = () => {
  const { user } = useAuth();

  const [account, setAccount] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
  });

  const [company, setCompany] = useState({
    companyName: user?.company || '',
    address: user?.address || '',
    phone: user?.phone || '',
  });

  // Notification preferences 
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    smsNotifications: false,
  });

  // Update states if user data changes
  useEffect(() => {
    if (user) {
      setAccount({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
      });
      setCompany({
        companyName: user.company || '',
        address: user.address || '',
        phone: user.phone || '',
      });
    }
  }, [user]);

  const handleAccountChange = (e) => {
    const { name, value } = e.target;
    setAccount((prev) => ({ ...prev, [name]: value }));
  };

  const handleCompanyChange = (e) => {
    const { name, value } = e.target;
    setCompany((prev) => ({ ...prev, [name]: value }));
  };

  const handleNotificationsChange = (e) => {
    const { name, checked } = e.target;
    setNotifications((prev) => ({ ...prev, [name]: checked }));
  };

  const handleSaveAccount = (e) => {
    e.preventDefault();
    alert('Account settings saved!');
  };

  const handleSaveCompany = (e) => {
    e.preventDefault();
    alert('Company settings saved!');
  };

  const handleSaveNotifications = (e) => {
    e.preventDefault();
    alert('Notification preferences saved!');
  };

  return (
    <div className="settings-page">
      <header className="settings-header">
        <h1>Settings</h1>
      </header>

      {/* Theme Preferences */}
      <section className="settings-section">
        <h2>Theme Preferences</h2>
        <p>Switch between Light and Dark mode to suit your environment.</p>
        <ThemeToggle />
      </section>

      {/* Account Settings */}
      <section className="settings-section">
        <h2>Account Settings</h2>
        <form className="settings-form" onSubmit={handleSaveAccount}>
          <div className="form-group">
            <label htmlFor="firstName">First Name</label>
            <input 
              type="text"
              id="firstName"
              name="firstName"
              value={account.firstName}
              onChange={handleAccountChange}
            />
          </div>
          <div className="form-group">
            <label htmlFor="lastName">Last Name</label>
            <input 
              type="text"
              id="lastName"
              name="lastName"
              value={account.lastName}
              onChange={handleAccountChange}
            />
          </div>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input 
              type="email"
              id="email"
              name="email"
              value={account.email}
              onChange={handleAccountChange}
            />
          </div>
          <div className="form-group">
            <button type="submit" className="btn btn-primary">
              Save Account Settings
            </button>
          </div>
        </form>
      </section>

      {/* Company Settings */}
      <section className="settings-section">
        <h2>Company Settings</h2>
        <form className="settings-form" onSubmit={handleSaveCompany}>
          <div className="form-group">
            <label htmlFor="companyName">Company Name</label>
            <input 
              type="text"
              id="companyName"
              name="companyName"
              value={company.companyName}
              onChange={handleCompanyChange}
            />
          </div>
          <div className="form-group">
            <label htmlFor="address">Address</label>
            <input 
              type="text"
              id="address"
              name="address"
              value={company.address}
              onChange={handleCompanyChange}
            />
          </div>
          <div className="form-group">
            <label htmlFor="phone">Phone</label>
            <input 
              type="text"
              id="phone"
              name="phone"
              value={company.phone}
              onChange={handleCompanyChange}
            />
          </div>
          <div className="form-group">
            <button type="submit" className="btn btn-primary">
              Save Company Settings
            </button>
          </div>
        </form>
      </section>

      {/* Notification Preferences */}
      <section className="settings-section">
        <h2>Notification Preferences</h2>
        <form className="settings-form" onSubmit={handleSaveNotifications}>
          <div className="form-group checkbox-group">
            <label htmlFor="emailNotifications">
              <input
                type="checkbox"
                id="emailNotifications"
                name="emailNotifications"
                checked={notifications.emailNotifications}
                onChange={handleNotificationsChange}
              />
              Email Notifications
            </label>
          </div>
          <div className="form-group checkbox-group">
            <label htmlFor="smsNotifications">
              <input
                type="checkbox"
                id="smsNotifications"
                name="smsNotifications"
                checked={notifications.smsNotifications}
                onChange={handleNotificationsChange}
              />
              SMS Notifications
            </label>
          </div>
          <div className="form-group">
            <button type="submit" className="btn btn-primary">
              Save Notification Preferences
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};

export default SettingsPage;