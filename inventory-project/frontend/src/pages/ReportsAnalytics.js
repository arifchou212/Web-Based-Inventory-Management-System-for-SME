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
  const [startDate, setStartDate] = useState(
    () => new Date(Date.now() - 7*24*60*60*1000)
  );
  const [endDate, setEndDate] = useState(() => new Date());

  useEffect(() => {
     handleGenerateReport();
  }, []);

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

  // useEffect(() => {
  //   if (autoRefresh) {
  //     const interval = setInterval(handleGenerateReport, 30000); 
  //     return () => clearInterval(interval);
  //   }
  // }, [autoRefresh]);

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
    const doc = new jsPDF({ unit: "pt", format: "letter" });
    const title     = "Inventory Analysis Report";
    const company   = localStorage.getItem("company") || "Your Company";
    const rangeText = `${startDate.toLocaleDateString()} – ${endDate.toLocaleDateString()}`;
    const nowText   = new Date().toLocaleString();
  
    // ─── Cover Page ─────────────────────────────────────────────────────────────
    doc.setFontSize(28);
    doc.text(title, 40, 80);
    doc.setFontSize(16);
    doc.text(`Company: ${company}`, 40, 120);
    doc.text(`Date Range: ${rangeText}`, 40, 145);
    doc.text(`Generated: ${nowText}`, 40, 170);
    addFooter(doc, 1);
    doc.addPage();
  
    // ─── Data Table ──────────────────────────────────────────────────────────────
    const headers = [
      ["Item", "Qty", "Sold", "Added At", "Added By", "Updated At", "Updated By", "Δ Price"],
    ];
    const body = reports.map((it) => {
      const a = it.added_at   ? new Date(it.added_at).toLocaleString()   : "N/A";
      const u = it.updated_at ? new Date(it.updated_at).toLocaleString() : "N/A";
      const pd = Number(it.price_diff || 0).toFixed(2);
      const ch = it.price_change === "increase" ? `+${pd}`
               : it.price_change === "decrease" ? `-${pd}` 
               : "0.00";
      return [
        it.name, it.quantity, it.sold, a, it.added_by||"N/A",
        u,       it.updated_by||"N/A", ch
      ];
    });
  
    doc.autoTable({
      startY: 40,
      head: headers,
      body,
      theme: "grid",
      headStyles: { fillColor: [50, 50, 120], textColor: 255 },
      styles: { fontSize: 10 },
      didParseCell: (cell) => {
        // highlight low-stock rows
        if (cell.section === "body" && cell.column.index === 1 && cell.cell.raw <= 5) {
          cell.cell.styles.fillColor = [255, 220, 220];
        }
      }
    });
  
    addFooter(doc, 2);
    doc.addPage();
  
    // ─── Charts Pages ───────────────────────────────────────────────────────────
    if (lineChartRef.current) {
      const img1 = lineChartRef.current.canvas.toDataURL("image/png", 1.0);
      doc.addImage(img1, "PNG", 40, 40, 520, 260);
      addFooter(doc, 3);
      doc.addPage();
    }
    if (barChartRef.current) {
      const img2 = barChartRef.current.canvas.toDataURL("image/png", 1.0);
      doc.addImage(img2, "PNG", 40, 40, 520, 260);
      addFooter(doc, 4);
      doc.addPage();
    }
  
    // ─── Recommendations & Next Steps ──────────────────────────────────────────
    const recs = buildRecommendations(analytics, 5); // threshold = 5
    doc.setFontSize(16);
    doc.text("Recommendations & Next Steps", 40, 60);
    doc.setFontSize(12);
    let y = 90;
    recs.forEach((r) => {
      doc.text(`• ${r}`, 60, y);
      y += 18;
      if (y > 720) {
        // overflow to new page
        addFooter(doc);
        doc.addPage();
        doc.setFontSize(12);
        y = 60;
      }
    });
    addFooter(doc);
    
    doc.save(`inventory_report_${new Date().toISOString()}.pdf`);
  };


  function buildRecommendations(analytics, reorderThreshold=5) {
    const recs = [];
    const low = (analytics.lowStock || [])
      .filter(i => i.quantity <= reorderThreshold)
      .map(i => i.name);
    if (low.length) {
      recs.push(`Reorder soon: ${low.join(", ")}`);
    }
    if ((analytics.total_sold||0) === 0) {
      recs.push("No sales recorded—consider a promotion or review sales channels.");
    }
    if (analytics.top_selling && analytics.top_selling.length) {
      recs.push(`Top seller: ${analytics.top_selling[0].name}—consider bundling/upselling.`);
    }
    if (!recs.length) {
      recs.push("No specific recommendations at this time.");
    }
    return recs;
  }
  
  /** Draw “Page X of Y” in the footer */
  function addFooter(doc, pageNum=null) {
    const total = doc.getNumberOfPages();
    const p = pageNum || doc.getCurrentPageInfo().pageNumber;
    doc.setFontSize(10);
    doc.text(
      `Page ${p} of ${total}`,
      doc.internal.pageSize.width - 80,
      doc.internal.pageSize.height - 30
    );
  }

  /* -----------------------------
   * Chart Data
   * ----------------------------- */
  const sortedReports = [...reports].sort((a, b) => {
    return new Date(a.added_at || 0) - new Date(b.added_at || 0);
  });

  const lineChartData = {
    labels: reports.map(r =>
      r.added_at ? new Date(r.added_at).toLocaleDateString() : ""
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
                    ? new Date(item.added_at).toLocaleString()
                    : "N/A";
                  const updatedAt = item.updated_at
                    ? new Date(item.added_at).toLocaleString()
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