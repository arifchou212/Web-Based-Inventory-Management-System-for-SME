import React, { createContext, useState, useEffect, useContext } from "react";
import { auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("Auth State Changed:", firebaseUser);

      if (firebaseUser) {
        try {
          // Get company info from localStorage which was stored after login/signup
          const company = localStorage.getItem("company");

          // If company info is available, fetch user doc from companies/{company}/users/{uid}
          let userDocRef;
          if (company) {
            userDocRef = doc(db, "companies", company, "users", firebaseUser.uid);
          } else {
            // Fallback to the top-level "users" collection (if that exists)
            userDocRef = doc(db, "users", firebaseUser.uid);
          }

          const userSnapshot = await getDoc(userDocRef);

          if (userSnapshot.exists()) {
            const userData = userSnapshot.data();
            setUser({ ...userData, uid: firebaseUser.uid, email: firebaseUser.email });
          } else {
            console.log("⚠️ No user doc found in the expected path. Using Firebase auth data only.");
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              role: "user", // Default role
            });
          }
        } catch (error) {
          console.error("🔥 Error fetching user data:", error);
          setUser(null);
        }
      } else {
        console.log("🚪 User logged out.");
        setUser(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);