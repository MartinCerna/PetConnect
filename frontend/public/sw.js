/* PetConnect Service Worker para Notificaciones Móviles Android (PWA) */

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

function buildNotificationOptions(payload) {
  const data = payload.data || {};
  const isGeofence = payload.type === 'geofence_exit';
  const hasCoords =
    typeof data.latitude === 'number' && typeof data.longitude === 'number';

  const actions = [{ action: 'open_app', title: '🐾 Ver en PetConnect' }];
  if (hasCoords) {
    actions.unshift({ action: 'open_maps', title: '📍 Abrir Ruta GPS' });
  }

  return {
    body: payload.body || 'Tienes una nueva alerta en PetConnect.',
    icon: '/logo.png',
    badge: '/logo.png',
    vibrate: [250, 100, 250, 100, 400],
    tag:
      data.notification_id ||
      data.reminder_id ||
      `petconnect-${payload.type || 'alert'}-${Date.now()}`,
    renotify: true,
    requireInteraction: isGeofence,
    data: {
      ...data,
      target_url: data.target_url || '/dashboard',
    },
    actions,
  };
}

self.addEventListener('push', (event) => {
  let payload = {
    title: '🐾 PetConnect',
    body: 'Nueva notificación de tu mascota.',
    type: 'alert',
    data: { target_url: '/dashboard' },
  };

  if (event.data) {
    try {
      payload = { ...payload, ...event.data.json() };
    } catch {
      payload.body = event.data.text() || payload.body;
    }
  }

  event.waitUntil(
    self.registration.showNotification(
      payload.title || '🐾 PetConnect',
      buildNotificationOptions(payload)
    )
  );
});

self.addEventListener('message', (event) => {
  if (!event.data || event.data.type !== 'SHOW_SYSTEM_NOTIFICATION') return;
  const payload = event.data.payload || {};
  event.waitUntil(
    self.registration.showNotification(
      payload.title || '🐾 PetConnect',
      buildNotificationOptions(payload)
    )
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};

  if (
    event.action === 'open_maps' &&
    typeof data.latitude === 'number' &&
    typeof data.longitude === 'number'
  ) {
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${data.latitude},${data.longitude}&travelmode=walking`;
    event.waitUntil(self.clients.openWindow(mapsUrl));
    return;
  }

  const targetPath = data.target_url || '/dashboard';
  const targetUrl = new URL(targetPath, self.location.origin).href;

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.startsWith(self.location.origin) && 'focus' in client) {
            if ('navigate' in client) {
              client.navigate(targetUrl);
            }
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
        return undefined;
      })
  );
});
