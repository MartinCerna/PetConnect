// src/app/dashboard/dispositivos/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiFetch, errorMessage } from '@/lib/api';
import { Cpu, Link as LinkIcon } from 'lucide-react';

interface DeviceItem {
   id: string;
   device_mac: string;
   tracker_index?: number;
   status: string;
   created_at: string;
}

export default function DispositivosPage() {
   const { userPets, loadUserData, token } = useAuth();
   const [devices, setDevices] = useState<DeviceItem[]>([]);
   const [loading, setLoading] = useState(true);
   const [mac, setMac] = useState('');
   const [eidKey, setEidKey] = useState('');
   const [registering, setRegistering] = useState(false);
   const [error, setError] = useState('');
   const [successMsg, setSuccessMsg] = useState('');

   const fetchDevices = async () => {
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
   };

   useEffect(() => {
      fetchDevices();
   }, []);

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
      try {
         const res = await apiFetch(`/devices/${deviceId}/link/${petId}`, {
            method: 'PUT',
         });
         if (res.ok) {
            alert('¡Dispositivo vinculado a la mascota!');
            if (token) loadUserData(token);
         } else {
            alert(await errorMessage(res, 'Error al vincular dispositivo.'));
         }
      } catch {
         alert('Error al conectar con el servidor.');
      }
   };

   return (
      <div className="p-6 max-w-5xl mx-auto space-y-8">
         <div>
            <h1 className="text-2xl font-bold text-neutral-900">Mis Dispositivos ESP32</h1>
            <p className="text-sm text-neutral-500">
               Administra tus tags PetConnect y asócialos a tus mascotas.
            </p>
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
            <h2 className="text-lg font-bold text-neutral-900">Tags Registrados</h2>
            {loading ? (
               <p className="text-sm text-neutral-400">Cargando tags...</p>
            ) : devices.length === 0 ? (
               <div className="bg-white p-8 rounded-2xl border border-neutral-200 text-center text-sm text-neutral-400">
                  No tienes ningún tag registrado. Agrega uno arriba con la MAC de tu collar.
               </div>
            ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {devices.map((dev) => {
                     const currentPet = userPets.find((p) => (p as any).device_id === dev.id);
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
                              <span
                                 className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                                    dev.status === 'ACTIVE'
                                       ? 'bg-green-100 text-green-700'
                                       : 'bg-neutral-100 text-neutral-600'
                                 }`}
                              >
                                 {dev.status}
                              </span>
                           </div>

                           <div className="pt-3 border-t border-neutral-100 flex items-center justify-between gap-3">
                              <span className="text-xs text-neutral-500 flex items-center gap-1">
                                 <LinkIcon className="w-3.5 h-3.5" />
                                 {currentPet ? `Asignado a: ${currentPet.name}` : 'Sin asignar'}
                              </span>

                              <select
                                 defaultValue=""
                                 onChange={(e) => handleLink(dev.id, e.target.value)}
                                 className="text-xs border border-neutral-200 bg-neutral-50 p-1.5 rounded-lg text-neutral-700 focus:outline-none focus:ring-1 focus:ring-sky-400"
                              >
                                 <option value="" disabled>
                                    Asignar a mascota...
                                 </option>
                                 {userPets.map((p) => (
                                    <option key={p.id} value={p.id}>
                                       {p.name}
                                    </option>
                                 ))}
                              </select>
                           </div>
                        </div>
                     );
                  })}
               </div>
            )}
         </div>
      </div>
   );
}

