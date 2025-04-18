# Web-Based Inventory Management System for Small Business 


A full-stack inventory management system using:

- ⚛️ React (Frontend)
- 🐍 Flask (Backend)
- 🔥 Firebase (Authentication + Database)

Built for small businesses to manage inventory, users, and analytics with ease.

---

## 📁 Project Structure

```
inventory-project/
├── backend/              # Flask API
│   ├── app.py
│   ├── db_init.py
│   ├── firebase_config.py # (not committed)
│   ├── tasks_api.py
│  
│
├── frontend/             # React frontend
│   ├── public/
│   └── src/
│       ├── api.js
│       ├── app.js
│       ├── firebase.js
│       ├── components/
│       ├── context/
│       ├── pages/
│       └── styles/
│   └── .env              # (not committed)
│
├── functions/            # Firebase functions (optional)
│   ├── index.js
│   └── package.json
│
├── .env                  # Global/backend env (not committed)
└── README.md
```

---

## ✅ Prerequisites

Make sure the following tools are installed on your machine:

```bash
Node.js & npm         # For running the frontend
Python 3.8+           # For running the backend
Firebase CLI          # (Optional) For Firebase functions
```

---

## 🔧 1. Clone the Repository

Clone the repository from GitLab and move into the project folder:

```bash
git clone https://campus.cs.le.ac.uk/gitlab/ug_project/24-25/ac896.git
cd inventory-project
```

---

## ⚙️ Environment Variables Setup

To run the project, you must create the following config files manually (they are ignored by Git for security reasons):

---

### 1. `.env` in **project root** (`inventory-project/.env`)

```env
JWT_SECRET=your_generated_secret_here

SMTP_EMAIL=your_email
SMTP_PASSWORD=
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=465
```

---

### 🛠️ How to Set Missing Secrets

Some environment variables must be generated or retrieved manually. Here's how:

---

#### 🔑 `JWT_SECRET`

Used to sign and verify JWT tokens in the backend (for secure login sessions).

You can generate it using Python or Node.js:

```bash
# Using Python
python -c "import secrets; print(secrets.token_hex(32))"

# Or using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output (a long random string) and add it to your root `.env` file:

```env
JWT_SECRET=your_generated_secret_here
```

---

#### 📬 `SMTP_PASSWORD` (Gmail Users)

Used to send verification and activity log emails.

> ⚠️ **Do NOT use your actual Gmail password.**  
> You must generate an **App Password**.

##### To generate one:

1. Go to your Google Account: [https://myaccount.google.com/security](https://myaccount.google.com/security)
2. Enable **2-Step Verification**
3. After enabling, go to **App Passwords**:  
   [https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
4. Under "Select App", choose **Mail**
5. Under "Select Device", choose **Other** and name it (e.g., *InventoryApp*)
6. Click **Generate** — you'll get a 16-character password like:

```
abcd efgh ijkl mnop
```

Remove the spaces and use it in your `.env`:

```env
SMTP_EMAIL=your_email@gmail.com
SMTP_PASSWORD=abcdefghijklmnop
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=465
```

✅ Now your email sending features will work securely.

---


### 2. `.env` in **frontend folder** (`inventory-project/frontend/.env`)

```env
REACT_APP_API_BASE_URL=http://127.0.0.1:5000/api
```

---

### 3. `firebase_config.json` in **backend folder**

This file is required by the Firebase Admin SDK for backend authentication.

#### 📥 To get it:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Open your project → Project Settings → Service Accounts
3. Click **“Generate new private key”**
4. Save the file as:

```
inventory-project/backend/firebase_config.json
```

⚠️ **DO NOT commit this file to Git.**

---

## 🧩 2. Run the Backend (Flask)

From the project root:

```bash
cd backend
python -m venv venv
source venv/bin/activate       # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

🟢 Backend will start at: `http://localhost:5000`

---

## 🖼️ 3. Run the Frontend (React)

From the project root:

```bash
cd frontend
npm install
npm start
```

🟢 Frontend will start at: `http://localhost:3000`

Make sure the backend is running before accessing the frontend.

---

## 🔥 4. (Optional) Run Firebase Functions

If you're using Firebase Cloud Functions:

```bash
cd functions
npm install
firebase emulators:start
```

You need Firebase CLI installed and `firebase.json` configured properly.

---

## ✅ Features

- 🔐 Authentication (Email & Google)
- 📦 Inventory Management (Add, Edit, Delete)
- 📁 CSV Upload with Validation
- 📊 Reports & Graphs (Trends, Stock Levels)
- 📬 Email Verification & Logging
- 🧑‍💼 Role-Based Dashboard (Admin, Staff)

---

## 🛡️ What NOT to Commit

The following files and folders contain sensitive or unnecessary data and should be excluded using `.gitignore`:

```
# Python
venv/
__pycache__/
*.pyc

# Node
frontend/node_modules/
functions/node_modules/

# Env & Secrets
.env
frontend/.env
backend/serviceAccountKey.json

# System Files
.DS_Store
Thumbs.db
.vscode/
.idea/
```