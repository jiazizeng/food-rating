'use client';

import dynamic from 'next/dynamic';
import type { Restaurant } from '@/types';
import { MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM } from '@/lib/constants';

const MapContainer = dynamic(
  () => import('react-leaflet').then(m => m.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then(m => m.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then(m => m.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then(m => m.Popup),
  { ssr: false }
);

interface RestaurantMapProps {
  restaurants: Restaurant[];
  center?: [number, number];
  zoom?: number;
  className?: string;
  userLocation?: [number, number] | null;
}

function MapInner({ restaurants, center, zoom, className, userLocation }: RestaurantMapProps) {
  const L = typeof window !== 'undefined' ? require('leaflet') : null;

  const defaultIcon = L ? new L.Icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  }) : undefined;

  const redIcon = L ? new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  }) : undefined;

  const userIcon = L ? new L.DivIcon({
    className: 'user-location-marker',
    html: `<div style="
      width: 20px; height: 20px;
      background: #3b82f6;
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.3), 0 2px 8px rgba(0,0,0,0.2);
    "></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  }) : undefined;

  return (
    <>
      <style>{`
        @keyframes pulse-location {
          0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); }
          70% { box-shadow: 0 0 0 14px rgba(59, 130, 246, 0); }
          100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
        }
        .user-location-marker {
          animation: pulse-location 2s infinite;
          background: transparent !important;
          border: none !important;
        }
      `}</style>
      <MapContainer
        center={center || MAP_DEFAULT_CENTER}
        zoom={zoom || MAP_DEFAULT_ZOOM}
        className={className || 'h-[600px] w-full rounded-xl'}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {restaurants.filter(r => r.latitude && r.longitude).map(r => (
          <Marker
            key={r.id}
            position={[r.latitude!, r.longitude!]}
            icon={r.avg_rating >= 4.0 ? redIcon : defaultIcon}
          >
            <Popup>
              <div className="min-w-[180px]">
                <a href={`/restaurant/${r.id}`} className="font-semibold text-sm text-orange-600 hover:underline">
                  {r.name}
                </a>
                <div className="text-xs text-gray-500 mt-1">
                  ⭐ {r.avg_rating.toFixed(1)} · {r.cuisine || '未知'} · ¥{r.avg_price || '?'}/人
                </div>
                {r.address && <p className="text-xs text-gray-400 mt-0.5">{r.address}</p>}
              </div>
            </Popup>
          </Marker>
        ))}

        {userLocation && (
          <Marker position={userLocation} icon={userIcon}>
            <Popup>
              <div className="text-sm font-medium text-blue-600">📍 你的位置</div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </>
  );
}

export function RestaurantMap(props: RestaurantMapProps) {
  if (typeof window === 'undefined') {
    return <div className="h-[600px] w-full rounded-xl bg-gray-100 animate-pulse" />;
  }
  return <MapInner {...props} />;
}
