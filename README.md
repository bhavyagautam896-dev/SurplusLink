# SurplusLink — Surplus Food Matching & Hotspot Analytics Platform

[![Node.js](https://img.shields.io/badge/Node.js-v22-339933?logo=node.js)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-4169E1?logo=postgresql)](https://neon.tech)
[![Docker](https://img.shields.io/badge/Docker-Multi--stage-2496ED?logo=docker)](https://www.docker.com)
[![Vitest](https://img.shields.io/badge/Tests-18%20Passed-FCC72B?logo=vitest)](https://vitest.dev)

> **5th-Semester TPDS-III Computer Science Project**  
> Domain: Sustainability, Urban Logistics & Applied Spatial Databases

---

## 1. Project Introduction

**SurplusLink** is a production-grade full-stack web platform designed to eliminate surplus food wastage across restaurants, hotels, banquet halls, and institutional kitchens. It connects surplus food donors with charitable rescue organizations (NGOs) via **expiry-window-aware Haversine geographical matching**, protects claims with **PostgreSQL transactional concurrency**, manages the complete **pickup-to-handoff lifecycle**, and surfaces **unmatched-surplus hotspot heatmaps** to identify underserved zones.

---

## 2. Problem Statement

Commercial kitchens produce clean, unserved cooked food in bulk. However, redistribution is overwhelmingly coordinated through informal channels (WhatsApp groups, phone calls), resulting in critical failures:

1. **Spatial Blindness:** Donors have no visibility into which NGOs are equipped and located within feasible travel range.
2. **The Perishability Race:** Cooked food expires rapidly. When travel time exceeds safe pickup windows, food spoils before arrival.
3. **Double-Claim Collisions:** Without atomic claim transactions, multiple NGOs attempt to collect the same batch.
4. **Lack of Auditable Records:** No verified record of rescued food vs waste is maintained.
5. **Coverage Deserts:** Authorities have no geographical data identifying sectors where food surplus regularly goes uncollected due to missing NGO presence.

---

## 3. Proposed Solution

SurplusLink addresses these issues through:

- **Verified Role Workflows:** Dedicated consoles for Food Donors, Rescue NGOs, and Administrators.
- **Mathematical Haversine Matching:** Computes great-circle distances directly in PostgreSQL ($R = 6371.0088\text{ km}$).
- **Travel Window Feasibility:** Rejects matches if travel time (factoring vehicle speed and detour coefficients) exceeds safe-until deadlines.
- **Atomic Concurrency Protection:** Employs row-level locking and partial unique indexing to ensure that exactly one NGO can claim a listing.
- **Pickup Confirmation Handshake:** Two-party verification (NGO marks picked up, Donor confirms handoff) before transitioning to completed status.
- **Hotspot Spatial Analytics:** Identifies open unexpired surplus with zero eligible NGOs and clusters them geographically on interactive maps.

---

## 4. Two Principal Original Contributions

### A. Expiry-Window-Aware Geographical Matching Engine
Unlike basic distance feeds, SurplusLink incorporates real physical logistics:
- Earth mean radius ($R = 6371.0088\text{ km}$) Haversine formula in pure SQL.
- Urban road detour factor ($\delta = 1.25$).
- Average vehicle speed ($v = 20\text{ km/h}$).
- Vehicle pickup weight capacity ($C_N \ge Q_L$).
- Safe arrival check: $\text{Current Time} + \text{Estimated Travel Time} \le \text{Safe-Until Timestamp}$.

### B. Unmatched-Surplus Hotspot Analytics
SurplusLink identifies food listings where no NGO satisfies spatial, capacity, or time constraints. These are grouped into $0.01^\circ$ geographical grid cells to generate heatmap clusters, highlighting areas where new NGO depots or municipal food banks should be deployed.

---

## 5. Technology Stack

### Frontend
- **Framework:** React.js 18 + Vite + TypeScript
- **Styling:** Tailwind CSS (Custom forest green & amber theme)
- **Maps:** Leaflet & React-Leaflet with OpenStreetMap tiles
- **Analytics Charts:** Recharts (Area, Bar, Pie charts)
- **HTTP Client:** Axios with credentials & automatic Bearer interceptor
- **Icons:** Lucide React
- **Notifications:** Sonner Toast notifications

### Backend
- **Runtime:** Node.js 22 LTS + Express.js + TypeScript
- **Database Driver:** `pg` (node-postgres) with connection pooling & transaction helpers
- **Validation:** Zod schema validation middleware
- **Authentication:** JWT (JSON Web Tokens) with HTTP-only cookies
- **Security:** Helmet headers, CORS policy, bcryptjs hashing
- **Testing:** Vitest test runner with database integration

### Database
- **Provider:** **Neon PostgreSQL** (External cloud instance) or local PostgreSQL 18
- **Spatial:** In-database `haversine_distance` pure standard SQL function
- **Integrity:** Foreign keys, check constraints, partial unique indexes

---

## 6. System Architecture

```text
Browser Client (React / Vite / Leaflet SPA)
                 |
                 | HTTP / HTTPS (Port 3000 / 80)
                 v
   [ Nginx Reverse Proxy Container ]
    |                              |
    | Static Assets                | /api/* Proxy Pass
    v                              v
[ /usr/share/nginx/html ]     [ Express Backend Container (Port 5000) ]
                                           |
                                           | SSL + Connection Pool (pg)
                                           v
                              [ Neon PostgreSQL Database ]
```

Detailed architecture diagrams and sequence charts are documented in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## 7. Database Schema Overview

```text
+------------------+         +------------------+
|      users       |         |      donors      |
+------------------+         +------------------+
| id (PK, UUID)    |<---+    | id (PK, UUID)    |
| email (UQ)       |    +----| user_id (FK, UQ) |
| password_hash    |         | organization_name|
| role             |         | contact_phone    |
| created_at       |         | address, city    |
| updated_at       |         | latitude, long...|
+------------------+         +------------------+
         ^                             ^
         |                             | 1:M
+------------------+                   v
|       ngos       |         +------------------+
+------------------+         |     listings     |
| id (PK, UUID)    |         +------------------+
| user_id (FK, UQ) |         | id (PK, UUID)    |
| organization_name|         | donor_id (FK)    |
| contact_phone    |         | food_type        |
| address, city    |         | quantity_kg      |
| latitude, long...|         | latitude, long...|
| capacity_kg      |         | safe_until       |
| service_radius_km|         | status           |
| is_accepting     |         +------------------+
+------------------+                   ^
         ^                             | 1:M
         | 1:M                         |
         +-------------+---------------+
                       |
                       v
         +---------------------------+
         |          claims           |
         +---------------------------+
         | id (PK, UUID)             |
         | listing_id (FK)           |
         | ngo_id (FK)               |
         | distance_km               |
         | estimated_travel_minutes  |
         | status                    |
         | picked_up_at              |
         | completed_at              |
         +---------------------------+
```

Complete table schema specifications, constraints, and indexes are in [`docs/DATABASE.md`](docs/DATABASE.md).

---

## 8. Project Structure

```text
SurplusLink/
├── frontend/
│   ├── src/
│   │   ├── api/             # Axios client & error formatting
│   │   ├── components/      # Layout, UI components, Leaflet maps
│   │   ├── contexts/        # AuthContext & session state
│   │   ├── pages/           # Landing, Login, Register, Donor, NGO, Claims, Analytics
│   │   ├── types/           # TypeScript interfaces & enums
│   │   ├── App.tsx          # React Router route registry
│   │   └── main.tsx         # Application entrypoint
│   ├── Dockerfile           # Multi-stage React + Nginx image
│   ├── nginx.conf           # Nginx reverse proxy configuration
│   └── package.json
│
├── backend/
│   ├── src/
│   │   ├── config/          # Environment configuration & validation
│   │   ├── controllers/     # HTTP endpoint handlers
│   │   ├── database/        # Migrations, seed scripts, pool connectivity
│   │   ├── middleware/      # Auth, Zod validation, centralized error handler
│   │   ├── repositories/    # Direct SQL query repositories
│   │   ├── routes/          # Express route definitions
│   │   ├── services/        # Matching engine, claims, hotspot analytics
│   │   ├── utils/           # Reference Haversine & travel formulas
│   │   ├── app.ts           # Express application setup
│   │   └── server.ts        # Server bootstrap & graceful shutdown
│   ├── tests/               # Vitest integration & concurrency test suite
│   ├── Dockerfile           # Multi-stage lightweight Node runner
│   └── package.json
│
├── docs/
│   ├── API.md               # Complete REST API specification
│   ├── DATABASE.md          # Database tables, indexes & functions
│   └── ARCHITECTURE.md      # System architecture & sequence diagrams
│
├── .env                     # Local environment configuration
├── .env.example             # Configuration template
├── docker-compose.yml       # Production container orchestration
└── README.md
```

---

## 9. Environment Setup

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

### Environment Variables Reference

| Variable | Description | Default Value |
|---|---|---|
| `NODE_ENV` | Application environment | `development` / `production` |
| `PORT` | Backend server port | `5000` |
| `DATABASE_URL` | PostgreSQL connection string (Neon or local) | `postgresql://...` |
| `JWT_SECRET` | Secret key for signing JWTs | *(Secure secret)* |
| `JWT_EXPIRES_IN`| Token lifespan | `7d` |
| `FRONTEND_URL` | CORS authorized frontend origin | `http://localhost:3000` |
| `AVERAGE_SPEED_KMH` | Average vehicle transit speed in km/h | `20` |
| `ROAD_DETOUR_FACTOR` | Urban road detour factor | `1.25` |
| `DEFAULT_SEARCH_RADIUS_KM`| Proximity search radius | `15` |
| `SEED_CITY` | Geographic anchor city | `Nagpur` |
| `SEED_CITY_LAT` | City center latitude | `21.1458` |
| `SEED_CITY_LNG` | City center longitude | `79.0882` |

---

## 10. Neon PostgreSQL Configuration

SurplusLink natively supports externally hosted **Neon PostgreSQL**:

1. Obtain your connection string from the [Neon Console](https://console.neon.tech).
2. Ensure `sslmode=require` is present in the URL:
   ```env
   DATABASE_URL=postgresql://neondb_owner:YOUR_PASSWORD@ep-sample-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
3. The backend automatically detects `neon.tech` or `sslmode=require` and activates SSL with `{ rejectUnauthorized: false }`.

---

## 11. Database Migrations & Seeding

### Execute Schema Migrations
```bash
cd backend
npm run migrate
```

### Run Deterministic Seed Script
Generates 40 Donors, 15 NGOs, and 200 Listings with realistic status distributions:
```bash
cd backend
npm run seed
```

**Seed Execution Output:**
```text
================ SEED SUMMARY ===============
Total Donors:           40
Total NGOs:             15
Total Seeded Listings:  200
  - Completed Pickups:  40
  - Picked Up:          25
  - Currently Claimed:  35
  - Open (Matched):     61
  - Open (Unmatched):   19
  - Expired Listings:   20
Overall Matching Rate:  80.5% (161 / 200)
==============================================
DEMO ACCOUNTS:
  DONOR: donor@surpluslink.org / Donor@123
  NGO:   ngo@surpluslink.org   / Ngo@123
  ADMIN: admin@surpluslink.org / Admin@123
==============================================
```

---

## 12. Running Locally

### Run Backend
```bash
cd backend
npm install
npm run dev
# Server listening at http://localhost:5000
```

### Run Frontend
```bash
cd frontend
npm install
npm run dev
# Application running at http://localhost:3000
```

---

## 13. Running via Docker Compose (Mandatory Requirement)

To run the complete production environment:

```bash
docker compose up --build
```

### Running in Background
```bash
docker compose up --build -d
```

### Inspect Container Logs
```bash
docker compose logs -f
```

### Inspect Container Status
```bash
docker compose ps
```

### Shut Down Containers
```bash
docker compose down
```

**Accessing the Application:**
- Frontend Web App: **`http://localhost:3000`**
- API Health Check: **`http://localhost:5000/api/health`** (or through proxy: `http://localhost:3000/api/health`)

---

## 14. Demo Login Credentials

For local academic evaluation, SurplusLink provides one-click autofill buttons on the login screen or direct credentials:

| Role | Email | Password | Access / Scope |
|---|---|---|---|
| **Food Donor** | `donor@surpluslink.org` | `Donor@123` | Post surplus food, view listings, confirm handoff |
| **Rescue NGO** | `ngo@surpluslink.org` | `Ngo@123` | Proximity discovery feed, claim food, mark pickup |
| **Administrator**| `admin@surpluslink.org` | `Admin@123` | Global analytics, hotspot maps, audit metrics |

---

## 15. Testing & Verification

Run the automated test suite with Vitest:

```bash
cd backend
npm test
```

### Test Suite Execution Results (18/18 Tests Passed)

| Test File | Description | Test Count | Result |
|---|---|---|---|
| `haversine-accuracy.test.ts` | Accuracy check against 20 coordinate pairs vs reference formula | 2 tests | **PASS** |
| `concurrency.test.ts` | **50 simultaneous concurrent claim attempts** on a single listing | 1 test | **PASS** (1 success, 49 conflicts, 0 duplicate claims) |
| `normal-workflow.test.ts` | End-to-end lifecycle (Post -> Discover -> Claim -> Pickup -> Complete) | 5 tests | **PASS** |
| `boundary-cases.test.ts` | Exact radius boundary, exact expiry safe-until, capacity limit, inactive NGO | 4 tests | **PASS** |
| `invalid-cases.test.ts` | Negative quantity, past expiry, coordinate bounds, unauthorized claims | 5 tests | **PASS** |
| `matching-rate.test.ts` | Mathematical verification of matching rate on 200 seeded records | 1 test | **PASS** (80.5% matching rate) |

---

## 16. Key Implementation Highlights

- **Pure SQL Haversine Function:** Uses PostgreSQL native math functions (`SIN`, `COS`, `RADIANS`, `ASIN`, `SQRT`) with domain clamping `[0.0, 1.0]`.
- **Double-Lock Concurrency Defense:** Combined row-level conditional update with a partial unique constraint (`idx_unique_active_claim_per_listing`) preventing multiple active claims even under extreme race conditions.
- **Dynamic Hotspot Clustering:** Unmatched unexpired listings are grouped using a spatial grid (`ROUND(lat, 2)`, `ROUND(lng, 2)`) to generate hotspot heatmaps.
- **Zero Frontend Hardcoding:** All analytics KPIs, charts, and map layers render directly from live PostgreSQL database records.

---

## 17. Current Limitations & Future Enhancements

- **Road Routing API:** Travel time currently utilizes configurable detour multipliers ($\delta = 1.25$) and average speed ($v = 20\text{ km/h}$). Integration with Open Source Routing Machine (OSRM) or OpenRouteService could provide turn-by-turn road topography.
- **Cold Chain Verification:** Temperature sensor telemetry integration could continuously log food safety compliance during transit.
- **Push Notifications:** WebSockets or Web Push notifications to immediately alert nearby NGOs the second high-urgency surplus food is published.

---

## 18. Academic Integrity & License

Developed for the **5th-Semester TPDS-III (Computer Science & Engineering)** evaluation under the domain of Sustainability, Spatial Databases, and Operational Logistics.  
Licensed under the **MIT License**.

