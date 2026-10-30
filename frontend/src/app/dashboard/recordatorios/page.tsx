'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';
import {
   Bell,
   Plus,
   Pill,
   Syringe,
   Sparkles,
   CheckCircle,
   Circle,
   Trash2,
   Clock,
   Calendar,
   Filter,
   Volume2,
   AlertCircle,
   X,
   Check,
} from 'lucide-react';

export interface ReminderItem {
   id: string;
   pet_id?: string | null;
   pet_name?: string | null;
   category: 'medicamento' | 'vacuna_desparasitacion' | 'bano_paseo';
   title: string;
   frequency?: string | null;
   time_schedule?: string | null;
   notes?: string | null;
   is_completed: boolean;
   is_active: boolean;
   created_at: string;
}

const CATEGORIES = [
   {
      id: 'todos',
      label: 'Todos',
      icon: Bell,
      color: 'bg-neutral-900 text-white',
   },
   {
      id: 'medicamento',
      label: 'Medicamentos',
      icon: Pill,
      color: 'bg-pink-500 text-white',
      badge: 'bg-pink-50 text-pink-700 border-pink-200',
      description: 'Nombre, frecuencia y horario',
   },
   {
      id: 'vacuna_desparasitacion',
      label: 'Vacunas y Desparasitación',
      icon: Syringe,
      color: 'bg-sky-500 text-white',
      badge: 'bg-sky-50 text-sky-700 border-sky-200',
      description: 'Control preventivo de vacunas y parásitos',
   },
   {
      id: 'bano_paseo',
      label: 'Baños y Paseos',
      icon: Sparkles,
      color: 'bg-emerald-500 text-white',
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      description: 'Higiene, paseos y bienestar diario',
   },
];

// Genera un sonido suave de notificación usando Web Audio API
const playNotificationSound = () => {
   try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
   } catch {
      // Audio no disponible
   }
};

export default function RecordatoriosPage() {
   const { userPets, selectedPet, setSelectedPet } = useAuth();

   const [reminders, setReminders] = useState<ReminderItem[]>([]);
   const [loading, setLoading] = useState(true);
   const [activeTab, setActiveTab] = useState<string>('todos');
   const [showModal, setShowModal] = useState(false);
   const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

   // Estado del formulario
   const [formData, setFormData] = useState({
      pet_id: '',
      category: 'medicamento' as 'medicamento' | 'vacuna_desparasitacion' | 'bano_paseo',
      title: '',
      frequency: '',
      time_schedule: '',
      notes: '',
   });
   const [submitting, setSubmitting] = useState(false);

   // Carga de permisos de notificación
   useEffect(() => {
      if (typeof window !== 'undefined' && 'Notification' in window) {
         setNotificationPermission(Notification.permission);
      }
   }, []);

   const requestNotificationPermission = async () => {
      if (typeof window === 'undefined' || !('Notification' in window)) {
         alert('Tu navegador no soporta la API de notificaciones.');
         return;
      }
      try {
         const perm = await Notification.requestPermission();
         setNotificationPermission(perm);
         if (perm === 'granted') {
            playNotificationSound();
            new Notification('🔔 PetConnect Recordatorios', {
               body: '¡Notificaciones habilitadas! Recibirás recordatorios para tus mascotas.',
               icon: '/favicon.ico',
            });
         }
      } catch (err) {
         console.error('Error pidiendo permiso de notificación:', err);
      }
   };

   // Cargar recordatorios del backend
   const loadReminders = useCallback(async () => {
      setLoading(true);
      try {
         const res = await apiFetch('/reminders/');
         if (res.ok) {
            setReminders(await res.json());
         }
      } catch (err) {
         console.error('Error cargando recordatorios:', err);
      } finally {
         setLoading(false);
      }
   }, []);

   useEffect(() => {
      loadReminders();
   }, [loadReminders]);

   // Inicializar pet_id por defecto en el formulario
   useEffect(() => {
      if (userPets && userPets.length > 0 && !formData.pet_id) {
         setFormData((prev) => ({ ...prev, pet_id: selectedPet?.id || userPets[0].id }));
      }
   }, [userPets, selectedPet, formData.pet_id]);

   // Alternar completado
   const handleToggleCompleted = async (item: ReminderItem) => {
      const newStatus = !item.is_completed;
      setReminders((prev) =>
         prev.map((r) => (r.id === item.id ? { ...r, is_completed: newStatus } : r))
      );
      try {
         await apiFetch(`/reminders/${item.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_completed: newStatus }),
         });
      } catch {
         loadReminders();
      }
   };

   // Eliminar recordatorio
   const handleDelete = async (id: string) => {
      if (!confirm('¿Estás seguro de eliminar este recordatorio?')) return;
      setReminders((prev) => prev.filter((r) => r.id !== id));
      try {
         await apiFetch(`/reminders/${id}`, { method: 'DELETE' });
      } catch {
         loadReminders();
      }
   };

   // Guardar nuevo recordatorio
   const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.title.trim()) return;

      setSubmitting(true);
      try {
         const res = await apiFetch('/reminders/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
               pet_id: formData.pet_id || null,
               category: formData.category,
               title: formData.title.trim(),
               frequency: formData.frequency.trim() || null,
               time_schedule: formData.time_schedule.trim() || null,
               notes: formData.notes.trim() || null,
            }),
         });

         if (res.ok) {
            const created = await res.json();
            setReminders((prev) => [created, ...prev]);
            setShowModal(false);
            setFormData({
               pet_id: userPets && userPets[0] ? userPets[0].id : '',
               category: 'medicamento',
               title: '',
               frequency: '',
               time_schedule: '',
               notes: '',
            });

            // Dispara notificación y sonido de confirmación
            playNotificationSound();
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
               new Notification(`✅ Recordatorio programado: ${created.title}`, {
                  body: `${created.frequency || 'Configurado'} · ${created.time_schedule || ''}`,
                  icon: '/favicon.ico',
               });
            }
         } else {
            alert('No se pudo guardar el recordatorio.');
         }
      } catch {
         alert('Error al conectar con el servidor.');
      } finally {
         setSubmitting(false);
      }
   };

   // Probar notificación
   const handleTestNotification = (item: ReminderItem) => {
      playNotificationSound();
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
         new Notification(`🔔 Hora de recordatorio: ${item.title}`, {
            body: `Mascota: ${item.pet_name || 'Tu compañero'} | Horario: ${item.time_schedule || 'Ahora'}`,
            icon: '/favicon.ico',
         });
      } else {
         alert(`🔔 [Recordatorio Sonoro Activo]\n¡Es hora de: ${item.title}!\nHorario: ${item.time_schedule || 'Ahora'}`);
      }
   };

   // Filtro de recordatorios
   const filteredReminders = reminders.filter((r) => {
      if (activeTab !== 'todos' && r.category !== activeTab) return false;
      return true;
   });

   return (
      <div className="h-full overflow-y-auto bg-neutral-100/60 p-4 sm:p-6 lg:p-8">
         <div className="max-w-6xl mx-auto space-y-6">

            {/* Encabezado */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
               <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-100 text-pink-700 text-xs font-semibold mb-2">
                     <Bell className="w-3.5 h-3.5" />
                     Gestión de Cuidados y Salud
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
                     Recordatorios para tu Mascota
                  </h1>
                  <p className="text-sm text-neutral-500 mt-1">
                     Configura alertas para medicamentos, vacunas, desparasitaciones, baños y paseos.
                  </p>
               </div>

               <div className="flex items-center gap-3">
                  {/* Botón de Permiso de Notificaciones */}
                  {notificationPermission !== 'granted' ? (
                     <button
                        onClick={requestNotificationPermission}
                        className="px-4 py-2.5 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm"
                     >
                        <Bell className="w-4 h-4 text-sky-600 animate-bounce" />
                        Activar Alertas
                     </button>
                  ) : (
                     <div className="px-3.5 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm">
                        <Check className="w-4 h-4 text-emerald-600" />
                        Alertas Activas
                     </div>
                  )}

                  <button
                     onClick={() => setShowModal(true)}
                     className="px-4 py-2.5 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-pink-200 flex items-center gap-1.5"
                  >
                     <Plus className="w-4 h-4" />
                     + Nuevo Recordatorio
                  </button>
               </div>
            </div>

            {/* Pestañas de Categorías */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
               {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const isActive = activeTab === cat.id;
                  const count = cat.id === 'todos' ? reminders.length : reminders.filter((r) => r.category === cat.id).length;

                  return (
                     <button
                        key={cat.id}
                        onClick={() => setActiveTab(cat.id)}
                        className={`p-4 rounded-2xl border text-left transition-all ${
                           isActive
                              ? 'bg-white border-pink-500 shadow-md ring-2 ring-pink-500/20'
                              : 'bg-white/80 border-neutral-200 hover:bg-white hover:border-neutral-300'
                        }`}
                     >
                        <div className="flex items-center justify-between mb-2">
                           <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${cat.color}`}>
                              <Icon className="w-4 h-4" />
                           </div>
                           <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700">
                              {count}
                           </span>
                        </div>
                        <h2 className="font-bold text-sm text-neutral-900">{cat.label}</h2>
                        {cat.description && (
                           <p className="text-[11px] text-neutral-400 mt-0.5 truncate hidden sm:block">
                              {cat.description}
                           </p>
                        )}
                     </button>
                  );
               })}
            </div>

            {/* Listado de Recordatorios */}
            <div className="bg-white rounded-3xl border border-neutral-200 p-6 sm:p-8 shadow-sm space-y-6">
               <div className="flex items-center justify-between border-b pb-4">
                  <div className="flex items-center gap-2">
                     <Clock className="w-5 h-5 text-neutral-400" />
                     <h2 className="text-base font-bold text-neutral-900">
                        {activeTab === 'todos' ? 'Todos los recordatorios' : CATEGORIES.find((c) => c.id === activeTab)?.label}
                     </h2>
                  </div>
                  <span className="text-xs text-neutral-400">
                     {filteredReminders.length} {filteredReminders.length === 1 ? 'recordatorio' : 'recordatorios'}
                  </span>
               </div>

               {loading ? (
                  <div className="py-12 text-center text-sm text-neutral-400 animate-pulse">
                     Cargando recordatorios...
                  </div>
               ) : filteredReminders.length === 0 ? (
                  <div className="py-16 text-center space-y-3">
                     <div className="w-16 h-16 rounded-full bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto text-2xl">
                        🔔
                     </div>
                     <h3 className="font-bold text-neutral-800 text-base">No hay recordatorios configurados</h3>
                     <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                        Crea alertas para no olvidar medicamentos, vacunas, baños o paseos de tu compañero.
                     </p>
                     <button
                        onClick={() => setShowModal(true)}
                        className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-bold transition shadow-sm inline-flex items-center gap-1.5"
                     >
                        <Plus className="w-4 h-4" /> Agregar primer recordatorio
                     </button>
                  </div>
               ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {filteredReminders.map((item) => {
                        const isMed = item.category === 'medicamento';
                        const isVac = item.category === 'vacuna_desparasitacion';
                        const isWalk = item.category === 'bano_paseo';

                        const iconBg = isMed ? 'bg-pink-500' : isVac ? 'bg-sky-500' : 'bg-emerald-500';
                        const IconComponent = isMed ? Pill : isVac ? Syringe : Sparkles;

                        return (
                           <div
                              key={item.id}
                              className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                                 item.is_completed
                                    ? 'bg-neutral-50/80 border-neutral-200 opacity-60'
                                    : 'bg-white border-neutral-200/80 hover:shadow-md'
                              }`}
                           >
                              <div className="space-y-3">
                                 <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                       <button
                                          onClick={() => handleToggleCompleted(item)}
                                          aria-label="Marcar completado"
                                          className="text-neutral-400 hover:text-pink-600 transition"
                                       >
                                          {item.is_completed ? (
                                             <CheckCircle className="w-5 h-5 text-emerald-600 fill-emerald-100" />
                                          ) : (
                                             <Circle className="w-5 h-5 text-neutral-300 hover:text-neutral-500" />
                                          )}
                                       </button>
                                       <div>
                                          <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 block">
                                             {isMed ? 'Medicamento' : isVac ? 'Vacuna / Desparasitación' : 'Baño o Paseo'}
                                             {item.pet_name && ` · ${item.pet_name}`}
                                          </span>
                                          <h4
                                             className={`font-bold text-base text-neutral-900 ${
                                                item.is_completed ? 'line-through text-neutral-400' : ''
                                             }`}
                                          >
                                             {item.title}
                                          </h4>
                                       </div>
                                    </div>

                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0 ${iconBg}`}>
                                       <IconComponent className="w-4 h-4" />
                                    </div>
                                 </div>

                                 {/* Badges de Frecuencia y Horario */}
                                 <div className="flex flex-wrap gap-2 pt-1">
                                    {item.frequency && (
                                       <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-100 text-neutral-700 text-xs font-semibold">
                                          <Calendar className="w-3 h-3 text-neutral-400" />
                                          {item.frequency}
                                       </span>
                                    )}
                                    {item.time_schedule && (
                                       <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-pink-50 text-pink-700 text-xs font-bold border border-pink-100">
                                          <Clock className="w-3 h-3 text-pink-500" />
                                          {item.time_schedule}
                                       </span>
                                    )}
                                 </div>

                                 {/* Notas adicionales */}
                                 {item.notes && (
                                    <p className="text-xs text-neutral-500 bg-neutral-50 p-2.5 rounded-xl border border-neutral-100">
                                       {item.notes}
                                    </p>
                                 )}
                              </div>

                              {/* Acciones del ítem */}
                              <div className="flex items-center justify-between pt-3 border-t border-neutral-100 text-xs">
                                 <button
                                    onClick={() => handleTestNotification(item)}
                                    className="text-neutral-500 hover:text-pink-600 font-semibold flex items-center gap-1 transition"
                                 >
                                    <Volume2 className="w-3.5 h-3.5" /> Probar Alerta
                                 </button>
                                 <button
                                    onClick={() => handleDelete(item.id)}
                                    className="text-neutral-400 hover:text-red-600 transition p-1"
                                    title="Eliminar recordatorio"
                                 >
                                    <Trash2 className="w-4 h-4" />
                                 </button>
                              </div>
                           </div>
                        );
                     })}
                  </div>
               )}
            </div>

         </div>

         {/* Modal para Crear Recordatorio */}
         {showModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/50 backdrop-blur-sm p-4">
               <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between pb-3 border-b">
                     <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-pink-500 text-white flex items-center justify-center font-bold">
                           <Plus className="w-5 h-5" />
                        </div>
                        <h2 className="font-extrabold text-lg text-neutral-900">Nuevo Recordatorio</h2>
                     </div>
                     <button
                        onClick={() => setShowModal(false)}
                        className="text-neutral-400 hover:text-neutral-600 p-1"
                     >
                        <X className="w-5 h-5" />
                     </button>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                     {/* Selección de Categoría */}
                     <div>
                        <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                           Tipo de Recordatorio
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                           {[
                              { id: 'medicamento', label: 'Medicamento', icon: Pill },
                              { id: 'vacuna_desparasitacion', label: 'Vacunas', icon: Syringe },
                              { id: 'bano_paseo', label: 'Baños/Paseos', icon: Sparkles },
                           ].map((c) => {
                              const isSelected = formData.category === c.id;
                              const Icon = c.icon;
                              return (
                                 <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, category: c.id as any })}
                                    className={`p-3 rounded-xl border text-center transition flex flex-col items-center gap-1.5 ${
                                       isSelected
                                          ? 'border-pink-600 bg-pink-50/70 text-pink-700 font-bold'
                                          : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                                    }`}
                                 >
                                    <Icon className="w-4 h-4" />
                                    <span className="text-xs">{c.label}</span>
                                 </button>
                              );
                           })}
                        </div>
                     </div>

                     {/* Selección de Mascota */}
                     {userPets && userPets.length > 0 && (
                        <div>
                           <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                              Mascota
                           </label>
                           <select
                              value={formData.pet_id}
                              onChange={(e) => setFormData({ ...formData, pet_id: e.target.value })}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm text-neutral-800 bg-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                           >
                              {userPets.map((p) => (
                                 <option key={p.id} value={p.id}>
                                    {p.name} ({p.species})
                                 </option>
                              ))}
                           </select>
                        </div>
                     )}

                     {/* Nombre / Título */}
                     <div>
                        <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                           {formData.category === 'medicamento'
                              ? 'Nombre del Medicamento'
                              : formData.category === 'vacuna_desparasitacion'
                              ? 'Vacuna o Desparasitante'
                              : 'Actividad (Baño o Paseo)'}
                        </label>
                        <input
                           type="text"
                           required
                           value={formData.title}
                           onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                           placeholder={
                              formData.category === 'medicamento'
                                 ? 'Ej: Amoxicilina 250mg, Gotas oculares'
                                 : formData.category === 'vacuna_desparasitacion'
                                 ? 'Ej: Vacuna Antirrábica, Nexgard Spectra'
                                 : 'Ej: Paseo matutino de 30 min, Baño antipulgas'
                           }
                           className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
                        />
                     </div>

                     {/* Frecuencia y Horario */}
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                           <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                              Frecuencia
                           </label>
                           <input
                              type="text"
                              value={formData.frequency}
                              onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                              placeholder={
                                 formData.category === 'medicamento'
                                    ? 'Ej: Cada 8 horas, 1 vez al día'
                                    : formData.category === 'vacuna_desparasitacion'
                                    ? 'Ej: Cada 3 meses, Anual'
                                    : 'Ej: Diario, Cada 15 días'
                              }
                              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
                           />
                        </div>

                        <div>
                           <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                              Horario / Fecha
                           </label>
                           <input
                              type="text"
                              value={formData.time_schedule}
                              onChange={(e) => setFormData({ ...formData, time_schedule: e.target.value })}
                              placeholder={
                                 formData.category === 'medicamento'
                                    ? 'Ej: 08:00 AM, 04:00 PM'
                                    : formData.category === 'vacuna_desparasitacion'
                                    ? 'Ej: 15 de Noviembre 2026'
                                    : 'Ej: 07:00 AM y 06:30 PM'
                              }
                              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
                           />
                        </div>
                     </div>

                     {/* Notas o Instrucciones */}
                     <div>
                        <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                           Notas o Instrucciones (Opcional)
                        </label>
                        <textarea
                           rows={2}
                           value={formData.notes}
                           onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                           placeholder={
                              formData.category === 'medicamento'
                                 ? 'Ej: Dar después de comer con un premio'
                                 : formData.category === 'vacuna_desparasitacion'
                                 ? 'Ej: En la veterinaria PetSalud'
                                 : 'Ej: Usar shampoo hipoalergénico'
                           }
                           className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
                        />
                     </div>

                     <div className="flex items-center justify-end gap-3 pt-3 border-t">
                        <button
                           type="button"
                           onClick={() => setShowModal(false)}
                           className="px-4 py-2.5 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 transition"
                        >
                           Cancelar
                        </button>
                        <button
                           type="submit"
                           disabled={submitting}
                           className="px-5 py-2.5 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-pink-200 disabled:opacity-50"
                        >
                           {submitting ? 'Guardando...' : 'Guardar Recordatorio'}
                        </button>
                     </div>
                  </form>
               </div>
            </div>
         )}

      </div>
   );
}
