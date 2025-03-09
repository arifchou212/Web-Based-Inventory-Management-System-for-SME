from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import firebase_admin
from firebase_admin import credentials, auth, firestore
import csv
import os
from functools import wraps

# Initialize Flask App
app = Flask(__name__, static_folder="../frontend/build", static_url_path="/")
CORS(app)

# Initialize Firebase Admin SDK
cred = credentials.Certificate("firebase_config.json")  # Make sure this file exists
firebase_admin.initialize_app(cred)
db = firestore.client()

# Verify Firebase ID Token
def verify_firebase_token(id_token):
    try:
        decoded_token = auth.verify_id_token(id_token)
        return decoded_token
    except Exception as e:
        return None

# Middleware for role-based access control
def role_required(role):
    def decorator(f):
        @wraps(f)
        def wrapped(*args, **kwargs):
            uid = request.headers.get('uid')  # Pass UID in headers
            if not uid:
                return jsonify({"error": "Unauthorized"}), 401

            user_data = db.collection('users').document(uid).get().to_dict()
            if user_data.get('role') != role:
                return jsonify({"error": "Forbidden"}), 403

            return f(*args, **kwargs)
        return wrapped
    return decorator

# Serve React Frontend
@app.route('/')
def serve_react():
    return send_from_directory(app.static_folder, "index.html")

# Sign Up API
@app.route('/api/signup', methods=['POST', 'OPTIONS'])
def signup():
    if request.method == 'OPTIONS':
        return '', 200  # Handle preflight requests

    data = request.json
    email = data.get("email")
    password = data.get("password")
    confirm_password = data.get("confirmPassword")
    company_name = data.get("companyName")

    if not email or not password or not confirm_password or not company_name:
        return jsonify({"error": "All fields are required"}), 400

    if password != confirm_password:
        return jsonify({"error": "Passwords do not match"}), 400

    try:
        # Check if the company already exists
        company_users = db.collection('users').where('companyName', '==', company_name).stream()
        company_users = [user.to_dict() for user in company_users]

        # Assign role: admin if first user, otherwise staff
        role = "admin" if len(company_users) == 0 else "staff"

        # Create user in Firebase Authentication
        user = auth.create_user(email=email, password=password)

        # Save user details in Firestore
        db.collection('users').document(user.uid).set({
            'email': email,
            'companyName': company_name,
            'role': role,
        })

        return jsonify({"message": "User registered successfully!", "uid": user.uid, "role": role}), 201
    except Exception as e:
        print("Signup Error:", str(e))  # Debugging output
        return jsonify({"error": str(e)}), 400

# Login API
@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    try:
        user = auth.get_user_by_email(email)
        user_data = db.collection('users').document(user.uid).get().to_dict()
        return jsonify({
            'message': 'Login successful',
            'uid': user.uid,
            'role': user_data.get('role', 'staff'),  # Include role in response
        })
    except Exception as e:
        return jsonify({'error': 'Invalid credentials'}), 400

# Google Sign-In API
@app.route('/api/google-signin', methods=['POST'])
def google_signin():
    id_token = request.json.get('idToken')
    company_name = request.json.get('companyName')  # Get company name from frontend

    try:
        decoded_token = auth.verify_id_token(id_token)
        uid = decoded_token['uid']
        email = decoded_token['email']

        # Check if the user already exists
        existing_user = db.collection('users').document(uid).get()

        if existing_user.exists:
            # If the user exists, return their details without requiring company name
            user_data = existing_user.to_dict()
            return jsonify({
                'message': 'Google sign-in successful',
                'uid': uid,
                'role': user_data.get('role'),
            })
        else:
            # If the user does not exist and company_name is provided
            if not company_name:
                return jsonify({"error": "Company name is required for new users"}), 400

            # Check if the company already exists
            company_users = db.collection('users').where('companyName', '==', company_name).stream()
            company_users = [user.to_dict() for user in company_users]

            # Assign role: admin if first user, otherwise staff
            role = "admin" if len(company_users) == 0 else "staff"

            # Save user details in Firestore
            db.collection('users').document(uid).set({
                'email': email,
                'companyName': company_name,
                'role': role,
            }, merge=True)

            return jsonify({
                'message': 'Google sign-in successful',
                'uid': uid,
                'role': role,
            })
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
    if not file.filename.endswith('.csv'):
        return jsonify({"error": "Invalid file type. Please upload a CSV file"}), 400

    try:
        # Read CSV file
        stream = io.StringIO(file.stream.read().decode("UTF8"), newline=None)
        csv_reader = csv.DictReader(stream)
        inventory_ref = db.collection('companies').document(company_name).collection('inventory')

        # Validate and upload CSV data
        for row in csv_reader:
            if not all(key in row for key in ["name", "description", "category", "quantity", "price", "supplier"]):
                return jsonify({"error": "Invalid CSV format. Missing required fields"}), 400
            inventory_ref.add(row)

        return jsonify({"message": "CSV uploaded successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400

# Get Inventory API
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

# Add Inventory Item API
@app.route('/api/add-inventory', methods=['POST'])
def add_inventory():
    data = request.json
    company_name = data.get("companyName")
    if not company_name:
        return jsonify({"error": "Company name is required"}), 400

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
@app.route('/api/users', methods=['GET'])
@role_required('admin')
def get_users():
    try:
        # Get the admin's company name
        admin_uid = request.headers.get('uid')  # Pass UID in headers
        admin_data = db.collection('users').document(admin_uid).get().to_dict()
        company_name = admin_data.get('companyName')

        if not company_name:
            return jsonify({"error": "Admin company not found"}), 404

        # Fetch users in the same company
        users = db.collection('users').where('companyName', '==', company_name).stream()
        user_list = [{**user.to_dict(), 'id': user.id} for user in users]
        return jsonify(user_list)
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/api/users/<uid>', methods=['PUT'])
@role_required('admin')
def update_user(uid):
    try:
        # Get the admin's company name
        admin_uid = request.headers.get('uid')  # Pass UID in headers
        admin_data = db.collection('users').document(admin_uid).get().to_dict()
        company_name = admin_data.get('companyName')

        if not company_name:
            return jsonify({"error": "Admin company not found"}), 404

        # Ensure the user being updated belongs to the same company
        user_data = db.collection('users').document(uid).get().to_dict()
        if user_data.get('companyName') != company_name:
            return jsonify({"error": "Cannot update user from another company"}), 403

        # Update user data
        data = request.json
        db.collection('users').document(uid).update(data)
        return jsonify({"message": "User updated successfully"})
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/api/users/<uid>', methods=['DELETE'])
@role_required('admin')
def delete_user(uid):
    try:
        # Get the admin's company name
        admin_uid = request.headers.get('uid')  # Pass UID in headers
        admin_data = db.collection('users').document(admin_uid).get().to_dict()
        company_name = admin_data.get('companyName')

        if not company_name:
            return jsonify({"error": "Admin company not found"}), 404

        # Ensure the user being deleted belongs to the same company
        user_data = db.collection('users').document(uid).get().to_dict()
        if user_data.get('companyName') != company_name:
            return jsonify({"error": "Cannot delete user from another company"}), 403

        # Delete the user
        db.collection('users').document(uid).delete()
        return jsonify({"message": "User deleted successfully"})
    except Exception as e:
        return jsonify({"error": str(e)}), 400

# Assign Role API (Admin Only)
@app.route('/api/assign-role', methods=['POST'])
@role_required('admin')
def assign_role():
    try:
        data = request.json
        uid = data.get("uid")
        role = data.get("role")

        if not uid or not role:
            return jsonify({"error": "UID and role are required"}), 400

        if role not in ["staff", "manager"]:
            return jsonify({"error": "Invalid role"}), 400

        # Get the admin's company name
        admin_uid = request.headers.get('uid')  # Pass UID in headers
        admin_data = db.collection('users').document(admin_uid).get().to_dict()
        company_name = admin_data.get('companyName')

        if not company_name:
            return jsonify({"error": "Admin company not found"}), 404

        # Ensure the user being updated belongs to the same company
        user_data = db.collection('users').document(uid).get().to_dict()
        if user_data.get('companyName') != company_name:
            return jsonify({"error": "Cannot assign role to user from another company"}), 403

        # Ensure the user is a staff member before promoting to manager
        if role == "manager" and user_data.get("role") != "staff":
            return jsonify({"error": "Only staff can be promoted to manager"}), 400

        # Update the user's role
        db.collection('users').document(uid).update({"role": role})
        return jsonify({"message": "Role assigned successfully"})
    except Exception as e:
        return jsonify({"error": str(e)}), 400

# Get Company Users API (Admin Only)
@app.route('/api/company-users', methods=['GET'])  # Updated endpoint path
@role_required('admin')
def get_company_users():
    company = request.args.get('companyName')
    if not company:
        return jsonify({"error": "Company name is required"}), 400

    try:
        users = db.collection('users').where('companyName', '==', company).stream()
        user_list = [{**user.to_dict(), 'id': user.id} for user in users]
        return jsonify(user_list)
    except Exception as e:
        return jsonify({"error": str(e)}), 400

# Reports and Analytics API
@app.route('/api/reports', methods=['GET'])  # Updated endpoint path
def generate_report():
    company = request.args.get('companyName')
    items = db.collection('inventory').where('companyName', '==', company).stream()
    inventory_list = [item.to_dict() for item in items]

    # Generate a simple report (e.g., total items, categories, etc.)
    report = {
        'totalItems': len(inventory_list),
        'categories': list(set(item['category'] for item in inventory_list if 'category' in item)),
    }

    return jsonify(report)

if __name__ == '__main__':
    app.run(debug=True, port=5000)