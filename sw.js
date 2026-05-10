/**
 * Oriental v3.0 - Offline-First Service Worker
 * Aggressive caching strategy for resource-constrained environments
 * Enables full offline functionality
 */

const CACHE_NAME = 'oriental-v3';
const RUNTIME_CACHE = 'oriental-runtime';

// Resources to cache immediately on install
const PRECACHE_RESOURCES = [
    '/',
    '/dashboard.html',
    '/login.html',
    '/css/main.css',
    '/css/variables.css',
    '/css/themes.css',
    '/css/reset.css',
    '/css/animations.css',
    '/css/components.css',
    '/css/layout.css',
    '/css/responsive.css',
    '/js/db.js',
    '/js/sync.js',
    '/js/charts.js',
    '/js/icons.js',
    '/js/auth-offline.js',
    '/js/utils.js',
    '/js/app.js',
    '/js/tasks.js',
    '/js/board.js',
    '/js/ui.js',
    '/js/teams.js',
    '/js/milestones.js',
    '/js/reports.js',
    '/js/admin.js',
    '/js/roles.js',
    '/js/seed.js',
    '/manifest.json'
];

// Install event - cache all core resources
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('🔄 Caching core resources...');
                return cache.addAll(PRECACHE_RESOURCES);
            })
            .then(() => {
                console.log('✅ Core resources cached');
                return self.skipWaiting();
            })
    );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames
                    .filter(name => name !== CACHE_NAME && name !== RUNTIME_CACHE)
                    .map(name => {
                        console.log('🗑️ Deleting old cache:', name);
                        return caches.delete(name);
                    })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch event - Network first, fallback to cache
self.addEventListener('fetch', (event) => {
    // Skip Firebase and analytics requests
    if (event.request.url.includes('firestore.googleapis.com') ||
        event.request.url.includes('google-analytics.com') ||
        event.request.url.includes('firebaseio.com')) {
        return;
    }

    event.respondWith(
        // Try network first
        fetch(event.request)
            .then(response => {
                // Cache successful responses
                if (response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(RUNTIME_CACHE).then(cache => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => {
                // Network failed - try cache
                return caches.match(event.request)
                    .then(cachedResponse => {
                        if (cachedResponse) {
                            return cachedResponse;
                        }
                        
                        // Return offline page for navigation requests
                        if (event.request.mode === 'navigate') {
                            return caches.match('/dashboard.html');
                        }
                        
                        return new Response('Offline - Resource not cached', {
                            status: 503,
                            statusText: 'Service Unavailable'
                        });
                    });
            })
    );
});

// Handle messages from the app
self.addEventListener('message', (event) => {
    if (event.data === 'skipWaiting') {
        self.skipWaiting();
    }
    
    if (event.data === 'clearCache') {
        caches.delete(CACHE_NAME);
        caches.delete(RUNTIME_CACHE);
    }
});

// Background sync for offline changes
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-data') {
        event.waitUntil(syncOfflineData());
    }
});

async function syncOfflineData() {
    // This would sync any queued changes when back online
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
        client.postMessage({ type: 'sync-triggered' });
    });
}