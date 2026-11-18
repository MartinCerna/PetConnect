'use client';

import {
   BatteryCharging,
   BatteryFull,
   BatteryLow,
   BatteryMedium,
   BatteryWarning,
   Zap,
} from 'lucide-react';

export interface BatteryVisuals {
   pct: number | null;
   isCharging: boolean;
   isCritical: boolean;
   label: string;
   hex: string;
   pillBgHex: string;
   textClass: string;
   bgClass: string;
   borderClass: string;
   barClass: string;
   badgeClass: string;
   voltageText: string | null;
   isEstimatedVoltage: boolean;
}

export function getBatteryVisuals(
   level: number | null | undefined,
   isCharging = false,
   voltage?: number | null
): BatteryVisuals {
   const pct =
      typeof level === 'number' && Number.isFinite(level)
         ? Math.max(0, Math.min(100, Math.round(level)))
         : null;

   const hasMeasuredVoltage = typeof voltage === 'number' && Number.isFinite(voltage) && voltage > 0;
   const voltageNum = hasMeasuredVoltage
      ? voltage
      : pct !== null
        ? 3.2 + (pct / 100) * 1.0
        : null;
   const voltageText = voltageNum !== null ? `${voltageNum.toFixed(2)} V` : null;

   if (pct === null) {
      return {
         pct: null,
         isCharging: false,
         isCritical: false,
         label: 'Sin lectura',
         hex: '#737373',
         pillBgHex: '#f5f5f5',
         textClass: 'text-neutral-600',
         bgClass: 'bg-neutral-50',
         borderClass: 'border-neutral-200',
         barClass: 'bg-neutral-300',
         badgeClass: 'bg-neutral-100 text-neutral-600',
         voltageText: null,
         isEstimatedVoltage: false,
      };
   }

   if (isCharging) {
      return {
         pct,
         isCharging: true,
         isCritical: false,
         label: 'Cargando ⚡',
         hex: '#0284c7',
         pillBgHex: '#e0f2fe',
         textClass: 'text-sky-700',
         bgClass: 'bg-sky-50/90',
         borderClass: 'border-sky-200',
         barClass: 'bg-gradient-to-r from-sky-500 to-cyan-400',
         badgeClass: 'bg-sky-100 text-sky-700',
         voltageText,
         isEstimatedVoltage: !hasMeasuredVoltage,
      };
   }

   if (pct >= 60) {
      return {
         pct,
         isCharging: false,
         isCritical: false,
         label: 'Óptima',
         hex: '#059669',
         pillBgHex: '#d1fae5',
         textClass: 'text-emerald-700',
         bgClass: 'bg-emerald-50/90',
         borderClass: 'border-emerald-200',
         barClass: 'bg-emerald-500',
         badgeClass: 'bg-emerald-100 text-emerald-700',
         voltageText,
         isEstimatedVoltage: !hasMeasuredVoltage,
      };
   }

   if (pct >= 30) {
      return {
         pct,
         isCharging: false,
         isCritical: false,
         label: 'Media',
         hex: '#d97706',
         pillBgHex: '#fef3c7',
         textClass: 'text-amber-700',
         bgClass: 'bg-amber-50/90',
         borderClass: 'border-amber-200',
         barClass: 'bg-amber-500',
         badgeClass: 'bg-amber-100 text-amber-700',
         voltageText,
         isEstimatedVoltage: !hasMeasuredVoltage,
      };
   }

   if (pct >= 16) {
      return {
         pct,
         isCharging: false,
         isCritical: false,
         label: 'Baja',
         hex: '#ea580c',
         pillBgHex: '#ffedd5',
         textClass: 'text-orange-700',
         bgClass: 'bg-orange-50/90',
         borderClass: 'border-orange-200',
         barClass: 'bg-orange-500',
         badgeClass: 'bg-orange-100 text-orange-700',
         voltageText,
         isEstimatedVoltage: !hasMeasuredVoltage,
      };
   }

   return {
      pct,
      isCharging: false,
      isCritical: true,
      label: 'Crítica',
      hex: '#e11d48',
      pillBgHex: '#ffe4e6',
      textClass: 'text-rose-700',
      bgClass: 'bg-rose-50/95',
      borderClass: 'border-rose-300',
      barClass: 'bg-rose-600',
      badgeClass: 'bg-rose-100 text-rose-700',
      voltageText,
      isEstimatedVoltage: !hasMeasuredVoltage,
   };
}

function BatteryStatusIcon({
   pct,
   isCharging,
   className,
}: {
   pct: number | null;
   isCharging: boolean;
   className?: string;
}) {
   if (isCharging) {
      return <BatteryCharging className={className} />;
   }
   if (pct === null) {
      return <BatteryLow className={className} />;
   }
   if (pct >= 70) {
      return <BatteryFull className={className} />;
   }
   if (pct >= 30) {
      return <BatteryMedium className={className} />;
   }
   if (pct >= 16) {
      return <BatteryLow className={className} />;
   }
   return <BatteryWarning className={className} />;
}

interface BatteryBadgeProps {
   level?: number | null;
   voltage?: number | null;
   isCharging?: boolean;
   updatedAt?: string | null;
   variant?: 'compact' | 'detailed';
   title?: string;
   className?: string;
}

export default function BatteryBadge({
   level,
   voltage,
   isCharging = false,
   updatedAt,
   variant = 'compact',
   title = 'Batería del collar',
   className = '',
}: BatteryBadgeProps) {
   const v = getBatteryVisuals(level, isCharging, voltage);

   if (variant === 'compact') {
      return (
         <div
            title={`${title}: ${v.pct !== null ? `${v.pct}% (${v.label})` : v.label}${
               v.voltageText ? ` · ${v.voltageText}` : ''
            }`}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold shadow-xs backdrop-blur-md transition-colors ${v.bgClass} ${v.borderClass} ${v.textClass} ${
               v.isCritical ? 'animate-pulse' : ''
            } ${className}`}
         >
            <BatteryStatusIcon pct={v.pct} isCharging={v.isCharging} className="w-4 h-4 shrink-0" />
            <span>{v.pct !== null ? `${v.pct}%` : '--%'}</span>
            {v.isCharging && <Zap className="w-3 h-3 fill-current shrink-0" />}
         </div>
      );
   }

   const formattedTime = updatedAt
      ? (() => {
           try {
              return new Date(updatedAt).toLocaleString('es-PE', {
                 day: '2-digit',
                 month: 'short',
                 hour: '2-digit',
                 minute: '2-digit',
              });
           } catch {
              return null;
           }
        })()
      : null;

   return (
      <div
         className={`rounded-xl border p-3 transition-colors ${v.bgClass} ${v.borderClass} ${className}`}
      >
         <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 min-w-0">
               <BatteryStatusIcon
                  pct={v.pct}
                  isCharging={v.isCharging}
                  className={`w-4 h-4 shrink-0 ${v.textClass} ${v.isCritical ? 'animate-pulse' : ''}`}
               />
               <span className="text-xs font-bold text-neutral-800 truncate">{title}</span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
               <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${v.badgeClass}`}>
                  {v.label}
               </span>
               <span className={`text-sm font-black tabular-nums ${v.textClass}`}>
                  {v.pct !== null ? `${v.pct}%` : '--%'}
               </span>
            </div>
         </div>

         {/* Barra de progreso con color dinámico */}
         <div className="w-full h-2 rounded-full bg-white/80 border border-black/5 overflow-hidden">
            <div
               className={`h-full rounded-full transition-all duration-500 ${v.barClass}`}
               style={{ width: `${v.pct ?? 0}%` }}
            />
         </div>

         <div className="mt-1.5 flex items-center justify-between text-[10px] text-neutral-500 font-medium">
            <span>
               {v.voltageText
                  ? `LiPo ${v.isEstimatedVoltage ? '~' : ''}${v.voltageText}`
                  : 'Esperando lectura ADC'}
            </span>
            <span>{formattedTime ? `Act: ${formattedTime}` : 'Estado en tiempo real'}</span>
         </div>
      </div>
   );
}
