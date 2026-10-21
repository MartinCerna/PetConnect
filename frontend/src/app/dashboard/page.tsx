'use client';

import { useAuth } from '@/context/AuthContext';
import dynamic from 'next/dynamic';
import { useEffect } from 'react';

// Función para calcular la edad dinámicamente
const calcularEdad = (fechaNacimiento: string | undefined | null) => {
   if (!fechaNacimiento) return 'Edad desconocida';

   const nacimiento = new Date(fechaNacimiento);
   const hoy = new Date();

   let anios = hoy.getFullYear() - nacimiento.getFullYear();
   let meses = hoy.getMonth() - nacimiento.getMonth();

   if (meses < 0 || (meses === 0 && hoy.getDate() < nacimiento.getDate())) {
      anios--;
      meses += 12;
   }

   if (anios === 0) {
      return `${meses} ${meses === 1 ? 'Mes' : 'Meses'}`;
   }
   return `${anios} ${anios === 1 ? 'Año' : 'Años'}`;
};

// IMPORTANTE: Importamos PetMap dinámicamente y apagamos el SSR
const PetMap = dynamic(() => import('@/components/PetMap'), {
   ssr: false, // Esto evita el error de "window is not defined"
   loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-slate-200">
         <span className="text-slate-500 font-medium animate-pulse">Cargando mapa...</span>
      </div>
   )
});

export default function DashboardPage() {
   // Nos aseguramos de traer setSelectedPet para poder cambiar de mascota
   const { userPets, selectedPet, setSelectedPet } = useAuth();

   useEffect(() => {
      if (userPets && userPets.length > 0 && !selectedPet) {
         setSelectedPet(userPets[0]);
      }
   }, [userPets, selectedPet, setSelectedPet]);

   // Si no hay mascotas registradas
   if (userPets?.length === 0) {
      return (
         <div className="w-full h-full flex items-center justify-center bg-slate-100 p-4">
            <div className="text-center bg-white p-10 rounded-2xl shadow-lg border border-gray-100 max-w-md w-full z-10">
               <h2 className="text-2xl font-bold text-gray-800 mb-2">Panel de Control</h2>
               <p className="text-gray-500 mb-6">No tienes mascotas registradas aún. Registra tu primera mascota para iniciar el monitoreo.</p>
               <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-6 rounded-xl transition-colors shadow-md">
                  + Registrar Nueva Mascota
               </button>
            </div>
            {/* Fondo decorativo simulando un mapa borroso */}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 z-0 pointer-events-none"></div>
         </div>
      );
   }

   // Si hay mascota seleccionada (El Mapa a pantalla completa)
   return (
      <div className="w-full h-full relative bg-slate-200">

         {/* EL MAPA (Fondo absoluto) */}
         <div className="absolute inset-0 z-0">
            <PetMap locations={[]} />
         </div>

         {/* CAPA DE INTERFAZ FLOTANTE (Z-Index alto para estar sobre el mapa) */}
         <div className="absolute inset-0 pointer-events-none z-10 p-4 sm:p-6 flex flex-col justify-between">

            {/* CONTENEDORES FLOTANTES (pointer-events-auto para que los botones funcionen) */}
            <div className="flex flex-col sm:flex-row gap-4 items-start w-full pointer-events-auto">

               {/* Lado Izquierdo: Información de la Mascota y Panel */}
               <div className="flex flex-col gap-4 w-full sm:w-80">

                  {/* Tarjeta de la Mascota Seleccionada */}
                  {selectedPet && (
                     <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-4 flex flex-col gap-4 transition-transform hover:scale-[1.02]">
                        <div className="flex items-center gap-4">
                           <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 shadow-inner">
                              {selectedPet.photo_url ? (
                                 <img src={selectedPet.photo_url} alt={selectedPet.name} className="w-full h-full object-cover" />
                              ) : (
                                 <div className="w-full h-full flex items-center justify-center text-gray-400 text-2xl">🐕</div>
                              )}
                           </div>
                           <div className="flex-1 min-w-0">
                              <h3 className="text-lg font-bold text-gray-900 truncate">{selectedPet.name}</h3>
                              <p className="text-xs font-semibold tracking-wider text-gray-500 uppercase truncate">
                                 {selectedPet.species} • {selectedPet.breed}
                              </p>
                              {/* Llamada a la función calcularEdad */}
                              {selectedPet.birth_date && (
                                 <p className="text-xs font-medium text-indigo-600 mt-1">
                                    {calcularEdad(selectedPet.birth_date)}
                                 </p>
                              )}
                           </div>
                        </div>

                        {/* ¡AQUÍ ESTÁ LA LISTA DE MASCOTAS DE VUELTA! */}
                        {userPets && userPets.length > 1 && (
                           <div className="pt-3 border-t border-gray-100">
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">
                                 Cambiar Mascota Activa
                              </label>
                              <select
                                 value={selectedPet.id}
                                 onChange={(e) => {
                                    const pet = userPets.find((p) => p.id === e.target.value);
                                    if (pet) setSelectedPet(pet);
                                 }}
                                 className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm cursor-pointer"
                              >
                                 {userPets.map((pet) => (
                                    <option key={pet.id} value={pet.id}>
                                       🐕 {pet.name}
                                    </option>
                                 ))}
                              </select>
                           </div>
                        )}
                     </div>
                  )}

                  {/* Panel de Control Flotante */}
                  <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-5">
                     <h2 className="text-xl font-bold text-gray-900 mb-2">Panel de Control</h2>
                     <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                        Supervisión de ubicación, alertas de vacunación e historial clínico.
                     </p>
                     <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-4 rounded-xl transition-colors shadow-md text-sm flex justify-center items-center gap-2">
                        <span>+</span> Añadir Mascota
                     </button>
                  </div>
               </div>

               {/* Indicador de Estado de Red (Flotante arriba a la derecha) */}
               <div className="ml-auto bg-white/95 backdrop-blur-sm px-4 py-2.5 rounded-xl shadow-lg border border-white/50 flex items-center gap-2 pointer-events-auto">
                  <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                  <h1 className="font-semibold text-gray-800 text-sm">
                     Red PetConnect
                  </h1>
               </div>

            </div>
         </div>

      </div>
   );
}