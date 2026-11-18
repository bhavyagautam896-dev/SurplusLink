import bcrypt from 'bcryptjs';
import { pool } from './db.js';
import { runMigrations } from './migrate.js';
import { config } from '../config/env.js';
import { calculateHaversineDistance, calculateTravelTimeMinutes } from '../utils/haversine.js';

// Deterministic Pseudo-Random Number Generator (Mulberry32)
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const random = mulberry32(1337);

// ─────────────────────────────────────────────────────────
// Seed data — 8 donors, 5 NGOs, ~25 listings, 3 demo users
// ─────────────────────────────────────────────────────────

const DONOR_NAMES = [
  'Grand Orange Banquet & Caterers',
  'Haldiram Food Planet',
  'Naivedhyam Delicacies',
  'Barbeque Nation Sitabuldi',
  'Tuli Imperial Event Kitchen',
  'Radisson Blu Banquet Hall',
  'Centre Point Caterers',
  'Shree Shivkripa Bhojanalaya',
];

const NGO_DEFS = [
  { name: 'Roti Bank Nagpur Relief',       capacity: 120, radius: 15 },
  { name: 'Seva Sankalp Food Foundation',  capacity:  80, radius: 12 },
  { name: 'Annapurna Seva Trust',          capacity: 150, radius: 18 },
  { name: 'Nagpur Hunger Action Network',  capacity: 100, radius: 14 },
  { name: 'Umeed Feeding Initiative',      capacity:  60, radius: 10 },
];

const FOOD_TYPES = [
  { type: 'Cooked Rice & Dal',           desc: 'Freshly prepared steamed basmati rice with homestyle yellow tadka dal.' },
  { type: 'Buffet Paneer Masala & Rotis', desc: 'Leftover unserved paneer butter masala curry and 120 tandoori rotis.' },
  { type: 'Assorted Bakery Bread & Rolls',desc: 'Freshly baked sandwich bread, burger buns, and dinner rolls.' },
  { type: 'Mixed Vegetable Pulao',        desc: 'Aromatic vegetable pulao prepared for an evening event banquet.' },
  { type: 'Packed Lunch Boxes',           desc: 'Hygienically packed executive lunch trays (chapati, sabzi, rice, sweet).' },
  { type: 'South Indian Idli & Sambar',   desc: 'Steamed rice idlis with piping hot mixed vegetable sambar.' },
  { type: 'Fresh Fruit & Green Salad',    desc: 'Chilled watermelon slices, papaya, cucumbers, and tossed garden salad.' },
  { type: 'Snack Assortment & Sandwiches',desc: 'Vegetable club sandwiches, samosas, and vegetable cutlets.' },
];

export async function seedDatabase() {
  console.log('🌱 Starting SurplusLink database seed (20-30 records)...');
  await runMigrations();

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // ── 1. Wipe existing data ──────────────────────────────
    console.log('🧹 Truncating existing tables...');
    await client.query('TRUNCATE claims, listings, ngos, donors, users CASCADE');

    // ── 2. Hash passwords ──────────────────────────────────
    const salt = await bcrypt.genSalt(10);
    const donorPwHash = await bcrypt.hash('Donor@123', salt);
    const ngoPwHash   = await bcrypt.hash('Ngo@123',   salt);
    const adminPwHash = await bcrypt.hash('Admin@123',  salt);

    // ── 3. Admin user ──────────────────────────────────────
    console.log('👤 Creating admin account...');
    await client.query(
      `INSERT INTO users (email, password_hash, role) VALUES ($1, $2, 'ADMIN')`,
      ['admin@surpluslink.org', adminPwHash]
    );

    const baseLat = config.seedCityLat; // 21.1458 (Nagpur)
    const baseLng = config.seedCityLng; // 79.0882

    // ── 4. Create 8 Donors (first = demo account) ──────────
    console.log('🏢 Creating 8 food donor organizations...');
    const donorIds: string[] = [];
    const donorCoords: Array<{ id: string; lat: number; lng: number }> = [];

    for (let i = 0; i < DONOR_NAMES.length; i++) {
      const email = i === 0 ? 'donor@surpluslink.org' : `donor${i + 1}@example.com`;

      const userRes = await client.query(
        `INSERT INTO users (email, password_hash, role) VALUES ($1, $2, 'DONOR') RETURNING id`,
        [email, donorPwHash]
      );
      const userId = userRes.rows[0].id;

      const latOffset = (random() - 0.5) * 0.18;
      const lngOffset = (random() - 0.5) * 0.18;
      const lat = Math.round((baseLat + latOffset) * 1e5) / 1e5;
      const lng = Math.round((baseLng + lngOffset) * 1e5) / 1e5;

      const donorRes = await client.query(
        `INSERT INTO donors (user_id, organization_name, contact_phone, address, city, latitude, longitude)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [
          userId,
          DONOR_NAMES[i],
          `+91 98230 ${10000 + i}`,
          `Plot ${40 + i}, Central Avenue, ${config.seedCity}`,
          config.seedCity,
          lat,
          lng,
        ]
      );

      donorIds.push(donorRes.rows[0].id);
      donorCoords.push({ id: donorRes.rows[0].id, lat, lng });
    }

    // ── 5. Create 5 NGOs (first = demo account) ────────────
    console.log('🤝 Creating 5 NGO rescue organizations...');
    const ngoIds: string[] = [];
    const ngosData: Array<{ id: string; lat: number; lng: number; capacity: number; radius: number }> = [];

    for (let i = 0; i < NGO_DEFS.length; i++) {
      const email = i === 0 ? 'ngo@surpluslink.org' : `ngo${i + 1}@example.com`;

      const userRes = await client.query(
        `INSERT INTO users (email, password_hash, role) VALUES ($1, $2, 'NGO') RETURNING id`,
        [email, ngoPwHash]
      );
      const userId = userRes.rows[0].id;

      const latOffset = (random() - 0.5) * 0.16;
      const lngOffset = (random() - 0.5) * 0.16;
      const lat = Math.round((baseLat + latOffset) * 1e5) / 1e5;
      const lng = Math.round((baseLng + lngOffset) * 1e5) / 1e5;

      const def = NGO_DEFS[i];

      const ngoRes = await client.query(
        `INSERT INTO ngos (user_id, organization_name, contact_phone, address, city, latitude, longitude,
                           capacity_kg, service_radius_km, is_accepting)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
        [
          userId,
          def.name,
          `+91 94221 ${20000 + i}`,
          `Shelter Block ${10 + i}, Civil Lines, ${config.seedCity}`,
          config.seedCity,
          lat,
          lng,
          def.capacity,
          def.radius,
          true,
        ]
      );

      ngoIds.push(ngoRes.rows[0].id);
      ngosData.push({ id: ngoRes.rows[0].id, lat, lng, capacity: def.capacity, radius: def.radius });
    }

    // ── 6. Create 25 Listings with realistic status distribution ──
    // Distribution: 10 OPEN | 5 CLAIMED | 4 PICKED_UP | 4 COMPLETED | 2 EXPIRED
    console.log('🍲 Creating 25 food listings...');
    const now = new Date();

    const listingStatuses = [
      ...Array(10).fill('OPEN'),
      ...Array(5).fill('CLAIMED'),
      ...Array(4).fill('PICKED_UP'),
      ...Array(4).fill('COMPLETED'),
      ...Array(2).fill('EXPIRED'),
    ];

    for (let i = 0; i < listingStatuses.length; i++) {
      const status = listingStatuses[i];
      const donorIndex = Math.floor(random() * donorIds.length);
      const donorId    = donorIds[donorIndex];
      const donor      = donorCoords[donorIndex];

      const food       = FOOD_TYPES[Math.floor(random() * FOOD_TYPES.length)];
      const quantityKg = Math.round((10 + random() * 90) * 10) / 10;

      let safeUntil: Date;
      let createdAt: Date;

      if (status === 'EXPIRED') {
        const hoursAgo = 2 + Math.floor(random() * 24);
        safeUntil  = new Date(now.getTime() - hoursAgo * 3600 * 1000);
        createdAt  = new Date(safeUntil.getTime() - 4 * 3600 * 1000);
      } else if (['COMPLETED', 'PICKED_UP', 'CLAIMED'].includes(status)) {
        const daysAgo    = 1 + Math.floor(random() * 10);
        const hoursAhead = 3 + Math.floor(random() * 4);
        createdAt  = new Date(now.getTime() - daysAgo * 24 * 3600 * 1000);
        safeUntil  = new Date(createdAt.getTime() + hoursAhead * 3600 * 1000);
      } else {
        // OPEN — expires 1–6 hours from now
        const hoursFromNow = 1 + Math.floor(random() * 6);
        safeUntil  = new Date(now.getTime() + hoursFromNow * 3600 * 1000);
        createdAt  = new Date(now.getTime() - 45 * 60 * 1000);
      }

      // Last 3 OPEN listings placed in a peripheral zone to generate hotspot
      let lat = donor.lat;
      let lng = donor.lng;
      if (status === 'OPEN' && i >= 7) {
        lat = Math.round((baseLat + 0.22 + (random() - 0.5) * 0.05) * 1e5) / 1e5;
        lng = Math.round((baseLng + 0.22 + (random() - 0.5) * 0.05) * 1e5) / 1e5;
      }

      const listingRes = await client.query(
        `INSERT INTO listings
           (donor_id, food_type, description, quantity_kg, latitude, longitude,
            safe_until, pickup_instructions, status, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
        [
          donorId,
          food.type,
          food.desc,
          quantityKg,
          lat,
          lng,
          safeUntil.toISOString(),
          'Please bring covered food-grade insulated transport vessels. Call contact upon arrival.',
          status,
          createdAt.toISOString(),
          createdAt.toISOString(),
        ]
      );

      const listingId = listingRes.rows[0].id;

      // ── Attach claim for CLAIMED / PICKED_UP / COMPLETED ──
      if (['CLAIMED', 'PICKED_UP', 'COMPLETED'].includes(status)) {
        const ngoIndex  = Math.floor(random() * ngoIds.length);
        const ngo       = ngosData[ngoIndex];
        const distKm    = calculateHaversineDistance(ngo.lat, ngo.lng, lat, lng);
        const travelMin = calculateTravelTimeMinutes(distKm);

        const claimDate     = new Date(createdAt.getTime() + (15 + Math.floor(random() * 45)) * 60 * 1000);
        const pickedUpDate  = ['PICKED_UP', 'COMPLETED'].includes(status)
          ? new Date(claimDate.getTime() + 45 * 60 * 1000)
          : null;
        const completedDate = status === 'COMPLETED'
          ? new Date(pickedUpDate!.getTime() + 30 * 60 * 1000)
          : null;

        await client.query(
          `INSERT INTO claims
             (listing_id, ngo_id, claimed_at, distance_km, estimated_travel_minutes,
              status, picked_up_at, completed_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [
            listingId,
            ngo.id,
            claimDate.toISOString(),
            distKm,
            travelMin,
            status,
            pickedUpDate  ? pickedUpDate.toISOString()  : null,
            completedDate ? completedDate.toISOString() : null,
          ]
        );
      }
    }

    await client.query('COMMIT');
    console.log('✅ Seed transaction committed.');

    // ── 7. Summary ─────────────────────────────────────────
    const matchedRes = await pool.query(
      `SELECT COUNT(*)::INTEGER AS count
       FROM listings l
       WHERE l.status = 'OPEN'
         AND l.safe_until > NOW()
         AND EXISTS (
           SELECT 1 FROM ngos n
           WHERE n.is_accepting = TRUE
             AND l.quantity_kg <= n.capacity_kg
             AND haversine_distance(n.latitude, n.longitude, l.latitude, l.longitude) <= n.service_radius_km
             AND (NOW() + (((haversine_distance(n.latitude, n.longitude, l.latitude, l.longitude) * $1 / $2) * 60) * INTERVAL '1 minute')) <= l.safe_until
         )`,
      [config.roadDetourFactor, config.averageSpeedKmh]
    );

    const unmatchedRes = await pool.query(
      `SELECT COUNT(*)::INTEGER AS count
       FROM listings l
       WHERE l.status = 'OPEN'
         AND l.safe_until > NOW()
         AND NOT EXISTS (
           SELECT 1 FROM ngos n
           WHERE n.is_accepting = TRUE
             AND l.quantity_kg <= n.capacity_kg
             AND haversine_distance(n.latitude, n.longitude, l.latitude, l.longitude) <= n.service_radius_km
             AND (NOW() + (((haversine_distance(n.latitude, n.longitude, l.latitude, l.longitude) * $1 / $2) * 60) * INTERVAL '1 minute')) <= l.safe_until
         )`,
      [config.roadDetourFactor, config.averageSpeedKmh]
    );

    const openMatched   = parseInt(matchedRes.rows[0].count,   10);
    const openUnmatched = parseInt(unmatchedRes.rows[0].count, 10);
    const historical    = 5 + 4 + 4; // CLAIMED + PICKED_UP + COMPLETED

    console.log('\n============== SEED SUMMARY ==============');
    console.log(`Donors:               8  (incl. demo account)`);
    console.log(`NGOs:                 5  (incl. demo account)`);
    console.log(`Total Listings:       25`);
    console.log(`  OPEN (matched):     ${openMatched}`);
    console.log(`  OPEN (unmatched):   ${openUnmatched}`);
    console.log(`  CLAIMED:            5`);
    console.log(`  PICKED_UP:          4`);
    console.log(`  COMPLETED:          4`);
    console.log(`  EXPIRED:            2`);
    console.log(`Matching Rate:        ${(((historical + openMatched) / 25) * 100).toFixed(1)}%`);
    console.log('==========================================');
    console.log('DEMO ACCOUNTS:');
    console.log('  DONOR : donor@surpluslink.org / Donor@123');
    console.log('  NGO   : ngo@surpluslink.org   / Ngo@123');
    console.log('  ADMIN : admin@surpluslink.org  / Admin@123');
    console.log('==========================================\n');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seeding failed — rolled back:', err);
    throw err;
  } finally {
    client.release();
  }
}

// Allow direct CLI execution
if (process.argv[1] && process.argv[1].endsWith('seed.ts')) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
