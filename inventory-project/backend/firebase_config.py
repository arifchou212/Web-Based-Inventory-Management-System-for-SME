import firebase_admin
from firebase_admin import credentials, auth, firestore
import os
import json

firebase_creds = json.loads(os.environ["FIREBASE_CREDENTIALS"])
cred = credentials.Certificate(firebase_creds)
firebase_admin.initialize_app(cred)

# Firestore Database
db = firestore.client()
