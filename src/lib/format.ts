const tz = "Asia/Jakarta";

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: tz,
    hour12: false,
  }).format(new Date(iso)) + " WIB";
}

export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: tz,
    hour12: false,
  }).format(new Date(iso));
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: tz,
  }).format(new Date(iso));
}

export function survivalRate(planted: number | null, surviving: number | null): number | null {
  if (planted === null || surviving === null || planted <= 0) return null;
  return Math.round((surviving / planted) * 1000) / 10;
}

export const impactLabel = {
  low: "Rendah",
  moderate: "Sedang",
  high: "Tinggi",
  extreme: "Ekstrem",
} as const;

export const urgencyLabel = {
  low: "Rendah",
  moderate: "Sedang",
  high: "Tinggi",
  critical: "Kritis",
  unknown: "Belum dinilai",
} as const;

export const audienceLabel: Record<string, string> = {
  fishers: "Nelayan",
  coastal_residents: "Warga pesisir",
  village_officials: "Aparat desa",
  facility_operators: "Pengelola fasilitas",
  general_public: "Masyarakat umum",
  children: "Anak-anak",
  older_people: "Lansia",
  people_with_disabilities: "Penyandang disabilitas",
  public_facility_operators: "Pengelola fasilitas publik",
  forest_communities: "Komunitas sekitar hutan",
};

export const priorityLabel = {
  recommended: "Disarankan",
  urgent: "Mendesak",
  critical: "Kritis",
} as const;

export const horizonLabel = {
  now: "Sekarang",
  within_3h: "Dalam 3 jam",
  within_6h: "Dalam 6 jam",
  within_24h: "Dalam 24 jam",
} as const;

export const sourceLabel: Record<string, string> = {
  BMKG: "BMKG",
  OPEN_METEO: "Open-Meteo",
  BNPB_INARISK: "BNPB InaRISK",
  NASA_FIRMS: "NASA FIRMS",
  CITIZEN_REPORT: "Laporan warga",
  INTERNAL_RULE: "Aturan sistem",
};

export const statusLabel = {
  submitted: "Terkirim",
  needs_review: "Menunggu verifikasi",
  verified: "Terverifikasi",
  rejected: "Ditolak",
  duplicate: "Duplikat",
} as const;

export const hazardLabel = {
  coastal_flood: "Banjir rob",
  wildfire: "Karhutla",
  earthquake: "Gempa",
  multi_hazard: "Multi-bahaya",
} as const;

export const facilityLabel = {
  school: "Sekolah",
  puskesmas: "Puskesmas",
  hospital: "Rumah sakit",
} as const;

export const roadStatusLabel = {
  OPEN: "Terbuka",
  CAUTION: "Waspada",
  BLOCKED: "Tertutup",
  UNKNOWN: "Belum diketahui",
} as const;

export const categoryLabel = {
  flood: "Banjir",
  wildfire: "Karhutla",
  mangrove: "Mangrove",
  earthquake: "Gempa",
  humanitarian: "Kemanusiaan",
  other: "Lainnya",
} as const;

export const conditionLabel = {
  healthy_appearing: "Tampak sehat",
  needs_attention: "Perlu perhatian",
  severely_damaged_appearing: "Tampak rusak berat",
  not_assessable: "Tidak dapat dinilai",
} as const;

export const integrityLabel = {
  no_obvious_visual_inconsistency: "Tidak ada kejanggalan visual yang jelas",
  suspicious_visual_artifacts: "Ada artefak visual yang mencurigakan",
  inconclusive: "Belum dapat disimpulkan",
} as const;

export const classificationLabel: Record<string, string> = {
  flooding: "Banjir",
  fast_water_flow: "Arus deras",
  road_damage: "Kerusakan jalan",
  road_inaccessible: "Jalan tidak dapat dilalui",
  mangrove_vegetation: "Vegetasi mangrove",
  shoreline_erosion_signs: "Tanda erosi garis pantai",
  other: "Lainnya",
  unclassifiable: "Tidak dapat diklasifikasi",
};
