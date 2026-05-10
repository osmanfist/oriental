/**
 * Oriental v3.0 - Firebase Configuration
 * Offline-first architecture with Firestore sync
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

// IMPORTANT: Configure Firestore settings BEFORE any other calls
db.settings({
    cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED,
    merge: true
});

// Now enable offline persistence (after settings)
db.enablePersistence({ synchronizeTabs: true })
    .then(() => {
        console.log('✅ Firestore offline persistence enabled');
    })
    .catch((err) => {
        if (err.code === 'failed-precondition') {
            console.warn('⚠️ Multiple tabs open - persistence disabled');
        } else if (err.code === 'unimplemented') {
            console.warn('⚠️ Browser does not support offline persistence');
        } else {
            console.error('Firestore persistence error:', err);
        }
    });

// Keep user signed in
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
    .catch((err) => console.error('Auth persistence error:', err));

console.log('✅ Firebase initialized | Project: oriental-8982d');