/** Stable response contract for GET /api/dashboard. Safe to import in browser code. */
export type AirQualityMetric = "psi" | "pm25";
export type MetricUnit = "index" | "µg/m³";
export type FreshnessState = "fresh" | "stale" | "unavailable";
export type IngestionRunState = "running" | "succeeded" | "failed";

export interface DashboardRegion {
  id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
}

export interface DashboardReading {
  metric: AirQualityMetric;
  regionId: string;
  value: number;
  unit: MetricUnit;
  observedAt: string;
  sourceUpdatedAt: string | null;
  fetchedAt: string;
  freshness: {
    state: FreshnessState;
    referenceAt: string;
    ageMinutes: number;
    staleAfterMinutes: number;
  };
}

export interface DashboardSeriesPoint {
  /** Singapore-hour bucket start, expressed as an ISO UTC timestamp. */
  hour: string;
  value: number | null;
  observedAt: string | null;
}

export interface HourlyAverage {
  hour: number;
  average: number;
  sampleCount: number;
  daysWithReadings: number;
}

export interface IngestionAttempt {
  status: IngestionRunState;
  startedAt: string;
  completedAt: string | null;
  error: string | null;
}

export interface FeedStatus {
  latestAttempt: IngestionAttempt | null;
  lastSuccessfulPoll: string | null;
  error: string | null;
}

export interface MetricDashboardData {
  unit: MetricUnit;
  latestByRegion: Record<string, DashboardReading | null>;
  series24h: DashboardSeriesPoint[];
  hourlyAverages7d: HourlyAverage[];
  status: FeedStatus;
}

export interface DashboardResponse {
  generatedAt: string;
  timezone: "Asia/Singapore";
  regions: DashboardRegion[];
  selectedRegion: string;
  metrics: Record<AirQualityMetric, MetricDashboardData>;
}
