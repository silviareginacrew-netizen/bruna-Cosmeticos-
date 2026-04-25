self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  // Simple pass-through for now to satisfy PWA requirements
});
