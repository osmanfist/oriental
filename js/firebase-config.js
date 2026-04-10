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
const firebaseConfig = {
    apiKey:            typeof import_meta_env !== 'undefined' ? import_meta_env.VITE_FIREBASE_API_KEY            : '',
    authDomain:        typeof import_meta_env !== 'undefined' ? import_meta_env.VITE_FIREBASE_AUTH_DOMAIN        : '',
    projectId:         typeof import_meta_env !== 'undefined' ? import_meta_env.VITE_FIREBASE_PROJECT_ID         : '',
    storageBucket:     typeof import_meta_env !== 'undefined' ? import_meta_env.VITE_FIREBASE_STORAGE_BUCKET     : '',
    messagingSenderId: typeof import_meta_env !== 'undefined' ? import_meta_env.VITE_FIREBASE_MESSAGING_SENDER_ID: '',
    appId:             typeof import_meta_env !== 'undefined' ? import_meta_env.VITE_FIREBASE_APP_ID             : ''
};

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

// Initialise Firebase (once, here — do not call initializeApp anywhere else)
firebase.initializeApp(firebaseConfig);

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
