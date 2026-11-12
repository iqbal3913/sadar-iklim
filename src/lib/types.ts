export type DataMode = "LIVE" | "STALE" | "SIMULATION";
export type ImpactLevel = "low" | "moderate" | "high" | "extreme";
export type Confidence = "low" | "medium" | "high";
export type HazardType =
  | "coastal_flood"
  | "wildfire"
  | "earthquake"
  | "multi_hazard";

export type LatLng = [number, number];

export type SourceName =
  | "BMKG"
  | "OPEN_METEO"
  | "BNPB_INARISK"
  | "NASA_FIRMS"
  | "CITIZEN_REPORT"
  | "INTERNAL_RULE";

export interface EvidenceItem {
  id: string;
  source: SourceName;
  observation: string;
  observedAt: string | null;
}

export interface IbfAction {
  audience: "fishers" | "coastal_residents" | "village_officials" | "facility_operators" | "general_public";
  action: string;
  priority: "recommended" | "urgent" | "critical";
  timeHorizon: "now" | "within_3h" | "within_6h" | "within_24h";
  evidenceIds: string[];
}

export interface IbfBulletin {
  hazardType: HazardType;
  village: string;
  district: string;
  province: string;
  adm4Code: string;
  impactLevel: ImpactLevel;
  validFrom: string;
  validUntil: string;
  generatedAt: string;
  headline: string;
  summary: string;
  affectedGroups: string[];
  actions: IbfAction[];
  evidence: EvidenceItem[];
  uncertaintyNotes: string[];
  disclaimer: string;
}

export interface WeatherSlot {
  time: string;
  description: string;
  tempC: number;
  windMs: number;
  windFrom: string;
  cloudPct: number;
  waveM: number;
  wavePeriodS: number;
}

export interface Conditions {
  regionName: string;
  fetchedAt: string;
  sourceUpdatedAt: string;
  slots: WeatherSlot[];
}

export interface Hotspot {
  id: string;
  position: LatLng;
  sensor: string;
  acquiredAt: string;
  confidence: "low" | "nominal" | "high";
  frp: number;
}

export type FacilityType = "school" | "puskesmas" | "hospital";

export interface Facility {
  id: string;
  name: string;
  type: FacilityType;
  position: LatLng;
  verification: "unverified" | "checked" | "confirmed";
  verifiedAt: string | null;
  exposed: boolean;
  distanceKm: number | null;
}

export type ReportStatus =
  | "submitted"
  | "needs_review"
  | "verified"
  | "rejected"
  | "duplicate";

export interface VisionResult {
  classification: string;
  urgency: "low" | "moderate" | "high" | "critical";
  confidence: Confidence;
  waterDepthCm: number | null;
  depthBasis: string;
  observations: string[];
  hazards: string[];
  limitations: string[];
  integrity: "no_obvious_visual_inconsistency" | "suspicious_visual_artifacts" | "inconclusive";
  nextAction: string;
  reviewRequired: boolean;
}

export interface Report {
  id: string;
  title: string;
  type: "flood_report" | "road_damage" | "coastal_hazard" | "other";
  description: string;
  position: LatLng;
  village: string;
  observedAt: string;
  submittedAt: string;
  status: ReportStatus;
  severity: "low" | "moderate" | "high" | "critical" | "unknown";
  reporterMasked: string;
  photo: string;
  ai: VisionResult | null;
  reviewNote: string | null;
  dataMode: "live" | "simulation";
}

export interface HazardPolygon {
  id: string;
  label: string;
  kind: "flood" | "smoke_corridor" | "tsunami_zone" | "shaking";
  positions: LatLng[];
  source: SourceName;
  indicative: boolean;
}

export interface Shelter {
  id: string;
  name: string;
  position: LatLng;
  capacity: number | null;
  availability: "available" | "limited" | "full" | "closed" | "unknown";
  verifiedAt: string | null;
}

export type RoadStatus = "OPEN" | "CAUTION" | "BLOCKED" | "UNKNOWN";

export interface RouteSegment {
  positions: LatLng[];
  status: RoadStatus;
  note: string;
}

export interface RouteCandidate {
  id: string;
  name: string;
  distanceKm: number;
  durationMin: number;
  affectedSegments: number;
  decision: "recommended" | "caution" | "not_recommended";
  rationale: string;
  requiresOfficerApproval: boolean;
  computedAt: string;
  segments: RouteSegment[];
}

export interface Earthquake {
  magnitude: number;
  depthKm: number;
  region: string;
  occurredAt: string;
  position: LatLng;
  potential: string;
  felt: string;
  shakemapUrl?: string | null;
}

export interface WeatherAlertDetail {
  event: string;
  headline: string;
  description: string;
  effective: string | null;
  expires: string | null;
  severity: string;
  urgency: string;
  certainty: string;
  sender: string;
  web: string | null;
  polygons: LatLng[][];
}

export interface WeatherAlert {
  id: string;
  title: string;
  link: string;
  description: string;
  publishedAt: string | null;
  inRegion: boolean;
  detail: WeatherAlertDetail | null;
}

export interface SourceStatus {
  key: "forecast" | "earthquakes" | "alerts" | "sample";
  label: string;
  status: "LIVE" | "STALE" | "LOADING" | "ERROR" | "SAMPLE" | "SIMULATION";
  updatedAt: string | null;
  note: string | null;
}

export interface Region {
  adm4: string;
  village: string;
  district: string;
  city: string;
  province: string;
}

export interface Scenario {
  code: string;
  name: string;
  description: string;
  hazardType: HazardType;
  center: LatLng;
  zoom: number;
  testsModules: string[];
  conditions: Conditions;
  bulletin: IbfBulletin;
  hotspots: Hotspot[];
  facilities: Facility[];
  reports: Report[];
  polygons: HazardPolygon[];
  shelters: Shelter[];
  routes: RouteCandidate[];
  earthquake: Earthquake | null;
  windVector: { fromDeg: number; speedMs: number } | null;
}

export interface Campaign {
  id: string;
  title: string;
  url: string;
  category: "flood" | "wildfire" | "mangrove" | "earthquake" | "humanitarian" | "other";
  summary: string;
  area: string;
  status: "active" | "ended" | "unverified" | "hidden";
  verification: "verified" | "needs_recheck" | "invalid";
  verifiedAt: string | null;
}

export interface MangroveAudit {
  id: string;
  plotCode: string;
  plotName: string;
  observedAt: string;
  position: LatLng;
  plantedCount: number | null;
  survivingCount: number | null;
  verification: "pending" | "verified" | "rejected";
  erosionRisk: "low" | "moderate" | "high" | "unknown";
  condition: "healthy_appearing" | "needs_attention" | "severely_damaged_appearing" | "not_assessable";
  visibleSeedlings: number | null;
  stressSigns: string[];
  limitations: string[];
  photo: string;
}

export type UserRole = "citizen" | "community" | "bpbd_admin";

export interface DemoUser {
  email: string;
  displayName: string;
  role: UserRole;
}

export interface SamplePhoto {
  id: string;
  title: string;
  kind: "flood_report" | "mangrove_audit";
  src: string;
  origin: string;
  license: string;
  result: VisionResult;
}
