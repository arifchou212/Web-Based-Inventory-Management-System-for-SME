import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";
import { collection, onSnapshot } from "firebase/firestore";

import {
  getInventory,
  addInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  uploadCSV,
} from "../api";

import { FaPlus, FaSearch, FaTrash, FaEye, FaEdit } from "react-icons/fa";
import "../styles/InventoryPage.css";

function InventoryPage() {
  const { user, loading } = useAuth();
  const [inventory, setInventory] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("");

  // Form state for add/edit
  const [form, setForm] = useState({
    id: null,
    name: "",
    description: "",
    category: "",
    quantity: 0,
    price: 0,
    supplier: "",
    expiryDate: "",
  });
  const [isEditing, setIsEditing] = useState(false);

  // Popups & toggles
  const [showCsvUpload, setShowCsvUpload] = useState(false);
  const [showFormPopup, setShowFormPopup] = useState(false);
  const [showDeleteCheckboxes, setShowDeleteCheckboxes] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);

  // CSV file & error
  const [csvFile, setCsvFile] = useState(null);
  const [csvError, setCsvError] = useState("");

  // Detail popup
  const [showDetail, setShowDetail] = useState(false);
  const [detailItem, setDetailItem] = useState(null);

  // Derive the companyName from user doc (using the correct property name)
  let companyName = null;
  if (user && user.company) {
    companyName = user.company;
  }

  useEffect(() => {
    if (!companyName) return; // If no companyName, skip
  
    const inventoryCollectionRef = collection(db, "companies", companyName, "inventory");
    const unsubscribe = onSnapshot(inventoryCollectionRef, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setInventory(data);
    });
  
    return () => unsubscribe();
  }, [companyName]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <div>Please log in to access Inventory Management.</div>;
  }

  if (!companyName) {
    return <div>No company found for this user. Contact an admin.</div>;
  }

  // Filtered inventory
  const filteredInventory = inventory.filter((item) => {
    const itemName = item.name || "";
    const matchSearch = itemName.toLowerCase().includes(searchTerm.toLowerCase());
    const itemCategory = item.category || "";
    const matchCategory = filterCategory
      ? itemCategory.toLowerCase() === filterCategory.toLowerCase()
      : true;
    return matchSearch && matchCategory;
  });
  

  // ---------- UI Handlers ----------

  // Open "Add Inventory" form
  const openAddForm = () => {
    resetForm();
    setIsEditing(false);
    setShowFormPopup(true);
  };

  // Edit item
  const handleEdit = (item) => {
    setIsEditing(true);
    setForm(item);
    setShowFormPopup(true);
  };

  // Detail popup
  const handleViewDetail = (item) => {
    setDetailItem(item);
    setShowDetail(true);
  };

  // Submit form (add/edit)
  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      companyName,
      name: form.name,
      description: form.description,
      category: form.category,
      quantity: parseInt(form.quantity, 10),
      price: parseFloat(form.price),
      supplier: form.supplier,
      expiryDate: form.expiryDate,
    };
    try {
      if (isEditing && form.id) {
        await updateInventoryItem(form.id, payload);
      } else {
        await addInventoryItem(payload);
      }
      resetForm();
      setShowFormPopup(false);
    } catch (error) {
      console.error("Error saving item:", error);
    }
  };

  // Reset form
  const resetForm = () => {
    setForm({
      id: null,
      name: "",
      description: "",
      category: "",
      quantity: 0,
      price: 0,
      supplier: "",
      expiryDate: "",
    });
    setIsEditing(false);
  };

  // Delete single item
  const handleDelete = async (id) => {
    try {
      await deleteInventoryItem(id);
    } catch (error) {
      console.error("Error deleting item:", error);
    }
  };

  // Bulk delete toggles
  const handleCheckboxChange = (id) => {
    if (selectedItems.includes(id)) {
      setSelectedItems(selectedItems.filter((itemId) => itemId !== id));
    } else {
      setSelectedItems([...selectedItems, id]);
    }
  };

  const handleDeleteSelected = async () => {
    try {
      await Promise.all(selectedItems.map((id) => deleteInventoryItem(id)));
      setSelectedItems([]);
      setShowDeleteCheckboxes(false);
    } catch (error) {
      console.error("Error deleting selected items:", error);
    }
  };

  // CSV Upload
  const handleCsvUpload = async () => {
    if (!csvFile) {
      setCsvError("Please select a CSV file.");
      return;
    }
    try {
      await uploadCSV(csvFile, companyName);
      setCsvFile(null);
      setCsvError("");
      alert("CSV uploaded successfully!");
      setShowCsvUpload(false);
    } catch (error) {
      console.error("Error uploading CSV:", error);
      setCsvError("Invalid CSV format. Please check the file.");
    }
  };


  return (
    <div className="inventory-page">
      {/* Header & Search */}
      <div className="inventory-header">
        <h1>Inventory Management</h1>
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search by item name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <FaSearch className="search-icon" />
        </div>
      </div>

      {/* Category Filter */}
      <div className="inventory-filters">
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
        >
          <option value="">All Categories</option>
          <option value="Electronics">Electronics</option>
          <option value="Clothing">Clothing</option>
          <option value="Groceries">Groceries</option>
          <option value="Furniture">Furniture</option>
        </select>
      </div>

      <div className="inventory-table">
        <div className="table-controls">
          <button className="btn-add" onClick={openAddForm}>
            <FaPlus />
          </button>
          <button
            className="btn-delete"
            onClick={() => setShowDeleteCheckboxes(!showDeleteCheckboxes)}
          >
            <FaTrash />
          </button>
          {showDeleteCheckboxes && selectedItems.length > 0 && (
            <button
              className="btn-delete-selected"
              onClick={handleDeleteSelected}
            >
              Delete Selected
            </button>
          )}
          <button
            className="btn-csv"
            onClick={() => setShowCsvUpload(true)}
          >
            Bulk Upload (CSV)
          </button>
        </div>

        <table>
          <thead>
            <tr>
              {showDeleteCheckboxes && <th></th>}
              <th>Item Name</th>
              <th>Category</th>
              <th>Quantity</th>
              <th>Price</th>
              <th>Supplier</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredInventory.map((item) => (
              <tr key={item.id}>
                {showDeleteCheckboxes && (
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(item.id)}
                      onChange={() => handleCheckboxChange(item.id)}
                    />
                  </td>
                )}
                <td>{item.name}</td>
                <td>{item.category}</td>
                <td>{item.quantity}</td>
                <td>${item.price}</td>
                <td>{item.supplier}</td>
                <td>
                  <button
                    onClick={() => handleViewDetail(item)}
                    className="btn-view"
                  >
                    <FaEye />
                  </button>
                  <button
                    onClick={() => handleEdit(item)}
                    className="btn-edit"
                  >
                    <FaEdit />
                  </button>
                  {!showDeleteCheckboxes && (
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="btn-remove"
                    >
                      <FaTrash />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* === Add/Edit Form Popup === */}
      {showFormPopup && (
        <div className="popup-overlay">
          <div className="inventory-form-popup">
            <button
              className="btn-close"
              onClick={() => setShowFormPopup(false)}
            >
              &times;
            </button>
            <h2>{isEditing ? "Edit Inventory Item" : "Add New Inventory Item"}</h2>
            <form onSubmit={handleSubmit}>
              <label>
                Item Name:
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </label>
              <label>
                Description:
                <textarea
                  name="description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </label>
              <label>
                Category:
                <select
                  name="category"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  required
                >
                  <option value="">Select Category</option>
                  <option value="Electronics">Electronics</option>
                  <option value="Clothing">Clothing</option>
                  <option value="Groceries">Groceries</option>
                  <option value="Furniture">Furniture</option>
                </select>
              </label>
              <label>
                Quantity:
                <input
                  type="number"
                  name="quantity"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  required
                />
              </label>
              <label>
                Price:
                <input
                  type="number"
                  step="0.01"
                  name="price"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  required
                />
              </label>
              <label>
                Supplier:
                <input
                  type="text"
                  name="supplier"
                  value={form.supplier}
                  onChange={(e) => setForm({ ...form, supplier: e.target.value })}
                  required
                />
              </label>
              <label>
                Expiry Date:
                <input
                  type="date"
                  name="expiryDate"
                  value={form.expiryDate}
                  onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                />
              </label>

              <div className="form-buttons">
                <button type="submit" className="btn-primary">
                  {isEditing ? "Update Item" : "Add Item"}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowFormPopup(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* === CSV Upload Popup === */}
      {showCsvUpload && (
        <div className="popup-overlay">
          <div className="csv-upload-popup">
            <button
              className="btn-close"
              onClick={() => setShowCsvUpload(false)}
            >
              &times;
            </button>
            <h2>Bulk Upload (CSV)</h2>
            <input
              type="file"
              accept=".csv, .xlsx"
              onChange={(e) => setCsvFile(e.target.files[0])}
            />
            {csvError && <p className="error-message">{csvError}</p>}

            <button onClick={handleCsvUpload} className="btn-primary">
              Upload CSV
            </button>
          </div>
        </div>
      )}

      {/* === Detail Popup === */}
      {showDetail && detailItem && (
        <div className="popup-overlay">
          <div className="detail-popup">
            <button className="btn-close" onClick={() => setShowDetail(false)}>
              &times;
            </button>
            <h2>{detailItem.name}</h2>
            <p><strong>Category:</strong> {detailItem.category}</p>
            <p><strong>Description:</strong> {detailItem.description}</p>
            <p><strong>Quantity:</strong> {detailItem.quantity}</p>
            <p><strong>Price:</strong> ${detailItem.price}</p>
            <p><strong>Supplier:</strong> {detailItem.supplier}</p>
            {detailItem.expiryDate && (
              <p><strong>Expiry Date:</strong> {detailItem.expiryDate}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default InventoryPage;
