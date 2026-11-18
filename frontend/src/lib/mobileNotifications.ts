// src/lib/mobileNotifications.ts
'use client';

import { Capacitor } from '@capacitor/core';
import { LocalNotifications, Weekday } from '@capacitor/local-notifications';
import { apiFetch } from '@/lib/api';

const ANDROID_CHANNEL_ID = 'petconnect_high_priority';
const REMINDER_ALARM_ID_BASE = 100000;

export interface PhoneNotificationPayload {
   id?: string | number;
   title: string;
   body: string;
   type?: string;
   data?: Record<string, unknown>;
}

export interface SyncableReminder {
   id: string;
   title: string;
   pet_name?: string | null;
   category: string;
   frequency?: string | null;
   time_schedule?: string | null;
   notes?: string | null;
   is_completed: boolean;
   is_active: boolean;
}

export function isCapacitorNative(): boolean {
   if (typeof window === 'undefined') return false;
   try {
      return Capacitor.isNativePlatform();
   } catch {
      return false;
   }
}

export function isStandaloneAppMode(): boolean {
   if (typeof window === 'undefined') return false;
   if (isCapacitorNative()) return true;
   try {
      const displayStandalone = window.matchMedia?.('(display-mode: standalone)').matches;
      const iosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      const appParam = new URLSearchParams(window.location.search).get('app') === '1';
      return Boolean(displayStandalone || iosStandalone || appParam);
   } catch {
      return false;
   }
}

function stableNotificationIntId(rawId?: string | number): number {
   if (typeof rawId === 'number' && Number.isFinite(rawId)) {
      return Math.abs(Math.floor(rawId)) % 2000000000 || 1;
   }
   const str = String(rawId || Date.now());
   let hash = 0;
   for (let i = 0; i < str.length; i += 1) {
      hash = (hash * 31 + str.charCodeAt(i)) | 0;
   }
   return (Math.abs(hash) % 90000) + 1000;
}

export function playPhoneAlertTone(urgent = false): void {
   if (typeof window === 'undefined') return;
   try {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
         navigator.vibrate(urgent ? [250, 100, 250, 100, 350] : [180, 80, 180]);
      }
      const AudioCtx =
         window.AudioContext ||
         (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      const freqs = urgent ? [659.25, 523.25, 783.99] : [587.33, 880];

      freqs.forEach((freq, idx) => {
         const osc = ctx.createOscillator();
         const gain = ctx.createGain();
         osc.type = urgent ? 'triangle' : 'sine';
         osc.frequency.setValueAtTime(freq, now + idx * 0.14);
         gain.gain.setValueAtTime(0.001, now + idx * 0.14);
         gain.gain.exponentialRampToValueAtTime(0.18, now + idx * 0.14 + 0.03);
         gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.14 + 0.15);
         osc.connect(gain);
         gain.connect(ctx.destination);
         osc.start(now + idx * 0.14);
         osc.stop(now + idx * 0.14 + 0.16);
      });
   } catch {
      // Ignorar si el sistema restringe reproducción de audio sin gesto previo
   }
}

export async function ensureAndroidNotificationChannel(): Promise<void> {
   if (!isCapacitorNative()) return;
   try {
      await LocalNotifications.createChannel({
         id: ANDROID_CHANNEL_ID,
         name: 'Alertas PetConnect',
         description: 'Alertas de Zona Segura y Recordatorios de tu mascota',
         importance: 5,
         visibility: 1,
         lights: true,
         lightColor: '#E11D48',
         vibration: true,
      });
   } catch (err) {
      console.warn('No se pudo crear el canal de notificaciones Android:', err);
   }
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
   if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;
   try {
      const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      return registration;
   } catch (err) {
      console.warn('No se pudo registrar el Service Worker:', err);
      return null;
   }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
   const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
   const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
   const rawData = window.atob(base64);
   const buffer = new ArrayBuffer(rawData.length);
   const outputArray = new Uint8Array(buffer);
   for (let i = 0; i < rawData.length; i += 1) {
      outputArray[i] = rawData.charCodeAt(i);
   }
   return outputArray;
}

export async function syncWebPushSubscription(): Promise<void> {
   if (typeof window === 'undefined' || isCapacitorNative()) return;
   if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
   if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

   try {
      const registration = (await registerServiceWorker()) || (await navigator.serviceWorker.ready);
      if (!registration?.pushManager) return;

      const resKey = await apiFetch('/notifications/vapid-public-key');
      if (!resKey.ok) return;
      const { public_key: publicKey } = (await resKey.json()) as { public_key?: string };
      if (!publicKey) return;

      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
         subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey),
         });
      }

      const json = subscription.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return;

      await apiFetch('/notifications/push-subscribe', {
         method: 'POST',
         body: JSON.stringify({
            endpoint: json.endpoint,
            keys: {
               p256dh: json.keys.p256dh,
               auth: json.keys.auth,
            },
            user_agent: navigator.userAgent.slice(0, 250),
         }),
      });
   } catch (err) {
      console.warn('Web Push opcional no suscrito:', err);
   }
}

export async function getMobileNotificationPermissionState(): Promise<
   'granted' | 'denied' | 'default' | 'unsupported'
> {
   if (typeof window === 'undefined') return 'unsupported';

   if (isCapacitorNative()) {
      try {
         const status = await LocalNotifications.checkPermissions();
         if (status.display === 'granted') return 'granted';
         if (status.display === 'denied') return 'denied';
         return 'default';
      } catch {
         return 'default';
      }
   }

   if ('Notification' in window) {
      return Notification.permission;
   }
   return 'unsupported';
}

export async function requestMobileNotificationPermission(): Promise<
   'granted' | 'denied' | 'default'
> {
   if (typeof window === 'undefined') return 'default';

   if (isCapacitorNative()) {
      try {
         await ensureAndroidNotificationChannel();
         const result = await LocalNotifications.requestPermissions();
         return result.display === 'granted'
            ? 'granted'
            : result.display === 'denied'
              ? 'denied'
              : 'default';
      } catch (err) {
         console.error('Error solicitando permiso nativo Android:', err);
         return 'default';
      }
   }

   if (!('Notification' in window)) return 'denied';

   try {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
         await registerServiceWorker();
         await syncWebPushSubscription();
      }
      return perm;
   } catch (err) {
      console.error('Error solicitando permiso de notificaciones:', err);
      return 'default';
   }
}

export async function showPhoneNotification(
   payload: PhoneNotificationPayload
): Promise<boolean> {
   if (typeof window === 'undefined') return false;

   const isUrgent = payload.type === 'geofence_exit';
   playPhoneAlertTone(isUrgent);

   if (isCapacitorNative()) {
      try {
         await ensureAndroidNotificationChannel();
         const perms = await LocalNotifications.checkPermissions();
         if (perms.display !== 'granted') {
            return false;
         }

         const notifId = stableNotificationIntId(payload.id);
         await LocalNotifications.schedule({
            notifications: [
               {
                  id: notifId,
                  title: payload.title,
                  body: payload.body,
                  largeBody: payload.body,
                  summaryText: isUrgent ? 'Alerta Zona Segura' : 'PetConnect',
                  channelId: ANDROID_CHANNEL_ID,
                  foreground: true,
                  autoCancel: true,
                  isExactNotification: false,
                  schedule: {
                     at: new Date(Date.now() + 250),
                     allowWhileIdle: true,
                  },
                  extra: {
                     ...(payload.data || {}),
                     type: payload.type || 'alert',
                  },
               },
            ],
         });
         return true;
      } catch (err) {
         console.error('Error mostrando notificación nativa Android:', err);
         return false;
      }
   }

   if (!('Notification' in window) || Notification.permission !== 'granted') {
      return false;
   }

   try {
      if ('serviceWorker' in navigator) {
         const reg = await navigator.serviceWorker.getRegistration();
         const readyReg = reg || (await navigator.serviceWorker.ready);
         if (readyReg && typeof readyReg.showNotification === 'function') {
            const data = payload.data || {};
            const hasCoords =
               typeof data.latitude === 'number' && typeof data.longitude === 'number';
            const actions: { action: string; title: string }[] = [
               { action: 'open_app', title: '🐾 Ver en PetConnect' },
            ];
            if (hasCoords) {
               actions.unshift({ action: 'open_maps', title: '📍 Abrir Ruta GPS' });
            }

            await readyReg.showNotification(payload.title, {
               body: payload.body,
               icon: '/logo.png',
               badge: '/logo.png',
               tag: String(payload.id || `petconnect-${Date.now()}`),
               requireInteraction: isUrgent,
               data: {
                  ...data,
                  target_url: (data.target_url as string) || '/dashboard',
               },
               ...(actions.length > 0 ? { actions } : {}),
            } as NotificationOptions);
            return true;
         }
      }

      new Notification(payload.title, {
         body: payload.body,
         icon: '/logo.png',
         tag: String(payload.id || `petconnect-${Date.now()}`),
      });
      return true;
   } catch (err) {
      console.error('Error mostrando notificación PWA/Web:', err);
      return false;
   }
}

const WEEKDAY_NAME_TO_CAPACITOR: Record<string, Weekday> = {
   dom: Weekday.Sunday,
   lun: Weekday.Monday,
   mar: Weekday.Tuesday,
   mié: Weekday.Wednesday,
   mie: Weekday.Wednesday,
   jue: Weekday.Thursday,
   vie: Weekday.Friday,
   sáb: Weekday.Saturday,
   sab: Weekday.Saturday,
};

export async function syncNativeReminderAlarms(
   reminders: SyncableReminder[]
): Promise<void> {
   if (!isCapacitorNative()) return;

   try {
      const perms = await LocalNotifications.checkPermissions();
      if (perms.display !== 'granted') return;

      await ensureAndroidNotificationChannel();

      // Cancelar alarmas previas de recordatorios antes de reprogramar
      const pending = await LocalNotifications.getPending();
      const existingReminderIds = pending.notifications
         .filter(
            (n) =>
               n.extra?.petconnectReminderAlarm === true ||
               (n.id >= REMINDER_ALARM_ID_BASE && n.id < REMINDER_ALARM_ID_BASE + 100000)
         )
         .map((n) => ({ id: n.id }));

      if (existingReminderIds.length > 0) {
         await LocalNotifications.cancel({ notifications: existingReminderIds });
      }

      let canUseExact = false;
      try {
         const exactStatus = await LocalNotifications.checkExactNotificationSetting();
         canUseExact = exactStatus.exact_alarm === 'granted';
      } catch {
         canUseExact = false;
      }

      const activeReminders = reminders.filter(
         (r) => r.is_active && !r.is_completed && Boolean(r.time_schedule)
      );

      const toSchedule: Parameters<typeof LocalNotifications.schedule>[0]['notifications'] = [];
      let nextId = REMINDER_ALARM_ID_BASE;

      for (const r of activeReminders) {
         const rawSchedule = (r.time_schedule || '').trim();
         const rawFreq = (r.frequency || '').trim();
         const freqLower = rawFreq.toLowerCase();
         const times = rawSchedule.match(/\b\d{2}:\d{2}\b/g) || [];
         if (times.length === 0) continue;

         const dateMatch = `${rawSchedule} ${rawFreq}`.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
         const matchedWeekdays = Object.entries(WEEKDAY_NAME_TO_CAPACITOR)
            .filter(([token]) => freqLower.includes(token))
            .map(([, weekday]) => weekday);

         const petLabel = r.pet_name ? ` para ${r.pet_name}` : '';
         const bodyText = r.notes
            ? `${r.title}${petLabel} · ${r.notes}`
            : `Es hora de: ${r.title}${petLabel}`;

         for (const hhmm of times) {
            if (toSchedule.length >= 45) break;
            const [hStr, mStr] = hhmm.split(':');
            const hour = Number(hStr);
            const minute = Number(mStr);
            if (!Number.isFinite(hour) || !Number.isFinite(minute)) continue;

            if (dateMatch && freqLower.includes('una sola vez')) {
               const year = Number(dateMatch[1]);
               const month = Number(dateMatch[2]);
               const day = Number(dateMatch[3]);
               const targetDate = new Date(year, month - 1, day, hour, minute, 0);
               if (targetDate.getTime() <= Date.now()) continue;

               toSchedule.push({
                  id: nextId++,
                  title: `🔔 Recordatorio: ${r.title}`,
                  body: bodyText,
                  channelId: ANDROID_CHANNEL_ID,
                  autoCancel: true,
                  isExactNotification: canUseExact,
                  schedule: {
                     at: targetDate,
                     allowWhileIdle: true,
                  },
                  extra: {
                     petconnectReminderAlarm: true,
                     reminder_id: r.id,
                     target_url: '/dashboard/recordatorios',
                  },
               });
            } else if (matchedWeekdays.length > 0) {
               for (const weekday of Array.from(new Set(matchedWeekdays))) {
                  if (toSchedule.length >= 45) break;
                  toSchedule.push({
                     id: nextId++,
                     title: `🔔 Recordatorio: ${r.title}`,
                     body: bodyText,
                     channelId: ANDROID_CHANNEL_ID,
                     autoCancel: true,
                     isExactNotification: canUseExact,
                     schedule: {
                        on: { weekday, hour, minute },
                        repeats: true,
                        allowWhileIdle: true,
                     },
                     extra: {
                        petconnectReminderAlarm: true,
                        reminder_id: r.id,
                        target_url: '/dashboard/recordatorios',
                     },
                  });
               }
            } else {
               toSchedule.push({
                  id: nextId++,
                  title: `🔔 Recordatorio: ${r.title}`,
                  body: bodyText,
                  channelId: ANDROID_CHANNEL_ID,
                  autoCancel: true,
                  isExactNotification: canUseExact,
                  schedule: {
                     on: { hour, minute },
                     repeats: true,
                     allowWhileIdle: true,
                  },
                  extra: {
                     petconnectReminderAlarm: true,
                     reminder_id: r.id,
                     target_url: '/dashboard/recordatorios',
                  },
               });
            }
         }
      }

      if (toSchedule.length > 0) {
         await LocalNotifications.schedule({ notifications: toSchedule });
      }
   } catch (err) {
      console.warn('No se pudieron sincronizar alarmas locales en Android:', err);
   }
}
