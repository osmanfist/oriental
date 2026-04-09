/**
 * Oriental - Firebase Configuration
 * Version: 1.0.0
 * 
 * IMPORTANT: Replace the placeholder values with your actual Firebase project configuration.
 * You can find these values in your Firebase Console > Project Settings > General
 */

// Firebase configuration object
// TODO: Replace with your own Firebase project config
const firebaseConfig = {
  apiKey: "AIzaSyAvpRHzvlTkUqk2vTo_98K_QrpNmLCtgqw",
  authDomain: "oriental-8982d.firebaseapp.com",
  projectId: "oriental-8982d",
  storageBucket: "oriental-8982d.firebasestorage.app",
  messagingSenderId: "1069834803185",
  appId: "1:1069834803185:web:cbaa6fe37568dec7b29650"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = firebase.auth();           // Authentication service
const db = firebase.firestore();        // Firestore database service

// Configure Firestore settings
// Enable offline persistence for better performance and offline support
db.enablePersistence({ synchronizeTabs: true })
    .catch((err) => {
        if (err.code === 'failed-precondition') {
            console.warn('Multiple tabs open, persistence disabled in this tab');
        } else if (err.code === 'unimplemented') {
            console.warn('Browser doesn\'t support persistence');
        }
    });

// Configure Auth settings
// Set persistence to LOCAL so user stays logged in
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
    .catch((err) => {
        console.error('Auth persistence error:', err);
    });

// Export services for use in other modules
// (These are globally available since scripts are loaded in order)
console.log('Firebase initialized successfully');