'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Corregir la ruta de los iconos predeterminados de Leaflet en Next.js
const customIcon = new L.Icon({
   iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
   iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
   shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
   iconSize: [25, 41],
   iconAnchor: [12, 41],
});

interface Location {
   id: number;
   latitude: number;
   longitude: number;
   recorded_at: string;
}

export default function PetMap({ locations }: { locations: Location[] }) {
   // Posición inicial: la coordenada más reciente o el centro de Trujillo
   const latest = locations[0] || { latitude: -8.0957, longitude: -79.0496 };

   return (
      <div className="relative z-0 w-full rounded-2xl overflow-hidden">
         <MapContainer
            center={[latest.latitude, latest.longitude]}
            zoom={17}
            scrollWheelZoom={true}
            style={{ height: "100%", width: "100%", minHeight: "100vh" }} // <-- Asegúrate de que esto esté así
            className="z-0"
         >
            <TileLayer
               attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
               url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {locations.map((loc) => (
               <Marker
                  key={loc.id}
                  position={[loc.latitude, loc.longitude]}
                  icon={customIcon}
               >
                  <Popup>
                     <div className="text-slate-800">
                        <p className="font-bold">Mascota: Thor</p>
                        <p className="text-xs text-gray-600">
                           Registrado: {new Date(loc.recorded_at).toLocaleString()}
                        </p>
                     </div>
                  </Popup>
               </Marker>
            ))}
         </MapContainer>
      </div>
   );
}