import type { Conditions, Facility, IbfBulletin, Report, Shelter } from "../types";

export const LIVE_CENTER: [number, number] = [-3.8, 102.262];
export const LIVE_ZOOM = 12;

export const liveConditions: Conditions = {
  regionName: "Kelurahan Pasar Baru, Kota Bengkulu",
  fetchedAt: "2026-11-12T19:10:00+07:00",
  sourceUpdatedAt: "2026-11-12T12:00:00+07:00",
  slots: [
    { time: "2026-11-12T21:00:00+07:00", description: "Hujan Ringan", tempC: 27, windMs: 4.2, windFrom: "Barat Daya", cloudPct: 85, waveM: 1.6, wavePeriodS: 9 },
    { time: "2026-11-13T00:00:00+07:00", description: "Hujan Sedang", tempC: 26, windMs: 5.8, windFrom: "Barat Daya", cloudPct: 92, waveM: 2.1, wavePeriodS: 10 },
    { time: "2026-11-13T03:00:00+07:00", description: "Hujan Sedang", tempC: 25, windMs: 6.4, windFrom: "Barat", cloudPct: 95, waveM: 2.4, wavePeriodS: 10 },
    { time: "2026-11-13T06:00:00+07:00", description: "Berawan Tebal", tempC: 26, windMs: 5.1, windFrom: "Barat", cloudPct: 90, waveM: 2.2, wavePeriodS: 9 },
    { time: "2026-11-13T09:00:00+07:00", description: "Hujan Ringan", tempC: 28, windMs: 4.4, windFrom: "Barat Daya", cloudPct: 80, waveM: 1.9, wavePeriodS: 9 },
    { time: "2026-11-13T12:00:00+07:00", description: "Berawan", tempC: 30, windMs: 3.6, windFrom: "Selatan", cloudPct: 65, waveM: 1.5, wavePeriodS: 8 },
  ],
};

export const liveBulletin: IbfBulletin = {
  hazardType: "coastal_flood",
  village: "Pasar Baru",
  district: "Teluk Segara",
  province: "Bengkulu",
  adm4Code: "17.71.01.1001",
  impactLevel: "moderate",
  validFrom: "2026-11-12T21:00:00+07:00",
  validUntil: "2026-11-13T09:00:00+07:00",
  generatedAt: "2026-11-12T19:12:00+07:00",
  headline: "Gelombang tinggi dan hujan sedang, waspadai genangan di pesisir",
  summary:
    "Hujan sedang dan gelombang sekitar 2 meter diperkirakan terjadi dini hari. Nelayan kecil sebaiknya menunda melaut. Warga dekat pantai perlu mengamankan barang dan dokumen di tempat tinggi",
  affectedGroups: ["fishers", "coastal_residents", "village_officials"],
  actions: [
    { audience: "fishers", action: "Tunda melaut sampai gelombang di bawah 1,5 meter", priority: "urgent", timeHorizon: "now", evidenceIds: ["ev-marine-1", "ev-rule-1"] },
    { audience: "coastal_residents", action: "Pindahkan dokumen dan barang elektronik ke tempat yang lebih tinggi", priority: "recommended", timeHorizon: "within_3h", evidenceIds: ["ev-bmkg-1"] },
    { audience: "village_officials", action: "Pantau titik rawan genangan dan siapkan kanal komunikasi warga", priority: "recommended", timeHorizon: "within_6h", evidenceIds: ["ev-bmkg-1", "ev-inarisk-1"] },
  ],
  evidence: [
    { id: "ev-bmkg-1", source: "BMKG", observation: "Hujan sedang pukul 00.00 hingga 03.00 WIB dengan tutupan awan lebih dari 90 persen", observedAt: "2026-11-12T12:00:00+07:00" },
    { id: "ev-marine-1", source: "OPEN_METEO", observation: "Tinggi gelombang puncak 2,4 meter dengan periode 10 detik", observedAt: "2026-11-12T18:00:00+07:00" },
    { id: "ev-inarisk-1", source: "BNPB_INARISK", observation: "Kelurahan berada pada kelas bahaya gelombang ekstrem dan abrasi sedang", observedAt: null },
    { id: "ev-rule-1", source: "INTERNAL_RULE", observation: "Ambang operasional gelombang untuk perahu kecil terlampaui", observedAt: "2026-11-12T19:12:00+07:00" },
  ],
  uncertaintyNotes: [
    "Prakiraan BMKG diperbarui dua kali sehari dan dapat berubah",
    "Tingkat dampak dihitung dari aturan, bukan dari model AI",
  ],
  disclaimer:
    "Rekomendasi sistem untuk membantu pemahaman situasi. Ikuti instruksi resmi BMKG, BNPB, dan BPBD setempat",
};

export const liveFacilities: Facility[] = [
  { id: "f1", name: "RSUD M. Yunus", type: "hospital", position: [-3.8077, 102.2788], verification: "confirmed", verifiedAt: "2026-10-28T09:00:00+07:00", exposed: false, distanceKm: 1.9 },
  { id: "f2", name: "Puskesmas Anggut Atas", type: "puskesmas", position: [-3.7902, 102.2631], verification: "checked", verifiedAt: "2026-10-28T09:00:00+07:00", exposed: false, distanceKm: 1.1 },
  { id: "f3", name: "SDN Pasar Baru", type: "school", position: [-3.7961, 102.2498], verification: "checked", verifiedAt: "2026-10-28T09:00:00+07:00", exposed: true, distanceKm: 0.3 },
  { id: "f4", name: "SMPN Pantai Panjang", type: "school", position: [-3.8123, 102.2554], verification: "unverified", verifiedAt: null, exposed: true, distanceKm: 0.5 },
];

export const liveShelters: Shelter[] = [
  { id: "s1", name: "Gedung Olahraga Sawah Lebar", position: [-3.8051, 102.2917], capacity: 400, availability: "available", verifiedAt: "2026-10-30T10:00:00+07:00" },
  { id: "s2", name: "Aula Kelurahan Anggut", position: [-3.7889, 102.2685], capacity: null, availability: "unknown", verifiedAt: null },
];

export const liveReports: Report[] = [
  {
    id: "r-live-1",
    title: "Genangan setinggi mata kaki di Jalan Pantai Panjang",
    type: "flood_report",
    description: "Air naik sejak sore, motor masih bisa lewat pelan",
    position: [-3.8089, 102.2539],
    village: "Pasar Baru",
    observedAt: "2026-11-12T17:40:00+07:00",
    submittedAt: "2026-11-12T17:52:00+07:00",
    status: "needs_review",
    severity: "moderate",
    reporterMasked: "Warga A***",
    photo: "/demo/flood-road-reference.svg",
    ai: null,
    reviewNote: null,
    dataMode: "live",
  },
];
