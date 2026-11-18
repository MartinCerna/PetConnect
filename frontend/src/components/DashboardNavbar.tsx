'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, Download, LogOut, ShoppingCart, Smartphone, User, X } from 'lucide-react';
import Logo from './Logo';
import { useAuth } from '@/context/AuthContext';
import { isStandaloneAppMode } from '@/lib/mobileNotifications';

const LINKS = [
   { href: '/dashboard', label: 'Panel' },
   { href: '/dashboard/recordatorios', label: 'Recordatorios' },
   { href: '/dashboard/contacto', label: 'Placa y Contacto' },
   { href: '/dashboard/dispositivos', label: 'Dispositivos' },
];

interface BeforeInstallPromptEvent extends Event {
   prompt: () => Promise<void>;
   userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface DashboardNavbarProps {
   unreadCount?: number;
   onOpenNotifications?: () => void;
}

export default function DashboardNavbar({
   unreadCount = 0,
   onOpenNotifications,
}: DashboardNavbarProps) {
   const { logout, user } = useAuth();
   const router = useRouter();
   const pathname = usePathname();

   const [isAppMode, setIsAppMode] = useState(true);
   const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
   const [showAndroidModal, setShowAndroidModal] = useState(false);

   useEffect(() => {
      setIsAppMode(isStandaloneAppMode());

      const handleBeforeInstall = (e: Event) => {
         e.preventDefault();
         setInstallPrompt(e as BeforeInstallPromptEvent);
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstall);
      return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
   }, []);

   const handleInstallPwa = async () => {
      if (installPrompt) {
         await installPrompt.prompt();
         const choice = await installPrompt.userChoice;
         if (choice.outcome === 'accepted') {
            setInstallPrompt(null);
            setShowAndroidModal(false);
         }
         return;
      }
      setShowAndroidModal(true);
   };

   const handleLogout = () => {
      logout();
      router.push('/?tienda=1');
   };

   return (
      <>
         <nav className="bg-white shadow-sm border-b border-neutral-200 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
               <div className="flex justify-between items-center h-16 gap-2">
                  {/* LOGO: puente hacia la tienda o inicio */}
                  <div className="flex-shrink-0 flex items-center h-full">
                     <Link
                        href={isAppMode ? '/dashboard' : '/?tienda=1'}
                        className="flex items-center gap-2 h-full hover:opacity-80 transition-opacity"
                     >
                        <Logo size={56} className="h-12 w-auto" />
                        <span className="font-bold text-lg sm:text-xl text-pink-600">
                           PetConnect
                        </span>
                     </Link>
                  </div>

                  {/* MENÚ DEL DASHBOARD (escritorio; en móvil se usa la barra inferior) */}
                  <div className="hidden md:flex space-x-6 lg:space-x-8">
                     {LINKS.map(({ href, label }) => (
                        <Link
                           key={href}
                           href={href}
                           className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                              pathname === href
                                 ? 'text-neutral-950 border-pink-500'
                                 : 'text-neutral-500 hover:text-neutral-950 border-transparent'
                           }`}
                        >
                           {label}
                        </Link>
                     ))}
                  </div>

                  {/* ACCIONES, NOTIFICACIONES Y PERFIL */}
                  <div className="flex items-center gap-2 sm:gap-3">
                     {!isAppMode && (
                        <button
                           type="button"
                           onClick={handleInstallPwa}
                           className="flex items-center gap-1.5 text-xs font-bold text-pink-700 bg-pink-50 hover:bg-pink-100 border border-pink-200 px-2.5 sm:px-3 py-2 rounded-xl transition-all"
                           title="Instalar aplicación en Android"
                        >
                           <Smartphone className="w-4 h-4 shrink-0" />
                           <span className="hidden sm:inline">App Android</span>
                        </button>
                     )}

                     {onOpenNotifications && (
                        <button
                           type="button"
                           onClick={onOpenNotifications}
                           className="relative p-2 rounded-xl bg-neutral-100 hover:bg-pink-50 text-neutral-700 hover:text-pink-600 transition-colors"
                           title="Centro de notificaciones"
                           aria-label="Abrir notificaciones"
                        >
                           <Bell className="w-5 h-5" />
                           {unreadCount > 0 && (
                              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-extrabold flex items-center justify-center shadow-sm">
                                 {unreadCount > 9 ? '9+' : unreadCount}
                              </span>
                           )}
                        </button>
                     )}

                     <Link
                        href="/?tienda=1#productos"
                        className="hidden lg:flex items-center gap-2 text-sm font-medium text-white bg-pink-600 hover:bg-pink-700 px-3.5 py-2 rounded-xl shadow-sm transition-all"
                     >
                        <ShoppingCart className="w-4 h-4" />
                        <span>Comprar Tag</span>
                     </Link>

                     <div className="h-6 w-px bg-neutral-200 hidden sm:block"></div>

                     <div className="flex items-center gap-1.5 sm:gap-2">
                        <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center text-sky-700 font-bold border border-sky-200">
                           <User className="w-4 h-4" />
                        </div>
                        {user?.full_name && (
                           <span className="text-xs font-semibold text-neutral-700 hidden lg:block max-w-[120px] truncate">
                              {user.full_name}
                           </span>
                        )}
                        <button
                           onClick={handleLogout}
                           className="p-2 text-neutral-400 hover:text-red-600 rounded-xl hover:bg-red-50 transition-colors"
                           title="Cerrar sesión"
                           aria-label="Cerrar sesión"
                        >
                           <LogOut className="w-5 h-5" />
                        </button>
                     </div>
                  </div>
               </div>
            </div>
         </nav>

         {/* Modal de ayuda para instalar en Android */}
         {showAndroidModal && (
            <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
               <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-neutral-200 space-y-4">
                  <div className="flex items-center justify-between">
                     <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-2xl bg-pink-100 text-pink-600 flex items-center justify-center">
                           <Smartphone className="w-5 h-5" />
                        </div>
                        <div>
                           <h3 className="font-extrabold text-base text-neutral-900">
                              Instalar PetConnect en Android
                           </h3>
                           <p className="text-xs text-neutral-500">
                              Recibe alertas directo en tu teléfono
                           </p>
                        </div>
                     </div>
                     <button
                        type="button"
                        onClick={() => setShowAndroidModal(false)}
                        className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
                     >
                        <X className="w-5 h-5" />
                     </button>
                  </div>

                  <div className="space-y-3 text-xs text-neutral-700">
                     <div className="p-3.5 rounded-2xl bg-pink-50/70 border border-pink-100 space-y-1.5">
                        <p className="font-bold text-pink-900 flex items-center gap-1.5">
                           <Download className="w-4 h-4 text-pink-600" />
                           Opción 1: Instalar directo desde Chrome (10 seg)
                        </p>
                        <p className="leading-relaxed">
                           Abre PetConnect en <strong>Google Chrome</strong> en tu teléfono Android, toca el menú <strong>⋮</strong> arriba a la derecha y selecciona <strong>&ldquo;Instalar aplicación&rdquo;</strong> o <strong>&ldquo;Añadir a pantalla de inicio&rdquo;</strong>.
                        </p>
                     </div>

                     <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-1.5">
                        <p className="font-bold text-neutral-900">
                           Opción 2: Archivo APK nativo de Android
                        </p>
                        <p className="leading-relaxed text-neutral-600">
                           El repositorio genera automáticamente el instalador{' '}
                           <strong>PetConnect-Android.apk</strong> en GitHub Actions para compartirlo con los compradores del collar.
                        </p>
                     </div>
                  </div>

                  <button
                     type="button"
                     onClick={() => setShowAndroidModal(false)}
                     className="w-full py-2.5 bg-pink-600 hover:bg-pink-700 text-white text-sm font-bold rounded-xl transition"
                  >
                     Entendido
                  </button>
               </div>
            </div>
         )}
      </>
   );
}
