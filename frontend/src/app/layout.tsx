import './globals.css';
import { AuthProvider } from '@/context/AuthContext'; // Asegúrate de que la ruta sea correcta

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