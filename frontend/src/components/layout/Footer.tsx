import React from 'react';
import { UtensilsCrossed, ShieldAlert, HeartHandshake } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center space-x-2 text-white mb-3">
              <div className="w-8 h-8 rounded-lg bg-forest-700 flex items-center justify-center">
                <UtensilsCrossed className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold">SurplusLink</span>
            </div>
            <p className="text-sm text-slate-400 max-w-sm mb-4 leading-relaxed">
              Bridging the gap between food abundance and hunger through
              expiry-window-aware geographical matching, atomic claim transactions, and
              unmatched-surplus hotspot analytics.
            </p>
            <div className="flex items-center space-x-2 text-xs text-forest-400 font-medium">
              <HeartHandshake className="w-4 h-4" />
              <span>Developed for 5th-Semester TPDS-III Project (Computer Science)</span>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">
              Platform Features
            </h4>
            <ul className="space-y-2 text-sm">
              <li>Geographical Haversine Matching</li>
              <li>Travel Time & Expiry Feasibility</li>
              <li>Atomic Claim Concurrency Protection</li>
              <li>Pickup & Completion Lifecycle</li>
              <li>Unmatched Hotspot Analytics</li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">
              Food Safety & Policy
            </h4>
            <div className="p-3 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs leading-relaxed text-slate-300">
              <div className="flex items-center space-x-1 text-amber-400 font-semibold mb-1">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Notice</span>
              </div>
              Donors remain responsible for ensuring surplus food is fresh, safely handled,
              and suitable for redistribution.
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500">
          <p>© 2026 SurplusLink Platform. Open Academic Source.</p>
          <p className="mt-2 sm:mt-0">OpenStreetMap contributors | PostgreSQL Neon Powered</p>
        </div>
      </div>
    </footer>
  );
};

