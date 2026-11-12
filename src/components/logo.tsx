import { useId } from "react";

export function LogoMark({ className }: { className?: string }) {
  const id = useId();
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <defs>
        <linearGradient id={id} x1="6" y1="4" x2="42" y2="46" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2dd4bf" />
          <stop offset="1" stopColor="#0f766e" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="13" fill={`url(#${id})`} />
      <path d="M24 29V17" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" fill="none" />
      <path d="M24 21.5c0-5.5 4.2-9 10.5-9 0 5.8-3.8 9.6-10.5 9Z" fill="#fff" />
      <path d="M24 26c0-4.4-3.2-7.2-8.8-7.2 0 4.7 3.2 7.7 8.8 7.2Z" fill="#fff" fillOpacity="0.82" />
      <path d="M8 34c4-3.2 8-3.2 12 0s8 3.2 12 0 6-2.4 8-1.2" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" fill="none" />
      <path d="M8 40.5c4-3.2 8-3.2 12 0s8 3.2 12 0 6-2.4 8-1.2" stroke="#fff" strokeOpacity="0.55" strokeWidth="2.8" strokeLinecap="round" fill="none" />
    </svg>
  );
}
