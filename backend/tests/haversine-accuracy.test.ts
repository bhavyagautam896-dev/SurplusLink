import { describe, it, expect } from 'vitest';
import { query } from '../src/database/db.js';
import { calculateHaversineDistance } from '../src/utils/haversine.js';

describe('Haversine Distance Accuracy Verification', () => {
  // 20 Predetermined coordinate pairs across India and globally
  const coordinatePairs = [
    // 1. Identical coordinates (Nagpur Zero Mile)
    { name: 'Identical Zero Mile Nagpur', lat1: 21.1458, lon1: 79.0882, lat2: 21.1458, lon2: 79.0882 },
    // 2-5: Very close intra-city distances (< 5 km)
    { name: 'Nagpur Sitabuldi to Dharampeth', lat1: 21.1458, lon1: 79.0882, lat2: 21.1415, lon2: 79.0620 },
    { name: 'Nagpur Railway Station to Airport', lat1: 21.1524, lon1: 79.0888, lat2: 21.0922, lon2: 79.0558 },
    { name: 'Nagpur Sadar to Civil Lines', lat1: 21.1610, lon1: 79.0790, lat2: 21.1510, lon2: 79.0680 },
    { name: 'Nagpur Ramdaspeth to Dhantoli', lat1: 21.1340, lon1: 79.0760, lat2: 21.1320, lon2: 79.0860 },
    // 6-10: Medium distance city routes (10 - 50 km)
    { name: 'Nagpur to Kamptee', lat1: 21.1458, lon1: 79.0882, lat2: 21.2230, lon2: 79.1980 },
    { name: 'Nagpur to Hingna Industrial Area', lat1: 21.1458, lon1: 79.0882, lat2: 21.0850, lon2: 78.9620 },
    { name: 'Mumbai Nariman Point to Bandra Kurla Complex', lat1: 18.9260, lon1: 72.8230, lat2: 19.0660, lon2: 72.8680 },
    { name: 'Delhi Connaught Place to Gurgaon CyberHub', lat1: 28.6315, lon1: 77.2167, lat2: 28.4950, lon2: 77.0890 },
    { name: 'Bengaluru MG Road to Electronic City', lat1: 12.9750, lon1: 77.6090, lat2: 12.8450, lon2: 77.6600 },
    // 11-15: Inter-city major Indian routes (> 100 km)
    { name: 'Nagpur to Mumbai', lat1: 21.1458, lon1: 79.0882, lat2: 19.0760, lon2: 72.8777 },
    { name: 'Nagpur to Pune', lat1: 21.1458, lon1: 79.0882, lat2: 18.5204, lon2: 73.8567 },
    { name: 'Delhi to Mumbai', lat1: 28.6139, lon1: 77.2090, lat2: 19.0760, lon2: 72.8777 },
    { name: 'Chennai to Bengaluru', lat1: 13.0827, lon1: 80.2707, lat2: 12.9716, lon2: 77.5946 },
    { name: 'Kolkata to Hyderabad', lat1: 22.5726, lon1: 88.3639, lat2: 17.3850, lon2: 78.4867 },
    // 16-20: Long distance, equator, and international coordinates
    { name: 'Equator Point 1 to Equator Point 2 (1 deg lon)', lat1: 0.0, lon1: 0.0, lat2: 0.0, lon2: 1.0 },
    { name: 'Equator to 1 deg North (1 deg lat)', lat1: 0.0, lon1: 0.0, lat2: 1.0, lon2: 0.0 },
    { name: 'New Delhi to London Heathrow', lat1: 28.6139, lon1: 77.2090, lat2: 51.4700, lon2: -0.4543 },
    { name: 'Tokyo to Sydney', lat1: 35.6762, lon1: 139.6503, lat2: -33.8688, lon2: 151.2093 },
    { name: 'Extreme Latitude North (80N to 81N)', lat1: 80.0, lon1: 10.0, lat2: 81.0, lon2: 10.0 },
  ];

  it('verifies that all 20 coordinate pairs match PostgreSQL haversine_distance within 0.01 km tolerance', async () => {
    for (const pair of coordinatePairs) {
      // 1. Independent reference calculation in TypeScript
      const referenceDistance = calculateHaversineDistance(
        pair.lat1,
        pair.lon1,
        pair.lat2,
        pair.lon2
      );

      // 2. Database PostgreSQL calculation
      const res = await query<{ dist: string }>(
        'SELECT haversine_distance($1, $2, $3, $4) AS dist',
        [pair.lat1, pair.lon1, pair.lat2, pair.lon2]
      );
      const dbDistance = parseFloat(res.rows[0].dist);

      const diff = Math.abs(referenceDistance - dbDistance);

      // Verify tolerance <= 0.01 km (10 meters)
      expect(diff).toBeLessThanOrEqual(0.01);
    }
  });

  it('handles identical points yielding exactly 0.0 km without NaN or math errors', async () => {
    const res = await query<{ dist: string }>(
      'SELECT haversine_distance(21.1458, 79.0882, 21.1458, 79.0882) AS dist'
    );
    expect(parseFloat(res.rows[0].dist)).toBe(0);
  });
});

