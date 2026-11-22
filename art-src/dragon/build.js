// 龍的造型（向量，Mignola 風：硬邊大黑影、粗輪廓、極少色塊）。node art-src/dragon/build.js → art-src/out/dragon_t*.svg
const fs = require('fs'), path = require('path');
const INK = '#17101a', RED = '#ff6a4a', RED2 = '#c9402c', CREAM = '#f4e2bd', GOLD = '#ffc23d', GOLD2 = '#c98a14', EYE = '#ffd23d';
const OL = 7;                                            // 輪廓粗細
const A = { x: 384, y: 690 };                           // 錨點
const RIM = { cx: 384, cy: 614, rx: 128, ry: 90 };      // 杯口橢圓

/* 杯子（所有階級共用）：奶油色杯身 + 龍色帶，右側硬邊黑影 */
const cup = () => `
  <path d="M256,614 L282,690 A102,64 0 0 0 486,690 L512,614 Z" fill="${CREAM}" stroke="${INK}" stroke-width="${OL}" stroke-linejoin="round"/>
  <path d="M498,614 L486,690 A102,64 0 0 1 392,754 C440,742 478,716 486,690 Z" fill="${INK}" opacity=".9"/>
  <path d="M262,636 L276,676 A108,68 0 0 0 492,676 L506,636 A128,90 0 0 1 262,636 Z" fill="${RED}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
  <path d="M470,640 L492,676 A108,68 0 0 1 430,742 L458,690 Z" fill="${INK}" opacity=".85"/>
  <ellipse cx="${RIM.cx}" cy="${RIM.cy}" rx="${RIM.rx}" ry="${RIM.ry}" fill="${CREAM}" stroke="${INK}" stroke-width="${OL}"/>
  <ellipse cx="${RIM.cx}" cy="${RIM.cy + 4}" rx="${RIM.rx - 20}" ry="${RIM.ry - 18}" fill="#3a2630" stroke="${INK}" stroke-width="4"/>
  <path d="M${RIM.cx + 40},${RIM.cy - 60} A${RIM.rx},${RIM.ry} 0 0 1 ${RIM.cx + RIM.rx},${RIM.cy} A${RIM.rx - 20},${RIM.ry - 18} 0 0 0 ${RIM.cx + 70},${RIM.cy - 58} Z" fill="${INK}" opacity=".35"/>`;

/* 半身像底座（站在杯口上）*/
const plinth = `<ellipse cx="384" cy="650" rx="84" ry="28" fill="${INK}"/>`;

/* ── 頭部（側面朝左）共用的輪廓 ── */
const HEAD = 'M196,330 C212,308 244,298 274,290 C296,262 322,246 352,242 C380,240 404,254 414,278 L446,300 C458,360 452,420 458,470 C464,540 470,600 472,650 L298,650 C294,600 298,540 302,470 C306,432 318,406 336,394 C300,390 250,374 214,354 C202,348 194,340 196,330 Z';
const NECK_SPINES = [[452, 318], [458, 372], [462, 426], [466, 480], [470, 534]].map(([x, y]) => `<path d="M${x - 4},${y} L${x + 34},${y + 12} L${x - 2},${y + 40} Z" fill="${RED2}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>`).join('');
const horn = (d, w = OL) => `<path d="${d}" fill="${CREAM}" stroke="${INK}" stroke-width="${w}" stroke-linejoin="round"/>`;
const hornShadow = (d) => `<path d="${d}" fill="${INK}" opacity=".55"/>`;

function head({ clipId, eyeScale = 1, mouth = 'smile' }) {
  return `
  <clipPath id="${clipId}"><path d="${HEAD}"/></clipPath>
  <path d="${HEAD}" fill="${RED}"/>
  <g clip-path="url(#${clipId})">
    <!-- 腹甲（喉嚨前側）-->
    <path d="M300,650 C296,600 300,540 304,470 C306,432 318,406 336,394 C330,420 334,470 338,520 C340,570 344,610 350,650 Z" fill="${CREAM}"/>
    <path d="M304,500 L338,496 M303,540 L340,536 M302,580 L344,576 M302,620 L348,616" stroke="${INK}" stroke-width="4"/>
    <!-- 大黑影：右側與下顎底下 -->
    <path d="M372,232 L430,240 L470,300 L470,660 L350,660 C380,610 372,560 392,520 C410,480 372,440 388,400 C396,372 376,330 392,300 C400,280 382,262 372,232 Z" fill="${INK}"/>
    <path d="M336,394 C300,390 250,374 214,354 C230,374 290,402 336,418 C360,420 380,410 392,396 C370,398 352,398 336,394 Z" fill="${INK}"/>
    <!-- 鼻梁亮線 -->
    <path d="M205,326 C226,308 256,300 284,292" fill="none" stroke="#ffd9b0" stroke-width="4" stroke-linecap="round"/>
  </g>
  <path d="${HEAD}" fill="none" stroke="${INK}" stroke-width="${OL}" stroke-linejoin="round"/>
  <!-- 眼睛 -->
  <g transform="translate(284,304) scale(${eyeScale})">
    <path d="M-26,6 C-14,-14 12,-16 30,-4 C14,8 -8,14 -26,6 Z" fill="${EYE}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
    <ellipse cx="2" cy="-2" rx="5" ry="10" transform="rotate(-18 2 -2)" fill="${INK}"/>
    <path d="M-34,-8 C-12,-30 18,-30 40,-12" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>
  </g>
  <!-- 鼻孔、嘴 -->
  <ellipse cx="226" cy="322" rx="6" ry="3.5" fill="${INK}" transform="rotate(-20 226 322)"/>
  <path d="${mouth === 'smile' ? 'M206,346 C250,368 300,380 334,386' : 'M206,346 C250,362 300,372 334,380'}" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>
  <path d="M214,352 L222,364 L230,356 Z" fill="${CREAM}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`;
}

/* ── 翅膀（摺起來的蝙蝠翼，在頸後）：肩 S → 腕 W → 翼尖 T，三根翼指，扇形翼膜 ── */
const WING = { S: [452, 548], W: [566, 336], T: [664, 226], F1: [694, 336], F2: [654, 428], F3: [594, 478], B: [482, 566] };
function wing(k = 1) {                                   // k：大小（以肩為中心縮放）
  const { S, W, T, F1, F2, F3, B } = WING, P = (q) => q.join(',');
  const mem = `M${P(S)} L${P(W)} L${P(T)} Q674,300 ${P(F1)} Q664,356 ${P(F2)} Q624,440 ${P(F3)} Q552,474 ${P(B)} Z`;
  return `<g transform="translate(${S[0]} ${S[1]}) scale(${k}) translate(${-S[0]} ${-S[1]})">
    <path d="${mem}" fill="${RED2}" stroke="${INK}" stroke-width="${OL}" stroke-linejoin="round"/>
    <path d="M${P(W)} L${P(F1)} L${P(F2)} L${P(F3)} L${P(B)} L${P(S)} Z" fill="${INK}" opacity=".45"/>
    <path d="M${P(W)} L${P(F1)} M${P(W)} L${P(F2)} M${P(W)} L${P(F3)}" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>
    <path d="M${P(S)} L${P(W)} L${P(T)}" fill="none" stroke="${INK}" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M${P(S)} L${P(W)} L${P(T)}" fill="none" stroke="${RED}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M${T[0] - 4},${T[1] + 2} L${T[0] + 14},${T[1] - 22} L${T[0] + 10},${T[1] + 10} Z" fill="${CREAM}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/></g>`;
}
const HORN_A = 'M366,270 C408,238 468,212 552,186 C512,226 462,264 412,290 Z';
const HORN_B = 'M396,292 C440,268 504,266 566,282 C524,296 472,306 424,314 Z';

const t3 = () => `${cup()}${plinth}${wing(0.62)}${NECK_SPINES}${head({ clipId: 'c3' })}${horn(HORN_A)}${horn(HORN_B)}${hornShadow('M420,282 C470,258 520,226 552,186 C530,236 480,276 430,298 Z')}`;

/* ── t1 剛出生：蛋殼 + 小龍頭 + 兩隻小角 ── */
const t1 = () => {
  const shell = 'M286,650 C282,590 312,548 384,540 C456,548 486,590 482,650 Z';
  return `${cup()}
  <ellipse cx="384" cy="650" rx="100" ry="30" fill="${INK}"/>
  <!-- 小龍頭（探出殼外）-->
  <g transform="translate(104 222) scale(.78)">
    <path d="M200,330 C214,306 252,296 290,290 C310,262 340,248 372,248 C402,248 424,266 430,296 C440,330 426,372 420,420 L330,430 C296,414 252,386 216,362 C206,354 198,344 200,330 Z" fill="${RED}" stroke="${INK}" stroke-width="${OL + 2}" stroke-linejoin="round"/>
    <path d="M372,248 C402,248 424,266 430,296 C440,330 426,372 420,420 L370,426 C392,390 388,340 400,300 C404,282 392,262 372,248 Z" fill="${INK}"/>
    <path d="M208,332 C232,310 264,300 292,294" fill="none" stroke="#ffd9b0" stroke-width="5" stroke-linecap="round"/>
    <g transform="translate(296 316) scale(1.15)"><path d="M-26,6 C-14,-14 12,-16 30,-4 C14,8 -8,14 -26,6 Z" fill="${EYE}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/><ellipse cx="2" cy="-2" rx="5.5" ry="10" transform="rotate(-18 2 -2)" fill="${INK}"/></g>
    <ellipse cx="226" cy="324" rx="6" ry="3.5" fill="${INK}"/>
    <path d="M214,350 C250,372 292,382 326,388" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>
    <path d="M338,262 L326,206 L372,252 Z M386,262 L412,208 L420,268 Z" fill="${CREAM}" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>
  </g>
  <!-- 蛋殼 -->
  <path d="${shell}" fill="${CREAM}" stroke="${INK}" stroke-width="${OL}" stroke-linejoin="round"/>
  <path d="M286,546 L312,572 L336,540 L362,574 L388,538 L414,574 L440,540 L462,572 L482,548 L486,600 C486,620 484,640 482,650 L286,650 C282,620 282,580 286,546 Z" fill="${CREAM}" stroke="${INK}" stroke-width="${OL}" stroke-linejoin="round"/>
  <path d="M450,560 L486,600 C486,630 484,642 482,650 L420,650 C446,620 452,590 450,560 Z" fill="${INK}"/>
  <circle cx="330" cy="610" r="9" fill="${INK}"/><circle cx="372" cy="628" r="7" fill="${INK}"/><circle cx="318" cy="636" r="5" fill="${INK}"/>
  <!-- 扒在殼邊的小爪 -->
  <path d="M330,556 L322,534 M344,552 L342,530 M358,552 L364,532" stroke="${RED}" stroke-width="9" stroke-linecap="round"/>
  <path d="M330,556 L322,534 M344,552 L342,530 M358,552 L364,532" stroke="${INK}" stroke-width="3" stroke-linecap="round" opacity=".6"/>`;
};

/* ── t6 龍王：十字王冠 + 最大翅膀 + 胸章 ── */
const crown = `
  <g transform="translate(6 8)">
    <path d="M300,262 L318,214 L346,246 L372,200 L398,246 L428,214 L440,268 Z" fill="${GOLD}" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>
    <path d="M372,200 L398,246 L428,214 L440,268 L402,270 Z" fill="${GOLD2}"/>
    <rect x="296" y="262" width="150" height="20" rx="6" fill="${GOLD}" stroke="${INK}" stroke-width="6"/>
    <path d="M372,196 L372,140 M352,160 L392,160" stroke="${INK}" stroke-width="24" stroke-linecap="round"/><path d="M372,196 L372,140 M352,160 L392,160" stroke="${GOLD}" stroke-width="13" stroke-linecap="round"/></g>`;
const t6 = () => `${cup()}${plinth}${wing(1.0)}${NECK_SPINES}${head({ clipId: 'c6' })}${horn(HORN_A.replace('M366,270', 'M370,266'))}${crown}
  <path d="M330,560 L384,540 L438,560 L430,610 L384,632 L338,610 Z" fill="${GOLD}" stroke="${INK}" stroke-width="6" stroke-linejoin="round" transform="translate(-14 0)"/>
  <path d="M384,540 L438,560 L430,610 L384,632 Z" fill="${GOLD2}" transform="translate(-14 0)"/>
  <circle cx="370" cy="590" r="12" fill="${RED}" stroke="${INK}" stroke-width="4"/>`;

const tiers = { 1: t1, 3: t3, 6: t6 };
const svgOf = (body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 768 768" width="768" height="768">${body}</svg>`;
const out = path.join(__dirname, '..', 'out'); fs.mkdirSync(out, { recursive: true });
for (const [n, f] of Object.entries(tiers)) fs.writeFileSync(path.join(out, `dragon_t${n}.svg`), svgOf(f()));
console.log('SVG →', out);
