import React, { useState } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import { MapLayersData, HotspotCluster } from '../../types';
import { Badge } from '../ui/Badge';
import {
  Layers,
  MapPin,
  Building2,
  Users2,
  Flame,
  Clock,
  Sparkles,
} from 'lucide-react';

// Fix default Leaflet icon paths
const createIcon = (color: string) => {
  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `<div style="
      background-color: ${color};
      width: 22px;
      height: 22px;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 2px 5px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <div style="width: 6px; height: 6px; background-color: white; border-radius: 50%;"></div>
    </div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -11],
  });
};

const donorIcon = createIcon('#059669'); // Emerald
const ngoIcon = createIcon('#2563eb'); // Blue
const listingIcon = createIcon('#16a34a'); // Green
const claimedIcon = createIcon('#9333ea'); // Purple
const hotspotIcon = createIcon('#dc2626'); // Red

interface SurplusMapProps {
  data: MapLayersData;
  center?: [number, number];
  zoom?: number;
}

export const SurplusMap: React.FC<SurplusMapProps> = ({
  data,
  center = [21.1458, 79.0882], // Default Nagpur center
  zoom = 12,
}) => {
  const [showDonors, setShowDonors] = useState(true);
  const [showNgos, setShowNgos] = useState(true);
  const [showListings, setShowListings] = useState(true);
  const [showClaimed, setShowClaimed] = useState(true);
  const [showHotspots, setShowHotspots] = useState(true);

  return (
    <div className="relative w-full h-[550px] rounded-xl overflow-hidden border border-slate-200 shadow-sm">
      {/* Map Layer Controls Floating Box */}
      <div className="absolute top-3 right-3 z-[1000] bg-white/95 backdrop-blur-md p-3.5 rounded-xl border border-slate-200 shadow-md text-xs space-y-2">
        <div className="flex items-center space-x-1.5 font-semibold text-slate-800 border-b border-slate-100 pb-1.5">
          <Layers className="w-4 h-4 text-forest-700" />
          <span>Interactive Layers</span>
        </div>

        <label className="flex items-center space-x-2 cursor-pointer hover:text-slate-900">
          <input
            type="checkbox"
            checked={showHotspots}
            onChange={(e) => setShowHotspots(e.target.checked)}
            className="rounded text-rose-600 focus:ring-rose-500"
          />
          <div className="w-2.5 h-2.5 rounded-full bg-rose-600"></div>
          <span className="font-medium text-rose-700">Unmatched Hotspots ({data.hotspots.length})</span>
        </label>

        <label className="flex items-center space-x-2 cursor-pointer hover:text-slate-900">
          <input
            type="checkbox"
            checked={showListings}
            onChange={(e) => setShowListings(e.target.checked)}
            className="rounded text-emerald-600 focus:ring-emerald-500"
          />
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-600"></div>
          <span>Active Listings ({data.activeListings.length})</span>
        </label>

        <label className="flex items-center space-x-2 cursor-pointer hover:text-slate-900">
          <input
            type="checkbox"
            checked={showClaimed}
            onChange={(e) => setShowClaimed(e.target.checked)}
            className="rounded text-purple-600 focus:ring-purple-500"
          />
          <div className="w-2.5 h-2.5 rounded-full bg-purple-600"></div>
          <span>Claimed / In-Transit ({data.claimedListings.length})</span>
        </label>

        <label className="flex items-center space-x-2 cursor-pointer hover:text-slate-900">
          <input
            type="checkbox"
            checked={showNgos}
            onChange={(e) => setShowNgos(e.target.checked)}
            className="rounded text-blue-600 focus:ring-blue-500"
          />
          <div className="w-2.5 h-2.5 rounded-full bg-blue-600"></div>
          <span>Rescue NGOs ({data.ngos.length})</span>
        </label>

        <label className="flex items-center space-x-2 cursor-pointer hover:text-slate-900">
          <input
            type="checkbox"
            checked={showDonors}
            onChange={(e) => setShowDonors(e.target.checked)}
            className="rounded text-teal-600 focus:ring-teal-500"
          />
          <div className="w-2.5 h-2.5 rounded-full bg-teal-600"></div>
          <span>Food Donors ({data.donors.length})</span>
        </label>
      </div>

      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* 1. Unmatched-Surplus Hotspots Layer */}
        {showHotspots &&
          data.hotspots.map((hotspot, idx) => (
            <React.Fragment key={`hotspot-${idx}`}>
              <Circle
                center={[hotspot.grid_lat, hotspot.grid_lng]}
                radius={Math.min(2200, Math.max(500, hotspot.total_unmatched_kg * 12))}
                pathOptions={{
                  color: '#dc2626',
                  fillColor: '#ef4444',
                  fillOpacity: 0.35,
                  weight: 2,
                }}
              />
              <Marker
                position={[hotspot.grid_lat, hotspot.grid_lng]}
                icon={hotspotIcon}
              >
                <Popup className="custom-popup">
                  <div className="p-1 space-y-1.5 max-w-[240px]">
                    <div className="flex items-center space-x-1 text-rose-600 font-bold text-xs uppercase">
                      <Flame className="w-4 h-4" />
                      <span>Unmatched Hotspot</span>
                    </div>
                    <p className="text-xs text-slate-600">
                      Surplus food in this sector has no eligible NGO within reachable travel time or capacity.
                    </p>
                    <div className="bg-rose-50 p-2 rounded-lg border border-rose-100 space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-600">Unmatched Postings:</span>
                        <span className="font-bold text-rose-800">{hotspot.unmatched_count}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-600">Total Unclaimed Food:</span>
                        <span className="font-bold text-rose-800">{hotspot.total_unmatched_kg} kg</span>
                      </div>
                    </div>
                    {hotspot.sample_food_types && (
                      <div className="text-[11px] text-slate-500">
                        <span className="font-semibold">Items: </span>
                        {hotspot.sample_food_types.slice(0, 3).join(', ')}
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            </React.Fragment>
          ))}

        {/* 2. Active Food Listings Layer */}
        {showListings &&
          data.activeListings.map((listing) => (
            <Marker
              key={`listing-${listing.id}`}
              position={[listing.latitude, listing.longitude]}
              icon={listingIcon}
            >
              <Popup>
                <div className="p-1 space-y-1 max-w-[220px]">
                  <Badge variant="green" size="sm">Available Surplus</Badge>
                  <h4 className="font-bold text-sm text-slate-900 mt-1">{listing.food_type}</h4>
                  <p className="text-xs text-slate-600">Quantity: <strong>{listing.quantity_kg} kg</strong></p>
                  <p className="text-xs text-slate-500">Donor: {listing.donor_name}</p>
                  <div className="flex items-center text-xs text-amber-700 font-medium">
                    <Clock className="w-3.5 h-3.5 mr-1" />
                    <span>Safe until: {new Date(listing.safe_until).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

        {/* 3. Claimed / Picked Up Listings */}
        {showClaimed &&
          data.claimedListings.map((listing) => (
            <Marker
              key={`claimed-${listing.id}`}
              position={[listing.latitude, listing.longitude]}
              icon={claimedIcon}
            >
              <Popup>
                <div className="p-1 space-y-1 max-w-[220px]">
                  <Badge variant="purple" size="sm">{listing.status}</Badge>
                  <h4 className="font-bold text-sm text-slate-900">{listing.food_type}</h4>
                  <p className="text-xs text-slate-600">Quantity: <strong>{listing.quantity_kg} kg</strong></p>
                  <p className="text-xs text-slate-600">Claimed By: <strong>{listing.ngo_name}</strong></p>
                  <p className="text-xs text-slate-500">Donor: {listing.donor_name}</p>
                </div>
              </Popup>
            </Marker>
          ))}

        {/* 4. Rescue NGOs Layer */}
        {showNgos &&
          data.ngos.map((ngo) => (
            <React.Fragment key={`ngo-${ngo.id}`}>
              <Circle
                center={[ngo.latitude, ngo.longitude]}
                radius={ngo.service_radius_km * 1000}
                pathOptions={{
                  color: '#3b82f6',
                  fillColor: '#60a5fa',
                  fillOpacity: 0.08,
                  weight: 1,
                  dashArray: '4, 6',
                }}
              />
              <Marker
                position={[ngo.latitude, ngo.longitude]}
                icon={ngoIcon}
              >
                <Popup>
                  <div className="p-1 space-y-1 max-w-[220px]">
                    <div className="flex items-center space-x-1 text-blue-700 font-bold text-xs uppercase">
                      <Users2 className="w-3.5 h-3.5" />
                      <span>Rescue NGO</span>
                    </div>
                    <h4 className="font-bold text-sm text-slate-900">{ngo.organization_name}</h4>
                    <p className="text-xs text-slate-600">{ngo.address}</p>
                    <div className="text-xs space-y-0.5 pt-1 text-slate-600">
                      <div>Capacity: <strong>{ngo.capacity_kg} kg</strong></div>
                      <div>Service Radius: <strong>{ngo.service_radius_km} km</strong></div>
                      <div>Status: <strong>{ngo.is_accepting ? 'Accepting Food' : 'Paused'}</strong></div>
                      <div>Contact: <strong>{ngo.contact_phone}</strong></div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            </React.Fragment>
          ))}

        {/* 5. Food Donors Layer */}
        {showDonors &&
          data.donors.map((donor) => (
            <Marker
              key={`donor-${donor.id}`}
              position={[donor.latitude, donor.longitude]}
              icon={donorIcon}
            >
              <Popup>
                <div className="p-1 space-y-1 max-w-[220px]">
                  <div className="flex items-center space-x-1 text-emerald-700 font-bold text-xs uppercase">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Food Donor</span>
                  </div>
                  <h4 className="font-bold text-sm text-slate-900">{donor.organization_name}</h4>
                  <p className="text-xs text-slate-600">{donor.address}</p>
                  <p className="text-xs text-slate-500">Contact: {donor.contact_phone}</p>
                </div>
              </Popup>
            </Marker>
          ))}
      </MapContainer>
    </div>
  );
};

