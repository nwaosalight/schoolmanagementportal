import { getMessaging, getToken, isSupported } from 'firebase/messaging';
import { app } from './client';
import { env } from '@/config/env';

/** Requests permission and returns an FCM token. Sending pushes requires a Cloud Function/server (see README). */
export async function enablePush(): Promise<string> {
  if (!(await isSupported())) throw new Error('Push notifications are not supported in this browser.');
  if (!env.vapidKey) throw new Error('Push is not configured (missing NEXT_PUBLIC_FIREBASE_VAPID_KEY).');
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('Notification permission was not granted.');
  const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
  return getToken(getMessaging(app), { vapidKey: env.vapidKey, serviceWorkerRegistration: reg });
}
