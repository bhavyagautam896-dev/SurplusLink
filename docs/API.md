# SurplusLink — REST API Documentation

This document provides complete documentation for the SurplusLink backend REST APIs, including endpoint routes, methods, authentication requirements, input schemas, response bodies, and error codes.

---

## Base URL
- **Local Development:** `http://localhost:5000/api`
- **Docker Production:** `http://localhost:3000/api` (Proxied via Nginx)

---

## Authentication Mechanism
SurplusLink uses JSON Web Tokens (JWT). The token is automatically attached as an HTTP-only cookie (`token`), and can also be passed via the `Authorization: Bearer <token>` header.

### User Roles
- `DONOR` — Food donors (restaurants, caterers, hotels, banquet halls).
- `NGO` — Food rescue organizations and charitable trusts.
- `ADMIN` — Administrative platform oversight.

---

## 1. Authentication Endpoints

### 1.1 Register Account
Registers a new Food Donor or Rescue NGO organization.

- **URL:** `POST /api/auth/register`
- **Auth Required:** No (Public)
- **Request Body (DONOR):**
```json
{
  "email": "donor@example.com",
  "password": "StrongPassword123",
  "role": "DONOR",
  "organizationName": "Grand Orange Banquet",
  "contactPhone": "+91 98230 12345",
  "address": "45 Central Avenue",
  "city": "Nagpur",
  "latitude": 21.1458,
  "longitude": 79.0882
}
```
- **Request Body (NGO):**
```json
{
  "email": "ngo@example.com",
  "password": "StrongPassword123",
  "role": "NGO",
  "organizationName": "Roti Bank Relief Foundation",
  "contactPhone": "+91 94221 54321",
  "address": "12 Civil Lines",
  "city": "Nagpur",
  "latitude": 21.1510,
  "longitude": 79.0680,
  "capacityKg": 100,
  "serviceRadiusKm": 15,
  "isAccepting": true
}
```
- **Success Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "c6114eb9-4081-4f9e-bc88-9ca48316dfa1",
      "email": "donor@example.com",
      "role": "DONOR",
      "donorId": "d35a9f24-2c1b-4394-bb9f-ef5b7db57d77",
      "organizationName": "Grand Orange Banquet"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### 1.2 User Login
Authenticates an existing user and returns JWT token and user profile.

- **URL:** `POST /api/auth/login`
- **Auth Required:** No
- **Request Body:**
```json
{
  "email": "donor@surpluslink.org",
  "password": "Donor@123"
}
```
- **Success Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "c6114eb9-4081-4f9e-bc88-9ca48316dfa1",
      "email": "donor@surpluslink.org",
      "role": "DONOR",
      "donorId": "d35a9f24-2c1b-4394-bb9f-ef5b7db57d77",
      "organizationName": "Grand Orange Banquet"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```
- **Error Response:** `401 Unauthorized` (`{"success": false, "error": "Invalid email or password"}`)

---

### 1.3 User Logout
Clears the HTTP-only authentication cookie.

- **URL:** `POST /api/auth/logout`
- **Auth Required:** No
- **Success Response:** `200 OK`

---

### 1.4 Get Current User Profile
Retrieves authenticated user details, role, and organization references.

- **URL:** `GET /api/auth/me`
- **Auth Required:** Yes (`DONOR`, `NGO`, or `ADMIN`)
- **Success Response:** `200 OK`

---

## 2. Food Listings Endpoints

### 2.1 Post Surplus Food
Creates a new surplus food donation.

- **URL:** `POST /api/listings`
- **Auth Required:** Yes (`DONOR` only)
- **Request Body:**
```json
{
  "foodType": "Cooked Rice & Dal",
  "description": "50 kg hot steamed rice with yellow tadka dal prepared for wedding banquet.",
  "quantityKg": 50,
  "latitude": 21.1458,
  "longitude": 79.0882,
  "safeUntil": "2026-11-16T22:30:00.000Z",
  "pickupInstructions": "Bring food-grade insulated transport tubs to rear loading bay."
}
```
- **Success Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "e44d2d48-3a9a-41d6-848e-d98b17b6ec75",
    "donor_id": "d35a9f24-2c1b-4394-bb9f-ef5b7db57d77",
    "food_type": "Cooked Rice & Dal",
    "quantity_kg": 50,
    "status": "OPEN",
    "safe_until": "2026-11-16T22:30:00.000Z",
    "created_at": "2026-11-16T18:00:00.000Z"
  }
}
```
- **Error Responses:**
  - `400 Bad Request` — Non-positive quantity, past safe-until time, or invalid coordinates.
  - `403 Forbidden` — User role is not DONOR.

---

### 2.2 Get Donor Listings
Returns all surplus food listings created by the authenticated donor.

- **URL:** `GET /api/listings/mine`
- **Auth Required:** Yes (`DONOR` only)
- **Success Response:** `200 OK` (Array of listing objects with status)

---

### 2.3 Get Nearby Eligible Listings (Matching Feed)
Returns surplus food listings filtered by proximity, travel time feasibility, NGO capacity, and expiry window.

- **URL:** `GET /api/listings/nearby`
- **Auth Required:** Yes (`NGO` only)
- **Query Parameters:**
  - `radiusKm` *(optional, number)* — Search radius in km (cannot exceed NGO service radius).
  - `foodType` *(optional, string)* — Case-insensitive filter (e.g. `Cooked`, `Bakery`).
  - `minQuantity` *(optional, number)* — Minimum quantity in kg.
  - `maxQuantity` *(optional, number)* — Maximum quantity in kg.
  - `sortBy` *(optional, string)* — `urgency` (default), `distance`, `earliestSafeUntil`, `quantity`.
  - `sortOrder` *(optional, string)* — `asc` (default) or `desc`.
- **Success Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "e44d2d48-3a9a-41d6-848e-d98b17b6ec75",
      "donor_organization_name": "Grand Orange Banquet",
      "food_type": "Cooked Rice & Dal",
      "description": "50 kg hot steamed rice with yellow dal...",
      "quantity_kg": 50,
      "distance_km": 3.42,
      "estimated_travel_minutes": 12.8,
      "remaining_minutes": 270,
      "urgency": "AVAILABLE",
      "safe_until": "2026-11-16T22:30:00.000Z",
      "status": "OPEN"
    }
  ]
}
```

---

### 2.4 Get Listing by ID
- **URL:** `GET /api/listings/:id`
- **Auth Required:** No (Public inspection)
- **Success Response:** `200 OK`

---

### 2.5 Update Listing
Allows a donor to modify an OPEN, uncompleted listing.

- **URL:** `PATCH /api/listings/:id`
- **Auth Required:** Yes (`DONOR` only, owner)
- **Success Response:** `200 OK`
- **Error Response:** `400 Bad Request` if listing status is not `OPEN`.

---

## 3. Atomic Claiming and Pickup Lifecycle

### 3.1 Claim Listing (Atomic Concurrency Protection)
An NGO claims an available surplus food listing.

- **URL:** `POST /api/listings/:id/claim`
- **Auth Required:** Yes (`NGO` only)
- **Success Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "7b89f816-5e5d-4f81-a7b5-00c7e29b1d5c",
    "listing_id": "e44d2d48-3a9a-41d6-848e-d98b17b6ec75",
    "ngo_id": "f85c18e4-8a42-4752-9b5a-ec2658e3789a",
    "claimed_at": "2026-11-16T18:15:00.000Z",
    "distance_km": 3.42,
    "estimated_travel_minutes": 12.8,
    "status": "CLAIMED"
  }
}
```
- **Error Responses:**
  - `409 Conflict` — Listing already claimed by another NGO.
  - `400 Bad Request` — Travel time exceeds safe window, or listing quantity exceeds NGO capacity.

---

### 3.2 Mark Pickup Arrival
Claiming NGO marks that the vehicle has arrived and collected the food.

- **URL:** `POST /api/claims/:id/pickup`
- **Auth Required:** Yes (`NGO` owner of the claim)
- **Success Response:** `200 OK` (Updates claim and listing status to `PICKED_UP`)

---

### 3.3 Confirm Completed Handoff
Food donor confirms that the handoff was safely completed.

- **URL:** `POST /api/claims/:id/complete`
- **Auth Required:** Yes (`DONOR` owner of the listing or `ADMIN`)
- **Success Response:** `200 OK` (Updates claim and listing status to `COMPLETED`)

---

### 3.4 Get User Claims
Retrieves claims relevant to the authenticated user.

- **URL:** `GET /api/claims/mine`
- **Auth Required:** Yes (`DONOR` or `NGO`)
- **Success Response:** `200 OK`

---

## 4. Analytics Endpoints

### 4.1 Overview Metrics
- **URL:** `GET /api/analytics/overview`
- **Auth Required:** No
- **Success Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "totalSurplusPostedKg": 11250.5,
    "totalRescuedKg": 8420.0,
    "totalActiveListings": 42,
    "totalCompletedPickups": 115,
    "totalDonors": 40,
    "totalNgos": 15,
    "totalUnmatchedKg": 940.5,
    "matchingRatePercentage": 80.5
  }
}
```

---

### 4.2 Unmatched-Surplus Hotspots
Returns spatial grid clusters of unexpired surplus food with zero eligible NGOs.

- **URL:** `GET /api/analytics/hotspots`
- **Auth Required:** No
- **Success Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "hotspots": [
      {
        "grid_lat": 21.36,
        "grid_lng": 79.31,
        "unmatched_count": 6,
        "total_unmatched_kg": 285.5,
        "sample_food_types": ["Cooked Rice & Dal", "Mixed Vegetable Pulao"]
      }
    ],
    "totalUnmatchedListings": 19,
    "totalUnmatchedKg": 940.5
  }
}
```

---

### 4.3 Interactive Map Layers
Returns real coordinates for donors, NGOs, active listings, claimed listings, and hotspots.

- **URL:** `GET /api/analytics/map`
- **Auth Required:** No
- **Success Response:** `200 OK`

---

### 4.4 Weekly Rescued Trend
Returns week-by-week rescued food quantity (kg).

- **URL:** `GET /api/analytics/rescued-trend`
- **Auth Required:** No
- **Success Response:** `200 OK`

---

### 4.5 Claim Times Distribution
Returns speed-to-claim distribution and average minutes.

- **URL:** `GET /api/analytics/claim-times`
- **Auth Required:** No
- **Success Response:** `200 OK`

---

### 4.6 Matching Coverage Distribution
Returns breakdown across completed, claimed, open matched, unmatched, and expired listings.

- **URL:** `GET /api/analytics/matching`
- **Auth Required:** No
- **Success Response:** `200 OK`

