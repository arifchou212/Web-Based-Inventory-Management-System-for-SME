import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { getTasks, createTask, getLowStock, getAnalyticsSummary } from "../api";
import "../styles/TasksNotificationsPage.css";

function TasksNotificationsPage() {
  const { user } = useAuth();
  const adminUid = localStorage.getItem("uid");
  const companyName = localStorage.getItem("company");
  const userRole = user?.role || localStorage.getItem("role");

  // State
  const [tasks, setTasks] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);

  // For creating a new task
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [urgency, setUrgency] = useState("low");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const companyName = localStorage.getItem("company")?.toLowerCase() || "";
      const analytics = await getAnalyticsSummary(companyName);

      // tasks => analytics.notifications
      setTasks(analytics.notifications || []);

      // low stock => analytics.lowStock
      setLowStockItems(analytics.lowStock || []);
    } catch (error) {
      console.error("Failed to fetch tasks/low stock:", error);
      alert(error.message);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      alert("Title is required");
      return;
    }
    const payload = { title, description, urgency };
    try {
      await createTask(adminUid, companyName, payload);
      alert("Task/Notification created successfully!");
      setTitle("");
      setDescription("");
      setUrgency("low");
      fetchData(); // refresh
    } catch (error) {
      console.error("Failed to create task:", error);
      alert(error.message);
    }
  };

  // color-coded background based on urgency
  const getUrgencyStyle = (urg) => {
    switch (urg) {
      case "high":
        return { backgroundColor: "#ffdddd" }; // red-ish
      case "medium":
        return { backgroundColor: "#fff5cc" }; // yellow-ish
      default:
        return { backgroundColor: "#ddffdd" }; // green-ish
    }
  };

  return (
    <div className="tasks-notifications-page">
      <h1 className="page-title">Tasks & Notifications</h1>

      <div className="top-section">
        {/* LEFT: Tasks Section */}
        <section className="tasks-section">
          <h2 className="section-heading">All Tasks</h2>
          {tasks.length === 0 ? (
            <p>No tasks or notifications available.</p>
          ) : (
            <ul className="task-list">
              {tasks.map((task) => (
                <li
                  key={task.id}
                  className="task-item"
                  style={getUrgencyStyle(task.urgency)}
                >
                  <strong>
                    {task.title} ({task.urgency})
                  </strong>
                  <p>{task.description}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* RIGHT: Low Stock Section */}
        <section className="low-stock-section">
          <h2 className="section-heading">Low Stock Items</h2>
          {lowStockItems.length === 0 ? (
            <p>No low-stock items found.</p>
          ) : (
            <ul className="low-stock-list">
              {lowStockItems.map((item) => (
                <li key={item.id}>
                  <strong>{item.name}</strong> - Stock: {item.quantity}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* BOTTOM: Create Task if user is admin/manager */}
      {(userRole === "admin" || userRole === "manager") && (
        <section className="create-task-section">
          <h2 className="section-heading">Create a New Task / Notification</h2>
          <form onSubmit={handleCreateTask} className="create-task-form">
            <div className="form-group">
              <label>Title:</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Description:</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Urgency:</label>
              <select
                value={urgency}
                onChange={(e) => setUrgency(e.target.value)}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <button type="submit" className="btn-submit">
              Add Task
            </button>
          </form>
        </section>
      )}
    </div>
  );
}

export default TasksNotificationsPage;