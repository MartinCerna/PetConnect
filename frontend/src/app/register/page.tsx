// src/app/register/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Logo from '@/components/Logo';
import { API_BASE, errorMessage } from '@/lib/api';

const inputClass =
   'w-full px-4 py-2.5 border border-neutral-300 rounded-xl text-neutral-800 text-sm focus:ring-2 focus:ring-sky-400 focus:outline-none';
const labelClass = 'block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1';

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
         const res = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ full_name: fullName, email, password }),
         });

         if (res.ok) {
            router.push('/login?registered=1');
         } else {
            setError(await errorMessage(res, 'Error al crear la cuenta. Verifica los datos.'));
         }
      } catch (err) {
         console.error('Error registrando usuario:', err);
         setError('No se pudo conectar con el servidor.');
      } finally {
         setLoading(false);
      }
   };

   return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center p-4">
         <div className="bg-white max-w-md w-full p-8 rounded-2xl shadow-xl border border-neutral-200">
            <div className="text-center mb-8">
               <div className="inline-flex items-center justify-center mb-3">
                  <Logo size={48} />
               </div>
               <h1 className="text-2xl font-bold text-neutral-950">Crear Cuenta en PetConnect</h1>
               <p className="text-sm text-neutral-500 mt-1">
                  Regístrate para gestionar y localizar a tus mascotas
               </p>
            </div>

            {error && (
               <div
                  role="alert"
                  className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-xs font-medium"
               >
                  {error}
               </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
               <div>
                  <label htmlFor="fullName" className={labelClass}>
                     Nombre Completo
                  </label>
                  <input
                     id="fullName"
                     type="text"
                     required
                     autoComplete="name"
                     value={fullName}
                     onChange={(e) => setFullName(e.target.value)}
                     placeholder="Ej. Martín Pérez"
                     className={inputClass}
                  />
               </div>

               <div>
                  <label htmlFor="email" className={labelClass}>
                     Correo Electrónico
                  </label>
                  <input
                     id="email"
                     type="email"
                     required
                     autoComplete="email"
                     value={email}
                     onChange={(e) => setEmail(e.target.value)}
                     placeholder="tu@email.com"
                     className={inputClass}
                  />
               </div>

               <div>
                  <label htmlFor="password" className={labelClass}>
                     Contraseña
                  </label>
                  <input
                     id="password"
                     type="password"
                     required
                     minLength={8}
                     autoComplete="new-password"
                     value={password}
                     onChange={(e) => setPassword(e.target.value)}
                     placeholder="••••••••"
                     className={inputClass}
                  />
                  <p className="text-[11px] text-neutral-400 mt-1">Mínimo 8 caracteres.</p>
               </div>

               <div>
                  <label htmlFor="confirmPassword" className={labelClass}>
                     Confirmar Contraseña
                  </label>
                  <input
                     id="confirmPassword"
                     type="password"
                     required
                     minLength={8}
                     autoComplete="new-password"
                     value={confirmPassword}
                     onChange={(e) => setConfirmPassword(e.target.value)}
                     placeholder="••••••••"
                     className={inputClass}
                  />
               </div>

               <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-pink-600 hover:bg-pink-700 text-white font-medium rounded-xl text-sm transition shadow-lg shadow-pink-200 disabled:opacity-50"
               >
                  {loading ? 'Creando cuenta...' : 'Registrarse'}
               </button>
            </form>

            <p className="text-center text-xs text-neutral-500 mt-6">
               ¿Ya tienes una cuenta?{' '}
               <Link href="/login" className="text-pink-600 font-bold hover:underline">
                  Inicia sesión aquí
               </Link>
            </p>
         </div>
      </div>
   );
}
