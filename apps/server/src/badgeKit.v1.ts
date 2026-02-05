export type BadgeRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export type BadgeDef = {
  code: string;
  name: string;
  description: string;
  rarity: BadgeRarity;
  // Raw SVG markup (96x96). Client should encode as data URI.
  svg: string;
};

// Roblox-ish badge kit (v1). No Roblox logos; simple geometric icons.
// NOTE: keep SVG IDs unique per code.
export const BADGE_KIT_V1: BadgeDef[] = [
  {
    code: "FIRST_WIN",
    name: "첫승",
    description: "첫 승리를 달성했어요.",
    rarity: "common",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
  <defs>
    <linearGradient id="g_FIRST_WIN" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#44D7FF"/>
      <stop offset="1" stop-color="#1A6BFF"/>
    </linearGradient>
    <linearGradient id="ring_FIRST_WIN" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.55"/>
      <stop offset="1" stop-color="#FFFFFF" stop-opacity="0.10"/>
    </linearGradient>
    <filter id="sh_FIRST_WIN" x="-20%" y="-20%" width="140%" height="140%">
      <feOffset dy="2" in="SourceAlpha" result="o"/>
      <feGaussianBlur stdDeviation="2.2" in="o" result="b"/>
      <feColorMatrix in="b" type="matrix" values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0   0 0 0 .35 0" result="s"/>
      <feMerge><feMergeNode in="s"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <g filter="url(#sh_FIRST_WIN)">
    <path d="M48 6 L78 22 L90 50 L78 78 L48 90 L18 78 L6 50 L18 22 Z" fill="url(#g_FIRST_WIN)" stroke="#0B1220" stroke-opacity="0.75" stroke-width="3"/>
    <path d="M24 24 C34 14, 52 12, 64 18 C50 20, 38 26, 30 34 Z" fill="#FFFFFF" opacity="0.16"/>
    <circle cx="48" cy="52" r="26" fill="#0B1220" opacity="0.15"/>
    <circle cx="48" cy="50" r="26" fill="#0B1220" opacity="0.08"/>
    <circle cx="48" cy="50" r="24" fill="url(#ring_FIRST_WIN)" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="2"/>
  </g>

  <g fill="none" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
    <path d="M34 36 h28 v8 c0 10-8 16-14 16s-14-6-14-16z"/>
    <path d="M34 40 h-6 c0 10 6 14 10 14"/>
    <path d="M62 40 h6 c0 10-6 14-10 14"/>
    <path d="M44 60 v8"/>
    <path d="M52 60 v8"/>
    <path d="M38 72 h20"/>
  </g>
</svg>`,
  },
  {
    code: "FAST_FINISH",
    name: "번개",
    description: "아주 빠르게 완료했어요.",
    rarity: "uncommon",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
  <defs>
    <linearGradient id="g_FAST_FINISH" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#4DFF9B"/>
      <stop offset="1" stop-color="#0BBE6A"/>
    </linearGradient>
    <linearGradient id="ring_FAST_FINISH" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.55"/>
      <stop offset="1" stop-color="#FFFFFF" stop-opacity="0.10"/>
    </linearGradient>
    <filter id="sh_FAST_FINISH" x="-20%" y="-20%" width="140%" height="140%">
      <feOffset dy="2" in="SourceAlpha" result="o"/>
      <feGaussianBlur stdDeviation="2.2" in="o" result="b"/>
      <feColorMatrix in="b" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .35 0" result="s"/>
      <feMerge><feMergeNode in="s"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <g filter="url(#sh_FAST_FINISH)">
    <path d="M48 6 L78 22 L90 50 L78 78 L48 90 L18 78 L6 50 L18 22 Z" fill="url(#g_FAST_FINISH)" stroke="#0B1220" stroke-opacity="0.75" stroke-width="3"/>
    <path d="M24 24 C34 14, 52 12, 64 18 C50 20, 38 26, 30 34 Z" fill="#FFFFFF" opacity="0.16"/>
    <circle cx="48" cy="50" r="24" fill="url(#ring_FAST_FINISH)" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="2"/>
  </g>

  <g fill="none" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="48" cy="52" r="16"/>
    <path d="M44 30 h8"/>
    <path d="M48 52 l6 -4"/>
    <path d="M40 38 l10 0 -6 10 h10 l-14 18 4-14 h-10 z"/>
  </g>
</svg>`,
  },
  {
    code: "PERFECT_GAME",
    name: "완벽",
    description: "한 판을 완벽하게 끝냈어요.",
    rarity: "rare",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
  <defs>
    <linearGradient id="g_PERFECT_GAME" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#B07CFF"/>
      <stop offset="1" stop-color="#5B2DFF"/>
    </linearGradient>
    <linearGradient id="ring_PERFECT_GAME" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.55"/>
      <stop offset="1" stop-color="#FFFFFF" stop-opacity="0.10"/>
    </linearGradient>
    <filter id="sh_PERFECT_GAME" x="-20%" y="-20%" width="140%" height="140%">
      <feOffset dy="2" in="SourceAlpha" result="o"/>
      <feGaussianBlur stdDeviation="2.2" in="o" result="b"/>
      <feColorMatrix in="b" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .35 0" result="s"/>
      <feMerge><feMergeNode in="s"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <g filter="url(#sh_PERFECT_GAME)">
    <path d="M48 6 L78 22 L90 50 L78 78 L48 90 L18 78 L6 50 L18 22 Z" fill="url(#g_PERFECT_GAME)" stroke="#0B1220" stroke-opacity="0.75" stroke-width="3"/>
    <path d="M24 24 C34 14, 52 12, 64 18 C50 20, 38 26, 30 34 Z" fill="#FFFFFF" opacity="0.16"/>
    <circle cx="48" cy="50" r="24" fill="url(#ring_PERFECT_GAME)" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="2"/>
  </g>

  <g fill="none" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
    <path d="M48 32 l5 10 11 2 -8 8 2 12 -10-6 -10 6 2-12 -8-8 11-2 z"/>
    <path d="M36 58 l7 7 17-17"/>
  </g>
</svg>`,
  },
  {
    code: "STREAK_3",
    name: "3연승",
    description: "3연속 승리!",
    rarity: "common",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
  <defs>
    <linearGradient id="g_STREAK_3" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#66E6FF"/>
      <stop offset="1" stop-color="#2A86FF"/>
    </linearGradient>
    <linearGradient id="ring_STREAK_3" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.55"/>
      <stop offset="1" stop-color="#FFFFFF" stop-opacity="0.10"/>
    </linearGradient>
    <filter id="sh_STREAK_3" x="-20%" y="-20%" width="140%" height="140%">
      <feOffset dy="2" in="SourceAlpha" result="o"/>
      <feGaussianBlur stdDeviation="2.2" in="o" result="b"/>
      <feColorMatrix in="b" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .35 0" result="s"/>
      <feMerge><feMergeNode in="s"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <g filter="url(#sh_STREAK_3)">
    <path d="M48 6 L78 22 L90 50 L78 78 L48 90 L18 78 L6 50 L18 22 Z" fill="url(#g_STREAK_3)" stroke="#0B1220" stroke-opacity="0.75" stroke-width="3"/>
    <path d="M24 24 C34 14, 52 12, 64 18 C50 20, 38 26, 30 34 Z" fill="#FFFFFF" opacity="0.16"/>
    <circle cx="48" cy="50" r="24" fill="url(#ring_STREAK_3)" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="2"/>
  </g>

  <g fill="none" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
    <path d="M36 62 v-14"/>
    <path d="M48 62 v-18"/>
    <path d="M60 62 v-10"/>
    <path d="M48 34 c6 6 6 12 0 16 c-6-4-6-10 0-16z"/>
  </g>
</svg>`,
  },
  {
    code: "STREAK_7",
    name: "7연승",
    description: "7연속 승리!",
    rarity: "epic",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
  <defs>
    <linearGradient id="g_STREAK_7" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFB14A"/>
      <stop offset="1" stop-color="#FF5A1F"/>
    </linearGradient>
    <linearGradient id="ring_STREAK_7" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.55"/>
      <stop offset="1" stop-color="#FFFFFF" stop-opacity="0.10"/>
    </linearGradient>
    <filter id="sh_STREAK_7" x="-20%" y="-20%" width="140%" height="140%">
      <feOffset dy="2" in="SourceAlpha" result="o"/>
      <feGaussianBlur stdDeviation="2.2" in="o" result="b"/>
      <feColorMatrix in="b" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .35 0" result="s"/>
      <feMerge><feMergeNode in="s"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <g filter="url(#sh_STREAK_7)">
    <path d="M48 6 L78 22 L90 50 L78 78 L48 90 L18 78 L6 50 L18 22 Z" fill="url(#g_STREAK_7)" stroke="#0B1220" stroke-opacity="0.75" stroke-width="3"/>
    <path d="M24 24 C34 14, 52 12, 64 18 C50 20, 38 26, 30 34 Z" fill="#FFFFFF" opacity="0.16"/>
    <circle cx="48" cy="50" r="24" fill="url(#ring_STREAK_7)" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="2"/>
  </g>

  <g fill="none" stroke="#FFFFFF" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M48 30 c10 10 10 20 0 28 c-10-6-10-16 0-28z"/>
    <path d="M40 66 h18 l-10 16"/>
  </g>
</svg>`,
  },
  {
    code: "FAIRPLAY_10",
    name: "매너10",
    description: "매너가 멋져요!",
    rarity: "uncommon",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
  <defs>
    <linearGradient id="g_FAIRPLAY_10" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#66FFB8"/>
      <stop offset="1" stop-color="#1BCB6A"/>
    </linearGradient>
    <linearGradient id="ring_FAIRPLAY_10" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.55"/>
      <stop offset="1" stop-color="#FFFFFF" stop-opacity="0.10"/>
    </linearGradient>
    <filter id="sh_FAIRPLAY_10" x="-20%" y="-20%" width="140%" height="140%">
      <feOffset dy="2" in="SourceAlpha" result="o"/>
      <feGaussianBlur stdDeviation="2.2" in="o" result="b"/>
      <feColorMatrix in="b" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .35 0" result="s"/>
      <feMerge><feMergeNode in="s"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <g filter="url(#sh_FAIRPLAY_10)">
    <path d="M48 6 L78 22 L90 50 L78 78 L48 90 L18 78 L6 50 L18 22 Z" fill="url(#g_FAIRPLAY_10)" stroke="#0B1220" stroke-opacity="0.75" stroke-width="3"/>
    <path d="M24 24 C34 14, 52 12, 64 18 C50 20, 38 26, 30 34 Z" fill="#FFFFFF" opacity="0.16"/>
    <circle cx="48" cy="50" r="24" fill="url(#ring_FAIRPLAY_10)" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="2"/>
  </g>

  <g fill="none" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
    <path d="M30 52 l10-8 8 8 8-8 10 8"/>
    <path d="M40 44 l-6 6"/>
    <path d="M56 44 l6 6"/>
    <path d="M40 58 h16"/>
  </g>
  <g fill="#FFFFFF" font-family="system-ui, -apple-system, Segoe UI, Roboto, Arial" font-weight="900" font-size="14" text-anchor="middle">
    <text x="48" y="38">10</text>
  </g>
</svg>`,
  },
  {
    code: "TEAM_3",
    name: "팀플",
    description: "팀으로 함께 했어요!",
    rarity: "common",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
  <defs>
    <linearGradient id="g_TEAM_3" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#7DE3FF"/>
      <stop offset="1" stop-color="#2F8CFF"/>
    </linearGradient>
    <linearGradient id="ring_TEAM_3" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.55"/>
      <stop offset="1" stop-color="#FFFFFF" stop-opacity="0.10"/>
    </linearGradient>
    <filter id="sh_TEAM_3" x="-20%" y="-20%" width="140%" height="140%">
      <feOffset dy="2" in="SourceAlpha" result="o"/>
      <feGaussianBlur stdDeviation="2.2" in="o" result="b"/>
      <feColorMatrix in="b" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .35 0" result="s"/>
      <feMerge><feMergeNode in="s"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <g filter="url(#sh_TEAM_3)">
    <path d="M48 6 L78 22 L90 50 L78 78 L48 90 L18 78 L6 50 L18 22 Z" fill="url(#g_TEAM_3)" stroke="#0B1220" stroke-opacity="0.75" stroke-width="3"/>
    <path d="M24 24 C34 14, 52 12, 64 18 C50 20, 38 26, 30 34 Z" fill="#FFFFFF" opacity="0.16"/>
    <circle cx="48" cy="50" r="24" fill="url(#ring_TEAM_3)" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="2"/>
  </g>

  <g fill="none" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="48" cy="44" r="6"/>
    <circle cx="36" cy="48" r="5"/>
    <circle cx="60" cy="48" r="5"/>
    <path d="M34 66 c2-8 10-10 14-10 s12 2 14 10"/>
  </g>
</svg>`,
  },
];
