/** Flat vector illustration of a chat bubble and paper plane, used on the signed-out landing screen. */
export function HeroIllustration() {
  return (
    <div className="relative h-80 w-[28rem]">
      <svg viewBox="0 0 600 340" className="h-full w-full" aria-hidden="true">
        <defs>
          <linearGradient id="bubbleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8b82f8" />
            <stop offset="100%" stopColor="#5348e8" />
          </linearGradient>
          <linearGradient id="planeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#b3ace0" />
            <stop offset="100%" stopColor="#655cf3" />
          </linearGradient>
          <radialGradient id="backdropGradient" cx="50%" cy="38%" r="75%">
            <stop offset="0%" stopColor="#f1effe" />
            <stop offset="100%" stopColor="#fbfbfe" />
          </radialGradient>
        </defs>

        <rect x="0" y="0" width="600" height="340" rx="28" fill="url(#backdropGradient)" />

        <ellipse cx="90" cy="345" rx="150" ry="115" fill="#eef0fe" />
        <ellipse cx="520" cy="345" rx="160" ry="125" fill="#eef0fe" />
        <circle cx="300" cy="205" r="135" fill="#e0ddfa" opacity="0.55" />

        <g opacity="0.9">
          <ellipse cx="378" cy="228" rx="78" ry="68" fill="#ffffff" />
          <path d="M398,270 Q410,300 435,312 Q405,308 390,280 Z" fill="#ffffff" />
        </g>

        <g>
          <ellipse cx="293" cy="212" rx="112" ry="90" fill="url(#bubbleGradient)" />
          <path d="M208,278 Q192,318 158,330 Q198,312 214,282 Z" fill="url(#bubbleGradient)" />
          <circle cx="255" cy="214" r="11" fill="#ffffff" />
          <circle cx="293" cy="214" r="11" fill="#ffffff" />
          <circle cx="331" cy="214" r="11" fill="#ffffff" />
        </g>

        <path
          d="M418,165 C432,152 442,135 452,120"
          fill="none"
          stroke="#b3ace0"
          strokeWidth="2.5"
          strokeDasharray="6 7"
          strokeLinecap="round"
        />
        <circle cx="412" cy="170" r="15" fill="none" stroke="#b3ace0" strokeWidth="2" strokeDasharray="3 5" />
        <circle cx="412" cy="170" r="4" fill="#fbbf24" />

        <g transform="rotate(28 500 75)">
          <path d="M460,62 L556,30 L512,118 L494,88 Z" fill="url(#planeGradient)" />
          <path d="M494,88 L516,62" stroke="#5348e8" strokeWidth="2" strokeLinecap="round" />
        </g>

        <path
          d="M226,108 L231,120 L243,125 L231,130 L226,142 L221,130 L209,125 L221,120 Z"
          fill="#b3ace0"
        />
        <path
          d="M438,196 L441,204 L449,207 L441,210 L438,218 L435,210 L427,207 L435,204 Z"
          fill="#fbbf24"
        />
        <path
          d="M150,228 L153,235 L160,238 L153,241 L150,248 L147,241 L140,238 L147,235 Z"
          fill="#d7d3f6"
        />

        <g fill="#d7d3f6">
          <ellipse cx="54" cy="306" rx="9" ry="32" transform="rotate(-22 54 306)" />
          <ellipse cx="78" cy="312" rx="9" ry="28" transform="rotate(18 78 312)" />
          <ellipse cx="548" cy="300" rx="9" ry="30" transform="rotate(20 548 300)" />
          <ellipse cx="524" cy="308" rx="9" ry="26" transform="rotate(-16 524 308)" />
        </g>
      </svg>
    </div>
  );
}
