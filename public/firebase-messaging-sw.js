// Service Worker oficial do Firebase Cloud Messaging (FCM Web Push)
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBFgUpjKe8XzR6J1JTK7hjyuHx4LZFIWkc",
  authDomain: "app-forte-6f756.firebaseapp.com",
  projectId: "app-forte-6f756",
  storageBucket: "app-forte-6f756.firebasestorage.app",
  messagingSenderId: "271847567425",
  appId: "1:271847567425:web:32c758ea6d9ecb672c56c0"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Notificação recebida em segundo plano:', payload);
  const title = payload.notification?.title || payload.data?.title || 'Forte Engenharia';
  const options = {
    body: payload.notification?.body || payload.data?.body || 'Nova notificação do sistema',
    icon: 'https://tnwbnjksbhskgyqdibsu.supabase.co/storage/v1/object/public/assets/logo_forte.png',
    badge: 'https://tnwbnjksbhskgyqdibsu.supabase.co/storage/v1/object/public/assets/logo_forte.png',
    data: payload.data?.url || '/'
  };

  self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const targetUrl = event.notification.data || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
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
