// Web Push Event Handler for Desktop / Web (Forte Engenharia)
self.addEventListener('push', function (event) {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { body: event.data ? event.data.text() : '' };
  }

  const title = data.title || data.notification?.title || '🚨 Notificação Forte';
  const body = data.body || data.notification?.body || data.message || 'Novo alerta de vencimento';
  const options = {
    body: body,
    icon: data.icon || 'https://tnwbnjksbhskgyqdibsu.supabase.co/storage/v1/object/public/assets/logo_forte.png',
    badge: 'https://tnwbnjksbhskgyqdibsu.supabase.co/storage/v1/object/public/assets/logo_forte.png',
    tag: data.tag || ('push-' + Date.now() + '-' + Math.random()),
    renotify: true,
    data: data.url || '/'
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const targetUrl = event.notification.data || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
