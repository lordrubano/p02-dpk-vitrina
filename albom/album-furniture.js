/* P-02 · дачная мебель из тех же брусков: скамья-сундук, стол с полками, комплект (решение владельца 27.09.2026).
   Тумбы и стенки строятся по контурам движка (E.outline): чётности уровней, Т-узлы, втулки — как в конструкторе.
   Оси: y — вверх, план — x, z. Размеры в мм. */
(function () {
'use strict';
const E = window.P02;
const W = 50, HB = 30;                                   // лага 50×30: ширина, высота плашмя

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene(); scene.background = new THREE.Color('#dfe7e2');
const camera = new THREE.PerspectiveCamera(35, 1, 10, 60000);
const controls = new THREE.OrbitControls(camera, canvas); controls.enableDamping = true; controls.maxPolarAngle = Math.PI * 0.495;
const hemi = new THREE.HemisphereLight('#ffffff', '#8a8f7a', 0.75); scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff7ea', 0.95); sun.position.set(-2500, 5000, 3500); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -4000, right: 4000, top: 4000, bottom: -4000, near: 100, far: 14000 });
scene.add(sun);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(30000, 30000), new THREE.MeshStandardMaterial({ color: '#cfd3cc', roughness: 1 }));
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
const grid = new THREE.GridHelper(12000, 24, '#b7bdb5', '#c4c9c2'); grid.position.y = 0.5; scene.add(grid);

const std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.8 }, o || {}));
const M = {
  bar: std('#3a3532'), bar2: std('#46403c'), top: std('#4a4038'), line: std('#34302d'),
  rod: std('#9aa592', { roughness: 0.5 }), cap: std('#111'), sheet: std('#d9894f', { roughness: 0.6 }),
  filler: std('#5a4d44'), cover: std('#3d4a45', { roughness: 1, transparent: true, opacity: 0.93 }), panel: std('#cfc6b4', { roughness: 0.85 }), steel: std('#b9bdc2', { roughness: 0.35, metalness: 0.6 }), tie: std('#8a5a33'), glass: std('#e6f4f3', { roughness: 0.15, transparent: true, opacity: 0.35 }), plug: std('#1f1b19', { roughness: 0.6 }), trim: std('#2f2926', { roughness: 0.7 }), alu: std('#8e9296', { roughness: 0.5 })
};
const PN = 25;                                           // накладная панель: пенополистирол в твёрдой оболочке, 25 мм
let root = null, SHOW = { sheets: true, ends: 'plugs', shelf2: false, pnS: false, pnI: false, pnT: false, glass: false, ties: false };   // shelf2 — вторая полка в тумбах стола (докупается)   // торцы: заглушки или декоративный уголок — выбор покупателя

M.led = new THREE.MeshStandardMaterial({ color: '#fff4dc', emissive: '#ffd58a', emissiveIntensity: 1.1, roughness: 0.4 });   // рассеиватель светодиодной ленты
M.pc = new THREE.MeshStandardMaterial({ color: '#eef3f1', transparent: true, opacity: 0.62, roughness: 0.35, side: THREE.DoubleSide });   // сотовый поликарбонат 4 мм, молочный
M.pvc = new THREE.MeshStandardMaterial({ color: '#eef6f5', transparent: true, opacity: 0.35, roughness: 0.15, side: THREE.DoubleSide });   // гибкое стекло ПВХ (рулонные шторы)
M.person = new THREE.MeshStandardMaterial({ color: '#b9b2a8', roughness: 0.9, transparent: true, opacity: 0.8 });
let LIGHTX = null, PANELX = null;                          // PANELX — линии стоек света: накладка делится по ним (свет может быть и не заказан)                                          // оси стоек света: доски над ними — с проходом 100 мм по центру
function box(g, sx, sy, sz, x, y, z, mat, ry) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
  m.position.set(x, y, z); if (ry) m.rotation.y = ry; m.castShadow = true; m.receiveShadow = true; g.add(m); return m;
}
/* вставка в пазу стенки; если вставки не заказаны — невидимое «место под лист»: по нему втулки ставятся так же,
   как со вставкой (заглушки и их число не зависят от того, докуплены ли вставки); в цену и спецификацию не идёт */
M.ghost = new THREE.MeshBasicMaterial({ visible: false });
function sheetBox(g, sx, sy, sz, x, y, z, ry) {
  if (SHOW.sheets) return box(g, sx, sy, sz, x, y, z, M.sheet, ry);
  const m = box(g, sx, sy, sz, x, y, z, M.ghost, ry); m.visible = false; m.castShadow = false; m.receiveShadow = false; m.userData.ghostSheet = true; return m;
}
/* 30.09.2026 (правило владельца «торцы всегда закрыты»): лист стенки тумбы не заходит во втулки колонн — кончается в 3 мм
   от их торца (заглушка 2 мм + зазор 1 мм). Лист между колоннами: cols — оси колонн (втулки 50 мм) вдоль стенки. */
const SHEET_GAP = W / 2 + 3;
function sheetsBetween(g, cols, h, y, at) {
  const c = cols.slice().sort((p, q) => p - q);
  for (let i = 0; i + 1 < c.length; i++) { const a = c[i] + SHEET_GAP, b = c[i + 1] - SHEET_GAP; if (b - a > 20) at(b - a, (a + b) / 2); }
}
function cyl(g, r, h, x, y0, z, mat) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 16), mat);
  m.position.set(x, y0 + h / 2, z); m.castShadow = true; g.add(m); return m;
}
/* Корпус-сруб по контуру движка: бруски по уровням своей чётности, стержни в узлах, вставки.
   opts: shape, M (модуль), belts, at [x,z], tWalls — стенки с Т-узлом ('L'/'R': лист из двух узких), fillTop — доборы в верхний ряд */
function crib(g, o) {
  const ol = o.ol || E.outline(o.shape, o.M), L = o.M + W, lv = o.belts * 2, H = lv * HB, cx = o.at[0], cz = o.at[1];
  const tSide = e => Math.abs(e.d[0]) < 0.5 && (o.tWalls || []).indexOf(e.mid[0] > 0 ? 'R' : 'L') >= 0;
  const openSide = e => (o.open || []).indexOf(Math.abs(e.d[0]) < 0.5 ? (e.mid[0] > 0 ? 'R' : 'L') : (e.mid[1] > 0 ? 'S' : 'N')) >= 0;
  const nb = lv / 2;
  /* какие бруски стенки остаются: открытая — только нижний и верхний (рамка), «через брусок» — чётные номера */
  const kept = (e, j) => openSide(e) ? (j === nb - 1 || (j === 0 && !o.openFull)) : o.keep ? o.keep(j, nb) : o.skip ? (j % 2 === 0 || j === nb - 1) : true;
  ol.edges.forEach(e => {
    const ang = Math.atan2(e.d[1], e.d[0]), Me = e.len || o.M, Le = Me + W;   // длина бруска — по ребру (свой контур)
    const dropT = o.dropTop && o.dropTop(e);                         // верхний брусок снят — в его промежуток ложатся доски
    for (let k = e.parity, j = 0; k < lv; k += 2, j++) {
      if (dropT && j === nb - 1) {
        if (o.dropStub) [e.a, e.b].forEach(V => box(g, W, HB, W, cx + V[0], k * HB + HB / 2, cz + V[1], M.filler, -ang));   // втулка в углу вместо конца бруска
        continue;
      }
      if (kept(e, j)) { box(g, Le, HB, W, cx + e.mid[0], k * HB + HB / 2, cz + e.mid[1], k % 4 < 2 ? M.bar : M.bar2, -ang);
        if (SHOW.ends === 'plugs') [-1, 1].forEach(sg => box(g, 2, HB - 2, W - 2, cx + e.mid[0] + sg * e.d[0] * (Le / 2 + 1), k * HB + HB / 2, cz + e.mid[1] + sg * e.d[1] * (Le / 2 + 1), M.plug, -ang));
        continue; }
      [[e.a, e.ia], [e.b, e.ib]].forEach(([V, q]) => { if (o.openFull && openSide(e) && !(ol.turn[q] > 1)) return;   // у полностью открытой стенки — только в углах
        box(g, W, HB, W, cx + V[0], k * HB + HB / 2, cz + V[1], M.filler, -ang); });   // втулка в углу — держит шаг
    }
    if (o.fillTop && (lv - 1) % 2 !== e.parity && o.fillTop(e))           // добор в пустой верхний ряд стенки
      box(g, Me - W - 4, HB, W, cx + e.mid[0], (lv - 1) * HB + HB / 2, cz + e.mid[1], M.filler, -ang);
    if (!o.noSheet && !openSide(e)) {                                        // вставка в наружной полости (не заказана — «место под лист», невидимое)
      const cut = o.sheetCut ? o.sheetCut(e) : dropT;
      const z0 = e.parity ? 1.5 * HB : HB / 2, off = 13;
      const z1 = dropT && o.sheetTop ? o.sheetTop : (e.parity ? H - HB / 2 : H - 1.5 * HB) - (cut ? 2 * HB : 0);   // лист — до паза в балке
      const put = (w, s) => sheetBox(g, w, z1 - z0, 4, cx + e.mid[0] + e.d[0] * s + e.n[0] * off, (z0 + z1) / 2, cz + e.mid[1] + e.d[1] * s + e.n[1] * off, -ang);
      const w0 = Me - 2 * 27;
      if (tSide(e)) { const hw = Me / 2 - 27 - 27; put(hw, -(27 + hw / 2)); put(hw, 27 + hw / 2); } else put(w0, 0);
    }
  });
  if (SHOW.ends === 'trims') ol.pts.forEach((P, k) => {
    if (!(ol.turn[k] > 1)) return;                                      // только выпуклые углы
    const ei = ol.edges[ol.inE[k]], eo = ol.edges.find(e => e.ia === k), hT = o.trimH || H;
    [[ei, 1], [eo, -1]].forEach(([e, sg]) => {
      const c = [P[0] + sg * e.d[0] * (W / 2 - 25) + e.n[0] * (W / 2 + 1.5), P[1] + sg * e.d[1] * (W / 2 - 25) + e.n[1] * (W / 2 + 1.5)];
      box(g, 50, hT, 3, cx + c[0], hT / 2, cz + c[1], M.trim, -Math.atan2(e.d[1], e.d[0]));
    });
  });
  const rodH = o.rodH || H;
  /* у полностью открытой стенки средний стержень — только в верхней рамке: внизу проход свободен */
  const openMid = q => o.openFull && !(ol.turn[q] > 1) && openSide(ol.edges[ol.inE[q]]) && openSide(ol.edges.find(e => e.ia === q));
  ol.pts.forEach((p, q) => { const y0 = openMid(q) ? (lv - 2) * HB : 0;
    cyl(g, 6, rodH - 2 - y0, cx + p[0], y0, cz + p[1], M.rod); if (!o.noCaps) cyl(g, 9, 3, cx + p[0], rodH - 2, cz + p[1], M.cap); });
  if (o.shelf) {                                  // полка: отрезки лаги поперёк, концами в промежутках стенок вдоль x (как полка-решётка кашпо)
    const k = o.shelf, n = Math.floor((o.M - W + 5) / 55), Wd = n * 50 + (n - 1) * 5;
    for (let i = 0; i < n; i++) box(g, W, HB, o.M, cx - Wd / 2 + 25 + i * 55, k * HB + HB / 2, cz, M.top);   // концы — до середины стенок, как у полки кашпо
  }
  (o.tWalls || []).forEach(t => cyl(g, 6, H - 2, cx + (t === 'R' ? o.M / 2 : -o.M / 2), 0, cz, M.rod));   // стержень Т-узла — в центре стенки, насквозь
  return { ol, H, L, top: H };
}
/* Прямоугольный контур движка с разным шагом узлов по x и z (тумбы стола «зимней» линейки: 397, 507, 907, 957 × 944).
   Чётности рёбер чередуются по обходу, как у сруба. */
function rectOutline(sx, nx, sz, nz) {
  const X = sx * nx, Z = sz * nz, pts = [];
  for (let i = 0; i < nx; i++) pts.push([-X / 2 + i * sx, -Z / 2]);
  for (let i = 0; i < nz; i++) pts.push([X / 2, -Z / 2 + i * sz]);
  for (let i = 0; i < nx; i++) pts.push([X / 2 - i * sx, Z / 2]);
  for (let i = 0; i < nz; i++) pts.push([-X / 2, Z / 2 - i * sz]);
  const N = pts.length, edges = [], inE = [];
  for (let i = 0; i < N; i++) {
    const a = pts[i], b = pts[(i + 1) % N], len = Math.hypot(b[0] - a[0], b[1] - a[1]), d = [(b[0] - a[0]) / len, (b[1] - a[1]) / len];
    edges.push({ i, ia: i, ib: (i + 1) % N, a, b, d, n: [d[1], -d[0]], mid: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], ang: Math.atan2(d[1], d[0]), len, parity: i % 2 });
    inE[(i + 1) % N] = i;
  }
  const turn = pts.map((p, k) => { const e0 = edges[inE[k]], e1 = edges[k]; return Math.abs(e0.d[0] * e1.d[1] - e0.d[1] * e1.d[0]) > 0.5 ? Math.PI / 2 : 0; });
  return { pts, edges, turn, inE };
}
function flatTop(g, len, D, y0, alongX) {
  const n = Math.floor((D + 5) / 55), Wd = n * 50 + (n - 1) * 5;
  for (let i = 0; i < n; i++) { const c = -Wd / 2 + 25 + i * 55; alongX ? box(g, len, HB, W, 0, y0 + HB / 2, c, M.top) : box(g, W, HB, len, c, y0 + HB / 2, 0, M.top); }
  return n;
}
/* ---------- дачная линейка: максимум места для ног (решение владельца 27.09.2026) ----------
   Где тумба — там ноги не поставить, поэтому тумбы только по краям и узкие вдоль стола: 1 модуль 400 вдоль × 2 поперёк
   (397 × 744, на всю глубину столешницы), открыты с торца — хранение. Между ними — только тонкие стойки-стенки 50 мм
   поперёк стола, между коленями соседей. Три продольные балки (брусок на ребро) — на линиях стержней: лежат на колоннах
   брусков в узлах тумб и стоек и надеты на стержни; доборов нет, пролёт ≤ 650 мм, алюминий не нужен. Доски поперёк, вровень.
   Хранение открыто внутрь, к месту для ног: снаружи — сплошные стенки. */
const M4 = 347, L4 = M4 + W, DEP = 2 * M4 + W, TOPD = 2 * L4, TOPY = 22 * HB;   // столешница 794 = два табурета — задвигаются вровень
/* Тумба 1 × 2 модуля, 11 поясов, открыта внутрь (рамка + полка). У торцевых стенок (под продольными балками) верхнего бруска нет:
   лист заходит в паз снизу балки, в углах вместо концов снятого бруска — втулки (держат высоту балки). */
function endTumba(g, x, outward, Mt, opt) {
  opt = opt || {};
  const sub = new THREE.Group(); sub.position.x = x; sub.rotation.y = Math.PI / 2; g.add(sub);
  const endWall = e => Math.abs(e.d[0]) < 0.5, a = opt.a || Mt + W, na = 1;   // боковая стенка — один пролёт: средняя колонка не нужна (край над тумбой держат рамка + балка)
  const c = crib(sub, { shape: 'r21', ol: opt.a ? rectOutline(Mt, 2, (a - W) / na, na) : null, M: Mt, belts: 11, at: [0, 0], open: [outward < 0 ? 'S' : 'N'],
                        openFull: opt.full, noCaps: true, dropTop: opt.a ? null : endWall, dropStub: true, sheetTop: TOPY + 10,
                        keep: opt.a ? (j => j % 2 === 0) : ((j, nb) => j % 3 === 0 || j >= nb - 2) });   // зимняя линейка — шаг 120 мм, как у скамеек; иначе — через два
  /* Полка: доски вдоль боковых стенок, концы — в промежутках стенок. Боковые стенки на разных чётностях (0,6,12… и 1,7,13…):
     доски лежат на бруске ряда 7 одной стенки, у другой под концы подложен отрезок (как упор крышки) на её бруске ряда 6.
     Базовая полка — ряд 8 (240–270 мм); вторая — по выбору покупателя, ряд 14 (420–450 мм). Зимой полку переставляют на ряд 20. */
  const ends = c.ol.edges.filter(endWall), n = Math.floor((a - 2 * W + 5) / 55), Wd = n * 50 + (n - 1) * 5;
  const sg = new THREE.Group(); sub.add(sg);
  /* зимняя линейка: база — ряд 18; доп. полка летом — ряд 10 (на упоре), зимой — ряд 19, прямо на первой: в этом ряду бруски стенок не мешают */
  (opt.a ? [18].concat(opt.shelves || [], SHOW.shelf2w ? [10] : SHOW.shelf2box ? [19] : []) : SHOW.shelf2 ? [8, 14] : [8]).forEach(k => {
    for (let i = 0; i < n; i++) { const zc = -Wd / 2 + 25 + i * 55; if (na === 2 && Math.abs(zc) < 50) continue;   // у средней колонки стенки — пропуск
      box(sg, 2 * Mt, HB, W, 0, k * HB + HB / 2, zc, k !== 18 && opt.shelves && opt.shelves.indexOf(k) >= 0 ? M.tie : M.top); }
    if (k !== 19) ends.filter(e => e.parity === 0).forEach(e => box(sg, W, HB, e.len - W - 4, e.mid[0], (k - 1) * HB + HB / 2, e.mid[1], M.bar2));
  });
  c.ol.pts.forEach(p => cyl(sub, 6, 48, p[0], c.H - 2, p[1], M.rod));      // концы стержней — в отверстия балок
  c.sub = sub; c.shelf = sg; return c;
}
/* Стойка разреженная: в каждом пролёте нижний, средний и верхний брусок; нагрузку от балок несут колонны у стержней —
   концы брусков и втулки на остальных рядах. Средняя перемычка — на высоте сидений (420 мм): в нечётном пролёте брусок
   прямо под сиденьем (ряд 13), в чётном — брусок рядом ниже (ряд 12) и на нём добор (ряд 13) — на них лежат сиденья,
   когда их просовывают сквозь стойку (вариант на модуле 500). */
function prop(g, x, Mt, seatRest, pitch) {
  const lv = 22, Lb = Mt + W, st = k => { const r = []; for (let i = k; i < lv; i += pitch) r.push(i); return r; };
  const ka = pitch ? st(0) : [0, 12, 20], kb = pitch ? st(1) : [1, 13, 21];   // шаг 4 ряда — как у тумб; иначе низ, середина, верх
  [[-Mt / 2, ka], [Mt / 2, kb]].forEach(([zc, ks]) => ks.forEach(k => box(g, W, HB, Lb, x, k * HB + HB / 2, zc, M.bar)));
  if (seatRest) box(g, W, HB, Mt - W - 4, x, 13 * HB + HB / 2, -Mt / 2, M.filler);   // добор под сиденье в чётном пролёте
  const occ = zz => zz < 0 ? ka : zz > 0 ? kb : ka.concat(kb);
  [-Mt, 0, Mt].forEach(zz => { for (let k = 0; k < lv; k++) if (occ(zz).indexOf(k) < 0) box(g, W, HB, W, x, k * HB + HB / 2, zz, M.filler); });
  [-Mt, 0, Mt].forEach(zz => cyl(g, 6, lv * HB + 46, x, 0, zz, M.rod));
}
/* Накладка на стол — панели от стойки света до стойки (линии стоек стола и входов тумб), на концах пазы 120 × 140 под
   вилку. Без света пазы закрыты вставками из того же материала (60 × 140, по две на стойку) — панель одна на оба случая,
   свет можно докупить позже. Внутри секции панель делится по линии стойки, у края секции (ближе 70 мм) — нет. */
function panelPieces(g, x0, x1, y, h, D) {
  if (!PANELX) { holeSheet(g, x0, x1, y, h, D, M.panel); return; }
  const bps = [x0].concat(PANELX.filter(m => m > x0 + 70 && m < x1 - 70), [x1]), Lz = D / 2 - 70, lit = !!LIGHTX;
  for (let i = 0; i + 1 < bps.length; i++) {
    const a = bps[i] + (i > 0 ? 0.5 : 0), b = bps[i + 1] - (i + 2 < bps.length ? 0.5 : 0);
    const hw = PANELX.zh || 70, cz = PANELX.zc ? [-PANELX.zp, PANELX.zp] : [0], ed = [-D / 2].concat(...cz.map(c => [c - hw, c + hw]), [D / 2]);   // полосы: сплошные и с пазами под стойки
    for (let e = 0; e + 1 < ed.length; e += 2) if (ed[e + 1] - ed[e] > 1) box(g, b - a, h, ed[e + 1] - ed[e], (a + b) / 2, y, (ed[e] + ed[e + 1]) / 2, M.panel);
    const cw = PANELX.zc ? 25 : 60, cuts = PANELX.map(m => [Math.max(a, m - cw), Math.min(b, m + cw)]).filter(([p, q]) => q - p > 1).sort((p, q) => p[0] - q[0]);
    cz.forEach(c => { let cur = a; cuts.concat([[b, b]]).forEach(([p, q]) => { if (p - cur > 1) box(g, p - cur, h, 2 * hw, (cur + p) / 2, y, c, M.panel); cur = Math.max(cur, q); });
      if (!lit) cuts.forEach(([p, q]) => { if (q - p > 3) box(g, q - p - 2, h, 2 * hw - 2, (p + q) / 2, y, c, M.panel); }); });   // вставки в пазы
  }
}
function holeSheet(g, x0, x1, y, h, D, mat) {             // лист по секции; со светом — вырезы 60 × 100 под стойки
  if (!LIGHTX) { box(g, x1 - x0, h, D, (x0 + x1) / 2, y, 0, mat); return; }
  const hw = LIGHTX.zh || 70, cz = LIGHTX.zc ? [-LIGHTX.zp, LIGHTX.zp] : [0], ed = [-D / 2].concat(...cz.map(c => [c - hw, c + hw]), [D / 2]);
  for (let e = 0; e + 1 < ed.length; e += 2) if (ed[e + 1] - ed[e] > 1) box(g, x1 - x0, h, ed[e + 1] - ed[e], (x0 + x1) / 2, y, (ed[e] + ed[e + 1]) / 2, mat);
  cz.forEach(c => { let cur = x0; LIGHTX.map(mx => [mx - (LIGHTX.zc ? 25 : 60), mx + (LIGHTX.zc ? 25 : 60)]).filter(([a, b]) => b > x0 && a < x1).sort((p, q) => p[0] - q[0]).concat([[x1, x1]]).forEach(([a, b]) => {
    if (a - cur > 1) box(g, a - cur, h, 2 * hw, (cur + a) / 2, y, c, mat); cur = Math.max(cur, b); }); });
}
/* ---------- освещение над столом (вариант А, 27.09.2026) ----------
   Стойки света — на сдвоенных центральных колоннах (стойки стола и входы тумб): два бруска лаги по бокам средней балки
   столешницы, внизу стянуты с ней шпилькой M12. Сверху конёк из двух брусков на ребро (1580–1630 мм), стянут со стойками
   шпилькой M12; между брусками — алюминиевый профиль с лентой 24 В и матовым рассеивателем (низ света 1590 мм,
   840 мм над столом), бруски закрывают ленту сбоку от глаз. Все детали ≤ 1 м — в ящик. */
const LIGHT = { y0: 1580, y1: 1630, yb: 18 * HB + 2, ylo: 14 * HB, zf: 40, xf: 42, zr: 80 };   // xf 42: у входа тумбы вилка проходит снаружи заглушек перегородки
function studA(g, x, y, z, len, axis) {                   // шпилька M12 с гайками; axis 'x' — вдоль стола, 'z' — поперёк
  const m = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, len, 12), M.steel); if (axis === 'x') m.rotation.z = Math.PI / 2; else m.rotation.x = Math.PI / 2; m.position.set(x, y, z); g.add(m);
  [-1, 1].forEach(sd => { const n = new THREE.Mesh(new THREE.CylinderGeometry(10, 10, 8, 6), M.steel); if (axis === 'x') { n.rotation.z = Math.PI / 2; n.position.set(x + sd * (len / 2 - 8), y, z); } else { n.rotation.x = Math.PI / 2; n.position.set(x, y, z + sd * (len / 2 - 8)); } g.add(n);
    const w = axis === 'x' ? new THREE.Mesh(new THREE.BoxGeometry(4, 44, 8), M.steel) : new THREE.Mesh(new THREE.BoxGeometry(8, 44, 4), M.steel);   // барашек — откручивается рукой
    w.position.copy(n.position); g.add(w); });
}
/* Стойка света — «вилка» из 4 брусков 30 × 50: по два с каждой стороны стойки стола (или входа тумбы), по бокам средней
   балки столешницы. Снизу (от 540 мм) вилка обхватывает верх стойки и стянута насквозь 4 шпильками M12: на 585 мм —
   через втулки сдвоенной колонны, на 645 — через верхний брусок. Проходит столешницу в вырезе 120 × 140 (две доски).
   Наверху конёк — два бруска на ребро (1580–1630), стянут с вилкой 2 шпильками поперёк. */
function drawLight(g, xs, led, high, inners) {                   // high — есть навес: нижнего конька света нет, лента — под коньком навеса
  if (led === undefined) led = true;
  const L = LIGHT, yB = L.yb, y0 = high ? CAN.yR - 80 : L.y0, y1 = xs.zc && high ? (xs.lim < 1500 ? CAN.pJ : CAN.pT) : L.y1, hM = y1 - yB, pcs = [];   // навес на углах: вилка — сама стойка (на 4 — до стыка)
  xs.forEach((x, i) => {
    const inner = inners ? inners[i] : i === 0 ? -1 : i === xs.length - 1 ? 1 : 0;      // у входа тумбы внутренняя сторона — над базовой полкой
    (xs.zc ? [] : [0]).forEach(zc => {                                // у навеса на углах тумб стойку рисует навес
    [-1, 1].forEach(sx => { const b0 = sx === inner ? yB : L.ylo, h = y1 - b0; [-1, 1].forEach(sz => { box(g, 30, h, 50, x + sx * L.xf, (b0 + y1) / 2, zc + sz * L.zf, M.bar); pcs.push(h);
      if (SHOW.ends === 'plugs') { if (!(xs.zc && high && xs.lim < 1500)) box(g, 28, 2, 48, x + sx * L.xf, y1 + 1, zc + sz * L.zf, M.plug); box(g, 28, 2, 48, x + sx * L.xf, b0 - 1, zc + sz * L.zf, M.plug); } }); });
    [-1, 1].forEach(sz => { studA(g, x, 21 * HB + HB / 2, zc + sz * L.zf, 2 * (L.xf + 15) + 26, 'x');                                     // вилка — насквозь через стойку: 645 и 465 мм
      if (inner) { const a = x - inner * (L.xf + 15), b = x + inner * W / 2; studA(g, (a + b) / 2, 15 * HB + HB / 2, zc + sz * L.zf, Math.abs(a - b) + 26, 'x'); }
      else studA(g, x, 15 * HB + HB / 2, zc + sz * L.zf, 2 * (L.xf + 15) + 26, 'x'); });
    });
    if (!high) [-1, 1].forEach(sx => studA(g, x + sx * L.xf, (L.y0 + y1) / 2, 0, 2 * (L.zr + 15) + 26, 'z'));                        // конёк — поперёк
  });
  let len = 0;
  for (let i = 0; i + 1 < xs.length; i++) {                // конёк — кусками от стойки до стойки, стыки над стойками
    const a = i === 0 ? xs[i] - L.xf - 15 : xs[i], b = i + 2 === xs.length ? xs[i + 1] + L.xf + 15 : xs[i + 1];
    if (!high) [-1, 1].forEach(sz => { box(g, b - a, y1 - L.y0, 30, (a + b) / 2, (L.y0 + y1) / 2, sz * L.zr, M.bar); pcs.push(b - a); });
    const kx = xs.zc ? 35 : L.xf + 18, l0 = xs[i] + kx, l1 = xs[i + 1] - kx; len += l1 - l0;
    if (led) { box(g, l1 - l0, 12, 24, (l0 + l1) / 2, y0 + 20, 0, M.alu); box(g, l1 - l0, 2, 20, (l0 + l1) / 2, y0 + 13, 0, M.led); }   // профиль и рассеиватель
    const nh = high ? Math.max(1, Math.ceil((l1 - l0) / 700)) : 1; for (let h = 0; h < nh; h++) { box(g, 30, 20, 2 * (L.zr - 15), l0 + (l1 - l0) * (h + 0.5) / nh, high ? y0 + 40 : y1 - 10, 0, M.bar); pcs.push(2 * (L.zr - 15)); }   // поперечины под профиль (под навесом — подвесы к коньку через ≤ 0,7 м)
    if (!led) continue;
    const xc = (l0 + l1) / 2, sp = new THREE.SpotLight(0xffd29a, 0.4, 4200, 1.25, 0.7, 1.2); sp.position.set(xc, y0 + 8, 0); sp.target.position.set(xc, 0, 0);
    sp.userData.led = 'spot'; sp.shadow.mapSize.set(1024, 1024); sp.shadow.camera.near = 50; sp.shadow.bias = -0.0008; g.add(sp); g.add(sp.target);
    const pl_ = new THREE.PointLight(0xffd9a0, 0.2, 2600, 1.6); pl_.position.set(xc, y0 - 40, 0); pl_.userData.led = 'point'; g.add(pl_);
  }
  if (SHOW.ends === 'plugs' && !high) [xs[0] - L.xf - 15 - 1, xs[xs.length - 1] + L.xf + 15 + 1].forEach(x => [-1, 1].forEach(sz => box(g, 2, y1 - L.y0 - 2, 28, x, (L.y0 + y1) / 2, sz * L.zr, M.plug)));
  return { len: Math.round(len), n: xs.length, pcs: pcs.map(Math.round), y0 };
}
/* ---------- навес (вариант А, 27.09.2026) ----------
   На вилку каждой стойки света — надставка из 4 брусков (снаружи вилки, внахлёст 300 мм, 2 барашка M12 на сторону).
   Наверху конёк навеса (2 бруска на ребро, 2350–2400), на нём стропила — по одному на сторону у каждой стойки, уклон 18°,
   до краевых брусков на 2020–2070 (ширина навеса 2,2 м — над столом и скамьями). Листы — сотовый поликарбонат 4 мм,
   молочный, каналами вдоль ската, от стропила до стропила (торцевые — с выносом 300 мм); верх — накладка-конёк.
   К земле — 4 винтовых анкера у торцов и тросы с талрепами к углам навеса: навес — парус, без растяжек не ставить. */
/* ---------- навес — створки на петлях (27.09.2026) ----------
   Створка — рама из лаги 50 × 30 с пазом, в пазу сотовый поликарбонат 4 мм (как вставки в стенках тумб); по одной на пролёт
   между стойками света, на каждый скат. У конька — 2 разъёмные петли на коньковом брусе (снимается подъёмом). У края —
   упоры: брусок 1150 мм, верх на шарнире у нижней обвязки створки, низ пальцем-барашком в отверстие надставки (надставка —
   направляющая); крыша неподвижная — 18°, упор в одном положении. Стык створок — нащельник, над коньком —
   накладка на надставках. Край створки лежит на упорах — не висит. */
const CAN = { portal: true, zc: 390, pJ: 1130, pT: 2250, pD: 200, pZ: 522, ov: 300, Ls: 1000, yR: 2400, yE: 1330, zr: 80, zh: 95, yTop: 2490, stay: 1150, close: Math.atan(0.33), open: -Math.PI / 4, sh: 1000, mid: 450, cBot: 600, spoke: 0, pinLo: 1380 };
CAN.S = a => [CAN.zh - 25 * Math.sin(a) + CAN.mid * Math.cos(a), CAN.yR - 25 * Math.cos(a) - CAN.mid * Math.sin(a)];   // ось спицы у средника створки (z, y)
CAN.spoke = CAN.S(CAN.close)[0] - 40;                                                        // закрыто — спица горизонтальна
CAN.fold = (() => { const py = a => { const [z, y] = CAN.S(a); return y - Math.sqrt(Math.max(0, CAN.spoke * CAN.spoke - (z - 40) * (z - 40))); };
  if (py(Math.PI / 2) >= CAN.pinLo) return Math.PI / 2; let lo = CAN.close, hi = Math.PI / 2; for (let i = 0; i < 40; i++) { const a = (lo + hi) / 2; if (py(a) > CAN.pinLo) lo = a; else hi = a; } return lo; })();   // крыша сложена полностью: створки вертикально, спиной к спине
let CANST = null, RAIN = null;                            // RAIN — итог проверки дождя со шторками (для текста)                                          // створки и упоры текущей сцены — для открывания
function barBetween(g, a, b, sx, sy, mat) {                // брусок между точками (ось — по длине)
  const v = new THREE.Vector3().subVectors(b, a), m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, v.length()), mat);
  m.position.copy(a).addScaledVector(v, 0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), v.clone().normalize()); m.castShadow = true; m.userData.slope = true; g.add(m); return m;
}
function decoPlan() {                                      // полки у стоек (A — на стыке, C — две), сплошная ширма у торца, ширмы по бокам — под каждой полкой
  const dk = SHOW.postDeco || 'none', n = dk === 'C' ? 2 : dk === 'A' ? 1 : 0;
  return { lv: [CAN.pJ, CAN.pJ + 430].slice(0, n), end: !!SHOW.postEnd, sT: 0 };
}
function drawCanopy(g, xs, Lt) {
  const C = CAN, pcs = [], sheets = [], x0 = xs[0] - (xs.ov || C.ov), x1 = xs[xs.length - 1] + (xs.ov || C.ov), lim = xs.lim || 1080, nS = Math.max(1, Math.ceil((x1 - x0 - 1) / lim)),
    bnd = xs.seams ? [x0].concat(xs.seams, [x1]) : xs.midMax && nS === 3 ? [x0, -lim / 2, lim / 2, x1] : Array.from({ length: nS + 1 }, (_, i) => x0 + (x1 - x0) * i / nS);   // 3 створки на скат — по шву на каждую половину стола; каждая ложится на крышку ящика
  const vstud = (x, y0, y1, z) => { cyl(g, 6, y1 - y0, x, y0, z, M.steel); cyl(g, 10, 6, x, y0 - 6, z, M.steel); cyl(g, 10, 6, x, y1, z, M.steel); };
  const st = { sashes: [], stays: [], shutters: [], ang: C.close, down: 0, halfEnd: lim < 1500 }, spcs = [], plates = [];   // на 4 (ящик 1,09 м) торцевая штора — двумя половинами на липучке
  const midU = xs.zc ? (xs.zc - C.zh) / Math.cos(C.close) : C.mid, P = xs.zc ? { zc: xs.zc, yT: Math.floor(C.yR - midU * Math.sin(C.close)) - 6, d: C.pD, z: xs.zc } : null;   // портал: прогон над боковой стенкой тумбы, средник створки — на нём
  xs.forEach(x => {
    if (P) {                                                                             // угловая стойка — внутри тумбы у торцевой стенки: от своего анкера до крыши; стенки не сверлятся
      [-1, 1].forEach(s2 => { const zc = s2 * 365;                                          // стойка z 290–440: до боковой стенки 20 мм — место под гайки
        xs.pz.forEach(pz => { const z = s2 * pz;                                                   // 3 бруска на ребро вплотную: 30 вдоль стола, 150 поперёк
          box(g, 30, C.pJ, 50, x, C.pJ / 2, z, M.bar); pcs.push(C.pJ); box(g, 30, P.yT - C.pJ, 50, x, (C.pJ + P.yT) / 2, z, M.bar); pcs.push(P.yT - C.pJ);
          cyl(g, 8, 300, x, C.pJ - 150, z, M.steel);                                                // стык встык: стальной вкладыш в полости, по 150 мм в каждую часть
          if (SHOW.ends === 'plugs') box(g, 28, 2, 48, x, P.yT + 1, z, M.plug); });
        const lv = decoPlan().lv;
        if (!lv.length) [C.pJ - 55, C.pJ + 60].forEach(y => studA(g, x, y, zc, 150 + 26, 'z'));                    // стык без полки: шпилька поперёк через три бруска и вкладыши
        lv.forEach(yj => [yj - 55, yj + 60].forEach(y => studA(g, x, y, s2 * 365, 470 - 260 + 26, 'z')));             // с полкой — насквозь через опорные бруски и бортики
        [[685, 500], [725, 510], [P.yT - 25, 500], [P.yT - 25 - P.d, 500]].forEach(([y, zo]) => studA(g, x, y, s2 * (290 + zo) / 2, zo - 290 + 26, 'z'));   // через стойку + обвязку столешницы / прогон
        [287.5, 442.5].forEach(zz => box(g, 40, 240, 5, x, 120, s2 * zz, M.steel)); box(g, 40, 6, 170, x, -3, zc, M.steel); cyl(g, 30, 700, x, -710, zc, M.steel);   // башмак на винтовом анкере — внутри тумбы, щёки поперёк
        [60, 180].forEach(y => studA(g, x, y, zc, 160 + 26, 'z'));
        studA(g, x, 2180, zc, 90 + 26, 'x'); });                                                     // к перекладине
      [-1, 1].forEach(sx => { box(g, 30, 50, 916, x + sx * 30, 2180, 0, M.bar); pcs.push(916); });           // перекладина портала — пара брусков на ребро по бокам стоек, 2155–2205
      [-1, 1].forEach(sz => { box(g, 30, C.yTop - 2155 - 2, 50, x, (2155 + C.yTop - 2) / 2, sz * 40, M.bar); pcs.push(C.yTop - 2155 - 2); studA(g, x, 2180, sz * 40, 90 + 26, 'x'); });   // бабка конька — два бруска вплотную к коньку; на 2 мм короче: сверху заглушка, на ней накладка конька
      studA(g, x, C.yR - 25, 0, 2 * (C.zr + 15) + 26, 'z');
      return; }
    [-1, 1].forEach(sx => [-1, 1].forEach(sz => { box(g, 30, C.yTop - C.yE, 50, x + sx * 72, (C.yE + C.yTop) / 2, sz * 40, M.bar); pcs.push(C.yTop - C.yE); }));   // надставки — до накладки конька
    [-1, 1].forEach(sz => [C.yE + 70, 1540].forEach(y => studA(g, x, y, sz * 40, 2 * 87 + 26, 'x')));
    [-1, 1].forEach(sx => studA(g, x + sx * 72, C.yR - 25, 0, 2 * (C.zr + 15) + 26, 'z'));
    [-1, 1].forEach(sz => { vstud(x, -2, TOPY, sz * 25); box(g, 110, 6, 80, x, -5, 0, M.steel); cyl(g, 30, 700, x, -710, 0, M.steel); });   // анкер под стойкой
  });
  for (let i = 0; i + 1 < bnd.length; i++) { box(g, bnd[i + 1] - bnd[i] - 2, 4, 220, (bnd[i] + bnd[i + 1]) / 2, C.yTop + 2, 0, M.pc); plates.push([bnd[i + 1] - bnd[i] - 2, 220]); }   // накладка конька — кусками по створкам (в ящик)
  for (let i = 0; i + 1 < bnd.length; i++) {
    const a = bnd[i], b = bnd[i + 1], xc = (a + b) / 2, sw = b - a - 6;
    [-1, 1].forEach(sz => { box(g, b - a - 1, 50, 30, xc, C.yR - 25, sz * C.zr, M.bar); pcs.push(b - a); });      // коньковый брус с петлями
    [-1, 1].forEach(sz => {
      const sg = new THREE.Group(); sg.position.set(0, C.yR, sz * C.zh); sg.userData.sz = sz; g.add(sg);
      const L = C.Ls, inW = sw - 60;
      /* боковины рамы — на ребро (30.09.2026): торцы брусков на ребро (низ, средник) упираются в боковину всем сечением — закрыты ею;
         раньше боковина лежала плашмя (30 мм), верх торца на 20 мм был открыт, а лист выходил сквозь торец в боковину */
      [a + 3 + 15, b - 3 - 15].forEach(xb => { const m = box(sg, 30, 50, L, xb, 25, sz * L / 2, M.bar); m.userData.slope = true; spcs.push(L); });
      { const m = box(sg, inW, 30, 50, xc, 15, sz * 25, M.bar); m.userData.slope = true; spcs.push(Math.round(inW)); }                          // верх рамы
      [L - 15, L - 45].forEach(u => { const m = box(sg, inW, 50, 30, xc, 25, sz * u, M.bar); m.userData.slope = true; spcs.push(Math.round(inW)); });   // низ рамы — два бруска на ребро: край держит повисшего
      (xs.midDouble ? [C.mid - 15, C.mid + 15] : [midU]).forEach(u => { const m = box(sg, inW, 50, 30, xc, 25, sz * u, M.bar); m.userData.slope = true; spcs.push(Math.round(inW)); });                     // средник на ребро — на него опираются спицы, держит вынос створки за спицей
      const p = box(sg, inW + 20, 4, L - 80, xc, 15, sz * L / 2, M.pc); p.userData.slope = true; sheets.push([Math.round(inW + 20), L - 80]);
      if (i + 2 < bnd.length) { const c = box(sg, 60, 3, L, b, 51.5, sz * L / 2, M.pc); c.userData.slope = true; }                   // нащельник на стыке створок — поверх боковин на ребро
      [a + 80, b - 80].forEach(xh => { const h = box(sg, 40, 6, 24, xh, -3, sz * 14, M.steel); h.userData.slope = true; });              // петли у конька
      sg.rotation.x = sz * C.close; st.sashes.push(sg);
      sg.updateMatrixWorld(true);
      if (!P) xs.forEach(m => [m - 102, m + 102].forEach(xst => { if (xst < a + 60 || xst > b - 60) return;                                     // спицы: палец ездит по надставке, как у зонта
        st.stays.push({ g, sg, sz, x: xst, side: Math.sign(xst - m), mesh: null, pin: null }); pcs.push(C.spoke); }));
    });
  }
  if (P) [-1, 1].forEach(s2 => { const z = s2 * P.z, yA = P.yT - 25, yB = P.yT - 25 - P.d, t0 = xs[0] - 42, t1 = xs[xs.length - 1] + 42;   // прогон: верхняя нитка — под средником створок, нижняя — от стойки до стойки
    for (let i = 0; i + 1 < bnd.length; i++) { const a = Math.max(bnd[i] + 1, t0), b = Math.min(bnd[i + 1] - 1, t1); if (b - a > 20) { box(g, b - a, 50, 30, (a + b) / 2, yA, z, M.bar); pcs.push(Math.round(b - a)); } }   // стыки верхней — на стыках створок
    for (let i = 0; i + 1 < xs.length; i++) { const a = i ? xs[i] : xs[0] - 18, b = i + 2 < xs.length ? xs[i + 1] : xs[i + 1] + 18, cu = b - a > lim ? [a, (a + b) / 2, b] : [a, b];   // нижняя — насквозь через крайние стойки
      cu.slice(1).forEach((q, j) => { const p = cu[j]; box(g, q - p - 2, 50, 30, (p + q) / 2, yB, z, M.bar); pcs.push(Math.round(q - p - 2)); });   // стыки нижней — у стоек и посередине (вразбежку с верхней)
      const a2 = xs[i], b2 = xs[i + 1], n = Math.ceil((b2 - a2) / 360); for (let k = i ? 1 : 0; k <= n; k++) { const bx = a2 + (b2 - a2) * k / n; box(g, 30, P.d - 50, 30, bx, P.yT - 25 - P.d / 2, z, M.bar); pcs.push(P.d - 50); cyl(g, 6, P.d + 50, bx, P.yT - P.d - 50, z, M.steel); } } });   // вставки между нитками — на шпильке, шаг ≤ 360
  if (P) { const dp = decoPlan(), lv = dp.lv, base = TOPY + 80 + (SHOW.pnT ? PN : 0), sh = (x, y0, y1, z, w, alongX) => box(g, alongX ? w : 4, y1 - y0, alongX ? 4 : w, x, (y0 + y1) / 2, z, M.sheet);
    [[xs[0], xs[1]], [xs[3], xs[2]]].forEach(([pf, pi]) => { const a = Math.min(pf, pi) - 15, b = Math.max(pf, pi) + 15, xc = (a + b) / 2, L = b - a, g0 = Math.min(pf, pi) + 15, g1 = Math.max(pf, pi) - 15;
      [-1, 1].forEach(s2 => lv.forEach(yj => {                                             // полка: опорные бруски по обе стороны стоек, доски между стойками (верх — шов стыка), бортики
        [275, 455].forEach(zr => { box(g, L, 50, 30, xc, yj - 55, s2 * zr, M.bar); pcs.push(Math.round(L)); box(g, L, 50, 30, xc, yj + 60, s2 * zr, M.bar); pcs.push(Math.round(L)); });
        const n = Math.max(1, Math.floor((g1 - g0 - 4 + 5) / 55)), pitch = (g1 - g0 - 4) / n;
        for (let i = 0; i < n; i++) { box(g, pitch - 5, 30, 210, g0 + 2 + pitch * (i + 0.5), yj - 15, s2 * 365, M.top); pcs.push(210); } }));
      if (dp.end) { const so = Math.sign(pf), xw = xs.wall[xs.indexOf(pf)], tg = Math.tan(C.close), zG = Math.round(C.zh + C.Ls * Math.cos(C.close) - 81), yT = C.yR - tg * (zG - C.zh) - 55;
        // сплошная ширма у торца — дальняя стенка тумбы продолжается вверх до фронтона: бруски с пазом, между ними втулки, стеклопластиковые стержни тумбы идут дальше вверх, лист — сквозь пазы
        const D = 2 * MD3 + W, H = yT - base, n = Math.max(2, Math.round((H + 90) / 120)), gp = (H - n * HB) / (n - 1), cols = [-MD3, -Z0, Z0, MD3];
        for (let k = 0; k < n; k++) { const y = base + k * (HB + gp) + HB / 2; box(g, W, HB, D, xw, y, 0, M.bar2); pcs.push(D); plugsZ(g, xw, y, -D / 2, D / 2);
          if (k < n - 1) cols.forEach(z => { for (let j = 0; j < 3; j++) { box(g, W, gp / 3, W, xw, y + HB / 2 + gp / 3 * (j + 0.5), z, M.filler); pcs.push(50); } }); }   // втулки стопкой, как в тумбе
        cols.forEach(z => cyl(g, 6, H, xw, base, z, M.rod));                                                // стержни тумбы — дальше вверх, через обвязку столешницы
        const yj = base + Math.floor(n / 2) * (HB + gp) + HB / 2;                                            // стык двух листов — в пазу среднего бруска
        [[base + 5, yj], [yj, yT - 5]].forEach(([y0, y1]) => sheetsBetween(g, cols, y1 - y0, 0, (w, zc) => { sh(xw + so * 13, y0, y1, zc, w, false).userData.slot = true; plates.push([Math.round(w), Math.round(y1 - y0)]); })); }   // листы — в пазах брусков, между колоннами втулок (во втулки не заходят, 30.09.2026)
      for (let t = 0; t < dp.sT; t++) [-1, 1].forEach(s2 => { const z = s2 * 365, gl = g1 - g0 - 4;   // ширмы по бокам: между стойкой у входа и дальней, в плоскости стоек
        const yb = t === 0 ? base + 25 : lv[t - 1] + 25, yt = lv[t] - 55;
        box(g, gl, 50, 30, (g0 + g1) / 2, yb, z, M.bar); pcs.push(Math.round(gl)); box(g, gl, 50, 30, (g0 + g1) / 2, yt, z, M.bar); pcs.push(Math.round(gl));   // низ — на столешнице / на досках полки, верх — средняя опора досок
        sh((g0 + g1) / 2, yb + 15, yt - 15, z, gl - 10, true); }); }); }
  const cb = lim < 1500 ? bnd : [x0, 0, x1];                // по длинной стороне: на 6 и 8 — 2 шторы (стык посередине, на липучке), на 4 — 3, по створкам: иначе рулон не ляжет в ящик 1,09 м
  if (SHOW.curtSide !== false) [-1, 1].forEach(sz => { const sg = st.sashes.find(q => q.userData.sz === sz); cb.slice(1).forEach((b, i) => { const a = cb[i];   // боковые шторы — отдельная позиция
    const xc = (a + b) / 2, roll = new THREE.Mesh(new THREE.CylinderGeometry(32, 32, b - a - 40, 16), M.alu); roll.rotation.z = Math.PI / 2; roll.userData.slope = true; g.add(roll);
    let sleeve = null; if (b - a - 40 > lim) { sleeve = new THREE.Mesh(new THREE.CylinderGeometry(30, 30, 90, 16), M.steel); sleeve.rotation.z = Math.PI / 2; sleeve.userData.slope = true; g.add(sleeve); }   // длинная труба — две половины на муфте
    st.shutters.push({ g, sg, sz, xc, w: b - a - 60, roll, sleeve, sheet: null, bar: null }); }); });
  st.noEnd = SHOW.curtEnd === false || (P && decoPlan().end); st.portal = !!P; st.xEnd = xs.wall ? xs.wall[xs.length - 1] + W / 2 : 0; const gOff = P ? 60 : 132;
  const gab = [drawGable(g, xs[0] - gOff, pcs, st, plates), drawGable(g, xs[xs.length - 1] + gOff, pcs, st, plates)];   // фронтоны и торцевые шторы
  const prevST = CANST; CANST = st; setCanopyAngle(st.ang); if (g !== root) CANST = prevST;   // невидимая копия (для цены, для зимы) не перехватывает кнопки
  const curt = st.shutters.reduce((u, o) => u + (o.axis === 't' ? (o.w + o.wb) / 2 * Math.hypot(o.y0 - o.yB, o.xc - o.xb) : o.w * (o.y0 - (o.bot || C.cBot))), 0) / 1e6;   // площадь штор
  const sh2 = sheets.filter(q => q), area = sh2.reduce((u, [w, l]) => u + w * l, 0) / 1e6;
  const curtDims = st.shutters.map(o => o.axis === 't' ? [Math.round(Math.max(o.w, o.wb)), Math.round(Math.hypot(o.y0 - o.yB, o.xc - o.xb))] : [Math.round(o.w), Math.round(o.y0 - (o.bot || C.cBot))]);   // полотна штор: ширина × высота
  const sashL = []; bnd.slice(1).forEach((b, i) => sashL.push(Math.round(b - bnd[i] - 6), Math.round(b - bnd[i] - 6)));
  const nSide = st.shutters.filter(o => o.axis !== 't').length, curtTxt = nSide + ' боковых рулонных штор и 2 косые торцевые' + (st.halfEnd ? ' (каждая из двух половин на липучке)' : '');
  const sideDims = curtDims.filter((d, i) => st.shutters[i].axis !== 't'), endDims = curtDims.filter((d, i) => st.shutters[i].axis === 't');
  return { sideDims, endDims, curtTxt, loose: pcs.map(Math.round), sashL, Ls: C.Ls, plates: plates.map(p => p.map(Math.round)), curtDims, pcs: pcs.concat(spcs).map(Math.round), sheets: sh2, area: area + gab[0] + gab[1], gableArea: gab[0] + gab[1], curtArea: curt, curtains: st.shutters.length, n: xs.length, sashMax: Math.round(Math.max(...bnd.slice(1).map((x, i) => x - bnd[i]))), sashes: st.sashes.length, shutters: st.shutters.length, stays: st.stays.length, hinges: 2 * st.sashes.length, width: 2 * (C.zh + C.Ls), len: Math.round(x1 - x0), anchors: xs.zc ? 2 * xs.length : xs.length, posts: xs.zc ? 2 * xs.length : xs.length, portal: !!xs.zc, eave: Math.round(C.yR - C.Ls * Math.sin(C.close)), top: C.yTop + 4 };
}
function drawGable(g, xg, pcs, st, plates) {                         // фронтон: треугольник под скатами, низ — затяжка на уровне края крыши
  const C = CAN, t = Math.tan(C.close), yu = z => C.yR - t * (Math.abs(z) - C.zh), zE = Math.round(C.zh + C.Ls * Math.cos(C.close) - 81), yb = yu(zE) - 55, zt = 110, yt = yu(zt) - 8, yr = 2330;   // yu — низ створки над точкой z
  const P = (z, y) => new THREE.Vector3(xg, y, z);
  [-1, 1].forEach(sz => {
    box(g, 30, 50, zE, xg, yb + 25, sz * zE / 2, M.bar); pcs.push(zE);                          // затяжка — две половины встык под стойкой фронтона: торец стойки лежит на них целиком (30.09.2026)
    const z0 = zE - 160, m = barBetween(g, P(sz * z0, yu(z0) - 31), P(sz * (zt + 12), yu(zt + 12) - 31), 30, 50, M.bar);   // верх — в 12 мм от перемычки: оба торца под заглушку pcs.push(Math.round(m.geometry.parameters.depth));   // скатные бруски — под створкой
  });
  box(g, 30, yr - 15 - (yb + 50), 50, xg, (yb + 50 + yr - 15) / 2, 0, M.bar); pcs.push(Math.round(yr - 15 - yb - 50));   // стойка фронтона по оси
  box(g, 30, 30, 2 * zt, xg, yr, 0, M.bar); pcs.push(2 * zt);                                                    // верхняя перемычка под коньком
  [-1, 1].forEach(sz => st && st.portal ? studA(g, xg + (xg < 0 ? 1 : -1) * 45, 2213 - 25, sz * 200, 146, 'x') : studA(g, xg + (xg < 0 ? 1 : -1) * 30, 2213 - 25, sz * 200, 2 * 45 + 26, 'x'));   // фронтон — к обеим перекладинам             // притянут к спицам
  /* поликарбонат фронтона (30.09.2026, «торцы всегда закрыты»): край листа идёт в пазу скатного бруска (12 мм), но у обоих его торцев
     уходит под брусок — лист не выходит сквозь торец, там встаёт заглушка; у перемычки лист в её пазу (20 мм), у её торцев — ниже неё.
     Контур — ломаная по z от края к оси (низ — на затяжке); лист — две половины, стык за стойкой фронтона (в ящик). */
  const th = Math.atan(t), sn = Math.sin(th), cs = Math.cos(th), hb = 25 / cs, bb = z => yu(z) - 31 - hb, z0 = zE - 160, yA = yu(z0) - 31, zU = zt + 12, yB0 = yb + 50, yTop = yr + 5, yLow = yr - 15 - 3;
  const chain = [[zE - 20, yB0], [zE - 20, yu(zE - 20) - 8], [z0 + 25 * sn + 2.5 * cs, yA + 25 * cs - 2.5 * sn - 2], [z0 - 25 * sn + 2.5 * cs, yA - 25 * cs - 2.5 * sn - 1.5],
    [z0 - 25 * sn - 4, bb(z0 - 25 * sn - 4) - 3], [z0 - 100, bb(z0 - 100) + 12], [zU + 50, bb(zU + 50) + 12], [zU + 13, bb(zU + 13) - 3], [zU - 25 * sn - 4, yLow], [zt - 10, yLow], [zt - 10, yTop], [0, yTop]];
  const pos = []; let pcA = 0;
  [-1, 1].forEach(sz => { for (let i = 0; i + 1 < chain.length; i++) { const [za, ya] = chain[i], [zb, yb2] = chain[i + 1]; if (za - zb < 0.01) continue;
    const q = [[za, yB0], [zb, yB0], [zb, yb2], [za, ya]].map(([z, y]) => [sz * z, y]); [0, 1, 2, 0, 2, 3].forEach(k => pos.push(xg, q[k][1], q[k][0])); pcA += (za - zb) * ((ya + yb2) / 2 - yB0); } });
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.computeVertexNormals();
  const pm = new THREE.Mesh(geo, M.pc); pm.userData.slope = true; pm.userData.gable = true; g.add(pm); if (plates) plates.push([zE - 20, yTop - yB0], [zE - 20, yTop - yB0]);
  if (st && !st.noEnd) { const out = xg < 0 ? -1 : 1, w = 2 * zE - 80;                                                 // торцевая штора — одна, косая: рулон под затяжкой фронтона на всю ширину,
    const roll = new THREE.Mesh(new THREE.CylinderGeometry(32, 32, w + 20, 16), M.alu); roll.rotation.x = Math.PI / 2; roll.position.set(xg + out * 55, yb - 36, 0); roll.userData.slope = true; g.add(roll);
    const sl = new THREE.Mesh(new THREE.CylinderGeometry(30, 30, 90, 16), M.steel); sl.rotation.x = Math.PI / 2; sl.position.set(xg + out * 55, yb - 36, 0); sl.userData.slope = true; g.add(sl);   // труба рулона — две половины на муфте (в ящик)
    const wb = 2 * MD3 + W - 60, parts = st.halfEnd ? [[0, -w / 2, 0, -wb / 2], [0, w / 2, 0, wb / 2]] : [[-w / 2, w / 2, -wb / 2, wb / 2]];   // [верх от, до, низ от, до] по z
    parts.forEach(([t0, t1, b0, b1]) => st.shutters.push({ g, axis: 't', xc: xg + out * 55, zc: 0, w: Math.abs(t1 - t0), wb: Math.abs(b1 - b0), tc: (t0 + t1) / 2, bc: (b0 + b1) / 2, roll, fixedY: yb - 36 - 32, xb: st.portal ? out * (st.xEnd + 45) : xg - out * 52, yB: TOPY + 40, tie: st.portal ? out * st.xEnd : xg - out * 107,
      hz: parts.length > 1 ? [Math.sign(b1 + b0) * 100, Math.sign(b1 + b0) * 300] : [-300, 300], sheet: null, bar: null })); }   // низ — к торцу столешницы
  return pcA / 1e6;
}
function setCanopyAngle(ang, down) {                        // створки на угол ang (18° — крыша, до CAN.fold — сложена), спицы и шторы следом; down 0…1 — шторы свёрнуты…опущены
  const st = CANST; if (!st) return; st.ang = ang; if (down !== undefined) st.down = down;
  st.sashes.forEach(sg => { sg.rotation.x = sg.userData.sz * ang; sg.updateMatrixWorld(true); });
  st.stays.forEach(o => {                                    // спица: верх — у средника створки, низ — палец на надставке (ездит вверх-вниз)
    if (o.mesh) { o.g.remove(o.mesh); o.g.remove(o.pin); o.mesh = null; }
    const S = new THREE.Vector3(o.x, -25, o.sz * CAN.mid).applyMatrix4(o.sg.matrixWorld), zp = o.sz * 40, dz = S.z - zp;
    const P = new THREE.Vector3(o.x, S.y - Math.sqrt(Math.max(0, CAN.spoke * CAN.spoke - dz * dz)), zp);
    o.mesh = barBetween(o.g, P, S, 30, 50, M.bar);
    o.pin = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 2 * 30 + 26, 8), M.steel); o.pin.rotation.z = Math.PI / 2; o.pin.position.set(o.x - o.side * 15, P.y, zp); o.pin.userData.slope = true; o.g.add(o.pin);
  });
  st.shutters.forEach(o => {                                 // рулоны: по длинным сторонам — на торце створки (до 600 мм), на торцах — под затяжкой фронтона (до 800 — над столешницей)
    if (o.axis === 't') {                                   // косая торцевая: трапеция от рулона к торцу столешницы, сужается до ширины стола
      o.y0 = o.fixedY; o.z = 0; if (o.sheet) { o.g.remove(o.sheet); o.g.remove(o.bar); o.sheet = null; } if (o.hooks) { o.hooks.forEach(k => o.g.remove(k)); o.hooks = null; }
      const d = st.down; if (d < 0.01) return; const x1 = o.xc + (o.xb - o.xc) * d, y1 = o.y0 + (o.yB - o.y0) * d, w1 = o.w + (o.wb - o.w) * d, c1 = o.tc + (o.bc - o.tc) * d;
      const q = [[o.xc, o.y0, o.tc - o.w / 2], [o.xc, o.y0, o.tc + o.w / 2], [x1, y1, c1 + w1 / 2], [x1, y1, c1 - w1 / 2]], pos = []; [0, 1, 2, 0, 2, 3].forEach(i => pos.push(...q[i]));
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.computeVertexNormals();
      o.sheet = new THREE.Mesh(geo, M.pvc); o.sheet.userData.slope = true; o.sheet.userData.quad = q; o.g.add(o.sheet);
      o.bar = new THREE.Mesh(new THREE.CylinderGeometry(10, 10, w1, 10), M.steel); o.bar.rotation.x = Math.PI / 2; o.bar.position.set(x1, y1 - 10, c1); o.bar.userData.slope = true; o.g.add(o.bar);
      if (d > 0.98) o.hooks = o.hz.map(zh => { const L = Math.abs(o.xb - o.tie) - 12, c = new THREE.Mesh(new THREE.BoxGeometry(L, 3, 25), M.tie);   // два ремня — к торцу столешницы
        c.position.set((o.xb + o.tie) / 2 + Math.sign(o.xb - o.tie) * 6, o.yB - 10, zh); c.userData.slope = true; o.g.add(c); return c; });
      return; }
    if (o.axis === 'z') { o.y0 = o.fixedY; o.z = o.zc; }
    else { const e = new THREE.Vector3(o.xc, 20, o.sz * (CAN.Ls + 40)).applyMatrix4(o.sg.matrixWorld); o.roll.position.copy(e); if (o.sleeve) o.sleeve.position.copy(e); o.y0 = e.y - 32; o.z = e.z; }
    if (o.sheet) { o.g.remove(o.sheet); o.g.remove(o.bar); o.sheet = null; } if (o.hooks) { o.hooks.forEach(k => o.g.remove(k)); o.hooks = null; }
    const h = st.down * Math.max(0, o.y0 - (o.bot || CAN.cBot)); if (h < 5) return;
    o.sheet = new THREE.Mesh(o.axis === 'z' ? new THREE.BoxGeometry(1.5, h, o.w) : new THREE.BoxGeometry(o.w, h, 1.5), M.pvc); o.sheet.position.set(o.xc, o.y0 - h / 2, o.z); o.sheet.userData.slope = true; o.g.add(o.sheet);
    o.bar = new THREE.Mesh(new THREE.CylinderGeometry(10, 10, o.w, 10), M.steel); if (o.axis === 'z') o.bar.rotation.x = Math.PI / 2; else o.bar.rotation.z = Math.PI / 2; o.bar.position.set(o.xc, o.y0 - h - 10, o.z); o.bar.userData.slope = true; o.g.add(o.bar);
    if (o.axis === 'z' && st.down > 0.98) o.hooks = [-1, 1].map(k => { const L = Math.abs(o.xc - o.tie) - 12, c = new THREE.Mesh(new THREE.BoxGeometry(L, 3, 25), M.tie);   // ремни: низ торцевой шторы — к задней стенке опоры стола
      c.position.set((o.xc + o.tie) / 2 + Math.sign(o.xc - o.tie) * 6, o.bot - 10, Math.sign(o.z) * (k < 0 ? 150 : 430)); c.userData.slope = true; o.g.add(c); return c; });
  });
  if (SHOW.frame) applyVis();
}
let canAnim = null;
function tweenCanopy(a1, d1, done) {                        // плавно к углу крыши a1 и положению шторок d1
  if (!CANST) return; const a0 = CANST.ang, d0 = CANST.down, t0 = performance.now(); if (canAnim) { cancelAnimationFrame(canAnim); clearTimeout(canAnim); }
  const tick = f => document.hidden ? setTimeout(f, 30) : requestAnimationFrame(f);
  const step = () => { const k = Math.min(1, (performance.now() - t0) / 3000), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    setCanopyAngle(a0 + (a1 - a0) * e, d0 + (d1 - d0) * e); canBar(); if (k < 1) canAnim = tick(step); else { canAnim = null; if (done) done(); } };
  canAnim = tick(step);
}
function setCheck(id, v) { const el = document.getElementById(id); if (el) el.checked = v; }
function animateRoof(fold) {                               // сложить крышу как зонт (шторы сначала свернуть) / раскрыть
  if (!CANST) return; SHOW.roofFold = fold; setCheck('roofFoldc', fold);
  if (fold) { SHOW.shDown = false; setCheck('shDownc', false); if (CANST.down > 0.01) tweenCanopy(CANST.ang, 0, () => tweenCanopy(CAN.fold, 0)); else tweenCanopy(CAN.fold, 0); }
  else tweenCanopy(CAN.close, 0);
}
function animateShutters(down) {                           // опустить / свернуть шторы; если крыша сложена — сначала раскрыть
  if (!CANST) return; SHOW.shDown = down; setCheck('shDownc', down);
  if (down) { SHOW.roofFold = false; setCheck('roofFoldc', false); if (CANST.ang > CAN.close + 0.01) tweenCanopy(CAN.close, 0, () => tweenCanopy(CAN.close, 1)); else tweenCanopy(CAN.close, 1); }
  else tweenCanopy(CANST.ang, 0);
}
const animateCanopy = open => animateRoof(!open);
/* кнопки навеса прямо на сцене (видны, когда навес в сцене) */
let canDemo = false;
const canUI = (() => { const host = document.getElementById('c') && document.getElementById('c').parentElement; if (!host) return null;
  const d = document.createElement('div'); d.id = 'canBar';
  d.style.cssText = 'position:absolute;left:50%;bottom:44px;transform:translateX(-50%);display:none;gap:8px;z-index:5;flex-wrap:wrap;justify-content:center';
  const mk = (id, txt, fn) => { const b = document.createElement('button'); b.id = id; b.type = 'button'; b.textContent = txt;
    b.style.cssText = 'font:600 15px system-ui,sans-serif;padding:10px 16px;border-radius:10px;border:0;background:#1f5c4a;color:#fff;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.25)'; b.onclick = fn; d.appendChild(b); return b; };
  mk('canShB', 'Опустить шторы', () => { canDemo = false; animateShutters(!(CANST && CANST.down > 0.5)); });
  mk('canDemoB', '▶ Шторы в работе', () => { canDemo = !canDemo; if (canDemo) demoLoop(0); canBar(); });
  if (getComputedStyle(host).position === 'static') host.style.position = 'relative'; host.appendChild(d); return d; })();
function canBar() {                                        // подписи кнопок по текущему положению
  if (!canUI) return; canUI.style.display = CANST ? 'flex' : 'none'; if (!CANST) return;
  document.getElementById('canShB').textContent = CANST.down > 0.5 ? 'Поднять шторы' : 'Опустить шторы';
  document.getElementById('canDemoB').textContent = canDemo ? '■ Стоп' : '▶ Шторы в работе';
}
function demoLoop(i) {                                     // по кругу: шторы вниз → вверх → крыша сложить → раскрыть
  if (!canDemo || !CANST) return; const next = () => setTimeout(() => demoLoop(i + 1), 900), k = i % 4;
  if (i % 2 === 0) { SHOW.shDown = true; setCheck('shDownc', true); tweenCanopy(CAN.close, 1, next); }
  else { SHOW.shDown = false; setCheck('shDownc', false); tweenCanopy(CAN.close, 0, next); }
}
function canopyParts(g, set, frame) { const xs = canopyXs(set), c = newCfg(set); if (frame) drawLight(g, xs, false, true, canopyInners(xs)); return drawCanopy(g, xs, 2 * c.a + c.zone); }
function drawPeople(g, c) {                               // фигуры для проверки высот: сидит у стола и стоит за скамьёй
  const zw = MD3 + W / 2 + L4 / 2 + 8, sx = seatList(c)[0].x, P = M.person;
  box(g, 360, 150, 400, sx, 525, zw + 20, P); box(g, 340, 130, 380, sx, 555, zw - 330, P); box(g, 300, 450, 120, sx, 225, zw - 460, P);
  box(g, 380, 560, 220, sx, 880, zw + 60, P); const hd = new THREE.Mesh(new THREE.SphereGeometry(110, 16, 12), P); hd.position.set(sx, 1290, zw + 30); g.add(hd);
  const st = seatList(c).slice(-1)[0].x, zs = zw + 330; box(g, 300, 880, 200, st, 440, zs, P); box(g, 400, 560, 240, st, 1160, zs, P);
  const h2 = new THREE.Mesh(new THREE.SphereGeometry(110, 16, 12), P); h2.position.set(st, 1740, zs); g.add(h2);
  [hd, h2].forEach(h => { h.userData.person = true; });
}
function rainCheck(slantDeg) {                             // доля сухих точек столешницы и сидений при дожде под углом slant (ветер поперёк стола, с обеих сторон)
  const objs = []; root.traverse(o => { if (o.isMesh && (o.material === M.pc || o.material === M.pvc || o.material === M.bar || o.material === M.alu) && o.getWorldPosition(new THREE.Vector3()).y > 1000) objs.push(o); });
  if (!objs.length || !CANST) return null; root.updateMatrixWorld(true);
  const rc = new THREE.Raycaster(), xs = []; CANST.sashes.forEach(sg => sg.children.forEach(c => { const p = c.getWorldPosition(new THREE.Vector3()); xs.push(p.x); }));
  const xa = Math.min.apply(null, xs) + 50, xb = Math.max.apply(null, xs) - 50, zw = MD3 + W / 2 + L4 / 2 + 8, res = {};
  [['table', 745, -505, 505], ['seats', 455, zw - L4 / 2 + 5, zw + L4 / 2 - 5]].forEach(([k, y, z0, z1]) => { let dry = 0, n = 0;
    [-1, 1].forEach(ws => { for (let x = xa; x <= xb; x += 40) for (let z = z0; z <= z1; z += 20) [1, -1].forEach(side => { if (k === 'table' && side < 0) return;
      const zz = k === 'table' ? z : side * z, d = new THREE.Vector3(0, Math.cos(slantDeg * Math.PI / 180), ws * Math.sin(slantDeg * Math.PI / 180)).normalize();
      rc.set(new THREE.Vector3(x, y, zz), d); n++; if (rc.intersectObjects(objs, false).length) dry++; }); });
    res[k] = Math.round(dry / n * 1000) / 10; });
  return res;
}
function canopyXs(set) { const c = newCfg(set), Lt = 2 * c.a + c.zone, xi = Lt / 2 - c.a + W / 2, xo = Lt / 2 - W / 2, all = [-xo, -xi].concat(c.props.slice().sort((p, q) => p - q), [xi, xo]);
  if (CAN.portal) { const r = [-(xo - 45), -(xi + 45), xi + 45, xo - 45]; r.wall = [-xo, -xi, xi, xo]; r.xo = xo; r.xi = xi; r.lim = { T4: 1080, T6: 2040, T8: 2090 }[set] || 1080; r.midMax = set === 'T4'; r.zc = MD3; r.zn = 274; r.zp = 365; r.zh = 80; r.pz = [315, 365, 415]; r.ov = CAN.ov + 45; return r; }   // стойка — внутри тумбы у торцевой стенки: 3 бруска на ребро, z 310–460   // стойка у угла тумбы — охватывает боковую стенку, ось в 90 мм от торцевой   // стойки — на углах тумб: у входа и у дальней стенки, по краям стола
  const r = set === 'T4' ? all.filter(x => Math.abs(Math.abs(x) - xi) > 1) : set === 'T8' ? all.filter(x => !(Math.abs(x) > 1 && Math.abs(x) < xi - 1)) : all.slice();   // на 8 — без пары стоек ±710 (симметрично): швы крыши на их месте, средник сдвоенный   // на 4 — 3 стойки: средник створки на ребро держит вынос 535 мм (10,7 МПа из 12 при 20 м/с); на 6 и 8 без стойки вынос > 0,8 м — не держит
  r.xo = xo; r.xi = xi; r.lim = { T4: 1080, T6: 2040, T8: 2090 }[set] || 1080; r.midMax = set === 'T4'; if (set === 'T8') { const p = all.find(x => x > 1 && x < xi - 1); r.seams = [-p, p]; r.midDouble = true; } return r; }   // lim — створка ложится на крышку ящика (1090 / 2056 / 2106 × 1020)
const canopyInners = xs => xs.map(x => Math.abs(Math.abs(x) - xs.xo) < 1 ? -Math.sign(x) : Math.abs(Math.abs(x) - xs.xi) < 1 ? Math.sign(x) : 0);   // с какой стороны стойки — внутренность опоры стола   // с какой стороны стойки — внутренность опоры стола (там вилка — над базовой полкой)
function lightXs(set) { const c = newCfg(set), Lt = 2 * c.a + c.zone, xi = Lt / 2 - c.a + W / 2; return [-xi].concat(c.props.slice().sort((p, q) => p - q), [xi]); }
function lightParts(g, set, can) { if (can && CAN.portal) { const xs = canopyXs(set); return drawLight(g, xs, true, true, canopyInners(xs)); } return drawLight(g, lightXs(set)); }   // с навесом стойки даёт навес, свет — лента под его коньком
function tableLR(g, zone, props, planks, Mt, opt) {
  Mt = Mt || M4;
  const Lb = opt && opt.a || Mt + W, D = Mt === M4 ? TOPD : 2 * Mt + W, Lt = 2 * Lb + zone, xt = Lt / 2 - Lb / 2;
  const tum = opt && opt.noBase ? [] : [endTumba(g, -xt, -1, Mt, opt), endTumba(g, xt, 1, Mt, opt)];
  const pgs = (opt && opt.noBase ? [] : props.slice().sort((p, q) => p - q)).map(px => { const pg = new THREE.Group(); pg.position.x = px; g.add(pg); prop(pg, 0, Mt, Mt !== M4 && !opt, opt ? 4 : 0); return pg; });
  /* Столешница из секций (для доставки курьером: самая длинная деталь ≈1 м). Граница секций — по оси стойки.
     Секция = панель (рамка по длинным кромкам + доски поперёк) с тремя своими балками снизу, всё на саморезах.
     У тумбы балки секции надеты на её стержни. На стойке все три балки надевает левая секция (заходят за ось на 25 мм);
     правая секция начинается над стойкой: её первая доска и рамка лежат на концах балок левой. Кладут слева направо,
     снимают справа налево — ничего не сцеплено «в замок». */
  const bnd = [-Lt / 2].concat(props.slice().sort((p, q) => p - q), [Lt / 2]), yT = TOPY + 50 + HB / 2, secs = [];
  if (opt && opt.split) { const rr = Lt / 2 - Lb + W / 2;                // секция длиннее посылки — делится над стержнями открытой стороны тумбы
    if (bnd[1] - bnd[0] > opt.split) bnd.splice(1, 0, -rr);
    if (bnd[bnd.length - 1] - bnd[bnd.length - 2] > opt.split) bnd.splice(bnd.length - 1, 0, rr); }
  const splitZ = !!(opt && opt.splitZ && bnd.length === 2);
  /* Стол на 2 (стойки нет — посередине колени): столешница из двух половин вдоль стола. Шов — по средней балке:
     передняя половина владеет крайней и средней балками, задняя — своей крайней; доски обеих половин лежат на средней балке
     по 15 мм. Кладут переднюю, потом заднюю; снимают заднюю первой. */
  if (splitZ) [-1, 1].forEach(sz => {
    const sg = new THREE.Group(); sg.userData.part = 'top'; g.add(sg); secs.push(sg);
    const a0 = bnd[0], a1 = bnd[1], plL = D / 2 - W;
    (sz < 0 ? [-Mt, 0] : [Mt]).forEach(z => { box(sg, a1 - a0 - 4, 50, 30, (a0 + a1) / 2, TOPY + 25, z, M.bar2);
      box(sg, 2, 48, 28, a0 + 1, TOPY + 25, z, M.plug); box(sg, 2, 48, 28, a1 - 1, TOPY + 25, z, M.plug); });
    const zz = sz * (D / 2 - W / 2);
    box(sg, a1 - a0, HB, W, (a0 + a1) / 2, yT, zz, M.bar2);
    box(sg, 2, HB - 2, W - 2, a0 - 1, yT, zz, M.plug); box(sg, 2, HB - 2, W - 2, a1 + 1, yT, zz, M.plug);
    const n = Math.floor((a1 - a0 + 5) / 55), pitch = (a1 - a0) / n;
    for (let i = 0; i < n; i++) box(sg, W - 2, HB, plL, a0 + pitch * (i + 0.5), yT, sz * plL / 2, M.top);
  });
  for (let k = 0; !splitZ && k + 1 < bnd.length; k++) {
    const sg = new THREE.Group(); sg.userData.part = 'top'; g.add(sg); secs.push(sg);
    const a0 = bnd[k], a1 = bnd[k + 1], L0 = k === 0, L1 = k + 2 === bnd.length;
    [-Mt, 0, Mt].forEach(z => {
      const x0 = L0 ? a0 + 2 : a0 + W / 2 + 1, x1 = L1 ? a1 - 2 : a1 + W / 2;   // балки левой секции — за ось стойки на 25
      box(sg, x1 - x0, 50, 30, (x0 + x1) / 2, TOPY + 25, z, M.bar2);
      if (L0) box(sg, 2, 48, 28, a0 + 1, TOPY + 25, z, M.plug);
      if (L1) box(sg, 2, 48, 28, a1 - 1, TOPY + 25, z, M.plug);
    });
    const r0 = L0 ? a0 : a0 - W / 2, r1 = L1 ? a1 : a1 - W / 2 - 1;   // рамка и доски: правая секция начинается над стойкой
    [-1, 1].forEach(sz => { const zz = sz * (D / 2 - W / 2);
      box(sg, r1 - r0, HB, W, (r0 + r1) / 2, yT, zz, M.bar2);
      if (L0) box(sg, 2, HB - 2, W - 2, a0 - 1, yT, zz, M.plug);
      if (L1) box(sg, 2, HB - 2, W - 2, a1 + 1, yT, zz, M.plug); });
    const n = Math.max(1, Math.floor((r1 - r0 + 5) / 55)), pitch = (r1 - r0) / n;
    for (let i = 0; i < n; i++) { if (planks === 'half' && k > 0) continue; const px = r0 + pitch * (i + 0.5);
      if (LIGHTX && LIGHTX.some(mx => Math.abs(px - mx) < (LIGHTX.zc ? 45 : 80))) { if (LIGHTX.zc) box(sg, W - 2, HB, 2 * LIGHTX.zn, px, yT, 0, M.top); else { const L = D / 2 - W - 70; [-1, 1].forEach(sz => box(sg, W - 2, HB, L, px, yT, sz * (70 + L / 2), M.top)); } }   // доска с вырезом под стойку света (у навеса — пазы у краёв; доска короче на 6 мм — заглушка встаёт до конца шпильки стойки, 30.09.2026)
      else box(sg, W - 2, HB, D - 2 * W, px, yT, 0, M.top); }
    if (SHOW.pnT) panelPieces(sg, r0, r1, yT + HB / 2 + PN / 2, PN, D);   // накладная столешница: панели от стойки до стойки света
  }
  if (SHOW.glass) holeSheet(g, -Lt / 2, Lt / 2, TOPY + 50 + HB + (SHOW.pnT ? PN : 0) + 0.75, 1.5, D, M.glass);   // гибкое стекло — одним листом на весь стол (летом)
  if (planks === 'lift' && secs[1]) secs[1].position.y = 260;             // показать: правая секция снята
  const free = zone - props.length * W;
  return { Lt, D, H: TOPY + 50 + HB, n: 0, free, pct: Math.round(free / Lt * 100), tum, pgs, secs, bnd, Lb, splitZ, longest: Math.max.apply(null, bnd.slice(1).map((v, i) => v - bnd[i])) + W / 2 };
}
/* Сундук на модуле 400: табурет (1) или скамья (3, 5 модулей), 7 поясов; крышка — секции по модулю, снимаются */
function chest(g, x, z, nMod, lift) {
  const sub = new THREE.Group(); sub.position.set(x, 0, z); g.add(sub);
  const c = crib(sub, { shape: nMod === 1 ? 'sq' : 'r' + nMod + '1', M: M4, belts: 7, at: [0, 0], fillTop: () => true, noCaps: true, keep: (j, nb) => j % 2 === 0 || j === nb - 1 });
  const len = nMod * M4 + W, secL = len / nMod, n = 7, pitch = secL / n;
  for (let i = 0; i < nMod; i++) {
    const sec = new THREE.Group(); sub.add(sec);
    if (lift && i === 0) { sec.position.set(0, 240, Math.sign(z || 1) * 170); sec.rotation.x = -0.15 * Math.sign(z || 1); }   // поднятая крышка — от стола, не в столешницу
    const x0 = -len / 2 + i * secL;
    for (let k = 0; k < n; k++) box(sec, W - 5, HB, L4, x0 + pitch * (k + 0.5), c.H + HB / 2, 0, M.top);
    [x0 + 60, x0 + secL - 60].forEach(xx => box(sec, W, HB, M4 - W - 4, xx, c.H - HB / 2, 0, M.bar2));
  }
  return { len };
}
/* Сиденье — плоская рамка 30 мм: две продольные доски по краям (над стенками тумб, надеты на стержни углов),
   две поперечные на концах в той же плоскости, внутри 5 досок — саморезы в торец через рамку. Снизу ничего нет:
   сиденья складываются стопкой. Торцы досок спрятаны в рамке — заглушены только 4 торца продольных досок. */
function seatFrame(g, len, y0) {
  const yc = y0 + HB / 2, zE = L4 / 2 - W / 2;
  [-1, 1].forEach(sz => { box(g, len, HB, W, 0, yc, sz * zE, M.bar2);
    [-1, 1].forEach(sx => box(g, 2, HB - 2, W - 2, sx * (len / 2 + 1), yc, sz * zE, M.plug)); });
  [-1, 1].forEach(sx => box(g, W, HB, L4 - 2 * W, sx * (len / 2 - W / 2), yc, 0, M.bar2));
  const n = 5, Wi = L4 - 2 * W, gap = (Wi - n * W) / (n + 1);
  for (let i = 0; i < n; i++) box(g, len - 2 * W, HB, W, 0, yc, -Wi / 2 + gap + W / 2 + i * (W + gap), M.top);
}
/* Скамья: тумбы-табуреты (квадрат 400, 7 поясов) через пустой модуль, сверху одно сиденье — рамка 30 мм,
   пролёт между тумбами ≈400 мм. Снизу поперечины входят внутрь тумб: сиденье встаёт на место и снимается целиком.
   Доски лежат на стенках тумб поперёк скамьи — доборы не нужны. Хранение — в тумбах. */
/* Сиденье цельное (решение владельца 27.09.2026): одна рамка на все тумбы, снизу — основание меньшего размера:
   в каждую тумбу заходят два упора (отрезки лаги 293 мм поперёк), они упираются во внутренние грани стенок —
   сиденье не сдвигается ни вдоль, ни поперёк и связывает тумбы. Стержни тумб не выступают. Табурет — то же на одну тумбу. */
function seatTabs(g, cx, y) {                              // два упора внутри тумбы: у стенок поперёк скамьи, зазор 2 мм
  [-1, 1].forEach(sx => box(g, W, HB, M4 - W - 4, cx + sx * (M4 / 2 - W / 2 - W / 2 - 2), y - HB / 2, 0, M.bar2));
}
/* Скамья из трёх частей (решение владельца 27.09.2026 — ради хранения под столом и доставки):
   · на каждой тумбе — своя крышка 397 мм с упорами внутрь (как у табурета): без вставки это два обычных табурета;
   · к наружной грани внутренней стенки каждой тумбы у самого верха привинчена полка — отрезок лаги 397 мм,
     выступает в промежуток на 50 мм ниже уровня сиденья;
   · вставка 297 × 397 мм ложится на обе полки вровень с крышками; снизу 4 коротких штифта входят в отверстия полок —
     вставка не сдвигается и держит тумбы вместе. Все части ≤ 397 мм — прячутся под стол. */
function stoolLid(g, cx, y) { const pg = new THREE.Group(); pg.position.x = cx; g.add(pg); seatFrame(pg, L4, y); seatTabs(g, cx, y);
  if (SHOW.pnS) box(pg, L4, PN, L4, 0, y + HB + PN / 2, 0, M.panel);           // накладка на крышку — на 2 штифтах
  return pg; }
function ledge(g, cx, side, y) { box(g, W, HB, M4 - W - 4, cx + side * (M4 / 2 + W), y - HB / 2, 0, M.filler); }   // полка между угловыми колоннами — не упирается в заглушки и уголок   // полка у внутренней стенки, снаружи
/* Вставка 287 × 397 (зазор 5 мм до крышек — под заглушки 2 + 2 мм). Штифты — обрезки стержня Ø12, 4 шт.:
   в скамье входят в полки (x = ±110 — внутри полки 98,5…148,5), при хранении вставка повёрнута и те же штифты
   входят в торцевые бруски крышек (z = ±110 от оси пролёта стойки, x = ±173,5 — середина бруска). */
const INS = M4 - W - 10, PIN_A = 110, PIN_B = 120;   // 287: зазор 5 мм — заглушки вставки и крышек (2 + 2 мм) не сходятся
function insertPart(g, y, withPins) {
  const pg = new THREE.Group(); pg.userData.part = 'seat'; g.add(pg); seatFrame(pg, INS, y);
  if (SHOW.pnI) box(pg, INS, PN, L4, 0, y + HB + PN / 2, 0, M.panel);          // накладка на вставку — вровень с накладками крышек
  if (withPins && !SHOW.pnI) [-1, 1].forEach(sx => [-1, 1].forEach(sz => cyl(pg, 6, 25, sx * PIN_A, y - 25, sz * PIN_B, M.rod)));   // с накладкой штифты зимой вынимают — не рисуем
  return pg;
}
function benchVoid(g, x, z, nT, lift) {
  const sub = new THREE.Group(); sub.position.set(x, 0, z); g.add(sub);
  const step = 2 * M4, len = (2 * nT - 1) * M4 + W, xs = [], y = 14 * HB;
  for (let i = 0; i < nT; i++) xs.push(-len / 2 + L4 / 2 + i * step);
  xs.forEach((cx, i) => {
    crib(sub, { shape: 'sq', M: M4, belts: 7, at: [cx, 0], noCaps: true, keep: (j, nb) => j % 2 === 0 || j === nb - 1 });
    if (nT === 2) ledge(sub, cx, i === 0 ? 1 : -1, y);
  });
  if (lift === 'stow') return { len, xs };
  const up = lift ? 220 : 0, zOff = lift ? Math.sign(z || 1) * 170 : 0;
  xs.forEach(cx => { const lg = stoolLid(sub, cx, y); if (lift && nT === 1) { lg.position.set(cx, up, zOff); } });
  if (nT === 2) { const ins = insertPart(sub, y, true); if (lift) ins.position.set(0, up, zOff); }
  return { len, xs };
}
const ZS = DEP / 2 + L4 / 2 + 2;                                // скамья — вплотную к стойкам; сиденье под столешницей на 23 мм
const INFO = {};
const cap = (t, r, seats, price) => [t,
  'Стол ' + r.Lt + ' × ' + TOPD + ' × ' + r.H + ' мм. Свободно для ног ' + r.free + ' мм — ' + r.pct + ' % длины. Тумбы только по краям: 400 мм вдоль стола, во всю глубину. Снаружи — сплошная стенка, хранение (полка и пол) открыто внутрь, к месту для ног.',
  seats,
  'Стенки тумб — брусок через два, табуретов — через один: в углах втулки, лист кончается у втулок (их торцы — под заглушку). Стойки разрежены: в пролёте нижний, средний и верхний брусок, нагрузку несут колонны у стержней. Над торцевыми стенками тумб верхнего бруска нет — лист заходит в паз снизу балки. Три балки во всю длину стола, по линиям стержней, надеты на стержни тумб и стоек, торцы заглушены. Пролёт ≤ 650 мм — алюминий не нужен. Проверено: посередине 3,3 из 4,7 мм, облокотились на край — 5,8 из 7,0 мм, σ 10,6 из 12 МПа. Под столом листов нет.',
  price,
  'Столешница из секций, сиденья скамеек — из трёх частей: всё прячется под стол и едет посылками (см. «Разложить и сложить» и «Как устроен стол»). Торцы — на выбор покупателя: заглушки или декоративный уголок (переключатель вверху). Столешница и сиденья — в рамке: торцы досок спрятаны, заглушены только торцы рамки. Табуреты и тумбы скамеек задвигаются под стол — см. «Сложено».'];
/* ---------- Зима: стол в ящик (предложение 27.09.2026) ----------
   Стол глубиной 944 (модуль 500 поперёк), скамейки — прежние (модуль 400). Торцевые тумбы открыты к ногам полностью:
   снизу нет бруска и средней колонки, в открытой стороне — только верхняя рамка. Зимой снимают секции столешницы,
   полку тумбы переставляют на ряд 20, тумбы скамеек ставят блоком у стойки (полками к ней), вставки — на крышки,
   торцевые тумбы надвигают на скамейки до стойки: стойка — средняя стенка ящика. Секции — стопкой сверху, крышкой.
   Ширина тумб (вдоль стола) — чтобы внутри поместились все тумбы скамеек с полками (+50 мм) и зазором. */
const M5 = 447, ZW = (2 * M5 + W) / 2 + L4 / 2 + 8;   // 8 мм до стола — уголки тумбы стола и табурета (3 + 3 мм)
/* вместимость ящика: tum — тумб сидений всего, led — из них с полкой-упором (тумбы скамеек) */
const WCFG = { T4: { a: 507, zone: 1250, props: [0], bench: [0], stool: [], cap: { tum: 4, led: 4 } },
               T6: { a: 907, zone: 1900, props: [-325, 325], bench: [-325], stool: [650], cap: { tum: 8, led: 4 } },   // просвет везде 600 мм: стойки через 650 по осям
  T8: { a: 957, zone: 2550, props: [-650, 0, 650], bench: [-650, 650], stool: [], cap: { tum: 8, led: 8 } } };
function seatTumba(g, cx, z, side) {
  const gg = new THREE.Group(); gg.userData.part = 'seat'; g.add(gg);
  crib(gg, { shape: 'sq', M: M4, belts: 7, at: [0, 0], noCaps: true, keep: (j, nb) => j % 2 === 0 || j === nb - 1 });
  if (side) ledge(gg, 0, side, 14 * HB);
  stoolLid(gg, 0, 14 * HB); gg.position.set(cx, 0, z); return gg;
}
function buildSet(g, set, noSeats, over) {
  const c = WCFG[set], r = tableLR(g, c.zone, c.props, over && over.lift || null, M5, Object.assign({ a: c.a, full: true, split: 1490, splitZ: c.splitZ }, over || {})), seats = [], ins = [];
  if (!noSeats) [1, -1].forEach(sd => {
    c.bench.forEach(bx => { seats.push({ g: seatTumba(g, bx - M4, sd * ZW, 1), k: 'A', sd, bx }, { g: seatTumba(g, bx + M4, sd * ZW, -1), k: 'B', sd, bx });
      const ig = new THREE.Group(); g.add(ig); insertPart(ig, 0, true); ig.position.set(bx, 14 * HB, sd * ZW); ins.push({ g: ig, sd, bx }); });
    c.stool.forEach(sx => seats.push({ g: seatTumba(g, sx, sd * ZW, 0), k: 'S', sd }));
  });
  return { r, seats, ins, c };
}
/* целевые позы зимой (центр ящика — x = 0) */
function winterPoses(h, set) {
  const c = h.c, np = c.props.length, inner = np * W / 2, box = 2 * c.a + np * W, out = [];
  const gz = SHOW.ends === 'trims' ? 7 : 5;                   // между тумбами скамеек: уголки 3 + 3 мм или заглушки 2 + 2 мм
  const col1 = inner + 52 + L4 / 2, col2s = col1 + L4 + gz, col2b = col1 + L4 + 3 + W, yI = 14 * HB + HB + (SHOW.pnS ? PN : 0) + (SHOW.pnI ? 0 : 25);
  const gap = SHOW.ends === 'trims' ? 4 : 3;                 // заглушки выступают на 2 мм, уголок — на 3
  h.r.tum.forEach((t, i) => out.push([t.sub, { x: (i ? 1 : -1) * (inner + gap + c.a / 2) }, 'tum']));
  h.r.pgs.forEach((p, i) => out.push([p, { x: (i - (np - 1) / 2) * W }, 'prop']));
  const zr = L4 / 2 + gz / 2, c2 = set === 'T8' ? col2b : col2s;          // каждая скамья остаётся на своей стороне (z) — пути не пересекаются
  const slots = { L: set === 'T8' ? [[-col1, zr], [-c2, zr], [-col1, -zr], [-c2, -zr]] : [[-col1, zr], [-col1, -zr], [-c2, zr], [-c2, -zr]] };
  slots.R = slots.L.map(([x, z]) => [-x, z]);
  const outP = q => c.out ? c.out(q) : null, inside = q => !outP(q);
  h.seats.filter(q => !inside(q)).forEach(q => out.push([q.g, outP(q), 'outseat']));
  const A = h.seats.filter(q => q.k === 'A' && inside(q)).sort((p, q) => q.sd - p.sd || p.bx - q.bx), Bs = h.seats.filter(q => q.k === 'B' && inside(q)).sort((p, q) => q.sd - p.sd || p.bx - q.bx);
  const lids = [];
  if (set === 'T2') h.seats.forEach(q => { out.push([q.g, { x: 0, z: q.sd * zr }, 'seat']); });
  else {
    A.forEach((q, i) => { const [x, z] = slots.L[i]; out.push([q.g, { x, z }, 'seat']); lids.push([x, z]); });
    Bs.forEach((q, i) => { const [x, z] = slots.R[i]; out.push([q.g, { x, z }, 'seat']); lids.push([x, z]); });
    h.seats.filter(q => q.k === 'S' && inside(q)).forEach(q => { const [x, z] = q.sd > 0 ? slots.L[2] : slots.R[3]; out.push([q.g, { x, z }, 'seat']); });
  }
  const ord = []; for (let i = 0, j = lids.length - 1; i <= j; i++, j--) { ord.push(i); if (j > i) ord.push(j); }
  const lidFor = ord.map(i => lids[i]);                                    // вставки — по крышкам вразбег: 0, последняя, 1, предпоследняя…    // вставки — на крышки, по одной на тумбу
  h.ins.forEach((q, i) => { const [x, z] = lidFor[i]; out.push([q.g, { x, y: yI, z }, 'ins']); });
  // крышка: секции стопкой; крайние парами рядом, если помещаются по длине ящика
  if (h.r.splitZ) { h.r.secs.forEach(sg => out.push([sg, { x: 0, y: 0, z: 0 }, 'sec', 0])); return { out, box: box + 2 * gap, layers: 1 }; }
  const S = h.r.secs.length, len = k => h.r.bnd[k + 1] - h.r.bnd[k], ctr = k => (h.r.bnd[k + 1] + h.r.bnd[k]) / 2, layers = [];
  for (let k = 0; k < Math.ceil(S / 2); k++) { const m = S - 1 - k;
    if (m === k) layers.push([k]); else if (len(k) + len(m) + 60 <= box) layers.push([k, m]); else layers.push([k], [m]); }
  layers.forEach((Ly, li) => { const tot = Ly.reduce((p, k) => p + len(k), 0) + (Ly.length - 1) * 60; let cur = -tot / 2;
    Ly.forEach(k => { out.push([h.r.secs[k], { x: cur + len(k) / 2 - ctr(k), y: li * (80 + (SHOW.pnT ? PN : 0)), z: 0 }, 'sec', li]); cur += len(k) + 60; }); });
  return { out, box: box + 2 * gap, layers: layers.length };
}
function coverMesh(g, bb) {                      // чехол по габариту ящика с крышкой: +30 мм по сторонам и сверху
  const m = 30, sx = bb.max.x - bb.min.x + 2 * m, sz = bb.max.z - bb.min.z + 2 * m, sy = bb.max.y + m;
  const cg = new THREE.Group(); cg.userData.cover = { L: Math.round(sx), W: Math.round(sz), H: Math.round(sy) };
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), M.cover); mesh.position.set((bb.min.x + bb.max.x) / 2, sy / 2, (bb.min.z + bb.max.z) / 2);
  cg.add(mesh); g.add(cg); return cg;
}
function setPose(o, p) { if ('x' in p) o.position.x = p.x; if ('y' in p) o.position.y = p.y; if ('z' in p) o.position.z = p.z; if ('ry' in p) o.rotation.y = p.ry; }
INFO.WBX = () => {
  const at = { T4: [-2400, 0], T6: [-400, 0], T8: [2000, 0] }, rows = [];
  Object.keys(at).forEach(set => {
    const wg = new THREE.Group(); wg.position.set(at[set][0], 0, at[set][1]); root.add(wg);
    const h = buildSet(wg, set), w = winterPoses(h, set);
    w.out.forEach(([o, p]) => setPose(o, p));
    rows.push('На ' + set.slice(1) + ': стол ' + h.r.Lt + ' × 944, тумбы ' + h.c.a + ' мм; ящик ' + w.box + ' × 944 × 660, крышка в ' + w.layers + ' сл.');
  });
  return ['Зимние ящики: стол на 4, 6 и 8 (как складывается — см. «лето → зима»)',
    'Стол — глубиной 944 мм, скамейки прежние. Торцевые тумбы стола надвинуты на тумбы скамеек, стойки — средние стенки ящика, секции столешницы — стопкой сверху.',
    rows.join('<br>'),
    'Внутри: тумбы скамеек с крышками (полками к стойке — полка выступает на 50 мм), вставки на крышках. Полка торцевой тумбы стоит на 540–570 мм круглый год — под ней 540 мм, скамейки проходят, зимой её не трогают.',
    'Ритм один на всё: бруски через 120 мм (шаг 4 ряда) у тумб стола, стоек и скамеек — линии брусков идут на одних высотах. Это самый крупный общий шаг для высот 420 и 660 мм: меньше брусков при одинаковом шаге не получится. Цвет каждого бруска, заглушки или уголок, вставки — выбираются как в конструкторе кашпо; под заглушки и уголок в стыках оставлен зазор 3–4 мм.',
    'Все тумбы сидений — внутри ящика; ни один табурет не зимует снаружи.'];
};
/* Лето → зима для любого стола: секции — справа налево в сторону, стойки — в середину, вставки — вверх,
   тумбы скамеек — каждая по своей «дорожке» (наружу, вдоль стола, внутрь), вставки — на крышки,
   торцевые тумбы — внутрь, секции — крышкой по слоям. Пути не пересекаются; обратно — то же в обратную сторону. */
function winAnim(set, noSeats) {
  const h = buildSet(root, set, noSeats), w = winterPoses(h, set), W0 = new Map(w.out.map(([o, p, kind, li]) => [o, { p, kind, li }]));
  const sm = u => u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u), lerp = (a, b, u) => a + (b - a) * u;
  const tracks = new Map(), mv = (o, m) => { if (!tracks.has(o)) tracks.set(o, []); tracks.get(o).push(m); };
  const secs = h.r.secs, S = secs.length, bnd = h.r.bnd, ctr = k => h.r.splitZ ? 0 : (bnd[k] + bnd[k + 1]) / 2, Lt = h.r.Lt;
  const steps = [[0, 'Лето: стол на ' + set.slice(1) + ' (' + Lt + ' × 944)' + (noSeats ? '' : ' и сиденья')]];
  let tau = 0.1, cvG = null;
  steps.push([tau, 'Секции столешницы снимают справа налево (каждая лежит на балках левой) и кладут рядом']);
  for (let j = 0; j < S; j++) { const k = S - 1 - j;
    mv(secs[k], { t0: tau, t1: tau + 2, to: { x: Lt / 2 + 1400 - ctr(k), y: -TOPY, z: (k - (S - 1) / 2) * 1050 }, lift: 700 + 150 * j }); tau += 0.8; }
  tau += 1.4;
  const pm = h.r.pgs.filter(p => Math.abs(W0.get(p).p.x - p.position.x) > 1);
  if (pm.length) { steps.push([tau, 'Стойки сдвигают в середину — это средние стенки ящика']); pm.forEach(p => mv(p, { t0: tau, t1: tau + 1.5, to: W0.get(p).p })); tau += 1.7; }
  if (h.ins.length) { steps.push([tau, 'Снимают вставки скамеек']);
    h.ins.forEach((q, i) => { const p = W0.get(q.g).p, hy = 1150 + 60 * i; mv(q.g, { t0: tau, t1: tau + 1.4, to: { x: p.x, y: hy, z: p.z }, lift: hy }); tau += 0.3; }); tau += 1.3; }
  const outs = h.seats.filter(q => W0.has(q.g) && W0.get(q.g).kind === 'outseat');
  if (outs.length) { steps.push([tau, 'Табуреты сверх вместимости ящика отодвигают — они зимуют рядом, каждый под своим чехлом']);
    outs.forEach(q => mv(q.g, { t0: tau, t1: tau + 1.2, to: W0.get(q.g).p })); tau += 1.4; }
  if (h.seats.length) { steps.push([tau, 'Тумбы скамеек ставят блоком у стойки — полками к ней']);
    [1, -1].forEach(sd => {
      const L = h.seats.filter(q => q.sd === sd && W0.has(q.g) && W0.get(q.g).kind === 'seat').map((q, i) => ({ q, p: W0.get(q.g).p, lane: sd * (1100 + 430 * i) }));
      L.forEach(it => { mv(it.q.g, { t0: tau, t1: tau + 0.8, to: { z: it.lane } }); tau += 0.35; }); tau += 0.6;
      L.forEach(it => mv(it.q.g, { t0: tau, t1: tau + 1.0, to: { x: it.p.x } })); tau += 1.2;
      L.forEach(it => { mv(it.q.g, { t0: tau, t1: tau + 1.0, to: { z: it.p.z } }); tau += 0.6; }); tau += 0.6;
    }); }
  if (h.ins.length) { steps.push([tau, 'Вставки кладут на крышки']); h.ins.forEach(q => mv(q.g, { t0: tau, t1: tau + 1.0, to: W0.get(q.g).p })); tau += 1.2; }
  steps.push([tau, 'Торцевые тумбы надвигают ' + (noSeats ? 'друг к другу' : 'на скамейки') + ' до стойки — ящик закрыт']);
  h.r.tum.forEach(t => mv(t.sub, { t0: tau, t1: tau + 2, to: W0.get(t.sub).p })); tau += 2.2;
  steps.push([tau, 'Секции кладут сверху стопкой — это крышка']);
  w.out.filter(o => o[2] === 'sec').sort((p, q) => p[3] - q[3]).forEach(([o, p], j) => { mv(o, { t0: tau, t1: tau + 2, to: p, lift: 700 + 150 * j }); tau += 0.8; });
  tau += 1.4;
  if (CFG.cover) {                                  // чехол: габарит — по зимним позам; опускается сверху
    const cap = new Map(); w.out.forEach(([o]) => cap.set(o, { x: o.position.x, y: o.position.y, z: o.position.z }));
    w.out.forEach(([o, p]) => setPose(o, p)); root.updateMatrixWorld(true); const bb = new THREE.Box3();
    [...tracks.keys()].concat(h.r.tum.map(t => t.sub)).filter(o => !outs.some(q => q.g === o)).forEach(o => bb.union(new THREE.Box3().setFromObject(o)));
    const obb = outs.map(q => new THREE.Box3().setFromObject(q.g));
    cap.forEach((p, o) => setPose(o, p));
    const cg = coverMesh(root, bb); cg.position.y = 2600; cvG = [cg]; steps.push([tau, 'Сразу — чехол: от солнца, снега и дождя']);
    mv(cg, { t0: tau, t1: tau + 1.6, to: { y: 0 } });
    obb.forEach(b => { const c2 = coverMesh(root, b); c2.position.y = 2600; cvG.push(c2); mv(c2, { t0: tau + 0.3, t1: tau + 1.9, to: { y: 0 } }); });
    tau += 2.1;
  }
  const Tf = tau, Tb = Tf + 3, T = Tb + Tf + 3;
  steps.push([Tf, 'Зима: ящик ' + w.box + ' × 944 × 660 мм, всё внутри, крышка в ' + w.layers + ' сл.'], [Tb, 'Обратно — на лето'], [Tb + Tf, 'Лето']);
  const list = [...tracks].map(([o, m]) => [o, m, { x: o.position.x, y: o.position.y, z: o.position.z, ry: o.rotation.y }]);
  const evalT = (tr, t) => {
    let p = Object.assign({}, tr[2]);
    for (const m of tr[1]) {
      const q = Object.assign({}, p, m.to);
      if (t >= m.t1) { p = q; continue; }
      if (t <= m.t0) break;
      const u = (t - m.t0) / (m.t1 - m.t0);
      if (m.lift == null) { const k = sm(u); p = { x: lerp(p.x, q.x, k), y: lerp(p.y, q.y, k), z: lerp(p.z, q.z, k), ry: lerp(p.ry, q.ry, k) }; }
      else if (u < 0.3) p = Object.assign({}, p, { y: lerp(p.y, m.lift, sm(u / 0.3)) });
      else if (u < 0.7) { const k = sm((u - 0.3) / 0.4); p = { x: lerp(p.x, q.x, k), y: m.lift, z: lerp(p.z, q.z, k), ry: lerp(p.ry, q.ry, k) }; }
      else p = Object.assign({}, q, { y: lerp(m.lift, q.y, sm((u - 0.7) / 0.3)) });
      break;
    }
    return p;
  };
  anim = now => {
    const t = now % T, tt = t < Tf ? t : t < Tb ? Tf : t < Tb + Tf ? Tb + Tf - t : 0;
    list.forEach(tr => setPose(tr[0], evalT(tr, tt))); if (cvG) cvG.forEach(c => c.visible = c.position.y < 2590);
    const el = document.getElementById('stepnow'); if (el) { let txt = steps[0][1]; steps.forEach(s2 => { if (t >= s2[0]) txt = s2[1]; }); el.textContent = txt; }
  };
  anim.T = T; anim.Tf = Tf;
  return { h, w };
}
/* ---------- показ вариантов (27.09.2026) ---------- */
function setMat(g) {                               // оценка материалов группы: лага по метражу, заглушки, стержни
  const b = bom(g), mm = b.lag.body.concat(b.lag.top).reduce((x, y) => x + y + 3, 0);
  return { lagM: mm / 1000, rub: mm * E.PROFILES.dpk50x30.price_m / 1000 * 1.03 + b.plugs * 13 + b.rods.reduce((x, y) => x + y, 0) / 1000 * 55 };
}
function animSlide(set, title, lines) { CFG.cover = true; const { h, w } = winAnim(set); CFG.cover = false;
  return [title, '<b id="stepnow"></b>'].concat(lines(h, w)); }
const SEATS = { T4: 'С каждой стороны — скамья на двоих: два табурета и вставка на полках-упорах, вровень.',
  T6: 'С каждой стороны — скамья на двоих (два табурета и вставка) и табурет.', T8: 'С каждой стороны — две скамьи на двоих.' };
const LINE = 'Лага ДПК 50×30 на стержнях GFRP Ø12. Бруски через 120 мм — один ритм у тумб стола, стоек и табуретов. Торцевые тумбы — хранение, открыты к ногам полностью, полка на 540–570 мм. Столешница из секций: всё едет посылками. Всё продаётся по отдельности — см. конструктор.';
function sumSlide(set) { const h = buildSet(root, set), W = WCFG[set];
  return ['Стол на ' + set.slice(1) + ': ' + h.r.Lt + ' × 944 × 740 мм', SEATS[set],
    'Торцевые тумбы ' + W.a + ' мм вдоль стола, ' + (W.props.length ? pl(W.props.length, 'стойка', 'стойки', 'стоек') + ' между коленями соседей, ' : '') + 'места для ног ' + (W.zone - W.props.length * W_) + ' мм.', LINE,
    'Зимой всё складывается в один ящик — см. «лето → зима».']; }
const W_ = W, pl = (n, a, b, c) => { const m = n % 10, t = n % 100; return n + ' ' + (m === 1 && t !== 11 ? a : m >= 2 && m <= 4 && (t < 12 || t > 14) ? b : c); };
INFO.N4 = () => sumSlide('T4'); INFO.N6 = () => sumSlide('T6'); INFO.N8 = () => sumSlide('T8');
const winLines = (h, w) => ['Стол ' + h.r.Lt + ' мм, тумбы ' + h.c.a + ' мм — к ногам открыты полностью, поэтому надвигаются на скамейки. Ящик ' + w.box + ' × 944 × 660 мм, крышка из секций в ' + pl(w.layers, 'слой', 'слоя', 'слоёв') + ', сверху — чехол.',
  'Внутри — все тумбы сидений (полками к стойке), вставки на крышках, стойки — средние стенки ящика. Чехол — только для зимней консервации.'];
INFO.W4 = () => animSlide('T4', 'Стол на 4: лето → зима', winLines);
INFO.W6 = () => animSlide('T6', 'Стол на 6: лето → зима', winLines);
INFO.W8A = () => animSlide('T8', 'Стол на 8: лето → зима', winLines);
INFO.PNL = () => {
  const was = { pnS: SHOW.pnS, pnI: SHOW.pnI, pnT: SHOW.pnT, glass: SHOW.glass };
  Object.assign(SHOW, { pnS: true, pnI: true, pnT: true, glass: true });
  const v = slideV(2, [], [], { set: 'T4', lift: false, seats: true }); Object.assign(SHOW, was);
  return ['Стол на 4: накладные панели и гибкое стекло (отдельные позиции)', '<b>Стол новой линейки ' + v.Lt + ' × ' + v.D + ' мм + 2 скамьи — с накладками и стеклом</b>',
    'Несущий слой — те же доски из лаги. Сверху — накладные панели 25 мм: пенополистирол в твёрдой оболочке (армирующая смесь + стеклосетка + фасадная краска, как в P-01). На столешнице — по панели на секцию, на табуретах — на каждую крышку, на скамейке — и на вставку: сиденье ровное, без щелей, вровень.',
    'Зачем: лага под панелью не выгорает на солнце, поверхность твёрдая и моется, сидеть тепло и весной, и осенью — пенополистирол держит тепло. Цвета — светлые и средние: тёмная панель на солнце греется до 60–70 °C, пенополистирол размягчается около 75–80 °C.',
    'Панель держится на 2–4 штифтах из обрезков стержня, снимается рукой; зимой едет вместе с секцией в стопке крышки (+25 мм на слой), со вставки штифты вынимают — она ложится на крышку табурета плоско.',
    'Гибкое стекло (ПВХ с УФ-защитой) — одним листом на весь стол, едет рулоном; лежит свободно, с запасом 5–10 мм по краям. Зимой — скатать и убрать под чехол. Высота стола с панелью — 765 мм, сиденья — 475 мм.'];
};
/* ---------- связка-подножка по центру стола, внизу (28.09.2026, по указанию владельца: «как позволит нагрузка, но не выше») ----------
   По средней линии стола (z = 0): через средние колонны стоек; у тумб — колонна в середине открытой стороны (втулки на шпильке,
   зимой снимается). Пролёты чередуются: брусок в ряду 2 (60–90 мм), в следующем — в ряду 3 (90–120 мм) — разбежка, как в срубе;
   концы зажаты в колоннах стальными шпильками M10. Под бруском через 150 мм — опоры из втулок до земли на шпильке M8:
   брусок лежит на опорах, продавить нельзя — на связку можно вставать. */
const TIE_ROW = [2, 3], TIE_STEP = 150;
function addTies(g, set, r) {
  const W5 = WCFG[set], X0 = r.Lt / 2 - W5.a + W / 2, cols = [-X0].concat(W5.props.slice().sort((p, q) => p - q), [X0]);
  const rowAt = k => TIE_ROW[k % 2];
  g.updateMatrixWorld(true);
  const gp = g.getWorldPosition(new THREE.Vector3()), kill = [];
  g.traverse(o => { if (!o.isMesh || o.material !== M.filler) return; const p = o.getWorldPosition(new THREE.Vector3()).sub(gp);
    if (Math.abs(p.z) > 2) return; const row = Math.round((p.y - HB / 2) / HB);
    cols.forEach((cx, i) => { if (Math.abs(p.x - cx) > 2) return; const used = [].concat(i > 0 ? [rowAt(i - 1)] : [], i + 1 < cols.length ? [rowAt(i)] : []);
      if (used.indexOf(row) >= 0) kill.push(o); }); });
  kill.forEach(o => o.parent.remove(o));
  [0, cols.length - 1].forEach(i => { const cx = cols[i], used = rowAt(i === 0 ? 0 : i - 1);       // колонна в середине открытой стороны тумбы
    for (let k = 0; k < 20; k++) if (k !== used) box(g, W, HB, W, cx, k * HB + HB / 2, 0, M.filler);
    cyl(g, 6, 22 * HB - 2, cx, 0, 0, M.steel); });
  for (let k = 0; k + 1 < cols.length; k++) {
    const row = rowAt(k), x0 = cols[k] - W / 2, x1 = cols[k + 1] + W / 2;
    box(g, x1 - x0, HB, W, (x0 + x1) / 2, row * HB + HB / 2, 0, SHOW.tieHi ? M.tie : M.bar);
    if (SHOW.ends === 'plugs') { box(g, 2, HB - 2, W - 2, x0 - 1, row * HB + HB / 2, 0, M.plug); box(g, 2, HB - 2, W - 2, x1 + 1, row * HB + HB / 2, 0, M.plug); }
    const a0 = cols[k] + W / 2 + 2 + W / 2, a1 = cols[k + 1] - W / 2 - 2 - W / 2, n = Math.max(1, Math.round((a1 - a0) / TIE_STEP) + 1);   // опоры из втулок
    for (let i = 0; i < n; i++) { const x = n === 1 ? (a0 + a1) / 2 : a0 + (a1 - a0) * i / (n - 1);
      for (let q = 0; q < row; q++) box(g, W, HB, W, x, q * HB + HB / 2, 0, M.filler);
      cyl(g, 4, (row + 1) * HB + 6, x, 0, 0, M.steel); cyl(g, 7, 6, x, (row + 1) * HB, 0, M.steel); }
  }
  g.traverse(o => { if (o.isMesh && o.material === M.rod && o.geometry.parameters.height > 400) o.material = M.steel; });   // стержни колонн — стальные шпильки M10
  return cols;
}
function tieSlide(set, title) {
  SHOW.tieHi = true; const h = buildSet(root, set, true), cols = addTies(root, set, h.r); SHOW.tieHi = false;
  const spans = cols.slice(1).map((c, i) => Math.round(c - cols[i]));
  return [title,
    'Сиденья не показаны, связка выделена цветом. Связка — по центру стола, внизу, не выше 120 мм: через средние колонны стоек; у тумб — колонна в середине открытой стороны (втулки на шпильке; зимой снимается, проход для скамеек свободен).',
    'Пролёты чередуются: брусок на 60–90 мм, в следующем пролёте — на 90–120 мм: разбежка, как в срубе; концы зажаты в колоннах стальными шпильками M10 с гайками и гроверами. Под бруском через 150 мм — опоры из втулок до земли на шпильке M8.',
    'Пролёты: ' + spans.join(' / ') + ' мм. Нагрузка — человек 100 кг встал всем весом, ×1,5 на рывок (1500 Н): брусок лежит на опорах через 150 мм — 10 МПа (допуск 12), прогиб меньше 0,2 мм; опора из втулок сжата 0,6 МПа. Продавить нельзя — вставать можно.',
    'Стойки привязаны внизу связкой к тумбам с двух сторон, вверху — шпильками к балкам: не качаются. Зимой: открутить шпильки, снять связку с опорами, в колонны стоек на место связки — по втулке.'];
}
INFO.TIE4 = () => tieSlide('T4', 'Связка по центру стола, внизу: стол на 4 (предложение)');
INFO.TIE8 = () => tieSlide('T8', 'Связка по центру стола, внизу: стол на 8 (предложение)');
/* ---------- Комплект на 4 — основа (28.09.2026, решения владельца) ----------
   Сруб по правилу: бруски ВДОЛЬ стола — чётные ряды (0, 4, 8…), ПОПЕРЁК — нечётные (1, 5, 9…), цельными брусками 944 мм.
   Торцевые тумбы — хранение: со стороны ног рамка (нижний и верхний брусок) и средняя колонна; полки лежат на брусках обеих
   боковых стенок (одни ряды — упор не нужен): база — 510–540 мм, докупаются 150, 270, 390 мм.
   Обвязка по центральной оси: под ногами (от тумбы до тумбы через стойку) — плашмя на полу, ряд 0, одним куском 1350 мм;
   внутри тумб — рядом выше (ряд 2), до дальней стенки. Стойка — цельные поперечные бруски по нечётным рядам,
   средняя колонна стоит на обвязке. */
function plugsX(g, x0, x1, y, z) { if (SHOW.ends !== 'plugs') return; box(g, 2, HB - 2, W - 2, x0 - 1, y, z, M.plug); box(g, 2, HB - 2, W - 2, x1 + 1, y, z, M.plug); }
function plugsZ(g, x, y, z0, z1) { if (SHOW.ends !== 'plugs') return; box(g, W - 2, HB - 2, 2, x, y, z0 - 1, M.plug); box(g, W - 2, HB - 2, 2, x, y, z1 + 1, M.plug); }
function tumbaK(g, xc, side, a, shelves, mz) {
  mz = mz || 0;          // side: -1 — левая тумба (открыта вправо), +1 — правая
  const D = 2 * M5 + W, xo = xc + side * (a / 2 - W / 2), xi = xc - side * (a / 2 - W / 2), zE = M5, yr = k => k * HB + HB / 2;
  for (let k = 0; k <= 20; k += 4) [-1, 1].forEach(sz => { box(g, a, HB, W, xc, yr(k), sz * zE, M.bar); plugsX(g, xc - a / 2, xc + a / 2, yr(k), sz * zE); });   // боковые стенки
  for (let k = 1; k <= 21; k += 4) { box(g, W, HB, D, xo, yr(k), 0, M.bar2); plugsZ(g, xo, yr(k), -D / 2, D / 2); }            // дальняя стенка
  [1, 21].forEach(k => { box(g, W, HB, D, xi, yr(k), 0, M.bar2); plugsZ(g, xi, yr(k), -D / 2, D / 2); });                    // рамка со стороны ног
  const sl = (x, z, k) => box(g, W, HB, W, x, yr(k), z, M.filler);
  for (let k = 0; k < 22; k++) {
    if (k % 2 === 1 && k % 4 !== 1) { [-1, 1].forEach(sz => sl(xo, sz * zE, k)); sl(xo, 0, k); }                                             // углы дальней стенки: нечётные ряды без бруска
    if (k % 2 === 1 && k !== 1 && k !== 21) { [-1, 1].forEach(sz => sl(xi, sz * zE, k)); sl(xi, mz, k); }                       // углы и середина открытой стороны
    if (k % 2 === 0 && k % 4 !== 0) { [-1, 1].forEach(sz => { sl(xo, sz * zE, k); sl(xi, sz * zE, k); }); }                    // чётные ряды без бруска боковой стенки
    if (k % 2 === 0 && k !== 2) { sl(xo, mz, k); if (k !== 0) sl(xi, mz, k); }                                                  // средние колонны (ряд 2 — обвязка, ряд 0 у открытой — обвязка)
  }
  [[xo, -zE], [xo, zE], [xi, -zE], [xi, zE], [xo, mz], [xi, mz]].forEach(([x, z]) => { cyl(g, 6, 22 * HB - 2, x, 0, z, M.rod); if (Math.abs(z) < 1 || Math.abs(z) > 400) cyl(g, 6, 48, x, 22 * HB - 2, z, M.rod); });
  const n = Math.floor((a - 2 * W + 5) / 55), Wd = n * 50 + (n - 1) * 5;                                                      // полки — на брусках обеих боковых стенок
  [17].concat(shelves || []).forEach(k => { for (let i = 0; i < n; i++) box(g, W, HB, 2 * M5, xc - Wd / 2 + 25 + i * 55, yr(k), 0, k === 17 ? M.top : M.tie); });
  [-1, 1].forEach(sz => sheetBox(g, a - 50 - 2 * SHEET_GAP, 22 * HB - 30, 4, xc, 11 * HB, sz * (zE + 13)));   // лист кончается перед втулками колонн
  sheetsBetween(g, [-zE, mz, 0, zE], 22 * HB - 30, 11 * HB, (w, zc) => sheetBox(g, 4, 22 * HB - 30, w, xo + side * 13, 11 * HB, zc));   // средние втулки дальней стенки — на 0 и на mz
  return { xo, xi };
}
function propK(g, px, zs) {                          // стойка: поперечные бруски 944 мм по нечётным рядам, колонны у стержней
  const D = 2 * M5 + W, yr = k => k * HB + HB / 2; zs = zs || [-M5, 0, M5];
  for (let k = 1; k <= 21; k += 4) { box(g, W, HB, D, px, yr(k), 0, M.bar); plugsZ(g, px, yr(k), -D / 2, D / 2); }
  for (let k = 0; k < 22; k++) { if (k % 4 === 1) continue; zs.forEach(z => { if (z === 0 && k === 0) return; box(g, W, HB, W, px, yr(k), z, M.filler); }); }
  zs.forEach(z => { cyl(g, 6, 22 * HB + 46, px, 0, z, M.rod); });
}
INFO.K4 = () => {
  const c = WCFG.T4, a = c.a, r = tableLR(root, c.zone, c.props, 'lift', M5, { a, split: 1490, noBase: true }), Lt = r.Lt, xt = Lt / 2 - a / 2;
  const L = tumbaK(root, -xt, -1, a, [5, 9, 13]), Rr = tumbaK(root, xt, 1, a, [5, 9, 13]);
  c.props.forEach(px => propK(root, px));
  const yr = k => k * HB + HB / 2;
  box(root, Rr.xi - L.xi + W, HB, W, 0, yr(0), 0, SHOW.tieHi === false ? M.bar : M.tie); plugsX(root, L.xi - W / 2, Rr.xi + W / 2, yr(0), 0);   // обвязка под ногами — на полу
  [[L.xo, L.xi], [Rr.xi, Rr.xo]].forEach(([x0, x1]) => { box(root, x1 - x0 + W, HB, W, (x0 + x1) / 2, yr(2), 0, M.tie); plugsX(root, x0 - W / 2, x1 + W / 2, yr(2), 0); });   // внутри тумб — рядом выше
  [1, -1].forEach(sd => { c.bench.forEach(bx => { seatTumba(root, bx - M4, sd * ZW, 1); seatTumba(root, bx + M4, sd * ZW, -1);
    const ig = new THREE.Group(); root.add(ig); insertPart(ig, 0, true); ig.position.set(bx, 14 * HB, sd * ZW); }); });
  return ['Комплект на 4: основа — стол ' + Lt + ' × 944 × 740 мм и две скамьи',
    'Правая секция столешницы приподнята, чтобы было видно. Сруб по правилу: бруски вдоль стола — чётные ряды, поперёк — нечётные, цельными брусками 944 мм.',
    'Обвязка по центральной оси (коричневая): под ногами — плашмя на полу, одним куском ' + Math.round(Rr.xi - L.xi + W) + ' мм от тумбы до тумбы через стойку; внутри тумб — рядом выше (60–90 мм), до дальней стенки. Через ось по центру не переступают — это не порог.',
    'Стойка — цельные поперечные бруски, средняя колонна стоит на обвязке: вдоль стола её держит обвязка, упираясь в колонны тумб. Торцевые тумбы — хранение: рамка и средняя колонна со стороны ног.',
    'Полки лежат на брусках обеих боковых стенок (одни ряды — упор не нужен): одна в базе — 510–540 мм, докупаются на 150, 270 и 390 мм (коричневые). Торцы — заглушки.'];
};
/* ---------- Стол на 8: двойная колонна по оси и обвязка в две нитки (В1), стойка с узким низом (В2) — 27.09.2026 ----------
   Средняя колонна стойки заменена двумя вплотную (z = ±25), каждая на своём стержне; средняя балка лежит над их стыком.
   Обвязка на полу — две нитки по ±25: в каждом пролёте одна нитка несущая (концы в колоннах на стержнях), вторая — фальш-брусок
   для вида, притянут к несущей горизонтальными шпильками M12 с гайками и гроверами с двух сторон. Несущие нитки чередуются —
   стыки вразбежку, в каждой колонне один конец. У тумбы — одна колонна (на ±25), внутрь тумбы идёт одна планка. */
const Z0 = 25, STUD = 38;                                  // ₽ за шпильку M12×124 с 2 гайками, 2 гроверами, 2 шайбами
function studZ(g, x, y) {                                   // горизонтальная шпилька поперёк двух брусков обвязки
  const m = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 2 * W + 24, 12), M.steel); m.rotation.x = Math.PI / 2; m.position.set(x, y, 0); g.add(m);
  [-1, 1].forEach(sz => { const n = new THREE.Mesh(new THREE.CylinderGeometry(10, 10, 8, 6), M.steel); n.rotation.x = Math.PI / 2; n.position.set(x, y, sz * (W + 5)); g.add(n); });
}
function propV1(g, px) {                                   // 4 колонны: −447, −25, +25, +447
  const D = 2 * M5 + W, yr = k => k * HB + HB / 2, zs = [-M5, -Z0, Z0, M5], q = { fill: 0, bar: 0, bars: 0, rod: 0 };
  for (let k = 1; k <= 21; k += 4) { box(g, W, HB, D, px, yr(k), 0, M.bar); plugsZ(g, px, yr(k), -D / 2, D / 2); q.bar += D; q.bars++; }
  for (let k = 0; k < 22; k++) { if (k % 4 === 1) continue; zs.forEach(z => { if (k === 0 && Math.abs(z) === Z0) return; box(g, W, HB, W, px, yr(k), z, M.filler); q.fill++; }); }
  zs.forEach(z => { const h = 22 * HB + (Math.abs(z) === M5 ? 46 : 0); cyl(g, 6, h, px, 0, z, M.rod); q.rod += h; });
  return q;
}
function propStep(g, px) {                                 // узкий низ: колонны ±25, ±166 до пола; ±306, ±447 — только наверху (ряды 17–21)
  const D = 2 * M5 + W, yr = k => k * HB + HB / 2, st = (M5 - Z0) / 3, c1 = Z0 + st, c2 = Z0 + 2 * st, lo = 2 * c1 + W, q = { fill: 0, bar: 0, bars: 0, rod: 0, lo, st, c1 };
  for (let k = 1; k <= 21; k += 4) { const L = k >= 17 ? D : lo; box(g, W, HB, L, px, yr(k), 0, M.bar); plugsZ(g, px, yr(k), -L / 2, L / 2); q.bar += L; q.bars++; }
  const full = [-c1, -Z0, Z0, c1], up = [-M5, -c2, c2, M5];
  for (let k = 0; k < 22; k++) { if (k % 4 === 1) continue;
    full.forEach(z => { if (k === 0 && Math.abs(z) === Z0) return; box(g, W, HB, W, px, yr(k), z, M.filler); q.fill++; });
    if (k > 17) up.forEach(z => { box(g, W, HB, W, px, yr(k), z, M.filler); q.fill++; }); }
  full.forEach(z => { cyl(g, 6, 22 * HB, px, 0, z, M.rod); q.rod += 22 * HB; });
  up.forEach(z => { const h = 5 * HB + (Math.abs(z) === M5 ? 46 : 0); cyl(g, 6, h, px, 17 * HB, z, M.rod); q.rod += h; });
  return q;
}
/* детали, нарисованные светом и навесом в сцене стола, помечаются позицией: цена стола их не считает, заглушки позиции считаются на месте */
function tagItem(g, from, item) { g.children.slice(from).forEach(o => o.traverse(x => { x.userData.item = item; })); }
function slideV(step, shA, shB, o) {
  o = Object.assign({ set: 'T8', lift: true, seats: false }, o || {});
  LIGHTX = step === 2 && (SHOW.light || SHOW.canopy) ? (SHOW.canopy ? canopyXs(o.set) : lightXs(o.set)) : null; PANELX = step === 2 ? (LIGHTX || lightXs(o.set)) : null;
  if (step === 2 && SHOW.shelf2 && !(shA && shA.length) && !(shB && shB.length)) { shA = [5, 13]; shB = [9]; }   // «докупные полки» — для примера
  const c = step === 2 ? newCfg(o.set) : WCFG.T8, Md = step === 2 ? MD3 : M5, a = c.a, r = tableLR(root, c.zone, c.props, null, Md, { a, split: 1490, noBase: true }), Lt = r.Lt, xt = Lt / 2 - a / 2;
  CANST = null; let lt = null, cn = null; if (LIGHTX) { const n0 = root.children.length; lt = drawLight(root, LIGHTX, !!SHOW.light, !!SHOW.canopy, SHOW.canopy ? canopyInners(LIGHTX) : null); tagItem(root, n0, 'light');
    const n1 = root.children.length; if (SHOW.canopy) cn = drawCanopy(root, LIGHTX, 2 * c.a + c.zone); tagItem(root, n1, 'canopy'); if (!SHOW.light) lt = null; }
  if (step === 2 && SHOW.people) drawPeople(root, c);
  if (o.lift && !SHOW.canopy) r.secs.forEach(sg => { sg.position.y = 450; });   // с навесом столешницу не поднимаем: поднятая секция вошла бы в стойки, полки и ширму навеса
  if (o.seats) { const zw = Md + W / 2 + L4 / 2 + 8;                                               // скамьи в 8 мм от края стола
    [1, -1].forEach(sd => { seatList(c).forEach(t => stoolL(root, t.x, sd * zw, t));
      c.bench.concat(SHOW.xIns ? c.xins || [] : []).forEach(bx => { const ig = new THREE.Group(); root.add(ig); insertPart(ig, 0, true); ig.position.set(bx, 14 * HB, sd * zw); }); }); }
  const ps = c.props.slice().sort((p, q) => p - q), nS = ps.length + 1, zl = i => (i % 2 === 0 ? -Z0 : Z0);
  const TK = step === 2 ? (x, sd) => tumbaK3(root, x, sd, a, shA, shB, Md) : (x, sd, mz) => tumbaK(root, x, sd, a, [], mz);
  const L = TK(-xt, -1, zl(0)), Rr = TK(xt, 1, zl(nS - 1));
  const qs = ps.map(px => step === 2 ? propStepN(root, px, Md, 3) : step ? propStep(root, px) : propV1(root, px));
  const yr = k => k * HB + HB / 2, pts = [L.xi].concat(ps, [Rr.xi]), load = [], fake = []; let studs = 0;
  for (let i = 0; i < nS; i++) {
    const z = zl(i), x0 = pts[i] - W / 2, x1 = pts[i + 1] + W / 2;                                   // несущая нитка — от колонны до колонны
    box(root, x1 - x0, HB, W, (x0 + x1) / 2, yr(0), z, M.tie); load.push(Math.round(x1 - x0));
    const f0 = i === 0 ? pts[0] - W / 2 : pts[i] + W / 2, f1 = i === nS - 1 ? pts[i + 1] + W / 2 : pts[i + 1] - W / 2;   // фальш-брусок — между концами несущих
    box(root, f1 - f0, HB, W, (f0 + f1) / 2, yr(0), -z, M.tie); fake.push(Math.round(f1 - f0));
    (step === 2 && (i === 0 || i === nS - 1) ? [i === 0 ? f1 - 60 : f0 + 60] : [f0 + 60, f1 - 60]).forEach(x => { studZ(root, x, yr(0)); studs++; });
  }
  [L.xi - W / 2 - 1, Rr.xi + W / 2 + 1].forEach(x => [-Z0, Z0].forEach(z => box(root, 2, HB - 2, W - 2, x, yr(0), z, M.plug)));
  if (step !== 2) [[L.xo, L.xi, zl(0)], [Rr.xi, Rr.xo, zl(nS - 1)]].forEach(([x0, x1, z]) => { box(root, x1 - x0 + W, HB, W, (x0 + x1) / 2, yr(2), z, M.tie); plugsX(root, x0 - W / 2, x1 + W / 2, yr(2), z); });
  // деньги против стойки из 2 частей (3 колонны: 47 втулок, 6 брусков 944, 3 стержня 706) и одной нитки обвязки
  const PER = E.PROFILES.dpk50x30.price_m / 1000 * 1.03, lag = (mm, n) => (mm + 3 * n) * PER, q = qs[0];
  const dProp = lag((q.fill - 47) * W + (q.bar - 6 * 944), q.fill - 47) + (q.rod - 3 * 706) / 1000 * 55;
  const dTie = lag(fake.reduce((u, v) => u + v, 0), fake.length) + studs * STUD, dAll = Math.round((dProp * ps.length + dTie) / 10) * 10;
  LIGHTX = null; PANELX = null;
  return { Lt, load, fake, studs, dProp: Math.round(dProp), dTie: Math.round(dTie), dAll, q, nP: ps.length, a, Md, D: 2 * Md + W, secs: r.secs.length, longest: Math.round(r.longest), c, lt, cn };
}
/* ---------- В3 (27.09.2026): тумба со сдвоенным входом и двойной перегородкой, полки-половинки; стойка на 6 колонн ----------
   Тумба: средние колонны у входа и у дальней стенки — по две вплотную (±25). Между ними — перегородка из двух ниток брусков
   (±25) на рядах боковых стенок 4, 8, 12, 16: вход связан с дальней стенкой по всей глубине. Два отсека; полки-половинки
   лежат на боковой стенке и своей нитке перегородки — в каждом отсеке на своей высоте (150/270/390/510). Пол внутри свободен.
   Стойка: колонны ±25 и ±236 до пола, ±447 — только наверху (ряды 18–20); все просветы по 211 мм. */
function tumbaK3(g, xc, side, a, shA, shB, Md) {
  Md = Md || M5;           // shA — полки отсека z<0, shB — z>0 (ряды 5, 9, 13; база — 17 в обоих)
  const D = 2 * Md + W, xo = xc + side * (a / 2 - W / 2), xi = xc - side * (a / 2 - W / 2), zE = Md, yr = k => k * HB + HB / 2;
  for (let k = 0; k <= 20; k += 4) [-1, 1].forEach(sz => { box(g, a, HB, W, xc, yr(k), sz * zE, M.bar); plugsX(g, xc - a / 2, xc + a / 2, yr(k), sz * zE); });   // боковые стенки
  for (let k = 4; k <= 16; k += 4) [-1, 1].forEach(sz => { box(g, a, HB, W, xc, yr(k), sz * Z0, M.bar); plugsX(g, xc - a / 2, xc + a / 2, yr(k), sz * Z0); });  // перегородка — две нитки
  for (let k = 1; k <= 21; k += 4) { box(g, W, HB, D, xo, yr(k), 0, M.bar2); plugsZ(g, xo, yr(k), -D / 2, D / 2); }            // дальняя стенка
  [1, 21].forEach(k => { box(g, W, HB, D, xi, yr(k), 0, M.bar2); plugsZ(g, xi, yr(k), -D / 2, D / 2); });                    // рамка со стороны ног
  const sl = (x, z, k) => box(g, W, HB, W, x, yr(k), z, M.filler);
  const farBar = k => k % 4 === 1, inBar = k => k === 1 || k === 21, sideBar = k => k % 4 === 0, partBar = k => k >= 4 && k <= 16 && k % 4 === 0;
  for (let k = 0; k < 22; k++) [-1, 1].forEach(sz => {
    if (!sideBar(k) && !farBar(k)) sl(xo, sz * zE, k);
    if (!sideBar(k) && !inBar(k)) sl(xi, sz * zE, k);
    if (!partBar(k) && !farBar(k)) sl(xo, sz * Z0, k);
    if (!partBar(k) && !inBar(k) && k !== 0) sl(xi, sz * Z0, k);                     // ряд 0 у входа — концы обвязки
  });
  [-zE, -Z0, Z0, zE].forEach(z => [xo, xi].forEach(x => { cyl(g, 6, 22 * HB - 2, x, 0, z, M.rod); if (Math.abs(z) > 400 && !NOSTUB) cyl(g, 6, 48, x, 22 * HB - 2, z, M.rod); }));
  if (SHOW.ends === 'trims') { const H = 22 * HB, off = W / 2 + 1.5;                         // декоративный уголок вместо заглушек
    [xo, xi].forEach(x => { const nx = x === xo ? side : -side; [-1, 1].forEach(sz => { box(g, 50, H, 3, x, H / 2, sz * (zE + off), M.trim); box(g, 3, H, 50, x + nx * off, H / 2, sz * zE, M.trim); });
      const hc = (LIGHTX && !LIGHTX.zc && LIGHTX.some(m => Math.abs(m - x) < 1) ? 14 * HB : H) - HB; box(g, 3, hc, 100, x + nx * off, HB + hc / 2, 0, M.trim); }); }   // по центру — над обвязкой
  const n = Math.floor((a - 2 * W - (LIGHTX && LIGHTX.wall ? 86 : 0) + 5) / 55), Wd = n * 50 + (n - 1) * 5, hl = zE - Z0, hz = (zE + Z0) / 2;   // полки-половинки; с навесом у торцов — место под стойки
  [[-1, [17].concat(shA || [])], [1, [17].concat(shB || [])]].forEach(([sz, ks]) => ks.forEach(k => {
    for (let i = 0; i < n; i++) box(g, W, HB, hl, xc - Wd / 2 + 25 + i * 55, yr(k), sz * hz, k === 17 ? M.top : M.tie); }));
  {   // вставка всегда на всю стенку — от колонны до колонны
    [-1, 1].forEach(sz => sheetBox(g, a - 50 - 2 * SHEET_GAP, 22 * HB - 30, 4, xc, 11 * HB, sz * (zE + 13)));   // лист кончается перед втулками колонн (30.09.2026)
    sheetsBetween(g, [-zE, -Z0, Z0, zE], 22 * HB - 30, 11 * HB, (w, zc) => sheetBox(g, 4, 22 * HB - 30, w, xo + side * 13, 11 * HB, zc)); }   // дальняя стенка — два листа по сторонам сдвоенной колонны
  return { xo, xi, hl, n };
}
function propStep3(g, px) {                                // колонны ±25, ±236 до пола; ±447 — наверху; просветы по 211 мм
  const D = 2 * M5 + W, yr = k => k * HB + HB / 2, st = (M5 - Z0) / 2, c1 = Z0 + st, lo = 2 * c1 + W, q = { fill: 0, bar: 0, bars: 0, rod: 0, lo, st, c1 };
  for (let k = 1; k <= 21; k += 4) { const L = k >= 17 ? D : lo; box(g, W, HB, L, px, yr(k), 0, M.bar); plugsZ(g, px, yr(k), -L / 2, L / 2); q.bar += L; q.bars++; }
  const full = [-c1, -Z0, Z0, c1];
  for (let k = 0; k < 22; k++) { if (k % 4 === 1) continue;
    full.forEach(z => { if (k === 0 && Math.abs(z) === Z0) return; box(g, W, HB, W, px, yr(k), z, M.filler); q.fill++; });
    if (k > 17) [-M5, M5].forEach(z => { box(g, W, HB, W, px, yr(k), z, M.filler); q.fill++; }); }
  full.forEach(z => { cyl(g, 6, 22 * HB, px, 0, z, M.rod); q.rod += 22 * HB; });
  [-M5, M5].forEach(z => { const h = 5 * HB + 46; cyl(g, 6, h, px, 17 * HB, z, M.rod); q.rod += h; });
  return q;
}
let NOSTUB = false;                                        // зимой у стола на 4: штифты-выступы над стержнями вынуты
const MD3 = 510 - W / 2, A3 = 975, L3 = { leg: 660 };   // L3.leg — место для ног на человека (просвет между стойками)
const NEW = { T4: { np: 1, a: 517 }, T6: { np: 2, a: A3 }, T8: { np: 3, a: A3 } };   // тумба на 4 — 1 табурет в отсек, на 6 и 8 — 2
function newCfg(set) {                                     // стойки через (место для ног + 50), места одинаковые
  const np = NEW[set].np, L = L3.leg, zone = (np + 1) * L + np * W, props = [];
  for (let i = 0; i < np; i++) props.push(-zone / 2 + (i + 1) * L + i * W + W / 2);
  const bench = set === 'T8' ? [-2 * M4, 2 * M4] : [props[0]], stool = set === 'T6' ? [props[0] + 3 * M4] : [];
  const xins = set === 'T8' ? [0] : set === 'T6' ? [props[0] + 2 * M4] : [];   // места доп. вставок между скамьями / скамьёй и табуретом
  return { set, np, zone, props, a: NEW[set].a, bench, stool, xins, n: +set.slice(1) };
}
const cfgV3 = () => newCfg('T8');
function seatList(c) {                                       // табуреты одной стороны: x и полки-упоры (слева/справа)
  const L = []; c.bench.forEach(bx => { L.push({ x: bx - M4, l: false, r: true }); L.push({ x: bx + M4, l: true, r: false }); });
  (c.stool || []).forEach(sx => L.push({ x: sx, l: false, r: false }));
  L.sort((p, q) => p.x - q.x);
  if (SHOW.xIns) (c.xins || []).forEach(ix => { L.forEach(t => { if (Math.abs(t.x - (ix - M4)) < 1) t.r = true; if (Math.abs(t.x - (ix + M4)) < 1) t.l = true; }); });
  return L;
}
function stoolL(g, x, z, t) {                                // табурет с полками-упорами по списку
  const gg = seatTumba(g, x, z, t.r ? 1 : t.l ? -1 : 0); if (t.l && t.r) ledge(gg, 0, -1, 14 * HB); return gg;
}                         // новая линейка: глубина 1020 (оси крайних балок ±485), тумба стола на 8 — 967
function propStepN(g, px, Md, nS) {                        // колонны ±25 и ±(25+шаг) до пола; остальные — только наверху (ряды 18–20), на стальных шпильках
  const D = 2 * Md + W, yr = k => k * HB + HB / 2, st = (Md - Z0) / nS, c1 = Z0 + st, lo = 2 * c1 + W, q = { fill: 0, bar: 0, bars: 0, rod: 0, lo, st, c1 };
  for (let k = 1; k <= 21; k += 4) { const L = k >= 17 ? D : lo; box(g, W, HB, L, px, yr(k), 0, M.bar); plugsZ(g, px, yr(k), -L / 2, L / 2); q.bar += L; q.bars++; }
  const full = [-c1, -Z0, Z0, c1], up = []; for (let i = 2; i <= nS; i++) up.push(-(Z0 + i * st), Z0 + i * st);
  for (let k = 0; k < 22; k++) { if (k % 4 === 1) continue;
    full.forEach(z => { if (k === 0 && Math.abs(z) === Z0) return; box(g, W, HB, W, px, yr(k), z, M.filler); q.fill++; });
    if (k > 17) up.forEach(z => { box(g, W, HB, W, px, yr(k), z, M.filler); q.fill++; }); }
  if (SHOW.ends === 'trims') [-1, 1].forEach(sz => { box(g, 50, 17 * HB, 3, px, 17 * HB / 2, sz * (lo / 2 + 1.5), M.trim); box(g, 50, 5 * HB, 3, px, 17 * HB + 5 * HB / 2, sz * (D / 2 + 1.5), M.trim); });
  full.forEach(z => { cyl(g, 6, 22 * HB, px, 0, z, M.rod); q.rod += 22 * HB; });
  up.forEach(z => { const edge = Math.abs(Math.abs(z) - Md) < 1; cyl(g, 6, 5 * HB, px, 17 * HB, z, M.steel);
    if (edge && !NOSTUB) cyl(g, 6, 46, px, 22 * HB, z, M.rod); [17 * HB - 4, 22 * HB].forEach(y => cyl(g, 9, 4, px, y, z, M.steel)); q.rod += edge ? 46 : 0; });
  return q;
}
function partsCost(fnBuild) {                               // лага и стержни детали без полок (для сравнения цен)
  const g = new THREE.Group(); fnBuild(g); let mm = 0, n = 0, rod = 0;
  g.traverse(o => { if (!o.isMesh) return; const p = o.geometry.parameters || {};
    if (o.material === M.filler || o.material === M.bar || o.material === M.bar2 || o.material === M.tie) { mm += Math.max(p.width, p.depth); n++; }
    if (o.material === M.rod) rod += p.height; });
  return (mm + 3 * n) * E.PROFILES.dpk50x30.price_m / 1000 * 1.03 + rod / 1000 * 55;
}
const tieLines = v => ['Обвязка — две нитки по ±25 мм от оси, вся в полосе 100 мм по центру. В каждом пролёте одна нитка несущая: концы в колоннах, на стержнях (' + v.load.join(' / ') + ' мм); несущие чередуются — стыки вразбежку, в каждой колонне ровно один конец.',
  'Вторая нитка — фальш-брусок для вида (' + v.fake.join(' / ') + ' мм): нагрузку не несёт, притянут к несущей двумя горизонтальными шпильками M12 с гайками и гроверами с двух сторон — обе нитки работают как одна (всего ' + v.studs + ' шпилек). Самый длинный кусок ' + Math.max.apply(null, v.load.concat(v.fake)) + ' мм — в ящик ложится.',
  'У тумб — одна колонна (на 25 мм от оси), внутрь тумбы уходит одна планка: место для вещей не сужается.'];
INFO.V1 = () => { const v = slideV(false);
  return ['Стол на 8: В1 — двойная колонна по оси, обвязка в две нитки',
    'Стол ' + v.Lt + ' × 944 × 740 мм, скамьи не показаны, столешница поднята. Средняя колонна стойки — две колонны вплотную (±25 мм), каждая на своём стержне; средняя балка лежит над их стыком.'].concat(tieLines(v),
    ['Стойка: 4 колонны, проёмы по 372 мм в свету. Нагрузка на столешницу — как раньше.',
     'Дороже стойки из 2 частей: +' + v.dProp + ' ₽ на стойку (колонна), обвязка +' + v.dTie + ' ₽ (фальш-бруски и шпильки) — на стол ≈ +' + v.dAll + ' ₽ материалов.']); };
INFO.V3 = () => { const v = slideV(2, [], []), q = v.q, free = Math.round(v.Md + W / 2 - q.lo / 2), cl = Math.round(v.Md - W / 2 - Z0 - W / 2);
  const tNew = partsCost(g => tumbaK3(g, 0, -1, v.a, [], [], v.Md)), tOld = partsCost(g => { tumbaK(g, 0, -1, WCFG.T8.a, [], Z0); box(g, WCFG.T8.a, HB, W, 0, 0, 0, M.tie); });
  const dT = Math.round((tNew - tOld) / 10) * 10, tot = Math.round((v.dAll + 2 * dT) / 10) * 10;
  return ['Стол на 8: В3 — глубина ' + v.D + ', тумбы с перегородкой, стойка на 8 колонн',
    'Стол ' + v.Lt + ' × ' + v.D + ' × 740 мм, скамьи не показаны, столешница поднята. Тумбы ' + v.a + ' мм — чтобы зимой в каждый отсек встали 2 табурета. Место для ног — ' + L3.leg + ' мм на человека (удобно; норма — от 600): раскрой тот же — 56 хлыстов, как при 620–650, обрезков меньше.',
    'Тумбы: вход сдвоенный — две колонны вплотную (±25 мм), у дальней стенки так же; нижний брусок рамки на месте. Между ними — перегородка из двух ниток брусков на рядах боковых стенок (120, 240, 360, 480 мм): вход связан с дальней стенкой по всей глубине.',
    'Два отсека по ' + cl + ' мм в свету — табурет (401 мм с заглушками) входит с зазором 4–5 мм. Полки-половинки ' + Math.round(v.Md - Z0) + ' мм — в каждом отсеке на своей высоте: 150, 270, 390 или 510 мм. В базе — по одной полке в каждом отсеке, на 510 мм; остальные докупаются.',
    'Стойка — 8 колонн через ' + Math.round(q.st) + ' мм: ±25 и ±' + Math.round(q.c1) + ' до пола, ±' + Math.round(Z0 + 2 * q.st) + ' и ±' + v.Md + ' — наверху, на стальных шпильках M12 (тот же диаметр, что стеклопластиковый стержень Ø12, — те же отверстия), затянутых гайками. Низ ' + Math.round(q.lo) + ' мм — ступням под стойкой ' + free + ' мм с каждой стороны.',
    'Нагрузка: 100 кг оперлись на край, ×1,5 на рывок (1500 Н). Край держит рама: бруски рядов 17 и 21 с колоннами, пролёт ' + Math.round(q.st) + ' мм — изгиб 7,7 МПа при допуске 12 (64 %). Узлы рамы держат затянутые шпильки: нужно 115 Н·м, шпилька M12 даёт ≈ 400 — запас втрое с лишним. Вариант на 6 колонн — 11,5 МПа (96 %), отклонён.',
    'Обвязка — две нитки по ±25, у тумб обе заходят в колонны на стержнях; в средних пролётах вторая нитка — фальш-брусок на шпильках M12 (всего ' + v.studs + ' шпилек). Куски ' + v.load.join(' / ') + ' мм.',
    'Против нынешней конструкции (944 мм, стойка из 2 частей): стойка ' + (v.dProp >= 0 ? '+' : '−') + Math.abs(v.dProp) + ' ₽ × ' + v.nP + ', тумба +' + dT + ' ₽ × 2, обвязка +' + v.dTie + ' ₽ — на стол ≈ +' + tot + ' ₽ материалов (без удлинения досок столешницы: +76 мм на доску, ≈ +0,6 тыс. ₽).']; };
/* ---------- Новая линейка зимой (27.09.2026): ящик. Стойки — в середину, тумбы надвинуты на них; табуреты переставлены
   руками в отсеки тумб (через нижний брусок рамки), полкой-упором к входу; обвязка — поперёк на базовых полках;
   секции столешницы — крышкой поперёк (балки проходят мимо выступов стержней), вставки скамеек — сверху. */
function winterNew(set, noSeats) {
  const c = newCfg(set), Md = MD3, a = c.a, np = c.np, D = 2 * Md + W, yr = k => k * HB + HB / 2;
  root.userData.packed = true; let n0 = root.children.length;                                  // сложенная сцена: заглушки — по своему узлу (см. closeEnds)
  PANELX = lightXs(set); LIGHTX = SHOW.light || SHOW.canopy ? (SHOW.canopy ? canopyXs(set) : lightXs(set)) : null;   // доски столешницы — с теми же вырезами под стойки, что летом
  const r = tableLR(root, c.zone, c.props, null, Md, { a, split: 1490, noBase: true }), Lt = r.Lt, xt = Lt / 2 - a / 2, two = r.secs.length === 2; PANELX = null; LIGHTX = null;
  r.secs.forEach((sg, k) => { sg.userData.unit = 'секция ' + k; });
  NOSTUB = two;
  /* зазоры в ящике — под постоянные заглушки (30.09.2026): между стойками 5 мм (2 + 2 мм заглушки + 1), стойка — тумба 5 мм (с уголком 8) */
  const PW = W + 5, blk = np * W + (np - 1) * 5, gT = SHOW.ends === 'trims' ? 8 : 5, xL = -(blk / 2 + gT + a / 2), box3 = 2 * a + blk + 2 * gT;
  [-1, 1].forEach(sd => { n0 = root.children.length; tumbaK3(root, sd * -xL, sd, a, [], [], Md); tagUnit(root, n0, 'тумба ' + sd); });
  for (let i = 0; i < np; i++) { n0 = root.children.length; propStepN(root, (i - (np - 1) / 2) * PW, Md, 3); tagUnit(root, n0, 'стойка ' + i); }
  NOSTUB = false;
  const tg = new THREE.Group(); seatTumba(tg, 0, 0, 0); const hS = new THREE.Box3().setFromObject(tg).max.x, LE = M4 / 2 + W + W / 2;   // полтабурета и вылет полки-упора
  // табуреты: сначала со скамей (с полкой-упором), потом одиночные; отсеки по порядку
  let side = seatList(c), loose = 0; const dbl = side.filter(t => t.l && t.r).length * 2;
  if (dbl > 2) { side.forEach(t => { if (t.l && t.r) { t.l = false; loose++; } }); side = side.map(t => ({ x: t.x, l: t.l, r: t.r })); loose *= 2; }
  const st = noSeats ? [] : side.concat(side).map(t => ({ f: t.l && t.r, e: t.l || t.r })).sort((p, q) => (q.f ? 2 : q.e ? 1 : 0) - (p.f ? 2 : p.e ? 1 : 0));
  const zc = (Z0 + W / 2 + Md - W / 2) / 2, xo = xL - (a / 2 - W / 2), xi = xL + (a / 2 - W / 2), g0 = 4;
  const comps = [[-1, -zc], [-1, zc], [1, -zc], [1, zc]], used = comps.map(() => 0); let ci = 0, cur = xo + W / 2 + g0, placed = 0, lost = 0;
  st.forEach(t => {                                            // f — упоры с двух сторон, e — с одной (к входу)
    let b0;
    for (;;) {
      if (ci >= comps.length) { lost++; return; }
      b0 = cur + (t.f ? LE : hS); const end = b0 + hS, lend = t.e ? b0 + LE : end;
      if (end <= xi - W / 2 - 3 && lend <= xi + W / 2 - 3) break;
      ci++; cur = xo + W / 2 + g0;
    }
    const [sd, z] = comps[ci], cx = b0; stoolL(root, sd * -cx, z, t.f ? { l: true, r: true } : t.e ? (sd < 0 ? { r: true } : { l: true }) : {}); used[ci]++; placed++;
    cur = Math.max(b0 + hS, t.e ? b0 + LE : 0) + g0;
  });
  // обвязка — поперёк на базовых полках; вставки скамеек (без штифтов) — на обвязке; всё внутри тумб
  const pts = [-(Lt / 2 - a + W / 2)].concat(c.props, [Lt / 2 - a + W / 2]), pcs = [];
  for (let i = 0; i + 1 < pts.length; i++) { const sp = pts[i + 1] - pts[i], end = i === 0 || i + 2 === pts.length; pcs.push(sp + W, end ? sp + W : sp - W); }
  const perT = Math.ceil(pcs.length / 2);
  pcs.forEach((L, i) => { const sd = i < perT ? -1 : 1, j = i < perT ? i : i - perT, n = i < perT ? perT : pcs.length - perT;
    box(root, W, HB, L, sd * -(xL) + (j - (n - 1) / 2) * 60, yr(18), 0, M.tie); });
  const nIns = noSeats ? 0 : (c.bench.length + (SHOW.xIns ? (c.xins || []).length : 0)) * 2;
  const nPer = Math.ceil(nIns / 2);
  for (let i = 0; i < nIns; i++) { const sd = i % 2 ? 1 : -1, k = i >> 1, z = k % 2 ? zc : -zc, dx = nPer > 2 ? (k >> 1 ? 150 : -150) : 0, ig = new THREE.Group(); root.add(ig); insertPart(ig, 0, false); ig.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(ig); ig.position.set(sd * -(xL) + dx, yr(19) - HB / 2 - b.min.y, z); }
  // крышка: торцевые секции остаются на своих тумбах (отверстия балок — на своих стержнях), средние — стопкой вдоль сверху
  const secs = r.secs.slice(), hL = 80 + (SHOW.pnT ? PN : 0), shift = xL + xt;
  if (two) secs.forEach((sg, k) => { const b = new THREE.Box3().setFromObject(sg); sg.position.set(-(b.min.x + b.max.x) / 2, k * hL, 0); });   // стол на 4: две секции стопкой по центру
  else { secs[0].position.x = shift; secs[secs.length - 1].position.x = -shift; }
  const mid = two ? [] : secs.slice(1, -1), bb = mid.map(sg => new THREE.Box3().setFromObject(sg)), perL = Math.max(1, Math.floor((box3 + 10) / (bb.length ? (bb[0].max.x - bb[0].min.x + 10) : 1)));
  mid.forEach((sg, k) => { const L = 1 + Math.floor(k / perL), j = k % perL, n = Math.min(perL, mid.length - (L - 1) * perL), w = bb[k].max.x - bb[k].min.x;
    const tx = (j - (n - 1) / 2) * (w + 10); sg.position.set(tx - (bb[k].min.x + bb[k].max.x) / 2, L * hL, 0); });
  const layers = two ? 2 : 1 + Math.ceil(mid.length / perL);
  if (SHOW.glass) root.children.filter(o => o.isMesh && o.material === M.glass).forEach(o => root.remove(o));   // стекло — рулоном под чехол
  let ltH = 0, packInfo = null; if (SHOW.light || SHOW.canopy) { const lg = new THREE.Group(), xs = SHOW.canopy ? canopyXs(set) : lightXs(set), lp = drawLight(lg, xs, !!SHOW.light, !!SHOW.canopy, SHOW.canopy ? canopyInners(xs) : null), cp = SHOW.canopy ? drawCanopy(lg, xs, Lt) : null, yL = TOPY + layers * hL;   // снятое — плашмя на крышку
    const BX = box3, BZ = D, unfit = []; let y = yL; if (cp) CANST = null;
    const fitAng = (L, B) => { for (let a = 1; a < 89; a++) { const t = a * Math.PI / 180; if (L * Math.cos(t) + B * Math.sin(t) <= BX && L * Math.sin(t) + B * Math.cos(t) <= BZ) return t; } return null; };
    if (cp) cp.sashL.forEach(Lx => {                        // створки — целыми рамами стопкой, на крышке
      const along = Lx <= BX && cp.Ls <= BZ, across = Lx <= BZ && cp.Ls <= BX; if (!along && !across) { unfit.push('створка ' + Lx + ' × ' + cp.Ls); return; }
      const sg = new THREE.Group(); root.add(sg); sg.position.set(0, y, 0); if (!along) sg.rotation.y = Math.PI / 2;
      [-1, 1].forEach(k => box(sg, 30, 50, cp.Ls, k * (Lx / 2 - 15), 25, 0, M.bar)); [-cp.Ls / 2 + 25, -cp.Ls / 2 + CAN.mid, cp.Ls / 2 - 15, cp.Ls / 2 - 45].forEach(z => box(sg, Lx - 60, 50, 30, 0, 25, z, M.bar));
      box(sg, Lx - 40, 4, cp.Ls - 80, 0, 15, 0, M.pc).userData.slope = true; y += 56; });   // лист — в пазах рамы, как на крыше; боковины на ребро
    const items = lp.pcs.concat(cp ? cp.loose : []).filter(L => L > 100).map(L => ({ L, t: 30, w: 55, mat: M.bar }));   // бруски
    if (SHOW.light) { const prof = lp.len / Math.max(1, lp.n - 1); for (let i = 0; i < lp.n - 1; i++) items.push({ L: Math.round(prof), t: 30, w: 55, mat: M.alu }); }
    const rolls = []; if (cp) cp.curtDims.forEach(([cw, ch]) => {                 // шторы: на трубе, если труба ложится вдоль; иначе труба половинами, полотно снято и свёрнуто поперёк
      if (cw + 20 <= BX - 10) rolls.push({ L: cw + 20, t: 80, w: 85, mat: M.alu });
      else { items.push({ L: Math.round((cw + 20) / 2), t: 30, w: 55, mat: M.alu }, { L: Math.round((cw + 20) / 2), t: 30, w: 55, mat: M.alu }); rolls.push({ L: ch + 20, t: 80, w: 85, mat: M.pvc }); } });
    if (cp) { let lanes = [], z = 0; cp.plates.slice().sort((p, q) => q[1] - p[1]).forEach(([L, Wd]) => {   // листы (накладка конька, фронтон) — тонким слоем
      let ln = lanes.find(l => l.w >= Wd && l.u + L <= BX); if (!ln) { if (z + Wd > BZ) { y += 6; lanes = []; z = 0; } ln = { z, w: Wd, u: 0 }; lanes.push(ln); z += Wd + 5; }
      box(root, L, 4, Wd, -BX / 2 + ln.u + L / 2, y + 2, -BZ / 2 + ln.z + Wd / 2, M.pc); ln.u += L + 5; }); y += 6; }
    const pack = (list, vis) => {                           // ряды вдоль ящика; что длиннее — пачкой по диагонали
      const st8 = list.filter(o => o.L <= BX - 10).sort((p, q) => q.L - p.L), dg = list.filter(o => o.L > BX - 10).sort((p, q) => q.L - p.L);
      if (st8.length) { const t = st8[0].t, wd = st8[0].w, per = Math.floor((BZ - 20) / wd), lanes = [];
        st8.forEach(o => { let ln = lanes.find(l => l.u + o.L <= BX); if (!ln) { ln = { u: 0, it: [] }; lanes.push(ln); } ln.it.push([ln.u, o]); ln.u += o.L + 10; });
        lanes.forEach((ln, i) => { const row = Math.floor(i / per), j = i % per; ln.it.forEach(([u, o]) => vis(o, -BX / 2 + u + o.L / 2, y + row * t, -BZ / 2 + 10 + wd / 2 + j * wd, 0)); });
        y += Math.ceil(lanes.length / per) * t; }
      while (dg.length) { const L = dg[0].L, wd = dg[0].w, t = dg[0].t; let n = Math.floor((BZ - 20) / wd), a = null; for (; n >= 1; n--) { a = fitAng(L, n * wd); if (a !== null) break; }
        if (a === null) { dg.splice(0).forEach(o => unfit.push(Math.round(o.L) + ' мм')); break; }
        dg.splice(0, n).forEach((o, j) => { const off = (j - (n - 1) / 2) * wd; vis(o, Math.sin(a) * off, y, Math.cos(a) * off, a); }); y += t; } };
    pack(items, (o, x, yy, z, a) => { const m = box(root, o.L, o.t, o.w - 5, x, yy + o.t / 2, z, o.mat); m.rotation.y = a; });
    pack(rolls, (o, x, yy, z, a) => { const r = new THREE.Mesh(new THREE.CylinderGeometry(o.t / 2 - 2, o.t / 2 - 2, o.L, 14), o.mat); r.rotation.order = 'YXZ'; r.rotation.y = a; r.rotation.z = Math.PI / 2; r.position.set(x, yy + o.t / 2, z); root.add(r); });
    ltH = y - yL; packInfo = { unfit, sashes: cp ? cp.sashL.length : 0, rollsOff: rolls.filter(o => o.mat === M.pvc).length, rollsOn: rolls.filter(o => o.mat === M.alu).length, H: Math.round(ltH) }; }
  let cov = null; if (SHOW.cover !== false) { root.updateMatrixWorld(true); const all = new THREE.Box3(); root.children.forEach(o => all.union(new THREE.Box3().setFromObject(o)));
    const cg = coverMesh(root, all); cg.userData.part = 'cover'; cov = cg.userData.cover; }
  for (let i = 0; i < loose; i++) { const sd = i % 2 ? 1 : -1; box(root, W, HB, M4 - W - 4, sd * -(xL) + (i >> 1 ? -1 : 1) * (a / 2 - W - 40), yr(18), (i >> 1) % 2 ? zc : -zc, M.filler); }   // открученные полки-упоры
  return { c, Lt, box3: Math.round(box3), D, layers, placed, lost, used, pcs: pcs.map(Math.round), H: Math.round(TOPY + layers * hL + ltH), nIns, cov, loose, two, light: !!SHOW.light, canopy: !!SHOW.canopy, pack: packInfo };
}
const winLinesNew = w => ['Стол на ' + w.c.n + ' зимой', '<b>Ящик ' + w.box3 + ' × ' + w.D + ' × ' + w.H + ' мм с крышкой в ' + pl(w.layers, 'слой', 'слоя', 'слоёв') + (w.cov ? '; в чехле ' + w.cov.L + ' × ' + w.cov.W + ' × ' + w.cov.H + ' мм' : '') + '</b>',
  'Стойки сдвинуты в середину, тумбы надвинуты на них. Табуреты переставлены руками в отсеки тумб (через нижний брусок рамки): всего ' + w.placed + (w.lost ? ', НЕ ПОМЕСТИЛОСЬ ' + w.lost : ' — все внутри') + '; по отсекам ' + w.used.join(' / ') + '. Полка-упор смотрит к входу, зазоры 4–5 мм.' + (w.loose ? ' С доп. вставками: у ' + w.loose + ' табуретов вторая полка-упор откручивается (4 самореза) и ложится на базовую полку — иначе по два табурета в отсек не встают.' : ''),
  'Табуреты высотой 450 — под базовыми полками (510). На базовых полках — обвязка (' + pl(w.pcs.length, 'кусок', 'куска', 'кусков') + ', ' + Math.min.apply(null, w.pcs) + '–' + Math.max.apply(null, w.pcs) + ' мм) поперёк, на ней вставки скамеек (' + w.nIns + ', штифты вынуты). Докупные полки — туда же.',
  (w.light ? 'Освещение снято и лежит на крышке плашмя: бруски стоек и конька, профили с лентой. ' : '') + (w.canopy ? 'Навес снят и лежит на крышке: ' + (w.pack ? w.pack.sashes : '') + ' створок целыми рамами стопкой (снимаются с петель подъёмом), накладка конька и фронтоны — листами, стойки (по две части), перекладины, прогоны и бруски — рядами (что длиннее ящика — по диагонали), шторы — рулонами' + (w.pack && w.pack.rollsOff ? ' (длинные — полотно снято с трубы и свёрнуто поперёк, труба половинами)' : '') + '; слой навеса ' + (w.pack ? w.pack.H : '') + ' мм. ' + (w.pack && w.pack.unfit.length ? '<b>Не входит в ящик: ' + w.pack.unfit.join(', ') + '.</b> ' : 'Всё в пределах ящика. ') : '') + (w.two ? 'Крышка: две секции столешницы стопкой по центру (как раньше у стола на 4). Штифты-выступы над стержнями тумб и стойки (под отверстия балок) зимой вынимаются — 10 шт., в мешочек.' : 'Крышка: торцевые секции столешницы остаются на своих тумбах и едут вместе с ними — отверстия балок на своих стержнях; средние секции — стопкой сверху.') + ' Гибкое стекло — рулоном. Сверху — чехол (ПВХ); кнопкой «чехол» можно снять и посмотреть внутрь.'];
INFO.NW4 = () => winLinesNew(winterNew('T4'));
INFO.NW6 = () => winLinesNew(winterNew('T6'));
INFO.NW8 = () => winLinesNew(winterNew('T8'));
const sumLinesNew = v => { const c = v.c, q = v.q;
  return ['Стол на ' + c.n, '<b>Стол ' + v.Lt + ' × ' + v.D + ' × 740 мм' + (c.n === 4 ? ' + 2 скамьи' : c.n === 6 ? ' + 2 скамьи и 2 табурета' : ' + 4 скамьи') + (SHOW.xIns && c.xins.length ? ' + доп. вставки — сплошная скамья' : '') + '</b>',
    'Место для ног — ' + L3.leg + ' мм на человека, ' + c.n / 2 + ' места с каждой стороны; ' + (c.np === 1 ? 'стойка посередине' : c.np + ' стойки через ' + (L3.leg + W) + ' мм') + '. Тумбы ' + v.a + ' мм — хранение: два отсека, в базе по одной полке-половинке на 510 мм, докупаются на 150/270/390.',
    'Стойка — 8 колонн, узкий низ ' + Math.round(q.lo) + ' мм (ступням под ней по ' + Math.round(v.Md + W / 2 - q.lo / 2) + ' мм), верх на всю глубину; верхние короткие колонны — на стальных шпильках M12. Обвязка — две нитки по центру, куски ' + v.load.join(' / ') + ' мм.',
    'Сиденья: 450 мм, до столешницы 290, низ балок 660 — под колени 210 мм. Скамьи — в 8 мм от края стола. Столешница — ' + pl(v.secs, 'секция', 'секции', 'секций') + ', самая длинная ' + v.longest + ' мм (' + (v.longest <= 1000 ? 'курьер' : 'СДЭК до 1,5 м') + ').',
    (c.xins.length ? 'Доп. вставка (кнопка «доп. вставки»): ' + (c.n === 6 ? 'между скамьёй и табуретом' : 'между двумя скамьями') + ' — такая же вставка с двумя полками-упорами; сиденье становится сплошным, ' + (c.n === 6 ? '3 табурета + 2 вставки = 1,8 м — сядут 4–5 человек' : '4 табурета + 3 вставки = 2,5 м — сядут 5–6 человек') + ' с каждой стороны. Продаётся комплектом «скамейка».' : 'У стола на 4 скамья одна с каждой стороны — доп. вставка не нужна.'),
    (v.lt && v.cn && v.cn.portal ? 'Освещение под навесом: лента 24 В в алюминиевом профиле с матовым рассеивателем висит под коньком навеса на поперечинах к коньку (через ≤ 0,7 м), вдоль всего стола, ' + (v.lt.len / 1000).toFixed(1) + ' м; низ света ≈2,33 м (≈1,6 м над столом) — свет широкий, не слепит; диммер с пультом, блок питания IP67. Отдельных стоек света нет — стоят стойки навеса. ' : '') +
    (v.lt && !(v.cn && v.cn.portal) ? 'Освещение: ' + pl(v.lt.n, 'стойка', 'стойки', 'стоек') + ' света — «вилка» из 4 брусков обхватывает верх стойки стола или входа тумбы и стянута с ним 4 шпильками M12 насквозь (через верхний брусок и колонны), столешницу проходит в вырезе 120 × 140; ' + (v.cn ? 'с навесом нижнего конька света нет — лента висит под коньком навеса, низ света ' + Math.round(v.lt.y0) + ' мм (лента ярче, 14 Вт/м); ' : 'конёк на 1580–1630 мм, низ света 1590 мм — на 850 мм над столом, на 190 мм выше головы сидящего и поднятых бокалов, бруски конька закрывают ленту от глаз сбоку; ') + 'свет — лента 24 В в профиле с рассеивателем, ' + (v.lt.len / 1000).toFixed(1) + ' м. Самая длинная деталь ' + Math.max.apply(null, v.lt.pcs) + ' мм — в ящик. Все гайки света — барашки, без инструмента. Кнопка «ночь» — посмотреть, как светит.' : 'Освещение — кнопкой «освещение».'),
    (v.cn ? 'Навес — ' + v.cn.sashes + ' створок крыши (рамы из лаги, в пазу сотовый поликарбонат 4 мм), 2 фронтона (' + v.cn.gableArea.toFixed(1) + ' м²) и ' + v.cn.curtTxt + ' из гибкого стекла ПВХ; над столом и скамьями ' + v.cn.len + ' × ' + v.cn.width + ' мм. ' + (v.cn.portal ? 'Стойки — только на 4 углах каждой тумбы (' + v.cn.posts + ' шт), там, где никто не сидит: стойка — три бруска на ребро вплотную (30 × 150 мм), стоит внутри тумбы у торцевой стенки (у входа — у рамки) на своём винтовом анкере со стальным башмаком и идёт до крыши; снаружи тумбы её не видно, к сидящим она повёрнута узкой стороной (30 мм); на уровне стола стянута шпильками M12 через обвязку столешницы (685 и 725 мм) — стенки тумб не сверлятся, в них идёт лист; прогон — рядом со стойкой, на шпильках. В полке-половинке у торцов — место под стойку: на 4 доска меньше (6 вместо 7), на 6 и 8 — две (14 вместо 16). Стойка из двух частей встык на высоте 1,13 м: в полости — стальной вкладыш 300 мм, по 150 мм в каждую часть, в каждой части поперечная шпилька M12; без клея, разбирается ключом; вкладыши зимой — в ящике с крепежом. Каждая пара угловых стоек поперёк стола стянута перекладиной на 2155–2205 мм (над столом — над головами) — вместе как ворота, ветер гнут вдвое слабее одной стойки. Вдоль каждой длинной стороны по верху стоек — прогон в две нитки (два бруска на ребро, между ними 200 мм, вставки на шпильках M12 через ≤ 360 мм), низ прогона 2000 мм над краем стола; на верхнюю нитку по всей длине лёг средник створки — спиц нет. Конёк — на бабках на перекладинах; у конька разъёмные петли. ' : 'У конька — разъёмные петли; створку держит спица — горизонтальный брусок от надставки к среднику створки на высоте ≈2190 мм (над головами), спицы обеих сторон стянуты через стойку (' + v.cn.stays + ' спиц). ') + 'Крыша неподвижная, скат 18°, край ' + v.cn.eave + ' мм — встать и выйти можно. Хочется открытого неба — створку снимают с петель подъёмом. Торцы — фронтоны: треугольная рама из лаги с поликарбонатом под скатами, низ — затяжка на уровне края крыши (≈2055 мм), рама притянута к спицам. Свесы с 4 сторон: по длинным — край крыши, на торцах крыша выходит за фронтон на ≈290 мм. Шторы — рулоны с 4 сторон: по длинным сторонам под краем крыши разматываются до 600 мм за спинами сидящих, на торцах — фронтоны за торцами и по одной косой шторе: от фронтона на всю ширину крыши вниз к торцу столешницы, сужается до ширины стола, низ — двумя ремнями к торцу столешницы; внизу утяжелитель, края соседних штор — на липучке; в ветер сильнее 10 м/с свернуть (кнопка «шторки вниз»). Растяжек нет: под каждой стойкой — свой винтовой анкер с башмаком (' + v.cn.anchors + ' шт); тумбы и их стеклопластиковые стержни не трогаются.' : ''),
    (v.cn ? 'Проверка узлов (лага полая; допуск 12 МПа; жёсткость ДПК принята 3000 МПа — проверить на образце; ветер с запасом ×1,3 на обтекание и ×1,4 на порывы), ветер 15 / 20 м/с: ' + (v.cn.portal ? 'прогон — середина между тумбами (на 4 — 1,60 м, на 6 — 2,31, на 8 — 3,02): нитки сжаты / растянуты до 1,7 / 3,1 кН (запас по устойчивости больше 5), брусок в панели у стойки до 5,4 / 9,5 МПа; прогиб середины на 8 — до 10 / 17 мм, на 6 — до 4 / 7, на 4 — до 1 / 2; угловые стойки (три бруска) до 5 / 9 МПа, даже если узел перекладины считать шарниром; анкер до 0,5 / 0,9 кН; шторы сворачивать при ветре сильнее 9 м/с. ' : 'средник на ребро держит вынос створки за спицей: на 4 6,0 / 10,7 МПа; на 8 3,9 / 6,9; на 6 — до 2,0 / 3,5; спица до 215 / 380 Н; средняя стойка на 4 5,5 / 9,7 МПа, на 8 6,6 / 11,7, на 6 до 3,8 / 6,7; анкер до 1,35 кН. ') + 'Край створки: 10 кг на край (опереться рукой, повесить фонарь) — боковина 7,2 МПа; 15 кг — 10,8; держаться и висеть нельзя. Всё в ящик: створки на 4 — 931 / 1074 / 931 × 1000 мм (крышка 1090 × 1020), на 6 — 1521, на 8 — 1757 × 1000 (крышка 2056 / 2106 × 1020); фронтон и накладка конька — кусками по створкам, трубы штор — половинами на внутренней муфте, полотно на зиму сворачивается поперёк; на 4 надставки 1160 и вилки 1210 — по диагонали крышки. Низ створки — два бруска на ребро; палец упора — через стальную пластину на надставке. Дождь (проверка лучами): сухо стол / сиденья — отвесный: 100 / 100 %; с ветром 15°: без штор 100 / 70 %, со шторами 100 / 99 %; сильный косой 30°: без штор 84 / 50 %, с опущенными шторами 99–100 / 99 % (торцы закрыты фронтонами). Сильнее 15 м/с — створки снять с петель (≈5 мин).' : ''),
    (SHOW.pnT || SHOW.glass ? (SHOW.pnT ? 'Накладка на стол — ' + pl(lightXs(c.set).length + 1, 'панель', 'панели', 'панелей') + ' от стойки света до стойки, на концах пазы 120 × 140 под вилку; ' + (v.lt ? 'пазы открыты — стоит свет. ' : 'света нет — пазы закрыты вставками из того же материала (свет можно докупить позже, панели те же). ') : '') + (SHOW.glass ? 'Гибкое стекло — один лист' + (v.lt ? ', в нём отверстия под стойки и от каждого разрез к длинному краю: лист надевается и снимается сбоку, свет разбирать не нужно.' : '; с заказом света в нём вырезаются отверстия с разрезом к краю (ножом по шаблону).') : '') : ''),
    (v.lt ? 'Разборка на зиму (≈10–15 мин): 1) выключить питание, снять блок; 2) открутить барашки конька (по 2 на стойку), разъединить разъёмы ленты, снять конёк кусками — вместе с профилем; 3) открутить барашки вилок (по 4 на стойку) и вытянуть бруски вверх через вырезы — столешница на месте; 4) дальше как обычно: секции столешницы справа налево, всё в ящик. Весной — в обратном порядке. Столешницу со светом не снять — сначала свет.' : ''),
    'Торцы — заглушки или уголок. Галочками сверху можно убрать столешницу и сиденья.']; };
INFO.NN4 = () => sumLinesNew(slideV(2, [], [], { set: 'T4', lift: false, seats: true }));
INFO.NN6 = () => sumLinesNew(slideV(2, [], [], { set: 'T6', lift: false, seats: true }));
INFO.NN8 = () => sumLinesNew(slideV(2, [], [], { set: 'T8', lift: false, seats: true }));
INFO.V2 = () => { const v = slideV(true), q = v.q, free = Math.round(M5 + W / 2 - q.lo / 2);
  return ['Стол на 8: В2 — стойка с узким низом (ступенькой)',
    'Стол ' + v.Lt + ' × 944 × 740 мм, скамьи не показаны, столешница поднята. Низ стойки (до 510 мм) — ' + Math.round(q.lo) + ' мм шириной: колонны ±25 и ±' + Math.round(q.c1) + '. С каждой стороны стола под стойкой свободно ' + free + ' мм — ступням можно встать под неё.',
    'Верх (510–660 мм, выше колен) — на всю глубину 944: добавлены колонны ±' + Math.round(Z0 + 2 * q.st) + ' и ±447 на коротких стержнях, на них лежат крайние балки. Все колонны через ' + Math.round(q.st) + ' мм — ритм ровный.',
    'Нагрузка: человек 100 кг оперся на край стола, ×1,5 на рывок (1500 Н) — край держит рама из двух целых брусков (ряды 17 и 21) и колонн: пролёт 141 мм, изгиб ≈ 7 МПа при допуске 12.'].concat(tieLines(v),
    ['Против стойки из 2 частей: стойка ' + (Math.abs(v.dProp) < 30 ? 'стоит столько же (' + (v.dProp > 0 ? '+' : '−') + Math.abs(v.dProp) + ' ₽: нижние бруски короче, втулок больше)' : (v.dProp > 0 ? '+' : '−') + Math.abs(v.dProp) + ' ₽') + ', обвязка +' + v.dTie + ' ₽ (фальш-бруски и шпильки) — на стол ≈ +' + v.dAll + ' ₽ материалов.']); };
/* ---------- конструктор: комплект, режим, цвета, спецификация ---------- */
const CFG = { set: 'T4', mode: 'summer', seats: true };
INFO.CFG = () => {                                   // конструктор: новая линейка (глубина 1020, место для ног 660)
  const set = CFG.set;
  Object.assign(SHOW, { pnS: !!CFG.pnS, pnI: !!CFG.pnI, pnT: !!CFG.pnT, glass: !!CFG.glass, shelf2: !!CFG.shelf2, cover: !!CFG.cover, xIns: !!CFG.xIns, light: !!CFG.light, canopy: !!CFG.canopy });
  if (CFG.mode === 'box' || CFG.mode === 'anim') return winLinesNew(winterNew(set, !CFG.seats));
  return sumLinesNew(slideV(2, [], [], { set, lift: false, seats: !!CFG.seats }));
};
function buildNew(g, set, noSeats) { const keep = root, kc = CANST; root = g; try { return slideV(2, [], [], { set, lift: false, seats: !noSeats }); } finally { root = keep; CANST = kc; } }
function winterNewG(g, set, noSeats) { const keep = root, kc = SHOW.cover, ks = CANST; root = g; SHOW.cover = false; try { return winterNew(set, noSeats); } finally { root = keep; SHOW.cover = kc; CANST = ks; } }
const NWCFG = {}; ['T4', 'T6', 'T8'].forEach(k => Object.defineProperty(NWCFG, k, { get: () => { const c = newCfg(k), Lt = 2 * c.a + c.zone, far = Lt / 2 - Math.max.apply(null, c.props.map(Math.abs));
  return { a: c.a, zone: c.zone, props: c.props, D: 2 * MD3 + W, Lt, nSec: c.props.length + 1 + (far > 1490 ? 2 : 0), cap: k === 'T4' ? { tum: 4, led: 4 } : { tum: 8, led: 8 }, shelfN: Math.floor((c.a - 2 * W + 5) / 55), shelfL: MD3 - Z0 }; } }));
/* ---------- торцы: без заглушек не продаётся (правило владельца 29.09.2026) ----------
   Каждый торец полого отрезка лаги (брусок, балка, доска, втулка) закрыт: заглушкой, уголком или вплотную (0,8–2 мм)
   другой непрозрачной деталью по всему сечению. Остальным торцам ставится заглушка 2 мм — дочерняя деталь отрезка:
   едет с ним во всех позах и анимациях и считается в цене (bom). Втулка 50×50 в плане ставится так, чтобы открытых
   торцов было меньше. Вставки, стекло, поликарбонат, накладки, чехол торец не закрывают (докупаются отдельно).
   Торец, из которого выходит лист (вставка, поликарбонат, ПВХ), обычной заглушкой не закрыть; так же — торец, на месте
   заглушки у которого стоит другая деталь (гайка шпильки, край соседнего бруска). Такие торцы остаются открытыми и
   считаются отдельно (userData.openEnds: why — 'лист' или 'деталь') — как их закрывать, решает владелец. */
function lagDims(o) {
  if (!o.isMesh || !o.geometry || o.geometry.type !== 'BoxGeometry' || [M.bar, M.bar2, M.top, M.filler, M.tie, M.line].indexOf(o.material) < 0) return null;
  const p = o.geometry.parameters, dm = [p.width, p.height, p.depth], s = dm.slice().sort((a, b) => a - b);
  if (!(s[0] >= 20 && s[0] <= 32 && s[1] >= 40 && s[1] <= 52)) return null;
  return { dm, ax: s[2] > 52.5 ? [dm.indexOf(s[2])] : [0, 1, 2].filter(i => dm[i] >= 40) };
}
/* сетка 120 мм по габаритам деталей: поиск соседей торца без перебора всей сцены */
function endGrid() {
  const G = 120, m = new Map(), f = v => Math.floor(v / G);
  return {
    add(e) { const b = e.wb; if (b.isEmpty()) return;
      for (let i = f(b.min.x); i <= f(b.max.x); i++) for (let j = f(b.min.y); j <= f(b.max.y); j++) for (let k = f(b.min.z); k <= f(b.max.z); k++) {
        const key = i + ',' + j + ',' + k; let a = m.get(key); if (!a) m.set(key, a = []); a.push(e); } },
    near(b) { const out = new Set();
      for (let i = f(b.min.x); i <= f(b.max.x); i++) for (let j = f(b.min.y); j <= f(b.max.y); j++) for (let k = f(b.min.z); k <= f(b.max.z); k++) {
        const a = m.get(i + ',' + j + ',' + k); if (a) a.forEach(e => { if (e.wb.intersectsBox(b)) out.add(e); }); }
      return [...out]; }
  };
}
/* лист-многоугольник (поликарбонат фронтона — треугольники в плоскости, толщина 4 мм): точка внутри, если она у плоскости
   треугольника не дальше tol и внутри него в плоскости (с запасом 0,35 мм) — точнее, чем по габаритной коробке */
function trisOf(gm) {
  const a = gm.attributes.position, out = [];
  for (let i = 0; i + 2 < a.count; i += 3) { const v = [0, 1, 2].map(k => new THREE.Vector3(a.getX(i + k), a.getY(i + k), a.getZ(i + k)));
    const n = new THREE.Vector3().subVectors(v[1], v[0]).cross(new THREE.Vector3().subVectors(v[2], v[0])); if (n.lengthSq() < 1e-6) continue; out.push({ v, n: n.normalize() }); }
  return out;
}
function triIn(tris, p, tol) {
  const e = new THREE.Vector3(), w = new THREE.Vector3(), c = new THREE.Vector3();
  return tris.some(({ v, n }) => { const d = w.subVectors(p, v[0]).dot(n); if (Math.abs(d) > tol) return false;
    for (let k = 0; k < 3; k++) { const a = v[k], b = v[(k + 1) % 3]; e.subVectors(b, a); w.subVectors(p, a); c.crossVectors(e, w); if (c.dot(n) < -0.35 * e.length()) return false; }
    return true; });
}
/* ящик на зиму (30.09.2026): узлы (тумба, стойка, табурет, секция столешницы) сложены вплотную, но заглушки — постоянные, едут с деталью.
   В сложенной сцене торец закрывает только деталь своего узла; чужой узел рядом торец не «закрывает» — заглушка стоит, как летом. */
function tagUnit(g, from, id) { g.children.slice(from).forEach(o => { o.userData.unit = id; }); }
function closeEnds(g) {
  if (g.userData.endsClosed) return;
  g.updateMatrixWorld(true);
  const packed = !!g.userData.packed, unitOf = o => { let q = o; while (q.parent && q.parent !== g) q = q.parent; return q.userData.unit || q; };
  const notCover = [M.sheet, M.pc, M.pvc, M.glass, M.cover, M.person, M.led, M.panel, M.ghost], sheetM = [M.sheet, M.pc, M.pvc], lag = [], cov = endGrid(), hard = endGrid(), sh = endGrid(), ghost = endGrid();
  const entry = (o, e) => { const gm = o.geometry; if (!gm.boundingBox) gm.computeBoundingBox(); const bb = gm.boundingBox.clone().expandByScalar(e + (gm.type === 'BufferGeometry' ? 2 : 0));
    const cy = gm.type === 'CylinderGeometry' ? { r: Math.max(gm.parameters.radiusTop, gm.parameters.radiusBottom) + e, h: gm.parameters.height / 2 + e } : null;   // цилиндр — по радиусу, не по коробке
    return { o, bb, wb: bb.isEmpty() ? bb.clone() : bb.clone().applyMatrix4(o.matrixWorld), inv: new THREE.Matrix4().copy(o.matrixWorld).invert(), tri: gm.type === 'BufferGeometry' ? trisOf(gm) : null, tol: 2 + e, cy, u: packed ? unitOf(o) : null }; };
  g.traverse(o => {
    if (!o.isMesh || !o.geometry) return;
    const L = lagDims(o); if (L && !o.userData.endsDone) lag.push({ o, L });
    const m = o.material; if (!m || Array.isArray(m)) return;
    if (sheetM.indexOf(m) >= 0) { sh.add(entry(o, 0.35)); hard.add(entry(o, -0.4)); }
    if (m === M.ghost || m === M.sheet) ghost.add(entry(o, 0.35));      // место под вставку — есть ли вставка или нет
    if (notCover.indexOf(m) >= 0 || (m.transparent && m.opacity < 0.9) || o.geometry.type === 'PlaneGeometry') return;
    cov.add(entry(o, 0.35)); hard.add(entry(o, -0.4));
  });
  const q = new THREE.Vector3(), p = new THREE.Vector3(), reg = new THREE.Box3();
  const hitOf = (list, pt, self, u) => { for (const c of list) { if (c.o === self || (u && c.u !== u) || !c.wb.containsPoint(pt)) continue; q.copy(pt).applyMatrix4(c.inv); if (c.bb.containsPoint(q) && (!c.tri || triIn(c.tri, q, c.tol)) && (!c.cy || (Math.abs(q.y) <= c.cy.h && q.x * q.x + q.z * q.z <= c.cy.r * c.cy.r))) return c.o; } return null; };
  const at = (o, ax, s, t, u, v, dm) => { const a1 = (ax + 1) % 3, a2 = (ax + 2) % 3; p.set(0, 0, 0);
    p.setComponent(ax, s * (dm[ax] / 2 + t)); p.setComponent(a1, u * dm[a1] / 2); p.setComponent(a2, v * dm[a2] / 2); return p.applyMatrix4(o.matrixWorld); };
  const region = (o, ax, s, t0, t1, dm) => { reg.makeEmpty(); [t0, t1].forEach(t => [-1, 1].forEach(u => [-1, 1].forEach(v => reg.expandByPoint(at(o, ax, s, t, u, v, dm))))); return reg; };   // слой перед торцом (или за ним) в мировых осях
  const SMP = [[0, 0], [0.68, 0.68], [0.68, -0.68], [-0.68, 0.68], [-0.68, -0.68]];
  const closed = (o, ax, s, dm) => { const nb = cov.near(region(o, ax, s, 0.5, 2.3, dm)); if (!nb.length) return false;
    const un = packed ? unitOf(o) : null; return [0.8, 2].some(t => SMP.every(([u, v]) => hitOf(nb, at(o, ax, s, t, u, v, dm), o, un))); };
  const through = (o, ax, s, dm, grid) => { const nb = (grid || sh).near(region(o, ax, s, -1.2, -0.8, dm)); if (!nb.length) return false;
    const un = packed ? unitOf(o) : null; for (let u = -0.95; u <= 0.95; u += 0.02) for (const v of [-0.5, 0, 0.5]) if (hitOf(nb, at(o, ax, s, -1, u, v, dm), null, un)) return true; return false; };
  const taken = (o, ax, s, dm) => { const nb = hard.near(region(o, ax, s, 0.3, 1.7, dm)); if (!nb.length) return '';   // место заглушки занято: листом или другой деталью
    const un = packed ? unitOf(o) : null; for (const t of [0.4, 1.6]) for (let u = -0.9; u < 0.95; u += 0.3) for (let v = -0.9; v < 0.95; v += 0.3) { const h = hitOf(nb, at(o, ax, s, t, u, v, dm), o, un); if (h) return sheetM.indexOf(h.material) >= 0 ? 'лист' : 'деталь'; } return ''; };
  lag.forEach(({ o, L }) => {
    let best = null;
    /* втулка, сквозь которую проходит лист (или место под вставку), стоит пазом вдоль листа — ось вдоль стенки, лист выходит из её торцов;
       остальные втулки ставим так, чтобы торцов без заглушки (чужая деталь) не было, а открытых — меньше */
    const inSheet = L.ax.length > 1 ? L.ax.filter(ax => [-1, 1].some(s => through(o, ax, s, L.dm, ghost))) : [];
    (inSheet.length ? inSheet : L.ax).forEach(ax => {
      const open = [-1, 1].filter(s => !closed(o, ax, s, L.dm)).map(s => ({ s, why: through(o, ax, s, L.dm) ? 'лист' : taken(o, ax, s, L.dm), place: inSheet.length > 0 && through(o, ax, s, L.dm, ghost) }));
      const cost = open.length + 10 * open.filter(e => e.why).length; if (!best || cost < best.cost) best = { ax, open, cost }; });
    o.userData.axis = best.ax; o.userData.endsDone = true;
    best.open.forEach(({ s, why, place }) => {
      if (place && !why) (o.userData.slotIfSheet = o.userData.slotIfSheet || []).push(s);   // со вставкой здесь выйдет лист — заглушку придётся вынуть
      if (why) { (o.userData.openEnds = o.userData.openEnds || []).push({ s, why }); return; }
      const sz = L.dm.map((d, i) => i === best.ax ? 2 : d - 2), pl = new THREE.Mesh(new THREE.BoxGeometry(sz[0], sz[1], sz[2]), M.plug);
      pl.position.setComponent(best.ax, s * (L.dm[best.ax] / 2 + 1)); pl.castShadow = true; pl.receiveShadow = true; pl.userData.endPlug = true;
      o.add(pl); pl.updateMatrixWorld(true); cov.add(entry(pl, 0.35)); hard.add(entry(pl, -0.4));
    });
  });
  g.userData.endsClosed = true;
}
function bom(g, skip) {                            // спецификация сцены (или группы): отрезки лаги по цвету, листы, стержни, заглушки, уголок; skip — позиции, которые не считать ('light', 'canopy')
  const r = g || root; closeEnds(r); r.updateMatrixWorld(true);
  const out = { lag: { body: [], top: [] }, sheets: [], rods: [], pins: 0, plugs: 0, trimMM: 0, sleeves: 0, studs: 0 };
  const skipped = o => skip && skip.indexOf(o.userData.item || (o.parent && o.parent.userData.item)) >= 0;
  r.traverse(o => { if (!o.isMesh || !o.geometry.parameters || skipped(o)) return; const m = o.material, pr = o.geometry.parameters;   // треугольники фронтона (без размеров) — считаются площадью навеса
    if (o.geometry.type === 'CylinderGeometry') { if (m === M.steel && pr.radiusTop === 6 && pr.height >= 100) out.studs++; if (m === M.rod) { if (Math.round(pr.height) === 25) out.pins++; else out.rods.push(Math.round(pr.height)); } return; }
    const d = [pr.width, pr.height, pr.depth].sort((a, b) => a - b);
    if (m === M.sheet) { out.sheets.push(d[1] * d[2] / 1e6); return; }
    if (m === M.plug) { out.plugs++; return; }
    if (m === M.trim) { out.trimMM += d[2]; return; }
    if ((m === M.bar || m === M.bar2 || m === M.top || m === M.filler || m === M.tie) && d[0] >= 20 && d[1] >= 40) {
      const L = Math.round(d[2]); if (L <= 52) out.sleeves++;
      out.lag[m === M.top ? 'top' : 'body'].push(L); } });
  out.slotEnds = 0; out.blockedEnds = 0; out.slotIfSheet = 0;   // торцы, которые обычной заглушкой не закрыть (лист / другая деталь) — в цену не идут, решает владелец; slotIfSheet — закрыты, пока вставка не докуплена
  r.traverse(o => { if (skipped(o)) return; (o.userData.openEnds || []).forEach(e => { if (e.why === 'лист') out.slotEnds++; else out.blockedEnds++; }); out.slotIfSheet += (o.userData.slotIfSheet || []).length; });
  return out;
}
function paint(o) {                                 // цвета: бруски, столешница и сиденья, заглушки, уголок, вставки
  const c = (hex, k) => { const col = new THREE.Color(hex); if (k) col.multiplyScalar(k); return col; };
  if (o.body) { M.bar.color.copy(c(o.body)); M.bar2.color.copy(c(o.body, 1.12)); M.filler.color.copy(c(o.body, 1.25)); }
  if (o.top) M.top.color.copy(c(o.top));
  if (o.plug) M.plug.color.copy(c(o.plug));
  if (o.trim) M.trim.color.copy(c(o.trim));
  if (o.sheet) { M.sheet.color.copy(c(o.sheet)); M.sheet.transparent = !!o.sheetClear; M.sheet.opacity = o.sheetClear ? 0.45 : 1; M.sheet.needsUpdate = true; }
}
function fitView(k) {                               // камера по габариту сцены
  const b = new THREE.Box3().setFromObject(root), sz = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3());
  const R = Math.max(sz.x, sz.z, 1500) * (k || 1);
  camera.position.set(c.x + R * 0.6, Math.max(1400, R * 0.7), c.z + R * 1.2); controls.target.set(c.x, 380, c.z); controls.update();
}
INFO.TOP = () => { const W = WCFG.T4, r = tableLR(root, W.zone, W.props, 'lift', M5, { a: W.a, full: true, split: 1490 });
  return ['Как устроен стол: столешница из секций',
    'Секция — рамка по длинным кромкам, доски поперёк и три свои балки снизу; рамка стянута с крайними балками саморезами через 150 мм (край стола держит человека 100 кг). Правая секция показана снятой.',
    'У тумбы балки секции надеты на её стержни. На стойке все три балки надевает левая секция, правая начинается над стойкой: её первая доска и рамка лежат на концах балок левой. Кладут слева направо, снимают справа налево.',
    'Стол на 4 — 2 секции, на 6 — 5, на 8 — 6 (над широкими тумбами — своя секция). Самая длинная деталь — ' + Math.round(r.longest) + ' мм: весь стол едет посылками.',
    'Стойка — бруски через 120 мм, колонны у стержней; зимой — средняя стенка ящика.'];
};

const VIEWS = { NN4: [1700, 1600, 2900], NN6: [2300, 1900, 3800], NN8: [2900, 2200, 4700], NW4: [1400, 1500, 2300], NW6: [1900, 1800, 3000], NW8: [1900, 1800, 3000], K4: [1500, 1500, 2300], V1: [1500, 1900, 2900], V2: [1500, 1900, 2900], V3: [1500, 1900, 2900], V3W: [1500, 1700, 2600], TIE4: [900, 420, 2300], TIE8: [1500, 600, 3600], N4: [1800, 1600, 3100], N6: [2400, 1900, 3900], N8: [2900, 2200, 4600], TOP: [1700, 2000, 2700], W4: [2000, 2000, 3600], W6: [2600, 2300, 4600], W8A: [3000, 2600, 5200], WBX: [300, 4200, 6400], PNL: [1800, 1700, 3000] };
let cur = 'T2', anim = null;
function show0(k) { anim = null; }
function applyVis() {                             // переключатели «столешница» и «сиденья» — только показ, модель не меняется
  if (!root) return;
  root.traverse(o => { const p = o.userData && o.userData.part; if (p === 'top') o.visible = !SHOW.hideTop; if (p === 'seat') o.visible = !SHOW.hideSeats; });
  root.traverse(o => { if (o.isMesh && o.material === M.glass) o.visible = !SHOW.hideTop; });
  const skin = [M.top, M.pc, M.sheet, M.glass, M.panel, M.pvc, M.cover, M.alu, M.led, M.plug, M.trim, M.person];   // «только каркас»: прячем всё, кроме брусков и крепежа
  root.traverse(o => { if (!o.isMesh || skin.indexOf(o.material) < 0) return; if (SHOW.frame) o.visible = false; else if (o.material !== M.glass && !(o.userData.part === 'top' && SHOW.hideTop)) o.visible = true; });
  root.traverse(o => { if (o.isMesh && o.userData.slope && (o.material === M.tie || (o.material === M.steel && o.geometry.type === 'CylinderGeometry' && [10, 30].indexOf(o.geometry.parameters.radiusTop) >= 0))) o.visible = !SHOW.frame; });   // ремни, грузы и муфты штор
}
function applyNight() {                           // ночь: небо и солнце гаснут, горит только свет над столом
  const n = !!SHOW.night;
  scene.background.set(n ? '#070b14' : '#dfe7e2'); hemi.intensity = n ? 0.07 : 0.75; hemi.color.set(n ? '#6d7fa8' : '#ffffff');
  sun.intensity = n ? 0.05 : 0.95; sun.color.set(n ? '#8fa6ff' : '#fff7ea'); grid.visible = !n;
  M.led.emissiveIntensity = n ? 2.6 : 1.1;
  if (root) root.traverse(o => { if (o.userData && o.userData.led === 'spot') { o.intensity = n ? 2.4 : 0.4; o.castShadow = n; } if (o.userData && o.userData.led === 'point') o.intensity = n ? 0.55 : 0.2; });
}
function topView() { const t = controls.target; camera.position.set(t.x, Math.max(3500, camera.position.distanceTo(t) * 1.1), t.z + 1); controls.update(); }
function show(k) {
  show0(k);
  cur = k;
  if (root) { scene.remove(root); root.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
  root = new THREE.Group(); scene.add(root);
  const t = INFO[k]();
  closeEnds(root);                                 // без заглушек не продаётся: открытые торцы закрываются до показа
  applyVis(); applyNight(); SHOW.roofFold = false; if (CANST && SHOW.shDown) setCanopyAngle(CAN.close, 1); if (!CANST) canDemo = false; if (typeof canBar === 'function') canBar();
  const inf = document.getElementById('info'); if (inf) inf.innerHTML = t.slice(1).map(s => '<p>' + s + '</p>').join('');
  document.querySelectorAll('[data-v]').forEach(b => b.classList.toggle('on', b.dataset.v === k));
}
function view(k) { const v = VIEWS[k]; camera.position.set(v[0], v[1], v[2]); controls.target.set(0, 380, 0); controls.update(); }
document.querySelectorAll('[data-v]').forEach(b => b.onclick = () => { show(b.dataset.v); view(b.dataset.v); });
const shEl = document.getElementById('sheets'); if (shEl) shEl.onchange = e => { SHOW.sheets = e.target.checked; show(cur); };
const endsSel = document.getElementById('ends'); if (endsSel) endsSel.onchange = e => { SHOW.ends = e.target.value; show(cur); };
const vT = document.getElementById('showTop'); if (vT) vT.onchange = e => { SHOW.hideTop = !e.target.checked; applyVis(); };
const vS = document.getElementById('showSeats'); if (vS) vS.onchange = e => { SHOW.hideSeats = !e.target.checked; applyVis(); };
const vU = document.getElementById('topViewBtn'); if (vU) vU.onclick = topView;
const sh2 = document.getElementById('shelf2'); if (sh2) sh2.onchange = e => { SHOW.shelf2 = e.target.checked; show(cur); };
[['pnTc', ['pnT']], ['pnSc', ['pnS', 'pnI']], ['glassc', ['glass']]].forEach(([id, ks]) => { const el = document.getElementById(id); if (el) el.onchange = e => { ks.forEach(k => { SHOW[k] = e.target.checked; }); show(cur); }; });
const sdc = document.getElementById('shDownc'); if (sdc) sdc.onchange = e => animateShutters(e.target.checked);
const rfc = document.getElementById('roofFoldc'); if (rfc) rfc.onchange = e => animateRoof(e.target.checked);
// открывание крыши убрано (27.09.2026): крыша неподвижная, двигаются только шторки
const cnc = document.getElementById('canopyc'); if (cnc) cnc.onchange = e => { SHOW.canopy = e.target.checked; show(cur); };
const ppc = document.getElementById('peoplec'); if (ppc) ppc.onchange = e => { SHOW.people = e.target.checked; show(cur); };
const frc = document.getElementById('frameC'); if (frc) frc.onchange = e => { SHOW.frame = e.target.checked; applyVis(); };
const pdc = document.getElementById('postDeco'); if (pdc) pdc.onchange = e => { SHOW.postDeco = e.target.value; show(cur); };
const pse = document.getElementById('postEnd'); if (pse) pse.onchange = e => { SHOW.postEnd = e.target.checked; show(cur); };
const csc = document.getElementById('curtSideC'); if (csc) csc.onchange = e => { SHOW.curtSide = e.target.checked; show(cur); };
const cec = document.getElementById('curtEndC'); if (cec) cec.onchange = e => { SHOW.curtEnd = e.target.checked; show(cur); };
const pss = document.getElementById('postSide'); if (pss) pss.onchange = e => { SHOW.postSide = e.target.checked; show(cur); };
const nic = document.getElementById('nightc'); if (nic) nic.onchange = e => { SHOW.night = e.target.checked; applyNight(); };
const lic = document.getElementById('lightc'); if (lic) lic.onchange = e => { SHOW.light = e.target.checked; show(cur); };
const xic = document.getElementById('xInsc'); if (xic) xic.onchange = e => { SHOW.xIns = e.target.checked; show(cur); };
const cvc = document.getElementById('coverc'); if (cvc) cvc.onchange = e => { SHOW.cover = e.target.checked; show(cur); };
const PANEL_COL = [['песок', '#cfc6b4'], ['светлый камень', '#d9d6cf'], ['слоновая кость', '#e8e0cc'], ['шалфей', '#a9b7a1'], ['серый камень', '#9c9a94'], ['дуб светлый', '#b8a07c']];
const LAG_COL = [['чёрная', '#232427'], ['венге', '#4a3326'], ['орех', '#6b4a32'], ['дуб', '#9a7550'], ['ясень', '#b89c78'], ['графит', '#4b4e52'], ['серый дым', '#8a8c88'], ['шоколад', '#3e2a21']];
const pnSel = document.getElementById('pnCol'); if (pnSel) { pnSel.innerHTML = PANEL_COL.map((c, i) => '<option value="' + i + '">' + c[0] + '</option>').join(''); pnSel.onchange = e => M.panel.color.set(PANEL_COL[+e.target.value][1]); }
const lagSel = document.getElementById('lagCol'); if (lagSel) { lagSel.innerHTML = '<option value="-1">как на фото</option>' + LAG_COL.map((c, i) => '<option value="' + i + '">' + c[0] + '</option>').join('');
  const base = { bar: M.bar.color.clone(), bar2: M.bar2.color.clone(), filler: M.filler.color.clone(), top: M.top.color.clone() };
  lagSel.onchange = e => { const i = +e.target.value; if (i < 0) { M.bar.color.copy(base.bar); M.bar2.color.copy(base.bar2); M.filler.color.copy(base.filler); M.top.color.copy(base.top); } else paint({ body: LAG_COL[i][1], top: LAG_COL[i][1] }); }; }
/* панель описания справа — сцену сдвигаем влево, чтобы окно не закрывало модель */
function resize() { const w = canvas.clientWidth, h = canvas.clientHeight, off = window.__furnOffset, pw = off ? (w > 900 ? off() : 0) : 0;
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.setViewOffset(w, h, pw / 2, 0, w, h); camera.updateProjectionMatrix(); }
window.addEventListener('resize', resize);
resize(); if (!window.__furnNoStart) { show('N4'); view('N4'); }
(function loop() { requestAnimationFrame(loop); if (anim) anim(performance.now() / 1000); controls.update(); renderer.render(scene, camera); })();
window.__furn = { show, view, resize, scene, root: () => root, THREE, getAnim: () => anim, CFG, SHOW, M, bom, closeEnds, paint, fitView, applyVis, topView, L3, buildNew, winterNewG, NWCFG, lightParts, canopyParts, rainCheck, animateCanopy, animateRoof, animateShutters, setCanopyAngle, CAN, WCFG, camera, controls, buildSet, seatTumba, insertPart, ledge, M4, L4, W, HB, winterPoses, setPose, coverMesh };
})();
