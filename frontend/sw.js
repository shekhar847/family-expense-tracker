const CACHE_NAME = "expenseiq-v2";
const urlsToCache = [
    "/",
    "/index.html",
    "/css/style.css",
    "/js/script.js",
    "/Image/ExpenseIQ-logo.png",
    "https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300&display=swap",
    "https://cdn.jsdelivr.net/npm/chart.js",
    "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"
];

// Install
self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(urlsToCache);
        })
    );
});

// Fetch
self.addEventListener("fetch", event => {
    event.respondWith(
        caches.match(event.request).then(response => {
            // Cache mein hai toh cache se do
            if (response) return response;
            // Nahi hai toh network se lo
            return fetch(event.request).catch(() => {
                // Offline hai toh index.html do
                return caches.match("/index.html");
            });
        })
    );
});

// Activate
self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            );
        })
    );
});
