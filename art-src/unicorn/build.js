// 獨角獸的造型（與龍同一套系統：Mignola 風、S 形脖子、低頭 30°、頭飾水平）。node art-src/unicorn/build.js → art-src/out/unicorn_t*.svg
// 招牌：額頭上一根螺旋角 + 飄逸的鬃毛；沒有翅膀。
const fs = require('fs'), path = require('path');
const INK = '#17101a', RED = '#b98cff', RED2 = '#7d4fd1', CREAM = '#f4e2bd', GOLD = '#ffc23d', GOLD2 = '#c98a14', EYE = '#7fe3ff', MANE_C = '#f6efff', HI = '#efe4ff';
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
/* ── 低頭：脖子從 y=540 往上平順地彎，y≤420（頭）整塊逆時針轉 30°（嘴巴朝下）並往右平移；頭飾只移位置、保持水平。
   跨過彎曲區的形狀（頭頸輪廓、腹甲、黑影、背刺、鬃毛、護甲）逐點變形；只在頭上的東西（眼、嘴、角、頭飾）整塊旋轉。── */
const PIV = [404, 520], TILT = -30, SHIFT = 44,   // SHIFT：頭往右平移（隨彎曲程度漸進，脖子仍是 S 形）
      BEND = [540, 420];
function bendPt(x, y) {
  let t = (BEND[0] - y) / (BEND[0] - BEND[1]); t = Math.max(0, Math.min(1, t)); t = t * t * (3 - 2 * t);
  const a = TILT * t * Math.PI / 180, dx = x - PIV[0], dy = y - PIV[1];
  return [PIV[0] + dx * Math.cos(a) - dy * Math.sin(a) + SHIFT * t, PIV[1] + dx * Math.sin(a) + dy * Math.cos(a)];
}
function W(d) {                                          // 只接受絕對座標的 M / L / C / Q / Z
  const tk = d.match(/[A-Za-z]|-?\d*\.?\d+/g); let out = '', i = 0;
  while (i < tk.length) {
    const c = tk[i++]; if (!/^[MLCQZ]$/.test(c)) throw new Error('bend: 不支援 ' + c);
    out += c; while (i < tk.length && !/[A-Za-z]/.test(tk[i])) { const [x, y] = bendPt(+tk[i], +tk[i + 1]); out += x.toFixed(1) + ',' + y.toFixed(1) + ' '; i += 2; }
  }
  return out.trim();
}
// 頭飾保持水平：只跟著頭移動位置，不跟著轉
const level = (body, ax = 370, ay = 270) => { const [x, y] = bendPt(ax, ay); return `<g transform="translate(${(x - ax).toFixed(1)} ${(y - ay).toFixed(1)})">${body}</g>`; };
const rigid = (body) => `<g transform="translate(${SHIFT} 0) rotate(${TILT} ${PIV[0]} ${PIV[1]})">${body}</g>`;
// 頭 + S 形脖子：胸口往前挺 → 脖子中段往後收 → 頭再往前探
const HEAD = 'M186,392 L188,312 C188,302 196,298 208,298 L242,296 C270,272 306,250 346,244 C376,240 402,252 414,278 L436,300 '
  + 'C462,340 472,384 454,432 C438,474 420,504 436,552 C448,592 470,622 472,650 '
  + 'L312,650 C290,610 288,560 320,520 C352,482 370,452 362,420 C356,402 346,396 336,394 '
  + 'C300,396 256,398 222,398 L198,398 C190,398 186,396 186,392 Z';   // 方形的馬口鼻
const BELLY = 'M312,650 C290,610 288,560 320,520 C352,482 370,452 362,420 C356,402 346,396 336,394 L344,392 C388,410 404,452 392,476 C370,512 330,560 352,650 Z';
const NECK_SPINES = [[452, 336], [462, 404], [440, 474], [436, 540]]
  .map(([x, y], i) => { const s = 1.25 - i * 0.12; return `<path d="${W(`M${x - 6},${y - 16 * s} L${x + 32 * s},${y + 4} L${x - 6},${y + 20 * s} Z`)}" fill="${RED2}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>`; }).join('');
const sil = (d) => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${SIL}" stroke-linejoin="round"/>`;
const shape = (d, fill, w = OL) => `${sil(d)}<path d="${d}" fill="${fill}" stroke="${INK}" stroke-width="${w}" stroke-linejoin="round"/>`;
/* 招牌：額頭上的螺旋角（奶油色、螺旋紋、右側黑影）+ 兩隻馬耳朵 */
function uniHorn(k = 1) {
  const L = (t) => [284 + 62 * t, 282 - 172 * t], R = (t) => [332 + 14 * t, 268 - 158 * t];
  const d = 'M284,282 L332,268 L346,110 Z';
  const bands = [0.14, 0.3, 0.46, 0.62, 0.78].map(t => { const a = L(t), b = R(t + 0.07); return `<path d="M${a[0]},${a[1]} Q${(a[0] + b[0]) / 2},${(a[1] + b[1]) / 2 + 6} ${b[0]},${b[1]}" fill="none" stroke="${INK}" stroke-width="4"/>`; }).join('');
  return `<g transform="translate(310 272) scale(${k}) translate(-310 -272)">${sil(d)}<path d="${d}" fill="${CREAM}" stroke="${INK}" stroke-width="${OL}" stroke-linejoin="round"/>
    <path d="M316,273 L332,268 L346,110 Z" fill="${INK}" opacity=".45"/>${bands}</g>`;
}
const ears = () => `${sil('M368,254 L382,196 L404,258 Z')}<path d="M368,254 L382,196 L404,258 Z" fill="${RED}" stroke="${INK}" stroke-width="${OL}" stroke-linejoin="round"/><path d="M376,248 L383,214 L394,252 Z" fill="${RED2}"/>
  ${sil('M396,266 L418,210 L426,276 Z')}<path d="M396,266 L418,210 L426,276 Z" fill="${RED2}" stroke="${INK}" stroke-width="${OL}" stroke-linejoin="round"/>`;
const horn = (d, w = OL) => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${SIL}" stroke-linejoin="round"/><path d="${d}" fill="${CREAM}" stroke="${INK}" stroke-width="${w}" stroke-linejoin="round"/>`;
const horns = (k, body) => `<g transform="translate(392 282) scale(${k}) translate(-392 -282)">${body}</g>`;   // 角以根部為中心縮放
const hornShadow = (d) => `<path d="${d}" fill="${INK}" opacity=".55"/>`;

/* ── 表情：idle（預設）、happy（合併時：瞇眼張嘴笑）、fast（快速移動：瞪大眼、O 形嘴）、blink（眨眼）── */
let EXPR = 'idle';
const EXPRS = { idle: '', happy: '_happy', fast: '_fast', blink: '_blink' };
function eye(scale, pupilRy = 10) {                      // 局部座標：眼睛中心在 (0,0)
  const almond = 'M-26,6 C-14,-14 12,-16 30,-4 C14,8 -8,14 -26,6 Z';
  const brow = (dy) => `<path d="M-34,${-8 + dy} C-12,${-30 + dy} 18,${-30 + dy} 40,${-12 + dy}" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>`;
  let body;
  if (EXPR === 'happy') body = `<path d="M-26,8 C-14,-16 16,-18 30,4" fill="none" stroke="${INK}" stroke-width="9" stroke-linecap="round"/><path d="M-14,18 C-2,24 12,24 22,18" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round" opacity=".6"/>`;   // 彎月眼（沒有眉毛，避免看起來像兩條眉）
  else if (EXPR === 'blink') body = `<path d="M-26,4 C-8,12 12,12 30,0" fill="none" stroke="${INK}" stroke-width="8" stroke-linecap="round"/><path d="M-12,10 L-16,18 M2,12 L0,20 M16,10 L18,18" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>${brow(2)}`;
  else if (EXPR === 'fast') body = `<g transform="scale(1.22)"><path d="${almond}" fill="${EYE}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/><circle cx="3" cy="-2" r="4.5" fill="${INK}"/></g>${brow(-12)}`;
  else body = `<path d="${almond}" fill="${EYE}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/><ellipse cx="2" cy="-2" rx="5" ry="${pupilRy}" transform="rotate(-18 2 -2)" fill="${INK}"/>${brow(0)}`;
  return `<g transform="scale(${scale})">${body}</g>`;
}
function mouthOf(x0, y0, x1, y1) {                       // 馬的嘴：短、沒有尖牙
  const L = x1 - x0, mx = x0 + L * 0.5;
  if (EXPR === 'happy') return `<path d="M${x0},${y0} C${mx},${y0 + 8} ${x1 - 8},${y1} ${x1},${y1} C${x1 - 6},${y1 + 14} ${mx},${y0 + 24} ${x0 + 4},${y0 + 8} Z" fill="${INK}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
    <path d="M${x0 + L * 0.3},${y0 + 14} C${mx},${y0 + 10} ${x0 + L * 0.8},${y0 + 14} ${x0 + L * 0.85},${y0 + 18} C${x0 + L * 0.6},${y0 + 22} ${x0 + L * 0.4},${y0 + 20} ${x0 + L * 0.3},${y0 + 14} Z" fill="#e8506a"/>`;
  if (EXPR === 'fast') return `<ellipse cx="${x0 + 14}" cy="${y0 + 6}" rx="11" ry="13" fill="${INK}"/><ellipse cx="${x0 + 14}" cy="${y0 + 10}" rx="6" ry="5" fill="#e8506a"/>`;
  return `<path d="M${x0},${y0} C${mx},${y0 + 10} ${x1 - 10},${y1 + 2} ${x1},${y1}" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>`;
}
function head({ clipId, eyeScale = 1 }) {
  const HD = W(HEAD), BL = W(BELLY);
  return `
  <clipPath id="${clipId}"><path d="${HD}"/></clipPath>
  <path d="${HD}" fill="none" stroke="${INK}" stroke-width="${SIL}" stroke-linejoin="round"/>
  <path d="${HD}" fill="${RED}"/>
  <g clip-path="url(#${clipId})">
    <!-- 馬的脖子：單一顏色，沒有腹甲 -->
    <!-- 大黑影：沿著後頸，邊緣切成有節奏的鋸齒（不是一整根柱子）-->
    <path d="${W('M372,232 L520,232 L520,320 L520,400 L520,480 L520,560 L520,660 L404,660 C396,632 414,612 400,592 L420,574 C402,552 404,532 394,514 L416,500 C404,482 410,462 418,446 L404,432 C420,412 426,392 418,372 L402,360 C410,340 404,320 394,302 C400,284 384,256 372,232 Z')}" fill="${INK}"/>
    ${rigid(`<path d="M336,394 C300,396 256,398 222,398 C246,408 290,414 336,418 C356,420 372,414 382,404 C366,402 350,398 336,394 Z" fill="${INK}"/>
    <path d="M198,310 C214,304 240,301 270,297" fill="none" stroke="${HI}" stroke-width="4" stroke-linecap="round"/>`)}
  </g>
  <path d="${HD}" fill="none" stroke="${INK}" stroke-width="${OL}" stroke-linejoin="round"/>
  ${rigid(`
  <g transform="translate(284,304)">${eye(eyeScale)}</g>
  <!-- 鼻孔、嘴 -->
  <ellipse cx="206" cy="330" rx="7" ry="4.5" fill="${INK}" transform="rotate(-20 206 330)"/>
  ${mouthOf(188, 380, 244, 384)}`)}`;
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
  return `<g transform="translate(478 618) scale(${k}) translate(-452 -560)">
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

const t3 = () => `${cup()}${plinth}${(mane() + head({ clipId: 'c3' }) + rigid(ears()) + level(mitre()) + rigid(uniHorn(0.95)))}`;

/* ── t1 剛出生：蛋殼 + 小龍頭 + 兩隻小角 ── */
const t1 = () => {                                        // 小獨角獸：用兩隻蹄子抱著一塊餅乾（餅乾在胸前，不擋到頭）
  const BODY = 'M316,650 C300,590 310,520 350,494 C400,470 452,500 462,560 C468,600 464,636 458,650 Z';
  const leg = (d) => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="30" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${RED}" stroke-width="17" stroke-linecap="round"/>`;
  const hoof = (x, y, r) => `<g transform="rotate(${r} ${x} ${y})"><rect x="${x - 13}" y="${y - 10}" width="26" height="18" rx="6" fill="${INK}"/><rect x="${x - 8}" y="${y - 7}" width="9" height="5" rx="2" fill="#5a4a66"/></g>`;
  return `${cup()}${plinth}
  <!-- 身體 -->
  ${sil(BODY)}<path d="${BODY}" fill="${RED}" stroke="${INK}" stroke-width="${OL}" stroke-linejoin="round"/>
  <path d="M432,500 C456,520 466,560 464,600 C464,630 460,642 458,650 L410,650 C434,610 440,550 432,500 Z" fill="${INK}"/>
  <!-- 餅乾（有咬一口的缺角、巧克力豆）-->
  <mask id="bite"><rect width="768" height="768" fill="#fff"/><circle cx="412" cy="566" r="14" fill="#000"/><circle cx="424" cy="582" r="12" fill="#000"/></mask>
  <g mask="url(#bite)">
    <circle cx="378" cy="604" r="46" fill="none" stroke="${INK}" stroke-width="${SIL}"/>
    <circle cx="378" cy="604" r="46" fill="#e0a95f" stroke="${INK}" stroke-width="${OL}"/>
    <path d="M410,572 A46,46 0 0 1 378,650 A58,58 0 0 0 410,572 Z" fill="#a8702f"/>
    ${[[360, 588, 7], [390, 602, 6], [366, 624, 6], [396, 628, 5], [348, 610, 4.5]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#4a2a1a"/>`).join('')}
  </g>
  <!-- 兩隻前腳的蹄子抱著餅乾 -->
  ${leg('M338,636 C320,624 316,606 328,592')}${hoof(328, 588, -20)}
  ${leg('M436,636 C452,622 448,604 430,592')}${hoof(430, 588, 20)}
  <!-- 頭最後畫，不會被餅乾擋住 -->
  <g transform="translate(112 168) scale(.78) rotate(-30 380 420)">
    <path d="M198,392 L200,322 C200,310 208,304 222,302 L258,294 C284,268 320,250 360,250 C396,250 424,268 430,298 C440,332 426,372 420,420 L330,430 C292,418 250,404 222,402 L206,400 C200,400 198,398 198,392 Z" fill="${RED}" stroke="${INK}" stroke-width="${OL + 2}" stroke-linejoin="round"/>
    <path d="M372,248 C402,248 424,266 430,296 C440,330 426,372 420,420 L370,426 C392,390 388,340 400,300 C404,282 392,262 372,248 Z" fill="${INK}"/>
    <path d="M208,316 C224,306 252,300 282,296" fill="none" stroke="${HI}" stroke-width="5" stroke-linecap="round"/>
    <g transform="translate(296 316)">${eye(1.15)}</g>
    <ellipse cx="216" cy="332" rx="7" ry="4.5" fill="${INK}" transform="rotate(-20 216 332)"/>
    ${mouthOf(200, 384, 250, 388)}
    <path d="M376,256 L388,208 L404,262 Z M396,266 L416,218 L420,278 Z" fill="${RED}" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/><path d="M318,262 L346,254 L346,206 Z" fill="${CREAM}" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/><path d="M336,258 L346,254 L346,206 Z" fill="${INK}" opacity=".45"/>
    ${shape('M412,276 C440,268 462,288 464,312 L450,310 C466,332 462,356 446,368 L434,354 C442,330 436,300 412,276 Z', MANE_C, 5)}
  </g>
`;
};

/* ── t6 龍王：十字王冠 + 最大翅膀 + 胸章 ── */
const crown = `
  <g transform="translate(6 8)">
    <path d="M300,262 L318,214 L346,246 L372,200 L398,246 L428,214 L440,268 Z" fill="${GOLD}" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>
    <path d="M372,200 L398,246 L428,214 L440,268 L402,270 Z" fill="${GOLD2}"/>
    <rect x="296" y="262" width="150" height="20" rx="6" fill="${GOLD}" stroke="${INK}" stroke-width="6"/>
    <path d="M372,196 L372,140 M352,160 L392,160" stroke="${INK}" stroke-width="24" stroke-linecap="round"/><path d="M372,196 L372,140 M352,160 L392,160" stroke="${GOLD}" stroke-width="13" stroke-linecap="round"/></g>`;
const t6 = () => `${cup()}${plinth}${(mane() + head({ clipId: 'c6' }) + rigid(ears()) + level(crown) + rigid(uniHorn(0.95)))}
  <path d="M330,560 L384,540 L438,560 L430,610 L384,632 L338,610 Z" fill="${GOLD}" stroke="${INK}" stroke-width="6" stroke-linejoin="round" transform="translate(-14 0)"/>
  <path d="M384,540 L438,560 L430,610 L384,632 Z" fill="${GOLD2}" transform="translate(-14 0)"/>
  <circle cx="370" cy="590" r="12" fill="${RED}" stroke="${INK}" stroke-width="4"/>`;


/* ── 頭飾（各階的主角；角只當配角）── */

// t2 馬：沿後頸的鬃毛（奶油色、一束一束往後飄）
const MANE = 'M398,258 C436,240 474,262 484,296 L466,298 C492,322 494,350 478,366 L464,360 C490,388 490,418 472,432 L458,426 C478,452 474,478 456,492 L444,470 C456,440 458,410 448,380 C442,340 430,300 398,258 Z';
const mane = () => `${shape(W(MANE), MANE_C)}<path d="${W('M466,298 C470,330 466,350 458,362')} ${W('M464,360 C468,392 464,412 456,428')}" fill="none" stroke="${INK}" stroke-width="4"/>
  <path d="${W('M484,296 L466,298 C492,322 494,350 478,366 L464,360 C490,388 490,418 472,432 L458,426 C478,452 474,478 456,492 L452,480 C470,456 468,430 454,420 C474,400 470,376 456,366 C474,346 470,316 456,304 Z')}" fill="${INK}" opacity=".45"/>`;

// t3 象：主教帽（尖頂、斜縫、頂球）
const MITRE = 'M318,270 C318,224 338,192 370,164 C402,192 422,224 422,270 Z';
const mitre = () => `<g transform="translate(0 6)">${shape(MITRE, CREAM)}
  <path d="M370,164 C402,192 422,224 422,270 L384,270 C396,236 392,200 370,164 Z" fill="${INK}" opacity=".4"/>
  <path d="M348,204 L398,258" stroke="${RED2}" stroke-width="10" stroke-linecap="round"/><path d="M348,204 L398,258" stroke="${INK}" stroke-width="3" stroke-linecap="round" opacity=".7"/>
  ${shape('M312,262 L428,262 L428,282 L312,282 Z', GOLD, 6)}<path d="M396,262 L428,262 L428,282 L396,282 Z" fill="${GOLD2}"/>
  ${shape('M370,148 m-10,0 a10,10 0 1,0 20,0 a10,10 0 1,0 -20,0', GOLD, 5)}</g>`;

// t4 城堡：城垛冠 + 頸部護甲
const BATTLE = 'M310,284 L310,218 L336,218 L336,238 L356,238 L356,206 L384,206 L384,238 L404,238 L404,218 L430,218 L430,284 Z';
const battlement = () => `<g transform="translate(0 6)">${shape(BATTLE, CREAM)}
  <path d="M384,206 L384,238 L404,238 L404,218 L430,218 L430,284 L392,284 Z" fill="${INK}" opacity=".4"/>
  <path d="M310,256 L430,256 M330,284 L330,256 M356,256 L356,238 M372,284 L372,256 M404,256 L404,238 M414,284 L414,256" stroke="${INK}" stroke-width="4"/></g>`;
const gorget = (clipId) => `<g clip-path="url(#${clipId})">
  ${[[478, 506], [520, 548]].map(([a, b]) => `<path d="${W(`M280,${a} C330,${a - 14} 420,${a - 22} 480,${a - 30} L480,${b - 30} C420,${b - 22} 330,${b - 14} 280,${b} Z`)}" fill="${GOLD}" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>
  <path d="${W(`M410,${a - 21} L480,${a - 30} L480,${b - 30} L410,${b - 21} Z`)}" fill="${GOLD2}"/>`).join('')}
  ${[[330, 486], [376, 476], [340, 528], [386, 518]].map(([x, y]) => { const [cx, cy] = bendPt(x, y); return `<circle cx="${cx}" cy="${cy}" r="4.5" fill="${INK}"/>`; }).join('')}</g>`;

// t5 皇后：金環 + 5 根往外彎的冠刺（尖端有珠）
const queenCrown = () => {
  const spikes = [[318, -34, 52], [344, -16, 70], [370, 0, 86], [396, 16, 70], [422, 34, 52]].map(([x, lean, h]) => {
    const d = `M${x - 9},266 C${x - 8},${266 - h * 0.5} ${x + lean * 0.4 - 4},${266 - h * 0.85} ${x + lean},${266 - h} C${x + lean * 0.4 + 4},${266 - h * 0.8} ${x + 8},${266 - h * 0.5} ${x + 9},266 Z`;
    return shape(d, GOLD, 5) + shape(`M${x + lean},${266 - h - 8} m-7,0 a7,7 0 1,0 14,0 a7,7 0 1,0 -14,0`, CREAM, 4);
  }).join('');
  return `<g transform="translate(0 6)">${spikes}${shape('M306,262 C340,254 400,254 434,262 L434,284 C400,276 340,276 306,284 Z', GOLD, 6)}
    <path d="M404,257 C416,258 426,260 434,262 L434,284 C426,282 416,280 404,279 Z" fill="${GOLD2}"/>
    <circle cx="370" cy="270" r="6" fill="${RED}" stroke="${INK}" stroke-width="3"/></g>`;
};

// t2 是青少年：整隻比 t3 矮一點（介於 t1 與 t3，偏向 t3），以底座為中心縮放
const teen = (body, k = 0.87) => `<g transform="translate(384 650) scale(${k}) translate(-384 -650)">${body}</g>`;
const t2 = () => `${cup()}${plinth}${teen((mane() + head({ clipId: 'c2' }) + rigid(ears() + uniHorn(0.85))))}`;
const t4 = () => `${cup()}${plinth}${(mane() + head({ clipId: 'c4' }) + gorget('c4') + rigid(ears()) + level(battlement()) + rigid(uniHorn(0.95)))}`;
const t5 = () => `${cup()}${plinth}${(mane() + head({ clipId: 'c5' }) + rigid(ears()) + level(queenCrown()) + rigid(uniHorn(0.95)))}`;
const tiers = { 1: t1, 2: t2, 3: t3, 4: t4, 5: t5, 6: t6 };
const svgOf = (body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 768 768" width="768" height="768">${body}</svg>`;
const out = path.join(__dirname, '..', 'out'); fs.mkdirSync(out, { recursive: true });
// 大階級的杯子本身已經很大（遊戲依 R 放大整張圖），所以 t4–t6 的生物（杯子以上的部分）縮小，杯子不變（碰撞範圍不變）
const FIG_SCALE = { 4: 0.84, 5: 0.74, 6: 0.66 };
const build = (n, f) => {
  const body = f(), c = cup(), k = FIG_SCALE[n];
  if (!k) return body;
  if (!body.startsWith(c)) throw new Error('t' + n + ' 必須以 cup() 開頭');
  return c + `<g transform="translate(384 650) scale(${k}) translate(-384 -650)">${body.slice(c.length)}</g>`;
};
for (const [ex, suf] of Object.entries(EXPRS)) { EXPR = ex; for (const [n, f] of Object.entries(tiers)) fs.writeFileSync(path.join(out, `unicorn_t${n}${suf}.svg`), svgOf(build(n, f))); }
EXPR = 'idle';
console.log('SVG →', out);
