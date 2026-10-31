import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

import { firebaseConfig } from "./firebase.js";

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);

signInAnonymously(auth)
  .then(() => {
    console.log("DEVIL SECRET CONNECTED!");
    console.log("User ID:", auth.currentUser.uid);
  })
  .catch((error) => {
    console.error("Firebase Error:", error.message);
  });
