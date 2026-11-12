import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-10 border-t border-line bg-surface">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-3 px-4 py-6 text-xs text-muted md:flex-row md:items-center md:justify-between">
        <p>
          Alat bantu keputusan, bukan pengganti BMKG, BNPB, atau BPBD. Ikuti instruksi resmi otoritas setempat
          <br />
          SadarIklim — IT RUSH 2026, Mitigasi Bencana dan Perubahan Iklim. Data: BMKG, Open-Meteo, NASA FIRMS, BNPB
          InaRISK, © OpenStreetMap contributors
        </p>
        <nav aria-label="Tautan kaki" className="flex gap-4 font-medium text-ink-soft">
          <Link href="/about" className="hover:text-teal">Tentang</Link>
          <Link href="/sources" className="hover:text-teal">Sumber data</Link>
          <Link href="/judge-mode" className="hover:text-teal">Judge Mode</Link>
        </nav>
      </div>
    </footer>
  );
}
