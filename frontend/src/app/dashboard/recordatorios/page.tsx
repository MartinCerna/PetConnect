'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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
   Volume2,
   X,
   Check,
   Lightbulb,
   Pencil,
   Repeat,
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

type ReminderCategory = 'medicamento' | 'vacuna_desparasitacion' | 'bano_paseo';
type ScheduleMode = 'multi' | 'diario' | 'dias' | 'fecha';
type DateRecurrence = 'Una sola vez' | 'Mensual' | 'Anual';

const WEEKDAYS = [
   { key: 'Lun', label: 'L' },
   { key: 'Mar', label: 'M' },
   { key: 'Mié', label: 'M' },
   { key: 'Jue', label: 'J' },
   { key: 'Vie', label: 'V' },
   { key: 'Sáb', label: 'S' },
   { key: 'Dom', label: 'D' },
] as const;

const PET_TIPS = [
   {
      id: 1,
      text: 'El agua de tu mascota debe renovarse al menos dos veces al día para asegurar que esté fresca y libre de impurezas.',
      icon: '💧',
      badge: 'Hidratación',
   },
   {
      id: 2,
      text: 'Los perros necesitan ejercitarse diariamente según su raza y edad para liberar energía y evitar problemas de ansiedad o estrés.',
      icon: '🏃',
      badge: 'Ejercicio y Energía',
   },
   {
      id: 3,
      text: 'La desparasitación periódica previene pulgas, garrapatas y parásitos intestinales, protegiendo tanto al animal como a la familia.',
      icon: '🛡️',
      badge: 'Salud Preventiva',
   },
   {
      id: 4,
      text: 'Establecer horas determinadas para comer ayuda a regular su metabolismo y facilita la digestión.',
      icon: '⏰',
      badge: 'Alimentación',
   },
   {
      id: 5,
      text: 'Acostumbrar a tu mascota a diferentes entornos, sonidos y personas desde cachorro previene miedos y conductas agresivas de adulto.',
      icon: '🐕',
      badge: 'Socialización',
   },
   {
      id: 6,
      text: 'Utilizar juguetes interactivos o juegos de olfato ayuda a mantener la mente de tu mascota activa y previene el aburrimiento destructivo.',
      icon: '🧩',
      badge: 'Estimulación Mental',
   },
];

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
      description: 'Dosis múltiples, cada X h u horas fijas',
   },
   {
      id: 'vacuna_desparasitacion',
      label: 'Vacunas y Desparasitación',
      icon: Syringe,
      color: 'bg-sky-500 text-white',
      badge: 'bg-sky-50 text-sky-700 border-sky-200',
      description: 'Control preventivo por fechas o ciclos',
   },
   {
      id: 'bano_paseo',
      label: 'Baños y Paseos',
      icon: Sparkles,
      color: 'bg-emerald-500 text-white',
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      description: 'Varios paseos al día o días concretos',
   },
   {
      id: 'tips',
      label: 'Tips',
      icon: Lightbulb,
      color: 'bg-amber-500 text-white',
      badge: 'bg-amber-50 text-amber-700 border-amber-200',
      description: 'Consejos de bienestar para tu mascota',
   },
];

const todayIso = () => {
   const now = new Date();
   const yyyy = now.getFullYear();
   const mm = String(now.getMonth() + 1).padStart(2, '0');
   const dd = String(now.getDate()).padStart(2, '0');
   return `${yyyy}-${mm}-${dd}`;
};

const addHoursToTime = (hhmm: string, hoursToAdd: number): string => {
   const [hStr, mStr] = hhmm.split(':');
   const totalMins = ((Number(hStr) || 0) * 60 + (Number(mStr) || 0) + hoursToAdd * 60) % (24 * 60);
   const h = String(Math.floor(totalMins / 60)).padStart(2, '0');
   const m = String(totalMins % 60).padStart(2, '0');
   return `${h}:${m}`;
};

const buildIntervalTimes = (startTime: string, intervalHours: number): string[] => {
   const count = Math.max(1, Math.min(8, Math.floor(24 / intervalHours)));
   return Array.from({ length: count }, (_, idx) => addHoursToTime(startTime, idx * intervalHours));
};

const parseScheduleDisplay = (timeSchedule?: string | null) => {
   const raw = (timeSchedule || '').trim();
   const dateMatch = raw.match(/\b(\d{4}-\d{2}-\d{2})\b/);
   const times = raw.match(/\b\d{2}:\d{2}\b/g) || [];
   return {
      date: dateMatch ? dateMatch[1] : null,
      times,
      fallback: dateMatch || times.length > 0 ? null : raw,
   };
};

// Genera un sonido suave de notificación usando Web Audio API
const playNotificationSound = () => {
   try {
      const AudioCtx =
         window.AudioContext ||
         (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
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
   const { userPets, selectedPet } = useAuth();

   const [reminders, setReminders] = useState<ReminderItem[]>([]);
   const [loading, setLoading] = useState(true);
   const [activeTab, setActiveTab] = useState<string>('todos');
   const [showModal, setShowModal] = useState(false);
   const [editingId, setEditingId] = useState<string | null>(null);
   const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

   // Estado del formulario rediseñado
   const [petId, setPetId] = useState('');
   const [category, setCategory] = useState<ReminderCategory>('medicamento');
   const [title, setTitle] = useState('');
   const [notes, setNotes] = useState('');

   const [scheduleMode, setScheduleMode] = useState<ScheduleMode>('multi');
   const [multiLabel, setMultiLabel] = useState('Cada 8 horas');
   const [times, setTimes] = useState<string[]>(['08:00', '16:00', '00:00']);
   const [selectedDays, setSelectedDays] = useState<string[]>(['Lun', 'Mié', 'Vie']);
   const [specificDate, setSpecificDate] = useState<string>(todayIso());
   const [dateRecurrence, setDateRecurrence] = useState<DateRecurrence>('Una sola vez');
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

   useEffect(() => {
      if (userPets && userPets.length > 0 && !petId) {
         setPetId(selectedPet?.id || userPets[0].id);
      }
   }, [userPets, selectedPet, petId]);

   // Serializa el horario según el modo elegido manteniendo compatibilidad con backend
   const { serializedFrequency, serializedTimeSchedule } = useMemo(() => {
      const cleanTimes = Array.from(new Set(times.map((t) => t.trim()).filter(Boolean)));
      const effectiveTimes = cleanTimes.length > 0 ? cleanTimes : ['08:00'];

      if (scheduleMode === 'multi') {
         const freqText =
            multiLabel && multiLabel !== 'Personalizado'
               ? multiLabel
               : effectiveTimes.length > 1
                 ? `${effectiveTimes.length} veces al día`
                 : 'Diariamente';
         return {
            serializedFrequency: freqText,
            serializedTimeSchedule: effectiveTimes.join(', '),
         };
      }

      if (scheduleMode === 'diario') {
         return {
            serializedFrequency: effectiveTimes.length > 1 ? `Diario (${effectiveTimes.length} veces)` : 'Diariamente',
            serializedTimeSchedule: effectiveTimes.join(', '),
         };
      }

      if (scheduleMode === 'dias') {
         const daysText = selectedDays.length > 0 ? selectedDays.join(', ') : 'Lun';
         return {
            serializedFrequency: `Días: ${daysText}`,
            serializedTimeSchedule: effectiveTimes.join(', '),
         };
      }

      // Modo fecha específica / mensual / anual
      const singleTime = effectiveTimes[0] || '08:00';
      return {
         serializedFrequency: `${dateRecurrence} (${specificDate})`,
         serializedTimeSchedule: `${specificDate} · ${singleTime}`,
      };
   }, [scheduleMode, multiLabel, times, selectedDays, specificDate, dateRecurrence]);

   const resetForm = (nextCategory: ReminderCategory = 'medicamento') => {
      setEditingId(null);
      setPetId(selectedPet?.id || (userPets && userPets[0]?.id) || '');
      setCategory(nextCategory);
      setTitle('');
      setNotes('');
      setSpecificDate(todayIso());
      setDateRecurrence('Una sola vez');
      setSelectedDays(['Lun', 'Mié', 'Vie']);

      if (nextCategory === 'medicamento') {
         setScheduleMode('multi');
         setMultiLabel('Cada 8 horas');
         setTimes(['08:00', '16:00', '00:00']);
      } else if (nextCategory === 'bano_paseo') {
         setScheduleMode('multi');
         setMultiLabel('2 veces al día');
         setTimes(['07:30', '18:30']);
      } else {
         setScheduleMode('fecha');
         setTimes(['09:00']);
      }
   };

   const openCreateModal = () => {
      const defaultCat: ReminderCategory =
         activeTab === 'medicamento' || activeTab === 'vacuna_desparasitacion' || activeTab === 'bano_paseo'
            ? activeTab
            : 'medicamento';
      resetForm(defaultCat);
      setShowModal(true);
   };

   const openEditModal = (item: ReminderItem) => {
      setEditingId(item.id);
      setPetId(item.pet_id || selectedPet?.id || (userPets && userPets[0]?.id) || '');
      setCategory(item.category);
      setTitle(item.title);
      setNotes(item.notes || '');

      const parsed = parseScheduleDisplay(item.time_schedule);
      const parsedTimes = parsed.times.length > 0 ? parsed.times : ['08:00'];
      const freq = (item.frequency || '').trim();
      const freqLower = freq.toLowerCase();

      setTimes(parsedTimes);

      if (parsed.date || freqLower.includes('una sola vez') || freqLower.includes('mensual') || freqLower.includes('anual')) {
         setScheduleMode('fecha');
         setSpecificDate(parsed.date || todayIso());
         setDateRecurrence(
            freqLower.includes('mensual') ? 'Mensual' : freqLower.includes('anual') ? 'Anual' : 'Una sola vez'
         );
      } else if (freqLower.startsWith('días:') || freqLower.startsWith('dias:')) {
         setScheduleMode('dias');
         const found = WEEKDAYS.filter((d) => freqLower.includes(d.key.toLowerCase())).map((d) => d.key);
         setSelectedDays(found.length > 0 ? found : ['Lun']);
      } else if (parsedTimes.length > 1 || freqLower.includes('cada') || freqLower.includes('veces')) {
         setScheduleMode('multi');
         setMultiLabel(freq || `${parsedTimes.length} veces al día`);
      } else {
         setScheduleMode('diario');
      }

      setShowModal(true);
   };

   const handleCategorySwitchInModal = (nextCat: ReminderCategory) => {
      setCategory(nextCat);
      if (editingId) return;
      if (nextCat === 'medicamento') {
         setScheduleMode('multi');
         setMultiLabel('Cada 8 horas');
         setTimes(['08:00', '16:00', '00:00']);
      } else if (nextCat === 'bano_paseo') {
         setScheduleMode('multi');
         setMultiLabel('2 veces al día');
         setTimes(['07:30', '18:30']);
      } else {
         setScheduleMode('fecha');
         setDateRecurrence('Una sola vez');
         setTimes(['09:00']);
      }
   };

   const applyIntervalPreset = (intervalHours: number, label: string) => {
      const baseTime = times[0] || '08:00';
      setMultiLabel(label);
      setTimes(buildIntervalTimes(baseTime, intervalHours));
   };

   const applyWalkPreset = () => {
      setMultiLabel('2 veces al día');
      setTimes(['07:30', '18:30']);
   };

   const handleUpdateTimeAt = (idx: number, value: string) => {
      setMultiLabel('Personalizado');
      setTimes((prev) => prev.map((t, i) => (i === idx ? value : t)));
   };

   const handleAddTimeSlot = () => {
      if (times.length >= 8) return;
      const last = times[times.length - 1] || '08:00';
      setMultiLabel('Personalizado');
      setTimes((prev) => [...prev, addHoursToTime(last, 4)]);
   };

   const handleRemoveTimeSlot = (idx: number) => {
      if (times.length <= 1) return;
      setMultiLabel('Personalizado');
      setTimes((prev) => prev.filter((_, i) => i !== idx));
   };

   const toggleWeekday = (dayKey: string) => {
      setSelectedDays((prev) => {
         if (prev.includes(dayKey)) {
            return prev.length > 1 ? prev.filter((d) => d !== dayKey) : prev;
         }
         return WEEKDAYS.map((w) => w.key).filter((k) => k === dayKey || prev.includes(k));
      });
   };

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

   // Guardar o actualizar recordatorio
   const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!title.trim()) return;

      setSubmitting(true);
      const payload = {
         pet_id: petId || null,
         category,
         title: title.trim(),
         frequency: serializedFrequency,
         time_schedule: serializedTimeSchedule,
         notes: notes.trim() || null,
      };

      try {
         const res = await apiFetch(editingId ? `/reminders/${editingId}` : '/reminders/', {
            method: editingId ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
         });

         if (res.ok) {
            const saved: ReminderItem = await res.json();
            if (editingId) {
               setReminders((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
            } else {
               setReminders((prev) => [saved, ...prev]);
            }
            setShowModal(false);
            resetForm('medicamento');

            playNotificationSound();
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
               new Notification(
                  `${editingId ? '✅ Recordatorio actualizado' : '✅ Recordatorio programado'}: ${saved.title}`,
                  {
                     body: `${saved.frequency || 'Configurado'} · ${saved.time_schedule || ''}`,
                     icon: '/favicon.ico',
                  }
               );
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

   // Probar notificación y despacho de correo de prueba
   const handleTestNotification = async (item: ReminderItem) => {
      playNotificationSound();
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
         new Notification('Hora de recordatorio: ' + item.title, {
            body: 'Mascota: ' + (item.pet_name || 'Tu compañero') + ' - Horario: ' + (item.time_schedule || 'Ahora'),
            icon: '/favicon.ico',
         });
      }

      try {
         const res = await apiFetch('/reminders/' + item.id + '/test-alert', {
            method: 'POST',
         });
         if (res.ok) {
            const data = await res.json();
            if (data.email_sent) {
               alert(
                  'Alerta disparada.\nSe ha enviado el correo de notificación a ' +
                     data.recipient +
                     '.\nRevisa tu bandeja de entrada o spam.'
               );
            } else {
               alert(
                  'Alerta local ejecutada.\nEl servidor intentó enviar el correo a ' +
                     data.recipient +
                     ', pero el servicio de correo aún no está listo o las credenciales no fueron aceptadas.'
               );
            }
         }
      } catch (err) {
         console.error('Error probando alerta:', err);
      }
   };

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
                     Programa alertas con múltiples horarios al día, cada ciertas horas, días específicos o fechas exactas.
                  </p>
               </div>

               <div className="flex items-center gap-3">
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
                     onClick={openCreateModal}
                     className="px-4 py-2.5 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-pink-200 flex items-center gap-1.5"
                  >
                     <Plus className="w-4 h-4" />
                     Nuevo Recordatorio
                  </button>
               </div>
            </div>

            {/* Pestañas de Categorías */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
               {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const isActive = activeTab === cat.id;
                  const count =
                     cat.id === 'todos'
                        ? reminders.length
                        : cat.id === 'tips'
                        ? PET_TIPS.length
                        : reminders.filter((r) => r.category === cat.id).length;

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

            {/* Listado de Recordatorios o Consejos (Tips) */}
            <div className="bg-white rounded-3xl border border-neutral-200 p-6 sm:p-8 shadow-sm space-y-6">
               <div className="flex items-center justify-between border-b pb-4">
                  <div className="flex items-center gap-2">
                     {activeTab === 'tips' ? (
                        <Lightbulb className="w-5 h-5 text-amber-500" />
                     ) : (
                        <Clock className="w-5 h-5 text-neutral-400" />
                     )}
                     <h2 className="text-base font-bold text-neutral-900">
                        {activeTab === 'todos'
                           ? 'Todos los recordatorios'
                           : activeTab === 'tips'
                           ? 'Consejos para el bienestar de tu mascota'
                           : CATEGORIES.find((c) => c.id === activeTab)?.label}
                     </h2>
                  </div>
                  <span className="text-xs text-neutral-400">
                     {activeTab === 'tips'
                        ? `${PET_TIPS.length} consejos`
                        : `${filteredReminders.length} ${filteredReminders.length === 1 ? 'recordatorio' : 'recordatorios'}`}
                  </span>
               </div>

               {activeTab === 'tips' ? (
                  <div className="space-y-6">
                     <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-pink-50 border border-amber-200/80 rounded-2xl p-5 flex items-start gap-4 shadow-sm">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md">
                           <Lightbulb className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                           <h3 className="font-extrabold text-base text-neutral-900">
                              Consejos para el bienestar de tu mascota:
                           </h3>
                           <p className="text-xs text-neutral-600 leading-relaxed">
                              Recomendaciones esenciales para mantener a tu perro o gato saludable, protegido, física y mentalmente activo.
                           </p>
                        </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {PET_TIPS.map((tip) => (
                           <div
                              key={tip.id}
                              className="p-5 rounded-2xl border border-neutral-200/80 bg-white hover:border-amber-400 hover:shadow-md transition-all flex items-start gap-4"
                           >
                              <span className="text-2xl p-2.5 bg-neutral-50 rounded-2xl border border-neutral-100 shrink-0">
                                 {tip.icon}
                              </span>
                              <div className="space-y-1 flex-1 min-w-0">
                                 <div className="flex items-center justify-between gap-2">
                                    <span className="text-[10px] uppercase font-bold tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
                                       {tip.badge}
                                    </span>
                                    <span className="text-xs font-bold text-neutral-300">Tip #{tip.id}</span>
                                 </div>
                                 <p className="text-xs sm:text-sm text-neutral-700 leading-relaxed pt-1">
                                    {tip.text}
                                 </p>
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
               ) : loading ? (
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
                        Crea alertas para medicamentos con varias dosis al día, vacunas, baños o paseos de tu compañero.
                     </p>
                     <button
                        onClick={openCreateModal}
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

                        const iconBg = isMed ? 'bg-pink-500' : isVac ? 'bg-sky-500' : 'bg-emerald-500';
                        const IconComponent = isMed ? Pill : isVac ? Syringe : Sparkles;
                        const parsedSchedule = parseScheduleDisplay(item.time_schedule);

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

                                 {/* Badges de Frecuencia, Fecha y Múltiples Horas */}
                                 <div className="flex flex-wrap gap-1.5 pt-1">
                                    {item.frequency && (
                                       <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-100 text-neutral-700 text-xs font-semibold">
                                          <Repeat className="w-3 h-3 text-neutral-500" />
                                          {item.frequency}
                                       </span>
                                    )}
                                    {parsedSchedule.date && (
                                       <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 text-xs font-semibold border border-sky-100">
                                          <Calendar className="w-3 h-3 text-sky-500" />
                                          {parsedSchedule.date}
                                       </span>
                                    )}
                                    {parsedSchedule.times.map((hhmm, idx) => (
                                       <span
                                          key={`${item.id}-${hhmm}-${idx}`}
                                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-pink-50 text-pink-700 text-xs font-bold border border-pink-100"
                                       >
                                          <Clock className="w-3 h-3 text-pink-500" />
                                          {hhmm}
                                       </span>
                                    ))}
                                    {parsedSchedule.fallback && (
                                       <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-pink-50 text-pink-700 text-xs font-bold border border-pink-100">
                                          <Clock className="w-3 h-3 text-pink-500" />
                                          {parsedSchedule.fallback}
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
                                 <div className="flex items-center gap-2">
                                    <button
                                       onClick={() => openEditModal(item)}
                                       className="text-neutral-500 hover:text-sky-600 font-semibold flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-sky-50 transition"
                                       title="Editar horarios o detalles"
                                    >
                                       <Pencil className="w-3.5 h-3.5" /> Editar
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
                           </div>
                        );
                     })}
                  </div>
               )}
            </div>

         </div>

         {/* Modal Rediseñado para Crear / Editar Recordatorio */}
         {showModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/50 backdrop-blur-sm p-4">
               <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
                  <div className="flex items-center justify-between pb-3 border-b">
                     <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-pink-600 text-white flex items-center justify-center font-bold shadow-sm">
                           {editingId ? <Pencil className="w-4 h-4" /> : <Plus className="w-5 h-5" />}
                        </div>
                        <div>
                           <h2 className="font-extrabold text-lg text-neutral-900 leading-tight">
                              {editingId ? 'Editar Recordatorio' : 'Nuevo Recordatorio'}
                           </h2>
                           <p className="text-[11px] text-neutral-400">
                              Configura una o varias horas exactas al día según su tratamiento o rutina
                           </p>
                        </div>
                     </div>
                     <button
                        onClick={() => setShowModal(false)}
                        className="text-neutral-400 hover:text-neutral-600 p-1 rounded-lg hover:bg-neutral-100"
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
                              const isSelected = category === c.id;
                              const Icon = c.icon;
                              return (
                                 <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => handleCategorySwitchInModal(c.id as ReminderCategory)}
                                    className={`p-3 rounded-xl border text-center transition flex flex-col items-center gap-1.5 ${
                                       isSelected
                                          ? 'border-pink-600 bg-pink-50/70 text-pink-700 font-bold shadow-sm'
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

                     {/* Mascota y Título */}
                     <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                        {userPets && userPets.length > 0 && (
                           <div className="sm:col-span-5">
                              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                                 Mascota
                              </label>
                              <select
                                 value={petId}
                                 onChange={(e) => setPetId(e.target.value)}
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

                        <div className={userPets && userPets.length > 0 ? 'sm:col-span-7' : 'sm:col-span-12'}>
                           <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                              {category === 'medicamento'
                                 ? 'Nombre del Medicamento'
                                 : category === 'vacuna_desparasitacion'
                                 ? 'Vacuna o Desparasitante'
                                 : 'Actividad (Baño o Paseo)'}
                           </label>
                           <input
                              type="text"
                              required
                              value={title}
                              onChange={(e) => setTitle(e.target.value)}
                              placeholder={
                                 category === 'medicamento'
                                    ? 'Ej: Amoxicilina 250mg, Gotas'
                                    : category === 'vacuna_desparasitacion'
                                    ? 'Ej: Vacuna Antirrábica, Nexgard'
                                    : 'Ej: Paseo parque, Baño antipulgas'
                              }
                              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
                           />
                        </div>
                     </div>

                     {/* Bloque Rediseñado de Programación Flexible */}
                     <div className="bg-neutral-50/90 border border-neutral-200/80 rounded-2xl p-4 space-y-4">
                        <div>
                           <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                              ¿Cómo se repite este recordatorio?
                           </label>
                           <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                              {[
                                 { id: 'multi', label: 'Varias veces / día' },
                                 { id: 'diario', label: '1 vez al día' },
                                 { id: 'dias', label: 'Días específicos' },
                                 { id: 'fecha', label: 'Fecha concreta' },
                              ].map((mode) => {
                                 const active = scheduleMode === mode.id;
                                 return (
                                    <button
                                       key={mode.id}
                                       type="button"
                                       onClick={() => {
                                          const nextMode = mode.id as ScheduleMode;
                                          setScheduleMode(nextMode);
                                          if (nextMode === 'multi' && times.length < 2) {
                                             setMultiLabel('Cada 12 horas');
                                             setTimes([times[0] || '08:00', addHoursToTime(times[0] || '08:00', 12)]);
                                          } else if (nextMode === 'diario' && times.length === 0) {
                                             setTimes(['08:00']);
                                          }
                                       }}
                                       className={`px-2.5 py-2 rounded-xl text-xs font-bold border transition ${
                                          active
                                             ? 'bg-pink-600 text-white border-pink-600 shadow-sm'
                                             : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-100'
                                       }`}
                                    >
                                       {mode.label}
                                    </button>
                                 );
                              })}
                           </div>
                        </div>

                        {/* Atajos de intervalo cuando es varias veces al día */}
                        {scheduleMode === 'multi' && (
                           <div className="space-y-2">
                              <span className="text-[11px] font-semibold text-neutral-500 block">
                                 Atajos rápidos (calcula las horas desde tu primera toma):
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                 {[
                                    { label: 'Cada 6 horas', hours: 6 },
                                    { label: 'Cada 8 horas', hours: 8 },
                                    { label: 'Cada 12 horas', hours: 12 },
                                 ].map((preset) => (
                                    <button
                                       key={preset.label}
                                       type="button"
                                       onClick={() => applyIntervalPreset(preset.hours, preset.label)}
                                       className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                                          multiLabel === preset.label
                                             ? 'bg-sky-50 border-sky-400 text-sky-700'
                                             : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-100'
                                       }`}
                                    >
                                       {preset.label}
                                    </button>
                                 ))}
                                 <button
                                    type="button"
                                    onClick={applyWalkPreset}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                                       multiLabel === '2 veces al día'
                                          ? 'bg-sky-50 border-sky-400 text-sky-700'
                                          : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-100'
                                    }`}
                                 >
                                    Mañana y tarde
                                 </button>
                              </div>
                           </div>
                        )}

                        {/* Selector de días específicos */}
                        {scheduleMode === 'dias' && (
                           <div className="space-y-2">
                              <span className="text-[11px] font-semibold text-neutral-500 block">
                                 Selecciona los días de la semana:
                              </span>
                              <div className="grid grid-cols-7 gap-1.5">
                                 {WEEKDAYS.map((day) => {
                                    const active = selectedDays.includes(day.key);
                                    return (
                                       <button
                                          key={day.key}
                                          type="button"
                                          onClick={() => toggleWeekday(day.key)}
                                          className={`py-2 rounded-xl text-xs font-bold border transition flex flex-col items-center ${
                                             active
                                                ? 'bg-pink-600 text-white border-pink-600 shadow-sm'
                                                : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-100'
                                          }`}
                                       >
                                          <span>{day.key}</span>
                                       </button>
                                    );
                                 })}
                              </div>
                           </div>
                        )}

                        {/* Fecha concreta / Mensual / Anual */}
                        {scheduleMode === 'fecha' ? (
                           <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                              <div>
                                 <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                                    Repetición
                                 </label>
                                 <select
                                    value={dateRecurrence}
                                    onChange={(e) => setDateRecurrence(e.target.value as DateRecurrence)}
                                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-800 bg-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                                 >
                                    <option value="Una sola vez">Una sola vez</option>
                                    <option value="Mensual">Cada mes</option>
                                    <option value="Anual">Cada año</option>
                                 </select>
                              </div>
                              <div>
                                 <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                                    Fecha
                                 </label>
                                 <input
                                    type="date"
                                    required
                                    value={specificDate}
                                    onChange={(e) => setSpecificDate(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-800 bg-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                                 />
                              </div>
                              <div>
                                 <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                                    Hora de Alerta
                                 </label>
                                 <input
                                    type="time"
                                    required
                                    value={times[0] || '09:00'}
                                    onChange={(e) => setTimes([e.target.value])}
                                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-800 bg-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                                 />
                              </div>
                           </div>
                        ) : (
                           /* Editor de una o múltiples horas específicas */
                           <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                 <span className="text-[11px] font-bold text-neutral-600 uppercase tracking-wider">
                                    Horas de alerta ({times.length})
                                 </span>
                                 {times.length < 8 && (
                                    <button
                                       type="button"
                                       onClick={handleAddTimeSlot}
                                       className="text-xs font-bold text-pink-600 hover:text-pink-700 inline-flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-pink-50 transition"
                                    >
                                       <Plus className="w-3.5 h-3.5" /> Agregar hora
                                    </button>
                                 )}
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                 {times.map((timeVal, idx) => (
                                    <div
                                       key={idx}
                                       className="flex items-center gap-1.5 bg-white border border-neutral-200 rounded-xl px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-pink-500"
                                    >
                                       <Clock className="w-3.5 h-3.5 text-pink-500 shrink-0" />
                                       <input
                                          type="time"
                                          required
                                          value={timeVal}
                                          onChange={(e) => handleUpdateTimeAt(idx, e.target.value)}
                                          className="w-full text-xs font-bold text-neutral-800 bg-transparent focus:outline-none"
                                       />
                                       {times.length > 1 && (
                                          <button
                                             type="button"
                                             onClick={() => handleRemoveTimeSlot(idx)}
                                             className="text-neutral-400 hover:text-rose-600 p-0.5 transition"
                                             aria-label="Quitar hora"
                                          >
                                             <X className="w-3.5 h-3.5" />
                                          </button>
                                       )}
                                    </div>
                                 ))}
                              </div>
                           </div>
                        )}

                        {/* Vista previa resumida */}
                        <div className="bg-white border border-sky-100 rounded-xl px-3 py-2 text-[11px] text-neutral-600 flex items-center justify-between gap-2">
                           <span className="font-semibold text-sky-700 truncate">
                              Programación: {serializedFrequency}
                           </span>
                           <span className="font-bold text-pink-600 shrink-0">
                              {serializedTimeSchedule}
                           </span>
                        </div>
                     </div>

                     {/* Notas o Instrucciones */}
                     <div>
                        <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                           Notas o Instrucciones (Opcional)
                        </label>
                        <textarea
                           rows={2}
                           value={notes}
                           onChange={(e) => setNotes(e.target.value)}
                           placeholder={
                              category === 'medicamento'
                                 ? 'Ej: 1 tableta después de comer con agua'
                                 : category === 'vacuna_desparasitacion'
                                 ? 'Ej: En la veterinaria PetSalud'
                                 : 'Ej: Paseo de 30 min por el parque'
                           }
                           className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
                        />
                     </div>

                     <div className="flex items-center gap-2 p-2.5 bg-pink-50 border border-pink-100 rounded-xl text-xs text-pink-700">
                        <Bell className="w-4 h-4 text-pink-600 shrink-0" />
                        <span>Recibirás un correo al guardar y otro en cada hora programada.</span>
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
                           {submitting ? 'Guardando...' : editingId ? 'Actualizar Recordatorio' : 'Guardar Recordatorio'}
                        </button>
                     </div>
                  </form>
               </div>
            </div>
         )}

      </div>
   );
}
