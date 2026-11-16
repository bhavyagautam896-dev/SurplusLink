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

const DONOR_NAMES = [
  'Grand Orange Banquet & Caterers', 'Haldiram Food Planet', 'Naivedhyam Delicacies', 'Barbeque Nation Sitabuldi',
  'Tuli Imperial Event Kitchen', 'Radisson Blu Banquet Hall', 'Centre Point Caterers', 'Shree Shivkripa Bhojanalaya',
  'Sardarji Malai Kofta Kitchen', 'Gayatri Veg Buffet', 'The Empress Palace Caterers', 'Hotel Pride Kitchen',
  'Ashoka Universal Kitchen', 'Bake-o-Holics Artisan Bakery', 'Tauby’s Treats Bakery', 'Ajit Bakery Ramdaspeth',
  'Green Leaf Pure Veg Caterers', 'Checkers Fine Dining', 'Moti Mahal Delux', 'Puranmal Sweets & Kitchen',
  'Golden Harvest Caterers', 'Ambience Party Lawns Kitchen', 'Suruchi Kitchens', 'Nanking Chinese Kitchen',
  'Signature Hospitality Kitchen', 'Celebrations Convention Hall', 'Spicy Paradise Caterers', 'Royal Treat Caterers',
  'Zaika Gourmet Kitchen', 'Khana Khazana Caterers', 'Shalimar Caterers', 'Annapurna Food Services',
  'Swad Family Kitchen', 'Sankalp South Indian Kitchen', 'Silver Oak Caterers', 'Urban Tadka Kitchen',
  'Taste of Nagpur Caterers', 'Vrindavan Dining Hall', 'Desi Thali Express', 'Saffron Banquet Kitchen'
];

const NGO_NAMES = [
  { name: 'Roti Bank Nagpur Relief', capacity: 120, radius: 15 },
  { name: 'Seva Sankalp Food Foundation', capacity: 80, radius: 12 },
  { name: 'Annapurna Seva Trust', capacity: 150, radius: 18 },
  { name: 'Nagpur Hunger Action Network', capacity: 100, radius: 14 },
  { name: 'Umeed Feeding Initiative', capacity: 60, radius: 10 },
  { name: 'Jan Kalyan Annadana Kendra', capacity: 200, radius: 20 },
  { name: 'Snehalaya Children Support', capacity: 50, radius: 8 },
  { name: 'Mother Teresa Charity Kitchen', capacity: 90, radius: 12 },
  { name: 'Koshish Community Kitchen', capacity: 70, radius: 10 },
  { name: 'Hope & Nutrition Mission', capacity: 110, radius: 16 },
  { name: 'Prerna Slum Outreach', capacity: 45, radius: 7 },
  { name: 'Samarpan Food Rescue', capacity: 130, radius: 15 },
  { name: 'Sant Gadge Baba Annakshetra', capacity: 180, radius: 18 },
  { name: 'Navjeevan Relief Foundation', capacity: 75, radius: 11 },
  { name: 'Ek Mutthi Anaj Mission', capacity: 85, radius: 12 }
];

const FOOD_TYPES = [
  { type: 'Cooked Rice & Dal', desc: 'Freshly prepared steamed basmati rice with homestyle yellow tadka dal.' },
  { type: 'Buffet Paneer Masala & Rotis', desc: 'Leftover unserved paneer butter masala curry and 120 tandoori rotis.' },
  { type: 'Assorted Bakery Bread & Rolls', desc: 'Freshly baked sandwich bread, burger buns, and dinner rolls.' },
  { type: 'Mixed Vegetable Pulao', desc: 'Aromatic vegetable pulao prepared for an evening event banquet.' },
  { type: 'Packed Lunch Boxes', desc: 'Hygienically packed executive lunch trays (chapati, sabzi, rice, sweet).' },
  { type: 'South Indian Idli & Sambar', desc: 'Steamed rice idlis with piping hot mixed vegetable sambar.' },
  { type: 'Fresh Fruit & Green Salad', desc: 'Chilled watermelon slices, papaya, cucumbers, and tossed garden salad.' },
  { type: 'Snack Assortment & Sandwiches', desc: 'Vegetable club sandwiches, samosas, and vegetable cutlets.' }
];

export async function seedDatabase() {
  console.log('🌱 Starting deterministic database seeding for SurplusLink...');
  await runMigrations();

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Clean existing records in correct foreign key order
    console.log('🧹 Cleaning existing tables...');
    await client.query(`
      TRUNCATE claims, listings, ngos, donors, users CASCADE;
    `);

    // 2. Hash default passwords
    const salt = await bcrypt.genSalt(10);
    const donorPasswordHash = await bcrypt.hash('Donor@123', salt);
    const ngoPasswordHash = await bcrypt.hash('Ngo@123', salt);
    const adminPasswordHash = await bcrypt.hash('Admin@123', salt);

    // 3. Create Admin user
    await client.query(
      `INSERT INTO users (email, password_hash, role) VALUES ($1, $2, 'ADMIN')`,
      ['admin@surpluslink.org', adminPasswordHash]
    );

    // City baseline coordinates
    const baseLat = config.seedCityLat;
    const baseLng = config.seedCityLng;

    // 4. Create 40 Donors
    console.log('🏢 Creating 40 food donor organizations...');
    const donorIds: string[] = [];
    const donorCoords: Array<{ id: string; lat: number; lng: number }> = [];

    for (let i = 0; i < DONOR_NAMES.length; i++) {
      const email = i === 0 ? 'donor@surpluslink.org' : `donor${i + 1}@example.com`;
      const pass = donorPasswordHash;

      const userRes = await client.query(
        `INSERT INTO users (email, password_hash, role) VALUES ($1, $2, 'DONOR') RETURNING id`,
        [email, pass]
      );
      const userId = userRes.rows[0].id;

      // Coordinate jitter within ~12 km of city center (approx 0.1 degree)
      const latOffset = (random() - 0.5) * 0.18;
      const lngOffset = (random() - 0.5) * 0.18;
      const lat = Math.round((baseLat + latOffset) * 100000) / 100000;
      const lng = Math.round((baseLng + lngOffset) * 100000) / 100000;

      const donorRes = await client.query(
        `INSERT INTO donors (user_id, organization_name, contact_phone, address, city, latitude, longitude)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
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

      const dId = donorRes.rows[0].id;
      donorIds.push(dId);
      donorCoords.push({ id: dId, lat, lng });
    }

    // 5. Create 15 NGOs
    console.log('🤝 Creating 15 NGO rescue organizations...');
    const ngoIds: string[] = [];
    const ngosData: Array<{ id: string; lat: number; lng: number; capacity: number; radius: number; isAccepting: boolean }> = [];

    for (let i = 0; i < NGO_NAMES.length; i++) {
      const email = i === 0 ? 'ngo@surpluslink.org' : `ngo${i + 1}@example.com`;
      const pass = ngoPasswordHash;

      const userRes = await client.query(
        `INSERT INTO users (email, password_hash, role) VALUES ($1, $2, 'NGO') RETURNING id`,
        [email, pass]
      );
      const userId = userRes.rows[0].id;

      // NGO location jitter within ~14 km
      const latOffset = (random() - 0.5) * 0.16;
      const lngOffset = (random() - 0.5) * 0.16;
      const lat = Math.round((baseLat + latOffset) * 100000) / 100000;
      const lng = Math.round((baseLng + lngOffset) * 100000) / 100000;

      const ngoDef = NGO_NAMES[i];
      // NGO 13 is set to is_accepting = false for boundary testing
      const isAccepting = i !== 13;

      const ngoRes = await client.query(
        `INSERT INTO ngos (user_id, organization_name, contact_phone, address, city, latitude, longitude, capacity_kg, service_radius_km, is_accepting)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id`,
        [
          userId,
          ngoDef.name,
          `+91 94221 ${20000 + i}`,
          `Shelter Block ${10 + i}, Civil Lines, ${config.seedCity}`,
          config.seedCity,
          lat,
          lng,
          ngoDef.capacity,
          ngoDef.radius,
          isAccepting,
        ]
      );

      const nId = ngoRes.rows[0].id;
      ngoIds.push(nId);
      ngosData.push({
        id: nId,
        lat,
        lng,
        capacity: ngoDef.capacity,
        radius: ngoDef.radius,
        isAccepting,
      });
    }

    // 6. Generate exactly 200 Listings
    console.log('🍲 Creating 200 realistic food listings with status distributions...');
    const now = new Date();

    // Distribution:
    // 80 OPEN (some matchable, some unmatched hotspots)
    // 35 CLAIMED
    // 25 PICKED_UP
    // 40 COMPLETED
    // 20 EXPIRED
    const listingStatuses = [
      ...Array(80).fill('OPEN'),
      ...Array(35).fill('CLAIMED'),
      ...Array(25).fill('PICKED_UP'),
      ...Array(40).fill('COMPLETED'),
      ...Array(20).fill('EXPIRED'),
    ];

    for (let i = 0; i < 200; i++) {
      const status = listingStatuses[i];
      const donorIndex = Math.floor(random() * donorIds.length);
      const donorId = donorIds[donorIndex];
      const donor = donorCoords[donorIndex];

      const food = FOOD_TYPES[Math.floor(random() * FOOD_TYPES.length)];
      const quantityKg = Math.round((10 + random() * 90) * 10) / 10; // 10 to 100 kg

      let safeUntil: Date;
      let createdAt: Date;

      if (status === 'EXPIRED') {
        // Expired in past
        const hoursAgo = 2 + Math.floor(random() * 24);
        safeUntil = new Date(now.getTime() - hoursAgo * 3600 * 1000);
        createdAt = new Date(safeUntil.getTime() - 4 * 3600 * 1000);
      } else if (status === 'COMPLETED' || status === 'PICKED_UP' || status === 'CLAIMED') {
        // Historical claims created in the past 1 to 21 days
        const daysAgo = 1 + Math.floor(random() * 20);
        const hoursAhead = 3 + Math.floor(random() * 4);
        createdAt = new Date(now.getTime() - daysAgo * 24 * 3600 * 1000);
        safeUntil = new Date(createdAt.getTime() + hoursAhead * 3600 * 1000);
      } else {
        // OPEN listing: Safe until 1 to 6 hours from now
        const hoursFromNow = 1 + Math.floor(random() * 6);
        safeUntil = new Date(now.getTime() + hoursFromNow * 3600 * 1000);
        createdAt = new Date(now.getTime() - 45 * 60 * 1000); // 45 min ago
      }

      // Coordinates: Most near the donor, but for ~15% of open listings, place them in peripheral underserved pockets
      let lat = donor.lat;
      let lng = donor.lng;

      if (status === 'OPEN' && i > 60) {
        // Peripheral / industrial area with no close NGOs (creates realistic hotspots)
        lat = Math.round((baseLat + 0.22 + (random() - 0.5) * 0.05) * 100000) / 100000;
        lng = Math.round((baseLng + 0.22 + (random() - 0.5) * 0.05) * 100000) / 100000;
      }

      const listingRes = await client.query(
        `INSERT INTO listings (donor_id, food_type, description, quantity_kg, latitude, longitude, safe_until, pickup_instructions, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING id`,
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

      // Create claims for CLAIMED, PICKED_UP, COMPLETED listings
      if (status === 'CLAIMED' || status === 'PICKED_UP' || status === 'COMPLETED') {
        const ngoIndex = Math.floor(random() * ngoIds.length);
        const ngo = ngosData[ngoIndex];
        const distKm = calculateHaversineDistance(ngo.lat, ngo.lng, lat, lng);
        const travelMin = calculateTravelTimeMinutes(distKm);

        const claimDate = new Date(createdAt.getTime() + (15 + Math.floor(random() * 45)) * 60 * 1000);
        const pickedUpDate =
          status === 'PICKED_UP' || status === 'COMPLETED'
            ? new Date(claimDate.getTime() + 45 * 60 * 1000)
            : null;
        const completedDate =
          status === 'COMPLETED'
            ? new Date(pickedUpDate!.getTime() + 30 * 60 * 1000)
            : null;

        await client.query(
          `INSERT INTO claims (listing_id, ngo_id, claimed_at, distance_km, estimated_travel_minutes, status, picked_up_at, completed_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            listingId,
            ngo.id,
            claimDate.toISOString(),
            distKm,
            travelMin,
            status,
            pickedUpDate ? pickedUpDate.toISOString() : null,
            completedDate ? completedDate.toISOString() : null,
          ]
        );
      }
    }

    await client.query('COMMIT');
    console.log('✅ Seeding transaction committed successfully.');

    // 7. Calculate and display evaluation summary
    const totalDonors = donorIds.length;
    const totalNgos = ngoIds.length;
    const totalListings = 200;

    const detourFactor = config.roadDetourFactor;
    const speedKmh = config.averageSpeedKmh;

    const matchedOpenRes = await pool.query(
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
      [detourFactor, speedKmh]
    );

    const unmatchedOpenRes = await pool.query(
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
      [detourFactor, speedKmh]
    );

    const openMatched = parseInt(matchedOpenRes.rows[0].count, 10);
    const openUnmatched = parseInt(unmatchedOpenRes.rows[0].count, 10);
    const claimedOrCompleted = 35 + 25 + 40; // 100 historical claimed/picked up/completed
    const totalMatchedOrRescued = claimedOrCompleted + openMatched;
    const totalValidListings = 200;
    const matchingRate = ((totalMatchedOrRescued / totalValidListings) * 100).toFixed(1);

    console.log('\n================ SEED SUMMARY ===============');
    console.log(`Total Donors:           ${totalDonors}`);
    console.log(`Total NGOs:             ${totalNgos}`);
    console.log(`Total Seeded Listings:  ${totalListings}`);
    console.log(`  - Completed Pickups:  40`);
    console.log(`  - Picked Up:          25`);
    console.log(`  - Currently Claimed:  35`);
    console.log(`  - Open (Matched):     ${openMatched}`);
    console.log(`  - Open (Unmatched):   ${openUnmatched}`);
    console.log(`  - Expired Listings:   20`);
    console.log(`Overall Matching Rate:  ${matchingRate}% (${totalMatchedOrRescued} / ${totalValidListings})`);
    console.log('==============================================');
    console.log('DEMO ACCOUNTS:');
    console.log('  DONOR: donor@surpluslink.org / Donor@123');
    console.log('  NGO:   ngo@surpluslink.org   / Ngo@123');
    console.log('  ADMIN: admin@surpluslink.org / Admin@123');
    console.log('==============================================\n');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seeding failed:', err);
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
