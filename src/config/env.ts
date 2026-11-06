const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'demo-school';
export const env = {
  firebase: {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'demo-api-key',
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`,
    projectId,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '000000000000',
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:000000000000:web:demo',
  },
  vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || '',
  useEmulators: process.env.NEXT_PUBLIC_USE_EMULATORS === 'true',
};
