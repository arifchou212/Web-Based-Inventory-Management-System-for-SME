from email.mime.text import MIMEText
import os
import re
import smtplib
import jwt
import pandas as pd
from datetime import datetime, timedelta
from functools import wraps

from flask import Flask, request, jsonify, send_from_directory, g
from flask_cors import CORS
from dotenv import load_dotenv
from twilio.rest import Client
from google.cloud.firestore_v1 import DocumentSnapshot

import firebase_admin
from firebase_admin import credentials, auth, firestore

# Load environment variables from .env 
load_dotenv()
from db_init import db 
from tasks_api import tasks_bp

# JWT secret key from environment
JWT_SECRET = os.getenv("JWT_SECRET")
if not JWT_SECRET:
    raise ValueError("⚠️ JWT_SECRET is missing! Set it in your environment variables or .env file.")

# Firebase Configuration
FIREBASE_CONFIG = {
    "apiKey": os.environ.get('FIREBASE_API_KEY'),
    "authDomain": os.environ.get('FIREBASE_AUTH_DOMAIN'),
}


# Initialize Firebase Admin SDK
# cred = credentials.Certificate("firebase_config.json")  # Make sure this file exists
# firebase_admin.initialize_app(cred)
# db = firestore.client()


# Initialize Flask App
app = Flask(__name__)
CORS(app, origins=os.environ.get('ALLOWED_ORIGINS', 'http://localhost:3000'))
app.register_blueprint(tasks_bp, url_prefix="/api")


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
        server = smtplib.SMTP_SSL(smtp_server, smtp_port)
        server.login(sender_email, sender_password)
        server.sendmail(sender_email, to_email, msg.as_string())
        server.quit()
        print("✅ Verification email sent successfully!")
    except Exception as e:
        print(f"❌ Error sending email: {e}")
        
        
def send_forgot_password_email(to_email, reset_link):
    """New function to send Forgot Password email using the same SMTP settings."""
    sender_email = os.getenv("SMTP_EMAIL")
    sender_password = os.getenv("SMTP_PASSWORD")

    subject = "Reset Your Password"
    body = f"""
    <p>You requested a password reset. Click below to reset your password:</p>
    <p><a href="{reset_link}">{reset_link}</a></p>
    <p>If you did not request this, you can safely ignore this email.</p>
    """

    msg = MIMEText(body, "html")
    msg["Subject"] = subject
    msg["From"] = sender_email
    msg["To"] = to_email

    try:
        server = smtplib.SMTP_SSL("smtp.gmail.com", 465)
        server.login(sender_email, sender_password)
        server.send_message(msg)
        server.quit()
        print("✅ Forgot Password email sent successfully!")
    except Exception as e:
        print(f"❌ Error sending Forgot Password email: {e}")
        
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
# Serve React Frontend 
# --------------------------------------------------------------------------------
@app.route('/')
def serve_react():
    return send_from_directory(app.static_folder, "index.html")

# --------------------------------------------------------------------------------
# Auth Section
# --------------------------------------------------------------------------------

# Signup (Email/Password)
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

        if errors := validate_password(password):
            return jsonify({"error": ", ".join(errors)}), 400

        try:
            auth.get_user_by_email(email)
            return jsonify({"error": "Email is already registered"}), 400
        except firebase_admin.auth.UserNotFoundError:
            pass  

        user_record = auth.create_user(email=email, password=password)
        uid = user_record.uid
        
        verification_link = auth.generate_email_verification_link(email)

        send_verification_email(to_email=email, verification_link=verification_link)

        found_data, found_company = find_user_in_any_company(uid)
        if found_data:
            return jsonify({"error": "This UID is already registered under another company"}), 400

        company_ref = db.collection('companies').document(company_name)
        company_snap = company_ref.get()
        role = 'admin' if not company_snap.exists else 'staff'

        if not company_snap.exists:
            company_ref.set({
                'name': company_name,
                'createdAt': datetime.utcnow(),
                'members': [],
                'adminUid': uid 
            })

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

# Login (Email/Password)
@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.json
        email = data.get('email', "").strip().lower()
        password = data.get('password', "")

        if not email or not password:
            return jsonify({"error": "Email and password required"}), 400

        # Check if user exists in Firebase Auth
        try:
            user_record = auth.get_user_by_email(email)
        except firebase_admin.auth.UserNotFoundError:
            return jsonify({"error": "Invalid credentials"}), 401

        uid = user_record.uid
        
        if not user_record.email_verified:
            return jsonify({"error": "Please verify your email before logging in."}), 403

        # Find user doc in the correct subcollection
        user_data, company = find_user_in_any_company(uid=uid)
        if not user_data:
            return jsonify({"error": "User not found in any company"}), 404

        # Generate a JWT
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

# Google Sign-In
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

        # Verify Google token
        decoded_token = auth.verify_id_token(id_token)
        uid = decoded_token['uid']
        email = decoded_token['email'].lower()

        # Check if user doc is in any company
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

        # If doc doesn't exist & no additional info => new user must provide extra
        if not (company_name and first_name and last_name):
            return jsonify({
                "error": "New users must provide companyName, firstName, and lastName",
                "requiresAdditionalInfo": True
            }), 200

        # Check / create company doc
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

        # Create user doc in subcollection
        user_data = create_user_in_company(
            uid=uid,
            email=email,
            company_name=company_name,
            role=role,
            first_name=first_name,
            last_name=last_name,
            status="active"
        )
        
        # Send a “verification” or welcome email now that we have their extra info:
        verification_link = auth.generate_email_verification_link(email)
        send_verification_email(
            to_email= email,
            verification_link= verification_link
        )

        # Generate a JWT token
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

# Forgot Password
@app.route('/api/forgot-password', methods=['POST'])
def forgot_password():
    try:
        email = request.json.get('email', "").strip().lower()
        if not email:
            return jsonify({"error": "Email is required"}), 400

        # Generate password reset link via Firebase Admin
        reset_link = auth.generate_password_reset_link(email)

        # Send via your newly defined function
        send_forgot_password_email(email, reset_link)

        return jsonify({"message": "Password reset email sent"}), 200

    except firebase_admin.auth.UserNotFoundError:
        return jsonify({"error": "No user found with this email"}), 404
    except Exception as e:
        print("Forgot Password error:", str(e))
        return jsonify({"error": str(e)}), 500
    
# -------------------------------------------------------------------------------- 
# Inventory Section
# --------------------------------------------------------------------------------

# Get Inventory
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

def get_admin_info(admin_uid):
    """
    Loop through all companies to find one that contains a user document in its "users" subcollection 
    with the given UID. Returns a tuple: (full_name, company_id)
    """
    companies = db.collection('companies').stream()
    for company_doc in companies:
        user_doc = company_doc.reference.collection('users').document(admin_uid).get()
        if user_doc.exists:
            user_data = user_doc.to_dict()
            full_name = f"{user_data.get('firstName', '').strip()} {user_data.get('lastName', '').strip()}"
            return full_name, company_doc.id  # using document ID as company name
    return None, None

def notify_company(subject, body, company_name):
    """Send email notifications to all admins and managers in the company."""
    company_ref = db.collection('companies').document(company_name)
    company_doc = company_ref.get().to_dict()
    if not company_doc:
        return
    member_uids = company_doc.get("members", [])
    for uid in member_uids:
        user_doc = db.collection('users').document(uid).get().to_dict()
        if user_doc and user_doc.get("role") in ["admin", "manager"]:
            to_email = user_doc.get("email")
            if to_email:
                send_email(to_email, subject, body)


# CSV Upload Endpoint 
@app.route('/api/upload-csv', methods=['POST'])
def upload_csv():
    # Use UID from headers to derive company name and uploader's full name
    admin_uid = request.headers.get("uid")
    if not admin_uid:
        return jsonify({"error": "Unauthorized: UID missing"}), 401
    uploader, company_name = get_admin_info(admin_uid)
    if not company_name:
        return jsonify({"error": "Admin or company not found"}), 404

    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    file = request.files['file']
    if not (file.filename.endswith('.csv') or file.filename.endswith('.xlsx')):
        return jsonify({"error": "Invalid file type. Please upload a CSV or Excel file"}), 400

    try:
        import pandas as pd
        if file.filename.endswith('.csv'):
            df = pd.read_csv(file)
        else:
            df = pd.read_excel(file)

        required_columns = ["Item Name", "Description", "Category", "Quantity", "Price", "Supplier"]
        if not all(column in df.columns for column in required_columns):
            return jsonify({"error": f"Invalid file format. Missing required columns: {required_columns}"}), 400

        inventory_ref = db.collection('companies').document(company_name).collection('inventory')
        for _, row in df.iterrows():
            name = row["Item Name"]
            supplier = row["Supplier"]
            category = row["Category"]
            quantity = int(row["Quantity"])
            price = float(row["Price"])
            description = row["Description"]

            query = inventory_ref.where("name", "==", name)\
                                  .where("supplier", "==", supplier)\
                                  .where("category", "==", category).limit(1)
            docs = list(query.stream())
            if docs:
                doc = docs[0]
                item = doc.to_dict()
                old_price = item.get("price", 0)
                updated_quantity = item.get("quantity", 0) + quantity
                price_diff = price - old_price
                if price_diff > 0:
                    price_change = "increase"
                elif price_diff < 0:
                    price_change = "decrease"
                else:
                    price_change = "no_change"
                doc.reference.update({
                    "quantity": updated_quantity,
                    "price": price,
                    "price_diff": price_diff,
                    "price_change": price_change,
                    "updated_at": firestore.SERVER_TIMESTAMP,
                    "updated_by": uploader,
                    "added_at": firestore.SERVER_TIMESTAMP,
                    "updated_at": firestore.SERVER_TIMESTAMP
                })
            else:
                new_item = {
                    "name": name,
                    "supplier": supplier,
                    "category": category,
                    "description": description,
                    "quantity": quantity,
                    "price": price,
                    "added_at": firestore.SERVER_TIMESTAMP,
                    "updated_at": firestore.SERVER_TIMESTAMP,
                    "price_diff": 0,
                    "price_change": "no_change",
                    "sold": 0,
                    "added_by": uploader,
                    "updated_by": uploader,
                }
                inventory_ref.add(new_item)
        return jsonify({"message": "File uploaded successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400

# Upsert Inventory (Add or Update)
@app.route('/api/add-inventory', methods=['POST'])
def add_inventory():
    data = request.json
    admin_uid = request.headers.get("uid")
    if not admin_uid:
        return jsonify({"error": "Unauthorized: UID missing"}), 401

    full_name, company_name = get_admin_info(admin_uid)
    if not company_name:
        return jsonify({"error": "Admin or company not found"}), 404

    # Required fields check
    name = data.get("name")
    supplier = data.get("supplier")
    quantity = data.get("quantity", 0)
    new_price = data.get("price")
    if name is None or supplier is None or new_price is None:
        return jsonify({"error": "Missing required fields"}), 400

    inventory_ref = db.collection('companies').document(company_name).collection('inventory')
    query = inventory_ref.where("name", "==", name)\
                         .where("supplier", "==", supplier)\
                         .where("category", "==", data.get("category")).limit(1)
    docs = list(query.stream())
    if docs:
        doc = docs[0]
        item = doc.to_dict()
        old_price = item.get("price", 0)
        updated_quantity = item.get("quantity", 0) + quantity
        price_diff = new_price - old_price
        if price_diff > 0:
            price_change = "increase"
        elif price_diff < 0:
            price_change = "decrease"
        else:
            price_change = "no_change"
        doc.reference.update({
            "quantity": updated_quantity,
            "price": new_price,
            "price_diff": price_diff,
            "price_change": price_change,
            "updated_at": firestore.SERVER_TIMESTAMP,
            "updated_by": full_name
        })
        updated_item = doc.reference.get().to_dict()
        updated_item["id"] = doc.id
        notify_company("Inventory Updated", f"{name} updated. New quantity: {updated_quantity}, Price change: {price_change} ({price_diff}).", company_name)
        return jsonify(updated_item), 200
    else:
        new_item = {
            "name": name,
            "supplier": supplier,
            "category": data.get("category"),
            "description": data.get("description", ""),
            "quantity": quantity,
            "price": new_price,
            "added_at": firestore.SERVER_TIMESTAMP,
            "updated_at": firestore.SERVER_TIMESTAMP,
            "price_diff": 0,
            "price_change": "no_change",
            "sold": 0,
            "added_by": full_name,
            "updated_by": full_name,
        }
        doc_ref = inventory_ref.add(new_item)
        new_item["id"] = doc_ref[1].id
        notify_company("New Inventory Added", f"{name} added with quantity {quantity} at price ${new_price}.", company_name)
        return jsonify(new_item), 201

# Update Inventory Endpoint
@app.route('/api/update-inventory/<item_id>', methods=['PUT'])
def update_inventory(item_id):
    data = request.json
    admin_uid = request.headers.get("uid")
    if not admin_uid:
        return jsonify({"error": "Unauthorised: UID missing"}), 401

    full_name, company_name = get_admin_info(admin_uid)
    if not company_name:
        return jsonify({"error": "Admin or company not found"}), 404

    try:
        inventory_ref = db.collection('companies').document(company_name).collection('inventory')
        data["updated_by"] = full_name
        inventory_ref.document(item_id).update(data)
        notify_company("Inventory Updated", f"Item {item_id} has been updated.", company_name)
        return jsonify({"message": "Item updated successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400

# Delete Inventory Endpoint
@app.route('/api/delete-inventory/<item_id>', methods=['DELETE'])
def delete_inventory(item_id):
    admin_uid = request.headers.get("uid")
    if not admin_uid:
        return jsonify({"error": "Unauthorized: UID missing"}), 401

    _, company_name = get_admin_info(admin_uid)
    if not company_name:
        return jsonify({"error": "Admin or company not found"}), 404

    try:
        inventory_ref = db.collection('companies').document(company_name).collection('inventory')
        inventory_ref.document(item_id).delete()
        notify_company("Inventory Deleted", f"Item {item_id} has been deleted.", company_name)
        return jsonify({"message": "Item deleted successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400
    
# --------------------------------------------------------------------------------
# User Management APIs (Admin Only)
# --------------------------------------------------------------------------------

# Helper function to send emails 
def send_email(to_email, subject, body):
    print(f"Email sent to {to_email}: {subject} - {body}")
    
def require_firebase_auth(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        parts = auth_header.split()
        if len(parts) != 2 or parts[0].lower() != "bearer":
            return jsonify({"error":"Missing or invalid Authorization header"}), 401
        id_token = parts[1]
        try:
            decoded = auth.verify_id_token(id_token)
        except Exception as e:
            return jsonify({"error":"Invalid or expired token"}), 401
        # stash the uid
        g.admin_uid = decoded["uid"]
        return fn(*args, **kwargs)
    return wrapper

# Get all users for the admin's company
@app.route('/api/users', methods=['GET'])
@require_firebase_auth
def get_users():
    company_name = request.headers.get('companyName')
    if not company_name:
        return jsonify({"error": "Company name is required"}), 400

    admin_uid = g.admin_uid
    admin_doc = (
        db.collection('companies')
          .document(company_name)
          .collection('users')
          .document(admin_uid)
          .get()
    )
    if not admin_doc.exists:
        return jsonify({"error": "Admin not found"}), 404

    users = db.collection('companies') \
              .document(company_name) \
              .collection('users') \
              .stream()
    user_list = [{**u.to_dict(), 'id': u.id} for u in users]
    return jsonify(user_list), 200


# Promote a user to manager
@app.route('/api/users/<uid>/promote', methods=['PUT'])
@require_firebase_auth
def promote_user(uid):
    company_name = request.headers.get('companyName')
    if not company_name:
        return jsonify({"error": "Company name header is required"}), 400

    admin_uid = g.admin_uid
    admin_doc = db.collection('companies').document(company_name).collection('users').document(admin_uid).get()
    if not admin_doc.exists:
        return jsonify({"error": "Admin not found"}), 404

    user_doc = db.collection('companies').document(company_name).collection('users').document(uid).get()
    if not user_doc.exists:
        return jsonify({"error": "User not found"}), 404

    if user_doc.to_dict().get('role') != 'staff':
        return jsonify({"error": "Only staff can be promoted"}), 400

    db.collection('companies')\
      .document(company_name)\
      .collection('users')\
      .document(uid)\
      .update({"role": "manager"})

    send_email(user_doc.to_dict().get('email'),
               "Promotion to Manager",
               "Congratulations on your promotion!")
    return jsonify({"message": "User promoted successfully"}), 200


# Remove a user from the company
@app.route('/api/users/<uid>/remove', methods=['DELETE'])
@require_firebase_auth
def remove_user(uid):
    company_name = request.headers.get('companyName')
    if not company_name:
        return jsonify({"error": "Company name header is required"}), 400

    admin_uid = g.admin_uid
    admin_doc = db.collection('companies').document(company_name).collection('users').document(admin_uid).get()
    if not admin_doc.exists:
        return jsonify({"error": "Admin not found"}), 404

    user_doc = db.collection('companies').document(company_name).collection('users').document(uid).get()
    if not user_doc.exists:
        return jsonify({"error": "User not found"}), 404

    if user_doc.to_dict().get('role') == 'admin':
        return jsonify({"error": "Cannot remove the admin user"}), 400

    db.collection('companies')\
      .document(company_name)\
      .collection('users')\
      .document(uid)\
      .delete()

    send_email(user_doc.to_dict().get('email'),
               "Removed from Company",
               "You have been removed from the company.")
    return jsonify({"message": "User removed successfully"}), 200

    
# Demote a user back to staff
@app.route('/api/users/<uid>/demote', methods=['PUT'])
@require_firebase_auth
def demote_user(uid):
    company_name = request.headers.get('companyName')
    if not company_name:
        return jsonify({"error": "Company name header is required"}), 400

    admin_uid = g.admin_uid
    admin_doc = db.collection('companies').document(company_name).collection('users').document(admin_uid).get()
    if not admin_doc.exists:
        return jsonify({"error": "Admin not found"}), 404

    user_doc = db.collection('companies').document(company_name).collection('users').document(uid).get()
    if not user_doc.exists:
        return jsonify({"error": "User not found"}), 404

    if user_doc.to_dict().get('role') != 'manager':
        return jsonify({"error": "Only managers can be demoted"}), 400

    db.collection('companies')\
      .document(company_name)\
      .collection('users')\
      .document(uid)\
      .update({"role": "staff"})

    send_email(user_doc.to_dict().get('email'),
               "Demoted to Staff",
               "You have been demoted to staff.")
    return jsonify({"message": "User demoted successfully"}), 200

# --------------------------------------------------------------------------------
# Reports and Analytics Section
# -------------------------------------------------------------------------------- 

# Get Reports
@app.route('/api/reports', methods=['GET'])
def get_reports():
    start_date = request.args.get('start')       # e.g. "2025-04-16"
    end_date   = request.args.get('end')         # e.g. "2025-04-22"
    company    = request.args.get('companyName')
    if not (start_date and end_date and company):
        return jsonify({"error":"Missing required parameters"}), 400

    # parse + extend end_dt by one full day
    try:
        start_dt = datetime.strptime(start_date, '%Y-%m-%d')
        end_dt   = datetime.strptime(end_date,   '%Y-%m-%d') + timedelta(days=1)
    except ValueError:
        return jsonify({"error":"Invalid date format"}), 400

    inv_ref   = db.collection('companies').document(company).collection('inventory')

    # fetch adds & updates separately
    added_q   = inv_ref.where('added_at',   '>=', start_dt).where('added_at',   '<', end_dt)
    updated_q = inv_ref.where('updated_at', '>=', start_dt).where('updated_at', '<', end_dt)

    seen = set()
    results = []

    #  newly added items
    for snap in added_q.stream():
        d = snap.to_dict()
        d['id']      = snap.id
        d['_action'] = 'added'
        results.append(d)
        seen.add(snap.id)

    #  updated items (skip ones we already included)
    for snap in updated_q.stream():
        if snap.id in seen: 
            continue
        d = snap.to_dict()
        d['id']      = snap.id
        d['_action'] = 'updated'
        results.append(d)
        seen.add(snap.id)

    #  normalize all timestamp fields into ISO strings
    for d in results:
        for fld in ('added_at','updated_at'):
            ts = d.get(fld)
            if isinstance(ts, datetime):
                d[fld] = ts.isoformat()
            elif hasattr(ts, 'to_datetime'):   # google.cloud.Timestamp
                d[fld] = ts.to_datetime().isoformat()
            elif hasattr(ts, 'ToDatetime'):     # protobuf Timestamp
                d[fld] = ts.ToDatetime().isoformat()
            else:
                d[fld] = None

    return jsonify(results), 200

# Get Analytics 
@app.route('/api/analytics', methods=['GET'])
def get_analytics():
    start_date = request.args.get('start')
    end_date = request.args.get('end')
    company_name = request.args.get('companyName')
    if not (start_date and end_date and company_name):
        return jsonify({"error": "Missing required parameters"}), 400
    try:
        start_dt = datetime.strptime(start_date, '%Y-%m-%d')
        end_dt = datetime.strptime(end_date, '%Y-%m-%d')
    except Exception as e:
        return jsonify({"error": "Invalid date format"}), 400

    inventory_ref = db.collection('companies').document(company_name).collection('inventory')
    query = inventory_ref.where('added_at', '>=', start_dt).where('added_at', '<=', end_dt)
    total_stock = 0
    total_sold = 0
    items = []
    try:
        for doc in query.stream():
            data = doc.to_dict()
            total_stock += data.get('quantity', 0)
            total_sold += data.get('sold', 0)
            items.append(data)
        top_selling = sorted(items, key=lambda x: x.get('sold', 0), reverse=True)[:5]
        # Placeholder for a simple trend analysis (e.g., average stock change per day)
        trend = "Trend analysis placeholder"  
        analytics = {
            "total_stock": total_stock,
            "total_sold": total_sold,
            "top_selling": top_selling,
            "trend": trend
        }
        return jsonify(analytics), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    

@app.route('/api/analytics-summary', methods=['GET'])
def analytics_summary():
    company_name = request.args.get('companyName')
    if not company_name:
        return jsonify({"error": "Company name is required"}), 400

    try:
        analytics = {
            "stockTrends": [],
            "top_selling": [],
            "notifications": [],
            "lowStock": [],
            
            "totalItems": 0,
            "totalValue": 0.0,
            "categoryCount": 0,
            "categories": [],  
            
            "outOfStockCount": 0,
            "avgPrice": 0.0,
        }

        # Reference to inventory subcollection
        inventory_ref = db.collection('companies').document(company_name).collection('inventory')

        items = []
        stock_trends = []

        for doc in inventory_ref.stream():
            data = doc.to_dict()
            # For 'stockTrends' if "added_at" is present
            if "added_at" in data:
                try:
                    # Firestore Timestamp => Python datetime
                    timestamp = data["added_at"].timestamp()
                    date_str = datetime.fromtimestamp(timestamp).strftime("%Y-%m-%d")
                except AttributeError:
                    # If 'added_at' has .seconds
                    date_str = datetime.fromtimestamp(data["added_at"].seconds).strftime("%Y-%m-%d")

                stock_trends.append({
                    "date": date_str,
                    "stock": data.get("quantity", 0),
                    "sold": data.get("sold", 0)
                })
            items.append(data)

        # Save stockTrends in analytics
        analytics["stockTrends"] = stock_trends

        # Compute top_selling from items
        top_selling = sorted(items, key=lambda x: x.get("sold", 0), reverse=True)[:5]
        analytics["top_selling"] = top_selling

        # Inventory summary fields
        total_items = 0
        total_value = 0.0
        cat_dict = {}
        out_of_stock_count = 0
        prices = []  # for avg price

        for it in items:
            quantity = it.get("quantity", 0)
            price = it.get("price", 0)
            total_items += quantity
            total_value += quantity * price

            cat_name = it.get("category", "Uncategorized")
            cat_dict[cat_name] = cat_dict.get(cat_name, 0) + 1

            if quantity <= 0:
                out_of_stock_count += 1
            if "price" in it:
                prices.append(price)

        # Convert cat_dict => array of { name, count }
        category_list = [{"name": k, "count": v} for k, v in cat_dict.items()]

        avg_price = sum(prices) / len(prices) if prices else 0.0

        analytics["totalItems"] = total_items
        analytics["totalValue"] = total_value
        analytics["categoryCount"] = len(category_list)
        analytics["categories"] = category_list
        analytics["outOfStockCount"] = out_of_stock_count
        analytics["avgPrice"] = avg_price

        # Low stock => threshold
        low_stock_list = []
        low_stock_query = inventory_ref.where("quantity", "<=", 5)
        for doc in low_stock_query.stream():
            d = doc.to_dict()
            d["id"] = doc.id
            low_stock_list.append(d)
        analytics["lowStock"] = low_stock_list

        # Fetch tasks => store them in analytics["notifications"]
        tasks_ref = db.collection("companies").document(company_name).collection("tasks")
        tasks_query = tasks_ref.order_by("createdAt", direction=firestore.Query.DESCENDING).limit(20)
        tasks_snap = tasks_query.stream()

        tasks_list = []
        for tdoc in tasks_snap:
            tdata = tdoc.to_dict()
            tdata["id"] = tdoc.id
            tasks_list.append(tdata)

        analytics["notifications"] = tasks_list

        # Return everything
        return jsonify(analytics), 200

    except Exception as e:
        print("Error in analytics_summary:", str(e))
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True, port=5000)