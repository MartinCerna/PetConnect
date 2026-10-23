// src/app/checkout/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import CartDrawer from '@/components/CartDrawer';
import { useAuth } from '@/context/AuthContext';
import { apiFetch, errorMessage } from '@/lib/api';

// Ruta de la imagen del QR de Yape (colocar el archivo en frontend/public/images/yape-qr.png)
const YAPE_QR_SRC = '/images/yape-qr.png';
const MAX_PROOF_MB = 5;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const inputClass =
   'w-full px-3 py-2.5 rounded-xl border border-neutral-200 bg-white text-sm text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-sky-400';

export default function CheckoutPage() {
   const { token, loading, cart, removeFromCart, clearCart } = useAuth();
   const [mounted, setMounted] = useState(false);
   const [qrError, setQrError] = useState(false);
   const [proof, setProof] = useState<File | null>(null);
   const [preview, setPreview] = useState<string | null>(null);
   const [shipping, setShipping] = useState({ name: '', phone: '', address: '' });
   const [error, setError] = useState('');
   const [submitting, setSubmitting] = useState(false);
   const [confirmed, setConfirmed] = useState(false);

   useEffect(() => setMounted(true), []);

   // Genera y libera la vista previa de la captura
   useEffect(() => {
      if (!proof) {
         setPreview(null);
         return;
      }
      const url = URL.createObjectURL(proof);
      setPreview(url);
      return () => URL.revokeObjectURL(url);
   }, [proof]);

   const total = cart.reduce((acc, i) => acc + i.price * i.quantity, 0);

   const handleProofChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0] ?? null;
      setError('');
      if (file && !ALLOWED_TYPES.includes(file.type)) {
         setError('La captura debe ser una imagen JPG, PNG o WEBP.');
         e.target.value = '';
         return setProof(null);
      }
      if (file && file.size > MAX_PROOF_MB * 1024 * 1024) {
         setError(`La captura no puede superar los ${MAX_PROOF_MB} MB.`);
         e.target.value = '';
         return setProof(null);
      }
      setProof(file);
   };

   const handleConfirm = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!proof) return;
      setError('');
      setSubmitting(true);

      const body = new FormData();
      body.append('items', JSON.stringify(cart.map((i) => ({ id: i.id, quantity: i.quantity }))));
      body.append('shipping_name', shipping.name);
      body.append('shipping_phone', shipping.phone);
      body.append('shipping_address', shipping.address);
      body.append('payment_proof', proof);

      try {
         const res = await apiFetch('/orders/', { method: 'POST', body });
         if (res.ok) {
            clearCart();
            setConfirmed(true);
         } else {
            setError(await errorMessage(res, 'No se pudo registrar el pedido. Inténtalo de nuevo.'));
         }
      } catch {
         setError('No se pudo conectar con el servidor.');
      } finally {
         setSubmitting(false);
      }
   };

   const card = 'bg-white rounded-2xl border border-neutral-200 p-10 text-center space-y-4 shadow-sm';
   const primaryBtn =
      'inline-block px-6 py-3 bg-pink-600 hover:bg-pink-700 text-white font-bold rounded-xl text-sm transition';

   let content;
   if (!mounted || loading) {
      content = <p className="text-center text-sm text-neutral-400 animate-pulse">Cargando...</p>;
   } else if (confirmed) {
      content = (
         <div className={card}>
            <div className="text-5xl">✅</div>
            <h2 className="text-xl font-bold text-neutral-950">¡Gracias por tu compra!</h2>
            <p className="text-sm text-neutral-500">
               Recibimos tu captura de pago. Validaremos tu Yape y te avisaremos pronto.
            </p>
            <Link href="/" className={primaryBtn}>
               Volver al inicio
            </Link>
         </div>
      );
   } else if (!token) {
      content = (
         <div className={card}>
            <p className="text-neutral-700 text-sm">Inicia sesión para confirmar y pagar tu pedido.</p>
            <div className="flex justify-center gap-3">
               <Link href="/login?next=/checkout" className={primaryBtn}>
                  Iniciar sesión
               </Link>
               <Link
                  href="/register"
                  className="inline-block px-6 py-3 border border-neutral-300 hover:bg-neutral-100 text-neutral-800 font-bold rounded-xl text-sm transition"
               >
                  Crear cuenta
               </Link>
            </div>
         </div>
      );
   } else if (cart.length === 0) {
      content = (
         <div className={card}>
            <p className="text-neutral-500 text-sm">Tu carrito está vacío.</p>
            <Link href="/#productos" className={primaryBtn}>
               Ver productos
            </Link>
         </div>
      );
   } else {
      content = (
         <form onSubmit={handleConfirm} className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            {/* Resumen y datos de entrega */}
            <div className="space-y-8">
               <section className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-4 shadow-sm">
                  <h2 className="font-bold text-lg text-neutral-950">Resumen del pedido</h2>
                  <div className="space-y-3">
                     {cart.map((item) => (
                        <div
                           key={item.id}
                           className="flex items-center justify-between bg-neutral-50 p-3 rounded-xl border"
                        >
                           <div>
                              <p className="text-sm font-bold text-neutral-800">{item.name}</p>
                              <p className="text-xs text-neutral-500">
                                 ${item.price.toFixed(2)} x {item.quantity}
                              </p>
                           </div>
                           <div className="flex items-center gap-4">
                              <span className="text-sm font-bold text-neutral-950">
                                 ${(item.price * item.quantity).toFixed(2)}
                              </span>
                              <button
                                 type="button"
                                 onClick={() => removeFromCart(item.id)}
                                 className="text-xs text-red-500 font-bold hover:underline"
                              >
                                 Eliminar
                              </button>
                           </div>
                        </div>
                     ))}
                  </div>
                  <div className="flex justify-between text-base font-bold text-neutral-950 pt-4 border-t">
                     <span>Total:</span>
                     <span>${total.toFixed(2)} USD</span>
                  </div>
               </section>

               <section className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-4 shadow-sm">
                  <h2 className="font-bold text-lg text-neutral-950">Datos de entrega</h2>
                  <div className="space-y-1">
                     <label htmlFor="ship-name" className="text-sm font-semibold text-neutral-700">
                        Nombre completo
                     </label>
                     <input
                        id="ship-name"
                        required
                        minLength={2}
                        value={shipping.name}
                        onChange={(e) => setShipping({ ...shipping, name: e.target.value })}
                        className={inputClass}
                     />
                  </div>
                  <div className="space-y-1">
                     <label htmlFor="ship-phone" className="text-sm font-semibold text-neutral-700">
                        Teléfono
                     </label>
                     <input
                        id="ship-phone"
                        type="tel"
                        required
                        minLength={6}
                        value={shipping.phone}
                        onChange={(e) => setShipping({ ...shipping, phone: e.target.value })}
                        className={inputClass}
                     />
                  </div>
                  <div className="space-y-1">
                     <label htmlFor="ship-address" className="text-sm font-semibold text-neutral-700">
                        Dirección de entrega
                     </label>
                     <input
                        id="ship-address"
                        required
                        minLength={5}
                        value={shipping.address}
                        onChange={(e) => setShipping({ ...shipping, address: e.target.value })}
                        className={inputClass}
                     />
                  </div>
               </section>
            </div>

            {/* Pago con Yape */}
            <section className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-5 shadow-sm">
               <h2 className="font-bold text-lg text-neutral-950">Método de pago</h2>
               <div className="flex items-center gap-3 p-3 rounded-xl border-2 border-sky-500 bg-sky-50">
                  <span className="w-4 h-4 rounded-full bg-sky-600 ring-4 ring-sky-200" />
                  <span className="font-bold text-sky-800">Pagar con Yape</span>
               </div>

               <div className="flex flex-col items-center space-y-2">
                  <p className="text-xs text-neutral-500">Escanea el código QR desde tu app de Yape</p>
                  {qrError ? (
                     <div className="w-56 h-56 rounded-xl border-2 border-dashed border-neutral-300 flex items-center justify-center text-center text-xs text-neutral-400 p-4">
                        Coloca la imagen del QR en
                        <br />
                        public{YAPE_QR_SRC}
                     </div>
                  ) : (
                     // eslint-disable-next-line @next/next/no-img-element
                     <img
                        src={YAPE_QR_SRC}
                        alt="Código QR de pago con Yape"
                        onError={() => setQrError(true)}
                        className="w-56 h-56 object-contain rounded-xl border border-neutral-200"
                     />
                  )}
               </div>

               <div className="space-y-2">
                  <label htmlFor="proof" className="block text-sm font-bold text-neutral-800">
                     Sube la captura de tu pago
                  </label>
                  <input
                     id="proof"
                     type="file"
                     accept="image/jpeg,image/png,image/webp"
                     onChange={handleProofChange}
                     className="block w-full text-xs text-neutral-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-pink-50 file:text-pink-700 file:font-semibold hover:file:bg-pink-100"
                  />
                  <p className="text-[11px] text-neutral-400">JPG, PNG o WEBP · máximo {MAX_PROOF_MB} MB</p>
                  {preview && (
                     // eslint-disable-next-line @next/next/no-img-element
                     <img
                        src={preview}
                        alt="Vista previa de la captura de pago"
                        className="max-h-64 mx-auto rounded-xl border border-neutral-200"
                     />
                  )}
               </div>

               {error && (
                  <div
                     role="alert"
                     className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-xs font-medium"
                  >
                     {error}
                  </div>
               )}

               <button
                  type="submit"
                  disabled={!proof || submitting}
                  className="w-full py-3 bg-pink-600 hover:bg-pink-700 text-white font-semibold rounded-xl text-sm transition shadow-lg shadow-pink-200 disabled:opacity-50 disabled:cursor-not-allowed"
               >
                  {submitting ? 'Enviando pedido...' : 'Confirmar pedido'}
               </button>
            </section>
         </form>
      );
   }

   return (
      <div className="min-h-screen bg-neutral-50 text-neutral-800">
         <Navbar />
         <CartDrawer />
         <main className="max-w-5xl mx-auto px-6 py-12">
            <h1 className="text-3xl font-black text-neutral-950 mb-8">Confirmar pedido y pagar</h1>
            {content}
         </main>
      </div>
   );
}
