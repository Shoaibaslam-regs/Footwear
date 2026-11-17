/**
 * The R'ose Atelier seal, drawn in SVG so it prints sharp at any size: a
 * dark-gold wax rim, a gold ring, an ivory face with the name around the
 * edge, and the stiletto logo with R'OSE / ATELIER in the middle. Only real
 * details (name, city, country); no invented founding dates or addresses.
 * One per page: the gradient ids are fixed.
 */
export default function BrandStamp({ className = "" }: { className?: string }) {
  const ink = "#2a1d10";
  const brown = "#7a5a2e";
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient cx="42%" cy="36%" id="rs-wax" r="70%">
          <stop offset="0" stopColor="#9a7442" />
          <stop offset="0.55" stopColor="#6b4c25" />
          <stop offset="1" stopColor="#2e1f0f" />
        </radialGradient>
        <linearGradient id="rs-gold" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#f4e2a8" />
          <stop offset="0.35" stopColor="#c9a35b" />
          <stop offset="0.6" stopColor="#8c6a2f" />
          <stop offset="1" stopColor="#e8c97f" />
        </linearGradient>
        <radialGradient cx="45%" cy="40%" id="rs-face" r="65%">
          <stop offset="0" stopColor="#fdfaf4" />
          <stop offset="1" stopColor="#efe5d2" />
        </radialGradient>
        {/* Text arcs: the top reads over the crown, the bottom along the base, both upright. */}
        <path d="M 32,100 A 68,68 0 1,1 168,100" id="rs-top" />
        <path d="M 25,100 A 75,75 0 0,0 175,100" id="rs-bottom" />
      </defs>

      {/* Wax rim, slightly uneven like a pressed seal */}
      <path
        d="M100 3 C128 2 152 12 170 30 C188 47 198 72 197 100 C197 127 187 151 169 169 C151 187 127 197 100 197 C72 198 48 187 30 170 C12 152 3 128 3 100 C2 73 13 48 31 30 C48 13 73 3 100 3 Z"
        fill="url(#rs-wax)"
      />
      <path d="M44 34 A 82 82 0 0 1 120 19" fill="none" opacity="0.35" stroke="#fff" strokeLinecap="round" strokeWidth="3" />

      {/* Gold ring and ivory face */}
      <circle cx="100" cy="100" fill="none" r="85" stroke="url(#rs-gold)" strokeWidth="4" />
      <circle cx="100" cy="100" fill="url(#rs-face)" r="82" />
      <circle cx="100" cy="100" fill="none" r="79.5" stroke={ink} strokeDasharray="1.2 2" strokeWidth="0.6" />

      {/* Name around the edge */}
      <text fill={ink} fontFamily="var(--font-playfair), Georgia, serif" fontSize="9.5" fontWeight="700" letterSpacing="2.2">
        <textPath href="#rs-top" startOffset="50%" textAnchor="middle">
          R&apos;OSE ATELIER • KARACHI
        </textPath>
      </text>
      <text fill={ink} fontFamily="var(--font-playfair), Georgia, serif" fontSize="9.5" fontWeight="700" letterSpacing="2.6">
        <textPath href="#rs-bottom" startOffset="50%" textAnchor="middle">
          ORIGINAL • PAKISTAN
        </textPath>
      </text>
      <text fill={ink} fontSize="8" textAnchor="middle" x="26" y="103">
        ✦
      </text>
      <text fill={ink} fontSize="8" textAnchor="middle" x="174" y="103">
        ✦
      </text>

      {/* Inner rings */}
      <circle cx="100" cy="100" fill="none" r="58" stroke="url(#rs-gold)" strokeWidth="1.6" />
      <circle cx="100" cy="100" fill="none" r="55" stroke={ink} strokeWidth="0.5" />
      <circle cx="100" cy="100" fill="none" r="51" stroke={brown} strokeDasharray="1 2" strokeOpacity="0.5" strokeWidth="0.5" />

      {/* Centre: logo, name, line */}
      <image height="36" href="/icon.png" width="36" x="82" y="54" />
      <text fill={ink} fontFamily="var(--font-playfair), Georgia, serif" fontSize="19" fontWeight="700" letterSpacing="3.5" textAnchor="middle" x="101.75" y="109">
        R&apos;OSE
      </text>
      <line stroke="url(#rs-gold)" strokeWidth="0.8" x1="80" x2="120" y1="115" y2="115" />
      <text fill={brown} fontFamily="var(--font-jakarta), system-ui, sans-serif" fontSize="7" fontWeight="700" letterSpacing="2.6" textAnchor="middle" x="101.3" y="125">
        ATELIER
      </text>
      <text fill={ink} fontFamily="var(--font-jakarta), system-ui, sans-serif" fontSize="4.3" fontWeight="600" letterSpacing="1.4" textAnchor="middle" x="100.7" y="134">
        LUXURY FOOTWEAR
      </text>
    </svg>
  );
}
