const CACHE_NAME = 'tesla-tv-cache-v1'; // Nom du cache, incrémente cette version à chaque modification des ressources à cacher
const urlsToCache = [
  '/', // Met en cache la page d'accueil
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.json',
  '/favicon.ico', // Ton favicon
  // Les dépendances externes (CDN), assure-toi qu'elles sont stables
  'https://cdn.jsdelivr.net/npm/hls.js@latest',
  'https://mikefri.github.io/Teslatv/image.jpg', // L'image de remplacement de ton lecteur vidéo
  // Ajoute ici TOUTES les icônes de ta PWA générées par RealFaviconGenerator ou autre
  // Assure-toi que les chemins correspondent exactement à l'emplacement réel de tes fichiers d'icônes
  '/icons/android-chrome-72x72.png',  // Exemple de nom après génération
  '/icons/favicon-96x96.png',
  '/icons/android-chrome-128x128.png',
  '/icons/android-chrome-144x144.png',
  '/icons/android-chrome-152x152.png',
  '/icons/android-chrome-192x192.png',
  '/icons/android-chrome-384x384.png',
  '/icons/favicon-512x512.png'
  // N'oublie pas d'inclure toutes les autres ressources statiques importantes (polices, autres images, etc.)
];

// Événement 'install' : se déclenche lors de l'installation du Service Worker
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installation...');
  event.waitUntil(
    caches.open(CACHE_NAME) // Ouvre le cache avec le nom défini
      .then((cache) => {
        console.log('[Service Worker] Cache ouvert, ajout des ressources.');
        return cache.addAll(urlsToCache); // Ajoute toutes les ressources listées dans urlsToCache au cache
      })
      .catch((error) => {
        console.error('[Service Worker] Échec de l\'ajout des ressources au cache :', error);
      })
  );
});

// Événement 'fetch' : se déclenche à chaque requête réseau (pour les ressources demandées par la page)
self.addEventListener('fetch', (event) => {
  // Ignorer les requêtes non-GET pour éviter les problèmes avec les requêtes POST, etc.
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request) // Tente de trouver la requête dans le cache
      .then((response) => {
        // Si la ressource est dans le cache, la retourne
        if (response) {
          console.log(`[Service Worker] Ressource récupérée du cache : ${event.request.url}`);
          return response;
        }

        // Si la ressource n'est pas dans le cache, tente de la récupérer du réseau
        console.log(`[Service Worker] Récupération réseau : ${event.request.url}`);
        return fetch(event.request).then(
          (response) => {
            // Vérifie si la réponse est valide
            // Si la réponse n'est pas valide (ex: 404, 500, erreur réseau), ne la met pas en cache
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone la réponse car une réponse ne peut être lue qu'une seule fois
            const responseToCache = response.clone();

            // Met la nouvelle ressource en cache
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
                console.log(`[Service Worker] Ressource mise en cache : ${event.request.url}`);
              });

            return response;
          }
        ).catch((error) => {
          // Gère les erreurs réseau
          console.error(`[Service Worker] Échec de la récupération réseau pour ${event.request.url} :`, error);
          // Optionnel : tu peux retourner une page hors ligne ici si c'est une navigation principale
          // return caches.match('/offline.html');
        });
      })
  );
});

// Événement 'activate' : se déclenche lorsque le Service Worker est activé
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activation...');
  const cacheWhitelist = [CACHE_NAME]; // Liste des caches que nous voulons conserver

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Supprime les anciens caches qui ne sont pas dans la liste blanche
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log(`[Service Worker] Suppression de l'ancien cache : ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Important : revendiquer immédiatement le contrôle des clients non contrôlés
  // Cela permet au nouveau service worker de prendre le contrôle des pages existantes
  return self.clients.claim();
});