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

const DEFAULT_CENTER: [number, number] = [-8.0957, -79.0496];

export default function PetMap({
   locations,
   petName,
}: {
   locations: Location[];
   petName?: string;
}) {
   const containerRef = useRef<HTMLDivElement | null>(null);
   const mapInstanceRef = useRef<L.Map | null>(null);
   const markersLayerRef = useRef<L.LayerGroup | null>(null);

   const latest = locations[0];
   const center: [number, number] = latest ? [latest.latitude, latest.longitude] : DEFAULT_CENTER;

   // 1. Inicializar el mapa de Leaflet una sola vez sobre el nodo DOM
   useEffect(() => {
      if (!containerRef.current || mapInstanceRef.current) return;

      const map = L.map(containerRef.current, {
         center: center,
         zoom: 17,
         scrollWheelZoom: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
         attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      const markersGroup = L.layerGroup().addTo(map);
      markersLayerRef.current = markersGroup;
      mapInstanceRef.current = map;

      return () => {
         map.remove();
         mapInstanceRef.current = null;
         markersLayerRef.current = null;
      };
   }, []); // eslint-disable-line react-hooks/exhaustive-deps

   // 2. Actualizar centro y marcadores cuando cambien las ubicaciones o la mascota
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
         locations.forEach((loc) => {
            const marker = L.marker([loc.latitude, loc.longitude], { icon: customIcon });
            marker.bindPopup(`
               <div style="font-family: inherit; font-size: 13px; color: #171717;">
                  <strong style="font-size: 14px;">${petName ?? 'Mascota'}</strong><br/>
                  <span style="color: #666; font-size: 11px;">
                     ${new Date(loc.recorded_at).toLocaleString()}
                  </span>
               </div>
            `);
            markersLayer.addLayer(marker);
         });

         const first = locations[0];
         map.setView([first.latitude, first.longitude], 17);
      } else {
         map.setView(DEFAULT_CENTER, 15);
      }
   }, [locations, petName]);

   return (
      <div className="relative z-0 w-full h-full overflow-hidden">
         <div ref={containerRef} className="w-full h-full min-h-screen z-0" />
      </div>
   );
}
