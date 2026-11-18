import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext'; // Asegúrate de que la ruta sea correcta

export const metadata: Metadata = {
  title: 'PetConnect - Rastreador y Cuidado para Mascotas',
  description:
    'Localiza a tu mascota en tiempo real, configura Zona Segura y recibe alertas y recordatorios directo en tu teléfono.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'PetConnect',
  },
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#db2777',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <AuthProvider>
          {/* Aquí se renderizará la Landing Page o el Dashboard dependiendo de la URL */}
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
