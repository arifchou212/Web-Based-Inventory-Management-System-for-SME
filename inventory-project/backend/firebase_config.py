import firebase_admin
from firebase_admin import credentials, auth, firestore
import os

# Get the absolute path of the file
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CREDENTIALS_PATH = os.path.join(BASE_DIR, "firebase_admin.json")

# Load Firebase credentials
cred = credentials.Certificate(CREDENTIALS_PATH)
firebase_admin.initialize_app(cred)

# Firestore Database
db = firestore.client()