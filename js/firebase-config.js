/**
 * Oriental - Firebase Configuration
 * Version: 1.1.0
 *
 * SETUP: Copy .env.example to .env and fill in your Firebase project values.
 * For a no-build setup, replace the import.meta.env references below with
 * your actual values — but DO NOT commit real credentials to version control.
 *
 * Find your config in: Firebase Console → Project Settings → General → Your apps
 */

// ---------------------------------------------------------------------------
// Configuration
// For Vite / webpack builds, load from environment variables:
//   VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, etc.
//
// For plain HTML/JS (no build tool), replace each import.meta.env value with
// the corresponding string from your Firebase console, and add firebase-config.js
// to your .gitignore.
// ---------------------------------------------------------------------------

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// Use environment variables for production
const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyAvpRHzvlTkUqk2vTo_98K_QrpNmLCtgqw",
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "oriental-8982d.firebaseapp.com",
    projectId: process.env.VITE_FIREBASE_PROJECT_ID || "oriental-8982d",
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "oriental-8982d.firebasestorage.app",
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1069834803185",
    appId: process.env.VITE_FIREBASE_APP_ID || "1:1069834803185:web:cbaa6fe37568dec7b29650"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);



// ---------------------------------------------------------------------------
// NOTE for contributors using a plain HTML setup (no build tool):
// Replace the object above with your own values directly, e.g.:
//
//   const firebaseConfig = {
//     apiKey: "AIzaSy...",
//     authDomain: "your-project.firebaseapp.com",
//     ...
//   };
//
// Then add this file to .gitignore so secrets never reach version control.
// See .env.example for the full list of required variables.
// ---------------------------------------------------------------------------


// ---- Service references (globally available to scripts loaded after this) ----
const auth = firebase.auth();
const db   = firebase.firestore();

// Offline persistence — lets the app work with no network after first load
db.enablePersistence({ synchronizeTabs: true })
    .catch((err) => {
        if (err.code === 'failed-precondition') {
            // Multiple tabs open — only one tab can use persistence at a time
            console.warn('Offline persistence disabled: multiple tabs detected');
        } else if (err.code === 'unimplemented') {
            console.warn('Offline persistence not supported by this browser');
        }
    });

// Keep the user signed in across page refreshes
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
    .catch((err) => console.error('Auth persistence error:', err));

console.log('Firebase initialised');
