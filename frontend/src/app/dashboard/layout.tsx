'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardNavbar from '@/components/DashboardNavbar';
import { useAuth } from '@/context/AuthContext';

export default function DashboardLayout({
   children,
}: {
   children: React.ReactNode;
}) {
   const { token, loading } = useAuth();
   const router = useRouter();

   // Guardia de sesión: sin token se redirige al login
   useEffect(() => {
      if (!loading && !token) router.replace('/login?next=/dashboard');
   }, [loading, token, router]);

   if (loading || !token) {
      return (
         <div className="h-screen flex items-center justify-center bg-neutral-50">
            <span className="text-neutral-500 font-medium animate-pulse">Cargando...</span>
         </div>
      );
   }

   return (
      <div className="h-screen bg-neutral-50 flex flex-col overflow-hidden">
         {/* Barra de navegación superior fija */}
         <DashboardNavbar />

         {/* Contenedor principal que ocupa todo el espacio restante */}
         <div className="flex flex-1 relative overflow-hidden">
            <main className="flex-1 relative w-full h-full">{children}</main>
         </div>
      </div>
   );
}
