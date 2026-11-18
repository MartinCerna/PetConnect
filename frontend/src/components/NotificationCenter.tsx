'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
   Bell,
   BellRing,
   Check,
   CheckCheck,
   ExternalLink,
   MapPin,
   Navigation,
   ShieldAlert,
   Smartphone,
   Trash2,
   X,
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { LocalNotifications } from '@capacitor/local-notifications';
import { StatusBar, Style } from '@capacitor/status-bar';
import { apiFetch } from '@/lib/api';
import {
   ensureAndroidNotificationChannel,
   getMobileNotificationPermissionState,
   isCapacitorNative,
   registerServiceWorker,
   requestMobileNotificationPermission,
   showPhoneNotification,
   syncWebPushSubscription,
} from '@/lib/mobileNotifications';

export interface AppNotificationData {
   pet_name?: string;
   distance_meters?: number;
   safe_radius_meters?: number;
   latitude?: number;
   longitude?: number;
   detected_at?: string;
   reminder_id?: string;
   category?: string;
   target_url?: string;
}

export interface AppNotificationItem {
   id: string;
   user_id: string;
   pet_id?: string | null;
   type: string;
   title: string;
   body: string;
   data?: AppNotificationData | null;
   is_read: boolean;
   delivered_mobile: boolean;
   created_at: string;
}

const POLL_PENDING_MS = 15_000;

function formatNotificationDate(iso: string): string {
   try {
      return new Date(iso).toLocaleString('es-PE', {
         day: '2-digit',
         month: 'short',
         hour: '2-digit',
         minute: '2-digit',
      });
   } catch {
      return '';
   }
}

export function useMobileNotificationCenter(enabled: boolean) {
   const router = useRouter();
   const [notifications, setNotifications] = useState<AppNotificationItem[]>([]);
   const [unreadCount, setUnreadCount] = useState(0);
   const [loading, setLoading] = useState(false);
   const [isOpen, setIsOpen] = useState(false);
   const [permissionState, setPermissionState] = useState<
      'granted' | 'denied' | 'default' | 'unsupported'
   >('default');
   const [testing, setTesting] = useState(false);

   const shownIdsRef = useRef<Set<string>>(new Set());

   const refreshPermissionState = useCallback(async () => {
      const state = await getMobileNotificationPermissionState();
      setPermissionState(state);
      return state;
   }, []);

   const loadNotifications = useCallback(async () => {
      if (!enabled) return;
      setLoading(true);
      try {
         const res = await apiFetch('/notifications/');
         if (res.ok) {
            const payload = (await res.json()) as {
               notifications: AppNotificationItem[];
               unread_count: number;
            };
            setNotifications(payload.notifications || []);
            setUnreadCount(payload.unread_count ?? 0);
         }
      } catch {
         // Ignorar fallos momentáneos de red
      } finally {
         setLoading(false);
      }
   }, [enabled]);

   const pollPendingMobile = useCallback(async () => {
      if (!enabled) return;
      try {
         const res = await apiFetch('/notifications/pending-mobile');
         if (!res.ok) return;
         const pending = (await res.json()) as AppNotificationItem[];
         if (!Array.isArray(pending) || pending.length === 0) return;

         const freshToShow = pending.filter((n) => !shownIdsRef.current.has(n.id));
         for (const item of freshToShow) {
            shownIdsRef.current.add(item.id);
            await showPhoneNotification({
               id: item.id,
               title: item.title,
               body: item.body,
               type: item.type,
               data: (item.data || undefined) as Record<string, unknown> | undefined,
            });
         }

         setNotifications((prev) => {
            const existingIds = new Set(prev.map((p) => p.id));
            const merged = [
               ...pending.filter((p) => !existingIds.has(p.id)).reverse(),
               ...prev,
            ];
            return merged.slice(0, 50);
         });
         setUnreadCount((prev) => prev + freshToShow.filter((n) => !n.is_read).length);
      } catch {
         // Silenciar si el teléfono perdió señal temporalmente
      }
   }, [enabled]);

   useEffect(() => {
      if (!enabled) return;

      let cleanupNative = () => {};

      const init = async () => {
         await refreshPermissionState();

         if (isCapacitorNative()) {
            await ensureAndroidNotificationChannel();
            try {
               if (Capacitor.getPlatform() === 'android') {
                  await StatusBar.setOverlaysWebView({ overlay: false });
                  await StatusBar.setBackgroundColor({ color: '#ffffff' });
                  await StatusBar.setStyle({ style: Style.Light });
               }
            } catch {
               // StatusBar opcional
            }

            const actionHandle = await LocalNotifications.addListener(
               'localNotificationActionPerformed',
               (event) => {
                  const target = event.notification.extra?.target_url;
                  if (typeof target === 'string' && target.startsWith('/')) {
                     router.push(target);
                  }
               }
            );

            const appHandle = await CapacitorApp.addListener('appStateChange', ({ isActive }) => {
               if (isActive) {
                  pollPendingMobile();
                  loadNotifications();
               }
            });

            cleanupNative = () => {
               actionHandle.remove().catch(() => {});
               appHandle.remove().catch(() => {});
            };
         } else {
            await registerServiceWorker();
            await syncWebPushSubscription();
         }

         await loadNotifications();
         await pollPendingMobile();
      };

      init();
      const interval = setInterval(pollPendingMobile, POLL_PENDING_MS);

      return () => {
         clearInterval(interval);
         cleanupNative();
      };
   }, [enabled, loadNotifications, pollPendingMobile, refreshPermissionState, router]);

   const enablePhoneNotifications = useCallback(async () => {
      const perm = await requestMobileNotificationPermission();
      setPermissionState(perm);
      if (perm === 'granted') {
         await showPhoneNotification({
            id: `welcome-${Date.now()}`,
            title: '🐾 Alertas PetConnect activadas',
            body: 'Recibirás alertas de Zona Segura y recordatorios directo en este teléfono.',
            type: 'test',
            data: { target_url: '/dashboard' },
         });
      }
      return perm;
   }, []);

   const sendTestNotification = useCallback(async () => {
      setTesting(true);
      try {
         if (permissionState !== 'granted') {
            await enablePhoneNotifications();
         }
         const res = await apiFetch('/notifications/test', { method: 'POST' });
         if (res.ok) {
            const created = (await res.json()) as AppNotificationItem;
            shownIdsRef.current.add(created.id);
            await showPhoneNotification({
               id: created.id,
               title: created.title,
               body: created.body,
               type: created.type,
               data: (created.data || undefined) as Record<string, unknown> | undefined,
            });
            setNotifications((prev) => [created, ...prev.filter((n) => n.id !== created.id)]);
            setUnreadCount((prev) => prev + 1);
         }
      } finally {
         setTesting(false);
      }
   }, [enablePhoneNotifications, permissionState]);

   const markAsRead = useCallback(async (id: string) => {
      setNotifications((prev) =>
         prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      try {
         await apiFetch(`/notifications/${id}/read`, { method: 'PUT' });
      } catch {
         loadNotifications();
      }
   }, [loadNotifications]);

   const markAllRead = useCallback(async () => {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
      try {
         await apiFetch('/notifications/read-all', { method: 'PUT' });
      } catch {
         loadNotifications();
      }
   }, [loadNotifications]);

   const deleteOne = useCallback(async (id: string) => {
      let wasUnread = false;
      setNotifications((prev) => {
         const target = prev.find((n) => n.id === id);
         wasUnread = Boolean(target && !target.is_read);
         return prev.filter((n) => n.id !== id);
      });
      if (wasUnread) {
         setUnreadCount((prev) => Math.max(0, prev - 1));
      }
      try {
         await apiFetch(`/notifications/${id}`, { method: 'DELETE' });
      } catch {
         loadNotifications();
      }
   }, [loadNotifications]);

   const clearAll = useCallback(async () => {
      setNotifications([]);
      setUnreadCount(0);
      try {
         await apiFetch('/notifications/clear-all', { method: 'DELETE' });
      } catch {
         loadNotifications();
      }
   }, [loadNotifications]);

   return {
      notifications,
      unreadCount,
      loading,
      isOpen,
      setIsOpen,
      permissionState,
      testing,
      refreshList: loadNotifications,
      enablePhoneNotifications,
      sendTestNotification,
      markAsRead,
      markAllRead,
      deleteOne,
      clearAll,
   };
}

interface NotificationCenterDrawerProps {
   isOpen: boolean;
   onClose: () => void;
   notifications: AppNotificationItem[];
   unreadCount: number;
   loading: boolean;
   permissionState: 'granted' | 'denied' | 'default' | 'unsupported';
   testing: boolean;
   onEnablePhone: () => Promise<unknown>;
   onSendTest: () => Promise<void>;
   onMarkAsRead: (id: string) => Promise<void>;
   onMarkAllRead: () => Promise<void>;
   onDeleteOne: (id: string) => Promise<void>;
   onClearAll: () => Promise<void>;
}

export function NotificationCenterDrawer({
   isOpen,
   onClose,
   notifications,
   unreadCount,
   loading,
   permissionState,
   testing,
   onEnablePhone,
   onSendTest,
   onMarkAsRead,
   onMarkAllRead,
   onDeleteOne,
   onClearAll,
}: NotificationCenterDrawerProps) {
   const router = useRouter();

   if (!isOpen) return null;

   return (
      <div className="fixed inset-0 z-[70] flex justify-end">
         {/* Backdrop */}
         <div
            onClick={onClose}
            className="fixed inset-0 bg-black/45 backdrop-blur-xs transition-opacity"
            aria-hidden="true"
         />

         {/* Panel lateral / móvil */}
         <aside className="relative z-10 w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-l border-neutral-200">
            {/* Cabecera */}
            <div className="px-5 py-4 border-b border-neutral-200 flex items-center justify-between bg-gradient-to-r from-pink-50/80 to-white">
               <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-pink-600 text-white flex items-center justify-center shadow-sm">
                     <BellRing className="w-5 h-5" />
                  </div>
                  <div>
                     <div className="flex items-center gap-2">
                        <h2 className="font-extrabold text-base text-neutral-900">
                           Notificaciones
                        </h2>
                        {unreadCount > 0 && (
                           <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[11px] font-bold">
                              {unreadCount}
                           </span>
                        )}
                     </div>
                     <p className="text-[11px] text-neutral-500">
                        Alertas directas en tu teléfono
                     </p>
                  </div>
               </div>

               <button
                  onClick={onClose}
                  className="p-2 rounded-xl text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition"
                  aria-label="Cerrar notificaciones"
               >
                  <X className="w-5 h-5" />
               </button>
            </div>

            {/* Estado de permisos en el teléfono */}
            <div className="p-4 border-b border-neutral-100 bg-neutral-50/70 space-y-2.5">
               <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-semibold">
                     <Smartphone className="w-4 h-4 text-pink-600 shrink-0" />
                     {permissionState === 'granted' ? (
                        <span className="text-emerald-700">
                           Notificaciones en teléfono activas
                        </span>
                     ) : permissionState === 'denied' ? (
                        <span className="text-rose-700">
                           Permiso bloqueado en ajustes del teléfono
                        </span>
                     ) : (
                        <span className="text-amber-700">
                           Activa las notificaciones de tu teléfono
                        </span>
                     )}
                  </div>

                  {permissionState === 'granted' && (
                     <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                        <Check className="w-3 h-3" /> Listo
                     </span>
                  )}
               </div>

               <div className="flex flex-wrap gap-2">
                  {permissionState !== 'granted' && permissionState !== 'unsupported' && (
                     <button
                        type="button"
                        onClick={() => onEnablePhone()}
                        className="flex-1 py-2 px-3 bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center justify-center gap-1.5"
                     >
                        <Bell className="w-3.5 h-3.5" />
                        Activar en mi Teléfono
                     </button>
                  )}

                  <button
                     type="button"
                     onClick={() => onSendTest()}
                     disabled={testing}
                     className="flex-1 py-2 px-3 bg-white hover:bg-neutral-100 text-neutral-700 border border-neutral-200 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 disabled:opacity-60"
                  >
                     <BellRing className="w-3.5 h-3.5 text-pink-600" />
                     {testing ? 'Enviando...' : 'Probar en Teléfono'}
                  </button>
               </div>
            </div>

            {/* Acciones de lista */}
            {notifications.length > 0 && (
               <div className="px-4 py-2.5 border-b border-neutral-100 flex items-center justify-between text-xs">
                  <button
                     type="button"
                     onClick={() => onMarkAllRead()}
                     className="text-sky-600 hover:text-sky-700 font-semibold flex items-center gap-1"
                  >
                     <CheckCheck className="w-3.5 h-3.5" />
                     Marcar todas leídas
                  </button>
                  <button
                     type="button"
                     onClick={() => onClearAll()}
                     className="text-neutral-400 hover:text-rose-600 font-semibold flex items-center gap-1"
                  >
                     <Trash2 className="w-3.5 h-3.5" />
                     Limpiar historial
                  </button>
               </div>
            )}

            {/* Listado de notificaciones */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
               {loading && notifications.length === 0 ? (
                  <div className="py-12 text-center text-sm text-neutral-400 animate-pulse">
                     Cargando notificaciones...
                  </div>
               ) : notifications.length === 0 ? (
                  <div className="py-16 text-center space-y-2.5">
                     <div className="w-14 h-14 rounded-2xl bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto">
                        <Bell className="w-7 h-7" />
                     </div>
                     <h3 className="text-sm font-bold text-neutral-800">
                        Sin alertas recientes
                     </h3>
                     <p className="text-xs text-neutral-500 max-w-xs mx-auto">
                        Aquí aparecerán todas las salidas de Zona Segura y los recordatorios programados que llegan a tu teléfono.
                     </p>
                  </div>
               ) : (
                  notifications.map((item) => {
                     const isGeofence = item.type === 'geofence_exit';
                     const isReminder =
                        item.type === 'reminder_due' || item.type === 'reminder_created';
                     const lat = item.data?.latitude;
                     const lon = item.data?.longitude;
                     const hasCoords =
                        typeof lat === 'number' && typeof lon === 'number';
                     const targetUrl = item.data?.target_url || '/dashboard';

                     return (
                        <div
                           key={item.id}
                           onClick={() => {
                              if (!item.is_read) onMarkAsRead(item.id);
                           }}
                           className={`rounded-2xl border p-3.5 transition-all cursor-pointer ${
                              item.is_read
                                 ? 'bg-white border-neutral-200/80'
                                 : isGeofence
                                   ? 'bg-rose-50/70 border-rose-200 shadow-xs'
                                   : 'bg-pink-50/50 border-pink-200 shadow-xs'
                           }`}
                        >
                           <div className="flex items-start justify-between gap-2.5">
                              <div className="flex items-start gap-2.5 min-w-0">
                                 <div
                                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                                       isGeofence
                                          ? 'bg-rose-600 text-white'
                                          : isReminder
                                            ? 'bg-pink-600 text-white'
                                            : 'bg-emerald-600 text-white'
                                    }`}
                                 >
                                    {isGeofence ? (
                                       <ShieldAlert className="w-4 h-4" />
                                    ) : isReminder ? (
                                       <BellRing className="w-4 h-4" />
                                    ) : (
                                       <Smartphone className="w-4 h-4" />
                                    )}
                                 </div>

                                 <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                       {!item.is_read && (
                                          <span className="w-2 h-2 rounded-full bg-pink-600 shrink-0" />
                                       )}
                                       <h3 className="text-xs sm:text-sm font-bold text-neutral-900 leading-snug">
                                          {item.title}
                                       </h3>
                                    </div>
                                    <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
                                       {item.body}
                                    </p>
                                    <p className="text-[10px] text-neutral-400 mt-1.5 font-medium">
                                       {formatNotificationDate(item.created_at)}
                                    </p>
                                 </div>
                              </div>

                              <button
                                 type="button"
                                 onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteOne(item.id);
                                 }}
                                 className="p-1.5 text-neutral-300 hover:text-rose-600 rounded-lg hover:bg-neutral-100 shrink-0"
                                 aria-label="Eliminar notificación"
                              >
                                 <Trash2 className="w-3.5 h-3.5" />
                              </button>
                           </div>

                           {/* Acciones rápidas */}
                           <div className="flex flex-wrap gap-1.5 mt-3 pt-2.5 border-t border-neutral-100">
                              {hasCoords && (
                                 <>
                                    <a
                                       href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&travelmode=walking`}
                                       target="_blank"
                                       rel="noopener noreferrer"
                                       onClick={(e) => e.stopPropagation()}
                                       className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold transition"
                                    >
                                       <Navigation className="w-3 h-3" />
                                       Ir en Google Maps
                                    </a>
                                    <a
                                       href={`https://waze.com/ul?ll=${lat},${lon}&navigate=yes`}
                                       target="_blank"
                                       rel="noopener noreferrer"
                                       onClick={(e) => e.stopPropagation()}
                                       className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 text-[11px] font-bold transition"
                                    >
                                       <MapPin className="w-3 h-3" />
                                       Waze
                                    </a>
                                 </>
                              )}

                              <button
                                 type="button"
                                 onClick={(e) => {
                                    e.stopPropagation();
                                    if (!item.is_read) onMarkAsRead(item.id);
                                    onClose();
                                    router.push(targetUrl);
                                 }}
                                 className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-[11px] font-semibold transition"
                              >
                                 <ExternalLink className="w-3 h-3" />
                                 Abrir sección
                              </button>
                           </div>
                        </div>
                     );
                  })
               )}
            </div>
         </aside>
      </div>
   );
}
