/**
 * Oriental v3.0 - Firebase Configuration
 * Offline-first architecture with Firestore sync
 * Reuses existing Firebase project: oriental-8982d
 */

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

// Initialize services
const auth = firebase.auth();
const db = firebase.firestore();

// Enable offline persistence (critical for v3.0 architecture)
db.enablePersistence({ synchronizeTabs: true })
    .then(() => {
        console.log('✅ Firestore offline persistence enabled');
    })
    .catch((err) => {
        if (err.code === 'failed-precondition') {
            console.warn('⚠️ Offline persistence disabled: multiple tabs open');
        } else if (err.code === 'unimplemented') {
            console.warn('⚠️ Offline persistence not supported by this browser');
        } else {
            console.error('Firestore persistence error:', err);
        }
    });

// Configure Firestore settings for better offline support
db.settings({
    cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED,
    merge: true
});

// Keep user signed in across sessions
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
    .catch((err) => console.error('Auth persistence error:', err));

// Log initialization
console.log('✅ Firebase initialized | Project: oriental-8982d');
console.log('📡 Offline-first mode: IndexedDB + Firestore sync');