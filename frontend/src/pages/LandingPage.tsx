import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { OverviewMetrics } from '../types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import {
  UtensilsCrossed,
  MapPin,
  Clock,
  ShieldCheck,
  TrendingUp,
  ArrowRight,
  Flame,
  CheckCircle2,
  Users2,
  Building2,
  AlertTriangle,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null);

  useEffect(() => {
    api.get('/analytics/overview')
      .then((res) => {
        if (res.data.success) {
          setMetrics(res.data.data);
        }
      })
      .catch((err) => console.error('Failed to load metrics', err));
  }, []);

  return (
    <div className="space-y-20 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-forest-50/70 via-white to-slate-50 pt-16 pb-20 border-b border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-forest-100 text-forest-800 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-forest-600 animate-pulse"></span>
              <span>5th-Semester TPDS-III Project • Sustainability & Logistics</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-tight">
              Surplus Food Matching & <br className="hidden sm:inline" />
              <span className="text-forest-700">Hotspot Analytics</span>
            </h1>

            <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
              An intelligent, transactional food redistribution platform connecting restaurants,
              banquets, and hotels with verified NGOs through expiry-aware geographical matching.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link to="/register">
                <Button size="lg" className="w-full sm:w-auto shadow-md">
                  Join as Donor or NGO
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
              <Link to="/analytics">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  View Hotspot Analytics
                </Button>
              </Link>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          {metrics && (
            <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
              <Card className="text-center py-4 bg-white/80 backdrop-blur">
                <p className="text-2xl sm:text-3xl font-extrabold text-forest-800">
                  {metrics.totalRescuedKg.toLocaleString()} kg
                </p>
                <p className="text-xs font-medium text-slate-500 mt-1">Surplus Food Rescued</p>
              </Card>

              <Card className="text-center py-4 bg-white/80 backdrop-blur">
                <p className="text-2xl sm:text-3xl font-extrabold text-forest-800">
                  {metrics.matchingRatePercentage}%
                </p>
                <p className="text-xs font-medium text-slate-500 mt-1">Matching Success Rate</p>
              </Card>

              <Card className="text-center py-4 bg-white/80 backdrop-blur">
                <p className="text-2xl sm:text-3xl font-extrabold text-forest-800">
                  {metrics.totalDonors + metrics.totalNgos}
                </p>
                <p className="text-xs font-medium text-slate-500 mt-1">Registered Organizations</p>
              </Card>

              <Card className="text-center py-4 bg-white/80 backdrop-blur">
                <p className="text-2xl sm:text-3xl font-extrabold text-amber-600">
                  {metrics.totalUnmatchedKg.toLocaleString()} kg
                </p>
                <p className="text-xs font-medium text-slate-500 mt-1">Unmatched Food Detected</p>
              </Card>
            </div>
          )}
        </div>
      </section>

      {/* The Problem Statement vs SurplusLink Solution */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="space-y-4">
            <span className="text-xs font-bold text-forest-700 uppercase tracking-wider">
              The Real-World Dilemma
            </span>
            <h2 className="text-3xl font-bold text-slate-900 leading-snug">
              Why informal food redistribution fails everyday
            </h2>
            <p className="text-slate-600 leading-relaxed text-sm">
              Restaurants and caterers often produce hundreds of kilograms of clean, untouched cooked food.
              Coordination through WhatsApp groups and phone calls leads to recurring bottlenecks:
            </p>

            <ul className="space-y-3 pt-2 text-sm text-slate-700">
              <li className="flex items-start space-x-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <span><strong>No proximity awareness:</strong> Donors do not know which NGOs are within practical pickup distance.</span>
              </li>
              <li className="flex items-start space-x-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <span><strong>Perishability race:</strong> Food expires before rescue can be coordinated, leading to avoidable disposal.</span>
              </li>
              <li className="flex items-start space-x-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <span><strong>Double-claim conflicts:</strong> Multiple NGOs arrive at the same kitchen due to uncoordinated claims.</span>
              </li>
              <li className="flex items-start space-x-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <span><strong>Invisible desert zones:</strong> No data exists on areas where food surplus regularly goes uncollected.</span>
              </li>
            </ul>
          </div>

          <div className="bg-forest-900 text-white rounded-2xl p-8 shadow-xl space-y-6">
            <div className="flex items-center space-x-2 text-forest-300 text-sm font-semibold">
              <ShieldCheck className="w-5 h-5" />
              <span>The SurplusLink Engineering Solution</span>
            </div>

            <h3 className="text-2xl font-bold leading-snug">
              Algorithmic matching with PostgreSQL transactional concurrency
            </h3>

            <div className="space-y-4 text-sm text-forest-100/90 leading-relaxed">
              <div className="p-3.5 rounded-xl bg-forest-800/80 border border-forest-700/60">
                <strong className="text-white block mb-0.5">1. Haversine Spatial Filtering</strong>
                Calculates great-circle distance directly in PostgreSQL using Earth's mean radius (R = 6371.0088 km).
              </div>
              <div className="p-3.5 rounded-xl bg-forest-800/80 border border-forest-700/60">
                <strong className="text-white block mb-0.5">2. Expiry-Window Travel Feasibility</strong>
                Rejects matches if travel time + buffer exceeds safe consumption deadline.
              </div>
              <div className="p-3.5 rounded-xl bg-forest-800/80 border border-forest-700/60">
                <strong className="text-white block mb-0.5">3. Atomic Claim Transactions</strong>
                Row-level locking and partial unique indexing prevent duplicate claims across 50+ concurrent requests.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Two Original Scientific Contributions */}
      <section className="bg-slate-100 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl font-bold text-slate-900">
              Two Primary Academic Contributions
            </h2>
            <p className="text-slate-600 text-sm mt-2">
              Going beyond basic CRUD to solve physical logistics and geographical coverage challenges.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="p-7 border-t-4 border-t-forest-700 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-forest-100 text-forest-800 flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">
                A. Expiry-Window-Aware Geographical Matching
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Conventional proximity feeds only check geographic distance. SurplusLink factors in
                road detour coefficients (1.25x), vehicle velocity (20 km/h), vehicle pickup capacity (kg),
                and food safe-until timestamps. If estimated travel time causes arrival past safe consumption,
                the listing is automatically disqualified.
              </p>
            </Card>

            <Card className="p-7 border-t-4 border-t-rose-600 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center">
                <Flame className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">
                B. Unmatched-Surplus Hotspot Analytics
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Identifies open surplus food listings for which no active, eligible NGO exists within
                safe reach. Aggregates these stranded listings into spatial grid clusters to generate
                unmatched-surplus heatmaps, giving civic bodies and charities actionable data on where
                new rescue coverage is required.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="max-w-5xl mx-auto px-4 text-center space-y-6">
        <h2 className="text-3xl font-bold text-slate-900">Ready to test SurplusLink?</h2>
        <p className="text-slate-600 max-w-xl mx-auto text-sm">
          Use the pre-configured demo credentials to sign in immediately as a Donor, NGO, or Administrator.
        </p>
        <div className="flex justify-center gap-4">
          <Link to="/login">
            <Button size="lg">Log In with Demo Accounts</Button>
          </Link>
          <Link to="/analytics">
            <Button variant="outline" size="lg">Explore Analytics Map</Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

