// Iconos propios en SVG (trazo de 2 px, estilo Lucide) para no sumar una dependencia: solo los que la interfaz usa.
const PATHS = {
  menu: "M4 6h16M4 12h16M4 18h16",
  close: "M6 6l12 12M18 6L6 18",
  minus: "M5 12h14",
  plus: "M12 5v14M5 12h14",
  check: "M5 12.5l4.5 4.5L19 7",
  chevronDown: "M6 9l6 6 6-6",
  chevronUp: "M6 15l6-6 6 6",
  chevronRight: "M9 6l6 6-6 6",
  arrowRight: "M5 12h14M13 6l6 6-6 6",
  search: "M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14zM20 20l-4-4",
  alert: "M12 8v5M12 16.5v.5M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18z",
  success: "M8 12.5l3 3 5-6M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18z",
  warning: "M12 9v4M12 16.5v.5M10.3 4.2L2.6 18a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0z",
  home: "M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z",
  store: "M4 9l1.5-5h13L20 9M4 9h16M4 9v11h16V9M9 20v-6h6v6",
  users: "M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM20 20v-1.5a3.5 3.5 0 0 0-2.5-3.35M15.5 4.15a3.5 3.5 0 0 1 0 6.7",
  key: "M15 9a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM14 11.5l6 6-2 2-1.5-1.5-1.5 1.5-1.5-1.5 1.5-1.5-2.5-2.5",
  logout: "M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 16l-4-4 4-4M6 12h10",
  wifiOff: "M3 3l18 18M8.5 16.5a5 5 0 0 1 7 0M5 13a10 10 0 0 1 5-2.7M19 13a10 10 0 0 0-2.5-1.8M12 20h.01",
  searchX: "M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14zM20 20l-4-4M9 9l4 4M13 9l-4 4",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 20, className = "" }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${className}`}>
      <path d={PATHS[name]} />
    </svg>
  );
}
