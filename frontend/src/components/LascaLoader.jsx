/**
 * LascaLoader — a self-contained animated loading mark.
 *
 * Pure SVG: no image files, no dependencies, crisp at any size.
 * Three effects run together — a uniform "breathing" scale, a shine that
 * sweeps across the silhouette, and a light that traces the logo's outline.
 * The shape is never skewed, stretched or clipped.
 *
 * Usage in your app:
 *   import LascaLoader from './LascaLoader';
 *   <LascaLoader variant="cycle" size={180} />
 *
 * Props
 *   variant  'blueRed' | 'orangeRedBlue' | 'redBlue' | 'cycle'   default 'cycle'
 *   size     rendered height in px (width follows the mark's ratio)  default 200
 *   speed    animation speed multiplier, 1 = default                 default 1
 *   breathe  boolean   default true
 *   shine    boolean   default true
 *   glow     boolean   default true (outline tracing light)
 *   title    accessible label   default 'Loading'
 *
 * To use as a real ES module, replace the last line with:
 *   export default LascaLoader;
 */

const LASCA_PATH =
  'M353 115.7L488 193.2Q498 199 498 210.6L498 598Q498 613 511.2 605.8L602.1 556.4Q612 551 621.7 556.6L756 634.2Q766 640 766 651.5L766 708.4Q766 720 756 725.8L438 909.2Q428 915 418 909.2L282 830.8Q272 825 272 813.4L272 162.5Q272 151 282 145.2L333 115.8Q343 110 353 115.7Z';

const LASCA_VIEWBOX = { x: 222, y: 60, w: 594, h: 905 };
const LASCA_RATIO = LASCA_VIEWBOX.w / LASCA_VIEWBOX.h;
const LASCA_CX = LASCA_VIEWBOX.x + LASCA_VIEWBOX.w / 2;
const LASCA_CY = LASCA_VIEWBOX.y + LASCA_VIEWBOX.h / 2;

// The mark's gradient axis: 30deg, matching the angle of its own bevels.
const LASCA_AXIS = { x1: 269.3, y1: 155.5, x2: 885.9, y2: 511.5 };

// Three stops at fixed offsets so every palette can cross-fade into any other.
const LASCA_PALETTES = {
  blueRed: ['#1e61da', '#6b53a0', '#cb3e4c'],
  orangeRedBlue: ['#ff9908', '#e74b2c', '#5655ac'],
  redBlue: ['#de3b3e', '#9c4874', '#3959c4'],
};
const LASCA_CYCLE = ['blueRed', 'orangeRedBlue', 'redBlue'];

const LASCA_KEYFRAMES = `
@keyframes lasca-breathe { 0%,100% { transform: scale(0.955); } 50% { transform: scale(1.09); } }
@keyframes lasca-shine   { 0% { transform: translateX(-560px); } 100% { transform: translateX(1620px); } }
@keyframes lasca-trace   { to { stroke-dashoffset: -100; } }
@keyframes lasca-cyc-0 { 0%,100% { stop-color:${LASCA_PALETTES.blueRed[0]}; } 33.333% { stop-color:${LASCA_PALETTES.orangeRedBlue[0]}; } 66.666% { stop-color:${LASCA_PALETTES.redBlue[0]}; } }
@keyframes lasca-cyc-1 { 0%,100% { stop-color:${LASCA_PALETTES.blueRed[1]}; } 33.333% { stop-color:${LASCA_PALETTES.orangeRedBlue[1]}; } 66.666% { stop-color:${LASCA_PALETTES.redBlue[1]}; } }
@keyframes lasca-cyc-2 { 0%,100% { stop-color:${LASCA_PALETTES.blueRed[2]}; } 33.333% { stop-color:${LASCA_PALETTES.orangeRedBlue[2]}; } 66.666% { stop-color:${LASCA_PALETTES.redBlue[2]}; } }
@media (prefers-reduced-motion: reduce) {
  .lasca-anim { animation: none !important; }
}
`;

let lascaUidSeq = 0;

function LascaLoader(props) {
  const p = props || {};
  const flag = (v, dflt) => (v === undefined || v === null || v === '' ? dflt : v !== false && v !== 'false' && v !== 0 && v !== '0');

  const size = Number(p.size) || 200;
  const speed = Number(p.speed) || 1;
  const variant = LASCA_PALETTES[p.variant] ? p.variant : 'cycle';
  const cycling = variant === 'cycle';
  const stops = LASCA_PALETTES[cycling ? LASCA_CYCLE[0] : variant];
  const breathe = flag(p.breathe, true);
  const shine = flag(p.shine, true);
  const glow = flag(p.glow, true);

  const reactUid = typeof React.useId === 'function' ? React.useId() : null;
  const fallbackUid = React.useRef(null);
  if (!reactUid && fallbackUid.current === null) fallbackUid.current = 'l' + ++lascaUidSeq;
  const uid = (reactUid || fallbackUid.current).replace(/[^a-zA-Z0-9]/g, '');

  React.useEffect(() => {
    if (typeof document === 'undefined' || document.getElementById('lasca-loader-kf')) return;
    const el = document.createElement('style');
    el.id = 'lasca-loader-kf';
    el.textContent = LASCA_KEYFRAMES;
    document.head.appendChild(el);
  }, []);

  const gradId = 'lg' + uid;
  const clipId = 'lc' + uid;
  const shineId = 'ls' + uid;
  const blurId = 'lb' + uid;

  const s = (sec) => sec / speed + 's';
  const traceAnim = { animation: `lasca-trace ${s(3.4)} linear infinite` };

  const tracePath = (width, stroke, opacity, filter) => (
    <path
      className="lasca-anim"
      d={LASCA_PATH}
      pathLength="100"
      fill="none"
      stroke={stroke}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray="17 83"
      opacity={opacity}
      filter={filter}
      style={traceAnim}
    />
  );

  return (
    <div
      role="img"
      aria-label={p.title || 'Loading'}
      style={{
        width: Math.round(size * LASCA_RATIO),
        height: size,
        display: 'block',
        ...(p.style || {}),
      }}
    >
      <svg
        viewBox={`${LASCA_VIEWBOX.x} ${LASCA_VIEWBOX.y} ${LASCA_VIEWBOX.w} ${LASCA_VIEWBOX.h}`}
        width="100%"
        height="100%"
        style={{ overflow: 'visible', display: 'block' }}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gradId} gradientUnits="userSpaceOnUse" {...LASCA_AXIS}>
            {stops.map((c, i) => (
              <stop
                key={i}
                offset={[0, 0.45, 1][i]}
                stopColor={c}
                style={cycling ? { animation: `lasca-cyc-${i} ${s(10)} linear infinite` } : undefined}
                className={cycling ? 'lasca-anim' : undefined}
              />
            ))}
          </linearGradient>

          <clipPath id={clipId}>
            <path d={LASCA_PATH} />
          </clipPath>

          <linearGradient id={shineId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#fff" stopOpacity="0" />
            <stop offset="0.42" stopColor="#fff" stopOpacity="0.16" />
            <stop offset="0.5" stopColor="#fff" stopOpacity="0.62" />
            <stop offset="0.58" stopColor="#fff" stopOpacity="0.16" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>

          <filter id={blurId} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="9" />
          </filter>
        </defs>

        <g
          className="lasca-anim"
          style={{
            transformOrigin: `${LASCA_CX}px ${LASCA_CY}px`,
            animation: breathe ? `lasca-breathe ${s(3.4)} ease-in-out infinite` : 'none',
          }}
        >
          <path d={LASCA_PATH} fill={`url(#${gradId})`} />

          {shine && (
            <g clipPath={`url(#${clipId})`}>
              <g transform={`rotate(18 ${LASCA_CX} ${LASCA_CY})`}>
                <rect
                  className="lasca-anim"
                  x={LASCA_VIEWBOX.x - 200}
                  y={LASCA_VIEWBOX.y - 340}
                  width="230"
                  height={LASCA_VIEWBOX.h + 680}
                  fill={`url(#${shineId})`}
                  style={{ animation: `lasca-shine ${s(3.4)} cubic-bezier(.6,.05,.35,1) infinite` }}
                />
              </g>
            </g>
          )}

          {glow && (
            <g>
              {tracePath(30, `url(#${gradId})`, 0.75, `url(#${blurId})`)}
              {tracePath(26, '#ffffff', 0.28, `url(#${blurId})`)}
              {tracePath(9, `url(#${gradId})`, 1, undefined)}
              {tracePath(3.2, '#ffffff', 0.92, undefined)}
            </g>
          )}
        </g>
      </svg>
    </div>
  );
}

export default LascaLoader;
