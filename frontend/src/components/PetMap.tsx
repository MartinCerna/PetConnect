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
   petName?: string;
   homeLocation?: HomeCoordinates | null;
   safeRadiusMeters?: number;
   safeZoneEnabled?: boolean;
   isOutsideSafeZone?: boolean;
   isEditingSafeZone?: boolean;
   onPickHomeLocation?: (lat: number, lon: number) => void;
}

const DEFAULT_CENTER: [number, number] = [-8.0957, -79.0496];

export default function PetMap({
   locations,
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
      const markersGroup = L.layerGroup().addTo(map);
      safeZoneLayerRef.current = safeZoneGroup;
      markersLayerRef.current = markersGroup;
      mapInstanceRef.current = map;

      return () => {
         map.remove();
         mapInstanceRef.current = null;
         markersLayerRef.current = null;
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

   // 3. Dibujar círculo de Zona Segura y marcador de Casa en capa independiente
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

   // 4. Modo selección en el mapa cuando se edita Casa
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
