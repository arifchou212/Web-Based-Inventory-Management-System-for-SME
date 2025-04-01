from email.mime.text import MIMEText
import os
import re
import csv
import io
import smtplib
import jwt
import pandas as pd
from datetime import datetime, timedelta
from functools import wraps

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv

import firebase_admin
from firebase_admin import credentials, auth, firestore

# Load environment variables from .env (if available)
load_dotenv()

# Get JWT secret key from environment
JWT_SECRET = os.getenv("JWT_SECRET")
if not JWT_SECRET:
    raise ValueError("⚠️ JWT_SECRET is missing! Set it in your environment variables or .env file.")

# Firebase Configuration (Optional)
FIREBASE_CONFIG = {
    "apiKey": os.environ.get('FIREBASE_API_KEY'),
    "authDomain": os.environ.get('FIREBASE_AUTH_DOMAIN'),
    # ... Add other Firebase config if needed
}

# Initialize Flask App
app = Flask(__name__)
CORS(app, origins=os.environ.get('ALLOWED_ORIGINS', 'http://localhost:3000'))

# Initialize Firebase Admin SDK
cred = credentials.Certificate("firebase_config.json")  # Make sure this file exists
firebase_admin.initialize_app(cred)
db = firestore.client()

# --------------------------------------------------------------------------------
# Password Complexity Requirements
# --------------------------------------------------------------------------------
PASSWORD_REQUIREMENTS = {
    'min_length': 8,
    'requires_uppercase': True,
    'requires_lowercase': True,
    'requires_digit': True,
    'requires_symbol': True
}

def validate_password(password):
    """Validates password based on security rules."""
    errors = []
    if len(password) < PASSWORD_REQUIREMENTS['min_length']:
        errors.append("Password must be at least 8 characters")
    if PASSWORD_REQUIREMENTS['requires_uppercase'] and not re.search(r'[A-Z]', password):
        errors.append("Password must contain at least one uppercase letter")
    if PASSWORD_REQUIREMENTS['requires_lowercase'] and not re.search(r'[a-z]', password):
        errors.append("Password must contain at least one lowercase letter")
    if PASSWORD_REQUIREMENTS['requires_digit'] and not re.search(r'\d', password):
        errors.append("Password must contain at least one digit")
    if PASSWORD_REQUIREMENTS['requires_symbol'] and not re.search(r'[!@#$%^&*(),.?\":{}|<>]', password):
        errors.append("Password must contain at least one special character")
    return errors

# --------------------------------------------------------------------------------
# Email Utilities
# --------------------------------------------------------------------------------
def send_verification_email(to_email, verification_link):
    sender_email = os.getenv("SMTP_EMAIL")  
    sender_password = os.getenv("SMTP_PASSWORD")  
    smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")  # Default to Gmail
    smtp_port = int(os.getenv("SMTP_PORT", 465))  

    if not sender_email or not sender_password:
        print("❌ Error: Missing SMTP credentials. Check your .env file.")
        return

    subject = "Verify Your Email"
    body = f"""
    Hello,

    Click the link below to verify your email address:

    {verification_link}

    If you did not request this, you can safely ignore this email.

    Thanks,
    Inventory Management Team
    """

    msg = MIMEText(body)
    msg["From"] = sender_email
    msg["To"] = to_email
    msg["Subject"] = subject

    try:
        # Use SSL to connect securely to Gmail SMTP
        server = smtplib.SMTP_SSL(smtp_server, smtp_port)
        server.login(sender_email, sender_password)
        server.sendmail(sender_email, to_email, msg.as_string())
        server.quit()
        print("✅ Verification email sent successfully!")
    except Exception as e:
        print(f"❌ Error sending email: {e}")
# --------------------------------------------------------------------------------
# JWT Helpers
# --------------------------------------------------------------------------------
def generate_jwt(uid, role, company):
    """Generates a JWT token with role & company info."""
    payload = {
        'uid': uid,
        'role': role,
        'company': company,
        'exp': datetime.utcnow() + timedelta(hours=24)  # 24-hour expiry
    }
    return jwt.encode(payload, JWT_SECRET, algorithm='HS256')

@app.route('/api/issueToken', methods=['POST'])
def issue_token():
    try:
        data = request.json
        id_token = data.get("idToken")
        if not id_token:
            return jsonify({"error": "Missing idToken"}), 400

        decoded = auth.verify_id_token(id_token)
        uid = decoded['uid']

        # find subcollection doc
        user_data, company = find_user_in_any_company(uid) 
        if not user_data:
            return jsonify({"error": "User doc not found"}), 404

        # Suppose user_data has { role: 'admin', ... }
        token = generate_jwt(uid, user_data['role'], company)  
        return jsonify({
            "token": token,
            "role": user_data['role'],
            "company": company,
            "uid": uid
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --------------------------------------------------------------------------------
# Firestore Helpers
# --------------------------------------------------------------------------------
def find_user_in_any_company(uid):
    companies_snap = db.collection('companies').stream()
    for company_doc in companies_snap:
        user_snap = company_doc.reference.collection('users').document(uid).get()
        if user_snap.exists:
            return user_snap.to_dict(), company_doc.id
    return None, None


def create_user_in_company(uid, email, company_name, role, first_name, last_name, status="active"):
    """
    Creates a user document in `companies/{companyName}/users/{uid}`.
    Also updates the 'members' array for the company.
    """
    company_name = company_name.lower()
    company_ref = db.collection('companies').document(company_name)
    
    user_data = {
        'uid': uid,
        'email': email.lower(),
        'firstName': first_name.strip(),
        'lastName': last_name.strip(),
        'role': role,
        'createdAt': datetime.utcnow(),
        'status': status
    }

    # Create user doc by UID
    user_ref = company_ref.collection('users').document(uid)
    user_ref.set(user_data)

    # Update company members
    company_ref.update({"members": firestore.ArrayUnion([uid])})

    # If user is admin, set adminUid
    if role == "admin":
        company_ref.update({'adminUid': uid})

    return user_data

# --------------------------------------------------------------------------------
# Serve React Frontend (Optional)
# --------------------------------------------------------------------------------
@app.route('/')
def serve_react():
    """Serve React frontend (if you have a single-page app in /build)"""
    return send_from_directory(app.static_folder, "index.html")

# --------------------------------------------------------------------------------
# Signup (Email/Password)
# --------------------------------------------------------------------------------
@app.route('/api/signup', methods=['POST'])
def signup():
    try:
        data = request.json
        required_fields = ['email', 'password', 'companyName', 'firstName', 'lastName']
        if any(field not in data for field in required_fields):
            return jsonify({"error": "All fields are required"}), 400

        email = data['email'].strip().lower()
        password = data['password']
        company_name = data['companyName'].strip().lower()
        first_name = data['firstName'].strip()
        last_name = data['lastName'].strip()

        # 1️⃣ Validate Password
        if errors := validate_password(password):
            return jsonify({"error": ", ".join(errors)}), 400

        # 2️⃣ Check if user exists
        try:
            auth.get_user_by_email(email)
            return jsonify({"error": "Email is already registered"}), 400
        except firebase_admin.auth.UserNotFoundError:
            pass  

        # 3️⃣ Create User in Firebase
        user_record = auth.create_user(email=email, password=password)
        uid = user_record.uid
        
        # 4️⃣ Generate the verification link
        verification_link = auth.generate_email_verification_link(email)

        # 5️⃣ Use your custom SMTP function to send the link
        send_verification_email(to_email=email, verification_link=verification_link)

        # 4️⃣ Check if the user already exists in another company
        found_data, found_company = find_user_in_any_company(uid)
        if found_data:
            return jsonify({"error": "This UID is already registered under another company"}), 400

        # 5️⃣ Check / Create the Company Doc
        company_ref = db.collection('companies').document(company_name)
        company_snap = company_ref.get()
        role = 'admin' if not company_snap.exists else 'staff'

        if not company_snap.exists:
            company_ref.set({
                'name': company_name,
                'createdAt': datetime.utcnow(),
                'members': [],
                'adminUid': uid  # ✅ FIX: Assign adminUid here
            })

            # ✅ FIX: Create an Inventory Collection for the Company
            inventory_ref = (
                db.collection("companies")
                .document(company_name)
                .collection("inventory")
                .document("placeholder")
            )
            inventory_ref.set({
                "createdAt": datetime.utcnow(),
                "note": "Initial inventory doc",
            })

        # 6️⃣ Store User in Firestore (within the company)
        user_ref = company_ref.collection('users').document(uid)
        user_data = {
            'uid': uid,
            'email': email,
            'firstName': first_name,
            'lastName': last_name,
            'role': role,
            'status': "active",  
            'company': company_name
        }
        user_ref.set(user_data)

        # ✅ Add user to the company's members array
        company_ref.update({
            'members': firestore.ArrayUnion([uid])
        })

        return jsonify({
            "message": "Registration successful! Please verify your email before logging in.",
            "uid": uid,
            "role": role,
            "requiresVerification": True
        }), 201

    except Exception as e:
        print("Signup error:", str(e))
        return jsonify({"error": str(e)}), 500

# --------------------------------------------------------------------------------
# Login (Email/Password)
# --------------------------------------------------------------------------------
@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.json
        email = data.get('email', "").strip().lower()
        password = data.get('password', "")

        if not email or not password:
            return jsonify({"error": "Email and password required"}), 400

        # 1. Check if user exists in Firebase Auth
        try:
            user_record = auth.get_user_by_email(email)
        except firebase_admin.auth.UserNotFoundError:
            return jsonify({"error": "Invalid credentials"}), 401

        uid = user_record.uid
        
        if not user_record.email_verified:
            return jsonify({"error": "Please verify your email before logging in."}), 403

        # NOTE: We are not verifying the password here with Admin (not possible by default).
        # For true password verification, you'd do it on the client with "signInWithEmailAndPassword"
        # or call the REST "verifyPassword" endpoint from the server.

        # 2. Find user doc in the correct subcollection
        user_data, company = find_user_in_any_company(uid=uid)
        if not user_data:
            return jsonify({"error": "User not found in any company"}), 404

        # 4. Generate a JWT
        token = generate_jwt(uid, user_data["role"], company)

        return jsonify({
            "message": "Login successful",
            "token": token,
            "uid": uid,
            "role": user_data["role"],
            "company": company
        }), 200

    except Exception as e:
        print("Login error:", str(e))
        return jsonify({"error": "Login failed"}), 500

# --------------------------------------------------------------------------------
# Google Sign-In
# --------------------------------------------------------------------------------
@app.route('/api/google-signin', methods=['POST'])
def google_signin():
    try:
        data = request.json
        id_token = data.get('idToken')
        company_name = data.get('companyName')
        first_name = data.get('firstName')
        last_name = data.get('lastName')

        if not id_token:
            return jsonify({"error": "Missing idToken"}), 400

        # 1. Verify Google token
        decoded_token = auth.verify_id_token(id_token)
        uid = decoded_token['uid']
        email = decoded_token['email'].lower()

        # 2. Check if user doc is in any company
        existing_data, existing_company = find_user_in_any_company(uid)
        if existing_data:
            # user doc found => immediate login
            token = generate_jwt(uid, existing_data['role'], existing_company)
            return jsonify({
                "message": "Login successful",
                "token": token,
                "uid": uid,
                "role": existing_data["role"],
                "company": existing_company
            }), 200

        # 3. If doc doesn't exist & no additional info => new user must provide extra
        if not (company_name and first_name and last_name):
            return jsonify({
                "error": "New users must provide companyName, firstName, and lastName",
                "requiresAdditionalInfo": True
            }), 200

        # 4. Check / create company doc
        company_name = company_name.lower()
        company_ref = db.collection('companies').document(company_name)
        company_snap = company_ref.get()
        role = 'admin' if not company_snap.exists else 'staff'
        if not company_snap.exists:
            company_ref.set({
                'name': company_name,
                'createdAt': datetime.utcnow(),
                'members': [],
                'adminUid': None
            })

        # 5. Create user doc in subcollection
        user_data = create_user_in_company(
            uid=uid,
            email=email,
            company_name=company_name,
            role=role,
            first_name=first_name,
            last_name=last_name,
            status="active"
        )

        # 6. Generate a JWT token
        token = generate_jwt(uid, role, company_name)
        return jsonify({
            "message": "Registration successful",
            "token": token,
            "uid": uid,
            "role": role,
            "company": company_name
        }), 201

    except Exception as e:
        print("Google Sign-In error:", str(e))
        return jsonify({"error": str(e)}), 500

# --------------------------------------------------------------------------------
# Forgot Password
# --------------------------------------------------------------------------------
@app.route('/api/forgot-password', methods=['POST'])
def forgot_password():
    try:
        email = request.json.get('email', "").strip().lower()
        if not email:
            return jsonify({"error": "Email is required"}), 400

        # Generates a password reset link using Firebase Admin
        reset_link = auth.generate_password_reset_link(email)
        # TODO: Integrate your email service to send `reset_link` to the user

        return jsonify({"message": "Password reset email sent"}), 200

    except firebase_admin.auth.UserNotFoundError:
        return jsonify({"error": "No user found with this email"}), 404
    except Exception as e:
        print("Forgot Password error:", str(e))
        return jsonify({"error": str(e)}), 500    
    
# Inventory    
@app.route('/api/inventory', methods=['GET'])
def get_inventory():
    company_name = request.args.get('companyName')
    if not company_name:
        return jsonify({"error": "Company name is required"}), 400

    try:
        inventory_ref = db.collection('companies').document(company_name).collection('inventory')
        inventory = [doc.to_dict() for doc in inventory_ref.stream()]
        return jsonify(inventory)
    except Exception as e:
        return jsonify({"error": str(e)}), 400

# Bulk Upload CSV API
@app.route('/api/upload-csv', methods=['POST'])
def upload_csv():
    company_name = request.form.get('companyName')
    if not company_name:
        return jsonify({"error": "Company name is required"}), 400

    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files['file']
    if not (file.filename.endswith('.csv') or file.filename.endswith('.xlsx')):
        return jsonify({"error": "Invalid file type. Please upload a CSV or Excel file"}), 400

    try:
        # Read file based on extension
        if file.filename.endswith('.csv'):
            df = pd.read_csv(file)
        elif file.filename.endswith('.xlsx'):
            df = pd.read_excel(file)

        # Validate and upload data
        required_columns = ["Item Name", "Description", "Category", "Quantity", "Price", "Supplier"]
        if not all(column in df.columns for column in required_columns):
            return jsonify({"error": f"Invalid file format. Missing required columns: {required_columns}"}), 400

        inventory_ref = db.collection('companies').document(company_name).collection('inventory')
        for _, row in df.iterrows():
            item_data = {
                "name": row["Item Name"],
                "description": row["Description"],
                "category": row["Category"],
                "quantity": int(row["Quantity"]),
                "price": float(row["Price"]),
                "supplier": row["Supplier"],
            }
            inventory_ref.add(item_data)

        return jsonify({"message": "File uploaded successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/api/add-inventory', methods=['POST'])
def add_inventory():
    data = request.json
    company_name = data.get("companyName")
    if not company_name:
        return jsonify({"error": "Company name is required"}), 400

    required_fields = ["name", "description", "category", "quantity", "price", "supplier"]
    for field in required_fields:
        if field not in data:
            return jsonify({"error": f"Missing required field: {field}"}), 400

    try:
        inventory_ref = db.collection('companies').document(company_name).collection('inventory')
        inventory_ref.add(data)
        return jsonify({"message": "Item added successfully"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400

# Update Inventory Item API
@app.route('/api/update-inventory/<item_id>', methods=['PUT'])
def update_inventory(item_id):
    data = request.json
    company_name = data.get("companyName")
    if not company_name:
        return jsonify({"error": "Company name is required"}), 400

    try:
        inventory_ref = db.collection('companies').document(company_name).collection('inventory')
        inventory_ref.document(item_id).update(data)
        return jsonify({"message": "Item updated successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400

# Delete Inventory Item API
@app.route('/api/delete-inventory/<item_id>', methods=['DELETE'])
def delete_inventory(item_id):
    company_name = request.args.get('companyName')
    if not company_name:
        return jsonify({"error": "Company name is required"}), 400

    try:
        inventory_ref = db.collection('companies').document(company_name).collection('inventory')
        inventory_ref.document(item_id).delete()
        return jsonify({"message": "Item deleted successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400
    
# User Management APIs (Admin Only)

# Helper function to send emails (mock implementation)
def send_email(to_email, subject, body):
    print(f"Email sent to {to_email}: {subject} - {body}")

# Get all users for the admin's company
@app.route('/api/users', methods=['GET'])
def get_users():
    try:
        # Get admin UID and companyName from headers (or query parameters)
        admin_uid = request.headers.get('uid')
        company_name = request.headers.get('companyName')  # Ensure you pass this from the frontend

        print("Incoming headers:", request.headers)  # For debugging

        if not admin_uid:
            return jsonify({"error": "Unauthorized"}), 401
        if not company_name:
            return jsonify({"error": "Company name is required"}), 400

        # Get the admin's document from the company subcollection
        admin_doc = db.collection('companies').document(company_name).collection('users').document(admin_uid).get()
        admin_data = admin_doc.to_dict()
        if not admin_data:
            return jsonify({"error": "Admin not found"}), 404

        # Fetch all users from the same company subcollection
        users_ref = db.collection('companies').document(company_name).collection('users')
        users = users_ref.stream()
        user_list = [{**user.to_dict(), 'id': user.id} for user in users]
        return jsonify(user_list), 200
    except Exception as e:
        print("Error fetching users:", str(e))
        return jsonify({"error": str(e)}), 500


# Promote a user to manager
@app.route('/api/users/<uid>/promote', methods=['PUT'])
def promote_user(uid):
    try:
        data = request.json
        #admin_password = data.get('password')  # Admin's password for confirmation
        admin_uid = request.headers.get('uid')
        company_name = request.headers.get('companyName')
        if not company_name:
            return jsonify({"error": "Company name header is required"}), 400

        # Get admin document from the company subcollection
        admin_doc = db.collection('companies').document(company_name).collection('users').document(admin_uid).get()
        admin_data = admin_doc.to_dict()
        if not admin_data:
            return jsonify({"error": "Admin not found"}), 404

        #if admin_data.get('password') != admin_password:
        #    return jsonify({"error": "Invalid password"}), 401

        # Get the target user from the same subcollection
        user_doc = db.collection('companies').document(company_name).collection('users').document(uid).get()
        user_data = user_doc.to_dict()
        if not user_data:
            return jsonify({"error": "User not found"}), 404

        if user_data.get('role') != 'staff':
            return jsonify({"error": "Only staff can be promoted to manager"}), 400

        # Update the user's role
        db.collection('companies').document(company_name).collection('users').document(uid).update({"role": "manager"})
        send_email(user_data.get('email'), "Promotion to Manager", "Congratulations on your promotion!")
        return jsonify({"message": "User promoted successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Remove a user from the company
@app.route('/api/users/<uid>/remove', methods=['DELETE'])
def remove_user(uid):
    try:
        data = request.json
        #admin_password = data.get('password')
        admin_uid = request.headers.get('uid')
        company_name = request.headers.get('companyName')
        if not company_name:
            return jsonify({"error": "Company name header is required"}), 400

        admin_doc = db.collection('companies').document(company_name).collection('users').document(admin_uid).get()
        admin_data = admin_doc.to_dict()
        if not admin_data:
            return jsonify({"error": "Admin not found"}), 404

        #if admin_data.get('password') != admin_password:
        #    return jsonify({"error": "Invalid password"}), 401

        user_doc = db.collection('companies').document(company_name).collection('users').document(uid).get()
        user_data = user_doc.to_dict()
        if not user_data:
            return jsonify({"error": "User not found"}), 404

        if user_data.get('role') == 'admin':
            return jsonify({"error": "Cannot remove the admin user"}), 400

        db.collection('companies').document(company_name).collection('users').document(uid).delete()
        send_email(user_data.get('email'), "Removed from Company", "You have been removed from the company.")
        return jsonify({"message": "User removed successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# API to get reports
@app.route('/reports', methods=['GET'])
def get_reports():
    start_date = request.args.get('start')
    end_date = request.args.get('end')
    report_type = request.args.get('type')

    start_dt = datetime.strptime(start_date, "%Y-%m-%d")
    end_dt = datetime.strptime(end_date, "%Y-%m-%d")

    inventory_ref = db.collection('inventory')
    query = inventory_ref.where('last_updated', '>=', start_dt).where('last_updated', '<=', end_dt)

    if report_type == 'low_stock':
        query = query.where('stock', '<=', 5)
    elif report_type == 'sales_trends':
        query = query.order_by('sold', direction=firestore.Query.DESCENDING)

    results = [doc.to_dict() for doc in query.stream()]
    return jsonify(results)

# API to get analytics
@app.route('/analytics', methods=['GET'])
def get_analytics():
    start_date = request.args.get('start')
    end_date = request.args.get('end')

    start_dt = datetime.strptime(start_date, "%Y-%m-%d")
    end_dt = datetime.strptime(end_date, "%Y-%m-%d")

    inventory_ref = db.collection('inventory')
    query = inventory_ref.where('last_updated', '>=', start_dt).where('last_updated', '<=', end_dt)

    inventory_data = [doc.to_dict() for doc in query.stream()]

    # Sample Analytics Calculation
    total_items = sum(item["stock"] for item in inventory_data)
    top_selling = sorted(inventory_data, key=lambda x: x.get("sold", 0), reverse=True)[:5]

    analytics = {
        "total_stock": total_items,
        "top_selling": top_selling,
    }

    return jsonify(analytics)

if __name__ == '__main__':
    app.run(debug=True, port=5000)
    app.run(debug=True, port=5000)