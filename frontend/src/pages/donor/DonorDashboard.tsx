import React, { useState, useEffect } from 'react';
import { api, getErrorMessage } from '../../api/client';
import { Listing, Claim } from '../../types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { PostListingModal } from './PostListingModal';
import {
  PlusCircle,
  Clock,
  MapPin,
  CheckCircle2,
  Package,
  AlertCircle,
  Truck,
  RotateCw,
} from 'lucide-react';

export const DonorDashboard: React.FC = () => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [listingsRes, claimsRes] = await Promise.all([
        api.get('/listings/mine'),
        api.get('/claims/mine').catch(() => ({ data: { data: [] } })),
      ]);

      if (listingsRes.data.success) {
        setListings(listingsRes.data.data);
      }
      if (claimsRes.data?.data) {
        setClaims(claimsRes.data.data);
      }
    } catch (err) {
      console.error('Failed to load donor listings', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleConfirmHandoff = async (claimId: string) => {
    setActionLoading(claimId);
    try {
      await api.post(`/claims/${claimId}/complete`);
      await fetchData();
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setActionLoading(null);
    }
  };

  // KPI Calculations
  const totalPostedKg = listings.reduce((sum, l) => sum + Number(l.quantity_kg), 0);
  const activeCount = listings.filter((l) => l.status === 'OPEN').length;
  const claimedCount = listings.filter((l) => l.status === 'CLAIMED' || l.status === 'PICKED_UP').length;
  const completedListings = listings.filter((l) => l.status === 'COMPLETED');
  const completedKg = completedListings.reduce((sum, l) => sum + Number(l.quantity_kg), 0);

  const filteredListings = listings.filter((l) => {
    if (filter === 'ALL') return true;
    return l.status === filter;
  });

  // Map claim by listing_id
  const claimsByListingId: Record<string, Claim> = {};
  claims.forEach((c) => {
    claimsByListingId[c.listing_id] = c;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <Badge variant="green">Open for Rescue</Badge>;
      case 'CLAIMED':
        return <Badge variant="purple">Claimed by NGO</Badge>;
      case 'PICKED_UP':
        return <Badge variant="blue">Picked Up / In Transit</Badge>;
      case 'COMPLETED':
        return <Badge variant="green">Rescue Completed</Badge>;
      case 'EXPIRED':
        return <Badge variant="gray">Expired</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header & Post Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Donor Operations Console
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage surplus food listings, monitor rescue status, and confirm handoffs
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RotateCw className="w-4 h-4 mr-1.5" />
            Refresh
          </Button>
          <Button onClick={() => setIsModalOpen(true)}>
            <PlusCircle className="w-4 h-4 mr-1.5" />
            Post Surplus Food
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-forest-700">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Total Surplus Posted
          </p>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">
            {totalPostedKg.toLocaleString()} <span className="text-sm font-normal text-slate-500">kg</span>
          </p>
        </Card>

        <Card className="border-l-4 border-l-emerald-600">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Rescued & Delivered
          </p>
          <p className="text-2xl font-extrabold text-emerald-700 mt-1">
            {completedKg.toLocaleString()} <span className="text-sm font-normal text-slate-500">kg</span>
          </p>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Open Food Listings
          </p>
          <p className="text-2xl font-extrabold text-amber-700 mt-1">
            {activeCount}
          </p>
        </Card>

        <Card className="border-l-4 border-l-purple-600">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            In Progress Claims
          </p>
          <p className="text-2xl font-extrabold text-purple-700 mt-1">
            {claimedCount}
          </p>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-3 overflow-x-auto text-xs font-medium">
        {['ALL', 'OPEN', 'CLAIMED', 'PICKED_UP', 'COMPLETED', 'EXPIRED'].map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
              filter === tab
                ? 'bg-forest-800 text-white font-semibold'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {tab.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Listings Stream */}
      {loading ? (
        <div className="py-16 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-forest-800 mx-auto" />
          <p className="text-xs text-slate-500 mt-2">Loading your listings...</p>
        </div>
      ) : filteredListings.length === 0 ? (
        <Card className="text-center py-12 space-y-3">
          <Package className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-base font-semibold text-slate-800">No surplus listings found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {filter === 'ALL'
              ? 'You have not posted any food donations yet. Click below to create your first listing.'
              : `No listings with status "${filter}".`}
          </p>
          <Button onClick={() => setIsModalOpen(true)} size="sm">
            Post Surplus Food
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredListings.map((listing) => {
            const correspondingClaim = claimsByListingId[listing.id];
            const safeUntilDate = new Date(listing.safe_until);
            const isExpiringSoon = safeUntilDate.getTime() - Date.now() < 2 * 3600 * 1000;

            return (
              <Card key={listing.id} className="flex flex-col justify-between space-y-4">
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-base text-slate-900 leading-snug">
                      {listing.food_type}
                    </h3>
                    {getStatusBadge(listing.status)}
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {listing.description}
                  </p>

                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Food Quantity:</span>
                      <span className="font-bold text-slate-900">{listing.quantity_kg} kg</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Safe Until:</span>
                      <span
                        className={`font-semibold flex items-center ${
                          isExpiringSoon && listing.status === 'OPEN'
                            ? 'text-amber-600'
                            : 'text-slate-700'
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5 mr-1" />
                        {safeUntilDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({safeUntilDate.toLocaleDateString()})
                      </span>
                    </div>

                    {listing.pickup_instructions && (
                      <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                        <span className="font-medium">Instructions: </span>
                        {listing.pickup_instructions}
                      </div>
                    )}
                  </div>

                  {/* Claim Information if Claimed */}
                  {correspondingClaim && (
                    <div className="bg-purple-50 p-2.5 rounded-lg border border-purple-100 text-xs space-y-1 text-purple-900">
                      <div className="flex items-center space-x-1 font-semibold">
                        <Truck className="w-3.5 h-3.5 text-purple-700" />
                        <span>Rescue Partner: {correspondingClaim.ngo_organization_name}</span>
                      </div>
                      <p className="text-[11px] text-purple-700">
                        Phone: {correspondingClaim.ngo_phone || 'Available upon pickup'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Action Button: Confirm Completed Handoff */}
                <div>
                  {listing.status === 'PICKED_UP' && correspondingClaim && (
                    <Button
                      variant="primary"
                      size="sm"
                      className="w-full bg-emerald-700 hover:bg-emerald-800"
                      isLoading={actionLoading === correspondingClaim.id}
                      onClick={() => handleConfirmHandoff(correspondingClaim.id)}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1.5" />
                      Confirm Successful Handoff
                    </Button>
                  )}
                  {listing.status === 'CLAIMED' && (
                    <div className="text-center text-xs text-slate-500 py-1">
                      Awaiting NGO pickup arrival...
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Post Surplus Food Modal */}
      <PostListingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => fetchData()}
      />
    </div>
  );
};
