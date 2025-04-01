import React, { useState, useEffect } from "react";
import axios from "axios";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid 
} from "recharts";
import { saveAs } from "file-saver";
import Papa from "papaparse";
import jsPDF from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";
import "../styles/ReportsAnalytics.css"; // Your custom styling

const ReportsAnalytics = () => {
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [reportType, setReportType] = useState("low_stock");
  const [reports, setReports] = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [loading, setLoading] = useState(false);

  // Fetch data on mount and every 30 seconds for near real-time updates
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [startDate, endDate, reportType]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const repRes = await axios.get("http://127.0.0.1:5000/reports", {
        params: {
          start: startDate.toISOString().split("T")[0],
          end: endDate.toISOString().split("T")[0],
          type: reportType,
        },
      });
      setReports(repRes.data);
    } catch (err) {
      console.error("Error fetching reports:", err);
    }

    try {
      const anRes = await axios.get("http://127.0.0.1:5000/analytics", {
        params: {
          start: startDate.toISOString().split("T")[0],
          end: endDate.toISOString().split("T")[0],
        },
      });
      setAnalytics(anRes.data);
    } catch (err) {
      console.error("Error fetching analytics:", err);
    }
    setLoading(false);
  };

  // Export CSV using Papa Parse
  const exportCSV = () => {
    const csv = Papa.unparse(reports);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, `inventory_report_${new Date().toISOString()}.csv`);
  };

  // Export Excel using XLSX
  const exportExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(reports);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const data = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(data, `inventory_report_${new Date().toISOString()}.xlsx`);
  };

  // Export PDF using jsPDF with autoTable
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Inventory Report", 14, 22);
    doc.setFontSize(12);
    doc.autoTable({
      startY: 30,
      head: [["Item Name", "Stock", "Sold", "Last Updated"]],
      body: reports.map(({ name, stock, sold, last_updated }) => [name, stock, sold, last_updated]),
    });
    doc.save(`inventory_report_${new Date().toISOString()}.pdf`);
  };

  return (
    <div className="reports-analytics-container">
      <div className="content-wrapper">
        <header className="header">
          <h2>Reports & Analytics</h2>
        </header>

        {/* Filters Section */}
        <div className="filters-section card">
          <div className="filter-item">
            <label>Start Date</label>
            <DatePicker 
              selected={startDate} 
              onChange={(date) => setStartDate(date)} 
              dateFormat="yyyy-MM-dd" 
            />
          </div>
          <div className="filter-item">
            <label>End Date</label>
            <DatePicker 
              selected={endDate} 
              onChange={(date) => setEndDate(date)} 
              dateFormat="yyyy-MM-dd" 
            />
          </div>
          <div className="filter-item">
            <label>Report Type</label>
            <select value={reportType} onChange={(e) => setReportType(e.target.value)}>
              <option value="low_stock">Low Stock</option>
              <option value="sales_trends">Sales Trends</option>
            </select>
          </div>
        </div>

        {/* Export Buttons Section */}
        <div className="export-section card">
          <button className="export-btn" onClick={exportCSV}>Export CSV</button>
          <button className="export-btn" onClick={exportExcel}>Export Excel</button>
          <button className="export-btn" onClick={exportPDF}>Export PDF</button>
        </div>

        {/* Reports Table Section */}
        <div className="reports-section card">
          <h3>Reports</h3>
          {loading ? (
            <p className="loading">Loading reports...</p>
          ) : (
            <table className="reports-table">
              <thead>
                <tr>
                  <th>Item Name</th>
                  <th>Stock</th>
                  <th>Sold</th>
                  <th>Last Updated</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((item, idx) => (
                  <tr key={idx}>
                    <td>{item.name}</td>
                    <td>{item.stock}</td>
                    <td>{item.sold}</td>
                    <td>{item.last_updated}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Analytics Section */}
        <div className="analytics-section card">
          <h3>Analytics</h3>
          <div className="charts-grid">
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={reports}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="stock" stroke="#4c9aff" name="Stock" />
                  <Line type="monotone" dataKey="sold" stroke="#82ca9d" name="Sold" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="chart-container">
              <h4>Top Selling Products</h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.top_selling || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="sold" fill="#ff6b6b" name="Sold" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsAnalytics;