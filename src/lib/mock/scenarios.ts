import type { IbfBulletin, Report, RouteCandidate, Scenario, VisionResult } from "../types";
import { samplePhotos } from "./samples";

const disclaimer =
  "SIMULASI untuk keperluan demo. Bukan peringatan resmi BMKG, BNPB, atau BPBD";

const floodAi: VisionResult = samplePhotos[0].result;
const roadAi: VisionResult = samplePhotos[2].result;

function report(partial: Partial<Report> & Pick<Report, "id" | "title" | "position" | "village" | "photo">): Report {
  return {
    type: "flood_report",
    description: "Laporan simulasi untuk demo",
    observedAt: "2026-11-12T06:40:00+07:00",
    submittedAt: "2026-11-12T06:55:00+07:00",
    status: "needs_review",
    severity: "unknown",
    reporterMasked: "Warga S***",
    ai: null,
    reviewNote: null,
    dataMode: "simulation",
    ...partial,
  };
}

const robBulletin: IbfBulletin = {
  hazardType: "coastal_flood",
  village: "Pasar Baru",
  district: "Teluk Segara",
  province: "Bengkulu",
  adm4Code: "SIM-ROB-01",
  impactLevel: "high",
  validFrom: "2026-11-12T06:00:00+07:00",
  validUntil: "2026-11-12T18:00:00+07:00",
  generatedAt: "2026-11-12T06:05:00+07:00",
  headline: "Rob dan hujan ekstrem, genangan meluas di kawasan pesisir kota",
  summary:
    "Air pasang bertemu hujan ekstrem. Genangan diperkirakan meluas di jalan pesisir dan dua sekolah. Warga di zona genangan perlu bersiap berpindah ke tempat yang lebih tinggi bila air terus naik",
  affectedGroups: ["fishers", "coastal_residents", "children", "village_officials", "public_facility_operators"],
  actions: [
    { audience: "coastal_residents", action: "Siapkan tas darurat dan pindahkan barang berharga ke lantai atas", priority: "urgent", timeHorizon: "now", evidenceIds: ["ev1", "ev3"] },
    { audience: "fishers", action: "Jangan melaut dan amankan perahu di tempat tinggi", priority: "critical", timeHorizon: "now", evidenceIds: ["ev2"] },
    { audience: "facility_operators", action: "Pantau dua sekolah di zona genangan dan siapkan pemindahan siswa bila diminta petugas", priority: "urgent", timeHorizon: "within_3h", evidenceIds: ["ev3"] },
    { audience: "village_officials", action: "Koordinasikan titik kumpul dan periksa ruas jalan yang ditandai waspada", priority: "urgent", timeHorizon: "within_3h", evidenceIds: ["ev3", "ev4"] },
  ],
  evidence: [
    { id: "ev1", source: "BMKG", observation: "Peringatan hujan lebat disertai petir (simulasi) berlaku sampai pukul 12.00", observedAt: "2026-11-12T06:00:00+07:00" },
    { id: "ev2", source: "OPEN_METEO", observation: "Gelombang 3,1 meter dengan periode 12 detik (simulasi)", observedAt: "2026-11-12T06:00:00+07:00" },
    { id: "ev3", source: "BNPB_INARISK", observation: "Poligon genangan simulasi menyentuh dua sekolah", observedAt: null },
    { id: "ev4", source: "CITIZEN_REPORT", observation: "Dua laporan foto menunggu verifikasi petugas", observedAt: "2026-11-12T06:55:00+07:00" },
  ],
  uncertaintyNotes: ["Data simulasi, bukan observasi", "Laporan warga belum diverifikasi dan belum menutup jalan"],
  disclaimer,
};

const robRoutes: RouteCandidate[] = [
  {
    id: "rt-rob-a",
    name: "Rute A, lewat Jalan Soekarno-Hatta",
    distanceKm: 3.4,
    durationMin: 12,
    affectedSegments: 0,
    decision: "recommended",
    rationale: "Tidak melewati zona genangan simulasi dan seluruh ruas berstatus terbuka",
    requiresOfficerApproval: true,
    computedAt: "2026-11-12T06:20:00+07:00",
    segments: [
      { positions: [[-3.7961, 102.2498], [-3.7935, 102.2585], [-3.7898, 102.2672]], status: "OPEN", note: "Terbuka" },
      { positions: [[-3.7898, 102.2672], [-3.7889, 102.2685]], status: "OPEN", note: "Terbuka" },
    ],
  },
  {
    id: "rt-rob-b",
    name: "Rute B, lewat Jalan Pantai Panjang",
    distanceKm: 2.6,
    durationMin: 9,
    affectedSegments: 2,
    decision: "caution",
    rationale: "Lebih pendek, tetapi dua ruas ditandai waspada karena laporan warga yang belum terverifikasi",
    requiresOfficerApproval: true,
    computedAt: "2026-11-12T06:20:00+07:00",
    segments: [
      { positions: [[-3.7961, 102.2498], [-3.8035, 102.2545]], status: "CAUTION", note: "Laporan warga, belum terverifikasi" },
      { positions: [[-3.8035, 102.2545], [-3.8089, 102.2539]], status: "UNKNOWN", note: "Status belum diketahui" },
      { positions: [[-3.8089, 102.2539], [-3.8051, 102.2917]], status: "BLOCKED", note: "Genangan terkonfirmasi petugas" },
    ],
  },
];

const karhutlaBulletin: IbfBulletin = {
  hazardType: "multi_hazard",
  village: "Pangkalan Lampam",
  district: "Kayu Agung",
  province: "Sumatera Selatan",
  adm4Code: "SIM-KARHUTLA-02",
  impactLevel: "high",
  validFrom: "2026-11-12T08:00:00+07:00",
  validUntil: "2026-11-13T08:00:00+07:00",
  generatedAt: "2026-11-12T08:10:00+07:00",
  headline: "Banyak titik panas di lahan gambut, asap mengarah ke permukiman",
  summary:
    "Sebelas titik panas terdeteksi dalam tiga jam terakhir. Angin dari tenggara mengarahkan asap ke barat laut. Koridor asap bersifat indikatif dan perlu diperiksa petugas di lapangan",
  affectedGroups: ["children", "older_people", "public_facility_operators", "forest_communities", "village_officials"],
  actions: [
    { audience: "general_public", action: "Kurangi aktivitas luar ruangan dan gunakan masker bila asap terasa", priority: "urgent", timeHorizon: "now", evidenceIds: ["ev1", "ev2"] },
    { audience: "facility_operators", action: "Pantau kualitas udara di sekolah dan Puskesmas yang berada di koridor indikatif", priority: "urgent", timeHorizon: "within_3h", evidenceIds: ["ev3"] },
    { audience: "village_officials", action: "Kirim tim periksa ke titik panas berconfidence tinggi dan laporkan hasilnya", priority: "critical", timeHorizon: "within_3h", evidenceIds: ["ev1"] },
  ],
  evidence: [
    { id: "ev1", source: "NASA_FIRMS", observation: "11 titik panas VIIRS dan MODIS dalam 3 jam terakhir (simulasi)", observedAt: "2026-11-12T07:30:00+07:00" },
    { id: "ev2", source: "BMKG", observation: "Angin dari tenggara 5,5 meter per detik (simulasi)", observedAt: "2026-11-12T08:00:00+07:00" },
    { id: "ev3", source: "INTERNAL_RULE", observation: "Koridor indikatif memotong tiga fasilitas kritis", observedAt: "2026-11-12T08:10:00+07:00" },
  ],
  uncertaintyNotes: [
    "Titik panas adalah deteksi satelit, bukan konfirmasi kebakaran aktif",
    "Koridor asap bukan hasil model dispersi atmosfer",
  ],
  disclaimer,
};

const gempaBulletin: IbfBulletin = {
  hazardType: "earthquake",
  village: "Kuala Pesisir",
  district: "Pesisir Selatan",
  province: "Sumatera Barat",
  adm4Code: "SIM-GEMPA-03",
  impactLevel: "extreme",
  validFrom: "2026-11-12T10:00:00+07:00",
  validUntil: "2026-11-12T16:00:00+07:00",
  generatedAt: "2026-11-12T10:03:00+07:00",
  headline: "Gempa kuat di lepas pantai, ikuti arahan otoritas dan jauhi pantai",
  summary:
    "Gempa magnitudo 7,1 simulasi terjadi di lepas pantai. Warga di tepi pantai perlu menjauhi pantai dan menunggu informasi resmi BMKG. Rute ke shelter di bawah ditandai sebagai kandidat yang perlu disetujui petugas",
  affectedGroups: ["coastal_residents", "fishers", "children", "older_people", "people_with_disabilities", "village_officials"],
  actions: [
    { audience: "coastal_residents", action: "Jauhi pantai dan menuju tempat yang lebih tinggi bila merasakan guncangan kuat", priority: "critical", timeHorizon: "now", evidenceIds: ["ev1"] },
    { audience: "village_officials", action: "Aktifkan titik kumpul dan tunggu arahan resmi BPBD sebelum mengerahkan evakuasi", priority: "critical", timeHorizon: "now", evidenceIds: ["ev1", "ev2"] },
    { audience: "fishers", action: "Jangan kembali ke pantai sebelum ada pernyataan resmi aman", priority: "urgent", timeHorizon: "within_3h", evidenceIds: ["ev2"] },
  ],
  evidence: [
    { id: "ev1", source: "BMKG", observation: "Gempa M7,1 kedalaman 28 km di lepas pantai (data replay simulasi)", observedAt: "2026-11-12T09:58:00+07:00" },
    { id: "ev2", source: "INTERNAL_RULE", observation: "Zona pesisir dalam jarak 10 km dari garis pantai dikategorikan zona waspada", observedAt: "2026-11-12T10:03:00+07:00" },
  ],
  uncertaintyNotes: ["Data replay simulasi", "Peringatan tsunami hanya berasal dari BMKG"],
  disclaimer,
};

export const scenarios: Scenario[] = [
  {
    code: "ROB-URBAN-01",
    name: "Banjir rob dan perkotaan ekstrem",
    description: "Pasang tinggi bertemu hujan ekstrem di kota pesisir. Menguji IBF, triase foto, fasilitas, penutupan ruas jalan, dan kampanye bantuan",
    hazardType: "coastal_flood",
    center: [-3.8, 102.262],
    zoom: 13,
    testsModules: ["IBF", "Triase foto", "Fasilitas", "Rute", "Kampanye"],
    conditions: {
      regionName: "Pasar Baru, Kota Bengkulu (simulasi)",
      fetchedAt: "2026-11-12T06:05:00+07:00",
      sourceUpdatedAt: "2026-11-12T06:00:00+07:00",
      slots: [
        { time: "2026-11-12T06:00:00+07:00", description: "Hujan Lebat", tempC: 25, windMs: 9.2, windFrom: "Barat Daya", cloudPct: 98, waveM: 3.1, wavePeriodS: 12 },
        { time: "2026-11-12T09:00:00+07:00", description: "Hujan Petir", tempC: 25, windMs: 10.4, windFrom: "Barat Daya", cloudPct: 100, waveM: 3.4, wavePeriodS: 12 },
        { time: "2026-11-12T12:00:00+07:00", description: "Hujan Lebat", tempC: 26, windMs: 8.1, windFrom: "Barat", cloudPct: 95, waveM: 2.9, wavePeriodS: 11 },
        { time: "2026-11-12T15:00:00+07:00", description: "Hujan Sedang", tempC: 27, windMs: 6.0, windFrom: "Barat", cloudPct: 90, waveM: 2.4, wavePeriodS: 10 },
      ],
    },
    bulletin: robBulletin,
    hotspots: [],
    facilities: [
      { id: "sf1", name: "SDN Pasar Baru", type: "school", position: [-3.7961, 102.2498], verification: "checked", verifiedAt: "2026-10-28T09:00:00+07:00", exposed: true, distanceKm: 0.2 },
      { id: "sf2", name: "SMPN Pantai Panjang", type: "school", position: [-3.8123, 102.2554], verification: "unverified", verifiedAt: null, exposed: true, distanceKm: 0.4 },
      { id: "sf3", name: "Puskesmas Anggut Atas", type: "puskesmas", position: [-3.7902, 102.2631], verification: "checked", verifiedAt: "2026-10-28T09:00:00+07:00", exposed: false, distanceKm: 1.2 },
      { id: "sf4", name: "RSUD M. Yunus", type: "hospital", position: [-3.8077, 102.2788], verification: "confirmed", verifiedAt: "2026-10-28T09:00:00+07:00", exposed: false, distanceKm: 2.0 },
    ],
    reports: [
      report({ id: "r-sim-1", title: "Jalan Pantai Panjang tergenang setinggi lutut", position: [-3.8089, 102.2539], village: "Pasar Baru", photo: "/demo/flood-road-reference.svg", severity: "high", ai: floodAi }),
      report({ id: "r-sim-2", title: "Halaman rumah tergenang, tidak ada penanda tinggi", position: [-3.8001, 102.2511], village: "Pasar Baru", photo: "/demo/flood-house-no-scale.svg", severity: "moderate", ai: samplePhotos[1].result }),
      report({ id: "r-sim-3", title: "Jembatan kecil rusak dan arus deras", type: "road_damage", position: [-3.8035, 102.2545], village: "Pasar Baru", photo: "/demo/damaged-road.svg", severity: "critical", ai: roadAi, status: "verified", reviewNote: "Dikonfirmasi petugas di lokasi, ruas ditandai waspada" }),
    ],
    polygons: [
      { id: "pg1", label: "Zona genangan simulasi", kind: "flood", positions: [[-3.792, 102.2455], [-3.8, 102.2425], [-3.8165, 102.2515], [-3.8135, 102.2635], [-3.8005, 102.2605], [-3.7945, 102.2545]], source: "BNPB_INARISK", indicative: false },
    ],
    shelters: [
      { id: "s1", name: "Gedung Olahraga Sawah Lebar", position: [-3.8051, 102.2917], capacity: 400, availability: "available", verifiedAt: "2026-10-30T10:00:00+07:00" },
      { id: "s2", name: "Aula Kelurahan Anggut", position: [-3.7889, 102.2685], capacity: null, availability: "unknown", verifiedAt: null },
    ],
    routes: robRoutes,
    earthquake: null,
    windVector: null,
  },
  {
    code: "KARHUTLA-GAMBUT-02",
    name: "Darurat karhutla lahan gambut",
    description: "Titik panas pada lahan gambut dengan angin tenggara. Menguji hotspot, koridor asap indikatif, irisan fasilitas kritis, dan kalkulator logistik",
    hazardType: "wildfire",
    center: [-3.32, 105.18],
    zoom: 10,
    testsModules: ["Hotspot", "Koridor asap", "Irisan fasilitas", "Rute waspada", "Logistik"],
    conditions: {
      regionName: "Pangkalan Lampam, OKI (simulasi)",
      fetchedAt: "2026-11-12T08:10:00+07:00",
      sourceUpdatedAt: "2026-11-12T08:00:00+07:00",
      slots: [
        { time: "2026-11-12T09:00:00+07:00", description: "Berasap", tempC: 33, windMs: 5.5, windFrom: "Tenggara", cloudPct: 40, waveM: 0, wavePeriodS: 0 },
        { time: "2026-11-12T12:00:00+07:00", description: "Berasap", tempC: 35, windMs: 5.9, windFrom: "Tenggara", cloudPct: 35, waveM: 0, wavePeriodS: 0 },
        { time: "2026-11-12T15:00:00+07:00", description: "Cerah Berawan", tempC: 34, windMs: 4.8, windFrom: "Tenggara", cloudPct: 45, waveM: 0, wavePeriodS: 0 },
      ],
    },
    bulletin: karhutlaBulletin,
    hotspots: [
      { id: "h1", position: [-3.35, 105.22], sensor: "VIIRS_SNPP_NRT", acquiredAt: "2026-11-12T07:30:00+07:00", confidence: "high", frp: 22.4 },
      { id: "h2", position: [-3.37, 105.25], sensor: "VIIRS_NOAA20_NRT", acquiredAt: "2026-11-12T07:36:00+07:00", confidence: "high", frp: 31.1 },
      { id: "h3", position: [-3.33, 105.27], sensor: "VIIRS_SNPP_NRT", acquiredAt: "2026-11-12T07:30:00+07:00", confidence: "nominal", frp: 12.7 },
      { id: "h4", position: [-3.4, 105.2], sensor: "MODIS_NRT", acquiredAt: "2026-11-12T06:50:00+07:00", confidence: "nominal", frp: 18.2 },
      { id: "h5", position: [-3.38, 105.3], sensor: "VIIRS_NOAA21_NRT", acquiredAt: "2026-11-12T07:42:00+07:00", confidence: "low", frp: 5.3 },
      { id: "h6", position: [-3.31, 105.21], sensor: "VIIRS_SNPP_NRT", acquiredAt: "2026-11-12T07:30:00+07:00", confidence: "high", frp: 27.6 },
    ],
    facilities: [
      { id: "kf1", name: "SDN 4 Pangkalan Lampam", type: "school", position: [-3.2905, 105.1558], verification: "checked", verifiedAt: "2026-10-28T09:00:00+07:00", exposed: true, distanceKm: 7.8 },
      { id: "kf2", name: "Puskesmas Pangkalan Lampam", type: "puskesmas", position: [-3.2742, 105.1301], verification: "confirmed", verifiedAt: "2026-10-28T09:00:00+07:00", exposed: true, distanceKm: 11.4 },
      { id: "kf3", name: "SMPN 2 Kayu Agung", type: "school", position: [-3.2488, 105.1054], verification: "unverified", verifiedAt: null, exposed: true, distanceKm: 15.3 },
      { id: "kf4", name: "RSUD Kayu Agung", type: "hospital", position: [-3.4022, 105.0415], verification: "confirmed", verifiedAt: "2026-10-28T09:00:00+07:00", exposed: false, distanceKm: 18.9 },
    ],
    reports: [],
    polygons: [
      { id: "pl6", label: "Koridor asap indikatif 6 jam", kind: "smoke_corridor", positions: [[-3.33, 105.22], [-3.27, 105.14], [-3.3, 105.1], [-3.37, 105.19]], source: "INTERNAL_RULE", indicative: true },
      { id: "pl12", label: "Koridor asap indikatif 12 jam", kind: "smoke_corridor", positions: [[-3.27, 105.14], [-3.2, 105.05], [-3.25, 105.0], [-3.3, 105.1]], source: "INTERNAL_RULE", indicative: true },
    ],
    shelters: [
      { id: "ks1", name: "Gedung Serbaguna Kayu Agung", position: [-3.4018, 105.0382], capacity: 250, availability: "available", verifiedAt: "2026-10-30T10:00:00+07:00" },
    ],
    routes: [
      {
        id: "rt-kar-a",
        name: "Rute ke Gedung Serbaguna, lewat jalan lintas timur",
        distanceKm: 22.4,
        durationMin: 38,
        affectedSegments: 1,
        decision: "caution",
        rationale: "Satu ruas melewati koridor asap indikatif sehingga diberi penalti dan peringatan jarak pandang",
        requiresOfficerApproval: true,
        computedAt: "2026-11-12T08:20:00+07:00",
        segments: [
          { positions: [[-3.2905, 105.1558], [-3.31, 105.12], [-3.35, 105.08]], status: "CAUTION", note: "Berada di koridor asap indikatif" },
          { positions: [[-3.35, 105.08], [-3.4018, 105.0382]], status: "OPEN", note: "Terbuka" },
        ],
      },
    ],
    earthquake: null,
    windVector: { fromDeg: 135, speedMs: 5.5 },
  },
  {
    code: "GEMPA-PESISIR-03",
    name: "Gempa dan peringatan pesisir",
    description: "Replay gempa kuat di lepas pantai. Menguji panel gempa, IBF pesisir, kandidat rute ke shelter, dan bukti sumber",
    hazardType: "earthquake",
    center: [-1.45, 100.35],
    zoom: 9,
    testsModules: ["Panel gempa", "IBF pesisir", "Rute kandidat", "Bukti sumber"],
    conditions: {
      regionName: "Pesisir Selatan, Sumatera Barat (simulasi)",
      fetchedAt: "2026-11-12T10:03:00+07:00",
      sourceUpdatedAt: "2026-11-12T10:00:00+07:00",
      slots: [
        { time: "2026-11-12T10:00:00+07:00", description: "Cerah Berawan", tempC: 29, windMs: 3.1, windFrom: "Barat", cloudPct: 40, waveM: 1.2, wavePeriodS: 8 },
        { time: "2026-11-12T13:00:00+07:00", description: "Berawan", tempC: 30, windMs: 3.6, windFrom: "Barat", cloudPct: 55, waveM: 1.4, wavePeriodS: 8 },
      ],
    },
    bulletin: gempaBulletin,
    hotspots: [],
    facilities: [
      { id: "gf1", name: "Puskesmas Kuala Pesisir", type: "puskesmas", position: [-1.5, 100.4], verification: "checked", verifiedAt: "2026-10-28T09:00:00+07:00", exposed: true, distanceKm: 0.8 },
      { id: "gf2", name: "SDN 11 Kuala Pesisir", type: "school", position: [-1.52, 100.41], verification: "checked", verifiedAt: "2026-10-28T09:00:00+07:00", exposed: true, distanceKm: 1.1 },
    ],
    reports: [],
    polygons: [
      { id: "tz", label: "Zona waspada pesisir simulasi", kind: "tsunami_zone", positions: [[-1.42, 100.3], [-1.6, 100.38], [-1.62, 100.45], [-1.45, 100.42]], source: "INTERNAL_RULE", indicative: true },
    ],
    shelters: [
      { id: "gs1", name: "Bukit Evakuasi Kuala", position: [-1.48, 100.5], capacity: 600, availability: "limited", verifiedAt: "2026-10-30T10:00:00+07:00" },
    ],
    routes: [
      {
        id: "rt-gem-a",
        name: "Rute ke Bukit Evakuasi",
        distanceKm: 6.1,
        durationMin: 14,
        affectedSegments: 0,
        decision: "recommended",
        rationale: "Menuju daratan tinggi dan tidak melewati zona waspada. Perlu persetujuan petugas",
        requiresOfficerApproval: true,
        computedAt: "2026-11-12T10:08:00+07:00",
        segments: [
          { positions: [[-1.5, 100.4], [-1.49, 100.45], [-1.48, 100.5]], status: "OPEN", note: "Terbuka" },
        ],
      },
    ],
    earthquake: {
      magnitude: 7.1,
      depthKm: 28,
      region: "Lepas pantai Pesisir Selatan (replay simulasi)",
      occurredAt: "2026-11-12T09:58:00+07:00",
      position: [-1.62, 100.1],
      potential: "Tidak berpotensi tsunami menurut skenario ini. Selalu ikuti pernyataan resmi BMKG",
      felt: "Dirasakan kuat di wilayah pesisir (simulasi)",
    },
    windVector: null,
  },
];

export function getScenario(code: string): Scenario | undefined {
  return scenarios.find((s) => s.code === code);
}
