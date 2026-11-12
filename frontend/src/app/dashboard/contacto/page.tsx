'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Phone, MapPin, User, CheckCircle2, QrCode, ExternalLink, Copy, Check, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import SheltersCard from '@/components/SheltersCard';

export default function ContactoEmergenciaPage() {
   const { user, userPets, selectedPet, setSelectedPet, updateProfile } = useAuth();

   // Formulario de datos del dueño
   const [fullName, setFullName] = useState('');
   const [phone, setPhone] = useState('');
   const [address, setAddress] = useState('');
   const [saving, setSaving] = useState(false);
   const [savedMessage, setSavedMessage] = useState('');
   const [copied, setCopied] = useState(false);

   useEffect(() => {
      if (user) {
         setFullName(user.full_name || '');
         setPhone(user.phone || '');
         setAddress(user.address || '');
      }
   }, [user]);

   const handleSave = async (e: React.FormEvent) => {
      e.preventDefault();
      setSaving(true);
      setSavedMessage('');

      const ok = await updateProfile({
         full_name: fullName,
         phone: phone,
         address: address,
      });

      setSaving(false);
      if (ok) {
         setSavedMessage('¡Datos de contacto guardados exitosamente!');
         setTimeout(() => setSavedMessage(''), 4000);
      } else {
         alert('Error al guardar los datos. Inténtalo nuevamente.');
      }
   };

   // Mascota activa para la vista previa de la placa
   const currentPet = selectedPet || (userPets && userPets[0]) || null;
   const publicTagUrl = typeof window !== 'undefined' && currentPet ? `${window.location.origin}/tag/${currentPet.id}` : '';

   const handleCopyLink = () => {
      if (!publicTagUrl) return;
      navigator.clipboard.writeText(publicTagUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
   };

   // Limpia el número de teléfono para enlaces de WhatsApp y llamada
   const cleanPhone = (phone || '').replace(/[^0-9+]/g, '');
   const waNumber = cleanPhone.startsWith('+') ? cleanPhone.replace('+', '') : cleanPhone.length === 9 ? `51${cleanPhone}` : cleanPhone;

   return (
      <div className="h-full overflow-y-auto bg-neutral-100/60 p-4 sm:p-6 lg:p-8">
         <div className="max-w-6xl mx-auto space-y-6">

            {/* Cabecera */}
            <div>
               <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-100 text-pink-700 text-xs font-semibold mb-2">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Placa y Contacto de Emergencia
               </div>
               <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
                  Identificación y Datos de Contacto
               </h1>
               <p className="text-sm text-neutral-500 mt-1">
                  En caso de que alguien encuentre a tu mascota, podrá escanear la placa o ingresar a este menú para comunicarse contigo de inmediato.
               </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

               {/* Columna Izquierda: Formulario de Configuración del Dueño */}
               <div className="lg:col-span-5 bg-white p-6 sm:p-7 rounded-2xl border border-neutral-200/80 shadow-sm space-y-5">
                  <div className="flex items-center gap-2 pb-3 border-b border-neutral-100">
                     <div className="w-9 h-9 rounded-xl bg-pink-50 flex items-center justify-center text-pink-600 font-bold">
                        <User className="w-5 h-5" />
                     </div>
                     <div>
                        <h2 className="font-bold text-base text-neutral-900">Tus Datos de Contacto</h2>
                        <p className="text-xs text-neutral-400">Visibles para quien encuentre a tu mascota</p>
                     </div>
                  </div>

                  <form onSubmit={handleSave} className="space-y-4">
                     <div>
                        <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                           Nombre Completo
                        </label>
                        <div className="relative">
                           <User className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
                           <input
                              type="text"
                              required
                              value={fullName}
                              onChange={(e) => setFullName(e.target.value)}
                              placeholder="Ej: Martín Cerna"
                              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-pink-500 transition"
                           />
                        </div>
                     </div>

                     <div>
                        <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                           Número de Celular / Teléfono
                        </label>
                        <div className="relative">
                           <Phone className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
                           <input
                              type="tel"
                              required
                              value={phone}
                              onChange={(e) => setPhone(e.target.value)}
                              placeholder="Ej: +51 987654321"
                              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-pink-500 transition"
                           />
                        </div>
                        <p className="text-[11px] text-neutral-400 mt-1">
                           Permitirá llamadas y mensajes directos por WhatsApp desde la placa.
                        </p>
                     </div>

                     <div>
                        <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                           Dirección del Hogar
                        </label>
                        <div className="relative">
                           <MapPin className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
                           <textarea
                              rows={3}
                              required
                              value={address}
                              onChange={(e) => setAddress(e.target.value)}
                              placeholder="Ej: Av. Las Palmeras 123, Urb. Los Olivos, Lima"
                              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-pink-500 transition resize-none"
                           />
                        </div>
                        <p className="text-[11px] text-neutral-400 mt-1">
                           Para que puedan llevar a tu mascota directamente a tu casa.
                        </p>
                     </div>

                     {savedMessage && (
                        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-medium flex items-center gap-2">
                           <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                           <span>{savedMessage}</span>
                        </div>
                     )}

                     <button
                        type="submit"
                        disabled={saving}
                        className="w-full py-3 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-sm font-bold transition shadow-sm disabled:opacity-50"
                     >
                        {saving ? 'Guardando cambios...' : 'Guardar Datos de Contacto'}
                     </button>
                  </form>
               </div>

               {/* Columna Derecha: Vista Previa de la Placa y Código QR */}
               <div className="lg:col-span-7 space-y-6">

                  {/* Selector de mascota si tiene varias */}
                  {userPets && userPets.length > 1 && (
                     <div className="bg-white p-3.5 rounded-xl border border-neutral-200 flex items-center gap-3">
                        <span className="text-xs font-bold text-neutral-600">Ver placa de:</span>
                        <div className="flex gap-2 flex-wrap">
                           {userPets.map((p) => (
                              <button
                                 key={p.id}
                                 onClick={() => setSelectedPet(p)}
                                 className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                                    currentPet?.id === p.id
                                       ? 'bg-pink-600 text-white shadow-sm'
                                       : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                                 }`}
                              >
                                 {p.name}
                              </button>
                           ))}
                        </div>
                     </div>
                  )}

                  {/* Tarjeta de Emergencia (Carnet de Contacto) */}
                  <div className="bg-gradient-to-br from-pink-600 via-rose-600 to-neutral-900 rounded-3xl p-1 shadow-xl">
                     <div className="bg-white rounded-[22px] p-6 sm:p-8 space-y-6">
                        
                        {/* Cabecera de la Placa */}
                        <div className="flex items-center justify-between border-b pb-4">
                           <div className="flex items-center gap-3">
                              <span className="text-3xl">🦴</span>
                              <div>
                                 <span className="text-[10px] uppercase tracking-widest text-pink-600 font-extrabold block">
                                    PetConnect Tag · Contacto de Emergencia
                                 </span>
                                 <h3 className="text-xl font-black text-neutral-900">
                                    {currentPet ? `Placa de ${currentPet.name}` : 'Mascota Registrada'}
                                 </h3>
                              </div>
                           </div>
                           <span className="bg-rose-100 text-rose-700 text-xs font-bold px-3 py-1 rounded-full border border-rose-200 animate-pulse">
                              🆘 Si me encuentras
                           </span>
                        </div>

                        {/* Foto y mensaje */}
                        <div className="flex flex-col sm:flex-row items-center gap-5 bg-neutral-50 p-4 rounded-2xl border border-neutral-100">
                           <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-tr from-pink-400 to-sky-400 p-1 shrink-0 shadow-md">
                              {currentPet?.photo_url ? (
                                 // eslint-disable-next-line @next/next/no-img-element
                                 <img
                                    src={currentPet.photo_url}
                                    alt={currentPet.name}
                                    className="w-full h-full object-cover rounded-[14px]"
                                 />
                              ) : (
                                 <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center text-3xl">
                                    🐶
                                 </div>
                              )}
                           </div>
                           <div className="text-center sm:text-left space-y-1">
                              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">
                                 {currentPet?.species || 'Mascota'} · {currentPet?.breed || 'Raza no especificada'}
                              </p>
                              <h4 className="text-lg font-bold text-neutral-900">
                                 ¡Hola! Me llamo {currentPet?.name || 'mi amigo'}
                              </h4>
                              <p className="text-xs text-neutral-600 leading-relaxed">
                                 Estoy lejos de casa. Por favor contacta a mi dueño para que pueda volver sano y salvo con mi familia.
                              </p>
                           </div>
                        </div>

                        {/* Datos de contacto que verá la persona */}
                        <div className="space-y-3">
                           <div className="p-4 bg-sky-50/70 border border-sky-100 rounded-2xl flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3">
                                 <div className="w-10 h-10 rounded-xl bg-sky-500 text-white flex items-center justify-center font-bold">
                                    <User className="w-5 h-5" />
                                 </div>
                                 <div>
                                    <span className="text-[10px] text-sky-700 uppercase font-bold block">Dueño(a)</span>
                                    <span className="font-extrabold text-neutral-900 text-sm">
                                       {fullName || 'No configurado aún'}
                                    </span>
                                 </div>
                              </div>
                           </div>

                           <div className="p-4 bg-emerald-50/70 border border-emerald-100 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="flex items-center gap-3">
                                 <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold">
                                    <Phone className="w-5 h-5" />
                                 </div>
                                 <div>
                                    <span className="text-[10px] text-emerald-700 uppercase font-bold block">Teléfono / Celular</span>
                                    <span className="font-extrabold text-neutral-900 text-sm">
                                       {phone || 'No configurado aún'}
                                    </span>
                                 </div>
                              </div>
                              {phone && (
                                 <div className="flex items-center gap-2">
                                    <a
                                       href={`tel:${cleanPhone}`}
                                       className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-sm"
                                    >
                                       <Phone className="w-3.5 h-3.5" /> Llamar
                                    </a>
                                    <a
                                       href={`https://wa.me/${waNumber}?text=${encodeURIComponent(`¡Hola! Encontré a tu mascota ${currentPet?.name || ''}.`)}`}
                                       target="_blank"
                                       rel="noopener noreferrer"
                                       className="px-3.5 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-sm"
                                    >
                                       WhatsApp
                                    </a>
                                 </div>
                              )}
                           </div>

                           <div className="p-4 bg-pink-50/70 border border-pink-100 rounded-2xl flex items-start gap-3">
                              <div className="w-10 h-10 rounded-xl bg-pink-500 text-white flex items-center justify-center font-bold shrink-0 mt-0.5">
                                 <MapPin className="w-5 h-5" />
                              </div>
                              <div>
                                 <span className="text-[10px] text-pink-700 uppercase font-bold block">Dirección del Hogar</span>
                                 <span className="font-semibold text-neutral-800 text-xs sm:text-sm">
                                    {address || 'No configurada aún'}
                                 </span>
                              </div>
                           </div>
                        </div>

                        {/* Enlace público y QR */}
                        {currentPet && (
                           <div className="pt-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4">
                              <div className="flex items-center gap-2 text-xs text-neutral-500 w-full sm:w-auto">
                                 <QrCode className="w-4 h-4 text-pink-600 shrink-0" />
                                 <span className="truncate max-w-[280px]">
                                    {publicTagUrl}
                                 </span>
                              </div>
                              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                                 <button
                                    onClick={handleCopyLink}
                                    className="px-3 py-1.5 border border-neutral-200 hover:bg-neutral-50 text-neutral-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                                 >
                                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                    {copied ? '¡Copiado!' : 'Copiar enlace'}
                                 </button>
                                 <Link
                                    href={`/tag/${currentPet.id}`}
                                    target="_blank"
                                    className="px-3.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
                                 >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    Ver Placa Pública
                                 </Link>
                              </div>
                           </div>
                        )}

                     </div>
                  </div>

                  {/* Tarjeta de Albergues debajo de la opción de Placa Pública */}
                  <SheltersCard petName={currentPet?.name} />

               </div>

            </div>

         </div>
      </div>
   );
}

