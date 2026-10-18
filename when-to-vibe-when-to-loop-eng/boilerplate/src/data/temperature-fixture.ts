export type Station = {
  id: string;
  name: string;
  location: {
    latitude: number;
    longitude: number;
  };
};

export type Reading = {
  stationId: string;
  value: number;
};

export type ReadingGroup = {
  timestamp: string;
  readings: Reading[];
};

// Synthetic demo data with a fixed reference time so stale and missing cases stay reproducible.
export const temperatureFixture = {
  source: "synthetic-demo-data",
  asOf: "2026-10-18T09:00:00+08:00",
  stations: [
    { id: "DEMO-NORTH", name: "Demo North", location: { latitude: 1.4304, longitude: 103.8354 } },
    { id: "DEMO-CENTRAL", name: "Demo Central", location: { latitude: 1.3329, longitude: 103.7765 } },
    { id: "DEMO-EAST", name: "Demo East", location: { latitude: 1.3573, longitude: 103.9872 } },
    { id: "DEMO-WEST", name: "Demo West", location: { latitude: 1.3451, longitude: 103.6894 } },
    { id: "DEMO-NO-READING", name: "Demo Station with No Reading", location: { latitude: 1.3000, longitude: 103.8500 } }
  ] satisfies Station[],
  unit: "°C",
  readings: [
    { timestamp: "2026-10-18T08:40:00+08:00", readings: [{ stationId: "DEMO-NORTH", value: 28.6 }, { stationId: "DEMO-CENTRAL", value: 29.1 }, { stationId: "DEMO-EAST", value: 29.4 }, { stationId: "DEMO-WEST", value: 28.8 }] },
    { timestamp: "2026-10-18T08:45:00+08:00", readings: [{ stationId: "DEMO-NORTH", value: 28.7 }, { stationId: "DEMO-CENTRAL", value: 29.0 }, { stationId: "DEMO-WEST", value: 28.9 }] },
    { timestamp: "2026-10-18T08:50:00+08:00", readings: [{ stationId: "DEMO-NORTH", value: 28.8 }, { stationId: "DEMO-CENTRAL", value: 29.2 }, { stationId: "DEMO-EAST", value: 29.5 }, { stationId: "DEMO-WEST", value: 29.0 }] },
    { timestamp: "2026-10-18T08:55:00+08:00", readings: [{ stationId: "DEMO-CENTRAL", value: 29.3 }, { stationId: "DEMO-EAST", value: 29.6 }, { stationId: "DEMO-WEST", value: 29.1 }] }
  ] satisfies ReadingGroup[]
} as const;

export const demoUiStates = {
  loading: { kind: "loading" },
  apiError: { kind: "error", message: "Demo API error: readings are temporarily unavailable." }
} as const;
