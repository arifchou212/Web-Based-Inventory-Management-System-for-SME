import React, { createContext, useState, useEffect, useContext } from "react";
import { auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import axios from "axios";
import { findCompanyUserDoc } from "../api/firestoreHelpers"; 

export const AuthContext = createContext();

export const HybridAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);  // user doc + { uid, role, company, etc. }
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        // If not logged in on Firebase, remove local token, set user=null
        localStorage.removeItem("token");
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        // Find user doc in subcollection
        const userDoc = await findCompanyUserDoc(firebaseUser.uid);
        if (!userDoc) {
          console.log("User doc not found in Firestore");
          localStorage.removeItem("token");
          setUser(null);
          setLoading(false);
          return;
        }

        // Get a *custom* JWT from your server for advanced server calls
        // pass the Firebase ID token so the server can verify it
        const idToken = await firebaseUser.getIdToken();
        const tokenRes = await axios.post("/api/issueToken", { idToken });
        // Suppose the server responds with { token, role, company, ... }
        const customToken = tokenRes.data.token;

        // Store that custom token for protected routes
        localStorage.setItem("token", customToken);

        // Merge doc data + server data
        const mergedUser = {
          uid: firebaseUser.uid,
          ...userDoc,              
          ...tokenRes.data,       
        };

        setUser(mergedUser);
      } catch (error) {
        console.error("HybridAuth Error:", error);
        // If there's an error fetching doc or token => remove token, user = null
        localStorage.removeItem("token");
        setUser(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, setUser }}>
      {loading ? <p>Loading...</p> : children}
    </AuthContext.Provider>
  );
};

export const useHybridAuth = () => {
  return useContext(AuthContext);
};
