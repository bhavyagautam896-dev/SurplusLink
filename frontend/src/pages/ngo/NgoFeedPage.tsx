import React, { useState, useEffect } from 'react';
import { api, getErrorMessage } from '../../api/client';
import { Listing, EligibleListing } from '../../types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import {
  Compass,
  MapPin,
  Clock,
  Navigation,
  ShieldCheck,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Building2,
} from 'lucide-react';

export const NgoFeedPage: React.FC = () => {
  const [listings, setListings] = useState<EligibleListing[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [search, setSearch] = useState('');
  const [selectedFoodType, setSelectedFoodType] = useState('ALL');
  const [radiusKm, setRadiusKm] = useState<number>(15);
  const [sortBy, setSortBy] = useState('urgency');

  // Claiming state
  const [selectedListing, setSelectedListing] = useState<EligibleListing | null>(null);
  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claimSuccess, setClaimSuccess] = useState(false);

  const fetchFeed = async () => {
    setLoading(true);
    try {
      const params: any = {
        radiusKm,
        sortBy,
      };
      if (selectedFoodType !== 'ALL') {
        params.foodType = selectedFoodType;
      }

      const res = await api.get('/listings/nearby', { params });
      if (res.data.success) {
        setListings(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load NGO feed', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, [radiusKm, selectedFoodType, sortBy]);

  const handleOpenClaimModal = (listing: EligibleListing) => {
    setSelectedListing(listing);
    setClaimError(null);
    setClaimSuccess(false);
    setClaimModalOpen(true);
  };

  const handleExecuteClaim = async () => {
    if (!selectedListing) return;
    setClaiming(true);
    setClaimError(null);

    try {
      await api.post(`/listings/${selectedListing.id}/claim`);
      setClaimSuccess(true);
      setTimeout(() => {
        setClaimModalOpen(false);
        fetchFeed(); // Refresh feed immediately so claimed listing disappears
      }, 1200);
    } catch (err: any) {
      setClaimError(getErrorMessage(err));
      // Refresh feed in background so stale item is removed
      fetchFeed();
    } finally {
      setClaiming(false);
    }
  };

  // Filter listings by client search
  const displayedListings = listings.filter((l) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      l.food_type.toLowerCase().includes(term) ||
      l.description.toLowerCase().includes(term) ||
      (l.donor_organization_name && l.donor_organization_name.toLowerCase().includes(term))
    );
  });

  const getUrgencyBadge = (urgency?: string) => {
    switch (urgency) {
      case 'URGENT':
        return <Badge variant="red">Urgent (&lt; 1 hr safe)</Badge>;
      case 'EXPIRING_SOON':
        return <Badge variant="amber">Expiring Soon</Badge>;
      default:
        return <Badge variant="green">Available</Badge>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Available Surplus Food Feed
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Eligible donations filtered by vehicle capacity, Haversine proximity, and travel time feasibility
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchFeed}>
          <RotateCw className="w-4 h-4 mr-1.5" />
          Refresh Listings
        </Button>
      </div>

      {/* Control Bar: Search, Radius Slider, Food Type, Sort */}
      <Card className="p-4 space-y-3 bg-white">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search food or donor..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-forest-600"
            />
          </div>

          {/* Food Type */}
          <div>
            <select
              value={selectedFoodType}
              onChange={(e) => setSelectedFoodType(e.target.value)}
              className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-forest-600"
            >
              <option value="ALL">All Food Types</option>
              <option value="Cooked">Cooked Meals & Curries</option>
              <option value="Bakery">Bakery & Breads</option>
              <option value="Lunch">Packed Lunches</option>
              <option value="Buffet">Buffet Banquet Surplus</option>
              <option value="Fruit">Fruits & Salads</option>
            </select>
          </div>

          {/* Sort Option */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-forest-600"
            >
              <option value="urgency">Sort: Most Urgent First</option>
              <option value="distance">Sort: Nearest Distance First</option>
              <option value="earliestSafeUntil">Sort: Earliest Safe Expiry</option>
              <option value="quantity">Sort: Largest Quantity (kg)</option>
            </select>
          </div>

          {/* Radius Slider */}
          <div className="flex items-center space-x-3 px-2">
            <span className="text-xs font-medium text-slate-600 whitespace-nowrap">
              Radius: <strong>{radiusKm} km</strong>
            </span>
            <input
              type="range"
              min="2"
              max="25"
              step="1"
              value={radiusKm}
              onChange={(e) => setRadiusKm(parseInt(e.target.value, 10))}
              className="w-full accent-forest-700 cursor-pointer"
            />
          </div>
        </div>
      </Card>

      {/* Feed Content */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-forest-800 mx-auto" />
          <p className="text-xs text-slate-500 mt-2">Computing Haversine matches and travel times...</p>
        </div>
      ) : displayedListings.length === 0 ? (
        <Card className="text-center py-16 space-y-3">
          <Compass className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-base font-semibold text-slate-800">No matching surplus food nearby</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Either there are no active listings within {radiusKm} km, your capacity is below available batch sizes,
            or the remaining safe pickup windows are too tight for safe travel.
          </p>
          <Button variant="outline" size="sm" onClick={() => setRadiusKm(20)}>
            Expand Search Radius to 20 km
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {displayedListings.map((listing) => (
            <Card
              key={listing.id}
              className="flex flex-col justify-between space-y-4 hover:border-forest-600/60 transition-all"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-base text-slate-900 leading-snug">
                    {listing.food_type}
                  </h3>
                  {getUrgencyBadge(listing.urgency)}
                </div>

                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                  {listing.description}
                </p>

                {/* Donor Organization & Address */}
                <div className="flex items-start space-x-2 text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <Building2 className="w-4 h-4 text-forest-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block">{listing.donor_organization_name}</span>
                    <span className="text-[11px] text-slate-500">{listing.donor_address}</span>
                  </div>
                </div>

                {/* Logistics Intelligence Metrics */}
                <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-100 text-center">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Quantity</span>
                    <span className="font-extrabold text-slate-900 text-sm">{listing.quantity_kg} kg</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Distance</span>
                    <span className="font-extrabold text-forest-800 text-sm">{listing.distance_km} km</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Est. Travel</span>
                    <span className="font-extrabold text-forest-800 text-sm">{listing.estimated_travel_minutes} min</span>
                  </div>
                </div>

                {/* Expiry Window */}
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span className="flex items-center">
                    <Clock className="w-3.5 h-3.5 mr-1 text-amber-600" />
                    Remaining window:
                  </span>
                  <span className="font-semibold text-slate-900">
                    {listing.remaining_minutes} minutes
                  </span>
                </div>
              </div>

              {/* Claim Action */}
              <Button
                variant="primary"
                size="sm"
                className="w-full"
                onClick={() => handleOpenClaimModal(listing)}
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                Claim for Rescue
              </Button>
            </Card>
          ))}
        </div>
      )}

      {/* Atomic Claim Confirmation Dialog */}
      {selectedListing && (
        <Modal
          isOpen={claimModalOpen}
          onClose={() => setClaimModalOpen(false)}
          title="Confirm Food Rescue Claim"
          maxWidth="md"
        >
          <div className="space-y-4">
            {claimError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Claim Conflict / Ineligibility</p>
                  <p>{claimError}</p>
                </div>
              </div>
            )}

            {claimSuccess && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span className="font-semibold">Claim successfully recorded! Redirecting...</span>
              </div>
            )}

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Food Item:</span>
                <span className="font-bold text-slate-900">{selectedListing.food_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Quantity:</span>
                <span className="font-bold text-slate-900">{selectedListing.quantity_kg} kg</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Donor Location:</span>
                <span className="font-bold text-slate-900">{selectedListing.donor_organization_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Haversine Distance:</span>
                <span className="font-bold text-forest-800">{selectedListing.distance_km} km</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Estimated Travel Time:</span>
                <span className="font-bold text-forest-800">~{selectedListing.estimated_travel_minutes} mins</span>
              </div>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              By claiming, your organization commits to dispatching a vehicle to collect this food
              before the safe-until expiry. An atomic transaction ensures only one NGO can claim this listing.
            </p>

            <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setClaimModalOpen(false)}
                disabled={claiming}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                isLoading={claiming}
                onClick={handleExecuteClaim}
                disabled={claimSuccess}
              >
                Confirm Claim
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
