'use client';

import { useAuth } from '@/context/AuthContext';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useState } from 'react';
import RegisterPetModal from '@/components/RegisterPetModal';
import { apiFetch } from '@/lib/api';
import type { Location } from '@/components/PetMap';
import { ChevronDown, ChevronUp } from 'lucide-react';

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

const PetMap = dynamic(() => import('@/components/PetMap'), {
   ssr: false,
   loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-neutral-200">
         <span className="text-neutral-500 font-medium animate-pulse">Cargando mapa...</span>
      </div>
   ),
});

const REFRESH_MS = 30_000;

export default function DashboardPage() {
   const { userPets, selectedPet, setSelectedPet } = useAuth();
   const [showRegister, setShowRegister] = useState(false);
   const [locations, setLocations] = useState<Location[]>([]);
   const [locationStatus, setLocationStatus] = useState('');
   const [cardCollapsedMobile, setCardCollapsedMobile] = useState(false);

   useEffect(() => {
      if (userPets && userPets.length > 0 && !selectedPet) {
         setSelectedPet(userPets[0]);
      }
   }, [userPets, selectedPet, setSelectedPet]);

   const petId = selectedPet?.id;
   const loadLocations = useCallback(async () => {
      if (!petId) return;
      try {
         // Consulta exclusivamente la última ubicación registrada de la mascota
         const res = await apiFetch(`/locations/pet/${petId}/latest`);
         if (res.ok) {
            const data: Location = await res.json();
            setLocations([data]);
            setLocationStatus('');
         } else if (res.status === 404) {
            setLocations([]);
            setLocationStatus('Aún no hay ubicaciones registradas.');
         } else if (res.status === 400) {
            setLocations([]);
            setLocationStatus('Esta mascota no tiene un dispositivo vinculado.');
         } else {
            setLocations([]);
            setLocationStatus('No se pudo obtener la ubicación.');
         }
      } catch {
         setLocationStatus('No se pudo conectar con el servidor.');
      }
   }, [petId]);

   useEffect(() => {
      setLocations([]);
      setLocationStatus('');
      loadLocations();
      const id = setInterval(loadLocations, REFRESH_MS);
      return () => clearInterval(id);
   }, [loadLocations]);

   if (userPets?.length === 0) {
      return (
         <div className="w-full h-full flex items-center justify-center bg-neutral-100 p-4">
            <div className="text-center bg-white p-6 sm:p-10 rounded-2xl shadow-lg border border-neutral-100 max-w-md w-full z-10">
               <h2 className="text-xl sm:text-2xl font-bold text-neutral-800 mb-2">Panel de Control</h2>
               <p className="text-neutral-500 text-sm mb-6">
                  No tienes mascotas registradas aún. Registra tu primera mascota para iniciar el monitoreo.
               </p>
               <button
                  onClick={() => setShowRegister(true)}
                  className="w-full bg-pink-600 hover:bg-pink-700 text-white font-medium py-3 px-6 rounded-xl transition-colors shadow-md text-sm sm:text-base"
               >
                  + Registrar Nueva Mascota
               </button>
            </div>
            <RegisterPetModal isOpen={showRegister} onClose={() => setShowRegister(false)} />
         </div>
      );
   }

   return (
      <div className="w-full h-full relative bg-neutral-200 overflow-hidden">

         {/* MAPA NATIVO (Fondo absoluto) */}
         <div className="absolute inset-0 z-0">
            <PetMap locations={locations} petName={selectedPet?.name} />
         </div>

         {/* CAPA DE INTERFAZ FLOTANTE RESPONSIVA */}
         <div className="absolute inset-0 pointer-events-none z-10 p-3 sm:p-6 flex flex-col justify-between">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start w-full pointer-events-auto">

               {/* Lado Izquierdo: Información de la Mascota y Panel Flotante */}
               <div className="flex flex-col gap-2.5 sm:gap-4 w-full sm:w-80 max-w-sm">

                  {selectedPet && (
                     <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/60 p-3.5 sm:p-4 flex flex-col gap-3">
                        <div className="flex items-center justify-between gap-3">
                           <div className="flex items-center gap-3 min-w-0">
                              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-neutral-100 shrink-0 shadow-inner">
                                 {selectedPet.photo_url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={selectedPet.photo_url} alt={selectedPet.name} className="w-full h-full object-cover" />
                                 ) : (
                                    <div className="w-full h-full flex items-center justify-center text-neutral-400 text-xl sm:text-2xl">🐕</div>
                                 )}
                              </div>
                              <div className="flex-1 min-w-0">
                                 <h3 className="text-base sm:text-lg font-bold text-neutral-900 truncate">{selectedPet.name}</h3>
                                 <p className="text-[11px] sm:text-xs font-semibold tracking-wider text-neutral-500 uppercase truncate">
                                    {selectedPet.species}{selectedPet.breed ? ` • ${selectedPet.breed}` : ''}
                                 </p>
                                 {selectedPet.birth_date && (
                                    <p className="text-[11px] sm:text-xs font-medium text-pink-600 mt-0.5">
                                       {calcularEdad(selectedPet.birth_date)}
                                    </p>
                                 )}
                              </div>
                           </div>

                           {/* Botón para colapsar detalles en pantallas pequeñas */}
                           <button
                              onClick={() => setCardCollapsedMobile(!cardCollapsedMobile)}
                              className="sm:hidden p-1.5 text-neutral-400 hover:text-neutral-600 rounded-lg hover:bg-neutral-100"
                              aria-label="Alternar vista"
                           >
                              {cardCollapsedMobile ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                           </button>
                        </div>

                        {!cardCollapsedMobile && userPets && userPets.length > 1 && (
                           <div className="pt-2 border-t border-neutral-100">
                              <label
                                 htmlFor="active-pet"
                                 className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1 block"
                              >
                                 Cambiar Mascota Activa
                              </label>
                              <select
                                 id="active-pet"
                                 value={selectedPet.id}
                                 onChange={(e) => {
                                    const pet = userPets.find((p) => p.id === e.target.value);
                                    if (pet) setSelectedPet(pet);
                                 }}
                                 className="w-full bg-neutral-50 border border-neutral-200 text-neutral-700 rounded-lg p-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 shadow-sm cursor-pointer"
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
                  {(!cardCollapsedMobile || typeof window === 'undefined') && (
                     <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/60 p-4 sm:p-5">
                        <h2 className="text-base sm:text-lg font-bold text-neutral-900 mb-1 sm:mb-2">Panel de Control</h2>
                        <p className="text-xs sm:text-sm text-neutral-500 mb-3 sm:mb-4 leading-relaxed">
                           {locationStatus || 'Mostrando la última ubicación en tiempo real.'}
                        </p>
                        <button
                           onClick={() => setShowRegister(true)}
                           className="w-full bg-pink-600 hover:bg-pink-700 text-white font-medium py-2 sm:py-2.5 px-4 rounded-xl transition-colors shadow-md text-xs sm:text-sm flex justify-center items-center gap-2"
                        >
                           <span>+</span> Añadir Mascota
                        </button>
                     </div>
                  )}

               </div>

               {/* Indicador de Estado de Red */}
               <div className="ml-auto bg-white/95 backdrop-blur-md px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl shadow-lg border border-white/60 flex items-center gap-2 pointer-events-auto">
                  <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]"></span>
                  <span className="font-semibold text-neutral-800 text-xs sm:text-sm">Red PetConnect</span>
               </div>

            </div>
         </div>

         <RegisterPetModal isOpen={showRegister} onClose={() => setShowRegister(false)} />
      </div>
   );
}
