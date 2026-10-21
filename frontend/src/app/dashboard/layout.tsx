'use client';

import DashboardNavbar from '@/components/DashboardNavbar';
// Si quieres mantener el Sidebar como un menú deslizante (offcanvas), lo dejaremos comentado por ahora.
// import Sidebar from '@/components/Sidebar';

export default function DashboardLayout({
   children,
}: {
   children: React.ReactNode;
}) {
   return (
      <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
         {/* Barra de navegación superior fija */}
         <DashboardNavbar />

         {/* Contenedor principal que ocupa todo el espacio restante */}
         <div className="flex flex-1 relative overflow-hidden">
            {/* Aquí iba el <Sidebar />. Lo quitamos para liberar el espacio. */}

            <main className="flex-1 relative w-full h-full">
               {children}
            </main>
         </div>
      </div>
   );
}