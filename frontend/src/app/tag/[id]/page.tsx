'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Phone, MapPin, User, ShieldAlert, Heart, Navigation, Send, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { API_BASE } from '@/lib/api';

interface PetContactInfo {
   pet_id: string;
   name: string;
   species: string;
   breed?: string | null;
   photo_url?: string | null;
   birth_date?: string | null;
   owner_name: string;
   owner_phone?: string | null;
   owner_address?: string | null;
}

export default function PublicPetTagPage() {
   const params = useParams();
   const petId = params?.id as string;

   const [data, setData] = useState<PetContactInfo | null>(null);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState('');
   const [sendingLocation, setSendingLocation] = useState(false);

   useEffect(() => {
      if (!petId) return;

      const fetchContact = async () => {
         try {
            const res = await fetch(`${API_BASE}/pets/${petId}/contact`);
            if (res.ok) {
               setData(await res.json());
            } else if (res.status === 404) {
               setError('No se encontró información para esta placa de mascota.');
            } else {
               setError('Error al consultar los datos de la mascota.');
            }
         } catch {
            setError('No se pudo conectar con el servidor.');
         } finally {
            setLoading(false);
         }
      };

      fetchContact();
   }, [petId]);

   const cleanPhone = (data?.owner_phone || '').replace(/[^0-9+]/g, '');
   const waNumber = cleanPhone.startsWith('+') ? cleanPhone.replace('+', '') : cleanPhone.length === 9 ? `51${cleanPhone}` : cleanPhone;

   // Envía la ubicación GPS del celular que encontró a la mascota directamente al WhatsApp del dueño
   const handleSendLocation = () => {
      if (!navigator.geolocation) {
         alert('Tu navegador no soporta geolocalización.');
         return;
      }
      setSendingLocation(true);
      navigator.geolocation.getCurrentPosition(
         (pos) => {
            setSendingLocation(false);
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
            const msg = `¡Hola ${data?.owner_name || ''}! Encontré a tu mascota ${data?.name || ''}. Mi ubicación actual es: ${mapsUrl}`;
            window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(msg)}`, '_blank');
         },
         () => {
            setSendingLocation(false);
            alert('No se pudo obtener tu ubicación. Por favor envía un mensaje de texto normal.');
            window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(`¡Hola! Encontré a tu mascota ${data?.name || ''}.`)}`, '_blank');
         },
         { enableHighAccuracy: true, timeout: 10000 }
      );
   };

   if (loading) {
      return (
         <div className="min-h-screen bg-neutral-900 flex items-center justify-center p-4">
            <div className="text-center text-white space-y-3">
               <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto" />
               <p className="text-sm text-neutral-300">Cargando datos de la mascota...</p>
            </div>
         </div>
      );
   }

   if (error || !data) {
      return (
         <div className="min-h-screen bg-neutral-900 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center space-y-4 shadow-2xl">
               <span className="text-4xl">⚠️</span>
               <h1 className="text-xl font-black text-neutral-900">Placa no encontrada</h1>
               <p className="text-sm text-neutral-500">{error || 'Esta placa no está registrada o no está disponible.'}</p>
               <Link
                  href="/"
                  className="inline-block px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition"
               >
                  Ir a PetConnect
               </Link>
            </div>
         </div>
      );
   }

   return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col justify-between p-4 sm:p-6 lg:p-8">
         <div className="max-w-xl mx-auto w-full space-y-6 pt-4">

            {/* Banner de Emergencia */}
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 flex items-center gap-3 backdrop-blur-sm">
               <div className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-rose-500/20">
                  <ShieldAlert className="w-5 h-5 animate-pulse" />
               </div>
               <div>
                  <h2 className="font-extrabold text-sm text-rose-300 uppercase tracking-wide">
                     Mascota con Placa PetConnect
                  </h2>
                  <p className="text-xs text-rose-200/80">
                     Si encontraste a esta mascota, su familia la está buscando. ¡Gracias por ayudar!
                  </p>
               </div>
            </div>

            {/* Tarjeta de la Mascota */}
            <div className="bg-white text-neutral-900 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">

               {/* Foto y Nombre */}
               <div className="flex flex-col sm:flex-row items-center gap-5 pb-6 border-b border-neutral-100">
                  <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-neutral-100 p-1 shrink-0 shadow-md relative overflow-hidden border border-neutral-200">
                     {data.photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                           src={data.photo_url}
                           alt={data.name}
                           className="w-full h-full object-cover rounded-[20px]"
                        />
                     ) : (
                        <div className="w-full h-full flex items-center justify-center text-5xl">
                           🐶
                        </div>
                     )}
                  </div>
                  <div className="text-center sm:text-left space-y-1">
                     <span className="text-[11px] font-bold text-pink-600 uppercase tracking-widest block">
                        {data.species} · {data.breed || 'Raza cariñosa'}
                     </span>
                     <h1 className="text-3xl font-black text-neutral-950 tracking-tight">
                        ¡Hola! Soy {data.name}
                     </h1>
                     <p className="text-xs text-neutral-500 leading-relaxed max-w-sm">
                        Por favor comunícate con mi dueño para que pueda volver a mi casa.
                     </p>
                  </div>
               </div>

               {/* Datos de Contacto del Dueño */}
               <div className="space-y-4">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-neutral-400">
                     Datos del Dueño para Contacto
                  </h3>

                  {/* Nombre */}
                  <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200/70 flex items-center gap-3">
                     <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold shrink-0">
                        <User className="w-5 h-5" />
                     </div>
                     <div>
                        <span className="text-[10px] uppercase font-bold text-neutral-400 block">Dueño(a)</span>
                        <span className="text-sm font-extrabold text-neutral-900">{data.owner_name}</span>
                     </div>
                  </div>

                  {/* Celular / Llamar y WhatsApp */}
                  {data.owner_phone ? (
                     <div className="p-4 bg-emerald-50 border border-emerald-200/80 rounded-2xl space-y-3">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold shrink-0">
                              <Phone className="w-5 h-5" />
                           </div>
                           <div>
                              <span className="text-[10px] uppercase font-bold text-emerald-800 block">Celular / Teléfono</span>
                              <span className="text-base font-black text-emerald-950">{data.owner_phone}</span>
                           </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                           <a
                              href={`tel:${cleanPhone}`}
                              className="py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold text-center transition flex items-center justify-center gap-2 shadow-sm"
                           >
                              <Phone className="w-4 h-4" />
                              Llamar ahora
                           </a>
                           <a
                              href={`https://wa.me/${waNumber}?text=${encodeURIComponent(`¡Hola! Encontré a tu mascota ${data.name}. ¿Cómo coordinamos para devolverla?`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="py-3 px-4 bg-green-500 hover:bg-green-600 text-white rounded-xl text-xs font-bold text-center transition flex items-center justify-center gap-2 shadow-sm"
                           >
                              Enviar WhatsApp
                           </a>
                        </div>
                     </div>
                  ) : (
                     <div className="p-4 bg-neutral-50 rounded-2xl border text-neutral-400 text-xs">
                        Teléfono no registrado.
                     </div>
                  )}

                  {/* Dirección */}
                  {data.owner_address && (
                     <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200/70 space-y-2">
                        <div className="flex items-start gap-3">
                           <div className="w-10 h-10 rounded-xl bg-pink-100 text-pink-600 flex items-center justify-center shrink-0 mt-0.5">
                              <MapPin className="w-5 h-5" />
                           </div>
                           <div className="flex-1 min-w-0">
                              <span className="text-[10px] uppercase font-bold text-neutral-400 block">Dirección donde vivo</span>
                              <p className="text-xs font-semibold text-neutral-800 leading-relaxed">
                                 {data.owner_address}
                              </p>
                           </div>
                        </div>
                        <a
                           href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.owner_address)}`}
                           target="_blank"
                           rel="noopener noreferrer"
                           className="inline-flex items-center gap-1.5 text-xs font-bold text-pink-600 hover:text-pink-700 pt-1"
                        >
                           <Navigation className="w-3.5 h-3.5" /> Abrir en Google Maps
                        </a>
                     </div>
                  )}

                  {/* Botón para compartir ubicación actual del celular que la encontró */}
                  {data.owner_phone && (
                     <button
                        onClick={handleSendLocation}
                        disabled={sendingLocation}
                        className="w-full py-3 px-4 bg-neutral-900 hover:bg-neutral-800 text-white rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-md"
                     >
                        <Send className="w-4 h-4 text-pink-400" />
                        {sendingLocation ? 'Obteniendo tu ubicación...' : '📍 Enviar mi ubicación actual al dueño por WhatsApp'}
                     </button>
                  )}

               </div>

            </div>

            {/* Pie de página */}
            <div className="text-center text-xs text-neutral-500 pb-6">
               <p>Powered by <span className="text-pink-500 font-bold">PetConnect</span> · Collares Inteligentes con Amor</p>
            </div>

         </div>
      </div>
   );
}
