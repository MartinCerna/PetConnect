// src/app/dashboard/dispositivos/page.tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { apiFetch, errorMessage } from '@/lib/api';
import BatteryBadge from '@/components/BatteryBadge';
import {
   Cpu,
   Link as LinkIcon,
   Minus,
   Plus,
   RefreshCw,
   ShoppingBag,
   ShoppingCart,
   Sparkles,
   Trash2,
   Zap,
} from 'lucide-react';

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

const TAG_PRICE = 109.99;

interface DeviceItem {
   id: string;
   device_mac: string;
   tracker_index?: number;
   status: string;
   battery_level?: number | null;
   battery_voltage?: number | null;
   is_charging?: boolean;
   battery_updated_at?: string | null;
   created_at: string;
}

const BATTERY_PRESETS: { label: string; level: number; voltage: number; charging?: boolean }[] = [
   { label: '100%', level: 100, voltage: 4.2 },
   { label: '75%', level: 75, voltage: 3.96 },
   { label: '45%', level: 45, voltage: 3.8 },
   { label: '22%', level: 22, voltage: 3.68 },
   { label: '10%', level: 10, voltage: 3.55 },
   { label: 'Cargando', level: 82, voltage: 4.12, charging: true },
];

export default function DispositivosPage() {
   const router = useRouter();
   const { userPets, loadUserData, token, addToCart, setIsCartOpen } = useAuth();
   const [devices, setDevices] = useState<DeviceItem[]>([]);
   const [loading, setLoading] = useState(true);
   const [mac, setMac] = useState('');
   const [eidKey, setEidKey] = useState('');
   const [registering, setRegistering] = useState(false);
   const [error, setError] = useState('');
   const [successMsg, setSuccessMsg] = useState('');
   const [selectedColor, setSelectedColor] = useState<ProductColor>(PRODUCT_COLORS[0]);
   const [quantity, setQuantity] = useState(1);
   const [updatingBatteryId, setUpdatingBatteryId] = useState<string | null>(null);

   const fetchDevices = useCallback(async () => {
      try {
         const res = await apiFetch('/devices/');
         if (res.ok) {
            setDevices(await res.json());
         }
      } catch (err) {
         console.error('Error cargando dispositivos:', err);
      } finally {
         setLoading(false);
      }
   }, []);

   useEffect(() => {
      fetchDevices();
      const id = setInterval(fetchDevices, 30_000);
      return () => clearInterval(id);
   }, [fetchDevices]);

   const handleUpdateBattery = async (
      deviceId: string,
      level: number,
      voltage: number,
      isCharging = false
   ) => {
      setUpdatingBatteryId(deviceId);
      setError('');
      try {
         const res = await apiFetch(`/devices/${deviceId}/battery`, {
            method: 'PUT',
            body: JSON.stringify({
               battery_level: level,
               battery_voltage: voltage,
               is_charging: isCharging,
            }),
         });
         if (res.ok) {
            const updated: DeviceItem = await res.json();
            setDevices((prev) => prev.map((d) => (d.id === deviceId ? updated : d)));
         } else {
            setError(await errorMessage(res, 'No se pudo actualizar el nivel de batería.'));
         }
      } catch {
         setError('Error al conectar con el servidor.');
      } finally {
         setUpdatingBatteryId(null);
      }
   };

   const handleRegisterDevice = async (e: React.FormEvent) => {
      e.preventDefault();
      setRegistering(true);
      setError('');
      setSuccessMsg('');

      try {
         const res = await apiFetch('/devices/', {
            method: 'POST',
            body: JSON.stringify({
               device_mac: mac.trim(),
               eid_key: eidKey.trim() || 'default_eid_key_placeholder',
            }),
         });

         if (res.ok) {
            setSuccessMsg('¡Dispositivo registrado con éxito!');
            setMac('');
            setEidKey('');
            fetchDevices();
         } else {
            setError(await errorMessage(res, 'No se pudo registrar el dispositivo.'));
         }
      } catch {
         setError('Error de conexión.');
      } finally {
         setRegistering(false);
      }
   };

   const handleLink = async (deviceId: string, petId: string) => {
      if (!petId) return;
      setError('');
      setSuccessMsg('');
      try {
         const res = await apiFetch(`/devices/${deviceId}/link/${petId}`, {
            method: 'PUT',
         });
         if (res.ok) {
            setSuccessMsg('¡Dispositivo vinculado a la mascota!');
            if (token) loadUserData(token);
            fetchDevices();
         } else {
            setError(await errorMessage(res, 'Error al vincular dispositivo.'));
         }
      } catch {
         setError('Error al conectar con el servidor.');
      }
   };

   const handleUnlink = async (deviceId: string) => {
      setError('');
      setSuccessMsg('');
      try {
         const res = await apiFetch(`/devices/${deviceId}/unlink`, {
            method: 'PUT',
         });
         if (res.ok) {
            setSuccessMsg('Dispositivo desvinculado con éxito.');
            if (token) loadUserData(token);
            fetchDevices();
         } else {
            setError(await errorMessage(res, 'Error al desvincular dispositivo.'));
         }
      } catch {
         setError('Error al conectar con el servidor.');
      }
   };

   const handleDeleteDevice = async (deviceId: string, macAddr: string) => {
      if (!confirm(`¿Estás seguro de que deseas eliminar el tag ${macAddr}?`)) return;
      setError('');
      setSuccessMsg('');
      try {
         const res = await apiFetch(`/devices/${deviceId}`, {
            method: 'DELETE',
         });
         if (res.ok) {
            setSuccessMsg(`Tag ${macAddr} eliminado.`);
            if (token) loadUserData(token);
            fetchDevices();
         } else {
            setError(await errorMessage(res, 'Error al eliminar dispositivo.'));
         }
      } catch {
         setError('Error al conectar con el servidor.');
      }
   };

   const handleAddTagToCart = (goToCheckout = false) => {
      addToCart({
         id: `tag-bone-01-${selectedColor.id}`,
         name: `PetConnect Tag (${selectedColor.name})`,
         price: TAG_PRICE,
         quantity,
         color: selectedColor.name,
         image: '/images/product.png',
      });
      if (goToCheckout) {
         setIsCartOpen(false);
         router.push('/checkout');
      }
   };

   return (
      <div className="h-full overflow-y-auto bg-neutral-100/60 p-4 sm:p-6 lg:p-8">
         <div className="max-w-5xl mx-auto space-y-8 pb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
               <div>
                  <h1 className="text-2xl font-bold text-neutral-900">Mis Dispositivos ESP32</h1>
                  <p className="text-sm text-neutral-500">
                     Administra tus tags PetConnect, asócialos a tus mascotas o pide uno nuevo.
                  </p>
               </div>
               <a
                  href="#comprar-tag"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-pink-50 hover:bg-pink-100 text-pink-700 border border-pink-200 rounded-xl text-xs font-bold transition shrink-0"
               >
                  <ShoppingBag className="w-4 h-4" />
                  Adquirir Nuevo Tag
               </a>
            </div>

         {/* Formulario de registro de nuevo dispositivo */}
         <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
               <Cpu className="w-5 h-5 text-sky-500" />
               Vincular Nuevo Tag Físico
            </h2>

            {error && (
               <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs">
                  {error}
               </div>
            )}
            {successMsg && (
               <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-xl text-xs">
                  {successMsg}
               </div>
            )}

            <form onSubmit={handleRegisterDevice} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
               <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                     Dirección MAC del ESP32
                  </label>
                  <input
                     type="text"
                     required
                     placeholder="AA:BB:CC:11:22:33"
                     value={mac}
                     onChange={(e) => setMac(e.target.value)}
                     className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-sm uppercase focus:outline-none focus:ring-2 focus:ring-sky-400"
                  />
               </div>
               <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                     Clave EID (Opcional)
                  </label>
                  <input
                     type="text"
                     placeholder="Clave de anuncio BLE"
                     value={eidKey}
                     onChange={(e) => setEidKey(e.target.value)}
                     className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                  />
               </div>
               <button
                  type="submit"
                  disabled={registering}
                  className="py-2.5 px-4 bg-pink-600 hover:bg-pink-700 text-white font-semibold rounded-xl text-sm transition shadow-md disabled:opacity-50"
               >
                  {registering ? 'Registrando...' : '+ Registrar Tag'}
               </button>
            </form>
         </div>

         {/* Lista de dispositivos */}
         <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
               <h2 className="text-lg font-bold text-neutral-900">Tags Registrados</h2>
               <button
                  type="button"
                  onClick={fetchDevices}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-neutral-200 hover:bg-neutral-50 text-xs font-semibold text-neutral-700 transition"
               >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Actualizar estado
               </button>
            </div>
            {loading ? (
               <p className="text-sm text-neutral-400">Cargando tags...</p>
            ) : devices.length === 0 ? (
               <div className="bg-white p-8 rounded-2xl border border-neutral-200 text-center text-sm text-neutral-400">
                  No tienes ningún tag registrado. Agrega uno arriba con la MAC de tu collar.
               </div>
            ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {devices.map((dev) => {
                     const currentPet = userPets.find((p) => p.device_id === dev.id);
                     return (
                        <div
                           key={dev.id}
                           className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm flex flex-col justify-between gap-4"
                        >
                           <div className="flex justify-between items-start">
                              <div>
                                 <p className="font-bold text-neutral-900 text-base">{dev.device_mac}</p>
                                 <p className="text-xs text-neutral-400">
                                    Registrado: {new Date(dev.created_at).toLocaleDateString()}
                                 </p>
                              </div>
                              <div className="flex items-center gap-2">
                                 <span
                                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                                       dev.status === 'ACTIVE'
                                          ? 'bg-green-100 text-green-700'
                                          : 'bg-neutral-100 text-neutral-600'
                                    }`}
                                 >
                                    {dev.status}
                                 </span>
                                 <button
                                    onClick={() => handleDeleteDevice(dev.id, dev.device_mac)}
                                    title="Eliminar Tag"
                                    className="p-1 text-neutral-400 hover:text-red-500 rounded-lg hover:bg-neutral-100 transition"
                                 >
                                    <Trash2 className="w-4 h-4" />
                                 </button>
                              </div>
                           </div>

                           {/* Estado de batería con porcentaje, voltaje y escala de colores */}
                           <div className="space-y-2">
                              <BatteryBadge
                                 variant="detailed"
                                 level={dev.battery_level}
                                 voltage={dev.battery_voltage}
                                 isCharging={Boolean(dev.is_charging)}
                                 updatedAt={dev.battery_updated_at}
                                 title="Estado de batería LiPo"
                              />
                              <div className="flex flex-wrap items-center gap-1.5">
                                 <span className="text-[10px] font-semibold text-neutral-400 mr-0.5">
                                    Prueba rápida:
                                 </span>
                                 {BATTERY_PRESETS.map((preset) => (
                                    <button
                                       key={preset.label}
                                       type="button"
                                       disabled={updatingBatteryId === dev.id}
                                       onClick={() =>
                                          handleUpdateBattery(
                                             dev.id,
                                             preset.level,
                                             preset.voltage,
                                             Boolean(preset.charging)
                                          )
                                       }
                                       className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-[10px] font-bold transition disabled:opacity-50"
                                    >
                                       {preset.charging && <Zap className="w-2.5 h-2.5 text-sky-600" />}
                                       {preset.label}
                                    </button>
                                 ))}
                              </div>
                           </div>

                           <div className="pt-3 border-t border-neutral-100 flex items-center justify-between gap-3">
                              <span className="text-xs text-neutral-500 flex items-center gap-1">
                                 <LinkIcon className="w-3.5 h-3.5" />
                                 {currentPet ? `Asignado a: ${currentPet.name}` : 'Sin asignar'}
                              </span>

                              <select
                                 value={currentPet ? currentPet.id : ''}
                                 onChange={(e) => {
                                    if (e.target.value === '__unlink__') {
                                       handleUnlink(dev.id);
                                    } else if (e.target.value) {
                                       handleLink(dev.id, e.target.value);
                                    }
                                 }}
                                 className="text-xs border border-neutral-200 bg-neutral-50 p-1.5 rounded-lg text-neutral-700 focus:outline-none focus:ring-1 focus:ring-sky-400"
                              >
                                 <option value="" disabled={!currentPet}>
                                    {currentPet ? 'Cambiar mascota...' : 'Asignar a mascota...'}
                                 </option>
                                 {userPets.map((p) => (
                                    <option key={p.id} value={p.id}>
                                       {p.name}
                                    </option>
                                 ))}
                                 {currentPet && (
                                    <option value="__unlink__" className="text-red-600 font-medium">
                                       ✕ Desvincular de {currentPet.name}
                                    </option>
                                 )}
                              </select>
                           </div>
                        </div>
                     );
                  })}
               </div>
            )}
         </div>

         {/* Tienda Rápida Integrada dentro de la App */}
         <section
            id="comprar-tag"
            className="bg-white rounded-3xl border border-pink-100 shadow-sm overflow-hidden scroll-mt-6"
         >
            <div className="bg-gradient-to-r from-pink-50 via-rose-50/70 to-sky-50/60 px-6 py-4 border-b border-pink-100 flex flex-wrap items-center justify-between gap-2">
               <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-pink-600 text-white flex items-center justify-center shadow-sm">
                     <ShoppingBag className="w-4 h-4" />
                  </div>
                  <div>
                     <h2 className="text-base sm:text-lg font-extrabold text-neutral-900">
                        Adquirir Nuevo PetConnect Tag
                     </h2>
                     <p className="text-xs text-neutral-500">
                        ¿Adoptaste otra mascota o quieres otro color? Pídelo directo con Yape.
                     </p>
                  </div>
               </div>
               <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white text-pink-700 border border-pink-200 text-[11px] font-bold">
                  <Sparkles className="w-3 h-3" />
                  Sin mensualidades
               </span>
            </div>

            <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
               <div className="md:col-span-5">
                  <div className="relative w-full aspect-[1024/622] rounded-2xl overflow-hidden bg-neutral-50 border border-neutral-200 shadow-inner">
                     <Image
                        src="/images/product.png"
                        alt="Collar inteligente PetConnect Tag"
                        fill
                        sizes="(max-width: 768px) 100vw, 40vw"
                        className="object-cover"
                     />
                  </div>
               </div>

               <div className="md:col-span-7 space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                     <div>
                        <h3 className="text-lg font-extrabold text-neutral-950">
                           PetConnect Tag + Placa QR
                        </h3>
                        <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">
                           Localizador inteligente resistente al agua con carcasa artesanal en forma de hueso, placa QR de emergencia y clip de sujeción rápida.
                        </p>
                     </div>
                     <div className="text-right shrink-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                           Precio unitario
                        </span>
                        <span className="text-2xl font-black text-neutral-950">
                           S/. {TAG_PRICE.toFixed(2)}
                        </span>
                     </div>
                  </div>

                  {/* Selector de color */}
                  <div className="space-y-2">
                     <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-neutral-700">
                           Color seleccionado:{' '}
                           <span className="text-pink-600">{selectedColor.name}</span>
                        </span>
                        <span className="text-[11px] text-neutral-400">5 colores disponibles</span>
                     </div>
                     <div className="flex flex-wrap items-center gap-2.5">
                        {PRODUCT_COLORS.map((col) => {
                           const isSelected = selectedColor.id === col.id;
                           return (
                              <button
                                 key={col.id}
                                 type="button"
                                 onClick={() => setSelectedColor(col)}
                                 aria-label={`Seleccionar color ${col.name}`}
                                 className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition ${
                                    isSelected
                                       ? 'border-pink-600 bg-pink-50 text-pink-800 shadow-xs'
                                       : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50'
                                 }`}
                              >
                                 <span
                                    className="w-4 h-4 rounded-full border border-black/15"
                                    style={{ backgroundColor: col.hex }}
                                 />
                                 <span>{col.name}</span>
                              </button>
                           );
                        })}
                     </div>
                  </div>

                  {/* Cantidad y botones de acción */}
                  <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                     <div className="flex items-center justify-between sm:justify-start gap-2 bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2">
                        <span className="text-xs font-bold text-neutral-600 mr-1">Cantidad:</span>
                        <button
                           type="button"
                           onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                           aria-label="Disminuir cantidad"
                           className="w-7 h-7 rounded-lg bg-white border border-neutral-200 flex items-center justify-center text-neutral-700 hover:bg-neutral-100"
                        >
                           <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-6 text-center text-sm font-extrabold text-neutral-900">
                           {quantity}
                        </span>
                        <button
                           type="button"
                           onClick={() => setQuantity((q) => Math.min(5, q + 1))}
                           aria-label="Aumentar cantidad"
                           className="w-7 h-7 rounded-lg bg-white border border-neutral-200 flex items-center justify-center text-neutral-700 hover:bg-neutral-100"
                        >
                           <Plus className="w-3.5 h-3.5" />
                        </button>
                     </div>

                     <div className="flex-1 flex flex-col sm:flex-row gap-2">
                        <button
                           type="button"
                           onClick={() => handleAddTagToCart(false)}
                           className="flex-1 py-2.5 px-4 bg-white hover:bg-pink-50 text-pink-700 border border-pink-300 font-bold rounded-xl text-xs sm:text-sm transition flex items-center justify-center gap-1.5"
                        >
                           <ShoppingCart className="w-4 h-4" />
                           + Agregar al Carrito
                        </button>
                        <button
                           type="button"
                           onClick={() => handleAddTagToCart(true)}
                           className="flex-1 py-2.5 px-4 bg-pink-600 hover:bg-pink-700 text-white font-bold rounded-xl text-xs sm:text-sm transition shadow-md shadow-pink-200 flex items-center justify-center gap-1.5"
                        >
                           <ShoppingBag className="w-4 h-4" />
                           Comprar con Yape · S/. {(TAG_PRICE * quantity).toFixed(2)}
                        </button>
                     </div>
                  </div>
               </div>
            </div>
         </section>
         </div>
      </div>
   );
}
