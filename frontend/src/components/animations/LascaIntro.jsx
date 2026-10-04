/**
 * LascaIntro — looping app-open animation for the LASCA mark (red → blue).
 *
 * One self-contained loop, pure SVG + CSS, no image or font files required:
 *   1. a fast light traces the logo's perimeter and draws its outline
 *   2. the filled logo appears and breathes outwards
 *   3. the LASCA wordmark drops down, letter by letter, in Archivo
 *   4. everything leaves in reverse and the loop begins again
 *
 * Usage in your app:
 *   import LascaIntro from './LascaIntro';
 *   <LascaIntro size={220} />
 *
 * Props
 *   size      logo height in px (everything scales from this)   default 220
 *   speed     loop speed multiplier (5.4s / speed per loop)      default 0.7
 *   showName  render the LASCA wordmark                         default true
 *   name      wordmark text                                     default 'LASCA'
 *   loadFont  (δεν χρησιμοποιείται πια: η Archivo είναι τοπικά)   default true
 *             (set false if you already self-host Archivo)
 *
 * To use as a real ES module, replace the last line with:
 *   export default LascaIntro;
 */
import '@fontsource/archivo/600.css';
import '@fontsource/archivo/700.css';
import React from 'react';
const LASCA_INTRO_PATH =
  'M353 115.7L488 193.2Q498 199 498 210.6L498 598Q498 613 511.2 605.8L602.1 556.4Q612 551 621.7 556.6L756 634.2Q766 640 766 651.5L766 708.4Q766 720 756 725.8L438 909.2Q428 915 418 909.2L282 830.8Q272 825 272 813.4L272 162.5Q272 151 282 145.2L333 115.8Q343 110 353 115.7Z';

const LASCA_INTRO_BOX = { x: 222, y: 60, w: 594, h: 905 };
const LASCA_INTRO_RATIO = LASCA_INTRO_BOX.w / LASCA_INTRO_BOX.h;
const LASCA_INTRO_CX = LASCA_INTRO_BOX.x + LASCA_INTRO_BOX.w / 2;
const LASCA_INTRO_CY = LASCA_INTRO_BOX.y + LASCA_INTRO_BOX.h / 2;
const LASCA_INTRO_AXIS = { x1: 269.3, y1: 155.5, x2: 885.9, y2: 511.5 };
const LASCA_INTRO_STOPS = ['#de3b3e', '#9c4874', '#3959c4'];

// Loop schedule, in percent of one cycle (5.4s at speed 1).
const T = {
  traceEnd: 16.7,   // perimeter light completes its lap
  fillIn: 15,       // logo starts appearing
  fillFull: 30,     // logo fully present, breathing starts
  nameStart: 41,
  nameLand: 54,
  hold: 72,         // stillness runs from ~56 to here, then reverses
  nameOut: 78,
  fillOut: 88,
  // 88 → 100: outline undraws
};

const LASCA_INTRO_CSS = `
@keyframes lasca-i-draw {
  0%   { stroke-dashoffset: 100; opacity: 1; }
  ${T.traceEnd}% { stroke-dashoffset: 0; opacity: 1; }
  ${T.fillFull}% { stroke-dashoffset: 0; opacity: .34; }
  ${T.hold}%     { stroke-dashoffset: 0; opacity: .34; }
  ${T.fillOut}%  { stroke-dashoffset: 0; opacity: 1; }
  100% { stroke-dashoffset: -100; opacity: 1; }
}
@keyframes lasca-i-comet {
  0%   { stroke-dashoffset: 0; opacity: 1; }
  ${T.traceEnd - 0.6}% { stroke-dashoffset: -99; opacity: 1; }
  ${T.traceEnd}%  { stroke-dashoffset: -100; opacity: 0; }
  ${T.fillOut}%   { stroke-dashoffset: 0; opacity: 0; }
  ${T.fillOut + 1}% { opacity: 1; }
  97%  { stroke-dashoffset: -96; opacity: 1; }
  100% { stroke-dashoffset: -100; opacity: 0; }
}
@keyframes lasca-i-fill {
  0%, ${T.fillIn}% { opacity: 0; transform: scale(.82); }
  ${T.fillFull}%   { opacity: 1; transform: scale(1); }
  41%  { transform: scale(1.085); }
  52%  { transform: scale(1); }
  ${T.hold}%       { opacity: 1; transform: scale(1); }
  ${T.fillOut}%    { opacity: 0; transform: scale(.82); }
  100% { opacity: 0; transform: scale(.82); }
}
@keyframes lasca-i-shine {
  0%, ${T.fillFull}% { transform: translateX(-560px); }
  54%, 100%          { transform: translateX(1620px); }
}
@media (prefers-reduced-motion: reduce) {
  .lasca-i { animation: none !important; }
}
`;

function lascaLetterKeyframes(count) {
  let css = '';
  for (let i = 0; i < count; i++) {
    const s = i * 1.2;
    css += `
@keyframes lasca-i-letter-${i} {
  0%, ${(T.nameStart + s).toFixed(2)}% { opacity: 0; transform: translateY(-0.48em); }
  ${(T.nameLand - 4 + s).toFixed(2)}% { opacity: 1; transform: translateY(0.07em); }
  ${(T.nameLand + s).toFixed(2)}%     { opacity: 1; transform: translateY(0); }
  ${T.hold}%    { opacity: 1; transform: translateY(0); }
  ${T.nameOut}% { opacity: 0; transform: translateY(-0.48em); }
  100% { opacity: 0; transform: translateY(-0.48em); }
}`;
  }
  return css;
}

let lascaIntroUidSeq = 0;

function LascaIntro(props) {
  const p = props || {};
  const flag = (v, dflt) =>
    v === undefined || v === null || v === ''
      ? dflt
      : v !== false && v !== 'false' && v !== 0 && v !== '0';

  const size = Number(p.size) || 220;
  const speed = Number(p.speed) || 0.7;
  const showName = flag(p.showName, true);
  const name = (p.name === undefined || p.name === null || p.name === '' ? 'LASCA' : String(p.name));
  const loadFont = flag(p.loadFont, true);

  const letters = name.split('');
  const dur = 5.4 / speed;

  const reactUid = typeof React.useId === 'function' ? React.useId() : null;
  const fallbackUid = React.useRef(null);
  if (!reactUid && fallbackUid.current === null) fallbackUid.current = 'i' + ++lascaIntroUidSeq;
  const uid = (reactUid || fallbackUid.current).replace(/[^a-zA-Z0-9]/g, '');

  React.useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!document.getElementById('lasca-intro-kf')) {
      const el = document.createElement('style');
      el.id = 'lasca-intro-kf';
      el.textContent = LASCA_INTRO_CSS + lascaLetterKeyframes(12);
      document.head.appendChild(el);
    }
    // Η γραμματοσειρά Archivo φορτώνεται τοπικά (@fontsource) — όχι από τους servers της Google.
  }, [loadFont]);

  const gradId = 'ig' + uid;
  const clipId = 'ic' + uid;
  const shineId = 'is' + uid;
  const blurId = 'ib' + uid;

  const loop = (kf, ease) => ({ animation: `${kf} ${dur}s ${ease || 'linear'} infinite both` });

  const strand = (width, stroke, opacity, filter, kf, dash) => (
    <path
      className="lasca-i"
      d={LASCA_INTRO_PATH}
      pathLength="100"
      fill="none"
      stroke={stroke}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray={dash}
      opacity={opacity}
      filter={filter}
      style={loop(kf, kf === 'lasca-i-comet' ? 'cubic-bezier(.5,0,.5,1)' : 'cubic-bezier(.45,.05,.3,1)')}
    />
  );

  return (
    <div
      role="img"
      aria-label={name}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: Math.round(size * 0.14),
        ...(p.style || {}),
      }}
    >
      <svg
        viewBox={`${LASCA_INTRO_BOX.x} ${LASCA_INTRO_BOX.y} ${LASCA_INTRO_BOX.w} ${LASCA_INTRO_BOX.h}`}
        width={Math.round(size * LASCA_INTRO_RATIO)}
        height={size}
        style={{ overflow: 'visible', display: 'block' }}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gradId} gradientUnits="userSpaceOnUse" {...LASCA_INTRO_AXIS}>
            {LASCA_INTRO_STOPS.map((c, i) => (
              <stop key={i} offset={[0, 0.45, 1][i]} stopColor={c} />
            ))}
          </linearGradient>
          <clipPath id={clipId}>
            <path d={LASCA_INTRO_PATH} />
          </clipPath>
          <linearGradient id={shineId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#fff" stopOpacity="0" />
            <stop offset="0.42" stopColor="#fff" stopOpacity="0.16" />
            <stop offset="0.5" stopColor="#fff" stopOpacity="0.6" />
            <stop offset="0.58" stopColor="#fff" stopOpacity="0.16" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <filter id={blurId} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="10" />
          </filter>
        </defs>

        {/* the outline: drawn by the tracing light, then undrawn on the way out */}
        {strand(26, `url(#${gradId})`, 0.55, `url(#${blurId})`, 'lasca-i-draw', '100 100')}
        {strand(7, `url(#${gradId})`, 1, undefined, 'lasca-i-draw', '100 100')}

        {/* the filled mark, breathing */}
        <g
          className="lasca-i"
          style={{
            transformOrigin: `${LASCA_INTRO_CX}px ${LASCA_INTRO_CY}px`,
            ...loop('lasca-i-fill', 'cubic-bezier(.4,0,.3,1)'),
          }}
        >
          <path d={LASCA_INTRO_PATH} fill={`url(#${gradId})`} />
          <g clipPath={`url(#${clipId})`}>
            <g transform={`rotate(18 ${LASCA_INTRO_CX} ${LASCA_INTRO_CY})`}>
              <rect
                className="lasca-i"
                x={LASCA_INTRO_BOX.x - 200}
                y={LASCA_INTRO_BOX.y - 340}
                width="230"
                height={LASCA_INTRO_BOX.h + 680}
                fill={`url(#${shineId})`}
                style={loop('lasca-i-shine', 'cubic-bezier(.55,.05,.35,1)')}
              />
            </g>
          </g>
        </g>

        {/* the fast light making the lap */}
        {strand(30, `url(#${gradId})`, 0.9, `url(#${blurId})`, 'lasca-i-comet', '13 87')}
        {strand(9, '#ffffff', 0.95, `url(#${blurId})`, 'lasca-i-comet', '9 91')}
        {strand(3.4, '#ffffff', 1, undefined, 'lasca-i-comet', '7 93')}
      </svg>

      {showName && (
        <div
          aria-hidden="true"
          style={{
            display: 'flex',
            fontFamily: "'Archivo', 'Helvetica Neue', Arial, sans-serif",
            fontWeight: 600,
            fontSize: Math.round(size * 0.235),
            lineHeight: 1,
            letterSpacing: '0.2em',
            paddingLeft: '0.2em',
            color: '#e9e9ed',
            overflow: 'hidden',
          }}
        >
          {letters.map((ch, i) => (
            <span
              key={i}
              className="lasca-i"
              style={{
                display: 'inline-block',
                whiteSpace: 'pre',
                ...loop(`lasca-i-letter-${i % 12}`, 'cubic-bezier(.3,1.35,.5,1)'),
              }}
            >
              {ch}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default LascaIntro;
