import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

const pickerIcon = L.divIcon({
  className: 'custom-picker-marker',
  html: `<div style="
    background-color: #166534;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    border: 3px solid white;
    box-shadow: 0 2px 8px rgba(0,0,0,0.4);
    display: flex;
    align-items: center;
    justify-content: center;
  ">
    <div style="width: 8px; height: 8px; background-color: white; border-radius: 50%;"></div>
  </div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 13],
});

interface LocationPickerProps {
  initialLat: number;
  initialLng: number;
  onLocationSelect: (lat: number, lng: number) => void;
}

function MapClickHandler({ onSelect }: { onSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onSelect(
        Math.round(e.latlng.lat * 100000) / 100000,
        Math.round(e.latlng.lng * 100000) / 100000
      );
    },
  });
  return null;
}

export const LocationPickerMap: React.FC<LocationPickerProps> = ({
  initialLat,
  initialLng,
  onLocationSelect,
}) => {
  const [position, setPosition] = useState<[number, number]>([initialLat, initialLng]);

  const handleSelect = (lat: number, lng: number) => {
    setPosition([lat, lng]);
    onLocationSelect(lat, lng);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center text-xs text-slate-500">
        <span>Click on the map to place pickup location pin:</span>
        <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700">
          {position[0].toFixed(5)}, {position[1].toFixed(5)}
        </span>
      </div>
      <div className="h-[220px] rounded-lg overflow-hidden border border-slate-300">
        <MapContainer
          center={position}
          zoom={13}
          scrollWheelZoom={false}
          className="w-full h-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickHandler onSelect={handleSelect} />
          <Marker position={position} icon={pickerIcon} />
        </MapContainer>
      </div>
    </div>
  );
};
