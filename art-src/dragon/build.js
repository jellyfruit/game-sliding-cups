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
const HEAD = 'M196,330 C212,308 244,298 274,290 C296,262 322,246 352,242 C380,240 404,254 414,278 L436,300 '
  + 'C462,340 472,384 454,432 C438,474 420,504 436,552 C448,592 470,622 472,650 '
  + 'L312,650 C290,610 288,560 320,520 C352,482 370,452 362,420 C356,402 346,396 336,394 '
  + 'C300,390 250,374 214,354 C202,348 194,340 196,330 Z';
const BELLY = 'M312,650 C290,610 288,560 320,520 C352,482 370,452 362,420 C356,402 346,396 336,394 L344,392 C388,410 404,452 392,476 C370,512 330,560 352,650 Z';
const NECK_SPINES = [[452, 336], [462, 404], [440, 474], [436, 540]]
  .map(([x, y], i) => { const s = 1.25 - i * 0.12; return `<path d="${W(`M${x - 6},${y - 16 * s} L${x + 32 * s},${y + 4} L${x - 6},${y + 20 * s} Z`)}" fill="${RED2}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>`; }).join('');
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
function mouthOf(x0, y0, x1, y1) {                       // 從嘴角 (x0,y0) 到嘴根 (x1,y1)
  const line = `<path d="M${x0},${y0} C${x0 + 44},${y0 + 22} ${x1 - 34},${y1 - 6} ${x1},${y1}" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>`;
  const tooth = `<path d="M${x0 + 8},${y0 + 6} L${x0 + 16},${y0 + 18} L${x0 + 24},${y0 + 10} Z" fill="${CREAM}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`;
  if (EXPR === 'happy') return `<path d="M${x0},${y0} C${x0 + 44},${y0 + 22} ${x1 - 34},${y1 - 6} ${x1},${y1} C${x1 - 40},${y1 + 16} ${x0 + 40},${y0 + 46} ${x0 + 6},${y0 + 18} Z" fill="${INK}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
    <path d="M${x0 + 40},${y0 + 32} C${x0 + 60},${y0 + 26} ${x0 + 84},${y0 + 32} ${x0 + 96},${y0 + 38} C${x0 + 76},${y0 + 46} ${x0 + 54},${y0 + 44} ${x0 + 40},${y0 + 32} Z" fill="#e8506a"/>${tooth}`;
  if (EXPR === 'fast') return `${line.replace('stroke-width="5"', 'stroke-width="4"')}<ellipse cx="${x0 + 30}" cy="${y0 + 12}" rx="13" ry="15" fill="${INK}"/><ellipse cx="${x0 + 30}" cy="${y0 + 17}" rx="7" ry="6" fill="#e8506a"/>`;
  return line + tooth;
}
function head({ clipId, eyeScale = 1 }) {
  const HD = W(HEAD), BL = W(BELLY);
  return `
  <clipPath id="${clipId}"><path d="${HD}"/></clipPath>
  <path d="${HD}" fill="none" stroke="${INK}" stroke-width="${SIL}" stroke-linejoin="round"/>
  <path d="${HD}" fill="${RED}"/>
  <g clip-path="url(#${clipId})">
    <!-- 腹甲（沿著 S 形的喉嚨與胸口）-->
    <clipPath id="${clipId}b"><path d="${BL}"/></clipPath>
    <path d="${BL}" fill="${CREAM}"/>
    <g clip-path="url(#${clipId}b)" stroke="${INK}" stroke-width="4">${[430, 462, 494, 528, 564, 600, 636].map(y => `<path d="${W(`M280,${y + 8} L350,${y - 1} L420,${y - 10}`)}"/>`).join('')}</g>
    <path d="${W('M344,392 C388,410 404,452 392,476 C370,512 330,560 352,650')}" fill="none" stroke="${INK}" stroke-width="4"/>
    <!-- 大黑影：沿著後頸，邊緣切成有節奏的鋸齒（不是一整根柱子）-->
    <path d="${W('M372,232 L520,232 L520,320 L520,400 L520,480 L520,560 L520,660 L404,660 C396,632 414,612 400,592 L420,574 C402,552 404,532 394,514 L416,500 C404,482 410,462 418,446 L404,432 C420,412 426,392 418,372 L402,360 C410,340 404,320 394,302 C400,284 384,256 372,232 Z')}" fill="${INK}"/>
    ${rigid(`<path d="M336,394 C300,390 250,374 214,354 C230,374 290,402 336,418 C356,420 372,414 382,404 C366,402 350,398 336,394 Z" fill="${INK}"/>
    <path d="M205,326 C226,308 256,300 284,292" fill="none" stroke="#ffd9b0" stroke-width="4" stroke-linecap="round"/>`)}
  </g>
  <path d="${HD}" fill="none" stroke="${INK}" stroke-width="${OL}" stroke-linejoin="round"/>
  ${rigid(`
  <g transform="translate(284,304)">${eye(eyeScale)}</g>
  <!-- 鼻孔、嘴 -->
  <ellipse cx="226" cy="322" rx="6" ry="3.5" fill="${INK}" transform="rotate(-20 226 322)"/>
  ${mouthOf(206, 346, 334, 386)}`)}`;
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

const t3 = () => `${cup()}${plinth}${wing(0.6)}${(NECK_SPINES + head({ clipId: 'c3' }) + rigid(horns(0.6, horn(HORN_A) + horn(HORN_B) + hornShadow(HORN_A_SH))) + level(mitre()))}`;

/* ── t1 剛出生：蛋殼 + 小龍頭 + 兩隻小角 ── */
const t1 = () => {
  const shell = 'M286,650 C282,590 312,548 384,540 C456,548 486,590 482,650 Z';
  return `${cup()}
  <ellipse cx="384" cy="668" rx="86" ry="22" fill="${INK}"/>
  <!-- 小龍頭（探出殼外）-->
  <g transform="translate(104 222) scale(.78) rotate(-30 380 420)">
    <path d="M200,330 C214,306 252,296 290,290 C310,262 340,248 372,248 C402,248 424,266 430,296 C440,330 426,372 420,420 L330,430 C296,414 252,386 216,362 C206,354 198,344 200,330 Z" fill="${RED}" stroke="${INK}" stroke-width="${OL + 2}" stroke-linejoin="round"/>
    <path d="M372,248 C402,248 424,266 430,296 C440,330 426,372 420,420 L370,426 C392,390 388,340 400,300 C404,282 392,262 372,248 Z" fill="${INK}"/>
    <path d="M208,332 C232,310 264,300 292,294" fill="none" stroke="#ffd9b0" stroke-width="5" stroke-linecap="round"/>
    <g transform="translate(296 316)">${eye(1.15)}</g>
    <ellipse cx="226" cy="324" rx="6" ry="3.5" fill="${INK}"/>
    ${mouthOf(214, 350, 326, 388)}
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
const t6 = () => `${cup()}${plinth}${wing(0.82)}${(NECK_SPINES + head({ clipId: 'c6' }) + rigid(horns(0.58, horn(HORN_A) + hornShadow(HORN_A_SH))) + level(crown))}
  <path d="M330,560 L384,540 L438,560 L430,610 L384,632 L338,610 Z" fill="${GOLD}" stroke="${INK}" stroke-width="6" stroke-linejoin="round" transform="translate(-14 0)"/>
  <path d="M384,540 L438,560 L430,610 L384,632 Z" fill="${GOLD2}" transform="translate(-14 0)"/>
  <circle cx="370" cy="590" r="12" fill="${RED}" stroke="${INK}" stroke-width="4"/>`;


/* ── 頭飾（各階的主角；角只當配角）── */
const sil = (d) => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${SIL}" stroke-linejoin="round"/>`;
const shape = (d, fill, w = OL) => `${sil(d)}<path d="${d}" fill="${fill}" stroke="${INK}" stroke-width="${w}" stroke-linejoin="round"/>`;

// t2 馬：沿後頸的鬃毛（奶油色、一束一束往後飄）
const MANE = 'M398,258 C436,240 474,262 484,296 L466,298 C492,322 494,350 478,366 L464,360 C490,388 490,418 472,432 L458,426 C478,452 474,478 456,492 L444,470 C456,440 458,410 448,380 C442,340 430,300 398,258 Z';
const mane = () => `${shape(W(MANE), CREAM)}<path d="${W('M466,298 C470,330 466,350 458,362')} ${W('M464,360 C468,392 464,412 456,428')}" fill="none" stroke="${INK}" stroke-width="4"/>
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
const t2 = () => `${cup()}${plinth}${teen((mane() + head({ clipId: 'c2' }) + rigid(horns(0.5, horn(HORN_A) + hornShadow(HORN_A_SH)))))}`;
const t4 = () => `${cup()}${plinth}${wing(0.68)}${(NECK_SPINES + head({ clipId: 'c4' }) + gorget('c4') + rigid(horns(0.5, horn(HORN_A) + horn(HORN_B))) + level(battlement()))}`;
const t5 = () => `${cup()}${plinth}${wing(0.75)}${(NECK_SPINES + head({ clipId: 'c5' }) + rigid(horns(0.55, horn(HORN_A) + hornShadow(HORN_A_SH))) + level(queenCrown()))}`;
const tiers = { 1: t1, 2: t2, 3: t3, 4: t4, 5: t5, 6: t6 };
const svgOf = (body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 768 768" width="768" height="768">${body}</svg>`;
const out = path.join(__dirname, '..', 'out'); fs.mkdirSync(out, { recursive: true });
// 大階級的杯子本身已經很大（遊戲依 R 放大整張圖），所以 t4–t6 的生物（杯子以上的部分）縮小，杯子不變（碰撞範圍不變）
const FIG_SCALE = process.env.NOSCALE ? {} : JSON.parse(require('fs').readFileSync(require('path').join(__dirname, '..', 'sizes.json'), 'utf8'))['dragon'] || {};
const build = (n, f) => {
  const body = f(), c = cup(), k = FIG_SCALE[n];
  if (!k) return body;
  if (!body.startsWith(c)) throw new Error('t' + n + ' 必須以 cup() 開頭');
  return c + `<g transform="translate(384 650) scale(${k}) translate(-384 -650)">${body.slice(c.length)}</g>`;
};
for (const [ex, suf] of Object.entries(EXPRS)) { EXPR = ex; for (const [n, f] of Object.entries(tiers)) fs.writeFileSync(path.join(out, `dragon_t${n}${suf}.svg`), svgOf(build(n, f))); }
EXPR = 'idle';
console.log('SVG →', out);
