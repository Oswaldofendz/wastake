const CACHE = 'wastake-v6';
const PRECACHE = ['/', '/index.html'];

// Instalación: pre-cachear el shell de la app
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

// Activación: limpiar cachés viejas
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('wastake-')&&k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Fetch: cache-first para assets estáticos, network-first para API
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if(url.pathname.startsWith('/src/')||url.pathname.startsWith('/@vite/')||url.pathname.startsWith('/node_modules/'))return;

  // Pasar directamente: API backend, Supabase, fonts
  if (
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('supabase') ||
    url.hostname.includes('fonts.googleapis') ||
    url.hostname.includes('fonts.gstatic')
  ) {
    return;
  }

  // Cache-first para assets del frontend (js, css, images)
  if (e.request.method === 'GET') {
    // Check the app shell on the network first so a deployment becomes visible
    // on the next navigation; fall back to the cached page when offline.
    if (e.request.mode === 'navigate'||!/^\/assets\/.+-[\w-]+\.(js|css)$/.test(url.pathname)) {
      e.respondWith(
        fetch(e.request)
          .then(res => {
            if (res.ok) {
              const clone = res.clone();
              caches.open(CACHE).then(c => c.put(e.request, clone));
            }
            return res;
          })
          .catch(async () => {
            const cached=await caches.match(e.request,{cacheName:CACHE});
            if(cached)return cached;
            return e.request.mode==='navigate'?(await caches.match('/index.html',{cacheName:CACHE}))??Response.error():Response.error();
          })
      );
      return;
    }

    e.respondWith(
      caches.match(e.request, { cacheName: CACHE }).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(res => {
          if (res.ok && e.request.url.startsWith(self.location.origin)) {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return res;
        });
      })
    );
  }
});

// Push notifications (para futuras notificaciones push del server)
self.addEventListener('push', e => {
  if (!e.data) return;
  const data = e.data.json();
  e.waitUntil(
    self.registration.showNotification(data.title ?? 'WaStake', {
      body:  data.body ?? '',
      icon:  '/logo-icon.png',
      badge: '/logo-icon.png',
      data:  data,
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window' }).then(cs => {
      const client = cs.find(c => c.url.includes(self.location.origin) && 'focus' in c);
      if (client) return client.focus();
      return clients.openWindow('/#alerts');
    })
  );
});
