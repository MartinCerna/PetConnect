'use client'; // Agregamos 'use client' si vas a manejar estado o íconos que lo requieran

import Link from 'next/link';
import { ShoppingCart, LogOut, Home, User } from 'lucide-react'; // Asumiendo que usas lucide-react

export default function DashboardNavbar() {
   return (
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">

               {/* LOGO: El puente hacia el inicio */}
               <div className="flex-shrink-0 flex items-center">
                  {/* Este Link lleva siempre a la Landing Page '/' */}
                  <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                     <span className="text-2xl" role="img" aria-label="PetConnect Logo">🐾</span>
                     <span className="font-bold text-xl text-indigo-700 hidden sm:block">PetConnect</span>
                  </Link>
               </div>

               {/* MENÚ DEL DASHBOARD */}
               <div className="hidden md:flex space-x-8">
                  <Link href="/dashboard" className="text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 border-indigo-500 text-sm font-medium">
                     Panel
                  </Link>
                  <Link href="/dashboard/historial" className="text-gray-500 hover:text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium">
                     Historial Médico
                  </Link>
               </div>

               {/* ACCIONES Y PERFIL */}
               <div className="flex items-center gap-4">

                  {/* El botón de compras que lleva a la tienda */}
                  <Link
                     href="/#productos" // Cambia a '/tienda' si tienes una ruta separada
                     className="flex items-center gap-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg shadow-sm transition-all"
                  >
                     <ShoppingCart className="w-4 h-4" />
                     <span className="hidden sm:inline">Comprar Tag</span>
                  </Link>

                  {/* Separador */}
                  <div className="h-6 w-px bg-gray-300 hidden sm:block mx-2"></div>

                  {/* Ícono Home visible solo en móvil */}
                  <Link href="/" className="text-gray-500 hover:text-indigo-600 sm:hidden p-2 rounded-md hover:bg-gray-100">
                     <Home className="w-5 h-5" />
                  </Link>

                  {/* Perfil y Cerrar Sesión */}
                  <div className="flex items-center gap-3">
                     <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold border border-indigo-200">
                        <User className="w-4 h-4" />
                     </div>
                     <button
                        onClick={() => {
                           // Aquí iría tu lógica de AuthContext para cerrar sesión
                           console.log("Cerrar sesión");
                        }}
                        className="p-2 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"
                        title="Cerrar sesión"
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