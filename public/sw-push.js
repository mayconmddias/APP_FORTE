// =============================================================================
// Service Worker Push Handler — Forte Engenharia
// =============================================================================
// Este arquivo é importado pelo SW do Workbox (VitePWA) via importScripts.
// Contém a inicialização do Firebase Cloud Messaging para Web Push.
//
// IMPORTANTE: Este é o ÚNICO handler de push. Não deve existir outro SW
// registrado separadamente (como firebase-messaging-sw.js).
// =============================================================================

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

var messaging = firebase.messaging();

// ---------------------------------------------------------------------------
// Background Message Handler
// ---------------------------------------------------------------------------
// Quando uma "notification message" do FCM chega com a aba em background,
// o FCM SDK exibe automaticamente a notificação usando os campos
// notification/webpush.notification do payload.
//
// Este handler é chamado APÓS o auto-display. NÃO chamar showNotification()
// aqui para evitar notificações duplicadas. Serve apenas para logging.
// ---------------------------------------------------------------------------
messaging.onBackgroundMessage(function(payload) {
  console.log('[sw-push] Mensagem FCM recebida em background:', payload);
  // A notificação já foi exibida automaticamente pelo FCM SDK.
  // Não chamar self.registration.showNotification() aqui.
});

// ---------------------------------------------------------------------------
// Notification Click Handler
// ---------------------------------------------------------------------------
self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  // Extrair URL: o FCM armazena dados em data.FCM_MSG.data quando auto-exibe
  var data = event.notification.data || {};
  var fcmData = (data.FCM_MSG && data.FCM_MSG.data) ? data.FCM_MSG.data : data;
  var targetUrl = fcmData.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
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
