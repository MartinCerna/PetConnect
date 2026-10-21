// src/app/page.tsx
'use client';

import Navbar from '@/components/Navbar';
import CartDrawer from '@/components/CartDrawer';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

export default function LandingPage() {
  const { addToCart } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <Navbar />
      <CartDrawer />

      {/* Hero Section con Imagen del Perro con Collar en Forma de Hueso */}
      <section className="relative overflow-hidden py-20 bg-gradient-to-b from-indigo-50/50 to-slate-50">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <span className="bg-indigo-100 text-indigo-800 text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">
              Tecnología Crowdsourced Sin SIM
            </span>
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 leading-tight">
              Conecta con quien más quieres
            </h1>
            <p className="text-base text-slate-600 leading-relaxed">
              Collar inteligente con localizador y placa de identificación para tu mascota.
            </p>
            <ul>
              <li>✅ Ubicación en tiempo real</li>
              <li>✅ Plaquita con código QR</li>
              <li>✅ Diseños artesanales</li>
              <li>✅ Cómodos y resistentes</li>
            </ul>
            <div className="flex gap-4 pt-2">
              <Link
                href="/#productos"
                className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-indigo-200"
              >
                Comprar PetConnect Tag
              </Link>
              <Link
                href="/dashboard"
                className="px-6 py-3.5 bg-white hover:bg-slate-100 text-slate-800 font-bold rounded-xl text-sm transition border border-slate-200"
              >
                Ir a Mi Panel
              </Link>
            </div>
          </div>

          {/* Render Visual del Prototipo con Carcasa en Forma de Hueso */}
          <div className="relative flex justify-center">
            <div className="w-full max-w-md bg-white p-6 rounded-3xl shadow-2xl border border-slate-200 text-center space-y-4">
              <div className="relative h-64 bg-slate-100 rounded-2xl flex items-center justify-center overflow-hidden border">
                {/* Reemplazar src por la foto real del perro usando el collar hueso */}
                <div className="text-center p-6 space-y-2">
                  <div className="text-6xl">🐕🦴</div>
                  <p className="text-xs font-bold text-slate-700">
                    Prototipo PetConnect ESP32-C3
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Carcasa ligera en forma de hueso de perro con emisión BLE activa
                  </p>
                </div>
              </div>
              <div className="flex justify-around text-xs font-semibold text-slate-600">
                <span>⚡ Batería Larga Duración</span>
                <span>📡 Red Google Find My</span>
                <span>💧 Resistente al Agua</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sección Productos */}
      <section id="productos" className="py-20 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-6 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-3xl font-bold text-slate-900">Elige el estilo que va con tu compañero</h2>
            <p className="text-sm text-slate-500">
              Colores personalizados hechos a mano con amor.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 space-y-4 hover:shadow-lg transition">
              <div className="h-40 bg-white rounded-xl flex items-center justify-center text-5xl shadow-inner">
                🦴
              </div>
              <div>
                <h3 className="font-bold text-slate-900">PetConnect Tag</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Rastreador inteligente con carcasa en forma de hueso.
                </p>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-lg font-black text-slate-900">$29.99 USD</span>
                <button
                  onClick={() =>
                    addToCart({
                      id: 'tag-bone-01',
                      name: 'PetConnect Bone Tag',
                      price: 29.99,
                      quantity: 1,
                      image: '🦴',
                    })
                  }
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition"
                >
                  + Agregar al Carrito
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sección Cómo Funciona */}
      <section id="como-funciona" className="py-20 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-6 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-3xl font-bold">¿Cómo Funciona PetConnect?</h2>
            <p className="text-sm text-slate-400">
              Geolocalización participativa crowdsourced de nivel empresarial.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 space-y-3">
              <span className="text-3xl">📡</span>
              <h3 className="font-bold text-lg">1. Emisión BLE Continua</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                El collar con el chip ESP32-C3 transmite claves criptográficas publicitarias (EID) vía Bluetooth sin requerir Wi-Fi ni red celular.
              </p>
            </div>
            <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 space-y-3">
              <span className="text-3xl">📲</span>
              <h3 className="font-bold text-lg">2. Captura Anónima</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Los teléfonos Android de los transeúntes capturan la señal al pasar cerca y suben la posición cifrada a la nube de Google Find My.
              </p>
            </div>
            <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 space-y-3">
              <span className="text-3xl">🗺️</span>
              <h3 className="font-bold text-lg">3. Sincronización en Tu Mapa</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Nuestro backend procesa los datos cifrados de Google y dibuja automáticamente el recorrido de tu mascota en la web.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Sección Nosotros */}
      <section id="nosotros" className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6 text-center space-y-6">
          <h2 className="text-3xl font-bold text-slate-900">Sobre PetConnect</h2>
          <p className="text-slate-600 leading-relaxed text-sm max-w-3xl mx-auto">
            Somos una empresa tecnológica especializada en el desarrollo de soluciones hardware y plataformas IoT de vanguardia. Nuestro equipo combina ingeniería en sistemas embebidos, ciberseguridad y desarrollo web para brindar protección accesible e inteligente a todas las mascotas.
          </p>
        </div>
      </section>

      {/* Sección Contacto */}
      <section id="contacto" className="py-20 bg-slate-50 border-t border-slate-200">
        <div className="max-w-3xl mx-auto px-6 text-center space-y-6">
          <h2 className="text-3xl font-bold text-slate-900">Contacto</h2>
          <p className="text-sm text-slate-500">
            ¿Tienes dudas o necesitas soporte corporativo? Escríbenos a{' '}
            <span className="font-bold text-indigo-600">soporte@petconnect.io</span>
          </p>
        </div>
      </section>
    </div>
  );
}