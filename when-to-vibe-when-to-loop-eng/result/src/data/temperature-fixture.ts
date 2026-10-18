// Synthetic demo data shaped like the NEA data.gov.sg PSI and PM2.5 responses.
const regions = ["north", "south", "east", "west", "central"];
function hourlyItems(key: string, baseline: Record<string, number>, gaps: string[]) {
  const latest = Date.parse("2026-10-18T08:45:00+08:00");
  return Array.from({ length: 168 }, (_, hoursAgo) => {
    const timestamp = new Date(latest - hoursAgo * 60 * 60 * 1000).toISOString();
    const hour = (new Date(timestamp).getUTCHours() + 8) % 24;
    const peakHour = key === "psi_twenty_four_hourly" ? 15 : 8;
    const daily = Math.round(Math.sin((hour - peakHour) * Math.PI / 12) * 3) - Math.round(Math.sin((8 - peakHour) * Math.PI / 12) * 3);
    const readings = Object.fromEntries(regions.flatMap((region, i) => {
      if (gaps.includes(`${region}:${hoursAgo}`)) return [];
      const wiggle = Math.round(Math.sin(hoursAgo * 0.65 + i * 1.2) * 2) - Math.round(Math.sin(i * 1.2) * 2);
      return [[region, baseline[region] + daily + wiggle]];
    }));
    return { timestamp, updatedTimestamp: new Date(Date.parse(timestamp) + 2 * 60_000).toISOString(), readings: { [key]: readings } };
  });
}

export const airQualityFixture = {
  source: "Synthetic demo data — not current conditions",
  asOf: "2026-10-18T09:00:00+08:00",
  psi: {
    code: 0,
    data: {
      regionMetadata: [
        { name: "north", labelLocation: { latitude: 1.41803, longitude: 103.82 } },
        { name: "south", labelLocation: { latitude: 1.29587, longitude: 103.82 } },
        { name: "east", labelLocation: { latitude: 1.35735, longitude: 103.94 } },
        { name: "west", labelLocation: { latitude: 1.35735, longitude: 103.7 } },
        { name: "central", labelLocation: { latitude: 1.35735, longitude: 103.82 } }
      ],
      items: hourlyItems("psi_twenty_four_hourly", { north: 52, south: 120, east: 220, west: 330, central: 68 }, ["central:6", "west:0"])
    }
  },
  pm25: {
    code: 0,
    data: {
      regionMetadata: [
        { name: "north", labelLocation: { latitude: 1.41803, longitude: 103.82 } },
        { name: "south", labelLocation: { latitude: 1.29587, longitude: 103.82 } },
        { name: "east", labelLocation: { latitude: 1.35735, longitude: 103.94 } },
        { name: "west", labelLocation: { latitude: 1.35735, longitude: 103.7 } },
        { name: "central", labelLocation: { latitude: 1.35735, longitude: 103.82 } }
      ],
      items: hourlyItems("pm25_one_hourly", { north: 12, south: 10, east: 15, west: 18, central: 16 }, ["south:8"])
    }
  }
} as const;

export type Measure = "psi" | "pm25";
