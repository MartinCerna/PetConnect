// src/app/login/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import Logo from '@/components/Logo';

const inputClass =
   'w-full px-4 py-2.5 bg-neutral-100 border border-neutral-200 rounded-xl text-neutral-800 text-sm focus:ring-2 focus:ring-sky-400 focus:outline-none';

export default function LoginPage() {
   const router = useRouter();
   const { login } = useAuth();

   const [email, setEmail] = useState('');
   const [password, setPassword] = useState('');
   const [error, setError] = useState('');
   const [loading, setLoading] = useState(false);
   const [justRegistered, setJustRegistered] = useState(false);

   // Aviso tras crear una cuenta (viene de /register)
   useEffect(() => {
      setJustRegistered(new URLSearchParams(window.location.search).get('registered') === '1');
   }, []);

   const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      setLoading(true);

      // FastAPI OAuth2 exige el campo 'username'
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      const success = await login(formData);

      if (success) {
         // Solo se aceptan rutas internas en ?next= (evita redirecciones a otros sitios)
         const next = new URLSearchParams(window.location.search).get('next');
         router.push(next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard');
      } else {
         setError('Credenciales inválidas. Verifica tu correo y contraseña.');
         setLoading(false);
      }
   };

   return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
         <div className="bg-white max-w-md w-full p-8 rounded-2xl shadow-xl border border-neutral-100">
            <div className="text-center mb-8">
               <div className="inline-flex items-center justify-center mb-3">
                  <Logo size={48} />
               </div>
               <h1 className="text-2xl font-bold text-neutral-950">PetConnect</h1>
               <p className="text-sm text-neutral-500 mt-1">Localiza a tu mascota en tiempo real</p>
            </div>

            {justRegistered && (
               <div
                  role="status"
                  className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-xs font-medium text-center"
               >
                  Cuenta creada con éxito. Ya puedes iniciar sesión.
               </div>
            )}

            {error && (
               <div
                  role="alert"
                  className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-xs font-medium text-center"
               >
                  {error}
               </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
               <div>
                  <label
                     htmlFor="email"
                     className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1"
                  >
                     Correo Electrónico
                  </label>
                  <input
                     id="email"
                     type="email"
                     required
                     autoComplete="email"
                     value={email}
                     onChange={(e) => setEmail(e.target.value)}
                     className={inputClass}
                  />
               </div>

               <div>
                  <label
                     htmlFor="password"
                     className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1"
                  >
                     Contraseña
                  </label>
                  <input
                     id="password"
                     type="password"
                     required
                     autoComplete="current-password"
                     value={password}
                     onChange={(e) => setPassword(e.target.value)}
                     className={inputClass}
                  />
               </div>

               <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-pink-600 hover:bg-pink-700 text-white font-medium rounded-xl text-sm transition shadow-lg shadow-pink-200 disabled:opacity-50 mt-2"
               >
                  {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
               </button>
            </form>

            <p className="text-center text-xs text-neutral-500 mt-6">
               ¿No tienes una cuenta?{' '}
               <Link href="/register" className="text-pink-600 font-bold hover:underline">
                  Regístrate aquí
               </Link>
            </p>
         </div>
      </div>
   );
}
