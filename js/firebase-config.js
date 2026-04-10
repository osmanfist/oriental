/**
 * Oriental - Firebase Configuration
 * Version: 1.0.0
 * 
 * Uses Firebase Compat SDK (for script tag loading)
 */

// Firebase configuration - REPLACE with your actual values
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

// Initialize services (using Compat SDK)
const auth = firebase.auth();
const db = firebase.firestore();

// Enable offline persistence
db.enablePersistence({ synchronizeTabs: true })
    .catch((err) => {
        if (err.code === 'failed-precondition') {
            console.warn('Offline persistence disabled: multiple tabs detected');
        } else if (err.code === 'unimplemented') {
            console.warn('Offline persistence not supported by this browser');
        }
    });

// Keep user signed in across page refreshes
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
    .catch((err) => console.error('Auth persistence error:', err));

console.log('✅ Firebase initialized successfully');