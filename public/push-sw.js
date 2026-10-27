// Notifications sur le téléphone (Web Push). Chargé par le service worker généré (workbox.importScripts).
self.addEventListener('push', (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch { d = { titre: event.data ? event.data.text() : '' }; }
  event.waitUntil(self.registration.showNotification(d.titre || 'Mes Loyers', {
    body: d.message || '',
    icon: '/pwa-192x192.png',
    badge: '/pwa-64x64.png',
    tag: d.id,
    lang: 'fr',
    data: { lien: d.lien || '/' },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const lien = (event.notification.data && event.notification.data.lien) || '/';
  event.waitUntil((async () => {
    const fenetres = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const f of fenetres) {
      if (new URL(f.url).origin === self.location.origin) {
        await f.focus();
        f.navigate(lien);
        return;
      }
    }
    await self.clients.openWindow(lien);
  })());
});
