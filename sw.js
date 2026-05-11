// Nom du cache (change la version quand tu mets à jour l'HTML/CSS)
const CACHE_NAME = 'hab-relais-celebration-v1';

// Liste des fichiers critiques à mettre en cache immédiatement
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/icon-192.png',
    '/icon-512.png',
    // Ajoute ici tes fichiers CSS ou JS externes si tu en crées (ex: /style.css)
];

// 1. Installation : Met en cache les fichiers statiques
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('[SW] Mise en cache des ressources statiques');
            return cache.addAll(STATIC_ASSETS);
        })
    );
});

// 2. Activation : Nettoie les anciens caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(keys.map(key => {
                if (key !== CACHE_NAME) {
                    console.log('[SW] Suppression de l\'ancien cache', key);
                    return caches.delete(key);
                }
            }));
        })
    );
});

// 3. Stratégie de mise en cache : Cache First, then Network
// Sert d'abord depuis le cache, et met à jour le cache en arrière-plan
self.addEventListener('fetch', event => {
    // Ne gère pas les requêtes Socket.io (qui doivent être en direct)
    if (event.request.url.includes('/socket.io/')) {
        return;
    }

    event.respondWith(
        caches.open(CACHE_NAME).then(cache => {
            return cache.match(event.request).then(response => {
                const fetchPromise = fetch(event.request).then(networkResponse => {
                    // Met à jour le cache avec la nouvelle réponse du réseau
                    if (event.request.method === 'GET') {
                        cache.put(event.request, networkResponse.clone());
                    }
                    return networkResponse;
                });

                // Renvoie la réponse du cache si disponible, sinon attend le réseau
                return response || fetchPromise;
            });
        })
    );
});