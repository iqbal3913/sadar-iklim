import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-teal-soft text-teal">
        <Compass className="size-6" aria-hidden />
      </span>
      <h1 className="mt-5 text-2xl font-bold text-ink">Halaman tidak ditemukan</h1>
      <p className="mt-2 text-sm text-muted">Alamat yang Anda buka tidak ada atau sudah dipindahkan</p>
      <Link href="/" className="mt-6 inline-flex rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-deep">
        Kembali ke Peta
      </Link>
    </div>
  );
}
