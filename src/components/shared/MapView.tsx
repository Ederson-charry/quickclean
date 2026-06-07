import { MapPin, Clock, Navigation } from "lucide-react";

interface MapViewProps {
  minutes?: number;
  km?: number;
  address?: string;
}

export function MapView({ minutes = 8, km = 1.2, address }: MapViewProps) {
  return (
    <div className="w-full overflow-hidden rounded-xl border border-line bg-surface">
      {/* SVG map placeholder */}
      <div className="relative bg-brand-50 h-44 w-full">
        <svg
          viewBox="0 0 400 176"
          className="absolute inset-0 h-full w-full"
          aria-label="Mapa de ubicación"
          role="img"
        >
          {/* Road grid pattern */}
          <rect width="400" height="176" fill="#EEF4FF" />
          {/* Horizontal roads */}
          <rect x="0" y="50" width="400" height="7" fill="#D9E8FF" rx="2" />
          <rect x="0" y="100" width="400" height="7" fill="#D9E8FF" rx="2" />
          <rect x="0" y="140" width="400" height="5" fill="#D9E8FF" rx="2" />
          {/* Vertical roads */}
          <rect x="80" y="0" width="7" height="176" fill="#D9E8FF" rx="2" />
          <rect x="200" y="0" width="7" height="176" fill="#D9E8FF" rx="2" />
          <rect x="320" y="0" width="5" height="176" fill="#D9E8FF" rx="2" />
          {/* Blocks / buildings */}
          <rect x="20" y="14" width="50" height="30" rx="4" fill="#C5DAFF" opacity="0.7" />
          <rect x="100" y="14" width="90" height="30" rx="4" fill="#C5DAFF" opacity="0.6" />
          <rect x="210" y="14" width="100" height="30" rx="4" fill="#C5DAFF" opacity="0.7" />
          <rect x="20" y="62" width="50" height="32" rx="4" fill="#C5DAFF" opacity="0.5" />
          <rect x="100" y="62" width="90" height="32" rx="4" fill="#C5DAFF" opacity="0.6" />
          <rect x="210" y="62" width="40" height="32" rx="4" fill="#C5DAFF" opacity="0.4" />
          <rect x="260" y="62" width="60" height="32" rx="4" fill="#C5DAFF" opacity="0.7" />
          <rect x="335" y="62" width="50" height="32" rx="4" fill="#C5DAFF" opacity="0.5" />
          <rect x="20" y="112" width="50" height="22" rx="4" fill="#C5DAFF" opacity="0.6" />
          <rect x="100" y="112" width="90" height="22" rx="4" fill="#C5DAFF" opacity="0.5" />
          <rect x="210" y="112" width="100" height="22" rx="4" fill="#C5DAFF" opacity="0.6" />
          <rect x="335" y="112" width="50" height="22" rx="4" fill="#C5DAFF" opacity="0.4" />
          {/* Route line */}
          <path
            d="M 60 88 Q 150 50 200 88 Q 250 120 200 140"
            stroke="#0B5BD6"
            strokeWidth="3"
            fill="none"
            strokeDasharray="6 3"
            opacity="0.6"
          />
          {/* Destination pin */}
          <circle cx="200" cy="140" r="14" fill="#0B5BD6" opacity="0.15" />
          <circle cx="200" cy="140" r="8" fill="#0B5BD6" />
          <circle cx="200" cy="140" r="3" fill="white" />
          {/* Origin dot */}
          <circle cx="60" cy="88" r="6" fill="#0FA46A" />
          <circle cx="60" cy="88" r="3" fill="white" />
        </svg>
      </div>

      {/* Info bar */}
      <div className="flex items-center gap-4 px-4 py-3 text-sm">
        <div className="flex items-center gap-1.5 text-ink-2">
          <Clock className="h-4 w-4 text-brand-600" />
          <span className="font-medium">{minutes} min</span>
        </div>
        <div className="h-4 w-px bg-line" />
        <div className="flex items-center gap-1.5 text-ink-2">
          <Navigation className="h-4 w-4 text-brand-600" />
          <span className="font-medium">{km} km</span>
        </div>
        {address && (
          <>
            <div className="h-4 w-px bg-line" />
            <div className="flex min-w-0 items-center gap-1.5 text-ink-2">
              <MapPin className="h-4 w-4 shrink-0 text-faint" />
              <span className="truncate">{address}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
