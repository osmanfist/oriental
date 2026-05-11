// ============================================
// Oriental - Enhanced Service Worker
// Version: 2.2.0
// Offline-First with Background Sync
// ============================================

const CACHE_VERSION = 'v2.2.0';
const STATIC_CACHE = `oriental-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `oriental-dynamic-${CACHE_VERSION}`;
const API_CACHE = `oriental-api-${CACHE_VERSION}`;
const OFFLINE_QUEUE = 'oriental-offline-queue';

// ============================================
// ASSETS TO CACHE ON INSTALL
// ============================================

const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/login.html',
    '/dashboard.html',
    '/offline.html',
    '/css/main.css',
    '/css/variables.css',
    '/css/themes.css',
    '/css/reset.css',
    '/css/animations.css',
    '/css/buttons.css',
    '/css/forms.css',
    '/css/layout.css',
    '/css/components.css',
    '/css/views.css',
    '/css/utilities.css',
    '/css/responsive.css',
    '/css/effects.css',
    '/css/login.css',
    '/css/index.css',
    '/css/confetti.css',
    '/css/fab.css',
    '/js/firebase-config.js',
'/js/dashboard-core.js',
    '/js/dashboard-projects.js',
    '/js/dashboard-tasks.js',
    '/js/dashboard-board.js',
    '/js/dashboard-sprints.js',
    '/js/dashboard-reports.js',
    '/js/dashboard-settings.js',
    '/js/dashboard-activity.js',
    '/js/dashboard-modals.js',
    '/js/dashboard-init.js',
    '/js/login.js',
    '/js/mentions.js',
    '/js/attachments.js',
    '/js/recurring-tasks.js',
    '/js/templates.js',
    '/js/lang.js',
    '/js/lang/en.js',
    '/js/lang/ar.js',
    '/manifest.json',
    '/icons/icon-192.png',
    '/icons/icon-512.png'
];

// ============================================
// INSTALL EVENT
// ============================================

self.addEventListener('install', (event) => {
    console.log('🔧 Service Worker: Installing v2.2.0...');
    
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => {
                console.log('📦 Caching static assets...');
                return Promise.allSettled(
                    STATIC_ASSETS.map(url => 
                        cache.add(url).catch(err => {
                            console.warn(`⚠️ Failed to cache: ${url}`, err);
                        })
                    )
                );
            })
            .then(() => {
                console.log('✅ Static assets cached');
                return self.skipWaiting();
            })
    );
});

// ============================================
// ACTIVATE EVENT
// ============================================

self.addEventListener('activate', (event) => {
    console.log('🚀 Service Worker: Activating v2.2.0...');
    
    event.waitUntil(
        Promise.all([
            // Clean old caches
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter(name => {
                            return name.startsWith('oriental-') && 
                                   !name.includes(CACHE_VERSION);
                        })
                        .map(name => {
                            console.log('🗑️ Deleting old cache:', name);
                            return caches.delete(name);
                        })
                );
            }),
            // Claim all clients immediately
            self.clients.claim()
        ])
    );
    
    // Notify all clients about the update
    self.clients.matchAll().then(clients => {
        clients.forEach(client => {
            client.postMessage({
                type: 'SW_ACTIVATED',
                version: CACHE_VERSION
            });
        });
    });
});

// ============================================
// MESSAGE HANDLERS
// ============================================

self.addEventListener('message', (event) => {
    const { type, data } = event.data || {};
    
    switch (type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;
            
        case 'CACHE_URL':
            if (data?.url) {
                caches.open(DYNAMIC_CACHE).then(cache => {
                    cache.add(data.url);
                });
            }
            break;
            
        case 'CLEAR_CACHES':
            caches.keys().then(names => {
                return Promise.all(names.map(name => caches.delete(name)));
            }).then(() => {
                console.log('🗑️ All caches cleared');
                event.ports[0]?.postMessage({ success: true });
            });
            break;
            
        case 'GET_CACHE_STATS':
            getCacheStats().then(stats => {
                event.ports[0]?.postMessage(stats);
            });
            break;
            
        case 'SYNC_NOW':
            processOfflineQueue().then(result => {
                event.ports[0]?.postMessage(result);
            });
            break;
            
        case 'QUEUE_OFFLINE_ACTION':
            queueOfflineAction(data).then(() => {
                event.ports[0]?.postMessage({ success: true });
            });
            break;
    }
});

// ============================================
// FETCH EVENT - Smart Caching Strategies
// ============================================

self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Skip non-GET requests (let browser handle them)
    if (request.method !== 'GET') {
        // But intercept Firestore writes for offline queue
        if (isFirestoreWrite(request)) {
            event.respondWith(handleOfflineWrite(request));
            return;
        }
        return;
    }
    
    // STRATEGY 1: Network Only - Firebase/Firestore real-time
    if (isFirebaseRequest(url)) {
        event.respondWith(networkOnly(request));
        return;
    }
    
    // STRATEGY 2: Network First - HTML pages (try network, fallback to cache)
    if (request.destination === 'document' || request.mode === 'navigate') {
        event.respondWith(networkFirstWithOfflineFallback(request));
        return;
    }
    
    // STRATEGY 3: Cache First - Static assets (JS, CSS, fonts, icons)
    if (isStaticAsset(url) || request.destination === 'style' || 
        request.destination === 'script' || request.destination === 'font' ||
        request.destination === 'image') {
        event.respondWith(cacheFirst(request));
        return;
    }
    
    // STRATEGY 4: Network First with API Cache - API calls
    if (isApiRequest(url)) {
        event.respondWith(networkFirstWithApiCache(request));
        return;
    }
    
    // STRATEGY 5: Stale While Revalidate - Everything else
    event.respondWith(staleWhileRevalidate(request));
});

// ============================================
// CACHING STRATEGIES
// ============================================

/**
 * Network Only - Always fetch from network
 */
async function networkOnly(request) {
    try {
        return await fetch(request);
    } catch (error) {
        return new Response(JSON.stringify({ error: 'offline', message: 'No network connection' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

/**
 * Cache First - Return cached, update cache in background
 */
async function cacheFirst(request) {
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
        // Update cache in background (stale-while-revalidate for static assets)
        fetch(request).then(freshResponse => {
            if (freshResponse.ok) {
                caches.open(STATIC_CACHE).then(cache => {
                    cache.put(request, freshResponse);
                });
            }
        }).catch(() => {});
        
        return cachedResponse;
    }
    
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        // Return a placeholder for images
        if (request.destination === 'image') {
            return new Response(
                '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect fill="#f3f4f6" width="200" height="200"/><text fill="#9ca3af" x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" font-size="16">Offline</text></svg>',
                { headers: { 'Content-Type': 'image/svg+xml' } }
            );
        }
        throw error;
    }
}

/**
 * Network First - Try network, fallback to cache
 */
async function networkFirst(request) {
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        throw error;
    }
}

/**
 * Network First with Offline Fallback - For HTML pages
 */
async function networkFirstWithOfflineFallback(request) {
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        // Try to return the cached version
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        // Return offline fallback page
        const offlinePage = await caches.match('/offline.html');
        if (offlinePage) {
            return offlinePage;
        }
        // Ultimate fallback
        return new Response(
            `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline - Oriental</title><style>body{font-family:Inter,system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f9fafb;color:#374151;text-align:center;padding:20px;box-sizing:border-box}.container{max-width:400px}.icon{font-size:64px;margin-bottom:20px}h1{font-size:24px;margin-bottom:8px}p{color:#6b7280;margin-bottom:20px}.btn{display:inline-block;padding:10px 24px;background:#16a34a;color:#fff;border-radius:8px;text-decoration:none;font-weight:500}</style></head><body><div class="container"><div class="icon">🏔️</div><h1>You're Offline</h1><p>Oriental needs an internet connection to sync your data.</p><button class="btn" onclick="location.reload()">Try Again</button></div></body></html>`,
            { headers: { 'Content-Type': 'text/html' } }
        );
    }
}

/**
 * Stale While Revalidate - Return cached, update from network
 */
async function staleWhileRevalidate(request) {
    const cachedResponse = await caches.match(request);
    
    const fetchPromise = fetch(request).then(networkResponse => {
        if (networkResponse.ok) {
            caches.open(DYNAMIC_CACHE).then(cache => {
                cache.put(request, networkResponse.clone());
            });
        }
        return networkResponse;
    }).catch(() => {
        // Network failed, that's OK if we have cache
    });
    
    return cachedResponse || fetchPromise;
}

/**
 * Network First with API Cache - For API calls
 * Cache successful responses for 5 minutes
 */
async function networkFirstWithApiCache(request) {
    try {
        const networkResponse = await fetch(request.clone());
        
        if (networkResponse.ok) {
            const cache = await caches.open(API_CACHE);
            const clonedResponse = networkResponse.clone();
            // Store with timestamp for cache invalidation
            const responseWithTimestamp = new Response(clonedResponse.body, {
                status: clonedResponse.status,
                statusText: clonedResponse.statusText,
                headers: {
                    ...Object.fromEntries(clonedResponse.headers.entries()),
                    'sw-cached-at': Date.now().toString()
                }
            });
            cache.put(request, responseWithTimestamp);
        }
        
        return networkResponse;
    } catch (error) {
        // Try cache
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            const cachedAt = cachedResponse.headers.get('sw-cached-at');
            if (cachedAt && (Date.now() - parseInt(cachedAt)) < 300000) { // 5 min
                return cachedResponse;
            }
        }
        
        // Return stale cache even if expired
        if (cachedResponse) {
            return cachedResponse;
        }
        
        return new Response(JSON.stringify({ 
            error: 'offline', 
            message: 'Data unavailable offline' 
        }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// ============================================
// OFFLINE WRITE QUEUE
// ============================================

/**
 * Check if request is a Firestore write operation
 */
function isFirestoreWrite(request) {
    const url = new URL(request.url);
    return (
        (url.hostname.includes('firestore.googleapis.com') ||
         url.hostname.includes('firebaseio.com')) &&
        ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)
    );
}

/**
 * Handle offline writes by queuing them for later
 */
async function handleOfflineWrite(request) {
    try {
        // Try to send the request directly
        return await fetch(request.clone());
    } catch (error) {
        // Queue for later
        const queuedRequest = {
            id: generateId(),
            url: request.url,
            method: request.method,
            headers: Object.fromEntries(request.headers.entries()),
            body: await request.clone().text(),
            timestamp: Date.now(),
            retries: 0
        };
        
        await queueOfflineAction(queuedRequest);
        
        // Return optimistic response
        return new Response(JSON.stringify({
            queued: true,
            message: 'Action saved offline. Will sync when online.'
        }), {
            status: 202,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

/**
 * Queue an action to be processed when online
 */
async function queueOfflineAction(action) {
    const db = await openOfflineDB();
    const tx = db.transaction(OFFLINE_QUEUE, 'readwrite');
    const store = tx.objectStore(OFFLINE_QUEUE);
    await store.add(action);
    await tx.complete;
    
    // Register for background sync if available
    if ('sync' in self.registration) {
        try {
            await self.registration.sync.register('offline-queue');
        } catch (syncError) {
            console.warn('Background sync not available:', syncError);
        }
    }
    
    // Notify clients about queued action
    notifyClients({
        type: 'ACTION_QUEUED',
        offlineCount: await getOfflineQueueCount()
    });
}

/**
 * Process all queued offline actions
 */
async function processOfflineQueue() {
    const db = await openOfflineDB();
    const tx = db.transaction(OFFLINE_QUEUE, 'readonly');
    const store = tx.objectStore(OFFLINE_QUEUE);
    const actions = await store.getAll();
    await tx.complete;
    
    if (actions.length === 0) {
        return { processed: 0, remaining: 0 };
    }
    
    console.log(`🔄 Processing ${actions.length} queued actions...`);
    
    let processed = 0;
    let failed = [];
    
    const MAX_RETRIES = 3;
    
    for (const action of actions) {
        try {
            const response = await fetch(action.url, {
                method: action.method,
                headers: action.headers,
                body: action.body || undefined
            });
            
            if (response.ok || response.status < 500) {
                // Success - remove from queue
                await removeFromQueue(action.id);
                processed++;
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.error(`Failed to process action ${action.id}:`, error);
            
            if (action.retries < MAX_RETRIES) {
                await updateRetryCount(action.id, action.retries + 1);
            } else {
                await removeFromQueue(action.id);
            }
            failed.push(action.id);
        }
    }
    
    const remaining = await getOfflineQueueCount();
    
    notifyClients({
        type: 'SYNC_COMPLETE',
        processed,
        failed: failed.length,
        remaining
    });
    
    return { processed, failed: failed.length, remaining };
}

// ============================================
// BACKGROUND SYNC
// ============================================

self.addEventListener('sync', (event) => {
    if (event.tag === 'offline-queue') {
        console.log('🔄 Background sync triggered');
        event.waitUntil(processOfflineQueue());
    }
});

// ============================================
// PUSH NOTIFICATIONS (Optional)
// ============================================

self.addEventListener('push', (event) => {
    const data = event.data?.json() || {};
    
    const options = {
        body: data.body || 'You have a new notification from Oriental',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        vibrate: [200, 100, 200],
        data: {
            url: data.url || '/dashboard.html',
            taskId: data.taskId,
            type: data.type || 'general'
        },
        actions: [
            {
                action: 'open',
                title: 'Open'
            },
            {
                action: 'dismiss',
                title: 'Dismiss'
            }
        ],
        tag: data.tag || 'oriental-notification',
        renotify: true
    };
    
    event.waitUntil(
        self.registration.showNotification(
            data.title || 'Oriental',
            options
        )
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    if (event.action === 'dismiss') {
        return;
    }
    
    const url = event.notification.data?.url || '/dashboard.html';
    
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((windowClients) => {
                // Check if there is already a window open
                for (const client of windowClients) {
                    if (client.url.includes(url) && 'focus' in client) {
                        return client.focus();
                    }
                }
                // Open new window
                if (clients.openWindow) {
                    return clients.openWindow(url);
                }
            })
    );
});

// ============================================
// ONLINE/OFFLINE DETECTION
// ============================================

self.addEventListener('online', () => {
    console.log('🌐 Back online!');
    notifyClients({ type: 'ONLINE' });
    processOfflineQueue();
});

self.addEventListener('offline', () => {
    console.log('📡 Gone offline');
    notifyClients({ type: 'OFFLINE' });
});

// ============================================
// INDEXEDDB FOR OFFLINE QUEUE
// ============================================

function openOfflineDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('OrientalOfflineDB', 1);
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(OFFLINE_QUEUE)) {
                db.createObjectStore(OFFLINE_QUEUE, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('offline-tasks')) {
                db.createObjectStore('offline-tasks', { keyPath: 'tempId' });
            }
        };
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function removeFromQueue(id) {
    const db = await openOfflineDB();
    const tx = db.transaction(OFFLINE_QUEUE, 'readwrite');
    await tx.objectStore(OFFLINE_QUEUE).delete(id);
    await tx.complete;
}

async function updateRetryCount(id, retries) {
    const db = await openOfflineDB();
    const tx = db.transaction(OFFLINE_QUEUE, 'readwrite');
    const store = tx.objectStore(OFFLINE_QUEUE);
    const item = await store.get(id);
    if (item) {
        item.retries = retries;
        await store.put(item);
    }
    await tx.complete;
}

async function getOfflineQueueCount() {
    const db = await openOfflineDB();
    const tx = db.transaction(OFFLINE_QUEUE, 'readonly');
    const count = await tx.objectStore(OFFLINE_QUEUE).count();
    await tx.complete;
    return count;
}

// ============================================
// CACHE STATISTICS
// ============================================

async function getCacheStats() {
    const cacheNames = await caches.keys();
    const stats = {};
    
    for (const name of cacheNames) {
        const cache = await caches.open(name);
        const keys = await cache.keys();
        stats[name] = keys.length;
    }
    
    stats.offlineQueue = await getOfflineQueueCount();
    stats.totalCaches = Object.values(stats).reduce((a, b) => a + b, 0) - stats.offlineQueue;
    
    return stats;
}

// ============================================
// HELPERS
// ============================================

function isFirebaseRequest(url) {
    return (
        url.hostname.includes('firestore.googleapis.com') ||
        url.hostname.includes('firebaseio.com') ||
        url.hostname.includes('googleapis.com') && url.pathname.includes('firebase') ||
        url.hostname.includes('identitytoolkit.googleapis.com') ||
        url.pathname.includes('__/auth/')
    );
}

function isStaticAsset(url) {
    const staticExtensions = ['.js', '.css', '.woff', '.woff2', '.ttf', '.png', '.jpg', '.jpeg', '.svg', '.ico', '.webp', '.json'];
    return staticExtensions.some(ext => url.pathname.endsWith(ext));
}

function isApiRequest(url) {
    // Non-Firebase API endpoints
    return (
        url.pathname.includes('/api/') ||
        url.pathname.includes('/rest/') ||
        url.hostname.includes('api.') && !isFirebaseRequest(url)
    );
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

async function notifyClients(data) {
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach(client => {
        client.postMessage(data);
    });
}

// ============================================
// PERIODIC CLEANUP
// ============================================

// Clean up old API cache entries every hour
setInterval(async () => {
    const cache = await caches.open(API_CACHE);
    const keys = await cache.keys();
    const now = Date.now();
    const MAX_AGE = 3600000; // 1 hour
    
    for (const request of keys) {
        const response = await cache.match(request);
        const cachedAt = response?.headers.get('sw-cached-at');
        if (cachedAt && (now - parseInt(cachedAt)) > MAX_AGE) {
            await cache.delete(request);
        }
    }
}, 3600000);

console.log('✅ Service Worker v2.2.0 initialized with enhanced offline support');