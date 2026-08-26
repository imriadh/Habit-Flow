import type { ReactElement } from "react";

const P: Record<string, ReactElement> = {
  logo: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="6" />
      <path d="M7.5 16.5C7.5 11 11.5 8 16.8 7.6c-.3 5.3-3.3 9.3-8.8 9.3" />
      <path d="M7.5 16.5c2-4.5 5-7 8-8.2" />
    </>
  ),
  dashboard: (
    <>
      <rect x="3" y="3" width="8" height="10" rx="2" />
      <rect x="13" y="3" width="8" height="6" rx="2" />
      <rect x="13" y="11" width="8" height="10" rx="2" />
      <rect x="3" y="15" width="8" height="6" rx="2" />
    </>
  ),
  list: (
    <>
      <path d="M8.5 6.5H21M8.5 12H21M8.5 17.5H21" />
      <circle cx="4.2" cy="6.5" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="4.2" cy="12" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="4.2" cy="17.5" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2.5" />
      <path d="M3 9.5h18M8 3v4M16 3v4" />
      <path d="M7.5 13.5h3M7.5 17h6" />
    </>
  ),
  chart: (
    <>
      <path d="M3.5 20.5h17" />
      <path d="M6 20v-6.5M11 20V6.5M16 20v-9.5M20.5 20V10" />
    </>
  ),
  spark: (
    <>
      <path d="M12 3.5l1.7 4.8 4.8 1.7-4.8 1.7L12 16.5l-1.7-4.8-4.8-1.7 4.8-1.7z" />
      <path d="M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20.5c1.4-3.8 4.2-5.7 7.5-5.7s6.1 1.9 7.5 5.7" />
    </>
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2.8v2.6M12 18.6v2.6M2.8 12h2.6M18.6 12h2.6M5.2 5.2l1.9 1.9M16.9 16.9l1.9 1.9M18.8 5.2l-1.9 1.9M7.1 16.9l-1.9 1.9" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  check: <path d="M5 12.5l4.5 4.5L19 7" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  chevL: <path d="M14.5 5.5L8 12l6.5 6.5" />,
  chevR: <path d="M9.5 5.5L16 12l-6.5 6.5" />,
  chevD: <path d="M5.5 9.5L12 16l6.5-6.5" />,
  arrowL: (
    <>
      <path d="M19 12H5" />
      <path d="M11 6l-6 6 6 6" />
    </>
  ),
  dots: (
    <>
      <circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </>
  ),
  pencil: (
    <>
      <path d="M4 20l1-4L16.5 4.5a2.12 2.12 0 013 3L8 19z" />
      <path d="M13.5 6.5l3 3" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16M9.5 7V4.5h5V7" />
      <path d="M6 7l1 13.5h10L18 7" />
      <path d="M10 11v6M14 11v6" />
    </>
  ),
  pause: <path d="M9 5.5v13M15 5.5v13" />,
  play: <path d="M8.5 5.5l10 6.5-10 6.5z" />,
  archive: (
    <>
      <rect x="3" y="4" width="18" height="5" rx="1.5" />
      <path d="M5 9v10.5h14V9" />
      <path d="M10 13.5h4" />
    </>
  ),
  flame: (
    <>
      <path d="M12 3c1 3.2 5 5.2 5 9.2a5 5 0 01-10 0c0-2 1-3.6 2.1-5.1.4 1.4 1.3 2.1 2.4 2.2C10.6 7.3 11 5 12 3z" />
      <path d="M12 20.8a3 3 0 01-3-3c0-1.6 1.3-2.6 3-4 1.7 1.4 3 2.4 3 4a3 3 0 01-3 3z" />
    </>
  ),
  book: (
    <>
      <path d="M4 5.5A2.5 2.5 0 016.5 3H20v18H6.5A2.5 2.5 0 014 18.5z" />
      <path d="M4 18.5A2.5 2.5 0 016.5 16H20" />
      <path d="M9 8h6" />
    </>
  ),
  code: (
    <>
      <path d="M8.5 7L4 12l4.5 5" />
      <path d="M15.5 7L20 12l-4.5 5" />
      <path d="M13.2 5l-2.4 14" />
    </>
  ),
  dumbbell: (
    <>
      <path d="M7 8v8M4.5 9.5v5M17 8v8M19.5 9.5v5M7 12h10" />
    </>
  ),
  droplet: <path d="M12 3.5S6 10.2 6 14.2a6 6 0 0012 0c0-4-6-10.7-6-10.7z" />,
  moon: <path d="M20 14.5A8.5 8.5 0 019.5 4a8.5 8.5 0 1010.5 10.5z" />,
  globe: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17" />
      <path d="M12 3.5c2.8 3.4 2.8 13.6 0 17M12 3.5c-2.8 3.4-2.8 13.6 0 17" />
    </>
  ),
  leaf: (
    <>
      <path d="M6 19C6 10.5 12.5 5.5 20 5.5 20 13 15 19.5 6.5 19.5" />
      <path d="M6 19c2.5-5.5 6-9 10.5-11" />
    </>
  ),
  pen: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4z" />
    </>
  ),
  heart: (
    <path d="M12 20.5C7 16.6 3.5 13.2 3.5 9.7 3.5 7.1 5.5 5 8 5c1.6 0 3.1.8 4 2.1C12.9 5.8 14.4 5 16 5c2.5 0 4.5 2.1 4.5 4.7 0 3.5-3.5 6.9-8.5 10.8z" />
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  bell: (
    <>
      <path d="M6 9.5a6 6 0 0112 0c0 5 2 6.2 2 6.2H4s2-1.2 2-6.2z" />
      <path d="M10.4 19.5a1.8 1.8 0 003.2 0" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5 5l1.7 1.7M17.3 17.3L19 19M19 5l-1.7 1.7M6.7 17.3L5 19" />
    </>
  ),
  download: (
    <>
      <path d="M12 3.5V15M7.5 10.5l4.5 4.5 4.5-4.5" />
      <path d="M4.5 20.5h15" />
    </>
  ),
  refresh: (
    <>
      <path d="M4.5 5.5v4.6h4.6" />
      <path d="M19.5 18.5v-4.6h-4.6" />
      <path d="M5 10a7.5 7.5 0 0112.8-3.3L19.5 8.5M19 14a7.5 7.5 0 01-12.8 3.3L4.5 15.5" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l5 5" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v5.2l3.4 2" />
    </>
  ),
  send: (
    <>
      <path d="M4.5 12L20 4.5 14.5 20l-2.6-6z" />
      <path d="M11.9 14L20 4.5" />
    </>
  ),
  alert: (
    <>
      <path d="M12 4L2.5 20h19z" />
      <path d="M12 10.5v4" />
      <circle cx="12" cy="17.3" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  moonStar: (
    <>
      <path d="M18 13.5A7.5 7.5 0 018.5 4a7.5 7.5 0 109.5 9.5z" />
      <path d="M17 3.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" />
    </>
  ),
};

export type IconName = keyof typeof P;

export function Icon({
  name,
  size = 20,
  className = "",
  sw = 1.7,
}: {
  name: string;
  size?: number;
  className?: string;
  sw?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {P[name] ?? P.spark}
    </svg>
  );
}
