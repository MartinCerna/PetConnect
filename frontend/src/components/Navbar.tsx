// src/components/Navbar.tsx
'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useState } from 'react';
import Logo from './Logo';

export default function Navbar() {
   const { token, cart, setIsCartOpen, logout } = useAuth();
   const [userMenuOpen, setUserMenuOpen] = useState(false);

   const totalCartItems = (cart || []).reduce((acc: number, item: any) => acc + (item.quantity || 1), 0);


   return (
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
         <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">

            {/* 1. Logo de la marca: Huella + PetConnect */}
            <Link href="/" className="flex items-center gap-2.5 group h-full">
               <Logo size={80} className="h-full w-auto" />
               <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  Pet<span className="text-indigo-600">Connect</span>
               </span>
            </Link>

            {/* Enlaces Principales */}
            <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
               <Link href="/" className="hover:text-indigo-600 transition">
                  Inicio
               </Link>
               <Link href="/#productos" className="hover:text-indigo-600 transition">
                  Productos
               </Link>
               <Link href="/#como-funciona" className="hover:text-indigo-600 transition">
                  Cómo funciona
               </Link>
               <Link href="/#nosotros" className="hover:text-indigo-600 transition">
                  Nosotros
               </Link>
               <Link href="/#contacto" className="hover:text-indigo-600 transition">
                  Contacto
               </Link>
            </nav>

            {/* Acciones del Usuario & Carrito */}
            <div className="flex items-center gap-4">

               {/* Ícono de Persona (Gestión de Usuario) */}
               <div className="relative">
                  <button
                     onClick={() => setUserMenuOpen(!userMenuOpen)}
                     className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition border border-slate-200"
                     title="Cuenta de usuario"
                  >
                     👤
                  </button>

                  {userMenuOpen && (
                     <div className="absolute right-0 mt-3 w-48 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 text-sm">
                        {token ? (
                           <>
                              <Link
                                 href="/dashboard"
                                 className="block px-4 py-2 text-slate-700 hover:bg-slate-100 font-medium"
                                 onClick={() => setUserMenuOpen(false)}
                              >
                                 📍 Mi Panel / Mascotas
                              </Link>
                              <button
                                 onClick={() => {
                                    logout();
                                    setUserMenuOpen(false);
                                 }}
                                 className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 font-medium"
                              >
                                 Cerrar Sesión
                              </button>
                           </>
                        ) : (
                           <>
                              <Link
                                 href="/login"
                                 className="block px-4 py-2 text-slate-700 hover:bg-slate-100 font-medium"
                                 onClick={() => setUserMenuOpen(false)}
                              >
                                 Iniciar Sesión
                              </Link>
                              <Link
                                 href="/register"
                                 className="block px-4 py-2 text-indigo-600 hover:bg-indigo-50 font-semibold"
                                 onClick={() => setUserMenuOpen(false)}
                              >
                                 Registrarse
                              </Link>
                           </>
                        )}
                     </div>
                  )}
               </div>

               {/* Ícono del Carrito de Compras */}
               <button
                  onClick={() => setIsCartOpen(true)}
                  className="relative w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition border border-slate-200"
                  title="Carrito de compras"
               >
                  🛒
                  {totalCartItems > 0 && (
                     <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center animate-bounce">
                        {totalCartItems}
                     </span>
                  )}
               </button>
            </div>

         </div>
      </header>
   );
}