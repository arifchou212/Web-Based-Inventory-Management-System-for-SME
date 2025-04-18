import React, { useState, useEffect } from "react";
import { getAnalyticsSummary } from "../api";
import { Line, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  BarElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import Sidebar from "../components/Sidebar";
import "../styles/Dashboard.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  LineElement,
  BarElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

/* Utility function to safely format numeric values */
function formatNumber(value) {
  if (value === null || value === undefined) return "N/A";
  const num = parseFloat(value);
  if (isNaN(num)) return String(value);
  return num % 1 === 0 ? String(num) : num.toFixed(2);
}

const AdminDashboard = ({ userRole }) => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);

  // "Show More" toggles
  const [showAllNotifications, setShowAllNotifications] = useState(false);
  const [showAllLowStock, setShowAllLowStock] = useState(false);

  // Grab company name from localStorage
  const companyName = localStorage.getItem("company")?.toLowerCase() || "";

  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Single unified endpoint => /api/analytics-summary
      const analyticsData = await getAnalyticsSummary(companyName);
      setAnalytics(analyticsData);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    }
    setLoading(false);
  };

  if (loading) return <p>Loading dashboard data...</p>;
  if (!analytics) return <p className="loading">No dashboard data available. Please check back later.</p>;

  // Destructure fields from analytics
  const {
    totalSales = 0,
    revenueThisMonth = 0,
    pendingOrders = 0,
    topSelling = [],
    
    totalItems = 0,
    totalValue = 0,
    categoryCount = 0,
    categories = [],         // for pie chart
    outOfStockCount = 0,
    avgPrice = 0,

    // For line chart
    stockTrends = [],

    // Notifications (aka tasks)
    notifications = [],

    // Low stock
    lowStock = []
  } = analytics;

  // Prepare line chart data from stockTrends
  const lineChartData = {
    labels: stockTrends.map((item) => item.date),
    datasets: [
      {
        label: "Stock Levels",
        data: stockTrends.map((item) => item.stock),
        borderColor: "#4c9aff",
        backgroundColor: "rgba(76,154,255,0.2)",
        tension: 0.3,
      },
      {
        label: "Sold",
        data: stockTrends.map((item) => item.sold),
        borderColor: "#82ca9d",
        backgroundColor: "rgba(130,202,157,0.2)",
        tension: 0.3,
      },
    ],
  };

  // Prepare pie chart data from categories
  const pieChartData = {
    labels: categories.map((cat) => cat.name),
    datasets: [
      {
        data: categories.map((cat) => cat.count),
        backgroundColor: ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF"],
      },
    ],
  };

  // Sort notifications by createdAt desc
  const sortedNotifications = [...notifications].sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt) : 0;
    const dateB = b.createdAt ? new Date(b.createdAt) : 0;
    return dateB - dateA;
  });
  const displayedNotifications = showAllNotifications
    ? sortedNotifications
    : sortedNotifications.slice(0, 3);

  // Show only first 3 or all for low stock
  const displayedLowStock = showAllLowStock ? lowStock : lowStock.slice(0, 3);

  return (
    <div className="admin-dashboard">
      <Sidebar userRole={userRole} />
      <div className="dashboard-content">
        <header className="dashboard-header">
          <h1>Welcome to the Dashboard</h1>
        </header>

        {/* KPI Container */}
        <div className="kpi-container">
          <div className="kpi-box">
            <h4>Total Sales</h4>
            <p>{formatNumber(totalSales)}</p>
          </div>
          <div className="kpi-box">
            <h4>Revenue This Month</h4>
            <p>${formatNumber(revenueThisMonth)}</p>
          </div>
          <div className="kpi-box">
            <h4>Pending Orders</h4>
            <p>{formatNumber(pendingOrders)}</p>
          </div>
          <div className="kpi-box">
            <h4>Top-Selling Product</h4>
            <p>{topSelling?.[0]?.name || "N/A"}</p>
          </div>
        </div>

        {/* Two Column Row */}
        <div className="dashboard-two-col">
          {/* LEFT Column => Inventory Summary & Stock Trends */}
          <div className="dashboard-left">
            {/* Inventory Summary */}
            <div className="dashboard-section inventory-summary">
              <h2>Inventory Summary</h2>
              <div className="summary-cards">
                <div className="summary-card">
                  <h3>Total Items</h3>
                  <p>{formatNumber(totalItems)}</p>
                </div>
                <div className="summary-card">
                  <h3>Total Value</h3>
                  <p>${formatNumber(totalValue)}</p>
                </div>
                <div className="summary-card">
                  <h3>Categories</h3>
                  <p>{formatNumber(categoryCount)}</p>
                </div>
                <div className="summary-card">
                  <h3>Out of Stock</h3>
                  <p>{formatNumber(outOfStockCount)}</p>
                </div>
                <div className="summary-card">
                  <h3>Avg Price</h3>
                  <p>${formatNumber(avgPrice)}</p>
                </div>
              </div>
            </div>

            {/* Stock Trends (Line Chart) */}
            <div className="dashboard-section chart-section">
              <h2>Stock Trends</h2>
              <div className="chart-container">
                <Line
                  data={lineChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { position: "top" },
                      title: { display: true, text: "Stock Levels Over Time" },
                    },
                    scales: {
                      y: { beginAtZero: true },
                    },
                  }}
                />
              </div>
            </div>
          </div>

          {/* RIGHT Column => Notifications & Low Stock Alerts */}
          <div className="dashboard-right">
            <div className="dashboard-section notifications-section">
              <h2>Notifications / Tasks</h2>
              {sortedNotifications.length === 0 ? (
                <p>No notifications at the moment.</p>
              ) : (
                <>
                  <ul>
                    {displayedNotifications.map((note, idx) => (
                      <li key={note.id || idx}>
                        <strong>{note.title}</strong> - {note.urgency}
                        <br />
                        {note.description}
                      </li>
                    ))}
                  </ul>
                  {sortedNotifications.length > 3 && (
                    <div className="show-more-btn-container">
                      <button
                        className="show-more-btn"
                        onClick={() =>
                          setShowAllNotifications(!showAllNotifications)
                        }
                      >
                        {showAllNotifications ? "Show Less" : "Show More"}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="dashboard-section low-stock-list">
              <div className="low-stock-section">
              <h2>Low Stock Alerts</h2>
              {lowStock.length === 0 ? (
                <p>No low-stock items at the moment.</p>
              ) : (
                <>
                  <ul>
                    {displayedLowStock.map((item, idx) => (
                      <li key={item.id || idx}>
                        {item.name} - Stock: {formatNumber(item.quantity)}
                      </li>
                    ))}
                  </ul>
                  {lowStock.length > 3 && (
                    <div className="show-more-btn-container">
                      <button
                        className="show-more-btn"
                        onClick={() => setShowAllLowStock(!showAllLowStock)}
                      >
                        {showAllLowStock ? "Show Less" : "Show More"}
                      </button>
                    </div>
                  )}
                </>
              )}
              </div>
            </div>
          </div>
        </div>

        {/* Category Distribution (Pie Chart) */}
        <div className="dashboard-section chart-section">
          <h2>Category Distribution</h2>
          <div className="chart-container">
            <Pie
              data={pieChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: "top" },
                  title: { display: true, text: "Inventory by Category" },
                },
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;