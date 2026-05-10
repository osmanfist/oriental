/**
 * Oriental v3.0 - Offline-First Service Worker
 * Enables full offline functionality
 */

const CACHE_NAME = 'oriental-v3';
const RUNTIME_CACHE = 'oriental-runtime';

// Resources to cache immediately on install
const PRECACHE_RESOURCES = [
    '/',
    '/dashboard.html',
    '/login.html',
    '/index.html',
    '/css/main.css',
    '/css/variables.css',
    '/css/themes.css',
    '/css/reset.css',
    '/css/animations.css',
    '/css/components.css',
    '/css/layout.css',
    '/css/dashboard.css',
    '/css/responsive.css',
    '/js/db.js',
    '/js/sync.js',
    '/js/charts.js',
    '/js/icons.js',
    '/js/auth-offline.js',
    '/js/network.js',
    '/js/utils.js',
    '/js/auth.js',
    '/js/roles.js',
    '/js/app.js',
    '/js/tasks.js',
    '/js/board.js',
    '/js/ui.js',
    '/js/teams.js',
    '/js/milestones.js',
    '/js/reports.js',
    '/js/admin.js',
    '/js/seed.js',
    '/js/firebase-config.js',
    '/manifest.json'
];

// Install event - cache core resources one by one (more resilient)
self.addEventListener('install', (event) => {
    console.log('🔄 Service Worker installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('📦 Caching core resources...');
                // Cache one at a time to avoid failing all if one fails
                return Promise.allSettled(
                    PRECACHE_RESOURCES.map(url =>
                        cache.add(url).catch(err => {
                            console.warn('⚠️ Failed to cache:', url, err.message);
                        })
                    )
                );
            })
            .then(() => {
                console.log('✅ Service Worker installed');
                return self.skipWaiting();
            })
            .catch(err => {
                console.error('❌ Service Worker install failed:', err);
            })
    );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
    console.log('🔄 Service Worker activating...');
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
        }).then(() => {
            console.log('✅ Service Worker activated');
            return self.clients.claim();
        })
    );
});

// Fetch event - Network first, fallback to cache
self.addEventListener('fetch', (event) => {
    // Skip Firebase, analytics, and chrome-extension requests
    const url = event.request.url;
    if (url.includes('firestore.googleapis.com') ||
        url.includes('google-analytics.com') ||
        url.includes('firebaseio.com') ||
        url.includes('googleapis.com') ||
        url.includes('gstatic.com') ||
        url.includes('chrome-extension')) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then(response => {
                // Cache successful GET responses
                if (event.request.method === 'GET' && response.status === 200) {
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
                        
                        // Return dashboard for navigation requests
                        if (event.request.mode === 'navigate') {
                            return caches.match('/dashboard.html');
                        }
                        
                        // Return empty response for other requests
                        return new Response('', {
                            status: 503,
                            statusText: 'Offline'
                        });
                    });
            })
    );
});

// Handle messages
self.addEventListener('message', (event) => {
    if (event.data === 'skipWaiting') {
        self.skipWaiting();
    }
    if (event.data === 'clearCache') {
        caches.delete(CACHE_NAME);
        caches.delete(RUNTIME_CACHE);
        console.log('🗑️ Caches cleared');
    }
});

console.log('📡 Service Worker script loaded');