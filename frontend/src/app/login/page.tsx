// src/app/login/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
   const router = useRouter();
   const { login } = useAuth();

   const [email, setEmail] = useState('');
   const [password, setPassword] = useState('');
   const [error, setError] = useState('');

   // SOLUCIÓN: Declaración del estado de carga que faltaba
   const [loading, setLoading] = useState(false);

   const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      setLoading(true);

      // Empaquetar los datos en el formato exacto que exige FastAPI OAuth2
      const formData = new URLSearchParams();
      formData.append('username', email); // Obligatorio llamarse 'username'
      formData.append('password', password);

      const success = await login(formData);

      if (success) {
         router.push('/dashboard');
      } else {
         setError('Credenciales inválidas. Verifica tu correo y contraseña.');
         setLoading(false);
      }
   };

   return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
         <div className="bg-white max-w-md w-full p-8 rounded-2xl shadow-xl border border-slate-100">

            <div className="text-center mb-8">
               <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-600 text-white rounded-xl font-bold text-xl mb-3 shadow-md">
                  🐾
               </div>
               <h1 className="text-2xl font-bold text-slate-900">PetConnect</h1>
               <p className="text-sm text-slate-500 mt-1">
                  Plataforma Empresarial de Geolocalización de Mascotas
               </p>
            </div>

            {error && (
               <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-xs font-medium text-center">
                  {error}
               </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
               <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                     Correo Electrónico
                  </label>
                  <input
                     type="email"
                     required
                     value={email}
                     onChange={(e) => setEmail(e.target.value)}
                     className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
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
                     className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
               </div>

               <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl text-sm transition shadow-lg shadow-indigo-200 disabled:opacity-50 mt-2"
               >
                  {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
               </button>
            </form>

            <p className="text-center text-xs text-slate-500 mt-6">
               ¿No tienes una cuenta?{' '}
               <Link href="/register" className="text-indigo-600 font-bold hover:underline">
                  Regístrate aquí
               </Link>
            </p>

         </div>
      </div>
   );
}