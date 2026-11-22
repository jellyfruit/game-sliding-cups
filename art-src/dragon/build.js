// 龍的造型（向量，Mignola 風：硬邊大黑影、粗輪廓、極少色塊）。node art-src/dragon/build.js → art-src/out/dragon_t*.svg
const fs = require('fs'), path = require('path');
const INK = '#17101a', RED = '#ff6a4a', RED2 = '#c9402c', CREAM = '#f4e2bd', GOLD = '#ffc23d', GOLD2 = '#c98a14', EYE = '#ffd23d';
const OL = 7;
const SIL = 16;                                         // 外輪廓（剪影線）：比內線粗，讓重疊的形狀分得開                                            // 輪廓粗細
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
// 頭 + S 形脖子：胸口往前挺 → 脖子中段往後收 → 頭再往前探
const HEAD = 'M196,330 C212,308 244,298 274,290 C296,262 322,246 352,242 C380,240 404,254 414,278 L436,300 '
  + 'C462,340 472,384 454,432 C438,474 420,504 436,552 C448,592 470,622 472,650 '
  + 'L312,650 C290,610 288,560 320,520 C352,482 370,452 362,420 C356,402 346,396 336,394 '
  + 'C300,390 250,374 214,354 C202,348 194,340 196,330 Z';
const BELLY = 'M312,650 C290,610 288,560 320,520 C352,482 370,452 362,420 C356,402 346,396 336,394 L344,392 C388,410 404,452 392,476 C370,512 330,560 352,650 Z';
const NECK_SPINES = [[452, 336], [462, 404], [440, 474], [436, 540]]
  .map(([x, y], i) => { const s = 1.25 - i * 0.12; return `<path d="M${x - 6},${y - 16 * s} L${x + 32 * s},${y + 4} L${x - 6},${y + 20 * s} Z" fill="${RED2}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>`; }).join('');
const horn = (d, w = OL) => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${SIL}" stroke-linejoin="round"/><path d="${d}" fill="${CREAM}" stroke="${INK}" stroke-width="${w}" stroke-linejoin="round"/>`;
const horns = (k, body) => `<g transform="translate(392 282) scale(${k}) translate(-392 -282)">${body}</g>`;   // 角以根部為中心縮放
const hornShadow = (d) => `<path d="${d}" fill="${INK}" opacity=".55"/>`;

function head({ clipId, eyeScale = 1, mouth = 'smile' }) {
  return `
  <clipPath id="${clipId}"><path d="${HEAD}"/></clipPath>
  <path d="${HEAD}" fill="none" stroke="${INK}" stroke-width="${SIL}" stroke-linejoin="round"/>
  <path d="${HEAD}" fill="${RED}"/>
  <g clip-path="url(#${clipId})">
    <!-- 腹甲（沿著 S 形的喉嚨與胸口）-->
    <clipPath id="${clipId}b"><path d="${BELLY}"/></clipPath>
    <path d="${BELLY}" fill="${CREAM}"/>
    <g clip-path="url(#${clipId}b)" stroke="${INK}" stroke-width="4">${[430, 462, 494, 528, 564, 600, 636].map(y => `<path d="M280,${y + 8} L420,${y - 10}"/>`).join('')}</g>
    <path d="M344,392 C388,410 404,452 392,476 C370,512 330,560 352,650" fill="none" stroke="${INK}" stroke-width="4"/>
    <!-- 大黑影：沿著後頸，邊緣切成有節奏的鋸齒（不是一整根柱子）-->
    <path d="M372,232 L480,232 L480,660 L404,660 C396,632 414,612 400,592 L420,574 C402,552 404,532 394,514 L416,500 C404,482 410,462 418,446 L404,432 C420,412 426,392 418,372 L402,360 C410,340 404,320 394,302 C400,284 384,256 372,232 Z" fill="${INK}"/>
    <path d="M336,394 C300,390 250,374 214,354 C230,374 290,402 336,418 C356,420 372,414 382,404 C366,402 350,398 336,394 Z" fill="${INK}"/>
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

/* ── 翅膀（參考 David 給的摺翼圖）：腕關節在最上方（帶一根往上彎的大爪），翼骨往下垂，
   下緣是三根長尖指尖、中間深深內凹；左側有拇爪和一個內凹的缺口。寬度與 v2 相同。── */
function wing(k = 1) {
  const W = '508,262';
  const mem = 'M508,262 C548,262 590,292 608,332 C626,372 636,404 634,432 C632,470 622,500 608,528 '   // 外緣（右）→ 右指尖
    + 'C606,494 604,462 602,436 '                                                                     // 往上內凹
    + 'C584,486 556,548 530,598 '                                                                      // 中指尖（最長）
    + 'C534,550 540,500 542,456 '                                                                      // 內凹
    + 'C530,476 510,504 493,528 '                                                                      // 左指尖
    + 'C496,500 502,468 506,440 C500,420 494,408 488,398 '                                            // 左緣往上 → 小刺
    + 'C482,380 474,362 470,346 '                                                                      // 內凹缺口 → 拇爪
    + 'C478,318 490,290 508,262 Z';
  const shade = 'M508,262 C548,262 590,292 608,332 C626,372 636,404 634,432 C632,470 622,500 608,528 C606,494 604,462 602,436 C584,486 556,548 530,598 C546,500 540,380 508,262 Z';
  return `<g transform="translate(486 626) scale(${k}) translate(-452 -560)">
    <path d="${mem}" fill="none" stroke="${INK}" stroke-width="${SIL}" stroke-linejoin="round"/>
    <path d="${mem}" fill="${RED2}" stroke="${INK}" stroke-width="${OL}" stroke-linejoin="round"/>
    <path d="${shade}" fill="${INK}" opacity=".38"/>
    <path d="M${W} C532,380 534,480 530,598 M${W} C520,360 506,450 493,528 M${W} C580,330 612,420 608,528" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>
    <path d="M${W} C530,380 532,480 529,590 M${W} C518,360 505,450 494,520" fill="none" stroke="${RED}" stroke-width="2" stroke-linecap="round" opacity=".8"/>
    <path d="M470,346 L462,326 L476,334 Z" fill="${CREAM}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M500,270 C488,258 478,252 466,250 C480,244 500,244 516,256 Z" fill="${CREAM}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/></g>`;
}
// 角：先往後掃，再 S 形向上翹（底部寬、尖端細）
const HORN_A = 'M362,266 C392,246 428,244 456,234 C488,222 506,196 522,150 C516,200 496,236 468,256 C442,274 420,286 404,294 Z';
const HORN_B = 'M398,294 C430,282 462,284 490,276 C512,268 526,252 536,228 C536,262 518,288 492,300 C468,310 444,312 424,316 Z';
const HORN_A_SH = 'M468,256 C496,236 516,200 522,150 C518,212 500,252 472,270 C448,284 424,292 404,294 C428,282 448,270 468,256 Z';

const t3 = () => `${cup()}${plinth}${wing(0.78)}${NECK_SPINES}${head({ clipId: 'c3' })}${horns(0.72, horn(HORN_A) + horn(HORN_B) + hornShadow(HORN_A_SH))}`;

/* ── t1 剛出生：蛋殼 + 小龍頭 + 兩隻小角 ── */
const t1 = () => {
  const shell = 'M286,650 C282,590 312,548 384,540 C456,548 486,590 482,650 Z';
  return `${cup()}
  <ellipse cx="384" cy="668" rx="86" ry="22" fill="${INK}"/>
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
  <path d="M286,546 L312,572 L336,540 L362,574 L388,538 L414,574 L440,540 L462,572 L482,548 C498,580 500,626 472,656 C448,680 414,686 384,686 C354,686 320,680 296,656 C268,626 270,580 286,546 Z" fill="${CREAM}" stroke="${INK}" stroke-width="${SIL - 4}" stroke-linejoin="round"/>
  <path d="M454,556 C476,580 494,606 486,636 C476,668 440,684 404,686 C440,660 458,612 454,556 Z" fill="${INK}"/>
  <circle cx="326" cy="606" r="9" fill="${INK}"/><circle cx="368" cy="634" r="7" fill="${INK}"/><circle cx="320" cy="646" r="5" fill="${INK}"/>
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
const t6 = () => `${cup()}${plinth}${wing(1.12)}${NECK_SPINES}${head({ clipId: 'c6' })}${horns(0.58, horn(HORN_A) + hornShadow(HORN_A_SH))}${crown}
  <path d="M330,560 L384,540 L438,560 L430,610 L384,632 L338,610 Z" fill="${GOLD}" stroke="${INK}" stroke-width="6" stroke-linejoin="round" transform="translate(-14 0)"/>
  <path d="M384,540 L438,560 L430,610 L384,632 Z" fill="${GOLD2}" transform="translate(-14 0)"/>
  <circle cx="370" cy="590" r="12" fill="${RED}" stroke="${INK}" stroke-width="4"/>`;

const tiers = { 1: t1, 3: t3, 6: t6 };
const svgOf = (body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 768 768" width="768" height="768">${body}</svg>`;
const out = path.join(__dirname, '..', 'out'); fs.mkdirSync(out, { recursive: true });
for (const [n, f] of Object.entries(tiers)) fs.writeFileSync(path.join(out, `dragon_t${n}.svg`), svgOf(f()));
console.log('SVG →', out);
