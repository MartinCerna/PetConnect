// src/components/CartDrawer.tsx
'use client';

import { useAuth } from '@/context/AuthContext';

export default function CartDrawer() {
   const { cart, removeFromCart, isCartOpen, setIsCartOpen } = useAuth();

   if (!isCartOpen) return null;

   const total = cart.reduce((acc, i) => acc + i.price * i.quantity, 0);

   return (
      <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm">
         <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between p-6">
            <div>
               <div className="flex justify-between items-center pb-4 border-b">
                  <h2 className="text-lg font-bold text-slate-900">Tu Carrito de Compras</h2>
                  <button
                     onClick={() => setIsCartOpen(false)}
                     className="text-slate-400 hover:text-slate-600 text-xl font-bold"
                  >
                     ✕
                  </button>
               </div>

               <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto">
                  {cart.length === 0 ? (
                     <p className="text-center text-slate-400 py-8 text-sm">
                        Tu carrito está vacío. Agrega un PetConnect Tag.
                     </p>
                  ) : (
                     cart.map((item) => (
                        <div
                           key={item.id}
                           className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border"
                        >
                           <div className="flex items-center gap-3">
                              <span className="text-2xl">🦴</span>
                              <div>
                                 <p className="text-xs font-bold text-slate-800">{item.name}</p>
                                 <p className="text-xs text-slate-500">
                                    ${item.price} x {item.quantity}
                                 </p>
                              </div>
                           </div>
                           <button
                              onClick={() => removeFromCart(item.id)}
                              className="text-xs text-red-500 font-bold hover:underline"
                           >
                              Eliminar
                           </button>
                        </div>
                     ))
                  )}
               </div>
            </div>

            <div className="pt-4 border-t space-y-4">
               <div className="flex justify-between text-base font-bold text-slate-900">
                  <span>Total:</span>
                  <span>${total.toFixed(2)} USD</span>
               </div>
               <button
                  onClick={() => alert('Redirigiendo a Pasarela de Pago Empresarial...')}
                  disabled={cart.length === 0}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition shadow-lg shadow-indigo-200 disabled:opacity-50"
               >
                  Proceder al Pago
               </button>
            </div>
         </div>
      </div>
   );
}