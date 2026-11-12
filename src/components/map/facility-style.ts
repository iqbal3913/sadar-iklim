export const facilityColor = { school: "#2563eb", puskesmas: "#0f766e", hospital: "#334155" } as const;

export const facilityExposedColor = "#b91c1c";

export const facilityLegend = [
  { label: "Sekolah", color: facilityColor.school },
  { label: "Puskesmas", color: facilityColor.puskesmas },
  { label: "Rumah sakit", color: facilityColor.hospital },
  { label: "Terpapar bahaya", color: facilityExposedColor },
] as const;
