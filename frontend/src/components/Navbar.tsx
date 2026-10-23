// src/components/Navbar.tsx
'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useState } from 'react';
import Logo from './Logo';
import { Menu, X, ShoppingCart, User, LogOut } from 'lucide-react';

export default function Navbar() {
   const { token, cart, setIsCartOpen, logout } = useAuth();
   const [userMenuOpen, setUserMenuOpen] = useState(false);
   const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

   const totalCartItems = (cart || []).reduce((acc: number, item: any) => acc + (item.quantity || 1), 0);

   const navLinks = [
      { href: '/', label: 'Inicio' },
      { href: '/#productos', label: 'Productos' },
      { href: '/#como-funciona', label: 'Cómo funciona' },
      { href: '/#nosotros', label: 'Nosotros' },
      { href: '/#contacto', label: 'Contacto' },
   ];

   return (
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-neutral-200 shadow-sm">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">

            {/* 1. Logo de la marca */}
            <Link href="/" className="flex items-center gap-2 group h-full">
               <Logo size={44} className="h-10 sm:h-12 w-auto object-contain" />
               <span className="text-xl sm:text-2xl font-black text-neutral-950 tracking-tight">
                  Pet<span className="text-pink-600">Connect</span>
               </span>
            </Link>

            {/* 2. Enlaces Principales (Desktop) */}
            <nav className="hidden md:flex items-center gap-6 lg:gap-8 text-sm font-semibold text-neutral-600">
               {navLinks.map((link) => (
                  <Link
                     key={link.href}
                     href={link.href}
                     className="hover:text-pink-600 transition-colors"
                  >
                     {link.label}
                  </Link>
               ))}
            </nav>

            {/* 3. Acciones del Usuario & Carrito */}
            <div className="flex items-center gap-2 sm:gap-4">

               {/* Menú de Usuario Desktop */}
               <div className="relative">
                  <button
                     onClick={() => setUserMenuOpen(!userMenuOpen)}
                     className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-700 transition border border-neutral-200"
                     title="Cuenta de usuario"
                     aria-label="Menú de usuario"
                  >
                     <User className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>

                  {userMenuOpen && (
                     <div className="absolute right-0 mt-3 w-52 bg-white rounded-2xl shadow-xl border border-neutral-200 py-2 z-50 text-sm">
                        {token ? (
                           <>
                              <div className="px-4 py-2 border-b border-neutral-100 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                                 Mi Cuenta
                              </div>
                              <Link
                                 href="/dashboard"
                                 className="block px-4 py-2 text-neutral-700 hover:bg-neutral-50 font-medium"
                                 onClick={() => setUserMenuOpen(false)}
                              >
                                 📍 Mi Panel / Mascotas
                              </Link>
                              <Link
                                 href="/dashboard/dispositivos"
                                 className="block px-4 py-2 text-neutral-700 hover:bg-neutral-50 font-medium"
                                 onClick={() => setUserMenuOpen(false)}
                              >
                                 📡 Mis Dispositivos
                              </Link>
                              <button
                                 onClick={() => {
                                    logout();
                                    setUserMenuOpen(false);
                                 }}
                                 className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 font-medium flex items-center gap-2"
                              >
                                 <LogOut className="w-4 h-4" />
                                 Cerrar Sesión
                              </button>
                           </>
                        ) : (
                           <>
                              <Link
                                 href="/login"
                                 className="block px-4 py-2 text-neutral-700 hover:bg-neutral-50 font-medium"
                                 onClick={() => setUserMenuOpen(false)}
                              >
                                 Iniciar Sesión
                              </Link>
                              <Link
                                 href="/register"
                                 className="block px-4 py-2 text-pink-600 hover:bg-pink-50 font-semibold"
                                 onClick={() => setUserMenuOpen(false)}
                              >
                                 Registrarse
                              </Link>
                           </>
                        )}
                     </div>
                  )}
               </div>

               {/* Ícono del Carrito */}
               <button
                  onClick={() => setIsCartOpen(true)}
                  className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-700 transition border border-neutral-200"
                  title="Carrito de compras"
                  aria-label="Abrir carrito"
               >
                  <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
                  {totalCartItems > 0 && (
                     <span className="absolute -top-1 -right-1 bg-pink-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center animate-bounce">
                        {totalCartItems}
                     </span>
                  )}
               </button>

               {/* Botón de Menú Móvil (Hamburguesa) */}
               <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="md:hidden w-9 h-9 rounded-xl bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-700 transition border border-neutral-200"
                  aria-label="Abrir menú de navegación"
               >
                  {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
               </button>
            </div>

         </div>

         {/* 4. Menú Desplegable Móvil */}
         {mobileMenuOpen && (
            <div className="md:hidden bg-white/98 backdrop-blur-md border-b border-neutral-200 px-6 py-5 space-y-4 animate-in slide-in-from-top-2 duration-200 shadow-lg">
               <nav className="flex flex-col space-y-3 font-semibold text-neutral-700 text-base">
                  {navLinks.map((link) => (
                     <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className="py-1 hover:text-pink-600 transition-colors"
                     >
                        {link.label}
                     </Link>
                  ))}
               </nav>

               <div className="pt-4 border-t border-neutral-100 flex flex-col gap-2.5">
                  {token ? (
                     <>
                        <Link
                           href="/dashboard"
                           onClick={() => setMobileMenuOpen(false)}
                           className="w-full py-2.5 px-4 bg-pink-600 text-white font-bold rounded-xl text-center text-sm shadow-md"
                        >
                           📍 Mi Panel de Mascotas
                        </Link>
                        <button
                           onClick={() => {
                              logout();
                              setMobileMenuOpen(false);
                           }}
                           className="w-full py-2 text-center text-red-600 font-semibold text-sm hover:underline"
                        >
                           Cerrar Sesión
                        </button>
                     </>
                  ) : (
                     <div className="grid grid-cols-2 gap-3">
                        <Link
                           href="/login"
                           onClick={() => setMobileMenuOpen(false)}
                           className="py-2.5 px-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold rounded-xl text-center text-xs border border-neutral-200"
                        >
                           Iniciar Sesión
                        </Link>
                        <Link
                           href="/register"
                           onClick={() => setMobileMenuOpen(false)}
                           className="py-2.5 px-3 bg-pink-600 hover:bg-pink-700 text-white font-bold rounded-xl text-center text-xs shadow-md"
                        >
                           Registrarse
                        </Link>
                     </div>
                  )}
               </div>
            </div>
         )}
      </header>
   );
}
