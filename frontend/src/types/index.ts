export type UserRole = 'DONOR' | 'NGO' | 'ADMIN';

export type ListingStatus =
  | 'OPEN'
  | 'CLAIMED'
  | 'PICKED_UP'
  | 'COMPLETED'
  | 'EXPIRED'
  | 'CANCELLED';

export type ClaimStatus =
  | 'CLAIMED'
  | 'PICKED_UP'
  | 'COMPLETED'
  | 'CANCELLED';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  donorId?: string;
  ngoId?: string;
  organizationName?: string;
}

export interface Listing {
  id: string;
  donor_id: string;
  food_type: string;
  description: string;
  quantity_kg: number;
  latitude: number;
  longitude: number;
  safe_until: string;
  pickup_instructions?: string | null;
  status: ListingStatus;
  created_at: string;
  updated_at: string;
  donor_organization_name?: string;
  donor_phone?: string;
  donor_address?: string;
  distance_km?: number;
  estimated_travel_minutes?: number;
  remaining_minutes?: number;
  urgency?: 'URGENT' | 'EXPIRING_SOON' | 'AVAILABLE';
}

export type EligibleListing = Listing & {
  distance_km: number;
  estimated_travel_minutes: number;
  remaining_minutes: number;
  urgency: 'URGENT' | 'EXPIRING_SOON' | 'AVAILABLE';
};

export interface Claim {
  id: string;
  listing_id: string;
  ngo_id: string;
  claimed_at: string;
  distance_km: number;
  estimated_travel_minutes: number;
  status: ClaimStatus;
  picked_up_at?: string | null;
  completed_at?: string | null;
  food_type?: string;
  quantity_kg?: number;
  safe_until?: string;
  ngo_organization_name?: string;
  ngo_phone?: string;
  donor_organization_name?: string;
  donor_address?: string;
  donor_phone?: string;
}

export interface HotspotCluster {
  grid_lat: number;
  grid_lng: number;
  unmatched_count: number;
  total_unmatched_kg: number;
  sample_food_types: string[];
}

export interface OverviewMetrics {
  totalSurplusPostedKg: number;
  totalRescuedKg: number;
  totalActiveListings: number;
  totalCompletedPickups: number;
  totalDonors: number;
  totalNgos: number;
  totalUnmatchedKg: number;
  matchingRatePercentage: number;
}

export interface MapLayersData {
  donors: Array<{
    id: string;
    organization_name: string;
    contact_phone: string;
    address: string;
    latitude: number;
    longitude: number;
  }>;
  ngos: Array<{
    id: string;
    organization_name: string;
    contact_phone: string;
    address: string;
    latitude: number;
    longitude: number;
    capacity_kg: number;
    service_radius_km: number;
    is_accepting: boolean;
  }>;
  activeListings: Array<{
    id: string;
    food_type: string;
    quantity_kg: number;
    latitude: number;
    longitude: number;
    safe_until: string;
    status: string;
    donor_name: string;
  }>;
  claimedListings: Array<{
    id: string;
    food_type: string;
    quantity_kg: number;
    latitude: number;
    longitude: number;
    status: string;
    donor_name: string;
    ngo_name: string;
  }>;
  hotspots: HotspotCluster[];
}
