import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { OverviewMetrics, MapLayersData } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { SurplusMap } from '../../components/maps/SurplusMap';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  Flame,
  CheckCircle2,
  Package,
  Users2,
  Clock,
  RotateCw,
  MapPin,
  Building2,
  BarChart3,
} from 'lucide-react';

const COLORS = ['#15803d', '#3b82f6', '#f59e0b', '#ef4444', '#94a3b8'];

export const AnalyticsPage: React.FC = () => {
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null);
  const [mapData, setMapData] = useState<MapLayersData | null>(null);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [claimTimeData, setClaimTimeData] = useState<any>(null);
  const [matchingData, setMatchingData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const [overviewRes, mapRes, trendRes, claimTimesRes, matchingRes] = await Promise.all([
        api.get('/analytics/overview'),
        api.get('/analytics/map'),
        api.get('/analytics/rescued-trend'),
        api.get('/analytics/claim-times'),
        api.get('/analytics/matching'),
      ]);

      if (overviewRes.data.success) setMetrics(overviewRes.data.data);
      if (mapRes.data.success) setMapData(mapRes.data.data);
      if (trendRes.data.success) setTrendData(trendRes.data.data);
      if (claimTimesRes.data.success) setClaimTimeData(claimTimesRes.data.data);
      if (matchingRes.data.success) setMatchingData(matchingRes.data.data);
    } catch (err) {
      console.error('Failed to load analytics', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const pieData = matchingData
    ? [
        { name: 'Completed Rescue', value: matchingData.completedCount },
        { name: 'Claimed / In-Transit', value: matchingData.claimedCount },
        { name: 'Open (Eligible Match)', value: matchingData.openMatchedCount },
        { name: 'Unmatched Hotspots', value: matchingData.openUnmatchedCount },
        { name: 'Expired', value: matchingData.expiredCount },
      ]
    : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Logistics & Hotspot Analytics Platform
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time PostgreSQL spatial queries, Haversine matching efficiency, and geographical coverage gaps
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAnalytics}>
          <RotateCw className="w-4 h-4 mr-1.5" />
          Refresh Live Metrics
        </Button>
      </div>

      {/* KPI Cards */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="border-t-4 border-t-forest-700 p-4">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Food Rescued
            </span>
            <span className="text-2xl font-extrabold text-forest-800 mt-1 block">
              {metrics.totalRescuedKg.toLocaleString()} <span className="text-xs font-normal text-slate-500">kg</span>
            </span>
            <span className="text-[11px] text-emerald-600 font-medium">Completed pickups</span>
          </Card>

          <Card className="border-t-4 border-t-emerald-500 p-4">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Matching Rate
            </span>
            <span className="text-2xl font-extrabold text-emerald-700 mt-1 block">
              {metrics.matchingRatePercentage}%
            </span>
            <span className="text-[11px] text-slate-500">Of non-cancelled surplus</span>
          </Card>

          <Card className="border-t-4 border-t-rose-600 p-4">
            <span className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider block">
              Unmatched Surplus
            </span>
            <span className="text-2xl font-extrabold text-rose-600 mt-1 block">
              {metrics.totalUnmatchedKg.toLocaleString()} <span className="text-xs font-normal text-slate-500">kg</span>
            </span>
            <span className="text-[11px] text-rose-600 font-medium">No eligible NGO available</span>
          </Card>

          <Card className="border-t-4 border-t-blue-600 p-4">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Active Listings
            </span>
            <span className="text-2xl font-extrabold text-blue-700 mt-1 block">
              {metrics.totalActiveListings}
            </span>
            <span className="text-[11px] text-slate-500">Currently open & safe</span>
          </Card>

          <Card className="border-t-4 border-t-purple-600 p-4">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Completed Pickups
            </span>
            <span className="text-2xl font-extrabold text-purple-700 mt-1 block">
              {metrics.totalCompletedPickups}
            </span>
            <span className="text-[11px] text-slate-500">Delivered to beneficiaries</span>
          </Card>

          <Card className="border-t-4 border-t-amber-500 p-4">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Active NGOs
            </span>
            <span className="text-2xl font-extrabold text-amber-700 mt-1 block">
              {metrics.totalNgos}
            </span>
            <span className="text-[11px] text-slate-500">With {metrics.totalDonors} food donors</span>
          </Card>
        </div>
      )}

      {/* Interactive Map Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
              <MapPin className="w-5 h-5 text-forest-700" />
              <span>Interactive Geographical Distribution & Hotspots</span>
            </h2>
            <p className="text-xs text-slate-500">
              Toggle map layers to inspect donors, NGOs, active food, and red unmatched surplus hotspot clusters
            </p>
          </div>
        </div>

        {mapData ? (
          <SurplusMap data={mapData} />
        ) : (
          <div className="h-[400px] rounded-xl bg-slate-100 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-forest-800" />
          </div>
        )}
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Trend Chart */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Weekly Rescued Food Trend (kg)</h3>
              <p className="text-xs text-slate-500">Quantity of food successfully rescued and confirmed per week</p>
            </div>
            <TrendingUp className="w-5 h-5 text-forest-700" />
          </div>

          <div className="h-[260px] w-full">
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', fontSize: '12px' }}
                    formatter={(val: any) => [`${val} kg`, 'Food Rescued']}
                  />
                  <Bar dataKey="rescuedKg" fill="#15803d" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No weekly trend data available yet
              </div>
            )}
          </div>
        </Card>

        {/* Claim Times Distribution Chart */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Claim-Time Speed Distribution</h3>
              <p className="text-xs text-slate-500">
                Average time from post to claim:{' '}
                <strong>{claimTimeData?.averageMinutesToClaim || 0} minutes</strong>
              </p>
            </div>
            <Clock className="w-5 h-5 text-blue-700" />
          </div>

          <div className="h-[260px] w-full">
            {claimTimeData?.distribution && claimTimeData.distribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={claimTimeData.distribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', fontSize: '12px' }}
                    formatter={(val: any) => [`${val} claims`, 'Count']}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No claim timing records available
              </div>
            )}
          </div>
        </Card>

        {/* Matching Distribution Breakdown */}
        <Card className="p-5 space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Listing Lifecycle & Coverage Distribution</h3>
              <p className="text-xs text-slate-500">Categorization across completed, in-transit, open matched, and unmatched hotspots</p>
            </div>
            <BarChart3 className="w-5 h-5 text-forest-700" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: any) => [`${val} listings`, 'Count']} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-2 text-xs">
              {pieData.map((item, idx) => (
                <div key={item.name} className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                  <div className="flex items-center space-x-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                    />
                    <span className="font-medium text-slate-700">{item.name}</span>
                  </div>
                  <span className="font-bold text-slate-900">{item.value} listings</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
