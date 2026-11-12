'use client';

import { useState } from 'react';
import {
   HeartHandshake,
   ImageOff,
   Mail,
   MapPin,
   MessageCircle,
   Navigation,
   Phone,
} from 'lucide-react';

export interface ShelterInfo {
   id: string;
   name: string;
   photoPath: string;
   photoAlt: string;
   address: string;
   phone: string;
   whatsapp: string;
   email: string;
}

// Puedes editar estos datos y guardar las imágenes en frontend/public/images/albergues/
export const SHELTERS: ShelterInfo[] = [
   {
      id: 'albergue-1',
      name: 'Albergue Patitas Seguras',
      photoPath: '/images/albergues/albergue-1.jpg',
      photoAlt: 'Fotografía del Albergue Patitas Seguras',
      address: 'Av. España 1420, Urb. Centro, Trujillo',
      phone: '+51 944 123 456',
      whatsapp: '51944123456',
      email: 'contacto@patitasseguras.org',
   },
   {
      id: 'albergue-2',
      name: 'Refugio Huellitas de Amor',
      photoPath: '/images/albergues/albergue-2.jpg',
      photoAlt: 'Fotografía del Refugio Huellitas de Amor',
      address: 'Jr. Pizarro 685, Trujillo',
      phone: '+51 948 654 321',
      whatsapp: '51948654321',
      email: 'refugio@huellitasdeamor.org',
   },
];

interface SheltersCardProps {
   petName?: string | null;
}

export default function SheltersCard({ petName }: SheltersCardProps) {
   const [missingPhotos, setMissingPhotos] = useState<Record<string, boolean>>({});

   const markMissingPhoto = (id: string) => {
      setMissingPhotos((prev) => (prev[id] ? prev : { ...prev, [id]: true }));
   };

   return (
      <section className="bg-white text-neutral-900 rounded-3xl border border-pink-100/90 shadow-xl overflow-hidden">
         {/* Franja superior acorde a la paleta PetConnect */}
         <div className="h-1.5 w-full bg-gradient-to-r from-pink-600 via-pink-500 to-sky-400" />

         <div className="p-6 sm:p-8 space-y-5">
            {/* Cabecera de la tarjeta */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-100">
               <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-pink-50 border border-pink-100 text-pink-600 flex items-center justify-center shrink-0">
                     <HeartHandshake className="w-5 h-5" />
                  </div>
                  <div>
                     <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-700 text-[10px] font-extrabold uppercase tracking-wider mb-1">
                        Red de Resguardo Temporal
                     </span>
                     <h3 className="text-lg sm:text-xl font-black text-neutral-900 tracking-tight">
                        Albergues donde puedes dejarlo a salvo
                     </h3>
                     <p className="text-xs sm:text-sm text-neutral-500 mt-0.5 leading-relaxed">
                        Si no logras ubicar al dueño de inmediato, estos albergues pueden recibir temporalmente a{' '}
                        <span className="font-semibold text-neutral-700">{petName || 'la mascota'}</span>.
                     </p>
                  </div>
               </div>
            </div>

            {/* Lista de albergues */}
            <div className="space-y-4">
               {SHELTERS.map((shelter) => {
                  const cleanTel = shelter.phone.replace(/[^0-9+]/g, '');
                  const waMessage = `¡Hola! Encontré a ${petName ? `la mascota "${petName}"` : 'una mascota'} con placa PetConnect y quisiera consultar si puedo dejarla en resguardo temporal.`;
                  const hasPhotoError = Boolean(missingPhotos[shelter.id]);

                  return (
                     <article
                        key={shelter.id}
                        className="rounded-2xl border border-neutral-200/80 bg-neutral-50/70 hover:bg-white hover:border-pink-200 transition-colors p-4 sm:p-5"
                     >
                        <div className="flex flex-col sm:flex-row gap-4 items-start">
                           {/* Fotografía del albergue con fallback visual usando texto alternativo */}
                           <div className="w-full sm:w-28 h-36 sm:h-28 rounded-2xl overflow-hidden shrink-0 border border-pink-100 bg-gradient-to-br from-pink-50 via-white to-sky-50 flex items-center justify-center">
                              {!hasPhotoError ? (
                                 // eslint-disable-next-line @next/next/no-img-element
                                 <img
                                    src={shelter.photoPath}
                                    alt={shelter.photoAlt}
                                    onError={() => markMissingPhoto(shelter.id)}
                                    className="w-full h-full object-cover"
                                 />
                              ) : (
                                 <div className="w-full h-full p-2.5 flex flex-col items-center justify-center text-center gap-1.5">
                                    <div className="w-8 h-8 rounded-xl bg-pink-100/80 text-pink-600 flex items-center justify-center">
                                       <ImageOff className="w-4 h-4" />
                                    </div>
                                    <span className="text-[11px] font-semibold text-neutral-600 leading-tight line-clamp-3">
                                       {shelter.photoAlt}
                                    </span>
                                 </div>
                              )}
                           </div>

                           {/* Información y canales de contacto */}
                           <div className="flex-1 min-w-0 w-full space-y-3">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                 <h4 className="text-base font-extrabold text-neutral-900 leading-tight">
                                    {shelter.name}
                                 </h4>
                                 <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-pink-100 text-pink-700">
                                    Albergue aliado
                                 </span>
                              </div>

                              {/* Ubicación */}
                              <div className="flex items-start justify-between gap-2 bg-white px-3 py-2.5 rounded-xl border border-neutral-200/70">
                                 <div className="flex items-start gap-2 min-w-0">
                                    <MapPin className="w-4 h-4 text-pink-600 shrink-0 mt-0.5" />
                                    <div className="min-w-0">
                                       <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                                          Ubicación
                                       </span>
                                       <p className="text-xs font-semibold text-neutral-800 break-words">
                                          {shelter.address}
                                       </p>
                                    </div>
                                 </div>
                                 <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shelter.address)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-pink-600 hover:text-pink-700 shrink-0 mt-1"
                                 >
                                    <Navigation className="w-3.5 h-3.5" />
                                    Mapa
                                 </a>
                              </div>

                              {/* Teléfono, WhatsApp y Correo */}
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                 <a
                                    href={`tel:${cleanTel}`}
                                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/70 text-emerald-800 transition-colors"
                                 >
                                    <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <div className="min-w-0">
                                       <span className="text-[10px] font-bold uppercase block leading-none text-emerald-700/80">
                                          Teléfono
                                       </span>
                                       <span className="text-xs font-bold truncate block mt-0.5">
                                          {shelter.phone}
                                       </span>
                                    </div>
                                 </a>

                                 <a
                                    href={`https://wa.me/${shelter.whatsapp}?text=${encodeURIComponent(waMessage)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-500 hover:bg-green-600 text-white transition-colors shadow-sm"
                                 >
                                    <MessageCircle className="w-4 h-4 shrink-0" />
                                    <div className="min-w-0">
                                       <span className="text-[10px] font-bold uppercase block leading-none text-green-100">
                                          WhatsApp
                                       </span>
                                       <span className="text-xs font-bold truncate block mt-0.5">
                                          Escribir ahora
                                       </span>
                                    </div>
                                 </a>

                                 <a
                                    href={`mailto:${shelter.email}?subject=${encodeURIComponent(`Resguardo temporal - ${petName || 'Mascota PetConnect'}`)}`}
                                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 border border-sky-200/70 text-sky-800 transition-colors"
                                 >
                                    <Mail className="w-4 h-4 text-sky-600 shrink-0" />
                                    <div className="min-w-0">
                                       <span className="text-[10px] font-bold uppercase block leading-none text-sky-700/80">
                                          Correo
                                       </span>
                                       <span className="text-xs font-bold truncate block mt-0.5">
                                          {shelter.email}
                                       </span>
                                    </div>
                                 </a>
                              </div>
                           </div>
                        </div>
                     </article>
                  );
               })}
            </div>
         </div>
      </section>
   );
}
