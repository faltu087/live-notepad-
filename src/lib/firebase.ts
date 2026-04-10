import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// IMPORTANT: Replace with your web app's Firebase configuration.
// You can get this from the Firebase console.
const firebaseConfig = {
  apiKey: "AIzaSyBqcvXooLL0sWllB4_VAsi5ynYCd9VjaiU",
  authDomain: "studio-5712186428-696d8.firebaseapp.com",
  projectId: "studio-5712186428-696d8",
  storageBucket: "studio-5712186428-696d8.firebasestorage.app",
  messagingSenderId: "978349529145",
  appId: "1:978349529145:web:63eff373487aa5a2ae15e8",
};

// Initialize Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const db = getFirestore(app);

export { app, db };
