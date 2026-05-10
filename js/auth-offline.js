/**
 * Oriental v3.0 - Offline-Capable Authentication
 * Local-first auth with Firebase sync
 * Allows login even without internet connection
 */

class OfflineAuth {
    constructor() {
        this.currentUser = null;
        this.authMethod = 'local'; // 'local' or 'firebase'
        this.listeners = [];
        this.offlineCredentials = null;
    }

    async init() {
        // Load cached credentials
        await this.loadCachedUser();
        
        // Listen for Firebase auth changes
        auth.onAuthStateChanged(async (user) => {
            if (user && this.authMethod === 'firebase') {
                this.currentUser = user;
                await this.cacheUser(user);
                this.notifyListeners(true);
            }
        });
        
        // If we have cached user and no Firebase, work offline
        if (!auth.currentUser && this.offlineCredentials) {
            this.currentUser = this.offlineCredentials;
            this.authMethod = 'local';
            this.notifyListeners(true);
            console.log('✅ Offline auth: using cached credentials');
        }
    }

    async login(email, password) {
        try {
            // Try Firebase auth first
            if (navigator.onLine) {
                try {
                    const result = await auth.signInWithEmailAndPassword(email, password);
                    this.currentUser = result.user;
                    this.authMethod = 'firebase';
                    await this.cacheUser(result.user, { email, password });
                    this.notifyListeners(true);
                    return { success: true, method: 'firebase' };
                } catch (firebaseError) {
                    // If Firebase fails but we have cached credentials, try offline
                    if (this.offlineCredentials && 
                        this.offlineCredentials.email === email) {
                        console.log('Firebase auth failed, using offline auth');
                        this.currentUser = this.offlineCredentials;
                        this.authMethod = 'local';
                        this.notifyListeners(true);
                        return { success: true, method: 'offline' };
                    }
                    throw firebaseError;
                }
            } else {
                // Offline - use cached credentials
                if (this.offlineCredentials && 
                    this.offlineCredentials.email === email) {
                    this.currentUser = this.offlineCredentials;
                    this.authMethod = 'local';
                    this.notifyListeners(true);
                    return { success: true, method: 'offline' };
                }
                throw new Error('No internet connection and no cached credentials');
            }
        } catch (error) {
            return { success: false, error: this.getErrorMessage(error) };
        }
    }

    async signup(email, password, name) {
        if (!navigator.onLine) {
            return { success: false, error: 'Signup requires internet connection' };
        }

        try {
            const result = await auth.createUserWithEmailAndPassword(email, password);
            await result.user.updateProfile({ displayName: name });
            
            // Create user document
            await db.collection('users').doc(result.user.uid).set({
                name,
                email,
                createdAt: new Date().toISOString(),
                organizations: [],
                currentOrganization: null,
                preferences: {
                    theme: 'system',
                    language: 'en'
                }
            });

            this.currentUser = result.user;
            this.authMethod = 'firebase';
            await this.cacheUser(result.user, { email, password });
            this.notifyListeners(true);
            
            return { success: true };
        } catch (error) {
            return { success: false, error: this.getErrorMessage(error) };
        }
    }

    async logout() {
        this.currentUser = null;
        this.authMethod = 'local';
        await localDB.clear('userData');
        this.offlineCredentials = null;
        
        if (navigator.onLine) {
            await auth.signOut();
        }
        
        this.notifyListeners(false);
    }

    async cacheUser(user, credentials = null) {
        const userData = {
            key: 'currentUser',
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            lastLogin: Date.now(),
            credentials: credentials ? {
                email: credentials.email,
                // Store password hash only, never plain text
                passwordHash: await this.hashPassword(credentials.password)
            } : null
        };

        await localDB.put('userData', userData);
        
        if (credentials) {
            this.offlineCredentials = userData;
        }
    }

    async loadCachedUser() {
        try {
            const cached = await localDB.get('userData', 'currentUser');
            if (cached && cached.lastLogin > Date.now() - 30 * 24 * 60 * 60 * 1000) {
                this.offlineCredentials = cached;
            }
        } catch (error) {
            console.log('No cached user found');
        }
    }

    async hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hash = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(hash))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    getCurrentUser() {
        return this.currentUser;
    }

    isOnline() {
        return navigator.onLine;
    }

    getAuthMethod() {
        return this.authMethod;
    }

    onAuthChange(callback) {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(cb => cb !== callback);
        };
    }

    notifyListeners(isAuthenticated) {
        this.listeners.forEach(cb => cb(isAuthenticated, this.currentUser));
    }

    getErrorMessage(error) {
        const messages = {
            'auth/invalid-email': 'Invalid email address',
            'auth/user-not-found': 'Account not found',
            'auth/wrong-password': 'Incorrect password',
            'auth/email-already-in-use': 'Email already registered',
            'auth/weak-password': 'Password too weak (min 6 chars)',
            'auth/network-request-failed': 'Network error'
        };
        
        return messages[error.code] || error.message || 'Authentication failed';
    }
}

const offlineAuth = new OfflineAuth();