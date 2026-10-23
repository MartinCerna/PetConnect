// src/components/ContactSection.tsx
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Phone, Mail, MapPin, MessageCircle } from 'lucide-react';
import { apiFetch, errorMessage } from '@/lib/api';

const DOG_IMAGE_SRC = '/images/perrito-collar.png';

const CONTACT_INFO = [
   { icon: Phone, text: '999 999 999' },
   { icon: Mail, text: 'hola@petconnect.com' },
   { icon: MapPin, text: 'Trujillo, La Libertad - Perú' },
];

function InstagramIcon({ className }: { className?: string }) {
   return (
      <svg
         viewBox="0 0 24 24"
         fill="none"
         stroke="currentColor"
         strokeWidth={2}
         strokeLinecap="round"
         strokeLinejoin="round"
         className={className}
         aria-hidden="true"
      >
         <rect x="3" y="3" width="18" height="18" rx="5" />
         <circle cx="12" cy="12" r="4" />
         <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
      </svg>
   );
}

function TikTokIcon({ className }: { className?: string }) {
   return (
      <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
         <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
      </svg>
   );
}

const SOCIALS = [
   { name: 'Instagram', href: '#', icon: InstagramIcon, color: 'bg-pink-500 hover:bg-pink-600' },
   { name: 'WhatsApp', href: '#', icon: MessageCircle, color: 'bg-green-500 hover:bg-green-600' },
   { name: 'TikTok', href: '#', icon: TikTokIcon, color: 'bg-neutral-950 hover:bg-neutral-700' },
];

export default function ContactSection() {
   const [form, setForm] = useState({ name: '', email: '', message: '' });
   const [sent, setSent] = useState(false);
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState('');
   const [imageError, setImageError] = useState(false);

   const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm({ ...form, [e.target.name]: e.target.value });

   const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setError('');
      try {
         const res = await apiFetch('/contact/', {
            method: 'POST',
            body: JSON.stringify(form),
         });
         if (res.ok) {
            setSent(true);
            setForm({ name: '', email: '', message: '' });
         } else {
            setError(await errorMessage(res, 'Error al enviar el mensaje.'));
         }
      } catch {
         setError('No se pudo conectar con el servidor.');
      } finally {
         setLoading(false);
      }
   };

   const inputClass =
      'w-full px-4 py-3 rounded-xl border border-neutral-200 bg-white text-sm text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-sky-400';

   return (
      <section id="contacto" className="py-16 sm:py-20 bg-neutral-50 border-t border-neutral-200 scroll-mt-20">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 lg:gap-12 items-start">
            
            {/* 1. Información y redes */}
            <div className="space-y-6 text-center sm:text-left">
               <div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-neutral-950">¿Tienes dudas?</h2>
                  <p className="text-neutral-500 text-sm mt-1">Estamos aquí para ayudarte en todo momento.</p>
               </div>

               <div className="flex gap-3 justify-center sm:justify-start">
                  {SOCIALS.map(({ name, href, icon: Icon, color }) => (
                     <a
                        key={name}
                        href={href}
                        aria-label={name}
                        title={name}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white transition shadow-md ${color}`}
                     >
                        <Icon className="w-5 h-5" />
                     </a>
                  ))}
               </div>

               <ul className="space-y-3 pt-2 text-left">
                  {CONTACT_INFO.map(({ icon: Icon, text }) => (
                     <li key={text} className="flex items-center gap-3 text-xs sm:text-sm text-neutral-700">
                        <span className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center shrink-0">
                           <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                        </span>
                        <span>{text}</span>
                     </li>
                  ))}
               </ul>
            </div>

            {/* 2. Formulario de contacto */}
            <form
               onSubmit={handleSubmit}
               className="bg-white rounded-2xl border border-neutral-200 p-5 sm:p-6 space-y-4 shadow-sm"
            >
               <div className="space-y-1">
                  <label htmlFor="name" className="text-xs sm:text-sm font-semibold text-neutral-700">
                     Nombre
                  </label>
                  <input
                     id="name"
                     name="name"
                     type="text"
                     required
                     value={form.name}
                     onChange={handleChange}
                     placeholder="Tu nombre"
                     className={inputClass}
                  />
               </div>
               <div className="space-y-1">
                  <label htmlFor="email" className="text-xs sm:text-sm font-semibold text-neutral-700">
                     Correo
                  </label>
                  <input
                     id="email"
                     name="email"
                     type="email"
                     required
                     value={form.email}
                     onChange={handleChange}
                     placeholder="tucorreo@ejemplo.com"
                     className={inputClass}
                  />
               </div>
               <div className="space-y-1">
                  <label htmlFor="message" className="text-xs sm:text-sm font-semibold text-neutral-700">
                     Mensaje
                  </label>
                  <textarea
                     id="message"
                     name="message"
                     required
                     rows={4}
                     value={form.message}
                     onChange={handleChange}
                     placeholder="¿En qué podemos ayudarte?"
                     className={`${inputClass} resize-none`}
                  />
               </div>

               {error && (
                  <p className="text-xs sm:text-sm text-red-600 text-center font-medium">
                     {error}
                  </p>
               )}

               <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-pink-600 hover:bg-pink-700 text-white font-semibold rounded-xl text-sm transition shadow-lg shadow-pink-200 disabled:opacity-50"
               >
                  {loading ? 'Enviando...' : 'Enviar mensaje'}
               </button>
               {sent && (
                  <p className="text-xs sm:text-sm text-green-600 text-center font-medium">
                     ¡Mensaje enviado con éxito! Te responderemos pronto.
                  </p>
               )}
            </form>

            {/* 3. Imagen del perrito con el collar */}
            <div className="relative w-full aspect-[4/5] rounded-2xl overflow-hidden border border-neutral-200 bg-neutral-100 col-span-1 md:col-span-2 lg:col-span-1 max-w-md mx-auto">
               {imageError ? (
                  <div className="absolute inset-0 flex items-center justify-center text-center text-xs text-neutral-400 p-6 border-2 border-dashed border-neutral-300 rounded-2xl">
                     Coloca la imagen del perrito con el collar en
                     <br />
                     public{DOG_IMAGE_SRC}
                  </div>
               ) : (
                  <Image
                     src={DOG_IMAGE_SRC}
                     alt="Perrito usando el collar inteligente PetConnect"
                     fill
                     sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                     className="object-cover"
                     onError={() => setImageError(true)}
                  />
               )}
            </div>

         </div>
      </section>
   );
}
