// src/components/RegisterPetModal.tsx
'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

export default function RegisterPetModal({
   isOpen,
   onClose,
}: {
   isOpen: boolean;
   onClose: () => void;
}) {
   const { registerPet } = useAuth();
   const [name, setName] = useState('');
   const [species, setSpecies] = useState<'perro' | 'gato'>('perro');
   const [breed, setBreed] = useState('');
   const [age, setAge] = useState(1);
   const [photoBase64, setPhotoBase64] = useState<string>('');
   const [preview, setPreview] = useState<string | null>(null);
   const [submitting, setSubmitting] = useState(false);

   if (!isOpen) return null;

   // Handler con compresión automática de imagen a resolución ligera
   const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
         if (!file.type.startsWith('image/')) {
            alert('Por favor selecciona un archivo de imagen válido.');
            return;
         }

         const reader = new FileReader();
         reader.onloadend = () => {
            const img = new Image();
            img.src = reader.result as string;
            img.onload = () => {
               // Crear un canvas para redimensionar la foto (máximo 300x300 px)
               const canvas = document.createElement('canvas');
               const MAX_SIZE = 300;
               let width = img.width;
               let height = img.height;

               if (width > height) {
                  if (width > MAX_SIZE) {
                     height *= MAX_SIZE / width;
                     width = MAX_SIZE;
                  }
               } else {
                  if (height > MAX_SIZE) {
                     width *= MAX_SIZE / height;
                     height = MAX_SIZE;
                  }
               }

               canvas.width = width;
               canvas.height = height;
               const ctx = canvas.getContext('2d');
               ctx?.drawImage(img, 0, 0, width, height);

               // Convertir a JPEG comprimido (calidad 70%)
               const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
               setPhotoBase64(compressedBase64);
               setPreview(compressedBase64);
            };
         };
         reader.readAsDataURL(file);
      }
   };

   const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setSubmitting(true);

      const defaultImage =
         species === 'gato'
            ? 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba'
            : 'https://images.unsplash.com/photo-1543466835-00a7907e9de1';

      const success = await registerPet({
         name,
         species,
         breed,
         age,
         photo_url: photoBase64 || defaultImage,
      });

      setSubmitting(false);

      if (success) {
         // Limpiar formulario y cerrar
         setName('');
         setBreed('');
         setAge(1);
         setPhotoBase64('');
         setPreview(null);
         onClose();
      } else {
         alert('Error registrando la tarjeta de mascota.');
      }
   };

   return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
         <div className="bg-white max-w-md w-full rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4">

            <div className="flex justify-between items-center pb-2 border-b">
               <h2 className="text-lg font-bold text-slate-900">
                  Registrar Tarjeta de Mascota 🐾
               </h2>
               <button
                  onClick={onClose}
                  className="text-slate-400 font-bold hover:text-slate-600 transition"
               >
                  ✕
               </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">

               {/* Carga e Vista Previa de la Fotografía */}
               <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                     Fotografía de la Mascota
                  </label>
                  <div className="flex items-center gap-4 p-3 bg-slate-50 border border-dashed border-slate-300 rounded-xl">
                     <div className="w-16 h-16 rounded-xl bg-slate-200 flex-shrink-0 flex items-center justify-center overflow-hidden border border-slate-300 text-2xl">
                        {preview ? (
                           <img
                              src={preview}
                              alt="Vista previa"
                              className="w-full h-full object-cover"
                           />
                        ) : (
                           <span>{species === 'gato' ? '🐈' : '🐕'}</span>
                        )}
                     </div>

                     <div className="flex-1">
                        <input
                           type="file"
                           accept="image/*"
                           onChange={handleFileChange}
                           id="pet-photo-upload"
                           className="hidden"
                        />
                        <label
                           htmlFor="pet-photo-upload"
                           className="inline-block px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-lg border border-indigo-200 cursor-pointer transition text-xs"
                        >
                           {preview ? 'Cambiar Imagen' : 'Subir Foto'}
                        </label>
                        <p className="text-[10px] text-slate-400 mt-1">
                           Formatos aceptados: JPG, PNG, WEBP.
                        </p>
                     </div>
                  </div>
               </div>

               <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nombre</label>
                  <input
                     type="text"
                     required
                     value={name}
                     onChange={(e) => setName(e.target.value)}
                     placeholder="Ej. Thor"
                     className="w-full px-3 py-2 border rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
               </div>

               <div className="grid grid-cols-2 gap-3">
                  <div>
                     <label className="block font-semibold text-slate-700 mb-1">Especie</label>
                     <select
                        value={species}
                        onChange={(e) => setSpecies(e.target.value as 'perro' | 'gato')}
                        className="w-full px-3 py-2 border rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                     >
                        <option value="perro">🐕 Perro</option>
                        <option value="gato">🐈 Gato</option>
                     </select>
                  </div>

                  <div>
                     <label className="block font-semibold text-slate-700 mb-1">
                        Edad (Años)
                     </label>
                     <input
                        type="number"
                        min="0"
                        max="30"
                        required
                        value={age}
                        onChange={(e) => setAge(Number(e.target.value))}
                        className="w-full px-3 py-2 border rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                     />
                  </div>
               </div>

               <div>
                  <label className="block font-semibold text-slate-700 mb-1">Raza</label>
                  <input
                     type="text"
                     required
                     value={breed}
                     onChange={(e) => setBreed(e.target.value)}
                     placeholder="Ej. Golden Retriever"
                     className="w-full px-3 py-2 border rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
               </div>

               <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition disabled:opacity-50 mt-2"
               >
                  {submitting ? 'Guardando...' : 'Guardar Mascota'}
               </button>
            </form>
         </div>
      </div>
   );
}