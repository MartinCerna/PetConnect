'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ShoppingCart, LogOut, Home, User } from 'lucide-react';
import Logo from './Logo';
import { useAuth } from '@/context/AuthContext';

const LINKS = [
   { href: '/dashboard', label: 'Panel' },
   { href: '/dashboard/dispositivos', label: 'Dispositivos' },
];

export default function DashboardNavbar() {
   const { logout } = useAuth();
   const router = useRouter();
   const pathname = usePathname();

   const handleLogout = () => {
      logout();
      router.push('/');
   };

   return (
      <nav className="bg-white shadow-sm border-b border-neutral-200 sticky top-0 z-50">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">

               {/* LOGO: puente hacia la Landing Page */}
               <div className="flex-shrink-0 flex items-center h-full">
                  <Link href="/" className="flex items-center gap-2 h-full hover:opacity-80 transition-opacity">
                     <Logo size={64} className="h-full w-auto" />
                     <span className="font-bold text-xl text-pink-600 hidden sm:block">PetConnect</span>
                  </Link>
               </div>

               {/* MENÚ DEL DASHBOARD */}
               <div className="flex space-x-4 sm:space-x-8">
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

               {/* ACCIONES Y PERFIL */}
               <div className="flex items-center gap-4">
                  <Link
                     href="/#productos"
                     className="flex items-center gap-2 text-sm font-medium text-white bg-pink-600 hover:bg-pink-700 px-4 py-2 rounded-lg shadow-sm transition-all"
                  >
                     <ShoppingCart className="w-4 h-4" />
                     <span className="hidden sm:inline">Comprar Tag</span>
                  </Link>

                  <div className="h-6 w-px bg-neutral-300 hidden sm:block mx-2"></div>

                  <Link
                     href="/"
                     aria-label="Ir al inicio"
                     className="text-neutral-500 hover:text-pink-600 sm:hidden p-2 rounded-md hover:bg-neutral-100"
                  >
                     <Home className="w-5 h-5" />
                  </Link>

                  <div className="flex items-center gap-3">
                     <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center text-sky-700 font-bold border border-sky-200">
                        <User className="w-4 h-4" />
                     </div>
                     <button
                        onClick={handleLogout}
                        className="p-2 text-neutral-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"
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
   );
}
