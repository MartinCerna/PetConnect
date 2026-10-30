// src/app/page.tsx
'use client';

import { useState } from 'react';
import Image from 'next/image';
import Navbar from '@/components/Navbar';
import CartDrawer from '@/components/CartDrawer';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import ContactSection from '@/components/ContactSection';
import { ShoppingCart, Bone, MapPin, Smartphone, CheckCircle } from 'lucide-react';

interface ProductColor {
  id: string;
  name: string;
  hex: string;
}

const PRODUCT_COLORS: ProductColor[] = [
  { id: 'rosado', name: 'Rosado', hex: '#ec4899' },
  { id: 'celeste', name: 'Celeste', hex: '#38bdf8' },
  { id: 'negro', name: 'Negro', hex: '#171717' },
  { id: 'verde', name: 'Verde', hex: '#22c55e' },
  { id: 'rojo', name: 'Rojo', hex: '#ef4444' },
];

const STEPS = [
  {
    icon: ShoppingCart,
    title: 'Elige tu collar',
    description: 'Selecciona el modelo y personaliza los colores.',
    circle: 'bg-pink-500',
    text: 'text-pink-400',
  },
  {
    icon: Bone,
    title: 'Plaquita inteligente',
    description: 'Incluye localización y reconocimiento.',
    circle: 'bg-sky-500',
    text: 'text-sky-400',
  },
  {
    icon: MapPin,
    title: 'Localización',
    description: 'Ubica a tu mascota en tiempo real.',
    circle: 'bg-green-500',
    text: 'text-green-400',
  },
  {
    icon: Smartphone,
    title: 'Conéctate',
    description: 'Registra tu dispositivo y visualiza la ubicación de tu mascota.',
    circle: 'bg-red-500',
    text: 'text-red-400',
  },
];

export default function LandingPage() {
  const { addToCart } = useAuth();
  const [selectedColor, setSelectedColor] = useState<ProductColor>(PRODUCT_COLORS[0]);

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-800">
      <Navbar />
      <CartDrawer />

      {/* Hero Section */}
      <section className="relative overflow-hidden py-12 sm:py-16 md:py-24 bg-gradient-to-b from-pink-50/60 to-neutral-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-14 items-center">
          
          {/* Lado izquierdo: Textos y CTA */}
          <div className="space-y-6 text-center lg:text-left">
            <span className="inline-block px-3 py-1 bg-pink-100 text-pink-700 font-bold text-xs rounded-full uppercase tracking-wider">
               Tecnología Crowdsourced 🐾
            </span>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-neutral-950 leading-tight">
              Conecta con quien <span className="text-pink-600">más quieres</span>
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-neutral-600 max-w-xl mx-auto lg:mx-0 leading-relaxed">
              Collar inteligente con localizador y placa de identificación para tu mascota en tiempo real sin contratos mensuales.
            </p>

            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-md mx-auto lg:mx-0 text-left text-xs sm:text-sm text-neutral-700 font-medium">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                Ubicación en tiempo real
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                Plaquita con código QR
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                Diseños artesanales
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                Cómodos y resistentes
              </li>
            </ul>

            <div className="flex flex-col sm:flex-row gap-3 pt-2 justify-center lg:justify-start">
              <Link
                href="/#productos"
                className="w-full sm:w-auto px-6 py-3.5 bg-pink-600 hover:bg-pink-700 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-pink-200 text-center"
              >
                Comprar PetConnect Tag
              </Link>
              <Link
                href="/dashboard"
                className="w-full sm:w-auto px-6 py-3.5 bg-white hover:bg-neutral-100 text-neutral-800 font-bold rounded-xl text-sm transition border border-neutral-200 text-center"
              >
                Ir a Mi Panel
              </Link>
            </div>
          </div>

          {/* Lado derecho: Prototipo visual */}
          <div className="relative flex justify-center w-full">
            <div className="w-full max-w-md bg-white p-4 sm:p-6 rounded-3xl shadow-xl sm:shadow-2xl border border-neutral-200 text-center space-y-4">
              <div className="relative w-full aspect-[1024/850] bg-neutral-100 rounded-2xl overflow-hidden border">
                <Image
                  src="/images/prototipo.png"
                  alt="Prototipo PetConnect ESP32-C3 con collar inteligente"
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 448px"
                  className="object-cover"
                  priority
                />
              </div>
              <div className="grid grid-cols-3 gap-1 text-[11px] sm:text-xs font-semibold text-neutral-600">
                <span className="p-1 rounded-lg bg-neutral-50">⚡ Batería Larga</span>
                <span className="p-1 rounded-lg bg-neutral-50">📡 Red Google</span>
                <span className="p-1 rounded-lg bg-neutral-50">💧 Resistente</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Sección Productos */}
      <section id="productos" className="py-16 sm:py-20 bg-white border-t border-neutral-200 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-10 sm:space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-2xl sm:text-3xl font-bold text-neutral-950">Elige el estilo que va con tu compañero</h2>
            <p className="text-sm text-neutral-500">
              Colores personalizados hechos a mano con amor y materiales de alta durabilidad.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            <div className="group bg-neutral-50 rounded-2xl p-5 sm:p-6 border border-neutral-200 space-y-4 hover:shadow-xl hover:border-neutral-300 transition-all duration-300 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="relative w-full aspect-[1024/622] bg-white rounded-xl overflow-hidden shadow-inner border border-neutral-100">
                  <Image
                    src="/images/product.png"
                    alt="PetConnect Tag"
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />

                  {/* Badge Venta */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 z-10">
                    <span className="bg-red-600 text-white text-[11px] font-black px-2.5 py-1 rounded shadow uppercase tracking-wide">
                      VENTA
                    </span>
                  </div>

                  {/* Opciones de color que aparecen al poner el mouse sobre el producto */}
                  <div className="absolute inset-x-0 bottom-0 bg-white/95 backdrop-blur-md p-3.5 border-t border-neutral-200/80 transition-all duration-300 transform translate-y-0 opacity-100 sm:translate-y-2 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100 z-10 shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="font-extrabold text-neutral-950">Color</span>
                        <span className="text-neutral-300">|</span>
                        <span className="font-bold text-neutral-800">{selectedColor.name}</span>
                      </div>
                      <span className="text-[10px] text-neutral-400 font-medium">5 opciones</span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      {PRODUCT_COLORS.map((col) => {
                        const isSelected = selectedColor.id === col.id;
                        return (
                          <button
                            key={col.id}
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setSelectedColor(col);
                            }}
                            title={`Color ${col.name}`}
                            aria-label={`Seleccionar color ${col.name}`}
                            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                              isSelected
                                ? 'ring-2 ring-neutral-900 ring-offset-2 scale-110 shadow-sm'
                                : 'hover:scale-105 opacity-80 hover:opacity-100'
                            }`}
                          >
                            <span
                              className="w-full h-full rounded-full border border-black/15 shadow-inner"
                              style={{ backgroundColor: col.hex }}
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold text-lg text-neutral-950">PetConnect Tag</h3>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-neutral-200/70 text-neutral-800 border border-neutral-200 shrink-0">
                      Color: {selectedColor.name}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 mt-1">
                    Rastreador inteligente con carcasa en forma de hueso, soporte impermeable y clip de sujeción rápida.
                  </p>
                </div>
              </div>
              
              <div className="flex justify-between items-center pt-3 border-t border-neutral-200/60">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold">Precio</span>
                  <span className="text-xl font-black text-neutral-950">S/. 109.99</span>
                </div>
                <button
                  onClick={() =>
                    addToCart({
                      id: `tag-bone-01-${selectedColor.id}`,
                      name: `PetConnect Tag (${selectedColor.name})`,
                      price: 109.99,
                      quantity: 1,
                      color: selectedColor.name,
                      image: '/images/product.png',
                    })
                  }
                  className="px-4 py-2.5 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-pink-200 flex items-center gap-1.5"
                >
                  + Agregar al Carrito
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sección Cómo Funciona */}
      <section id="como-funciona" className="py-16 sm:py-24 bg-neutral-950 text-white scroll-mt-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-12 sm:space-y-16">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold">¿Cómo Funciona PetConnect?</h2>
            <p className="text-sm text-neutral-400">
              Cuatro pasos simples para mantener a tu mascota siempre cerca y protegida.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10">
            {STEPS.map(({ icon: Icon, title, description, circle, text }) => (
              <div key={title} className="flex flex-col items-center text-center space-y-4 p-4 rounded-2xl bg-neutral-900/40 border border-neutral-800">
                <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center shadow-lg ${circle}`}>
                  <Icon className="w-8 h-8 sm:w-10 sm:h-10 text-white" strokeWidth={2} />
                </div>
                <h3 className={`font-bold text-base sm:text-lg ${text}`}>{title}</h3>
                <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed max-w-[220px]">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sección Nosotros */}
      <section id="nosotros" className="py-16 sm:py-20 bg-white scroll-mt-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-5">
          <h2 className="text-2xl sm:text-3xl font-bold text-neutral-950">Sobre PetConnect</h2>
          <p className="text-neutral-600 leading-relaxed text-sm sm:text-base max-w-3xl mx-auto">
            Descripción acerca del proyecto, motivo y fin.
          </p>
        </div>
      </section>

      {/* Sección Contacto */}
      <ContactSection />
    </div>
  );
}
