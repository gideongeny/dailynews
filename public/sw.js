// Service Worker Self-Destruct v1.0.3
self.addEventListener('install', (event) => {
    console.log('🚮 SW: Self-destruct install');
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('🚮 SW: Self-destruct activate. Unregistering...');
    event.waitUntil(
        self.registration.unregister()
            .then(() => {
                console.log('🚮 SW: Successfully unregistered.');
                return self.clients.matchAll();
            })
            .then((clients) => {
                clients.forEach(client => {
                    if (client.url && 'navigate' in client) {
                        client.navigate(client.url);
                    }
                });
            })
    );
});

// Dummy listeners to prevent errors
self.addEventListener('fetch', (event) => {
    // Just fetch from network
});
