'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, CalendarClock, Cpu, MapPin, QrCode } from 'lucide-react';

interface MobileBottomNavProps {
   unreadCount: number;
   onOpenNotifications: () => void;
}

export default function MobileBottomNav({
   unreadCount,
   onOpenNotifications,
}: MobileBottomNavProps) {
   const pathname = usePathname();

   const navItemClass = (active: boolean) =>
      `flex flex-col items-center justify-center flex-1 py-1.5 gap-0.5 text-[11px] font-semibold transition-colors relative ${
         active ? 'text-pink-600' : 'text-neutral-500 hover:text-neutral-800'
      }`;

   return (
      <nav
         aria-label="Navegación móvil"
         className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-neutral-200 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] pb-[env(safe-area-inset-bottom)]"
      >
         <div className="flex items-stretch justify-around h-16 px-1">
            <Link href="/dashboard" className={navItemClass(pathname === '/dashboard')}>
               {pathname === '/dashboard' && (
                  <span className="absolute top-0 w-8 h-0.5 rounded-full bg-pink-600" />
               )}
               <MapPin className="w-5 h-5" />
               <span>Mapa</span>
            </Link>

            <Link
               href="/dashboard/recordatorios"
               className={navItemClass(pathname === '/dashboard/recordatorios')}
            >
               {pathname === '/dashboard/recordatorios' && (
                  <span className="absolute top-0 w-8 h-0.5 rounded-full bg-pink-600" />
               )}
               <CalendarClock className="w-5 h-5" />
               <span>Cuidados</span>
            </Link>

            <button
               type="button"
               onClick={onOpenNotifications}
               className={navItemClass(false)}
               aria-label="Abrir notificaciones"
            >
               <div className="relative">
                  <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'text-pink-600' : ''}`} />
                  {unreadCount > 0 && (
                     <span className="absolute -top-1.5 -right-2 min-w-[17px] h-[17px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-extrabold flex items-center justify-center shadow-xs">
                        {unreadCount > 9 ? '9+' : unreadCount}
                     </span>
                  )}
               </div>
               <span className={unreadCount > 0 ? 'text-pink-600 font-bold' : ''}>
                  Alertas
               </span>
            </button>

            <Link
               href="/dashboard/contacto"
               className={navItemClass(pathname === '/dashboard/contacto')}
            >
               {pathname === '/dashboard/contacto' && (
                  <span className="absolute top-0 w-8 h-0.5 rounded-full bg-pink-600" />
               )}
               <QrCode className="w-5 h-5" />
               <span>Placa QR</span>
            </Link>

            <Link
               href="/dashboard/dispositivos"
               className={navItemClass(pathname === '/dashboard/dispositivos')}
            >
               {pathname === '/dashboard/dispositivos' && (
                  <span className="absolute top-0 w-8 h-0.5 rounded-full bg-pink-600" />
               )}
               <Cpu className="w-5 h-5" />
               <span>Collar</span>
            </Link>
         </div>
      </nav>
   );
}
