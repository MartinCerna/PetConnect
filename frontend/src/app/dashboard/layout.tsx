'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardNavbar from '@/components/DashboardNavbar';
import MobileBottomNav from '@/components/MobileBottomNav';
import CartDrawer from '@/components/CartDrawer';
import {
   NotificationCenterDrawer,
   useMobileNotificationCenter,
} from '@/components/NotificationCenter';
import { useAuth } from '@/context/AuthContext';

export default function DashboardLayout({
   children,
}: {
   children: React.ReactNode;
}) {
   const { token, loading } = useAuth();
   const router = useRouter();
   const notifCenter = useMobileNotificationCenter(Boolean(!loading && token));

   // Guardia de sesión: sin token se redirige al login
   useEffect(() => {
      if (!loading && !token) router.replace('/login?next=/dashboard');
   }, [loading, token, router]);

   if (loading || !token) {
      return (
         <div className="h-screen flex items-center justify-center bg-neutral-50">
            <span className="text-neutral-500 font-medium animate-pulse">Cargando...</span>
         </div>
      );
   }

   return (
      <div className="h-screen bg-neutral-50 flex flex-col overflow-hidden">
         {/* Barra de navegación superior fija */}
         <DashboardNavbar
            unreadCount={notifCenter.unreadCount}
            onOpenNotifications={() => notifCenter.setIsOpen(true)}
         />

         {/* Contenedor principal con margen inferior seguro en móvil para la barra de navegación */}
         <div className="flex flex-1 relative overflow-hidden pb-16 md:pb-0">
            <main className="flex-1 relative w-full h-full overflow-hidden">
               {children}
            </main>
         </div>

         {/* Barra de navegación inferior estilo app Android */}
         <MobileBottomNav
            unreadCount={notifCenter.unreadCount}
            onOpenNotifications={() => notifCenter.setIsOpen(true)}
         />

         {/* Centro de notificaciones del teléfono */}
         <NotificationCenterDrawer
            isOpen={notifCenter.isOpen}
            onClose={() => notifCenter.setIsOpen(false)}
            notifications={notifCenter.notifications}
            unreadCount={notifCenter.unreadCount}
            loading={notifCenter.loading}
            permissionState={notifCenter.permissionState}
            testing={notifCenter.testing}
            onEnablePhone={notifCenter.enablePhoneNotifications}
            onSendTest={notifCenter.sendTestNotification}
            onMarkAsRead={notifCenter.markAsRead}
            onMarkAllRead={notifCenter.markAllRead}
            onDeleteOne={notifCenter.deleteOne}
            onClearAll={notifCenter.clearAll}
         />

         {/* Carrito deslizable accesible dentro del panel y la app Android */}
         <CartDrawer />
      </div>
   );
}
