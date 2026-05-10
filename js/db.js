/**
 * Oriental v3.0 - Local-First Database Manager
 * IndexedDB for instant operations, Firestore for cloud sync
 * Optimized for offline use and minimal data usage
 */

class LocalDB {
    constructor() {
        this.dbName = 'oriental-db';
        this.version = 1;
        this.db = null;
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

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => reject(request.error);
            
            request.onsuccess = () => {
                this.db = request.result;
                console.log('✅ LocalDB initialized');
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
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
        });
    }

    // Generic CRUD Operations
    async put(storeName, data) {
        const store = this.getStore(storeName, 'readwrite');
        return new Promise((resolve, reject) => {
            const request = store.put(data);
            request.onsuccess = () => {
                this.cache.set(`${storeName}:${data.id || data.key}`, data);
                resolve(request.result);
            };
            request.onerror = () => reject(request.error);
        });
    }

    async get(storeName, id) {
        const cacheKey = `${storeName}:${id}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        const store = this.getStore(storeName);
        return new Promise((resolve, reject) => {
            const request = store.get(id);
            request.onsuccess = () => {
                if (request.result) {
                    this.cache.set(cacheKey, request.result);
                }
                resolve(request.result);
            };
            request.onerror = () => reject(request.error);
        });
    }

    async getAll(storeName) {
        const store = this.getStore(storeName);
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getByIndex(storeName, indexName, value) {
        const store = this.getStore(storeName);
        const index = store.index(indexName);
        
        return new Promise((resolve, reject) => {
            const request = index.getAll(value);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async delete(storeName, id) {
        const store = this.getStore(storeName, 'readwrite');
        return new Promise((resolve, reject) => {
            const request = store.delete(id);
            request.onsuccess = () => {
                this.cache.delete(`${storeName}:${id}`);
                resolve();
            };
            request.onerror = () => reject(request.error);
        });
    }

    async clear(storeName) {
        const store = this.getStore(storeName, 'readwrite');
        return new Promise((resolve, reject) => {
            const request = store.clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    getStore(storeName, mode = 'readonly') {
        const transaction = this.db.transaction(storeName, mode);
        return transaction.objectStore(storeName);
    }

    // Batch Operations
    async batchPut(storeName, items) {
        const store = this.getStore(storeName, 'readwrite');
        const promises = items.map(item => {
            return new Promise((resolve, reject) => {
                const request = store.put(item);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        });
        return Promise.all(promises);
    }

    // Cache Management
    invalidateCache(storeName) {
        for (const key of this.cache.keys()) {
            if (key.startsWith(`${storeName}:`)) {
                this.cache.delete(key);
            }
        }
    }

    clearAllCache() {
        this.cache.clear();
    }

    // Sync Queue
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
            if (item.retryCount >= 5) {
                item.status = 'failed';
            }
            await this.put('syncQueue', item);
        }
    }

    // Initial Data Load
    async loadInitialData(organizationId) {
        const projectId = app?.state?.currentProject?.id;
        
        const [tasks, projects, sprints, milestones, members] = await Promise.all([
            projectId ? this.getByIndex('tasks', 'projectId', projectId) : this.getAll('tasks'),
            this.getByIndex('projects', 'organizationId', organizationId),
            this.getByIndex('sprints', 'projectId', projectId || ''),
            projectId ? this.getByIndex('milestones', 'projectId', projectId) : this.getAll('milestones'),
            this.getByIndex('members', 'organizationId', organizationId)
        ]);

        return { tasks, projects, sprints, milestones, members };
    }

    // Storage Stats
    async getStorageUsage() {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            const estimate = await navigator.storage.estimate();
            return {
                usage: Math.round(estimate.usage / 1024), // KB
                quota: Math.round(estimate.quota / 1024), // KB
                percentage: Math.round((estimate.usage / estimate.quota) * 100)
            };
        }
        return null;
    }
}

// Create global instance
const localDB = new LocalDB();