'use client';

import { useAuth } from '@/context/AuthContext';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import RegisterPetModal from '@/components/RegisterPetModal';
import { apiFetch } from '@/lib/api';
import type { HomeCoordinates, Location } from '@/components/PetMap';
import {
   Check,
   ChevronDown,
   ChevronUp,
   Crosshair,
   Footprints,
   Home,
   LocateFixed,
   MapPin,
   ShieldAlert,
   ShieldCheck,
   X,
} from 'lucide-react';

const RADIUS_PRESETS = [50, 100, 250, 500, 1000];

const calculateDistanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
   const R = 6371000;
   const toRad = (deg: number) => (deg * Math.PI) / 180;
   const dLat = toRad(lat2 - lat1);
   const dLon = toRad(lon2 - lon1);
   const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
   const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
   return R * c;
};

const formatDistance = (meters: number): string => {
   if (meters >= 1000) {
      return `${(meters / 1000).toFixed(2)} km`;
   }
   return `${Math.round(meters)} m`;
};

const playSafeZoneAlertChime = () => {
   if (typeof window === 'undefined') return;
   try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      [587.33, 440, 587.33].forEach((freq, idx) => {
         const osc = ctx.createOscillator();
         const gain = ctx.createGain();
         osc.type = 'triangle';
         osc.frequency.setValueAtTime(freq, now + idx * 0.18);
         gain.gain.setValueAtTime(0.001, now + idx * 0.18);
         gain.gain.exponentialRampToValueAtTime(0.14, now + idx * 0.18 + 0.03);
         gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.18 + 0.16);
         osc.connect(gain);
         gain.connect(ctx.destination);
         osc.start(now + idx * 0.18);
         osc.stop(now + idx * 0.18 + 0.17);
      });
   } catch {
      // Ignorar si el navegador bloquea reproducción automática sin interacción previa
   }
};

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
   const { userPets, selectedPet, setSelectedPet, updatePetSafeZone } = useAuth();
   const [showRegister, setShowRegister] = useState(false);
   const [locations, setLocations] = useState<Location[]>([]);
   const [trailLocations, setTrailLocations] = useState<Location[]>([]);
   const [showTrail, setShowTrail] = useState<boolean>(true);
   const [locationStatus, setLocationStatus] = useState('');
   const [cardCollapsedMobile, setCardCollapsedMobile] = useState(false);

   // Estado del editor de Zona Segura (Casa)
   const [isEditingZone, setIsEditingZone] = useState(false);
   const [draftHome, setDraftHome] = useState<HomeCoordinates | null>(null);
   const [draftRadius, setDraftRadius] = useState<number>(150);
   const [draftEnabled, setDraftEnabled] = useState<boolean>(true);
   const [savingZone, setSavingZone] = useState(false);
   const [locatingGps, setLocatingGps] = useState(false);
   const [zoneFeedback, setZoneFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
   const [alertDismissed, setAlertDismissed] = useState(false);

   const prevOutsideRef = useRef<boolean>(false);

   useEffect(() => {
      if (userPets && userPets.length > 0 && !selectedPet) {
         setSelectedPet(userPets[0]);
      }
   }, [userPets, selectedPet, setSelectedPet]);

   useEffect(() => {
      if (typeof window === 'undefined') return;
      const saved = window.localStorage.getItem('petconnect_show_trail');
      if (saved === 'false') {
         setShowTrail(false);
      }
   }, []);

   const toggleTrail = useCallback(() => {
      setShowTrail((prev) => {
         const next = !prev;
         if (typeof window !== 'undefined') {
            window.localStorage.setItem('petconnect_show_trail', String(next));
         }
         return next;
      });
   }, []);

   // Resetear editor al cambiar de mascota
   useEffect(() => {
      setIsEditingZone(false);
      setZoneFeedback(null);
      setAlertDismissed(false);
      prevOutsideRef.current = Boolean(selectedPet?.is_outside_safe_zone);
   }, [selectedPet?.id]);

   const petId = selectedPet?.id;
   const petDeviceId = selectedPet?.device_id;

   const loadLocations = useCallback(async () => {
      if (!petId) return;
      try {
         // Consulta la última ubicación y, si el rastro está activo, las últimas 10 ubicaciones
         const [resLatest, resHistory] = await Promise.all([
            apiFetch(`/locations/pet/${petId}/latest`),
            showTrail ? apiFetch(`/locations/pet/${petId}/history?limit=10`) : Promise.resolve(null),
         ]);

         if (resLatest.ok) {
            const data: Location | null = await resLatest.json();
            if (data && data.latitude && data.longitude) {
               setLocations([data]);
               setLocationStatus('');
            } else {
               setLocations([]);
               setLocationStatus(petDeviceId ? 'Aún no hay ubicaciones registradas.' : 'Esta mascota no tiene un dispositivo vinculado.');
            }
         } else if (resLatest.status === 404) {
            setLocations([]);
            setLocationStatus('Aún no hay ubicaciones registradas.');
         } else if (resLatest.status === 400) {
            setLocations([]);
            setLocationStatus('Esta mascota no tiene un dispositivo vinculado.');
         } else {
            setLocations([]);
            setLocationStatus('No se pudo obtener la ubicación.');
         }

         if (showTrail && resHistory && resHistory.ok) {
            const histData: Location[] = await resHistory.json();
            setTrailLocations(Array.isArray(histData) ? histData.slice(0, 10) : []);
         } else if (!showTrail) {
            setTrailLocations([]);
         }
      } catch {
         setLocationStatus('No se pudo conectar con el servidor.');
      }
   }, [petId, petDeviceId, showTrail]);

   useEffect(() => {
      setLocations([]);
      setTrailLocations([]);
      setLocationStatus('');
      loadLocations();
      const id = setInterval(loadLocations, REFRESH_MS);
      return () => clearInterval(id);
   }, [loadLocations]);

   // Datos efectivos de Zona Segura (borrador mientras se edita o configuración guardada)
   const savedHome = useMemo<HomeCoordinates | null>(() => {
      if (
         selectedPet?.home_latitude != null &&
         selectedPet?.home_longitude != null
      ) {
         return {
            lat: selectedPet.home_latitude,
            lon: selectedPet.home_longitude,
         };
      }
      return null;
   }, [selectedPet?.home_latitude, selectedPet?.home_longitude]);

   const activeHome = isEditingZone ? draftHome : savedHome;
   const activeRadius = isEditingZone ? draftRadius : (selectedPet?.safe_radius_meters ?? 150);
   const activeEnabled = isEditingZone ? draftEnabled : Boolean(selectedPet?.safe_zone_enabled);

   const latestLocation = locations[0] ?? null;

   const distanceFromHome = useMemo<number | null>(() => {
      if (!activeHome || !latestLocation) return null;
      return calculateDistanceMeters(
         activeHome.lat,
         activeHome.lon,
         latestLocation.latitude,
         latestLocation.longitude
      );
   }, [activeHome, latestLocation]);

   const isOutsideNow = useMemo<boolean>(() => {
      if (!selectedPet?.safe_zone_enabled || !savedHome) return false;
      if (distanceFromHome !== null && selectedPet.safe_radius_meters) {
         return distanceFromHome > selectedPet.safe_radius_meters;
      }
      return Boolean(selectedPet.is_outside_safe_zone);
   }, [
      selectedPet?.safe_zone_enabled,
      selectedPet?.safe_radius_meters,
      selectedPet?.is_outside_safe_zone,
      savedHome,
      distanceFromHome,
   ]);

   // Alerta sonora + notificación del navegador cuando sale de la Zona Segura
   useEffect(() => {
      const wasOutside = prevOutsideRef.current;
      if (isOutsideNow && !wasOutside && !isEditingZone && selectedPet) {
         setAlertDismissed(false);
         playSafeZoneAlertChime();

         if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            new Notification(`⚠️ ${selectedPet.name} salió de la Zona Segura`, {
               body:
                  distanceFromHome !== null
                     ? `Se encuentra a ${formatDistance(distanceFromHome)} de Casa (límite ${selectedPet.safe_radius_meters ?? 150} m). Revisa su ubicación.`
                     : `${selectedPet.name} salió del perímetro configurado como Casa.`,
               icon: '/logo.png',
            });
         }
      }
      prevOutsideRef.current = isOutsideNow;
   }, [isOutsideNow, isEditingZone, selectedPet, distanceFromHome]);

   const openZoneEditor = () => {
      setZoneFeedback(null);
      setDraftRadius(selectedPet?.safe_radius_meters ?? 150);
      setDraftEnabled(savedHome ? Boolean(selectedPet?.safe_zone_enabled) : true);
      if (savedHome) {
         setDraftHome(savedHome);
      } else if (latestLocation) {
         setDraftHome({ lat: latestLocation.latitude, lon: latestLocation.longitude });
      } else {
         setDraftHome(null);
      }
      setIsEditingZone(true);
   };

   const handleUseBrowserGps = () => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
         setZoneFeedback({ type: 'err', text: 'Tu navegador no soporta geolocalización.' });
         return;
      }
      setLocatingGps(true);
      setZoneFeedback(null);
      navigator.geolocation.getCurrentPosition(
         (pos) => {
            setDraftHome({ lat: pos.coords.latitude, lon: pos.coords.longitude });
            setLocatingGps(false);
            setZoneFeedback({ type: 'ok', text: 'Casa centrada en tu ubicación GPS actual.' });
         },
         () => {
            setLocatingGps(false);
            setZoneFeedback({ type: 'err', text: 'No se pudo obtener tu GPS. Puedes hacer clic directo en el mapa.' });
         },
         { enableHighAccuracy: true, timeout: 10000 }
      );
   };

   const handleUsePetLocation = () => {
      if (!latestLocation) {
         setZoneFeedback({ type: 'err', text: 'Tu mascota aún no tiene ubicación registrada.' });
         return;
      }
      setDraftHome({ lat: latestLocation.latitude, lon: latestLocation.longitude });
      setZoneFeedback({ type: 'ok', text: `Casa centrada en la posición actual de ${selectedPet?.name}.` });
   };

   const handlePickOnMap = useCallback((lat: number, lon: number) => {
      setDraftHome({ lat, lon });
      setZoneFeedback(null);
   }, []);

   const handleSaveSafeZone = async () => {
      if (!selectedPet) return;
      if (draftEnabled && !draftHome) {
         setZoneFeedback({ type: 'err', text: 'Selecciona un punto en el mapa o usa tu GPS para fijar Casa.' });
         return;
      }

      if (draftEnabled && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
         Notification.requestPermission().catch(() => {});
      }

      setSavingZone(true);
      setZoneFeedback(null);

      try {
         const updated = await updatePetSafeZone(selectedPet.id, {
            home_latitude: draftHome?.lat ?? null,
            home_longitude: draftHome?.lon ?? null,
            safe_radius_meters: draftRadius,
            safe_zone_enabled: draftEnabled,
         });

         if (updated) {
            prevOutsideRef.current = Boolean(updated.is_outside_safe_zone);
            setIsEditingZone(false);
            setAlertDismissed(false);
         } else {
            setZoneFeedback({ type: 'err', text: 'No se pudo guardar la Zona Segura. Intenta de nuevo.' });
         }
      } catch {
         setZoneFeedback({ type: 'err', text: 'Error de conexión al guardar la Zona Segura.' });
      } finally {
         setSavingZone(false);
      }
   };

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
            <PetMap
               locations={locations}
               trailLocations={trailLocations}
               showTrail={showTrail}
               petName={selectedPet?.name}
               homeLocation={activeHome}
               safeRadiusMeters={activeRadius}
               safeZoneEnabled={activeEnabled}
               isOutsideSafeZone={isOutsideNow}
               isEditingSafeZone={isEditingZone}
               onPickHomeLocation={handlePickOnMap}
            />
         </div>

         {/* BANNERS SUPERIORES FLOTANTES (Edición / Alerta de Salida) */}
         {(isEditingZone || (isOutsideNow && !alertDismissed)) && (
            <div className="absolute top-3 sm:top-5 left-1/2 -translate-x-1/2 z-20 px-3 w-full max-w-xl pointer-events-none flex flex-col gap-2 items-center">
               {isEditingZone && (
                  <div className="pointer-events-auto bg-pink-600/95 backdrop-blur-md text-white px-4 py-2 rounded-full shadow-xl border border-pink-400/50 text-xs sm:text-sm font-medium flex items-center gap-2">
                     <Crosshair className="w-4 h-4 shrink-0" />
                     <span>Haz clic en el mapa o arrastra 🏠 para ubicar tu Casa</span>
                  </div>
               )}

               {!isEditingZone && isOutsideNow && !alertDismissed && selectedPet && (
                  <div className="pointer-events-auto w-full bg-rose-600/95 backdrop-blur-md text-white px-4 py-3 rounded-2xl shadow-2xl border border-rose-400/60 flex items-center justify-between gap-3">
                     <div className="flex items-center gap-2.5 min-w-0">
                        <ShieldAlert className="w-5 h-5 shrink-0 animate-bounce" />
                        <div className="min-w-0">
                           <p className="text-xs sm:text-sm font-bold leading-tight">
                              ¡Alerta! {selectedPet.name} salió de la Zona Segura
                           </p>
                           <p className="text-[11px] sm:text-xs text-rose-100 truncate">
                              {distanceFromHome !== null
                                 ? `A ${formatDistance(distanceFromHome)} de Casa (radio permitido: ${activeRadius} m)`
                                 : 'Se detectó salida del perímetro de Casa.'}
                           </p>
                        </div>
                     </div>
                     <button
                        onClick={() => setAlertDismissed(true)}
                        className="p-1 rounded-lg hover:bg-rose-500/60 text-rose-100 hover:text-white transition-colors shrink-0"
                        aria-label="Cerrar alerta"
                     >
                        <X className="w-4 h-4" />
                     </button>
                  </div>
               )}
            </div>
         )}

         {/* CAPA DE INTERFAZ FLOTANTE RESPONSIVA */}
         <div className="absolute inset-0 pointer-events-none z-10 p-3 sm:p-6 flex flex-col justify-between">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start w-full">

               {/* Lado Izquierdo: Información de la Mascota, Zona Segura y Panel Flotante */}
               <div className="flex flex-col gap-2.5 sm:gap-3.5 w-full sm:w-84 max-w-sm max-h-[calc(100vh-6rem)] overflow-y-auto pr-0.5 pointer-events-auto">

                  {selectedPet && (
                     <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/60 p-3.5 sm:p-4 flex flex-col gap-3">
                        <div className="flex items-center justify-between gap-3">
                           <div className="flex items-center gap-3 min-w-0">
                              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden bg-neutral-100 shrink-0 shadow-inner">
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

                  {/* Tarjeta de Zona Segura (Casa) */}
                  {selectedPet && (!cardCollapsedMobile || isEditingZone) && (
                     <div
                        className={`bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border p-3.5 sm:p-4 transition-colors ${
                           isOutsideNow && !isEditingZone
                              ? 'border-rose-300 ring-2 ring-rose-500/20'
                              : isEditingZone
                                ? 'border-pink-300 ring-2 ring-pink-500/20'
                                : 'border-white/60'
                        }`}
                     >
                        <div className="flex items-center justify-between gap-2 mb-2.5">
                           <div className="flex items-center gap-2">
                              <div
                                 className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                                    isOutsideNow && !isEditingZone
                                       ? 'bg-rose-100 text-rose-600'
                                       : 'bg-pink-100 text-pink-600'
                                 }`}
                              >
                                 <Home className="w-4 h-4" />
                              </div>
                              <div>
                                 <h3 className="text-sm font-bold text-neutral-900 leading-tight">Zona Segura (Casa)</h3>
                                 <p className="text-[11px] text-neutral-500">
                                    {savedHome && selectedPet.safe_zone_enabled
                                       ? `Radio de ${selectedPet.safe_radius_meters ?? 150} m`
                                       : savedHome
                                         ? 'Pausada temporalmente'
                                         : 'Sin ubicación registrada'}
                                 </p>
                              </div>
                           </div>

                           {!isEditingZone && (
                              <span
                                 className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                    !savedHome || !selectedPet.safe_zone_enabled
                                       ? 'bg-neutral-100 text-neutral-500'
                                       : isOutsideNow
                                         ? 'bg-rose-100 text-rose-700'
                                         : 'bg-emerald-100 text-emerald-700'
                                 }`}
                              >
                                 {!savedHome || !selectedPet.safe_zone_enabled ? (
                                    'Inactiva'
                                 ) : isOutsideNow ? (
                                    <>
                                       <ShieldAlert className="w-3 h-3" /> Fuera
                                    </>
                                 ) : (
                                    <>
                                       <ShieldCheck className="w-3 h-3" /> En Casa
                                    </>
                                 )}
                              </span>
                           )}
                        </div>

                        {!isEditingZone ? (
                           <>
                              {savedHome && selectedPet.safe_zone_enabled && distanceFromHome !== null && (
                                 <div className="mb-3 bg-neutral-50 rounded-xl px-3 py-2 flex items-center justify-between text-xs border border-neutral-100">
                                    <span className="text-neutral-500">Distancia a Casa</span>
                                    <span className={`font-bold ${isOutsideNow ? 'text-rose-600' : 'text-emerald-600'}`}>
                                       {formatDistance(distanceFromHome)}
                                    </span>
                                 </div>
                              )}

                              <button
                                 onClick={openZoneEditor}
                                 className="w-full bg-pink-50 hover:bg-pink-100 text-pink-700 font-semibold py-2 px-3 rounded-xl transition-colors text-xs sm:text-sm flex items-center justify-center gap-1.5 border border-pink-200/70"
                              >
                                 <MapPin className="w-4 h-4" />
                                 {savedHome ? 'Editar Casa y Radio' : 'Registrar Casa y Radio Seguro'}
                              </button>
                           </>
                        ) : (
                           <div className="flex flex-col gap-3 pt-1">
                              {/* Selectores rápidos de Casa */}
                              <div>
                                 <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1.5">
                                    1. Ubicar Casa en el mapa
                                 </span>
                                 <div className="grid grid-cols-2 gap-1.5">
                                    <button
                                       type="button"
                                       onClick={handleUseBrowserGps}
                                       disabled={locatingGps}
                                       className="flex items-center justify-center gap-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 font-medium py-2 px-2.5 rounded-xl text-xs border border-sky-200/80 transition-colors disabled:opacity-60"
                                    >
                                       <LocateFixed className="w-3.5 h-3.5" />
                                       {locatingGps ? 'Ubicando...' : 'Mi GPS actual'}
                                    </button>
                                    <button
                                       type="button"
                                       onClick={handleUsePetLocation}
                                       disabled={!latestLocation}
                                       className="flex items-center justify-center gap-1.5 bg-neutral-50 hover:bg-neutral-100 text-neutral-700 font-medium py-2 px-2.5 rounded-xl text-xs border border-neutral-200 transition-colors disabled:opacity-50"
                                    >
                                       <MapPin className="w-3.5 h-3.5 text-pink-600" />
                                       Donde está {selectedPet.name}
                                    </button>
                                 </div>
                                 <p className="text-[11px] text-neutral-500 mt-1.5">
                                    {draftHome
                                       ? `📍 ${draftHome.lat.toFixed(5)}, ${draftHome.lon.toFixed(5)}`
                                       : 'Haz clic en cualquier punto del mapa para fijar Casa.'}
                                 </p>
                              </div>

                              {/* Control de Radio Seguro */}
                              <div>
                                 <div className="flex items-center justify-between mb-1">
                                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                                       2. Radio Seguro
                                    </span>
                                    <span className="text-xs font-bold text-pink-600 bg-pink-50 px-2 py-0.5 rounded-md">
                                       {draftRadius >= 1000 ? `${(draftRadius / 1000).toFixed(1)} km` : `${draftRadius} m`}
                                    </span>
                                 </div>

                                 <input
                                    type="range"
                                    min={50}
                                    max={1500}
                                    step={25}
                                    value={draftRadius}
                                    onChange={(e) => setDraftRadius(Number(e.target.value))}
                                    className="w-full accent-pink-600 cursor-pointer"
                                    aria-label="Radio seguro en metros"
                                 />

                                 <div className="flex flex-wrap gap-1 mt-1.5">
                                    {RADIUS_PRESETS.map((preset) => (
                                       <button
                                          key={preset}
                                          type="button"
                                          onClick={() => setDraftRadius(preset)}
                                          className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                                             draftRadius === preset
                                                ? 'bg-pink-600 text-white shadow-sm'
                                                : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-600'
                                          }`}
                                       >
                                          {preset >= 1000 ? '1 km' : `${preset} m`}
                                       </button>
                                    ))}
                                 </div>
                              </div>

                              {/* Switch activar/pausar alertas */}
                              <label className="flex items-center justify-between bg-neutral-50 px-3 py-2 rounded-xl border border-neutral-200/70 cursor-pointer">
                                 <span className="text-xs font-medium text-neutral-700">Alertas al salir del radio</span>
                                 <input
                                    type="checkbox"
                                    checked={draftEnabled}
                                    onChange={(e) => setDraftEnabled(e.target.checked)}
                                    className="w-4 h-4 accent-pink-600 rounded cursor-pointer"
                                 />
                              </label>

                              {zoneFeedback && (
                                 <p
                                    className={`text-[11px] font-medium px-2.5 py-1.5 rounded-lg ${
                                       zoneFeedback.type === 'ok'
                                          ? 'bg-emerald-50 text-emerald-700'
                                          : 'bg-rose-50 text-rose-700'
                                    }`}
                                 >
                                    {zoneFeedback.text}
                                 </p>
                              )}

                              {/* Botones Guardar / Cancelar */}
                              <div className="flex gap-2">
                                 <button
                                    type="button"
                                    onClick={() => {
                                       setIsEditingZone(false);
                                       setZoneFeedback(null);
                                    }}
                                    disabled={savingZone}
                                    className="flex-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-medium py-2 px-3 rounded-xl text-xs transition-colors flex items-center justify-center gap-1"
                                 >
                                    <X className="w-3.5 h-3.5" /> Cancelar
                                 </button>
                                 <button
                                    type="button"
                                    onClick={handleSaveSafeZone}
                                    disabled={savingZone}
                                    className="flex-1 bg-pink-600 hover:bg-pink-700 text-white font-semibold py-2 px-3 rounded-xl text-xs transition-colors shadow-md flex items-center justify-center gap-1 disabled:opacity-60"
                                 >
                                    <Check className="w-3.5 h-3.5" />
                                    {savingZone ? 'Guardando...' : 'Guardar Zona'}
                                 </button>
                              </div>
                           </div>
                        )}
                     </div>
                  )}

                  {/* Panel de Control Flotante */}
                  {!cardCollapsedMobile && !isEditingZone && (
                     <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/60 p-4 sm:p-5">
                        <h2 className="text-base sm:text-lg font-bold text-neutral-900 mb-1 sm:mb-2">Panel de Control</h2>
                        <p className="text-xs sm:text-sm text-neutral-500 mb-3 leading-relaxed">
                           {locationStatus || 'Mostrando la última ubicación en tiempo real.'}
                        </p>

                        {/* Opción de Rastro de Huellitas (últimas 10 ubicaciones) */}
                        <button
                           type="button"
                           onClick={toggleTrail}
                           aria-pressed={showTrail}
                           className={`w-full mb-3 px-3 py-2.5 rounded-xl border text-left transition-colors flex items-center justify-between gap-2.5 ${
                              showTrail
                                 ? 'bg-pink-50/90 border-pink-200 text-pink-900'
                                 : 'bg-neutral-50 border-neutral-200 text-neutral-700 hover:bg-neutral-100'
                           }`}
                        >
                           <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                 className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                    showTrail ? 'bg-pink-600 text-white' : 'bg-neutral-200 text-neutral-500'
                                 }`}
                              >
                                 <Footprints className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                 <p className="text-xs font-bold leading-tight">Rastro de huellitas</p>
                                 <p className="text-[11px] text-neutral-500 truncate">
                                    {showTrail
                                       ? trailLocations.length > 1
                                          ? `Últimas ${trailLocations.length} ubicaciones`
                                          : 'Últimas 10 ubicaciones'
                                       : 'Desactivado en el mapa'}
                                 </p>
                              </div>
                           </div>
                           <span
                              className={`w-9 h-5 rounded-full p-0.5 transition-colors flex items-center shrink-0 ${
                                 showTrail ? 'bg-pink-600 justify-end' : 'bg-neutral-300 justify-start'
                              }`}
                           >
                              <span className="w-4 h-4 bg-white rounded-full shadow-sm" />
                           </span>
                        </button>

                        <button
                           onClick={() => setShowRegister(true)}
                           className="w-full bg-pink-600 hover:bg-pink-700 text-white font-medium py-2 sm:py-2.5 px-4 rounded-xl transition-colors shadow-md text-xs sm:text-sm flex justify-center items-center gap-2"
                        >
                           <span>+</span> Añadir Mascota
                        </button>
                     </div>
                  )}

               </div>

               {/* Indicadores superiores derechos: Acceso rápido de rastro y Estado de Red */}
               <div className="ml-auto flex items-center gap-2 pointer-events-auto">
                  <button
                     type="button"
                     onClick={toggleTrail}
                     aria-pressed={showTrail}
                     title="Mostrar u ocultar el rastro de las últimas 10 ubicaciones"
                     className={`px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl shadow-lg border flex items-center gap-1.5 text-xs sm:text-sm font-semibold transition-all backdrop-blur-md ${
                        showTrail
                           ? 'bg-pink-600/95 text-white border-pink-500 hover:bg-pink-700'
                           : 'bg-white/95 text-neutral-600 border-white/60 hover:bg-neutral-50'
                     }`}
                  >
                     <Footprints className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                     <span>Huellitas{showTrail && trailLocations.length > 0 ? ` (${trailLocations.length})` : ''}</span>
                  </button>

                  <div className="bg-white/95 backdrop-blur-md px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl shadow-lg border border-white/60 flex items-center gap-2">
                     <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]"></span>
                     <span className="font-semibold text-neutral-800 text-xs sm:text-sm">Red PetConnect</span>
                  </div>
               </div>

            </div>
         </div>

         <RegisterPetModal isOpen={showRegister} onClose={() => setShowRegister(false)} />
      </div>
   );
}
