import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";


const firebaseConfig = {
  apiKey: "AIzaSyBukaMCRyNOmOeTEaKqECuUsuQcukCnDXM",
  authDomain: "web-based-inventory-management.firebaseapp.com",
  projectId: "web-based-inventory-management",
  storageBucket: "web-based-inventory-management.firebasestorage.app",
  messagingSenderId: "70864727944",
  appId: "1:70864727944:web:aaf9bb36b26a84bdad543d",
  measurementId: "G-ZGHN748JM4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const googleProvider = new GoogleAuthProvider();

export { auth, db, googleProvider };