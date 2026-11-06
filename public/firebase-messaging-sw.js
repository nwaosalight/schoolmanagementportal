/* Firebase Cloud Messaging service worker (web push). Fill in the same config as .env.local. */
importScripts('https://www.gstatic.com/firebasejs/11.1.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.1.0/firebase-messaging-compat.js');
firebase.initializeApp({
  apiKey: 'YOUR_API_KEY', authDomain: 'YOUR_PROJECT.firebaseapp.com', projectId: 'YOUR_PROJECT',
  messagingSenderId: 'YOUR_SENDER_ID', appId: 'YOUR_APP_ID',
});
const messaging = firebase.messaging();
messaging.onBackgroundMessage((p) => {
  const n = p.notification || {};
  self.registration.showNotification(n.title || 'School Results Portal', { body: n.body, icon: '/icon.svg', data: p.data });
});
