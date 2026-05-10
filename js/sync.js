/**
 * Oriental v3.0 - Background Sync Manager
 * Syncs local IndexedDB changes with Firestore
 * Handles conflict resolution and offline queues
 */

class SyncManager {
    constructor() {
        this.isOnline = navigator.onLine;
        this.isSyncing = false;
        this.syncInterval = null;
        this.listeners = [];
        this.lastSyncTime = null;
        this.syncStats = {
            totalSynced: 0,
            lastSyncDuration: 0,
            conflicts: 0
        };
    }

    async init() {
        // Listen for online/offline events
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
        
        // Start periodic sync
        this.startPeriodicSync();
        
        // Initial sync if online
        if (this.isOnline) {
            await this.fullSync();
        }
        
        console.log('✅ SyncManager initialized');
    }

    async handleOnline() {
        this.isOnline = true;
        console.log('🟢 Online - Starting sync');
        this.notifyListeners('online');
        await this.processSyncQueue();
        await this.fullSync();
    }

    handleOffline() {
        this.isOnline = false;
        console.log('🔴 Offline - Working locally');
        this.notifyListeners('offline');
    }

    async fullSync() {
        if (!this.isOnline || this.isSyncing) return;
        
        this.isSyncing = true;
        const startTime = Date.now();
        
        try {
            // Sync tasks
            await this.syncCollection('tasks', 
                () => db.collection('tasks')
                    .where('organizationId', '==', app.state.currentOrganization)
                    .get()
            );
            
            // Sync projects
            await this.syncCollection('projects',
                () => db.collection('projects')
                    .where('organizationId', '==', app.state.currentOrganization)
                    .get()
            );
            
            // Sync sprints
            if (app.state.currentProject) {
                await this.syncCollection('sprints',
                    () => db.collection('sprints')
                        .where('projectId', '==', app.state.currentProject.id)
                        .get()
                );
            }
            
            // Sync milestones
            await this.syncCollection('milestones',
                () => db.collection('milestones')
                    .where('organizationId', '==', app.state.currentOrganization)
                    .get()
            );
            
            // Sync members
            await this.syncMembers();
            
            this.lastSyncTime = Date.now();
            this.syncStats.lastSyncDuration = Date.now() - startTime;
            this.syncStats.totalSynced++;
            
            console.log(`✅ Sync completed in ${this.syncStats.lastSyncDuration}ms`);
            this.notifyListeners('syncComplete');
            
        } catch (error) {
            console.error('Sync failed:', error);
            this.notifyListeners('syncError');
        } finally {
            this.isSyncing = false;
        }
    }

    async syncCollection(collectionName, firestoreQuery) {
        try {
            // Get cloud data
            const snapshot = await firestoreQuery();
            const cloudData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                _cloudTimestamp: Date.now()
            }));
            
            // Get local data
            const localData = await localDB.getAll(collectionName);
            const localMap = new Map(localData.map(item => [item.id, item]));
            
            // Merge: Cloud wins for newer timestamps, local wins for pending changes
            const merged = [];
            
            for (const cloudItem of cloudData) {
                const localItem = localMap.get(cloudItem.id);
                
                if (!localItem) {
                    // New from cloud - add locally
                    merged.push(cloudItem);
                } else if (localItem._pendingSync) {
                    // Local has pending changes - keep local
                    merged.push(localItem);
                } else {
                    // Use whichever is newer
                    const cloudTime = cloudItem.updatedAt?.toDate?.()?.getTime() || 0;
                    const localTime = localItem.updatedAt || 0;
                    merged.push(cloudTime > localTime ? cloudItem : localItem);
                }
                
                localMap.delete(cloudItem.id);
            }
            
            // Remaining local items (not in cloud) - keep them
            localMap.forEach(item => merged.push(item));
            
            // Update local database
            await localDB.clear(collectionName);
            await localDB.batchPut(collectionName, merged);
            localDB.invalidateCache(collectionName);
            
            return merged;
        } catch (error) {
            console.error(`Error syncing ${collectionName}:`, error);
            // Return local data if sync fails
            return localDB.getAll(collectionName);
        }
    }

    async syncMembers() {
        try {
            const orgDoc = await db.collection('organizations')
                .doc(app.state.currentOrganization)
                .get();
            
            if (orgDoc.exists) {
                const memberIds = orgDoc.data().members || [];
                
                // Fetch user details in batches
                const members = [];
                const batchSize = 10;
                
                for (let i = 0; i < memberIds.length; i += batchSize) {
                    const batch = memberIds.slice(i, i + batchSize);
                    const promises = batch.map(id => 
                        db.collection('users').doc(id).get()
                    );
                    
                    const snapshots = await Promise.all(promises);
                    snapshots.forEach(snap => {
                        if (snap.exists) {
                            members.push({
                                id: snap.id,
                                ...snap.data(),
                                organizationId: app.state.currentOrganization
                            });
                        }
                    });
                }
                
                // Update local database
                await localDB.clear('members');
                await localDB.batchPut('members', members);
                localDB.invalidateCache('members');
            }
        } catch (error) {
            console.error('Error syncing members:', error);
        }
    }

    async processSyncQueue() {
        if (!this.isOnline) return;
        
        const queue = await localDB.getSyncQueue();
        if (queue.length === 0) return;
        
        console.log(`Processing ${queue.length} queued operations...`);
        
        for (const item of queue) {
            try {
                await this.executeSyncOperation(item);
                await localDB.markSyncComplete(item.id);
            } catch (error) {
                console.error(`Sync operation failed:`, error);
                await localDB.markSyncFailed(item.id);
            }
        }
    }

    async executeSyncOperation(operation) {
        const { collection, docId, data, type } = operation;
        
        switch (type) {
            case 'create':
                await db.collection(collection).add(data);
                break;
            case 'update':
                await db.collection(collection).doc(docId).update(data);
                break;
            case 'delete':
                await db.collection(collection).doc(docId).delete();
                break;
        }
    }

    async saveOffline(collection, data, docId = null, type = 'update') {
        // Save to IndexedDB immediately
        const localData = { ...data, _pendingSync: true, updatedAt: Date.now() };
        
        if (docId) {
            localData.id = docId;
            await localDB.put(collection, localData);
        } else {
            const newId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            localData.id = newId;
            await localDB.put(collection, localData);
        }
        
        // Add to sync queue
        await localDB.addToSyncQueue({
            collection,
            docId: docId || localData.id,
            data,
            type: docId ? 'update' : 'create'
        });
        
        // If online, try to sync immediately
        if (this.isOnline) {
            this.processSyncQueue();
        }
        
        return localData;
    }

    startPeriodicSync() {
        // Sync every 5 minutes when online
        this.syncInterval = setInterval(() => {
            if (this.isOnline) {
                this.fullSync();
            }
        }, 300000);
    }

    stopPeriodicSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
    }

    // Network-aware data fetching
    async getData(collectionName, queryFn) {
        // Always return local data first for instant display
        const localData = await localDB.getAll(collectionName);
        
        // If online, sync in background
        if (this.isOnline) {
            setTimeout(() => this.fullSync(), 100);
        }
        
        return localData;
    }

    // Conflict resolution
    resolveConflict(localItem, cloudItem) {
        // Strategy: Last-write-wins based on timestamp
        const localTime = localItem.updatedAt || 0;
        const cloudTime = cloudItem.updatedAt?.toDate?.()?.getTime() || 0;
        
        return cloudTime > localTime ? cloudItem : localItem;
    }

    // Listeners for sync status
    subscribe(callback) {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(cb => cb !== callback);
        };
    }

    notifyListeners(event) {
        this.listeners.forEach(callback => {
            try {
                callback(event, this.syncStats);
            } catch (error) {
                console.error('Sync listener error:', error);
            }
        });
    }

    // Get sync status
    getStatus() {
        return {
            isOnline: this.isOnline,
            isSyncing: this.isSyncing,
            lastSyncTime: this.lastSyncTime,
            ...this.syncStats
        };
    }

    destroy() {
        this.stopPeriodicSync();
        this.listeners = [];
    }
}

const syncManager = new SyncManager();