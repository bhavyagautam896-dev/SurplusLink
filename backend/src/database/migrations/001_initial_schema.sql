-- SurplusLink Database Migration 001
-- Initial normalized schema and spatial functions (Pure standard SQL)

-- Haversine Distance Function in PostgreSQL using built-in math functions
-- Earth radius: R = 6371.0088 km
CREATE OR REPLACE FUNCTION haversine_distance(
    lat1 NUMERIC, lon1 NUMERIC,
    lat2 NUMERIC, lon2 NUMERIC
) RETURNS NUMERIC AS $$
    SELECT ROUND(
        (2.0 * 6371.0088 * ASIN(
            SQRT(
                GREATEST(0.0, LEAST(1.0,
                    SIN(RADIANS(lat2 - lat1) / 2.0)^2 +
                    COS(RADIANS(lat1)) * COS(RADIANS(lat2)) * SIN(RADIANS(lon2 - lon1) / 2.0)^2
                ))
            )
        ))::NUMERIC,
        3
    );
$$ LANGUAGE sql IMMUTABLE;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('DONOR', 'NGO', 'ADMIN')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Donors Table
CREATE TABLE IF NOT EXISTS donors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    organization_name VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(50) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    latitude NUMERIC(10, 7) NOT NULL CHECK (latitude >= -90 AND latitude <= 90),
    longitude NUMERIC(10, 7) NOT NULL CHECK (longitude >= -180 AND longitude <= 180),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. NGOs Table
CREATE TABLE IF NOT EXISTS ngos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    organization_name VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(50) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    latitude NUMERIC(10, 7) NOT NULL CHECK (latitude >= -90 AND latitude <= 90),
    longitude NUMERIC(10, 7) NOT NULL CHECK (longitude >= -180 AND longitude <= 180),
    capacity_kg NUMERIC(10, 2) NOT NULL CHECK (capacity_kg > 0),
    service_radius_km NUMERIC(10, 2) NOT NULL CHECK (service_radius_km > 0),
    is_accepting BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Listings Table
CREATE TABLE IF NOT EXISTS listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    donor_id UUID NOT NULL REFERENCES donors(id) ON DELETE RESTRICT,
    food_type VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    quantity_kg NUMERIC(10, 2) NOT NULL CHECK (quantity_kg > 0),
    latitude NUMERIC(10, 7) NOT NULL CHECK (latitude >= -90 AND latitude <= 90),
    longitude NUMERIC(10, 7) NOT NULL CHECK (longitude >= -180 AND longitude <= 180),
    safe_until TIMESTAMPTZ NOT NULL,
    pickup_instructions TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLAIMED', 'PICKED_UP', 'COMPLETED', 'EXPIRED', 'CANCELLED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Claims Table
CREATE TABLE IF NOT EXISTS claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE RESTRICT,
    ngo_id UUID NOT NULL REFERENCES ngos(id) ON DELETE RESTRICT,
    claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    distance_km NUMERIC(10, 3) NOT NULL,
    estimated_travel_minutes NUMERIC(10, 2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'CLAIMED' CHECK (status IN ('CLAIMED', 'PICKED_UP', 'COMPLETED', 'CANCELLED')),
    picked_up_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

-- Database-level Concurrency Constraint:
-- Prevent multiple simultaneously active (CLAIMED or PICKED_UP) claims for the same listing
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_claim_per_listing 
ON claims(listing_id) 
WHERE status IN ('CLAIMED', 'PICKED_UP');

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_donors_user_id ON donors(user_id);
CREATE INDEX IF NOT EXISTS idx_ngos_user_id ON ngos(user_id);
CREATE INDEX IF NOT EXISTS idx_ngos_accepting ON ngos(is_accepting);
CREATE INDEX IF NOT EXISTS idx_listings_donor_id ON listings(donor_id);
CREATE INDEX IF NOT EXISTS idx_listings_status_safe_until ON listings(status, safe_until);
CREATE INDEX IF NOT EXISTS idx_claims_listing_id ON claims(listing_id);
CREATE INDEX IF NOT EXISTS idx_claims_ngo_id ON claims(ngo_id);
CREATE INDEX IF NOT EXISTS idx_claims_status ON claims(status);
CREATE INDEX IF NOT EXISTS idx_listings_coords ON listings(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_ngos_coords ON ngos(latitude, longitude);
