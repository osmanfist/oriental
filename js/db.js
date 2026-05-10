/**
 * Oriental v3.0 - Local-First Database Manager
 * IndexedDB for instant operations, Firestore for cloud sync
 * Optimized for offline use and minimal data usage
 * CRASH-PROOF: All methods return safe defaults when DB is not ready
 */

class LocalDB {
    constructor() {
        this.dbName = 'oriental-db';
        this.version = 1;
        this.db = null;
        this.initialized = false;
        this._initPromise = null;
        this.stores = {
            tasks: { keyPath: 'id', indexes: ['projectId', 'status', 'assignedToId', 'updatedAt'] },
            projects: { keyPath: 'id', indexes: ['organizationId'] },
            sprints: { keyPath: 'id', indexes: ['projectId', 'status'] },
            milestones: { keyPath: 'id', indexes: ['projectId'] },
            subtasks: { keyPath: 'id', indexes: ['parentTaskId'] },
            members: { keyPath: 'id', indexes: ['organizationId'] },
            activity: { keyPath: 'id', indexes: ['organizationId', 'createdAt'] },
            syncQueue: { keyPath: 'id', indexes: ['status'] },
            userData: { keyPath: 'key' }
        };
        
        this.cache = new Map();
        this.syncInProgress = false;
    }

    /**
     * Initialize the database - can be called multiple times safely
     */
    async init() {
        // Already initialized
        if (this.db && this.initialized) {
            return;
        }
        
        // Already initializing - return existing promise
        if (this._initPromise) {
            return this._initPromise;
        }

        this._initPromise = new Promise((resolve, reject) => {
            try {
                const request = indexedDB.open(this.dbName, this.version);

                request.onerror = () => {
                    console.error('❌ LocalDB init failed:', request.error);
                    this._initPromise = null;
                    reject(request.error);
                };
                
                request.onsuccess = () => {
                    this.db = request.result;
                    this.initialized = true;
                    
                    this.db.onclose = () => {
                        console.warn('⚠️ LocalDB connection closed');
                        this.db = null;
                        this.initialized = false;
                        this._initPromise = null;
                    };
                    
                    console.log('✅ LocalDB initialized');
                    resolve();
                };

                request.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    console.log('📦 Creating database schema...');
                    
                    for (const [storeName, config] of Object.entries(this.stores)) {
                        if (!db.objectStoreNames.contains(storeName)) {
                            const store = db.createObjectStore(storeName, { keyPath: config.keyPath });
                            if (config.indexes) {
                                config.indexes.forEach(index => {
                                    store.createIndex(index, index, { unique: false });
                                });
                            }
                        }
                    }
                };
            } catch (error) {
                console.error('❌ LocalDB init error:', error);
                this._initPromise = null;
                reject(error);
            }
        });

        try {
            await this._initPromise;
        } catch (error) {
            console.warn('⚠️ LocalDB init failed, app will use Firestore directly');
            // Don't throw - let the app continue without IndexedDB
        }
    }

    /**
     * Check if database is ready
     */
    isReady() {
        return this.db !== null && this.initialized;
    }

    /**
     * Get object store - NEVER throws, returns null if not ready
     */
    _getStore(storeName, mode = 'readonly') {
        if (!this.db || !this.initialized) {
            return null;
        }
        
        if (!this.stores[storeName]) {
            console.warn(`Unknown store: ${storeName}`);
            return null;
        }
        
        try {
            const transaction = this.db.transaction(storeName, mode);
            return transaction.objectStore(storeName);
        } catch (error) {
            console.warn(`Error accessing store "${storeName}":`, error.message);
            return null;
        }
    }

    // ============================================
    // CRUD Operations (NEVER throw, always return safe defaults)
    // ============================================

    async put(storeName, data) {
        const store = this._getStore(storeName, 'readwrite');
        if (!store) {
            // Cache in memory as fallback
            const key = data.id || data.key;
            if (key) this.cache.set(`${storeName}:${key}`, data);
            return null;
        }
        
        try {
            return new Promise((resolve, reject) => {
                const request = store.put(data);
                request.onsuccess = () => {
                    const key = data.id || data.key;
                    if (key) this.cache.set(`${storeName}:${key}`, data);
                    resolve(request.result);
                };
                request.onerror = () => {
                    console.warn(`Put error in ${storeName}:`, request.error);
                    resolve(null);
                };
            });
        } catch (error) {
            console.warn(`put(${storeName}) error:`, error.message);
            const key = data.id || data.key;
            if (key) this.cache.set(`${storeName}:${key}`, data);
            return null;
        }
    }

    async get(storeName, id) {
        // Check memory cache first
        const cacheKey = `${storeName}:${id}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        const store = this._getStore(storeName);
        if (!store) return null;

        try {
            return new Promise((resolve) => {
                const request = store.get(id);
                request.onsuccess = () => {
                    if (request.result) {
                        this.cache.set(cacheKey, request.result);
                    }
                    resolve(request.result || null);
                };
                request.onerror = () => {
                    console.warn(`Get error in ${storeName}:`, request.error);
                    resolve(null);
                };
            });
        } catch (error) {
            console.warn(`get(${storeName}) error:`, error.message);
            return null;
        }
    }

    async getAll(storeName) {
        const store = this._getStore(storeName);
        if (!store) return [];

        try {
            return new Promise((resolve) => {
                const request = store.getAll();
                request.onsuccess = () => resolve(request.result || []);
                request.onerror = () => {
                    console.warn(`GetAll error in ${storeName}:`, request.error);
                    resolve([]);
                };
            });
        } catch (error) {
            console.warn(`getAll(${storeName}) error:`, error.message);
            return [];
        }
    }

    async getByIndex(storeName, indexName, value) {
        const store = this._getStore(storeName);
        if (!store) return [];

        try {
            const index = store.index(indexName);
            if (!index) return [];

            return new Promise((resolve) => {
                const request = index.getAll(value);
                request.onsuccess = () => resolve(request.result || []);
                request.onerror = () => {
                    console.warn(`GetByIndex error in ${storeName}:`, request.error);
                    resolve([]);
                };
            });
        } catch (error) {
            console.warn(`getByIndex(${storeName}, ${indexName}) error:`, error.message);
            return [];
        }
    }

    async delete(storeName, id) {
        const store = this._getStore(storeName, 'readwrite');
        if (!store) {
            this.cache.delete(`${storeName}:${id}`);
            return;
        }

        try {
            return new Promise((resolve) => {
                const request = store.delete(id);
                request.onsuccess = () => {
                    this.cache.delete(`${storeName}:${id}`);
                    resolve();
                };
                request.onerror = () => {
                    console.warn(`Delete error in ${storeName}:`, request.error);
                    resolve();
                };
            });
        } catch (error) {
            console.warn(`delete(${storeName}) error:`, error.message);
            this.cache.delete(`${storeName}:${id}`);
        }
    }

    async clear(storeName) {
        const store = this._getStore(storeName, 'readwrite');
        if (!store) return;

        try {
            return new Promise((resolve) => {
                const request = store.clear();
                request.onsuccess = () => {
                    this.invalidateCache(storeName);
                    resolve();
                };
                request.onerror = () => {
                    console.warn(`Clear error in ${storeName}:`, request.error);
                    resolve();
                };
            });
        } catch (error) {
            console.warn(`clear(${storeName}) error:`, error.message);
        }
    }

    // ============================================
    // Batch Operations
    // ============================================

    async batchPut(storeName, items) {
        if (!items || items.length === 0) return;
        
        const store = this._getStore(storeName, 'readwrite');
        if (!store) {
            // Cache items in memory
            items.forEach(item => {
                const key = item.id || item.key;
                if (key) this.cache.set(`${storeName}:${key}`, item);
            });
            return;
        }

        try {
            const promises = items.map(item => {
                return new Promise((resolve) => {
                    const request = store.put(item);
                    request.onsuccess = () => resolve();
                    request.onerror = () => {
                        console.warn(`BatchPut error for item:`, request.error);
                        resolve();
                    };
                });
            });
            await Promise.all(promises);
        } catch (error) {
            console.warn(`batchPut(${storeName}) error:`, error.message);
        }
    }

    // ============================================
    // Cache Management
    // ============================================

    invalidateCache(storeName) {
        if (!storeName) {
            this.cache.clear();
            return;
        }
        
        for (const key of this.cache.keys()) {
            if (key.startsWith(`${storeName}:`)) {
                this.cache.delete(key);
            }
        }
    }

    clearAllCache() {
        this.cache.clear();
    }

    // ============================================
    // Sync Queue
    // ============================================

    async addToSyncQueue(operation) {
        const id = `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await this.put('syncQueue', {
            id,
            ...operation,
            status: 'pending',
            createdAt: Date.now(),
            retryCount: 0
        });
    }

    async getSyncQueue() {
        const items = await this.getByIndex('syncQueue', 'status', 'pending');
        return items.sort((a, b) => a.createdAt - b.createdAt);
    }

    async markSyncComplete(syncId) {
        const item = await this.get('syncQueue', syncId);
        if (item) {
            item.status = 'completed';
            await this.put('syncQueue', item);
        }
    }

    async markSyncFailed(syncId) {
        const item = await this.get('syncQueue', syncId);
        if (item) {
            item.retryCount++;
            if (item.retryCount >= 5) item.status = 'failed';
            await this.put('syncQueue', item);
        }
    }

    // ============================================
    // Data Loading
    // ============================================

    async loadInitialData(organizationId) {
        try {
            const projectId = app?.state?.currentProject?.id;
            
            const [tasks, projects, sprints, milestones, members] = await Promise.all([
                projectId ? this.getByIndex('tasks', 'projectId', projectId) : this.getAll('tasks'),
                this.getByIndex('projects', 'organizationId', organizationId),
                projectId ? this.getByIndex('sprints', 'projectId', projectId) : [],
                projectId ? this.getByIndex('milestones', 'projectId', projectId) : this.getAll('milestones'),
                this.getByIndex('members', 'organizationId', organizationId)
            ]);

            return { tasks, projects, sprints, milestones, members };
        } catch (error) {
            console.warn('loadInitialData error:', error.message);
            return { tasks: [], projects: [], sprints: [], milestones: [], members: [] };
        }
    }

    // ============================================
    // Storage Stats
    // ============================================

    async getStorageUsage() {
        try {
            if ('storage' in navigator && 'estimate' in navigator.storage) {
                const estimate = await navigator.storage.estimate();
                return {
                    usage: Math.round(estimate.usage / 1024),
                    quota: Math.round(estimate.quota / 1024),
                    percentage: Math.round((estimate.usage / estimate.quota) * 100)
                };
            }
        } catch (error) {
            // Silently fail
        }
        return null;
    }
}

// Create global instance
const localDB = new LocalDB();