from flask import Blueprint, request, jsonify
from firebase_admin import firestore
from db_init import db  

tasks_bp = Blueprint('tasks', __name__)

@tasks_bp.route('/tasks', methods=['GET'])
def get_tasks():
    company_name = request.headers.get('companyName')
    if not company_name:
        return jsonify({"error": "Company name is required"}), 400

    tasks_ref = db.collection('companies').document(company_name).collection('tasks')
    tasks_snap = tasks_ref.order_by("createdAt", direction=firestore.Query.DESCENDING).stream()

    tasks_list = []
    for doc in tasks_snap:
        data = doc.to_dict()
        data["id"] = doc.id
        tasks_list.append(data)

    return jsonify(tasks_list), 200

@tasks_bp.route('/tasks', methods=['POST'])
def create_task():
    company_name = request.headers.get('companyName')
    if not company_name:
        return jsonify({"error": "Company name is required"}), 400

    data = request.json or {}
    title = data.get("title")
    description = data.get("description", "")
    urgency = data.get("urgency", "low")

    if not title:
        return jsonify({"error": "Task title is required"}), 400

    doc_ref = db.collection("companies").document(company_name).collection("tasks").document()
    doc_ref.set({
        "title": title,
        "description": description,
        "urgency": urgency,
        "createdAt": firestore.SERVER_TIMESTAMP
    })

    return jsonify({"message": "Task created successfully"}), 201

@tasks_bp.route('/low-stock', methods=['GET'])
def get_low_stock():
    company_name = request.headers.get('companyName')
    if not company_name:
        return jsonify({"error": "Company name is required"}), 400

    threshold = 5
    items_ref = db.collection("companies").document(company_name).collection("inventory") \
                 .where("quantity", "<", threshold)
    snap = items_ref.stream()
    items_list = []
    for doc in snap:
        d = doc.to_dict()
        d["id"] = doc.id
        items_list.append(d)

    return jsonify(items_list), 200