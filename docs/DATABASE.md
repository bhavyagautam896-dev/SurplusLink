# SurplusLink — Database Architecture & Schema Specification

SurplusLink uses a normalized **PostgreSQL** database architecture with custom spatial math functions, check constraints, foreign keys, and concurrency-safe transactions.

---

## 1. Relational Schema Representation

```text
+------------------+         +------------------+
|      users       |         |      donors      |
+------------------+         +------------------+
| id (PK)          |<---+    | id (PK)          |
| email (UQ)       |    +----| user_id (FK, UQ) |
| password_hash    |         | organization_name|
| role             |         | contact_phone    |
| created_at       |         | address, city    |
| updated_at       |         | latitude         |
+------------------+         | longitude        |
         ^                   | created_at       |
         |                   +------------------+
         |                             ^
         |                             |
+------------------+                   | 1
|       ngos       |                   |
+------------------+                   | M
| id (PK)          |         +------------------+
| user_id (FK, UQ) |         |     listings     |
| organization_name|         +------------------+
| contact_phone    |         | id (PK)          |
| address, city    |         | donor_id (FK)    |
| latitude         |         | food_type        |
| longitude        |         | description      |
| capacity_kg      |         | quantity_kg      |
| service_radius_km|         | latitude         |
| is_accepting     |         | longitude        |
| created_at       |         | safe_until       |
| updated_at       |         | pickup_instr...  |
+------------------+         | status           |
         ^                   | created_at       |
         |                   | updated_at       |
         |                   +------------------+
         |                             ^
         | 1                           | 1
         |                             |
         | M                           | M
+-----------------------------------------------+
|                    claims                     |
+-----------------------------------------------+
| id (PK)                                       |
| listing_id (FK)                               |
| ngo_id (FK)                                   |
| claimed_at                                    |
| distance_km                                   |
| estimated_travel_minutes                       |
| status ('CLAIMED', 'PICKED_UP', 'COMPLETED')  |
| picked_up_at                                  |
| completed_at                                  |
+-----------------------------------------------+
```

---

## 2. Table Specifications

### 2.1 `users`
Stores authentication credentials and high-level role authorization.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Unique user identifier |
| `email` | `VARCHAR(255)` | `UNIQUE NOT NULL` | Login email address |
| `password_hash` | `VARCHAR(255)` | `NOT NULL` | bcrypt password hash |
| `role` | `VARCHAR(20)` | `NOT NULL CHECK (role IN ('DONOR', 'NGO', 'ADMIN'))` | Role-based permission tier |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | Record creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | Record update timestamp |

---

### 2.2 `donors`
Stores organizational details for commercial and institutional food donors.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Unique donor profile ID |
| `user_id` | `UUID` | `NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE` | Associated login account |
| `organization_name` | `VARCHAR(255)` | `NOT NULL` | Restaurant or catering brand name |
| `contact_phone` | `VARCHAR(50)` | `NOT NULL` | Phone for logistics contact |
| `address` | `TEXT` | `NOT NULL` | Physical premises address |
| `city` | `VARCHAR(100)` | `NOT NULL` | Registered operational city |
| `latitude` | `NUMERIC(10, 7)` | `NOT NULL CHECK (latitude >= -90 AND latitude <= 90)` | WGS84 latitude coordinate |
| `longitude` | `NUMERIC(10, 7)` | `NOT NULL CHECK (longitude >= -180 AND longitude <= 180)` | WGS84 longitude coordinate |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | Profile creation timestamp |

---

### 2.3 `ngos`
Stores operational limits and fleet capabilities for charitable rescue networks.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Unique NGO profile ID |
| `user_id` | `UUID` | `NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE` | Associated login account |
| `organization_name` | `VARCHAR(255)` | `NOT NULL` | Registered charity / foundation name |
| `contact_phone` | `VARCHAR(50)` | `NOT NULL` | Contact number for pickup dispatch |
| `address` | `TEXT` | `NOT NULL` | Distribution depot or shelter address |
| `city` | `VARCHAR(100)` | `NOT NULL` | Operational city |
| `latitude` | `NUMERIC(10, 7)` | `NOT NULL CHECK (latitude >= -90 AND latitude <= 90)` | Fleet depot latitude |
| `longitude` | `NUMERIC(10, 7)` | `NOT NULL CHECK (longitude >= -180 AND longitude <= 180)` | Fleet depot longitude |
| `capacity_kg` | `NUMERIC(10, 2)` | `NOT NULL CHECK (capacity_kg > 0)` | Maximum single pickup weight (kg) |
| `service_radius_km` | `NUMERIC(10, 2)` | `NOT NULL CHECK (service_radius_km > 0)` | Maximum fleet dispatch radius (km) |
| `is_accepting` | `BOOLEAN` | `NOT NULL DEFAULT TRUE` | Active accepting status flag |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | Creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | Profile update timestamp |

---

### 2.4 `listings`
Stores surplus food postings generated by donors.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Unique listing ID |
| `donor_id` | `UUID` | `NOT NULL REFERENCES donors(id) ON DELETE RESTRICT` | Publishing donor |
| `food_type` | `VARCHAR(100)` | `NOT NULL` | Food classification / category |
| `description` | `TEXT` | `NOT NULL` | Preparation & food item details |
| `quantity_kg` | `NUMERIC(10, 2)` | `NOT NULL CHECK (quantity_kg > 0)` | Total weight in kilograms |
| `latitude` | `NUMERIC(10, 7)` | `NOT NULL CHECK (latitude >= -90 AND latitude <= 90)` | Pickup location latitude |
| `longitude` | `NUMERIC(10, 7)` | `NOT NULL CHECK (longitude >= -180 AND longitude <= 180)` | Pickup location longitude |
| `safe_until` | `TIMESTAMPTZ` | `NOT NULL` | Absolute food safety expiration deadline |
| `pickup_instructions`| `TEXT` | `NULL` | Loading dock notes or vessel requirements |
| `status` | `VARCHAR(20)` | `NOT NULL DEFAULT 'OPEN' CHECK (...)` | `OPEN`, `CLAIMED`, `PICKED_UP`, `COMPLETED`, `EXPIRED`, `CANCELLED` |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | Timestamp posted |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | Status update timestamp |

---

### 2.5 `claims`
Stores transactional claims, distance records, and lifecycle transitions.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Unique claim identifier |
| `listing_id` | `UUID` | `NOT NULL REFERENCES listings(id) ON DELETE RESTRICT` | Associated food listing |
| `ngo_id` | `UUID` | `NOT NULL REFERENCES ngos(id) ON DELETE RESTRICT` | Claiming rescue organization |
| `claimed_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | Claim execution timestamp |
| `distance_km` | `NUMERIC(10, 3)` | `NOT NULL` | Haversine distance between NGO and Donor |
| `estimated_travel_minutes` | `NUMERIC(10, 2)` | `NOT NULL` | Estimated transit time |
| `status` | `VARCHAR(20)` | `NOT NULL DEFAULT 'CLAIMED' CHECK (...)` | `CLAIMED`, `PICKED_UP`, `COMPLETED`, `CANCELLED` |
| `picked_up_at`| `TIMESTAMPTZ` | `NULL` | Time vehicle picked up food |
| `completed_at`| `TIMESTAMPTZ` | `NULL` | Time donor confirmed handoff |

---

## 3. Database-Level Concurrency Control

### Partial Unique Index
To guarantee that a food listing cannot have more than one active claim under high concurrency, SurplusLink enforces a database partial unique index:

```sql
CREATE UNIQUE INDEX idx_unique_active_claim_per_listing 
ON claims(listing_id) 
WHERE status IN ('CLAIMED', 'PICKED_UP');
```

If two transactions simultaneously try to insert a claim row for the same listing, PostgreSQL rejects the second insertion with error code `23505` (unique constraint violation).

### Atomic Conditional Update
```sql
UPDATE listings
SET status = 'CLAIMED',
    updated_at = NOW()
WHERE id = $1
  AND status = 'OPEN'
  AND safe_until > $2
RETURNING *;
```
If `$2` (backend clock) is greater than `safe_until` or `status != 'OPEN'`, zero rows are updated, and the transaction is safely aborted via `ROLLBACK`.

---

## 4. PostgreSQL Haversine Function

SurplusLink computes real great-circle distance inside PostgreSQL using native math functions ($R = 6371.0088\text{ km}$):

```sql
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
```

---

## 5. Performance Indexing Strategy

- `idx_listings_status_safe_until` — Composite index for filtering active listings (`status = 'OPEN' AND safe_until > NOW()`).
- `idx_listings_donor_id` — Fast retrieval of a donor's listing history.
- `idx_claims_listing_id` — Fast join between claims and listings.
- `idx_claims_ngo_id` — Fast query for NGO claim history.
- `idx_listings_coords` / `idx_ngos_coords` — Spatial index for Haversine distance computation.
- `idx_ngos_accepting` — Immediate filter for NGOs ready to receive donations.
