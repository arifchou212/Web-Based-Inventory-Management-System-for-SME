import React from 'react';
import { Bar, Pie } from 'react-chartjs-2';
import { Chart, CategoryScale, ArcElement, BarElement, LineElement, PointElement, LinearScale, Title, Tooltip, Legend } from 'chart.js';
import Sidebar from '../components/Sidebar'; 
import '../styles/Dashboard.css';

// Register Chart.js components
Chart.register(CategoryScale, ArcElement, BarElement, LineElement, PointElement, LinearScale, Title, Tooltip, Legend);

const Dashboard = ({ userRole }) => {  
  // Mock data for the bar chart (Stock Trends)
  const stockData = {
    labels: ['Item A', 'Item B', 'Item C', 'Item D', 'Item E'],
    datasets: [
      {
        label: 'Stock Levels',
        data: [20, 15, 10, 25, 5],
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
      },
    ],
  };

  // Mock data for the pie chart (Category Distribution)
  const categoryData = {
    labels: ['Electronics', 'Clothing', 'Home Goods', 'Accessories'],
    datasets: [
      {
        data: [40, 30, 20, 10],
        backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0'],
      },
    ],
  };

  // Mock data for recent activity
  const recentActivity = [
    'Item A was updated (Stock: 20 → 15)',
    'Item B was added (Stock: 10)',
    'Item C was deleted',
  ];

  return (
    <div className="dashboard-container">
      <Sidebar userRole={userRole} /> {/* Pass userRole to Sidebar */}
      {/* Main Content */}
            <div className="dashboard-content">
              <h1>Inventory Overview</h1>
      
              {/* Low-Stock Alerts */}
              <div className="dashboard-section">
                <h2>Low-Stock Alerts</h2>
                <ul>
                  <li>Item C - Stock: 10</li>
                  <li>Item E - Stock: 5</li>
                </ul>
              </div>
      
              {/* Inventory Summary */}
              <div className="dashboard-section">
                <h2>Inventory Summary</h2>
                <div className="summary-cards">
                  <div className="summary-card">
                    <h3>Total Items</h3>
                    <p>150</p>
                  </div>
                  <div className="summary-card">
                    <h3>Total Value</h3>
                    <p>$10,000</p>
                  </div>
                  <div className="summary-card">
                    <h3>Categories</h3>
                    <p>5</p>
                  </div>
                </div>
              </div>
      
              {/* Stock Trends (Bar Chart) */}
              <div className="dashboard-section">
                <h2>Stock Trends</h2>
                <div className="chart-container">
                  <Bar
                    data={stockData}
                    options={{
                      responsive: true,
                      plugins: {
                        legend: {
                          position: 'top',
                        },
                        title: {
                          display: true,
                          text: 'Stock Levels',
                        },
                      },
                    }}
                  />
                </div>
              </div>
      
              {/* Category Distribution (Pie Chart) */}
              <div className="dashboard-section">
                <h2>Category Distribution</h2>
                <div className="chart-container">
                  <Pie
                    data={categoryData}
                    options={{
                      responsive: true,
                      plugins: {
                        legend: {
                          position: 'top',
                        },
                        title: {
                          display: true,
                          text: 'Inventory by Category',
                        },
                      },
                    }}
                  />
                </div>
              </div>
      
              {/* Recent Activity */}
              <div className="dashboard-section">
                <h2>Recent Activity</h2>
                <ul>
                  {recentActivity.map((activity, index) => (
                    <li key={index}>{activity}</li>
                  ))}
                </ul>
              </div>
            </div>
    </div>
  );
};

export default Dashboard;
