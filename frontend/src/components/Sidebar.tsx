// src/components/Sidebar.tsx
'use client';

import { useAuth, Pet } from '@/context/AuthContext';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
// Asumiendo que usas lucide-react para los íconos del rediseño. Si no, puedes usar emojis como antes.
import { MapPin, Dog, Activity, Stethoscope } from 'lucide-react';
import Logo from './Logo';


export default function Sidebar() {
   const { userPets, selectedPet, setSelectedPet, logout } = useAuth();
   const pathname = usePathname(); // Para saber en qué página estamos y pintar el menú activo

   return (
      <aside className="w-64 bg-neutral-950 text-white flex flex-col justify-between p-5 h-full">
         <div className="space-y-6">
            <div className="flex items-center gap-3">
               <Logo size={32} />
               <div>
                  <h2 className="font-bold text-lg text-white">PetConnect</h2>
                  <p className="text-xs text-neutral-400">Enterprise Dashboard</p>
               </div>
            </div>

            {/* Selector de Mascota Autenticada */}
            <div className="space-y-2">
               <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                  Mascota Activa
               </label>
               <select
                  value={selectedPet?.id || ''}
                  onChange={(e) => {
                     // Agregamos `: Pet` al parámetro p
                     const pet = userPets.find((p: Pet) => p.id === e.target.value);
                     if (pet) setSelectedPet(pet);
                  }}
                  className="w-full bg-neutral-800 text-neutral-200 border border-neutral-700 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
               >
                  {/* Validación que agregamos en el paso anterior */}
                  {userPets?.length > 0 ? (
                     // Agregamos `: Pet` al parámetro pet
                     userPets.map((pet: Pet) => (
                        <option key={pet.id} value={pet.id}>
                           🐕 {pet.name}
                        </option>
                     ))
                  ) : (
                     <option value="">No hay mascotas</option>
                  )}
               </select>
            </div>

            {/* Menú Principal */}
            <nav className="space-y-2 mt-8">
               <Link
                  href="/dashboard"
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-colors ${pathname === '/dashboard'
                     ? 'bg-pink-600/20 text-pink-400 border border-pink-500/30'
                     : 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200'
                     }`}
               >
                  <MapPin className="w-5 h-5" />
                  Mapa en Vivo
               </Link>

               <Link
                  href="/dashboard/historial"
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-colors ${pathname === '/dashboard/historial'
                     ? 'bg-pink-600/20 text-pink-400 border border-pink-500/30'
                     : 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200'
                     }`}
               >
                  <Stethoscope className="w-5 h-5" />
                  Historial Clínico
               </Link>

               <Link
                  href="/dashboard/dispositivos"
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-colors ${pathname === '/dashboard/dispositivos'
                     ? 'bg-pink-600/20 text-pink-400 border border-pink-500/30'
                     : 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200'
                     }`}
               >
                  <Activity className="w-5 h-5" />
                  Dispositivos
               </Link>
            </nav>
         </div>

         {/* El botón de logout ahora puede quedarse aquí abajo, o podrías eliminarlo si prefieres usar solo el del Navbar superior */}
         <button
            onClick={logout}
            className="w-full py-2.5 mt-8 bg-neutral-800 hover:bg-red-600/20 hover:text-red-400 text-neutral-400 text-xs font-semibold rounded-xl transition border border-neutral-700"
         >
            Cerrar Sesión
         </button>
      </aside>
   );
}