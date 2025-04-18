import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { saveAs } from "file-saver";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import "../styles/ReportsAnalytics.css";

import { Line, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  BarElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import jsPDF from '../../node_modules/jspdf/dist/jspdf.umd.min.js'
import { applyPlugin } from 'jspdf-autotable'
applyPlugin(jsPDF)


ChartJS.register(
  CategoryScale,
  LinearScale,
  LineElement,
  BarElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

const ReportsAnalytics = () => {
  // State Hooks
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [reportType, setReportType] = useState("inventory_actions");
  const [reports, setReports] = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lowStockItems, setLowStockItems] = useState([]);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  // For quick date-range presets
  const [dateRangePreset, setDateRangePreset] = useState("custom");

  // Company/user info
  const companyName = localStorage.getItem("company") || "NoCompany";

  // Chart refs for PNG download
  const lineChartRef = useRef(null);
  const barChartRef = useRef(null);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(handleGenerateReport, 30000); // e.g. 30s
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const handleDateRangePresetChange = (preset) => {
    setDateRangePreset(preset);
    const now = new Date();
    let newStart = new Date();
    let newEnd = new Date();

    switch (preset) {
      case "last7":
        newStart.setDate(now.getDate() - 7);
        break;
      case "last30":
        newStart.setDate(now.getDate() - 30);
        break;
      case "thisMonth":
        newStart = new Date(now.getFullYear(), now.getMonth(), 1);
        newEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case "allTime":
        newStart = new Date("2020-01-01");
        break;
      default:
        return;
    }
    setStartDate(newStart);
    setEndDate(newEnd);
  };

  // Generate Report
  const handleGenerateReport = async () => {
    setLoading(true);
    setError("");

    try {
      // Fetch reports
      const repRes = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/reports`, {
        params: {
          start: startDate.toISOString().split("T")[0],
          end: endDate.toISOString().split("T")[0],
          type: reportType,
          companyName,
        },
      });
      setReports(repRes.data);

      // Fetch analytics
      const anRes = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/analytics`, {
        params: {
          start: startDate.toISOString().split("T")[0],
          end: endDate.toISOString().split("T")[0],
          companyName,
        },
      });
      setAnalytics(anRes.data);

      // Low stock items
      if (anRes.data.low_stock) {
        setLowStockItems(anRes.data.low_stock);
      }

      setLastUpdated(new Date()); // Track the time we last fetched
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("An error occurred while loading data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /* -----------------------------
   * Export Handlers
   * ----------------------------- */
  const exportCSV = () => {
    const csv = Papa.unparse(reports);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, `inventory_report_${new Date().toISOString()}.csv`);
  };

  const exportExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(reports);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const data = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(data, `inventory_report_${new Date().toISOString()}.xlsx`);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    // Title section
    doc.setFontSize(22);
    doc.setTextColor(33, 37, 41);
    doc.text("Inventory Analysis Report", 14, 25);
    doc.setFontSize(16);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 35);
    doc.setFontSize(12);
    doc.text(
      "This report provides detailed insights into inventory actions, sales trends, and stock levels. It includes a data table along with graphical analysis for informed decision-making.",
      14,
      45,
      { maxWidth: 180 }
    );
    // Draw a separator line
    doc.setLineWidth(0.5);
    doc.line(14, 50, 196, 50);

    // Prepare table headers and data
    const tableHeaders = [
      [
        "Item Name",
        "Quantity",
        "Sold",
        "Added At",
        "Added By",
        "Updated At",
        "Updated By",
        "Price Change",
      ],
    ];

    const tableData = reports.map((item) => {
      const addedAt =
        item.added_at && item.added_at.seconds
          ? new Date(item.added_at.seconds * 1000).toLocaleString()
          : "N/A";
      const updatedAt =
        item.updated_at && item.updated_at.seconds
          ? new Date(item.updated_at.seconds * 1000).toLocaleString()
          : "N/A";
          const priceDiff = Number(item.price_diff || 0).toFixed(2);
          const priceChange =
            item.price_change === "increase"
              ? `+${priceDiff}`
              : item.price_change === "decrease"
              ? `${priceDiff}`
              : "0.00";

      return [
        item.name,
        item.quantity,
        item.sold,
        addedAt,
        item.added_by || "N/A",
        updatedAt,
        item.updated_by || "N/A",
        priceChange,
      ];
    });

    // Use autoTable from jspdf-autotable
    doc.autoTable({
      startY: 55,
      head: tableHeaders,
      body: tableData,
      theme: "grid",
      headStyles: { fillColor: 16, textColor: 240 },
      styles: { font: "helvetica", fontSize: 10 },
    });

 // Get the end Y coordinate of the table.
  const tableEndY = doc.lastAutoTable.finalY || 55;

  // Embed the line chart snapshot
  if (lineChartRef.current && lineChartRef.current.canvas) {
    const lineImgData = lineChartRef.current.canvas.toDataURL("image/png", 1.0);
    // Insert a new page for charts if desired
    doc.addPage();
    doc.addImage(lineImgData, "PNG", 15, 25, 180, 80);
  }
  // Embed the bar chart snapshot
  if (barChartRef.current && barChartRef.current.canvas) {
    doc.addPage();
    const barImgData = barChartRef.current.canvas.toDataURL("image/png", 1.0);
    doc.addImage(barImgData, "PNG", 15, 25, 180, 80);
  }

  // ANALYSIS SECTION
  const analysisText = `
    Total Stock: ${analytics.total_stock || 0}
    Total Sold: ${analytics.total_sold || 0}
    Top Selling: ${
        analytics.top_selling && analytics.top_selling.length > 0
          ? analytics.top_selling[0].name
          : "N/A"
    }
    Recommendations: ${
        analytics.trend ? analytics.trend : "No trend analysis available."
    }
      `;
      doc.addPage();
      doc.setFontSize(14);
      doc.text("Analysis & Recommendations", 14, 25);
      doc.setFontSize(12);
      doc.text(analysisText, 14, 35);

      // Save the PDF.
      doc.save(`inventory_analysis_report_${new Date().toISOString()}.pdf`);
    };

  /* -----------------------------
   * Chart Data
   * ----------------------------- */
  const sortedReports = [...reports].sort((a, b) => {
    if (a.added_at && b.added_at) {
      return a.added_at.seconds - b.added_at.seconds;
    }
    return 0;
  });

  const lineChartData = {
    labels: sortedReports.map((item) =>
      item.added_at ? new Date(item.added_at.seconds * 1000).toLocaleDateString() : "N/A"
    ),
    datasets: [
      {
        label: "Quantity",
        data: sortedReports.map((item) => item.quantity),
        borderColor: "#4c9aff",
        backgroundColor: "rgba(76,154,255,0.2)",
        tension: 0.3,
      },
      {
        label: "Sold",
        data: sortedReports.map((item) => item.sold),
        borderColor: "#82ca9d",
        backgroundColor: "rgba(130,202,157,0.2)",
        tension: 0.3,
      },
    ],
  };

  const barChartData = {
    labels: analytics.top_selling ? analytics.top_selling.map((item) => item.name) : [],
    datasets: [
      {
        label: "Sold",
        data: analytics.top_selling ? analytics.top_selling.map((item) => item.sold) : [],
        backgroundColor: "#ff6b6b",
      },
    ],
  };

  // Bar Chart Options for drill-down example
  const barChartOptions = {
    responsive: true,
    plugins: { legend: { position: "top" } },
    scales: { y: { beginAtZero: true } },
    onClick: (evt, element) => {
      if (!element.length) return;
      const index = element[0].index;
      if (analytics.top_selling && analytics.top_selling[index]) {
        const product = analytics.top_selling[index].name;
        alert(`Drill-down for product: ${product}`);
      }
    },
  };

  // Chart Download as PNG
  const handleDownloadPNG = (chartRef, fileName) => {
    if (!chartRef.current) return;
    const chartInstance = chartRef.current;
    const base64Image = chartInstance.toBase64Image();
    const link = document.createElement("a");
    link.href = base64Image;
    link.download = `${fileName}.png`;
    link.click();
  };

 

  return (
    <div className="reports-analytics-container">
      <header className="header">
          <h2>Reports & Analytics</h2>
          <p className="header-description">
            View, analyze, and export inventory and sales reports.
          </p>
        </header>
      <div className="content-wrapper">
        {/* Simple Light Header */}
        
        <div className="refresh-container">
          <div className="auto-refresh-wrapper">
            <label className="auto-refresh-label">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={() => setAutoRefresh(!autoRefresh)}
              />
              Auto-Refresh
            </label>
          </div>
          <button onClick={handleGenerateReport} className="refresh-btn">
            Refresh
          </button>

          {lastUpdated && (
            <span className="last-updated">
              Last Updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>

        {/* Filter Section */}
        <div className="filters-section card">
          <h3 className="filter-heading">Filter Options</h3>
          <div className="filter-row">
            <div className="filter-item">
              <label>Preset</label>
              <select
                value={dateRangePreset}
                onChange={(e) => handleDateRangePresetChange(e.target.value)}
              >
                <option value="custom">Custom</option>
                <option value="last7">Last 7 Days</option>
                <option value="last30">Last 30 Days</option>
                <option value="thisMonth">This Month</option>
                <option value="allTime">All Time</option>
              </select>
            </div>

            {dateRangePreset === "custom" && (
              <>
                <div className="filter-item">
                  <label>Start Date</label>
                  <DatePicker selected={startDate} onChange={(d) => setStartDate(d)} />
                </div>
                <div className="filter-item">
                  <label>End Date</label>
                  <DatePicker selected={endDate} onChange={(d) => setEndDate(d)} />
                </div>
              </>
            )}

            <div className="filter-item">
              <label>Report Type</label>
              <select value={reportType} onChange={(e) => setReportType(e.target.value)}>
                <option value="inventory_actions">Inventory Actions</option>
                <option value="sales_trends">Sales Trends</option>
              </select>
            </div>
          </div>

          <div className="button-center">
            <button className="generate-report-btn" onClick={handleGenerateReport}>
              Generate Report
            </button>
          </div>
        </div>


        {/* Notifications & Error Alerts */}
        <div className="notifications-section">
          {error && <div className="alert alert-error">{error}</div>}
          {lowStockItems.length > 0 && (
            <div className="alert alert-warning">
              <strong>Low Stock Items:</strong>
              <ul>
                {lowStockItems.map((item, idx) => (
                  <li key={idx}>
                    {item.name} - {item.quantity} left
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Info / Tips */}
        <div className="section-info">
          <p>
            <strong>Tip:</strong> Select a date range and report type, then click{" "}
            <em>Generate Report</em>. Use the export options to download your data as
            CSV, Excel, or PDF.
          </p>
        </div>

        {/* Reports Table Section */}
        <div className="reports-section card">
          <h3>
            {reportType === "inventory_actions"
              ? "Inventory Action Reports"
              : "Sales Trend Reports"}
          </h3>
          <div className="section-info">
            {reportType === "inventory_actions"
              ? "This table lists all inventory actions with audit details."
              : "This table shows sales-related information for the selected period."}
          </div>

          {/* Export Buttons */}
          <div className="export-section">
            <button className="export-btn" onClick={exportCSV}>
              Export CSV
            </button>
            <button className="export-btn" onClick={exportExcel}>
              Export Excel
            </button>
            <button className="export-btn" onClick={exportPDF}>
              Export PDF
            </button>
          </div>

          {loading ? (
            <p className="loading">Loading reports...</p>
          ) : (
            <table className="reports-table">
              <thead>
                <tr>
                  <th>Item Name</th>
                  <th>Quantity</th>
                  <th>Sold</th>
                  <th>Added At</th>
                  <th>Added By</th>
                  <th>Updated At</th>
                  <th>Updated By</th>
                  <th>Price Change</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((item, idx) => {
                  const addedAt = item.added_at
                    ? new Date(item.added_at.seconds * 1000).toLocaleString()
                    : "N/A";
                  const updatedAt = item.updated_at
                    ? new Date(item.updated_at.seconds * 1000).toLocaleString()
                    : "N/A";

                  const priceClass =
                    item.price_change === "increase"
                      ? "price-increase"
                      : item.price_change === "decrease"
                      ? "price-decrease"
                      : "";

                      const priceDiff = Number(item.price_diff || 0).toFixed(2);
                      const priceChange =
                        item.price_change === "increase"
                          ? `+${priceDiff}`
                          : item.price_change === "decrease"
                          ? `${priceDiff}`
                          : "0.00";

                  return (
                    <tr key={idx}>
                      <td>{item.name}</td>
                      <td>{item.quantity}</td>
                      <td>{item.sold}</td>
                      <td>{addedAt}</td>
                      <td>{item.added_by || "N/A"}</td>
                      <td>{updatedAt}</td>
                      <td>{item.updated_by || "N/A"}</td>
                      <td className={priceClass}>{priceChange}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Charts Row */}
        <div className="charts-row">
          <div className="chart-card">
            <div className="chart-header">
              <h3>Stock Analysis (Line)</h3>
              <button
                className="export-png-btn"
                onClick={() => handleDownloadPNG(lineChartRef, "stock_analysis_line")}
              >
                Download PNG
              </button>
            </div>
            <div className="chart-wrapper">
              <Line
                ref={lineChartRef}
                data={lineChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { position: "top" },
                    tooltip: { mode: "index", intersect: false },
                  },
                  scales: { y: { beginAtZero: true } },
                }}
              />
            </div>
          </div>

          <div className="chart-card">
            <div className="chart-header">
              <h3>Top Selling Products (Bar)</h3>
              <button
                className="export-png-btn"
                onClick={() => handleDownloadPNG(barChartRef, "top_selling_bar")}
              >
                Download PNG
              </button>
            </div>
            <div className="chart-wrapper">
              <Bar ref={barChartRef} data={barChartData} options={barChartOptions} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsAnalytics;