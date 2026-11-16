import React, { useState, useEffect } from 'react';
import { api, getErrorMessage } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { Claim } from '../../types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import {
  PackageCheck,
  Truck,
  CheckCircle2,
  Clock,
  RotateCw,
  Building2,
  Users2,
  MapPin,
} from 'lucide-react';

export const ClaimsPage: React.FC = () => {
  const { user } = useAuth();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'ACTIVE' | 'PICKED_UP' | 'COMPLETED'>('ACTIVE');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchClaims = async () => {
    setLoading(true);
    try {
      const res = await api.get('/claims/mine');
      if (res.data.success) {
        setClaims(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load claims', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaims();
  }, []);

  const handleMarkPickup = async (claimId: string) => {
    setActionLoading(claimId);
    try {
      await api.post(`/claims/${claimId}/pickup`);
      await fetchClaims();
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmCompleted = async (claimId: string) => {
    setActionLoading(claimId);
    try {
      await api.post(`/claims/${claimId}/complete`);
      await fetchClaims();
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setActionLoading(null);
    }
  };

  const filteredClaims = claims.filter((c) => {
    if (tab === 'ACTIVE') return c.status === 'CLAIMED';
    if (tab === 'PICKED_UP') return c.status === 'PICKED_UP';
    if (tab === 'COMPLETED') return c.status === 'COMPLETED';
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Food Rescue Lifecycle & Claims
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Track pickup dispatch, transit status, and confirm successful handoffs
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchClaims}>
          <RotateCw className="w-4 h-4 mr-1.5" />
          Refresh Claims
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setTab('ACTIVE')}
          className={`flex items-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
            tab === 'ACTIVE'
              ? 'bg-forest-800 text-white'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Active Claims ({claims.filter((c) => c.status === 'CLAIMED').length})</span>
        </button>

        <button
          onClick={() => setTab('PICKED_UP')}
          className={`flex items-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
            tab === 'PICKED_UP'
              ? 'bg-blue-700 text-white'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <PackageCheck className="w-4 h-4" />
          <span>In Transit / Picked Up ({claims.filter((c) => c.status === 'PICKED_UP').length})</span>
        </button>

        <button
          onClick={() => setTab('COMPLETED')}
          className={`flex items-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
            tab === 'COMPLETED'
              ? 'bg-emerald-700 text-white'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Completed Rescues ({claims.filter((c) => c.status === 'COMPLETED').length})</span>
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-forest-800 mx-auto" />
          <p className="text-xs text-slate-500 mt-2">Loading rescue claims...</p>
        </div>
      ) : filteredClaims.length === 0 ? (
        <Card className="text-center py-16 space-y-3">
          <Truck className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-base font-semibold text-slate-800">No claims in this status</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {tab === 'ACTIVE'
              ? 'No active claims awaiting pickup.'
              : tab === 'PICKED_UP'
              ? 'No vehicles currently in transit.'
              : 'No completed rescues recorded yet.'}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredClaims.map((claim) => (
            <Card key={claim.id} className="flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-base text-slate-900 leading-snug">
                    {claim.food_type}
                  </h3>
                  <Badge
                    variant={
                      claim.status === 'COMPLETED'
                        ? 'green'
                        : claim.status === 'PICKED_UP'
                        ? 'blue'
                        : 'purple'
                    }
                  >
                    {claim.status}
                  </Badge>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Food Quantity:</span>
                    <span className="font-bold text-slate-900">{claim.quantity_kg} kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Transit Distance:</span>
                    <span className="font-bold text-slate-900">{claim.distance_km} km</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Claimed At:</span>
                    <span className="font-medium text-slate-700">
                      {new Date(claim.claimed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })},{' '}
                      {new Date(claim.claimed_at).toLocaleDateString()}
                    </span>
                  </div>
                  {claim.picked_up_at && (
                    <div className="flex justify-between text-blue-700 font-medium">
                      <span>Picked Up At:</span>
                      <span>{new Date(claim.picked_up_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  )}
                  {claim.completed_at && (
                    <div className="flex justify-between text-emerald-700 font-medium">
                      <span>Completed At:</span>
                      <span>{new Date(claim.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  )}
                </div>

                {/* Organization Details */}
                <div className="space-y-1 text-xs text-slate-600 border-t border-slate-100 pt-2">
                  {claim.donor_organization_name && (
                    <div className="flex items-center space-x-1.5">
                      <Building2 className="w-3.5 h-3.5 text-forest-700 shrink-0" />
                      <span>Donor: <strong>{claim.donor_organization_name}</strong></span>
                    </div>
                  )}
                  {claim.ngo_organization_name && (
                    <div className="flex items-center space-x-1.5">
                      <Users2 className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                      <span>NGO: <strong>{claim.ngo_organization_name}</strong></span>
                    </div>
                  )}
                  {claim.donor_address && (
                    <p className="text-[11px] text-slate-500 pl-5">
                      Address: {claim.donor_address}
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-100">
                {user?.role === 'NGO' && claim.status === 'CLAIMED' && (
                  <Button
                    size="sm"
                    className="w-full bg-blue-700 hover:bg-blue-800"
                    isLoading={actionLoading === claim.id}
                    onClick={() => handleMarkPickup(claim.id)}
                  >
                    <Truck className="w-4 h-4 mr-1.5" />
                    Mark Food as Picked Up
                  </Button>
                )}

                {user?.role === 'DONOR' && claim.status === 'PICKED_UP' && (
                  <Button
                    size="sm"
                    className="w-full bg-emerald-700 hover:bg-emerald-800"
                    isLoading={actionLoading === claim.id}
                    onClick={() => handleConfirmCompleted(claim.id)}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                    Confirm Completed Handoff
                  </Button>
                )}

                {claim.status === 'COMPLETED' && (
                  <div className="text-center text-xs text-emerald-700 font-semibold py-1 flex items-center justify-center space-x-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Food Successfully Rescued</span>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
