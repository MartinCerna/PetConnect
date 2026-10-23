// src/components/CartDrawer.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Minus, Plus, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function CartDrawer() {
   const { cart, removeFromCart, updateQuantity, isCartOpen, setIsCartOpen } = useAuth();
   const router = useRouter();

   // Cierra el carrito con la tecla Esc
   useEffect(() => {
      if (!isCartOpen) return;
      const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setIsCartOpen(false);
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
   }, [isCartOpen, setIsCartOpen]);

   if (!isCartOpen) return null;

   const total = cart.reduce((acc, i) => acc + i.price * i.quantity, 0);

   return (
      <div
         className="fixed inset-0 z-50 flex justify-end bg-neutral-950/40 backdrop-blur-sm"
         onClick={() => setIsCartOpen(false)}
      >
         <div
            role="dialog"
            aria-modal="true"
            aria-label="Carrito de compras"
            className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between p-6"
            onClick={(e) => e.stopPropagation()}
         >
            <div>
               <div className="flex justify-between items-center pb-4 border-b">
                  <h2 className="text-lg font-bold text-neutral-950">Tu Carrito de Compras</h2>
                  <button
                     onClick={() => setIsCartOpen(false)}
                     aria-label="Cerrar carrito"
                     className="text-neutral-400 hover:text-neutral-600"
                  >
                     <X className="w-5 h-5" />
                  </button>
               </div>

               <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto">
                  {cart.length === 0 ? (
                     <p className="text-center text-neutral-400 py-8 text-sm">
                        Tu carrito está vacío. Agrega un PetConnect Tag.
                     </p>
                  ) : (
                     cart.map((item) => (
                        <div
                           key={item.id}
                           className="flex items-center justify-between gap-3 bg-neutral-50 p-3 rounded-xl border"
                        >
                           <div className="flex items-center gap-3 min-w-0">
                              <span className="text-2xl">🦴</span>
                              <div className="min-w-0">
                                 <p className="text-xs font-bold text-neutral-800 truncate">{item.name}</p>
                                 <p className="text-xs text-neutral-500">${item.price.toFixed(2)} c/u</p>
                              </div>
                           </div>
                           <div className="flex items-center gap-2 shrink-0">
                              <button
                                 onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                 aria-label="Disminuir cantidad"
                                 className="w-7 h-7 rounded-full border border-neutral-300 flex items-center justify-center hover:bg-neutral-100"
                              >
                                 <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-5 text-center text-sm font-bold">{item.quantity}</span>
                              <button
                                 onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                 aria-label="Aumentar cantidad"
                                 className="w-7 h-7 rounded-full border border-neutral-300 flex items-center justify-center hover:bg-neutral-100"
                              >
                                 <Plus className="w-3 h-3" />
                              </button>
                              <button
                                 onClick={() => removeFromCart(item.id)}
                                 className="ml-1 text-xs text-red-500 font-bold hover:underline"
                              >
                                 Eliminar
                              </button>
                           </div>
                        </div>
                     ))
                  )}
               </div>
            </div>

            <div className="pt-4 border-t space-y-4">
               <div className="flex justify-between text-base font-bold text-neutral-950">
                  <span>Total:</span>
                  <span>${total.toFixed(2)} USD</span>
               </div>
               <button
                  onClick={() => {
                     setIsCartOpen(false);
                     router.push('/checkout');
                  }}
                  disabled={cart.length === 0}
                  className="w-full py-3 bg-pink-600 hover:bg-pink-700 text-white font-semibold rounded-xl text-sm transition shadow-lg shadow-pink-200 disabled:opacity-50"
               >
                  Proceder al Pago
               </button>
            </div>
         </div>
      </div>
   );
}
