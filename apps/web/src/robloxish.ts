export function hashStr(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick<T>(seed: number, arr: T[]) {
  return arr[seed % arr.length];
}

export function avatarSvg(seedKey: string, size = 64) {
  const seed = hashStr(seedKey);

  const skins = ["#fcd7b8", "#f6c6a5", "#f3b58e", "#e9a678", "#d58b5e", "#c07a50"];
  const shirts = ["#2563eb", "#22c55e", "#a78bfa", "#fb7185", "#fbbf24", "#06b6d4"];
  const pants = ["#111827", "#0f172a", "#1f2937", "#1e3a8a", "#065f46", "#7c2d12"];
  const hair = ["#111827", "#3f2a1d", "#6b4f2a", "#a16207", "#9a3412", "#0f172a"];

  const skin = pick(seed, skins);
  const shirt = pick(seed >>> 3, shirts);
  const pant = pick(seed >>> 6, pants);
  const hairC = pick(seed >>> 9, hair);

  const s = size;

  // Simple blocky character (Roblox-ish silhouette) as SVG
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="${shirt}" stop-opacity="1"/>
      <stop offset="1" stop-color="#60a5fa" stop-opacity="0.85"/>
    </linearGradient>
  </defs>
  <rect x="6" y="6" width="52" height="52" rx="14" fill="rgba(255,255,255,0.08)" stroke="rgba(148,163,184,0.25)"/>
  <!-- head -->
  <rect x="22" y="14" width="20" height="18" rx="6" fill="${skin}"/>
  <rect x="22" y="14" width="20" height="7" rx="6" fill="${hairC}" opacity="0.95"/>
  <!-- face -->
  <rect x="27" y="22" width="3" height="3" rx="1.3" fill="#111827"/>
  <rect x="34" y="22" width="3" height="3" rx="1.3" fill="#111827"/>
  <rect x="30" y="26" width="4" height="2" rx="1" fill="#111827" opacity="0.5"/>
  <!-- body -->
  <rect x="18" y="32" width="28" height="18" rx="7" fill="url(#g)"/>
  <!-- arms -->
  <rect x="12" y="34" width="7" height="16" rx="3" fill="${skin}"/>
  <rect x="45" y="34" width="7" height="16" rx="3" fill="${skin}"/>
  <!-- legs -->
  <rect x="22" y="48" width="9" height="10" rx="3" fill="${pant}"/>
  <rect x="33" y="48" width="9" height="10" rx="3" fill="${pant}"/>
</svg>`;
}

export function avatarDataUri(seedKey: string, size = 64) {
  const svg = avatarSvg(seedKey, size);
  const encoded = encodeURIComponent(svg)
    .replace(/'/g, "%27")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29");
  return `data:image/svg+xml,${encoded}`;
}
