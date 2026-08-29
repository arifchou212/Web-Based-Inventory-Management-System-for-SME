# Web-Based Inventory Management System for Small Businesses

A full-stack inventory management system using:

-  React (Frontend)
-  Flask (Backend)
-  Firebase (Authentication + Database)

Built for small businesses to manage inventory, users, and analytics with ease.

---

## Live Demo
https://web-based-inventory-management-syst.vercel.app

<img width="752" height="356" alt="image" src="https://github.com/user-attachments/assets/b8915ee0-a085-4d81-856c-a43e768d9cf2" />

<img width="750" height="342" alt="image" src="https://github.com/user-attachments/assets/718f2ac5-ec0c-48b1-8c22-241ca1336e77" />

<img width="755" height="342" alt="image" src="https://github.com/user-attachments/assets/760215fa-f4df-4e19-afc3-466f21be8578" />


<img width="752" height="346" alt="image" src="https://github.com/user-attachments/assets/e8e62712-c100-4f9b-92a7-0ba77748560b" />



##  Project Structure
```
inventory-project/
├── backend/                  # Flask API
│   ├── app.py
│   ├── db_init.py
│   ├── firebase_config.py
│   ├── tasks_api.py
│   ├── firebase_config.json   # (not committed)
│   └── requirements.txt
│
├── frontend/                 # React frontend
│   ├── public/
│   └── src/
│       ├── api.js
│       ├── app.js
│       ├── firebase.js
│       ├── components/
│       ├── context/
│       ├── pages/
│       └── styles/
│   ├── .env                   # (not committed)
│   └── package.json
│
├── functions/                # Firebase functions (optional)
│   ├── index.js
│   └── package.json
│
├── .env                      # Global/backend config (not committed)
└── README.md
```

---

##  Prerequisites

Make sure the following tools are installed on your machine:

```bash
Node.js & npm         # For running the frontend
Python 3.11.5           # For running the backend
Firebase CLI          # (Optional) For Firebase functions
```


##  1. Clone the Repository

```bash
git clone https://github.com/arifchou212/Web-Based-Inventory-Management-System-for-SME.git
cd Web-Based-Inventory-Management-System-for-SME/inventory-project
```

---

##  Environment Variables Setup

To run the project, you must create the following config files manually (they are ignored by Git for security reasons):

---

### 1. `.env` in **project root** (`inventory-project/.env`)

```env
JWT_SECRET=your_generated_secret_here

SMTP_EMAIL=your_email@gmail.com
SMTP_PASSWORD=your_app_password
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=465
```

---

### How to Set Missing Secrets

####  `JWT_SECRET`

Used to sign and verify JWT tokens in the backend.

Generate a secure token by copying this in the terminal:

```bash
# Python
python -c "import secrets; print(secrets.token_hex(32))"

```

Paste the result into your `.env`:

```env
JWT_SECRET=your_generated_secret_here
```

---

####  `SMTP_PASSWORD` (Gmail Users)

>  **Do NOT use your real Gmail password** — use a generated **App Password**.

1. Visit [https://myaccount.google.com/security](https://myaccount.google.com/security)
2. Enable **2-Step Verification**
3. Go to [https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
4. Select **Mail** and name your app (e.g., *InventoryApp*)
5. Copy the 16-character password and use it in your `.env`

```env
SMTP_EMAIL=your_email@gmail.com
SMTP_PASSWORD=abcdefghijklmnop
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=465
```

---

### 2. `.env` in **frontend folder** (`inventory-project/frontend/.env`)

```env
REACT_APP_API_BASE_URL=http://127.0.0.1:5000/api
```
---

##  Firebase Setup for Frontend

To connect the React app to Firebase, you need to configure it with your Firebase web credentials.

---

###  1. Create a Firebase Project

1. Visit [https://console.firebase.google.com](https://console.firebase.google.com)
2. Click **“Add Project”** and follow the steps
3. In project overview, navigate to you project, then authentication, then go to sign-in methods
3. Enable Email/Password Authentication and Google sign-in
4. Create Firestore Database (in test mode or secure rules mode)
---

###  2. Register a Web App

1. Inside the Firebase dashboard → ⚙️ **Project Settings**
2. Scroll to **"Your apps"** and click the **</> (Web)** icon
3. Name your app (e.g., `InventoryFrontend`)
4. In the terminal run 
```npm install firebase```
4. Firebase will also give you a config object like this:

```js
const firebaseConfig = {
  apiKey: "AIzaSyExampleKey",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:exampleid",
  measurementId: "G-EXAMPLEID"
};
```
5. Inside frontend/src/firebase.js, replace the firebaseConfig in the firebase.js with the newly generated const firebaseConfig firebase just gave
6. For testing purposes, change the firebase rules to this:
```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```
---


### 3. `firebase_config.json` in **backend folder**

This is the Firebase Admin SDK private key used by Flask to communicate with Firebase securely. 

 **To generate it:**

1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Open your project → ⚙️ Project Settings → Service Accounts
3. Click **"Generate new private key"**
4. Rename the file to `firebase_config.json`
5. Place it in:

```
inventory-project/backend/firebase_config.json
```

 **DO NOT commit this file.**

---


##   Run the Backend (Flask)

```bash
cd backend
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py # make sure python interpretor is set to python 3.11.5
```

 Backend runs at: `http://localhost:5000`

---

##  Run the Frontend (React)

```bash
cd frontend
npm install
npm start
```

 Frontend runs at: `http://localhost:3000`

Make sure the backend is running before accessing the frontend.

---

##  4. (Optional, might not need) Run Firebase Functions

If you're using Firebase Cloud Functions:

```bash
cd functions
npm install
firebase emulators:start
```

You must have the Firebase CLI installed and `firebase.json` configured properly.

---

##  Features

-  Authentication (Email & Google)
-  Inventory Management (Add, Edit, Delete)
-  CSV Upload with Validation
-  Reports & Graphs (Trends, Stock Levels)
-  Email Verification & Logging
-  Role-Based Dashboard (Admin, Staff)

---

##  What NOT to Commit

The following should be excluded using `.gitignore`:

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
backend/firebase_config.json

# System Files
.DS_Store
Thumbs.db
.vscode/
.idea/
```

