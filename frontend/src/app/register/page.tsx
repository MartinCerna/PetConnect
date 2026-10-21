// src/app/register/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
   const router = useRouter();
   const [fullName, setFullName] = useState('');
   const [email, setEmail] = useState('');
   const [password, setPassword] = useState('');
   const [confirmPassword, setConfirmPassword] = useState('');
   const [error, setError] = useState('');
   const [loading, setLoading] = useState(false);

   const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');

      if (password !== confirmPassword) {
         setError('Las contraseñas no coinciden.');
         return;
      }

      setLoading(true);

      try {
         const res = await fetch('http://127.0.0.1:8000/api/v1/auth/register/', {
            method: 'POST',
            headers: {
               'Content-Type': 'application/json',
            },
            body: JSON.stringify({
               full_name: fullName,
               email,
               password,
            }),
         });

         if (res.ok) {
            alert('Cuenta creada con éxito. Procede a iniciar sesión.');
            router.push('/login');
         } else {
            const data = await res.json();
            setError(data.detail || 'Error al crear la cuenta. Verifica los datos.');
         }
      } catch (err) {
         console.error('Error registrando usuario:', err);
         setError('No se pudo conectar con el servidor.');
      } finally {
         setLoading(false);
      }
   };

   return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
         <div className="bg-white max-w-md w-full p-8 rounded-2xl shadow-xl border border-slate-200">
            <div className="text-center mb-8">
               <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-600 text-white rounded-xl font-bold text-xl mb-3 shadow-md">
                  🐾
               </div>
               <h1 className="text-2xl font-bold text-slate-900">Crear Cuenta en PetConnect</h1>
               <p className="text-sm text-slate-500 mt-1">
                  Regístrate para gestionar y localizar a tus mascotas
               </p>
            </div>

            {error && (
               <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-xs font-medium">
                  {error}
               </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
               <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                     Nombre Completo
                  </label>
                  <input
                     type="text"
                     required
                     value={fullName}
                     onChange={(e) => setFullName(e.target.value)}
                     placeholder="Ej. Martín Pérez"
                     className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
               </div>

               <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                     Correo Electrónico
                  </label>
                  <input
                     type="email"
                     required
                     value={email}
                     onChange={(e) => setEmail(e.target.value)}
                     placeholder="tu@email.com"
                     className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
               </div>

               <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                     Contraseña
                  </label>
                  <input
                     type="password"
                     required
                     value={password}
                     onChange={(e) => setPassword(e.target.value)}
                     placeholder="••••••••"
                     className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
               </div>

               <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                     Confirmar Contraseña
                  </label>
                  <input
                     type="password"
                     required
                     value={confirmPassword}
                     onChange={(e) => setConfirmPassword(e.target.value)}
                     placeholder="••••••••"
                     className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
               </div>

               <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl text-sm transition shadow-lg shadow-indigo-200 disabled:opacity-50"
               >
                  {loading ? 'Creando cuenta...' : 'Registrarse'}
               </button>
            </form>

            <p className="text-center text-xs text-slate-500 mt-6">
               ¿Ya tienes una cuenta?{' '}
               <Link href="/login" className="text-indigo-600 font-bold hover:underline">
                  Inicia sesión aquí
               </Link>
            </p>
         </div>
      </div>
   );
}