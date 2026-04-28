// sw.js - Updated to exclude Firebase
const CACHE_NAME = 'oriental-v2.1.1';
const urlsToCache = [
    '/',
    '/index.html',
    '/login.html',
    '/dashboard.html',
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
    '/js/firebase-config.js',
    '/js/dashboard.js',
    '/js/mentions.js',
    '/js/attachments.js',
    '/js/recurring-tasks.js',
    '/js/templates.js',
    '/manifest.json'
];

// Install
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(urlsToCache);
        })
    );
});

// Activate - Clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Fetch - Don't intercept Firebase/API calls
self.addEventListener('fetch', (event) => {
    const url = event.request.url;
    
    // Skip Firebase, Firestore, and Google APIs
    if (url.includes('firestore.googleapis.com') ||
        url.includes('firebase') ||
        url.includes('googleapis.com') ||
        url.includes('gstatic.com') ||
        url.includes('google-analytics.com') ||
        url.includes('googletagmanager.com') ||
        url.includes('cdn.jsdelivr.net') ||
        url.includes('cdnjs.cloudflare.com')) {
        // Let the browser handle these directly
        return;
    }
    
    // Cache-first strategy for local assets
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request).then((fetchResponse) => {
                // Cache new requests for future
                if (fetchResponse && fetchResponse.status === 200) {
                    const responseClone = fetchResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return fetchResponse;
            });
        }).catch(() => {
            // Offline fallback
            if (event.request.destination === 'document') {
                return caches.match('/dashboard.html');
            }
        })
    );
});