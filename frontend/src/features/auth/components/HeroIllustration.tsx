function ProfileCard({ x, y, width, height }: { x: number; y: number; width: number; height: number }) {
  const padding = height * 0.22;
  const avatarR = height * 0.28;
  const avatarCx = x + padding + avatarR;
  const avatarCy = y + height / 2;
  const barX = avatarCx + avatarR + padding * 0.9;
  const barWidth = x + width - barX - padding * 0.6;

  return (
    <g>
      <rect x={x} y={y} width={width} height={height} rx={height * 0.32} fill="#ffffff" opacity="0.92" />
      <circle cx={avatarCx} cy={avatarCy} r={avatarR} fill="url(#bubbleGradient)" />
      <rect x={barX} y={avatarCy - height * 0.17} width={barWidth} height={height * 0.13} rx={height * 0.065} fill="#cfe0fb" />
      <rect x={barX} y={avatarCy + height * 0.05} width={barWidth * 0.6} height={height * 0.13} rx={height * 0.065} fill="#e1ecfd" />
    </g>
  );
}

/** Flat vector illustration of a chat bubble linked to profile previews, used on the signed-out landing screen. */
export function HeroIllustration() {
  return (
    <div className="relative h-64 w-[36rem]">
      <svg viewBox="0 0 896 400" className="h-full w-full" aria-hidden="true">
        <defs>
          <linearGradient id="bubbleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#5b93f5" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>
          <filter id="soften" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="28" />
          </filter>
          <filter id="bubbleShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="10" stdDeviation="14" floodColor="#1e3a8a" floodOpacity="0.18" />
          </filter>
          <radialGradient id="haloGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="70%" stopColor="#ffffff" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="sceneFade" cx="50%" cy="48%" r="62%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="65%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
          <mask id="sceneMask">
            <rect x="0" y="0" width="896" height="400" fill="url(#sceneFade)" />
          </mask>
        </defs>

        <g mask="url(#sceneMask)">
        <g filter="url(#soften)">
          <circle cx="400" cy="175" r="135" fill="#dbe7fc" opacity="0.4" />
          <circle cx="490" cy="165" r="120" fill="#e5eefd" opacity="0.45" />
          <ellipse cx="150" cy="400" rx="220" ry="150" fill="#eef3fe" opacity="0.8" />
          <ellipse cx="760" cy="400" rx="230" ry="160" fill="#eef3fe" opacity="0.8" />
        </g>

        <path
          d="M330,250 C300,270 270,290 250,330"
          fill="none"
          stroke="#5b93f5"
          strokeWidth="2"
          strokeDasharray="1 7"
          strokeLinecap="round"
        />
        <circle cx="300" cy="275" r="4" fill="#2563eb" />
        <circle cx="255" cy="328" r="4" fill="#2563eb" />
        <ProfileCard x={60} y={330} width={220} height={66} />

        <path
          d="M560,200 C590,180 615,155 635,130"
          fill="none"
          stroke="#5b93f5"
          strokeWidth="2"
          strokeDasharray="1 7"
          strokeLinecap="round"
        />
        <circle cx="595" cy="172" r="4" fill="#2563eb" />
        <circle cx="632" cy="132" r="4" fill="#2563eb" />
        <ProfileCard x={640} y={70} width={220} height={66} />

        <path
          d="M575,245 C600,260 620,275 638,292"
          fill="none"
          stroke="#5b93f5"
          strokeWidth="2"
          strokeDasharray="1 7"
          strokeLinecap="round"
        />
        <circle cx="610" cy="268" r="3.5" fill="#2563eb" />
        <ProfileCard x={650} y={278} width={190} height={56} />

        <g filter="url(#bubbleShadow)">
          <ellipse cx="500" cy="268" rx="104" ry="86" fill="#ffffff" opacity="0.95" />
          <path d="M565,330 Q585,352 612,358 Q588,342 578,322 Z" fill="#ffffff" opacity="0.95" />
        </g>

        <g filter="url(#bubbleShadow)">
          <ellipse cx="428" cy="232" rx="128" ry="104" fill="url(#bubbleGradient)" />
          <path d="M350,312 Q335,344 305,354 Q340,340 354,316 Z" fill="url(#bubbleGradient)" />
          <circle cx="388" cy="234" r="12" fill="#ffffff" />
          <circle cx="428" cy="234" r="12" fill="#ffffff" />
          <circle cx="468" cy="234" r="12" fill="#ffffff" />
        </g>

        <g fill="#cfe0fb">
          <ellipse cx="520" cy="372" rx="11" ry="38" transform="rotate(-22 520 372)" />
          <ellipse cx="548" cy="380" rx="11" ry="33" transform="rotate(18 548 380)" />
          <ellipse cx="80" cy="380" rx="11" ry="36" transform="rotate(20 80 380)" />
          <ellipse cx="52" cy="372" rx="11" ry="31" transform="rotate(-16 52 372)" />
        </g>
        </g>
      </svg>
    </div>
  );
}
