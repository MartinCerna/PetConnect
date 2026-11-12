'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface Location {
   id: number;
   latitude: number;
   longitude: number;
   recorded_at: string;
}

export interface HomeCoordinates {
   lat: number;
   lon: number;
}

interface PetMapProps {
   locations: Location[];
   trailLocations?: Location[];
   showTrail?: boolean;
   petName?: string;
   homeLocation?: HomeCoordinates | null;
   safeRadiusMeters?: number;
   safeZoneEnabled?: boolean;
   isOutsideSafeZone?: boolean;
   isEditingSafeZone?: boolean;
   onPickHomeLocation?: (lat: number, lon: number) => void;
}

const DEFAULT_CENTER: [number, number] = [-8.0957, -79.0496];

const calculateBearingDeg = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
   if (Math.abs(lat2 - lat1) < 1e-6 && Math.abs(lon2 - lon1) < 1e-6) {
      return 0;
   }
   const toRad = (deg: number) => (deg * Math.PI) / 180;
   const dLon = toRad(lon2 - lon1);
   const y = Math.sin(dLon) * Math.cos(toRad(lat2));
   const x =
      Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
      Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
   const brng = (Math.atan2(y, x) * 180) / Math.PI;
   return (brng + 360) % 360;
};

const buildPawIcon = (opacity: number, size: number, rotationDeg: number, color: string) =>
   L.divIcon({
      className: 'petconnect-paw-marker',
      html: `
         <div style="
            width: ${size}px;
            height: ${size}px;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: ${opacity};
            transform: rotate(${rotationDeg}deg);
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.22));
            transition: transform 0.2s ease, opacity 0.2s ease;
         ">
            <svg viewBox="0 0 64 64" width="${size}" height="${size}" fill="${color}" xmlns="http://www.w3.org/2000/svg">
               <ellipse cx="14" cy="24" rx="6.2" ry="8.4" transform="rotate(-18 14 24)" stroke="#ffffff" stroke-width="2"/>
               <ellipse cx="26" cy="14" rx="6.2" ry="8.6" transform="rotate(-6 26 14)" stroke="#ffffff" stroke-width="2"/>
               <ellipse cx="38" cy="14" rx="6.2" ry="8.6" transform="rotate(6 38 14)" stroke="#ffffff" stroke-width="2"/>
               <ellipse cx="50" cy="24" rx="6.2" ry="8.4" transform="rotate(18 50 24)" stroke="#ffffff" stroke-width="2"/>
               <path d="M32 25c-9.5 0-16.5 7.2-16.5 15.2 0 5.6 4.2 9.8 9.6 9.8 2.6 0 4.6-.9 6.9-.9s4.3.9 6.9.9c5.4 0 9.6-4.2 9.6-9.8C48.5 32.2 41.5 25 32 25z" stroke="#ffffff" stroke-width="2.2"/>
            </svg>
         </div>
      `,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      popupAnchor: [0, -size / 2],
   });

export default function PetMap({
   locations,
   trailLocations = [],
   showTrail = true,
   petName,
   homeLocation,
   safeRadiusMeters = 150,
   safeZoneEnabled = false,
   isOutsideSafeZone = false,
   isEditingSafeZone = false,
   onPickHomeLocation,
}: PetMapProps) {
   const containerRef = useRef<HTMLDivElement | null>(null);
   const mapInstanceRef = useRef<L.Map | null>(null);
   const markersLayerRef = useRef<L.LayerGroup | null>(null);
   const safeZoneLayerRef = useRef<L.LayerGroup | null>(null);
   const trailLayerRef = useRef<L.LayerGroup | null>(null);
   const lastCenteredKeyRef = useRef<string>('');
   const onPickRef = useRef(onPickHomeLocation);

   useEffect(() => {
      onPickRef.current = onPickHomeLocation;
   }, [onPickHomeLocation]);

   const latest = locations[0];
   const center: [number, number] = latest ? [latest.latitude, latest.longitude] : DEFAULT_CENTER;

   // 1. Inicializar el mapa de Leaflet una sola vez sobre el nodo DOM
   useEffect(() => {
      if (!containerRef.current || mapInstanceRef.current) return;

      const map = L.map(containerRef.current, {
         center,
         zoom: 17,
         scrollWheelZoom: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
         attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      const safeZoneGroup = L.layerGroup().addTo(map);
      const trailGroup = L.layerGroup().addTo(map);
      const markersGroup = L.layerGroup().addTo(map);
      safeZoneLayerRef.current = safeZoneGroup;
      trailLayerRef.current = trailGroup;
      markersLayerRef.current = markersGroup;
      mapInstanceRef.current = map;

      return () => {
         map.remove();
         mapInstanceRef.current = null;
         markersLayerRef.current = null;
         trailLayerRef.current = null;
         safeZoneLayerRef.current = null;
      };
   }, []); // eslint-disable-line react-hooks/exhaustive-deps

   // 2. Actualizar marcador de mascota y centrar solo cuando cambian las coordenadas reales o la mascota
   useEffect(() => {
      const map = mapInstanceRef.current;
      const markersLayer = markersLayerRef.current;
      if (!map || !markersLayer) return;

      markersLayer.clearLayers();

      const customIcon = L.icon({
         iconUrl: '/marker-icon.png',
         iconRetinaUrl: '/marker-icon-2x.png',
         shadowUrl: '/marker-shadow.png',
         iconSize: [25, 41],
         iconAnchor: [12, 41],
         popupAnchor: [1, -34],
      });

      if (locations.length > 0) {
         const latestLoc = locations[0];
         const marker = L.marker([latestLoc.latitude, latestLoc.longitude], { icon: customIcon });
         marker.bindPopup(`
            <div style="font-family: inherit; font-size: 13px; color: #171717;">
               <strong style="font-size: 14px;">${petName ?? 'Mascota'}</strong><br/>
               <span style="color: ${isOutsideSafeZone ? '#e11d48' : '#059669'}; font-weight: 600; font-size: 11px;">
                  ${isOutsideSafeZone ? 'Fuera de Zona Segura' : 'Última ubicación conocida'}
               </span><br/>
               <span style="color: #666; font-size: 11px;">
                  ${new Date(latestLoc.recorded_at).toLocaleString()}
               </span>
            </div>
         `);
         markersLayer.addLayer(marker);

         const nextKey = `${petName ?? ''}:${latestLoc.latitude.toFixed(6)},${latestLoc.longitude.toFixed(6)}`;
         if (!isEditingSafeZone && lastCenteredKeyRef.current !== nextKey) {
            map.setView([latestLoc.latitude, latestLoc.longitude], Math.max(map.getZoom(), 16));
            lastCenteredKeyRef.current = nextKey;
         }
      } else if (!isEditingSafeZone && lastCenteredKeyRef.current !== 'default') {
         map.setView(DEFAULT_CENTER, 15);
         lastCenteredKeyRef.current = 'default';
      }
   }, [locations, petName, isOutsideSafeZone, isEditingSafeZone]);

   // 3. Dibujar rastro de huellitas (últimas 10 ubicaciones) y línea direccional
   useEffect(() => {
      const trailLayer = trailLayerRef.current;
      if (!trailLayer) return;

      trailLayer.clearLayers();

      if (!showTrail || trailLocations.length === 0) return;

      // Orden cronológico: más antigua [0] -> más reciente [length - 1]
      const chronological = [...trailLocations]
         .slice(0, 10)
         .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());

      if (chronological.length > 1) {
         const pathCoords: [number, number][] = chronological.map((loc) => [loc.latitude, loc.longitude]);
         const polyline = L.polyline(pathCoords, {
            color: isOutsideSafeZone ? '#e11d48' : '#ec4899',
            weight: 3,
            opacity: 0.6,
            dashArray: '6, 8',
            lineJoin: 'round',
         });
         trailLayer.addLayer(polyline);
      }

      const total = chronological.length;
      let lastBearing = 0;

      // Marcamos con huellita cada paso del recorrido para ver de dónde viene y hacia dónde va
      chronological.forEach((loc, idx) => {
         const isMostRecent = idx === total - 1;
         // Si ya hay marcador principal en el punto más reciente, omitimos duplicar encima salvo si solo hay 1 punto
         if (isMostRecent && locations.length > 0) return;

         const nextLoc = chronological[idx + 1] ?? locations[0];
         if (nextLoc) {
            const movedEnough =
               Math.abs(nextLoc.latitude - loc.latitude) >= 1e-6 ||
               Math.abs(nextLoc.longitude - loc.longitude) >= 1e-6;
            if (movedEnough) {
               lastBearing = calculateBearingDeg(loc.latitude, loc.longitude, nextLoc.latitude, nextLoc.longitude);
            }
         }

         const progress = total > 1 ? idx / (total - 1) : 1;
         const opacity = 0.42 + progress * 0.53;
         const size = Math.round(20 + progress * 7);
         const color = isOutsideSafeZone ? '#e11d48' : '#db2777';

         const pawMarker = L.marker([loc.latitude, loc.longitude], {
            icon: buildPawIcon(opacity, size, lastBearing, color),
         });

         const stepLabel = idx === 0 ? 'Inicio del rastro' : `Huella #${idx + 1} de ${total}`;
         pawMarker.bindPopup(`
            <div style="font-family: inherit; font-size: 12px; color: #171717;">
               <strong style="color: ${color};">🐾 ${stepLabel}</strong><br/>
               <span style="color: #525252;">${petName ?? 'Mascota'} pasó por aquí</span><br/>
               <span style="color: #737373; font-size: 11px;">
                  ${new Date(loc.recorded_at).toLocaleString()}
               </span>
            </div>
         `);

         trailLayer.addLayer(pawMarker);
      });
   }, [trailLocations, showTrail, locations, petName, isOutsideSafeZone]);

   // 4. Dibujar círculo de Zona Segura y marcador de Casa en capa independiente
   useEffect(() => {
      const safeZoneLayer = safeZoneLayerRef.current;
      if (!safeZoneLayer) return;

      safeZoneLayer.clearLayers();

      const shouldShow = Boolean(homeLocation && (safeZoneEnabled || isEditingSafeZone));
      if (!shouldShow || !homeLocation) return;

      const strokeColor = isOutsideSafeZone && !isEditingSafeZone ? '#e11d48' : '#db2777';
      const fillColor = isOutsideSafeZone && !isEditingSafeZone ? '#f43f5e' : '#ec4899';

      const circle = L.circle([homeLocation.lat, homeLocation.lon], {
         radius: safeRadiusMeters || 150,
         color: strokeColor,
         weight: isEditingSafeZone ? 3 : 2.5,
         opacity: isEditingSafeZone ? 0.95 : 0.85,
         fillColor,
         fillOpacity: isOutsideSafeZone && !isEditingSafeZone ? 0.18 : 0.14,
         dashArray: isOutsideSafeZone && !isEditingSafeZone ? '8, 6' : undefined,
      });

      safeZoneLayer.addLayer(circle);

      const homeIcon = L.divIcon({
         className: 'petconnect-home-pin',
         html: `
            <div style="
               display: flex;
               align-items: center;
               justify-content: center;
               width: 36px;
               height: 36px;
               border-radius: 9999px;
               background: linear-gradient(135deg, #db2777 0%, #ec4899 100%);
               border: 3px solid #ffffff;
               box-shadow: 0 6px 16px rgba(219, 39, 119, 0.45);
               font-size: 16px;
               line-height: 1;
               cursor: ${isEditingSafeZone ? 'grab' : 'pointer'};
            ">🏠</div>
         `,
         iconSize: [36, 36],
         iconAnchor: [18, 18],
         popupAnchor: [0, -18],
      });

      const homeMarker = L.marker([homeLocation.lat, homeLocation.lon], {
         icon: homeIcon,
         draggable: isEditingSafeZone,
      });

      homeMarker.bindPopup(`
         <div style="font-family: inherit; font-size: 13px; color: #171717;">
            <strong style="font-size: 14px; color: #db2777;">🏠 Casa · Zona Segura</strong><br/>
            <span style="color: #525252; font-size: 12px;">Radio seguro: <b>${safeRadiusMeters} m</b></span>
         </div>
      `);

      if (isEditingSafeZone) {
         homeMarker.on('dragend', () => {
            const pos = homeMarker.getLatLng();
            onPickRef.current?.(pos.lat, pos.lng);
         });
      }

      safeZoneLayer.addLayer(homeMarker);
   }, [homeLocation, safeRadiusMeters, safeZoneEnabled, isOutsideSafeZone, isEditingSafeZone]);

   // 5. Modo selección en el mapa cuando se edita Casa
   useEffect(() => {
      const map = mapInstanceRef.current;
      if (!map) return;

      const container = map.getContainer();
      container.style.cursor = isEditingSafeZone ? 'crosshair' : '';

      if (!isEditingSafeZone) return;

      const handleMapClick = (e: L.LeafletMouseEvent) => {
         onPickRef.current?.(e.latlng.lat, e.latlng.lng);
      };

      map.on('click', handleMapClick);
      return () => {
         map.off('click', handleMapClick);
         container.style.cursor = '';
      };
   }, [isEditingSafeZone]);

   return (
      <div className="relative z-0 w-full h-full overflow-hidden">
         <div ref={containerRef} className="w-full h-full min-h-screen z-0" />
      </div>
   );
}
