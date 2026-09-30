/* P-02 · расчётное ядро, редакция 1.2. Единицы: мм, Н, МПа, кг, ₽.
   Длина бруска выводится из раскроя хлыста, а не задаётся.
   Экранирующий расчёт для прототипа. НЕ паспорт несущей способности. */
(function (root) {
'use strict';

const KERF = 3;   // пропил, мм

/* ---------- 1. Профили ------------------------------------------------
   kgm — кг на погонный метр. price_m — ₽/п.м из открытых прайсов, проверить у поставщика.
   26.09.2026: артикул ДекМастера 50×30 — берём его.
   30.09.2026 (решение владельца): 363 ₽ — цена за ПОГОННЫЙ МЕТР, а не за хлыст 4 м (подтвердил дилер torgsp.ru:
   «363 ₽ за 1 м.п., 1 089 ₽ за 3 м»). Хлыст 4 м = 1 452 ₽. Раньше в расчёте было 90,75 ₽/м — в 4 раза дешевле.
   Внутреннее устройство 50×30 не опубликовано: принято как у 50×35 (две полости, центральный канал,
   стенки 4 мм), полости 16×22. Чертёж или фото торца запросить у ДекМастера. */
const PROFILES = {
  dpk50x30: { id:'dpk50x30', name:'ДПК лага 50×30 — ДекМастер', w:50, h:30, wall:4,
    price_m:363, stocks:[4000], kgm:1.00, E:3000, cavities:2,
    uv:'да', frost:'да', ground:'да', texture:'дерево',
    cut_min:0.4, drill_min:0.7, slot_min:0.6, repaint:false,
    src:'dpk-decking.ru/laga-dpk-50x30x4000 — 363 ₽ за погонный метр (дилер torgsp.ru: 363 ₽ за 1 м.п., 1 089 ₽ за 3 м), хлыст 4 м — 1 452 ₽; масса ≈1 кг/п.м по сечению; цвет на карточке не указан' },
  dpk50x35: { id:'dpk50x35', name:'ДПК лага 50×35 — Terrapol', w:50, h:35, wall:4,
    price_m:439, stocks:[4000], kgm:1.10, E:3000, cavities:2,
    uv:'да', frost:'да', ground:'да', texture:'дерево',
    cut_min:0.4, drill_min:0.7, slot_min:0.6, repaint:false,
    src:'dpk-nsk.ru — лага монтажная 4000×50×35 Terrapol, 439 ₽/п.м' },

  dpk50x40: { id:'dpk50x40', name:'ДПК лага 50×40 полая', w:50, h:40, wall:4,
    price_m:215, stocks:[4000,6000], kgm:1.22, E:3000, cavities:2,
    uv:'да', frost:'да', ground:'да', texture:'дерево',
    cut_min:0.4, drill_min:0.7, slot_min:0.6, repaint:false,
    src:'оценка по линейке ДПК; уточнить' },

  pvc_u: { id:'pvc_u', name:'П-профиль ПВХ 50×40', w:50, h:40, wall:2.5,
    price_m:64, stocks:[3000,6000], kgm:0.60, E:2700, cavities:1,
    uv:'уточнить', frost:'да', ground:'да', texture:'любой RAL и древесные декоры',
    cut_min:0.35, drill_min:0.6, slot_min:0, repaint:true,
    src:'zabor.bz Уфа — П-образный профиль от 64 ₽/п.м' },

  pvc_kk: { id:'pvc_kk', name:'Кабель-канал ПВХ 60×40 с крышкой', w:60, h:40, wall:2,
    price_m:74, stocks:[2000], kgm:0.55, E:2700, cavities:1,
    uv:'НЕТ', frost:'да', ground:'нет', texture:'белый',
    cut_min:0.3, drill_min:0.6, slot_min:0, repaint:true,
    src:'shop220/tinko — 40×25 ≈127 ₽/2 м' },

  alu40x30: { id:'alu40x30', name:'Алюминиевый профиль 40×30', w:40, h:30, wall:2,
    price_m:420, stocks:[6000], kgm:0.70, E:70000, cavities:1,
    uv:'да', frost:'да', ground:'да', texture:'порошковая окраска, любой RAL',
    cut_min:0.6, drill_min:0.8, slot_min:1.2, repaint:true,
    src:'ориентир; уточнить у поставщика' },

  eps_p01: { id:'eps_p01', name:'Армированный EPS — как в P-01', w:46, h:36, wall:3,
    price_bar:214.13, hand_min:15, stocks:[452], kgm:1.03, E:null, cavities:0,
    uv:'да', frost:'не подтв.', ground:'не подтв.', texture:'окрашивается в любой цвет',
    cut_min:0, drill_min:0, slot_min:0, repaint:true,
    src:'Specification.csv P-01: материалы 5995,53 ₽ на 28 брусков' }
};

/* ---------- 2. Вставки ------------------------------------------------ */
const PANELS = {
  pc4m: { id:'pc4m', name:'Сотовый ПК 4 мм молочный', t:4, price_sheet:3300,
          sheet:[2100,6000], kgm2:0.8, shade:60, E:2300, I:2.0, W:1.0, sAllow:15 },
  pc4:  { id:'pc4',  name:'Сотовый ПК 4 мм прозрачный', t:4, price_sheet:3300,
          sheet:[2100,6000], kgm2:0.8, shade:0, E:2300, I:2.0, W:1.0, sAllow:15 },
  acr3: { id:'acr3', name:'Акрил цветной 3 мм', t:3, price_sheet:7503,
          sheet:[2050,3050], kgm2:3.5, shade:100, E:3200, I:2.25, W:1.5, sAllow:10, iso:true },
  dpk8: { id:'dpk8', name:'ДПК-планка 8 мм в тон бруску', t:8, price_sheet:2400,
          sheet:[1000,2000], kgm2:9.0, shade:100, E:3000, I:42.7, W:10.7, sAllow:8, iso:true },
  none: { id:'none', name:'Без листа — только бруски', t:0, price_sheet:0,
          sheet:[1000,1000], kgm2:0, shade:0, E:1, I:1, W:1, sAllow:1 }
};
/* Жёсткость листа на полосу 1 мм, каналы вертикально — вдоль пролёта между брусками.
   Сотовый ПК 4 мм, 0,8 кг/м²: две стенки ≈0,28 мм на расстоянии 3,7 мм → I ≈ 2 мм⁴/мм.
   Допустимое 15 МПа — ниже местной потери устойчивости тонкой стенки (≈19 МПа).
   Акрил 3 мм и ДПК 8 мм — сплошные. Это оценка для прототипа, не паспорт листа. */

/* ---------- 3. Типоразмеры от раскроя ---------------------------------
   Длина, которая режется без остатка и с 4 м, и с 6 м хлыста. */
const SIZES = {
  s397: { id:'s397', L:397, per4:10, per6:15, name:'400 — компактный' },
  s497: { id:'s497', L:497, per4:8,  per6:12, name:'500 — базовый' },
  s664: { id:'s664', L:664, per4:6,  per6:9,  name:'660 — крупный' }
};

/* ---------- 4. Формы ---------------------------------------------------
   Квадрат и чётные многогранники — один корпус: каждая грань — брусок между двумя
   стержнями, соседние грани на соседних уровнях.
   Составные формы (прямоугольники, Г, П, Т, Ш, Н) — НАБОР ЦЕЛЫХ КВАДРАТОВ, поставленных
   вплотную. Одним корпусом их не собрать: прямая стенка из двух коротких брусков
   держится посередине на одном стержне и складывается, как на шарнире, — от грунта
   или от толчка. Квадрат такого узла не имеет. Ячейки: x — вправо, y — от зрителя,
   чтобы сверху форма читалась как буква.
   Сквозные длинные бруски — только индивидуальный заказ (форма 'cust'). */
const SHAPES = {
  sq:  { id:'sq',  name:'Квадрат',             kind:'grid', cells:[[0,0]] },
  sqR: { id:'sqR', name:'Квадрат, повёрнут на 90°', kind:'grid', cells:[[0,0]], rot:1, hidden:true },   // опора линии: стенки поперёк линии — чётные уровни
  r21: { id:'r21', name:'Прямоугольник 2×1',   kind:'grid', cells:[[0,0],[1,0]] },
  r31: { id:'r31', name:'Прямоугольник 3×1',   kind:'grid', cells:[[0,0],[1,0],[2,0]] },
  r22: { id:'r22', name:'Квадрат 2×2',         kind:'grid', cells:[[0,0],[1,0],[0,1],[1,1]] },
  L3:  { id:'L3',  name:'Г-образная',          kind:'grid', cells:[[0,0],[0,1],[1,1]] },
  U5:  { id:'U5',  name:'П-образная',          kind:'grid', cells:[[0,0],[2,0],[0,1],[1,1],[2,1]] },
  T5:  { id:'T5',  name:'Т-образная',          kind:'grid', cells:[[1,0],[1,1],[0,2],[1,2],[2,2]] },
  W8:  { id:'W8',  name:'Ш-образная',          kind:'grid', cells:[[0,0],[1,0],[2,0],[3,0],[4,0],[0,1],[2,1],[4,1]] },
  H7:  { id:'H7',  name:'Н-образная',          kind:'grid', cells:[[0,0],[0,1],[0,2],[1,1],[2,0],[2,1],[2,2]] },
  X5:  { id:'X5',  name:'Крест',               kind:'grid', cells:[[1,0],[0,1],[1,1],[2,1],[1,2]] },
  S4:  { id:'S4',  name:'Ступенька',           kind:'grid', cells:[[0,0],[1,0],[1,1],[2,1]] },
  LS5: { id:'LS5', name:'Лесенка',             kind:'grid', cells:[[0,0],[1,0],[1,1],[2,1],[2,2]] },
  V5:  { id:'V5',  name:'Большой угол',        kind:'grid', cells:[[0,0],[1,0],[2,0],[0,1],[0,2]] },
  r41: { id:'r41', name:'Ряд 4×1',             kind:'grid', cells:[[0,0],[1,0],[2,0],[3,0]], hidden:true },
  r51: { id:'r51', name:'Ряд 5×1',             kind:'grid', cells:[[0,0],[1,0],[2,0],[3,0],[4,0]], hidden:true },
  O8:  { id:'O8',  name:'Каре 3×3 вокруг дерева', kind:'grid', hole:true,
         cells:[[0,0],[1,0],[2,0],[0,1],[2,1],[0,2],[1,2],[2,2]] },
  AM12:{ id:'AM12',name:'Амфитеатр 4×3',       kind:'grid', cascadeRows:true,
         cells:[[0,0],[1,0],[2,0],[3,0],[0,1],[1,1],[2,1],[3,1],[0,2],[1,2],[2,2],[3,2]],
         note:'единый контур; ряды ступенями по высоте — каскад' },
  line:{ id:'line',name:'Ограждение-линия',    kind:'line' },
  cust:{ id:'cust',name:'Секция под заказ',    kind:'custom' },
  p6:  { id:'p6',  name:'6 граней',            kind:'poly', n:6 },
  p8:  { id:'p8',  name:'8 граней',            kind:'poly', n:8 },
  p10: { id:'p10', name:'10 граней',           kind:'poly', n:10 },
  p12: { id:'p12', name:'12 граней',           kind:'poly', n:12 },
  p14: { id:'p14', name:'14 граней',           kind:'poly', n:14 },
  p16: { id:'p16', name:'16 граней',           kind:'poly', n:16 }
};

/* ---------- 5. Торцы: варианты, цены, все найденные цвета ---------------
   Цены и цвета — открытые каталоги 25.09.2026. */
/* Правило владельца 29.09.2026: без заглушек не продаётся. Каждый видимый торец полого профиля закрыт заглушкой
   или уголком. «Открыто» осталось только для расчёта по запросу (p.allowOpenEnds === true); изделие и цена — всегда закрытые. */
const ENDS = {
  open:  { id:'open',  name:'Торцы открыты — только для расчёта, не продаётся' },
  plugs: { id:'plugs', name:'Заглушки в торцы', price: 13, min: 0.15,
           src:'заглушка для прямоугольной трубы: 20 ₽ за штуку, 12,9 ₽ от 500 шт; для 50×30 в продаже чёрная; ' +
               'посадка на лагу 50×30 с двумя полостями не проверена',
           colors: [
             { name:'Чёрная',     hex:'#16171a', stock:'в наличии' },
             { name:'Серая',      hex:'#7b7f84', stock:'в наличии' },
             { name:'Белая',      hex:'#e9eaea', stock:'в наличии' },
             { name:'Коричневая', hex:'#5a3a27', stock:'под заказ' },
             { name:'Зелёная',    hex:'#2e6b3f', stock:'под заказ' },
             { name:'Синяя',      hex:'#23498c', stock:'под заказ' },
             { name:'Жёлтая',     hex:'#e0b422', stock:'под заказ' },
             { name:'Красная',    hex:'#a8322b', stock:'под заказ' }
           ] },
  trims: { id:'trims', name:'Угловой профиль ДПК', stick: 3000, price_m: 275, kgm: 0.9,
           src:'декоративный угол ДПК 50×50 — 275 ₽/п.м (Русдекинг, terradeck.ru; Grand Line внешний 50×50 — 279 ₽/п.м); уголок 56×56 и 57×57 — 268–320 ₽/п.м',
           colors: [
             { name:'Венге',          hex:'#40291d', stock:'угол 50×50 · 275 ₽/м' },
             { name:'Тик',            hex:'#8a5a36', stock:'угол 50×50 · 275 ₽/м' },
             { name:'Орекс',          hex:'#a07b55', stock:'угол 50×50 · 275 ₽/м' },
             { name:'Серый',          hex:'#7d7f7c', stock:'угол 50×50 · 275 ₽/м' },
             { name:'Чёрный',         hex:'#1e1f22', stock:'угол 50×50 · 275 ₽/м' },
             { name:'Коричневый',     hex:'#5b3d29', stock:'уголок 56×56, 57×57 · 320 ₽/м' },
             { name:'Кофе с молоком', hex:'#a88a6a', stock:'уголок 56×56 · 320 ₽/м' }
           ] }
};

/* ---------- 6. Крышка над корпусом (вместо кольца P-01) ------------------
   Стержни выходят из корпуса прямо вверх — их не гнут — и режутся точно в высоту крышки.
   Крышка: передний и задний брусок с продольным пазом сидят на торцах стержней (отверстие глухое, просверлена только нижняя стенка профиля). В каждом углу саморез
   сверху сквозь брусок в торец стержня — держит крышку от ветра снизу. Летом к брускам
   подвязывают растение. Зимой между ними в пазы ровно вставляют лист — ту же вставку, что в стенках.
   Кольцо из решения убрано; RINGS оставлен пустым для совместимости. */
const RINGS = [{ d: 0, holes: 0, name:'Без кольца' }];
const ROOF_H = [300, 450, 600, 750, 900];
const ROOF_SNOW = 1.5e-3;      // МПа: снеговой район III (Москва), СП 20.13330, без очистки
/* Бруски крышки — отдельная деталь: тот же отрезок лаги, другая обработка (сечение 50×30 принято:
   стенки 4 мм, две полости 16×22, центральный канал 4 мм — сверить с чертежом).
   · Передний и задний (2 шт): глухое отверстие Ø14 снизу на концах — сверло Форстнера с упором глубины 26 мм,
     верхняя стенка 4 мм остаётся, брусок садится на торец стержня; продольный паз под лист на внутренней
     стороне посередине высоты — фреза с упорами, сквозь боковую стенку в полость, заход листа 10 мм,
     паз глухой, до торцов 10 мм не доходит; сверху по канавке — Ø5 под саморез.
   · Боковые (2 шт, только летом): Ø14 не нужно, только Ø5 под саморез.
   · Торцы 4 стержней: засверловка Ø3 на 45 мм по оси под саморез.
   Саморез держит крышку от ветра снизу — нужно всего 3–9 Н на угол; вырыв из торца стеклопластика
   проверить на образце. */
const TRIM60 = { size: '60×60', price_m: 190, stick: 4000, leg: 60,
  src: 'Unionwood — уголок ДПК 60×60×4000 мм, 190 ₽/п.м (unionwood.ru); цвета — под их доску, сверить с цветом лаги' };
const ROOF_SCREWS = [
  { season: 'summer', qty: 4, price: 10, name: 'Саморез нержавеющий 4,5×80 — летом',
    note: 'сквозь боковой и передний брусок в торец стержня: до торца 34 мм, в стержень заходит 46 мм' },
  { season: 'winter', qty: 4, price: 6, name: 'Саморез нержавеющий 4,5×45 — зимой',
    note: 'сквозь брусок с листом в торец стержня: до торца 4 мм, в стержень заходит 41 мм' }
];
const ROOF_OPS_MIN = { slotted: 0.4 + 2 * 0.45 + 1.0 + 2 * 0.2 + 0.2, side: 0.4 + 2 * 0.2 + 0.2, rodEnd: 0.5 };
/* Летом — замкнутая рамка из 4 брусков в два венца (к ней подвязывают растение); зимой боковые
   снимают, остаются передний и задний брусок с пазом, между ними — лист. В комплекте 4 бруска. */
const ROOF_BARS = 4, ROOF_BARS_WINTER = 2;
/* Лист крышки — те же вставки, что в стенках. Лежит ровно в пазах передней и задней пары
   брусков, пролёт между пазами; по длине паз глухой — лист не выползает. */
const ROOF_SHEETS = {
  dpk8: { id:'dpk8', name:'ДПК-планка 8 мм', t:8, E:3000, I:42.7, W:10.7, sAllow:8, kgm2:9.0,
          price_m2: 2400 / 2, src:'та же ДПК-планка, что во вставках' },
  pc4:  { id:'pc4',  name:'Сотовый ПК 4 мм молочный', t:4, E:2300, I:2.0, W:1.0, sAllow:15, kgm2:0.8,
          price_m2: 3300 / 12.6, src:'тот же сотовый поликарбонат, что во вставках' },
  acr3: { id:'acr3', name:'Акрил 3 мм', t:3, E:3200, I:2.25, W:1.5, sAllow:10, kgm2:3.5,
          price_m2: 7503 / 6.2525, src:'тот же акрил, что во вставках' },
  none: { id:'none', name:'Без листа', t:0, E:1, I:1, W:1, sAllow:1, kgm2:0, price_m2:0, src:'зимой остаётся рамка из брусков' }
};
function roofSpec(p, g) {
  const hgt = ROOF_H.indexOf(+p.roof) >= 0 ? +p.roof : 0;
  if (!hgt || !g.square) return { h: 0, rise: 0, winterTilt: false };
  const sk = ROOF_SHEETS[p.roofSheet] ? p.roofSheet : 'dpk8';
  const sh = ROOF_SHEETS[sk], winter = p.season === 'winter';
  const open = g.module - g.w, width = open + 20;                // лист заходит в пазы на 10 мм с каждой стороны
  const len = g.L - 20;                                          // вдоль пазов: паз глухой, 10 мм не доходит до торцов
  const selfP = sh.kgm2 * 9.81e-6, pW = 0.5 * 1.225 * p.wind * p.wind * 1e-6;
  const noSheet = sk === 'none', na = { s: width, sigma: 0, sAllow: 0, defl: 0, limit: 0, freq: 0, pass: true, na: true };
  const sheet = noSheet ? Object.assign({}, na) : panelCheck(sh, width, ROOF_SNOW + selfP);   // полный снег, не очищенный
  sheet.clean = noSheet ? na : panelCheck(sh, width, 0.5e-3 + selfP);           // после очистки — до 0,5 кПа
  sheet.wind = noSheet ? na : panelCheck(sh, width, pW);                        // ветер снизу
  const area = noSheet ? 0 : width * len / 1e6;
  /* стержни над корпусом: рама на шарнирах, стержень — консоль, расчётная длина 2L */
  const roofKg = (winter ? ROOF_BARS_WINTER : ROOF_BARS) * g.kgm * g.L / 1000 + (winter ? sh.kgm2 * area : 0);
  const snowN = winter && !noSheet ? ROOF_SNOW * 1e6 * Math.pow(g.L / 1000, 2) : 0;   // без листа снег проваливается
  const Pper = (roofKg * 9.81 + snowN) / 4;
  const Lf = hgt, I = Math.PI * Math.pow(p.anchorD, 4) / 64;
  const Pcr = Math.PI * Math.PI * GFRP_E * I / Math.pow(2 * Lf, 2);
  const lift = 0.5 * 1.225 * p.wind * p.wind * Math.pow(g.L / 1000, 2);
  return { h: hgt, rise: 0, winterTilt: false, width, len, area, sheetKey: sk, noSheet, sheetName: sh.name, sheetSrc: sh.src,
           sheetPrice: area / 0.85 * sh.price_m2, sheetKg: sh.kgm2 * area, sheet, roofKg,
           rod: { Pper, Pcr, K: Pcr / Pper, Lf, pass: Pcr / Pper >= 2, Kclean: Pcr / ((roofKg * 9.81 + (winter ? 0.5e-3 * 1e6 * Math.pow(g.L / 1000, 2) : 0)) / 4) },
           lift, liftOver: lift > roofKg * 9.81 * 0.8 };
}
const GFRP_E = 50000;          // модуль упругости стеклопластиковой арматуры, МПа (типично 45–55 ГПа)
const GFRP_ALLOW = 200;
/* Колёса (лето, квадрат): 4 поворотных колеса с площадкой под каждым углом — снизу к торцу нижнего бруска,
   4 самореза в нижнюю стенку профиля. Отверстие стержня — в центре площадки, торец стержня упирается в неё.
   Нагрузку считаем на 3 колеса (плитка неровная), тормоз — на части колёс. Зимой колёса откручивают:
   анкерный стержень уходит в грунт. Цены и размеры — по рынку, см. src. */
const WHEELS = {
  w50: { id:'w50', d: 50, H: 75, load: 40, offset: 30, price: 99, priceBrake: 131, kg: 0.14, plate: [50, 50], holes: '37×37', tyre: '#8d9093',
         name:'Колесо поворотное Ø50 с площадкой 50×50, серая немаркая резина (Стелла-техник 3801-50 / 3803-50)',
         src:'stella-tech.ru, цена от 4 шт.: 99 ₽ без тормоза, 131 ₽ с тормозом (розница 141/187 ₽); площадка 3801-50 не сверена' },
  w50b:{ id:'w50b', d: 50, H: 65, load: 40, offset: 30, price: 388, priceBrake: 388, kg: 0.14, plate: [50, 50], holes: '—', tyre: '#1c1d1f', plateUnchecked: true,
         name:'Колесо поворотное Ø50 чёрное, полиуретан (GTV Brazylia KM-RD-50-SF/CF-20)',
         src:'tdmspb.ru — 388 ₽ (mirujuta.ru — 449 ₽); размер площадки не указан — замерить до заказа' },
  w75: { id:'w75', d: 75, H: 100, load: 60, offset: 38, price: 156, priceBrake: 187, kg: 0.26, plate: [65, 65], holes: '50×50', tyre: '#8d9093',
         name:'Колесо поворотное Ø75 с площадкой 65×65, серая резина (Стелла-техник 3801-75 / 3803-75)',
         src:'stella-tech.ru, цена от 4 шт.: 156/187 ₽ (розница 222/268 ₽); площадка на 15 мм шире бруса — через переходную пластину',
         adapter: { size: [100, 65, 4], price: 120, bolt: 5, name:'Пластина переходная стальная 100×65×4, оцинкованная (лазерная резка)',
                    note:'длинной стороной вдоль бруса: 4 самореза в брусок за пределами колеса, колесо — на 4 болта М6 с потайной головкой; цена — оценка' } }
};
/* Столешница (лето, квадрат, без крышки): из той же лаги 50×30 — планки вдоль, зазор 5 мм, лежат на верхних
   брусках боковых стенок; снизу две поперечные планки, лежат на верхних брусках передней и задней стенки
   вплотную к боковым (держат от сдвига) и по саморезу в брусок — от ветра снизу. Вынос — по выбору.
   «С проёмом» — круглый вырез под растение, планки режутся после сборки лобзиком.
   Проверки: присели на середину — 750 Н на двух планках (штамп 100 мм), кратковременно: σ ≤ 12 МПа (ДПК на изгиб
   ≈ 25 МПа, запас 2), прогиб ≤ пролёт/150; облокотились на край выноса — 500 Н на двух планках;
   опрокидывание от тех же 500 Н на краю ≥ 1,5; подъём ветром — держат вес и 4 самореза. */
const TABLE = { gap: 5, P: 750, Pedge: 500, sAllow: 12, screw: { price: 3, name:'Саморез нержавеющий 4,2×50' },
                holeMin: 8, cutMin: 0.4 };
const TABLE_OV = [0, 50, 100, 150];
/* Подсветка: тёплая лента по внутренней грани под верхним бруском — светит на растение и изнутри на листы
   (молочный ПК зимой светится, как фонарь вокруг туи). От сети — 12 В IP65 + блок IP67 + герметичный разъём
   (зимой отстёгивается). Солнечная — готовый комплект 3 м с аккумулятором и датчиком сумерек, светит слабее. */
const LIGHTS = {
  mains: { id:'mains', name:'от сети 12 В', stripPrice: 558, wPerM: 9.6, psu: [{ w: 20, price: 630, name:'Блок питания 12 В 20 Вт IP67 (Giant4)' },
                                                                      { w: 30, price: 900, name:'Блок питания 12 В 30 Вт IP67 (оценка)' }],
           plug: { price: 497, name:'Разъём герметичный 2-pin IP67, пара (Arlight; цена из выдачи — проверить)' },
           clip: { price: 7.11, step: 250, name:'Клипса монтажная для ленты 10 мм (Lamper 144-098)' },
           strip: 'Лента светодиодная 12 В 2835, 9,6 Вт/м, IP65, 3300K (Elektrostandard a052849)',
           src:'elektrostandard.ru — 558 ₽/м; giant4.ru — блок 20 Вт 630 ₽; ledpremium.ru — клипса 7,11 ₽' },
  solar: { id:'solar', name:'солнечная', kit: { price: 900, len: 3000, name:'Солнечная LED-лента 3 м, 90 LED, аккумулятор, датчик сумерек (цена в РФ — оценка)' },
           clip: { price: 7.11, step: 250, name:'Клипса монтажная для ленты 10 мм (Lamper 144-098)' },
           src:'аналог — готовый комплект 3 м, NiMH 600 мА·ч, 7–10 ч; цена в РФ не проверена' }
};
const WHEEL_SCREW = { price: 2, name:'Саморез нержавеющий 4,2×19 с прессшайбой' };
/* уголок ДПК 60×60 как ножка: сечение по аналогии с L60×60×4, модуль ДПК ≈ 3 ГПа — сверить с образцом */
const LEG_TRIM = { I: 0.9e5, E: 3000 };        // уголок 50×50, стенка ≈4 мм (30.09.2026: втулки без паза не выступают, 60×60 не нужен); длительно допустимое напряжение изгиба — ориентир, заменить паспортом

/* ---------- 7. Параметры по умолчанию --------------------------------- */
const defaults = {
  profile:'dpk50x30',
  size:'s497',
  shape:'sq',
  stock:4000,          // лага продаётся хлыстом 4 м
  scheme:'A',
  belts:7,             // 7 поясов × 60 мм = 420 мм: бруски и полка ровно из 4 хлыстов по 4 м
  panel:'pc4m',
  season:'summer',
  shelves:2,
  load:20,
  wind:15,
  plantArea:0.25,
  plantH:0.9,
  anchorD:12,
  anchorL:600,
  frozen:false,
  potKg:0,             // вес горшка с мокрым грунтом, кг; 0 — оценка по размеру горшка
  layers:0,            // ярусов полки-решётки: 1, 2; 0 — выбрать по расчёту
  saucer:true,         // поддон под горшок
  ends:'plugs',
  roof:0,              // крышка над корпусом, мм: 0 — нет, 300 / 600 / 900 / 1200
  roofSheet:'dpk8',    // зимний лист крышки, лежит ровно: 'dpk8', 'pc4', 'acr3' — те же вставки, что в стенках
  custL:6, custW:1,    // индивидуальная секция: длина и ширина в модулях
  custStock:6000,      // хлыст для сквозных брусков: 4000 или 6000 мм
  wallBars:0,          // брусков в каждой стенке: 0 — все; от 2 (нижний и верхний) — выбирает заказчик
  wheels:'',           // колёса летом: '' — нет, 'w50', 'w75'
  wheelBrakes:4,       // сколько колёс с тормозом: 2 или 4 (при ветре 15 м/с двух мало)
  table:'',            // столешница летом: '' — нет, 'solid' — сплошная (стол-тумба), 'hole' — с круглым проёмом под растение
  tableOv:0,           // вынос столешницы за корпус с каждой стороны, мм
  light:'',            // подсветка: '' — нет, 'mains' — от сети 12 В, 'solar' — солнечная
  nodeEnds:null,
  plugColors:null,     // цвет отдельной заглушки: { 'сторона:брусок:a|b' или 's сторона:брусок:a|b' (втулка): номер цвета }       // торцы у каждого угла: { 'номер угла': { t:'plugs'|'trims'|'open', c: номер цвета } }
  plugColor:0, trimColor:0,
  keepEdge:null,       // своя раскладка брусков у отдельной стенки: { 'номер стенки': [номера брусков] } — убрать брусок на одной стороне
  keepSet:null,        // какие бруски оставить (номера снизу с 0) — выбирает заказчик; верхний всегда. Нижний можно поднять
  segMode:'wall',      // 'wall' — один лист на стенку; 'rows' — свой лист между любыми соседними брусками (лето)
  segs:null,           // по ярусам: { 'сторона:нижний брусок': ключ листа или 'none' }
  barColors:null,      // цвет каждого бруска: { 'сторона:брусок': 'c<номер цвета>' }
  barColor:'c0',       // цвет брусков по умолчанию (чёрный — как у артикула)
  denseBottom:false,   // низ до 490 мм — все бруски (зона снега)
  cascade:0,           // набор: на сколько поясов ниже каждая следующая ступень
  lineN:6,             // ограждение-линия: длина в модулях
  lineBase:'',         // ограждение-линия: '' — по сезону (лето — плитка, зима — грунт), 'hard' — плитка/настил, 'soil' — грунт
  lineStep:0,          // пролётов между квадратами-опорами: 0 — наибольшее допустимое
  hour:450, defect:5, overhead:12, misc:650, margin:0.66
};

/* ---------- 8. Раскрой ------------------------------------------------- */
function cutPlan(stock, L, kerf) {
  kerf = kerf === undefined ? KERF : kerf;
  const n = Math.floor((stock + kerf) / (L + kerf));
  const used = n * L + (n - 1) * kerf;
  return { n, used, waste: stock - used, pct: (stock - used) / stock * 100 };
}

/* ---------- 9. Контур --------------------------------------------------- */
function outline(shapeId, module) {
  const sh = SHAPES[shapeId] || SHAPES.sq;
  let pts = [], cells = [], loops = null, loopCells = [];
  if (sh.kind === 'poly') {
    const n = sh.n, R = module / (2 * Math.sin(Math.PI / n));
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 - Math.PI / n + i * 2 * Math.PI / n;       // нижняя грань горизонтальна
      pts.push([R * Math.cos(a), R * Math.sin(a)]);
    }
  } else {
    const has = new Set(sh.cells.map(c => c[0] + ',' + c[1]));
    const E = [];                                                       // рёбра границы, внутренность слева
    sh.cells.forEach(([x, y]) => {
      const ci = sh.cells.findIndex(c => c[0] === x && c[1] === y);
      if (!has.has(x + ',' + (y - 1))) E.push([[x, y], [x + 1, y], ci]);
      if (!has.has((x + 1) + ',' + y)) E.push([[x + 1, y], [x + 1, y + 1], ci]);
      if (!has.has(x + ',' + (y + 1))) E.push([[x + 1, y + 1], [x, y + 1], ci]);
      if (!has.has((x - 1) + ',' + y)) E.push([[x, y + 1], [x, y], ci]);
    });
    /* обходим все замкнутые контуры (у каре их два: внешний и вокруг дерева) */
    const used = new Set();
    loops = [];
    for (let s0 = 0; s0 < E.length; s0++) {
      if (used.has(s0)) continue;
      used.add(s0); const loop = [E[s0][0]], lc = [E[s0][2]]; let cur = E[s0];
      for (let guard = 0; guard < 400; guard++) {
        const end = cur[1];
        if (end[0] === loop[0][0] && end[1] === loop[0][1]) break;
        loop.push(end);
        const j = E.findIndex((e, k) => !used.has(k) && e[0][0] === end[0] && e[0][1] === end[1]);
        if (j < 0) break;
        used.add(j); cur = E[j]; lc.push(cur[2]);
      }
      if (sh.rot) for (let r = 0; r < sh.rot; r++) { loop.push(loop.shift()); lc.push(lc.shift()); }   // обход с другого угла — чётности стенок меняются местами
      loopCells.push(lc);
      /* прямые участки: узел на прямой остаётся — там стык двух одинаковых брусков на стержне (шарнир) */
      loops.push(loop.map(q => [q[0] * module, q[1] * module]));
    }
    pts = [].concat.apply([], loops);
    cells = sh.cells.map(c => [(c[0] + 0.5) * module, (c[1] + 0.5) * module]);
  }
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const cx = (Math.min.apply(null, xs) + Math.max.apply(null, xs)) / 2;
  const cy = (Math.min.apply(null, ys) + Math.max.apply(null, ys)) / 2;
  if (!loops) pts = pts.map(p => [p[0] - cx, p[1] - cy]);
  cells = cells.map(p => [p[0] - cx, p[1] - cy]);
  /* рёбра по контурам: у каждого ребра — узлы начала и конца (ia, ib); у узла — входящее ребро (inE) */
  const shifted = !loops;
  if (!loops) loops = [pts];
  pts = [];
  loops.forEach(l => l.forEach(q => pts.push(shifted ? q : [q[0] - cx, q[1] - cy])));
  const N = pts.length, edges = [], inE = [];
  let off0 = 0;
  loops.forEach(l => {
    const n = l.length;
    for (let j = 0; j < n; j++) {
      const i = off0 + j, ia = i, ib = off0 + (j + 1) % n, a = pts[ia], b = pts[ib];
      const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy), d = [dx / len, dy / len];
      edges.push({ i, ia, ib, a, b, d, n: [d[1], -d[0]], mid: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2],
                   ang: Math.atan2(dy, dx), len, parity: i % 2, cell: loopCells.length ? loopCells[loops.indexOf(l)][j] || 0 : 0 });
      inE[ib] = i;
    }
    off0 += n;
  });
  /* поворот на узле: + выпуклый угол, − входящий, 0 — прямой стык (шарнир) */
  const turn = pts.map((_, i) => {
    const e0 = edges[inE[i]].d, e1 = edges[i].d;
    return Math.atan2(e0[0] * e1[1] - e0[1] * e1[0], e0[0] * e1[0] + e0[1] * e1[1]);
  });
  return { sh, pts, edges, turn, cells, N, inE, loops: loops.length,
           spanX: Math.max.apply(null, xs) - Math.min.apply(null, xs),
           spanY: Math.max.apply(null, ys) - Math.min.apply(null, ys) };
}
/* отступ края вставки от узла: вставка в наружной полости (13 мм наружу от оси бруска)
   не должна задевать брусок соседней грани */
function panelMargin(phi, w) {
  const a = Math.abs(phi), gap = w / 2 + 2, off = 13;
  if (a < 0.35) return gap;
  return (gap + off * Math.cos(a)) / Math.sin(a) + 2;
}

/* ---------- 9b. Составная форма = набор квадратов --------------------- */
/* Набор: каждая ячейка — целый квадрат со своим размером и числом поясов.
   Каскад: самая высокая ячейка — дальняя левая, каждая следующая по шагу — ниже.
   Амфитеатр: три ряда разных размеров, спереди низкий, сзади высокий. */
const SET_GAP = 8;
function unitOf(p) {
  const sh = SHAPES[p.shape];
  return null;                         // наборов нет: любая форма — единый контур (решение владельца 27.09.2026)
  if (!sh) return null;
  /* Формы из клеток (Г, П, Т, Ш, Н, крест…) — единый контур из одинаковых брусков, стыки на стержнях шарнирные,
     внутренних стенок нет (решение владельца 27.09.2026). Набором остаётся только амфитеатр: ряды разного размера
     из одинаковых брусков в один контур не собрать — каждый ряд свой контур. */
  const st = +p.cascade || 0, cells = [];
  if (false) {  } else if (sh.kind === 'rows') {
    let y = 0;
    sh.rows.forEach((r, ri) => {
      const L = SIZES[r.size].L;
      cells.push({ x: 0, y: y + L / 2, size: r.size, shape: r.n === 1 ? 'sq' : 'r' + r.n + '1', halfX: (r.n * (L - PROFILES[p.profile].w) + PROFILES[p.profile].w) / 2,
        belts: Math.max(3, p.belts - st * (sh.rows.length - 1 - ri)) });
      y += L + SET_GAP;
    });
  } else return null;
  const half = c => SIZES[c.size].L / 2, halfX = c => c.halfX || half(c);
  const x0 = Math.min.apply(null, cells.map(c => c.x - halfX(c))), x1 = Math.max.apply(null, cells.map(c => c.x + halfX(c)));
  const y0 = Math.min.apply(null, cells.map(c => c.y - half(c))), y1 = Math.max.apply(null, cells.map(c => c.y + half(c)));
  cells.forEach(c => { c.x -= (x0 + x1) / 2; c.y -= (y0 + y1) / 2; });
  /* главный — передний правый: на нём подписи, он показывается в «В коробку» и «Полка выше/ниже» */
  const minFront = Math.min.apply(null, cells.map(c => c.y - half(c)));
  const main = cells.map((c, i) => i).filter(i => Math.abs(cells[i].y - half(cells[i]) - minFront) < 1)
                    .sort((a, b) => cells[b].x - cells[a].x)[0];
  const groups = [];
  cells.forEach(c => {
    const g = groups.find(q => q.size === c.size && q.belts === c.belts && q.shape === (c.shape || 'sq'));
    if (g) g.count++; else groups.push({ size: c.size, belts: c.belts, shape: c.shape || 'sq', count: 1,
      pu: Object.assign({}, p, { shape: c.shape || 'sq', size: c.size, belts: c.belts }) });
  });
  return { sh, cells, groups, n: cells.length, main, mainPu: Object.assign({}, p, { shape: cells[main].shape || 'sq', size: cells[main].size, belts: cells[main].belts }),
           mixed: groups.length > 1, spanX: x1 - x0, spanY: y1 - y0 };
}
/* сумма по группам одинаковых квадратов */
function sumGroups(u, fn) {
  const out = {};
  u.groups.forEach(g => { const r = fn(g.pu); Object.keys(r).forEach(k => { if (typeof r[k] === 'number') out[k] = (out[k] || 0) + r[k] * g.count; }); });
  return out;
}
const scaleObj = (o, n) => { const r = {}; Object.keys(o).forEach(k => { r[k] = typeof o[k] === 'number' ? o[k] * n : o[k]; }); return r; };

/* ---------- 9c. Индивидуальный заказ: секция со сквозными брусками --------
   Прямая стенка — один брусок на всю длину, из хлыста 4 или 6 м. Внутри — перемычки
   из того же бруска: связывают длинные стенки против распора грунта, шаг — по проверке
   бруска на изгиб между ними. Под торцевыми стенками на нижнем венце — добор,
   иначе в щель 30 мм у земли высыпается грунт. Цена ориентировочная. */
function lagSectionV(w, h) {                 // изгиб в плане — поперёк стенки
  const cw = w / 2 - 4 - 5, ch = h - 8, e = w / 2 - 4 - cw / 2;
  const I = h * Math.pow(w, 3) / 12 - 2 * (ch * Math.pow(cw, 3) / 12 + ch * cw * e * e);
  return { I, W: I / (w / 2) };
}
/* Активное давление грунта Ka·γ·z (Ka 0,33, γ 16 кН/м³). Брусок второго снизу венца
   собирает давление с полосы 2h; пролёт — между перемычками. ДПК: 8 МПа, прогиб с
   ползучестью ×2 не больше L/200. */
function soilCheck(w, h, H, span) {
  const Ka = 0.33, gam = 1.6e-5, E = 3000, sec = lagSectionV(w, h);
  const z = Math.max(0, H - 2.5 * h), q = Ka * gam * z * 2 * h;
  const sigma = q * span * span / 8 / sec.W;
  const deflLong = 2 * 5 * q * Math.pow(span, 4) / (384 * E * sec.I);
  return { span, q, sigma, deflLong, limit: span / 200, pass: sigma <= 8 && deflLong <= span / 200 };
}
/* Раскрой разных длин: «первый подходящий» по убыванию длины */
function packFFD(pieces, stock, kerf) {
  kerf = kerf === undefined ? KERF : kerf;
  const bins = [];
  pieces.slice().sort((a, b) => b - a).forEach(L => {
    const b = bins.find(x => x.free >= L + kerf);
    if (b) { b.free -= L + kerf; b.items.push(L); } else bins.push({ free: stock - L, items: [L] });
  });
  const waste = bins.reduce((s, b) => s + b.free, 0);
  return { sticks: bins.length, waste, pct: bins.length ? waste / (bins.length * stock) * 100 : 0, bins };
}
function deriveCustom(p) {
  const pr = PROFILES[p.profile], sz = SIZES[p.size], w = pr.w, h = pr.h, module = sz.L - w;
  const levels = p.belts * 2, H = levels * h, half = levels / 2;
  const stock = +p.custStock === 4000 ? 4000 : 6000;
  const nMax4 = Math.floor((4000 - w) / module), nMax6 = Math.floor((6000 - w) / module);
  const nMax = stock === 4000 ? nMax4 : nMax6;
  const nW = Math.min(2, Math.max(1, Math.round(+p.custW || 1)));
  const nL = Math.min(nMax, Math.max(2, Math.round(+p.custL || 6)));
  const X = nL * module, Y = nW * module;
  let pitch = 2, soil = soilCheck(w, h, H, Math.max(pitch, nW) * module);
  if (!soil.pass) { pitch = 1; soil = soilCheck(w, h, H, Math.max(pitch, nW) * module); }
  const partX = []; for (let k = pitch; k < nL; k += pitch) partX.push(-X / 2 + k * module);
  const mk = (i, a, b, parity, extra) => {
    const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy), d = [dx / len, dy / len];
    return Object.assign({ i, a, b, d, n: [d[1], -d[0]], mid: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2],
                           ang: Math.atan2(dy, dx), len, parity, barLen: len + w }, extra || {});
  };
  const pts = [[-X / 2, -Y / 2], [X / 2, -Y / 2], [X / 2, Y / 2], [-X / 2, Y / 2]];
  const edges = pts.map((a, i) => mk(i, a, pts[(i + 1) % 4], i % 2));
  const partitions = partX.map((x, j) => mk(4 + j, [x, -Y / 2], [x, Y / 2], 1, { partition: true }));
  const xs = [-X / 2].concat(partX, [X / 2]);
  const nodes = pts.concat(partX.map(x => [x, -Y / 2]), partX.map(x => [x, Y / 2]));
  const cells = xs.slice(1).map((x, k) => [(x + xs[k]) / 2, 0, x - xs[k]]);       // отсеки: центр и длина
  const starters = [1, 3].map(i => ({ edge: i, len: Y - w }));
  const m90 = panelMargin(Math.PI / 2, w), panelH = H - 2 * h, panelList = [];
  cells.forEach(c => {
    panelList.push({ edge: 0, shift: c[0], width: c[2] - 2 * m90, parity: 0 });
    panelList.push({ edge: 2, shift: -c[0], width: c[2] - 2 * m90, parity: 0 });
  });
  [1, 3].forEach(i => panelList.push({ edge: i, shift: 0, width: Y - 2 * m90, parity: 1 }));
  const panelArea = panelList.reduce((s, q) => s + q.width * panelH, 0) / 1e6;
  const pieces = [];
  for (let k = 0; k < 2 * half; k++) pieces.push(X + w);
  for (let k = 0; k < (2 + partX.length) * half; k++) pieces.push(Y + w);
  starters.forEach(s => pieces.push(s.len));
  const pack = packFFD(pieces, stock);
  const pot = potEstimate(Y - w, H);
  const rodLen = H + p.anchorL - h / 2;
  const lightC = LIGHTS[p.light] ? { spec: LIGHTS[p.light], len: Math.round(2 * (X + Y) - 4 * w) } : null;
  return { light: lightC, pr, sz, L: sz.L, w, h, module, levels, H, poly: false, square: false, custom: true,
           ol: { sh: SHAPES.cust, pts, edges, turn: [1, 1, 1, 1].map(() => Math.PI / 2), cells, N: 4, spanX: X, spanY: Y },
           N: nodes.length, sides: 4, outerX: X + w, outerY: Y + w, outer: Math.max(X, Y) + w, clear: Y - w,
           barCount: (4 + partX.length) * half, partitions, nodes, starters, pieces, pack,
           panels: [], panelList, panelW: Math.max.apply(null, panelList.map(q => q.width)), panelH, panelArea,
           rodLen, summerRod: H - 2, stock, cut: { n: 0, waste: Math.round(pack.waste), pct: pack.pct },
           bearing: (w - 8) / 2, convex90: 4, concave: 0, trimsAllowed: true,
           slatsPer: 0, slatLen: 0, slatCount: 0, slatPos: [], slatCut: cutPlan(stock, module), crossings: 0,
           layers: 0, layersAuto: 0, check1: null, check2: null, pot, potKg: 0, saucerOn: false, saucer: saucerSpec(pot),
           ring: RINGS[0], ringH: 0, rodArcs: [], bendSigma: 0, bendR: Infinity, ext: 0, roof: { h: 0, rise: 0 },
           nL, nW, nMax, nMax4, nMax6, pitch, soil, custStock: stock, longest: X + w,
           soilKg: Math.round((X - w) * (Y - w) * (H - 60) / 1e6 * 1.3) };
}

/* ---------- 9d. Ограждение-линия -----------------------------------------
   Открытая цепочка стандартных брусков: на каждом стыке стержень, забитый на 600 мм, —
   без него стык складывается. Летом — на газоне, зимой — вдоль изгороди. На свободных
   концах через уровень нет бруска — там стандартные втулки. Под засыпку грунтом не годится. */
const SNOW_P = 1.0e-3, SNOW_ZONE = 500;      // снег у стенки: 1 кПа у земли, к 500 мм — ноль (оценка)
/* Линия на плитке: промежуточный прямой стык — шарнир без анкера, сам не стоит (опрокидывание узла — запас 0,15).
   Между двумя Т-узлами m пролётов работают как цепь на всех уровнях: под ветром цепь выбирает люфт отверстий
   (Ø14 на Ø12 — 2 мм на брусок), провисает и натягивается. Натяжение вдоль линии и ветер поперёк держит трение
   крайнего квадрата о плитку (μ 0,4 — мокрая плитка); промежуточный узел помогает своим трением. m = 1 — один брусок
   между двумя Т-узлами, шарниров нет: цепи нет. Проверено 27.09.2026 по просьбе владельца. */
const CHAIN_MU = 0.4, CHAIN_PLAY = 2;
/* Ветер на линию. С листом — сплошная стенка, Cd 1,3 на всю площадь. Без листа — решётка: в каждом пролёте бруски
   через уровень, заполнение φ = 0,5; по СП 20 / EN 1991-1-4 (7.11) для плоской решётки из прямоугольных элементов
   cf ≈ 1,55 на площадь брусков — на всю площадь 0,5 × 1,55 ≈ 0,78, то есть ≈ 0,6 от сплошной (владелец, 27.09.2026). */
const LATTICE_CF = 1.55, LATTICE_PHI = 0.5;
function lineCd(p) { return p.panel === 'none' ? LATTICE_PHI * LATTICE_CF : 1.3; }
function lineChain(p, m, g) {
  if (m <= 1) return { m, K: Infinity, sag: 0, T: 0, pass: true };
  const q = 0.5 * 1.225 * p.wind * p.wind, Fmod = q * lineCd(p) * g.module * g.H * 1e-6;
  const Wnode = g.half * g.L / 1000 * g.pr.kgm * 9.81;                       // бруски одного пролёта, без листа — в запас
  const S = m * g.module, sag = Math.sqrt(3 * S * CHAIN_PLAY * m / 8);
  const weff = Math.max(0, Fmod - CHAIN_MU * Wnode) / g.module, T = weff * S * S / (8 * sag);
  const N = (g.sqKg + g.ballast) * 9.81, perp = g.sqF + m * Fmod / 2;
  const avail = Math.sqrt(Math.max(0, Math.pow(CHAIN_MU * N, 2) - perp * perp)), K = T > 0 ? avail / T : Infinity;
  return { m, K, sag, T, avail, pass: K >= 1.5 };
}
function lineCheck(p, module, H) {
  const q = 0.5 * 1.225 * p.wind * p.wind, D = p.anchorD / 1000, Lp = p.anchorL / 1000;
  const Wr = Math.PI * Math.pow(p.anchorD, 3) / 32;
  const Fw = q * lineCd(p) * (module / 1000) * (H / 1000), levW = H / 2000;
  const HuT = 0.5 * 18000 * D * Math.pow(Lp, 3) * 3 / (levW + Lp);
  const hs = Math.min(H, SNOW_ZONE) / 1000, Fs = 0.5 * SNOW_P * 1e6 * hs * (module / 1000), levS = hs / 3;
  const HuF = 0.5 * 90000 * D * Math.pow(Lp, 3) * 3 / (levS + Lp);
  const r = { Fw, sigmaW: Fw * levW * 1000 / Wr, Kw: HuT / Fw, Fs, sigmaS: Fs * levS * 1000 / Wr, Ks: HuF / Fs };   // Н·м → Н·мм
  r.pass = r.sigmaW <= GFRP_ALLOW && r.Kw >= 1.5 && r.sigmaS <= GFRP_ALLOW && r.Ks >= 1.5;
  return r;
}
/* Ограждение-линия с квадратами-опорами (решение владельца 26.09.2026). Прямой стык двух пролётов на одном
   стержне — шарнир: цепочка сама не стоит (на плитке запас от опрокидывания ≈ 0,15). Поэтому:
   · по краям всегда квадрат-кашпо; бруски линии входят в промежутки середины его стенки — Т-узел на стержне (см. выше);
   · основание «плитка, настил» — стержни не забить: между квадратами линия держится цепью, число пролётов — по lineChain;
     при чётном числе пролётов — поворот следующего квадрата или только нечётные (lineParity, выбор владельца);
   · основание «грунт» — стержни линии забиты на 600 мм, каждый держит свой пролёт: если анкер проходит, промежуточные
     квадраты не нужны; если нет — квадрат через пролёт.
   Квадрат-опора проверяется на опрокидывание (летом с горшком-балластом) от ветра на себя и на половины соседних пролётов;
   зимой на грунте его стержни — анкерные. */
/* Т-узел (решение владельца 27.09.2026): бруски линии входят в промежутки стенки квадрата, торец — заподлицо с её внутренней гранью.
   Отверстие в торце бруска линии приходится на центр стенки; стержень проходит сквозь него и сквозь отверстие Ø14 посередине
   брусков этой стенки. Торцевой колонки втулок и саморезов нет. Стенка квадрата к линии — той чётности, что противоположна брускам
   линии в узле; где пролётов чётное число, следующий квадрат повёрнут на 90° (sqR) — деталей не добавляется. */
function deriveLine(p) {
  const pr = PROFILES[p.profile], sz = SIZES[p.size], w = pr.w, h = pr.h, L = sz.L, module = L - w;
  const levels = p.belts * 2, H = levels * h, half = levels / 2;
  const n = Math.min(40, Math.max(1, Math.round(+p.lineN || 6)));
  const base = p.lineBase === 'soil' || p.lineBase === 'hard' ? p.lineBase : (p.season === 'winter' ? 'soil' : 'hard');
  const lc = lineCheck(p, module, H);
  /* на плитке — сколько пролётов цепь держит между квадратами (квадрат с горшком летом, без него зимой) */
  let chainG = null, maxStep;
  if (base === 'hard') {
    const sqQ = Object.assign({}, p, { shape: 'sq', lineN: 0, wheels: '', table: '', shelves: p.season === 'winter' ? 0 : (p.shelves || 2) });
    const st = stability(sqQ);
    chainG = { module, H, L, pr, half, sqKg: mass(sqQ).totalKg, ballast: st.ballast || 0, sqF: st.F };
    maxStep = 1; while (maxStep < n && lineChain(p, maxStep + 1, chainG).pass) maxStep++;
  } else maxStep = lc.pass ? n : 1;
  /* «только нечётные»: все квадраты стоят одинаково — бруски линии в обоих Т-узлах участка одной чётности */
  const oddOnly = p.lineParity === 'odd';
  if (oddOnly && maxStep % 2 === 0) maxStep--;
  let step = Math.max(1, Math.min(maxStep, Math.round(+p.lineStep || maxStep)));
  if (oddOnly && step % 2 === 0) step--;
  let segLens = []; for (let left = n; left > 0; left -= step) segLens.push(Math.min(step, left));
  if (oddOnly) segLens = [].concat.apply([], segLens.map(m => m % 2 ? [m] : [m - 1, 1]));   // чётный остаток — ещё один квадрат
  /* раскладка вдоль x: квадрат — пролёты — квадрат … ; крайний стержень пролёта — в центре стенки квадрата (Т-узел).
     sp — чётность первого бруска пролёта; par — чётность стенок квадрата поперёк линии (1 — у них верхний брусок) */
  const sqX = [], sqPar = [], segs = []; let c = 0, par = 1;
  sqX.push(c); sqPar.push(par);
  segLens.forEach(m => {
    const x0 = c + module / 2, sp = 1 - par; segs.push({ x0, m, sp });
    par = 1 - (sp + m - 1) % 2; c = x0 + m * module + module / 2; sqX.push(c); sqPar.push(par);
  });
  const total = sqX[sqX.length - 1] - sqX[0] + L, sh = (sqX[0] + sqX[sqX.length - 1]) / 2;
  const pts = [], edges = [], stubList = [];
  segs.forEach((s, si) => {
    const first = pts.length;
    for (let i = 0; i <= s.m; i++) pts.push([s.x0 - sh + i * module, 0]);
    for (let i = 0; i < s.m; i++) {
      const a = pts[first + i], b = pts[first + i + 1];
      edges.push({ i: edges.length, seg: si, a, b, d: [1, 0], n: [0, -1], mid: [(a[0] + b[0]) / 2, 0], ang: 0, len: module, parity: (s.sp + i) % 2, barLen: L });
    }
  });
  const sqBase = { lineN: 0, wheels: '', table: '' };                 // опора жёстко связана с линией: без колёс и столешницы
  const squares = sqX.map((x, k) => ({ x: x - sh, y: 0, par: sqPar[k],
    p: Object.assign({}, p, sqBase, { shape: sqPar[k] ? 'sq' : 'sqR', lineT: [k > 0 ? 'L' : '', k < sqX.length - 1 ? 'R' : ''].filter(Boolean) }) }));
  const sqP = Object.assign({}, p, sqBase, { shape: 'sq' });
  const gap = w / 2 + 2, panelH = H - 2 * h;
  const panelList = edges.map(e => ({ edge: e.i, shift: 0, width: module - 2 * gap, parity: e.parity }));
  const panelArea = panelList.reduce((s, q) => s + q.width * panelH, 0) / 1e6;
  const stock = (pr.stocks.indexOf(p.stock) >= 0) ? p.stock : pr.stocks[pr.stocks.length - 1];
  const anchored = base === 'soil';
  const rodLen = anchored ? H + p.anchorL - h / 2 : H - 2, pot = potEstimate(300, H);
  const levelOn = []; for (let lv = 0; lv < levels; lv++) levelOn.push(true);
  const lightL = LIGHTS[p.light] ? { spec: LIGHTS[p.light], len: Math.round(n * module) } : null;
  /* пролёт между опорами гнётся ветром в плане: брусок держит свою полосу 2h (лист между брусками передаёт на них) */
  const q = 0.5 * 1.225 * p.wind * p.wind, Cd = 1.3, secV = lagSectionV(w, h);
  const wBar = q * (p.panel === 'none' ? LATTICE_CF * h : Cd * 2 * h) * 1e-6;   // Н/мм: без листа брусок берёт только свою высоту
  const spanSig = wBar * module * module / 8 / secV.W;
  const junctions = segs.length * 2;                               // Т-узлов
  return { light: lightL, pr, sz, L, w, h, module, levels, H, poly: false, square: false, custom: false, line: true,
           ol: { sh: SHAPES.line, pts, edges, turn: pts.map(() => 0), cells: edges.map(e => [e.mid[0], 380]), N: pts.length, spanX: total, spanY: L },
           N: pts.length, nodes: pts, sides: n, outerX: total, outerY: L, outer: total, clear: 0, lineN: n,
           barCount: n * half, stubList, stubs: stubList.length, thin: 1, keep: null, levelOn,
           panels: [], panelList, panelW: module - 2 * gap, panelH, panelArea,
           rodLen, summerRod: rodLen, stock, cut: cutPlan(stock, L),
           bearing: (w - 8) / 2, convex90: 0, concave: 0, trimsAllowed: false,
           slatsPer: 0, slatLen: 0, slatCount: 0, slatPos: [], slatCut: cutPlan(stock, module), crossings: 0,
           layers: 0, layersAuto: 0, check1: null, check2: null, pot, potKg: 0, saucerOn: false, saucer: saucerSpec(pot),
           ring: RINGS[0], ringH: 0, rodArcs: [], bendSigma: 0, bendR: Infinity, ext: 0, roof: { h: 0, rise: 0 },
           lineCheck: lc, lineSquares: squares, sqP, cellOff: [[0, 0]].concat(squares.map(s => [s.x, s.y])),
           lineInfo: { base, anchored, step, maxStep, segLens, junctions, rotated: sqPar.filter(v => !v).length, oddOnly, lattice: p.panel === 'none', spanSig, spanPass: spanSig <= 8,
                       chain: chainG ? lineChain(p, Math.max.apply(null, segLens), chainG) : null,
                       chainNext: chainG && maxStep + (oddOnly ? 2 : 1) <= n ? lineChain(p, maxStep + (oddOnly ? 2 : 1), chainG) : null } };
}
/* Квадраты-опоры линии: опрокидывание (или анкер зимой на грунте) от ветра на себя и на половины соседних пролётов */
function lineSupportCheck(p) {
  const d = derive(p); if (!d.lineSquares) return null;
  const li = d.lineInfo, g = 9.81, q = 0.5 * 1.225 * p.wind * p.wind, Cd = lineCd(p);
  const sqAnch = li.anchored && p.season === 'winter';
  const ps = Object.assign({}, d.sqP, { shelves: p.season === 'winter' ? 0 : 2 });
  const st = stability(ps);
  const trib = [];                                                   // длина пролётов, приходящаяся на каждый квадрат
  for (let k = 0; k < d.lineSquares.length; k++) {
    const left = k > 0 ? li.segLens[k - 1] : 0, right = k < li.segLens.length ? li.segLens[k] : 0;
    /* на грунте каждый стержень линии забит и держит свой пролёт — на квадрат приходится только половина соседнего пролёта */
    const f = m => !m ? 0 : li.anchored ? 0.5 : m / 2;
    trib.push((f(left) + f(right)) * d.module);
  }
  const worst = Math.max.apply(null, trib);
  const Fe = q * Cd * (worst / 1000) * (d.H / 1000);
  const Ktip = st.Mrest / (st.Mwind + Fe * d.H / 2000);
  const Kanch = st.Hu / (st.F + Fe);
  const K = sqAnch ? Kanch : Ktip;
  return { K, Ktip, Kanch, sqAnch, Fe, trib: worst, pass: K >= 1.5 && li.spanPass && (!li.chain || li.chain.pass) && (!li.anchored || d.lineCheck.pass || li.step === 1), squares: d.lineSquares.length };
}
/* Втулка с пазом (вариант В, выбран 26.09.2026): втулка на 7 мм длиннее торца колонки — 57 мм вместо 50 —
   и на выступе тот же паз в верхней и нижней стенке профиля, что у брусков корпуса. Лист при установке
   сверху проходит сквозь втулку, как сквозь брусок: держится с двух сторон и не даёт втулке провернуться.
   Отдельной детали нет, цвет совпадает сам собой. Край листа — в 27 мм от стержня, заходит в паз на 5 мм. */
const STUB_LEN = 57, STUB_EXT = 7;
/* (прежний вариант А) Прихват листа на втулке: жёсткое основание на саморезе в канал втулки + мягкие губки
   из П-образного уплотнителя для стекла 4 мм. Лист опускается сверху между губками.
   Губки держат лист с двух сторон, а через лист — и саму втулку от проворота. Снаружи
   угол с втулками закрыт декоративным уголком ДПК, поэтому заглушек нет. Цена — оценка из готовых деталей: уплотнитель 16,6–55 ₽/м
   (30 мм ≈ 1 ₽), пластиковое основание ≈ 5 ₽, саморез 6 ₽. */
const CLIP = { price: 12, min: 0.5,
  src: 'оценка: П-уплотнитель для стекла 4 мм 16,6–55 ₽/м (tzpi.net, prip.ru) + основание + саморез; серийно — литая деталь' };
/* Пластина, опёртая по четырём кромкам (Тимошенко, ν = 0,3): прогиб α·p·b⁴/D, момент β·p·b², b — меньшая сторона */
const PLATE = [[1, 0.00406, 0.0479], [1.2, 0.00564, 0.0626], [1.4, 0.00705, 0.0753], [1.6, 0.0083, 0.0862],
               [2, 0.01013, 0.1017], [3, 0.01223, 0.1189], [100, 0.01302, 0.125]];
function plateCheck(pn, a, b, pMPa) {
  const lo = Math.min(a, b), rr = Math.max(a, b) / lo;
  let i = 0; while (i < PLATE.length - 2 && PLATE[i + 1][0] < rr) i++;
  const [r0, a0, b0] = PLATE[i], [r1, a1, b1] = PLATE[i + 1], k = Math.min(1, Math.max(0, (rr - r0) / (r1 - r0)));
  const alpha = a0 + (a1 - a0) * k, beta = b0 + (b1 - b0) * k, t = pn.t;
  const D = pn.E * t * t * t / (12 * 0.91);
  const defl = alpha * pMPa * Math.pow(lo, 4) / D, sigma = 6 * beta * pMPa * lo * lo / (t * t);
  const freq = Math.PI / 2 * (1 / Math.pow(a / 1000, 2) + 1 / Math.pow(b / 1000, 2)) * Math.sqrt(D * 1e-3 / pn.kgm2);
  return { s: b, p: pMPa, sigma, sAllow: pn.sAllow, defl, limit: lo / 50, freq, plate: true,
           pass: sigma <= pn.sAllow && defl <= lo / 50 };
}
/* ---------- 9e. Пропуск брусков в стенке --------------------------------
   Лист вставки проходит сквозь пазы всех брусков своей стенки. Оставляем нижний
   (лист стоит на нём), верхний (держит верхний край) и промежуточные через шаг —
   минимум три линии опоры. Пропущенный брусок оставляет в двух углах щель высотой в брусок —
   её занимает втулка: отрезок той же лаги 50 мм, как торец бруска. Все втулки одинаковые. */
function panelCheck(pn, s, pMPa) {
  const sigma = pMPa * s * s / 8 / pn.W;
  const defl = 5 * pMPa * Math.pow(s, 4) / (384 * pn.E * pn.I);
  const freq = Math.PI / (2 * Math.pow(s / 1000, 2)) * Math.sqrt(pn.E * 1e6 * pn.I * 1e-9 / pn.kgm2);
  return { s, p: pMPa, sigma, sAllow: pn.sAllow, defl, limit: s / 50, freq,
           pass: sigma <= pn.sAllow && defl <= s / 50 };
}
function wallCheck(keep, h, pn, pWind, winter, clips, width) {
  let worst = null;
  for (let i = 1; i < keep.length; i++) {
    const s = (keep[i] - keep[i - 1]) * 2 * h, z = keep[i - 1] * 2 * h;
    const pS = winter ? SNOW_P * Math.max(0, 1 - z / SNOW_ZONE) : 0;
    /* с прихватами боковые кромки опёрты: акрил и ДПК работают как пластина на 4 кромках.
       Сотовый ПК поперёк каналов почти не работает — для него только пролёт по вертикали. */
    const c = (clips && pn.iso && s > 2 * h) ? plateCheck(pn, width, s, Math.max(pWind, pS)) : panelCheck(pn, s, Math.max(pWind, pS));
    c.z = z; c.snow = pS > pWind;
    const r = Math.max(c.sigma / c.sAllow, c.defl / c.limit);
    if (!worst || r > worst.ratio) { worst = c; worst.ratio = r; }
  }
  return worst;
}

/* ---------- 10. Геометрия ----------------------------------------------- */
function derive(p) {
  if (p.shape === 'cust') return deriveCustom(p);
  if (p.shape === 'line') return deriveLine(p);
  const u = unitOf(p);
  if (u) {
    /* набор квадратов: геометрия главного квадрата + где стоит каждый, его размер и высота */
    const d = derive(u.mainPu), w = d.w;
    const cellOff = u.cells.map(c => [c.x, c.y]);
    const frontY = Math.min.apply(null, u.cells.map(c => c.y - (SIZES[c.size].L - w) / 2));
    const fr = cellOff[u.main];
    const totalBars = u.groups.reduce((s2, g) => s2 + derive(g.pu).barCount * g.count, 0);
    const totalStubs = u.groups.reduce((s2, g) => s2 + derive(g.pu).stubs * g.count, 0);
    return Object.assign(d, { composite: true, units: u.n, shapeId: p.shape, shapeName: u.sh.name, cellOff,
      cellUnits: u.cells.map(c => ({ size: c.size, belts: c.belts, shape: c.shape || 'sq' })), mixed: u.mixed, mainIdx: u.main, hole: !!u.sh.hole,
      outerX: u.spanX, outerY: u.spanY, outer: Math.max(u.spanX, u.spanY), frontY, labelOff: fr,
      cornerPt: [fr[0] + d.ol.pts[1][0], fr[1] + d.ol.pts[1][1]], totalBars, totalStubs });
  }
  const pr = PROFILES[p.profile];
  const sz = SIZES[p.size];
  const L = sz.L, w = pr.w, h = pr.h;
  const module = L - w;
  const ol = outline(p.shape || 'sq', module);
  /* Каскад — единый контур ступенями: у каждой ячейки свои пояса, у ребра — пояса ячейки, которую оно ограждает.
     Самая высокая ячейка — дальняя левая (у амфитеатра — задний ряд), каждая следующая по шагу ниже. */
  const st = +p.cascade || 0, shc = ol.sh.cells || null;
  const cellBelts = shc ? shc.map(c => {
    const maxY = Math.max.apply(null, shc.map(q => q[1])), minX = Math.min.apply(null, shc.map(q => q[0]));
    const drop = ol.sh.cascadeRows ? (maxY - c[1]) : (maxY - c[1]) + (c[0] - minX);
    return Math.max(3, p.belts - st * drop);
  }) : [p.belts];
  const beltsMax = Math.max.apply(null, cellBelts);
  const levels = beltsMax * 2;
  const H = levels * h;
  const poly = ol.sh.kind === 'poly', square = (p.shape || 'sq') === 'sq' || p.shape === 'sqR';
  const N = ol.N;
  /* Бруски в стенке — сколько оставить, выбирает заказчик: от 2 (нижний и верхний) до всех.
     Оставленные распределяются по высоте равномерно; «низ сплошной» — все бруски в зоне снега до 490 мм.
     На месте пропущенного бруска в углу — втулка 50 мм без паза (30.09.2026): лист до неё не доходит, её торцы — под
     заглушку и уголок; от проворота её держит саморез через уголок, поэтому при пропуске брусков уголок обязателен.
     Только у квадрата: у многогранника угол не прямой. */
  const nb = beltsMax;
  let want = square ? Math.round(+p.wallBars || 0) : 0;
  if (!(want >= 2 && want < nb)) want = nb;
  const even = (a, b, k) => { if (k <= 1) return [b]; const o = []; for (let i = 0; i < k; i++) o.push(Math.round(a + i * (b - a) / (k - 1))); return o; };
  let keep = [];
  /* свой набор брусков: верхний обязателен (держит край и крышку), остальные — любые, в том числе
     можно убрать нижние: корпус встаёт на «ножки» — по углам колонны из тех же втулок */
  const ks = square && Array.isArray(p.keepSet) ? p.keepSet.map(Number).filter(j => j >= 0 && j < nb - 1) : null;
  if (ks && ks.length) keep = ks.concat([nb - 1]);
  else if (want >= nb) for (let j = 0; j < nb; j++) keep.push(j);
  else if (p.denseBottom) {
    const low = []; for (let j = 0; j < nb; j++) if (j * 2 * h < 490) low.push(j);
    keep = low.concat(even(low[low.length - 1], nb - 1, Math.max(1, want - low.length) + 1).slice(1));
  } else keep = even(0, nb - 1, want);
  keep = keep.filter((j, i) => keep.indexOf(j) === i).sort((x, y) => x - y);
  if (keep.length < 2) keep = [0, nb - 1];
  /* у отдельной стенки может быть своя раскладка: брусок убран только на этой стороне — в её углах втулки,
     соседние стенки (другая чётность уровней) не меняются. Верхний брусок стенки обязателен. */
  const beltsE = ol.edges.map(e => cellBelts[e.cell] || nb);
  const keepE = ol.edges.map(e => {
    const ov = square && p.keepEdge ? p.keepEdge[e.i] : null;
    if (beltsE[e.i] < nb) { const k = []; for (let j = 0; j < beltsE[e.i]; j++) k.push(j); return k; }   // низкая грань каскада
    if (!Array.isArray(ov)) return keep;
    let k = ov.map(Number).filter(j => j >= 0 && j < nb - 1).concat([nb - 1]);
    k = k.filter((j, i) => k.indexOf(j) === i).sort((x, y) => x - y);
    return k.length >= 2 ? k : [0, nb - 1];
  });
  const thinAny = keepE.some((k, i) => k.length < beltsE[i]);
  /* верх узла: верхний уровень брусков среди граней, сходящихся в узле. Втулки нужны только ниже него */
  const edgeTop = ol.edges.map((e, i) => 2 * keepE[i][keepE[i].length - 1] + e.parity);
  const nodeTop = ol.pts.map((_, k) => Math.max.apply(null, ol.edges.filter(e => e.ia === k || e.ib === k).map(e => edgeTop[e.i])));
  const stepAny = beltsE.some(b => b < nb);
  const thin = thinAny ? 2 : 1;
  const lift = Math.min.apply(null, keepE.map(k => k[0])) * 2 * h;   // низ корпуса над землёй: под ним только втулки по углам
  const levelOnE = ol.edges.map((e, i) => { const a = []; for (let lv = 0; lv < levels; lv++) a.push(lv % 2 === e.parity && keepE[i].indexOf((lv - e.parity) / 2) >= 0); return a; });
  /* уровень «есть» — если брусок стоит на обеих стенках этой чётности (на нём лежит полка) */
  const levelOn = [];
  for (let lv = 0; lv < levels; lv++) levelOn.push(ol.edges.filter(e => e.parity === lv % 2).every(e => levelOnE[e.i][lv]));
  const barCount = keepE.reduce((s, k) => s + k.length, 0);
  const stubList = [];
  if (thinAny || stepAny) ol.edges.forEach(e => {
    for (let lv = e.parity; lv < levels; lv += 2) if (!levelOnE[e.i][lv])
      [[e.a, 1, e.ia], [e.b, -1, e.ib]].forEach(([V, sg, k]) => { if (lv < nodeTop[k])       // над низкой гранью — только пока у узла есть бруски выше
        stubList.push({ pos: V, ang: e.ang, level: lv, n: e.n, dir: [e.d[0] * sg, e.d[1] * sg], sg, edge: e.i, j: (lv - e.parity) / 2 }); });
  });

  /* вставки по граням */
  /* 30.09.2026 (правило владельца «торцы всегда закрыты»): лист во втулку не заходит — край листа, как у сплошной
     стенки, в 29 мм от стержня, в 4 мм от торца втулки; на торце втулки встаёт обычная заглушка (2 мм), до листа 2 мм.
     Прежде при пропуске брусков лист заходил в паз втулки 57 мм и выходил из её торца — такой торец заглушкой не закрыть. */
  const clipShift = 0;
  const panels = ol.edges.map(e => {
    const mA = panelMargin(ol.turn[e.ia], w) - clipShift, mB = panelMargin(ol.turn[e.ib], w) - clipShift;
    return { width: module - mA - mB, shift: (mA - mB) / 2, parity: e.parity };
  });
  const panelH = H - 2 * h - lift;                               // лист стоит на нижнем оставленном бруске
  const panelArea = panels.reduce((s, q, i) => s + q.width * (2 * beltsE[i] * h - 2 * h - keepE[i][0] * 2 * h), 0) / 1e6;
  /* Квадрат-опора линии: в середину стенки поперёк линии входят бруски линии (Т-узел). Стержень — в центре стенки,
     сквозь отверстие Ø14 посередине её брусков; лист этой стенки — два узких, край в 27 мм от стержня, как в углах. */
  let panelListT = null, tHoles = 0, tParity = null, panelAreaT = 0;
  if (square && Array.isArray(p.lineT) && p.lineT.length) {
    const gT = w / 2 + 2; panelListT = [];
    ol.edges.forEach(e => {
      const q = panels[e.i], hE = (2 * beltsE[e.i] * h - 2 * h - keepE[e.i][0] * 2 * h) / 1e6;
      const isT = Math.abs(e.d[0]) < 0.5 && p.lineT.indexOf(e.mid[0] > 0 ? 'R' : 'L') >= 0;
      if (!isT) { panelListT.push({ edge: e.i, width: q.width, shift: q.shift }); panelAreaT += q.width * hE; return; }
      tParity = e.parity; tHoles += keepE[e.i].length;
      const s0 = q.shift - q.width / 2, s1 = q.shift + q.width / 2;
      panelListT.push({ edge: e.i, width: -gT - s0, shift: (s0 - gT) / 2, tHalf: true });
      panelListT.push({ edge: e.i, width: s1 - gT, shift: (s1 + gT) / 2, tHalf: true });
      panelAreaT += (s1 - s0 - 2 * gT) * hE;
    });
  }
  const panelW = Math.max.apply(null, panels.map(q => q.width));

  /* внутренний просвет */
  const clear = poly ? module / Math.tan(Math.PI / N) - w : module - w;
  const outerX = ol.spanX + w, outerY = ol.spanY + w;

  /* углы: выпуклые прямые — под угловой профиль, входящие — только заглушки */
  const convex90 = ol.turn.filter(t => Math.abs(t - Math.PI / 2) < 0.05).length;
  const concave = ol.turn.filter(t => t < -0.05).length;
  const trimsAllowed = !poly;

  const stock = (pr.stocks.indexOf(p.stock) >= 0) ? p.stock : pr.stocks[pr.stocks.length - 1];
  const cut = cutPlan(stock, L);

  /* Полка-решётка — решена для квадрата. Для остальных форм корпус ставится на землю
     без дна: высокая клумба, грядка, ограждение дерева. */
  const slatsPer = Math.max(3, Math.round(clear / 100));
  const slatLen = module;
  const slatSpan = clear / 2 - w / 2 - 5;
  const slatPos = [];
  for (let i = 0; i < slatsPer; i++) slatPos.push(-slatSpan + i * (2 * slatSpan) / (slatsPer - 1));
  /* Ярус полки, лежащий на стенке с Т-узлом, заходит концами в те же промежутки, что и бруски линии:
     отрезок у середины сдвигают за брусок линии (средний — заменяют двумя по сторонам) */
  const slatPosT = Array.isArray(p.lineT) && p.lineT.length ? (() => {
    const lim = w + 2, out = [];
    slatPos.forEach(c => { if (Math.abs(c) >= lim) out.push(c); else if (Math.abs(c) < 1) out.push(-lim, lim); else out.push(Math.sign(c) * lim); });
    return out.sort((a, b) => a - b);
  })() : null;
  const slatCut = cutPlan(stock, slatLen);
  /* Горшок и его вес. Один ярус — отрезки лежат на двух стенках; второй ярус нужен,
     только если одному не хватает прочности или жёсткости с учётом ползучести ДПК. */
  const pot = potEstimate(clear, H);
  const potKg = +p.potKg > 0 ? +p.potKg : pot.kg;
  const geo = { w, h, slatLen, slatsPer, kgm: pr.kgm };
  const check1 = shelfCheck(geo, 1, potKg), check2 = shelfCheck(geo, 2, potKg);
  const layersAuto = check1.pass ? 1 : 2;
  const layers = (+p.layers === 1 || +p.layers === 2) ? +p.layers : layersAuto;
  const shelfOn = square && p.shelves > 0;
  /* лист между оставленными брусками: лето — ветер, зима — ещё и снег у стенки */
  const pWind = 0.5 * 1.225 * p.wind * p.wind * 1.3 * 1e-6;
  const pnS = PANELS[p.panel] || PANELS.pc4m;
  const noPanels = p.panel === 'none';
  const clipsOn = false;                                       // втулок с пазом больше нет (30.09.2026): втулка 50 мм, лист до неё не доходит
  const keepWorst = keepE.slice().sort((a, b) => Math.max.apply(null, b.slice(1).map((j, i) => j - b[i])) - Math.max.apply(null, a.slice(1).map((j, i) => j - a[i])))[0];
  const naChk = { s: 0, sigma: 0, sAllow: 0, defl: 0, limit: 0, freq: 0, pass: true, na: true };
  const thinCheck = { summer: noPanels ? naChk : wallCheck(keepWorst, h, pnS, pWind, false, clipsOn, panels[0].width),
                      winter: noPanels ? naChk : wallCheck(keepWorst, h, PANELS.pc4m, pWind, true, clipsOn, panels[0].width),
                      winterDpk: noPanels ? naChk : wallCheck(keepWorst, h, PANELS.dpk8, pWind, true, clipsOn, panels[0].width), noPanels,
                      bars: keep.length, of: nb, spanMax: Math.max.apply(null, keep.slice(1).map((j, i) => (j - keep[i]) * 2 * h)),
                      barShare: keep.length * h / (nb * 2 * h), panel: pnS.name };
  /* Вставки по ярусам (лето): у каждой стороны — свой лист между любыми соседними брусками, любого цвета
     или никакого. Паз сквозной, поэтому лист над пустым ярусом опирается на 2 самореза-упора, вкрученных
     изнутри в брусок под ним (иначе провалится вниз). Соседние листы стоят друг на друге. Зимой — как раньше,
     один молочный лист на стенку: упоры выкручивают. Втулка в пустом ярусе листом не держится — нужен уголок. */
  const rowsMode = square && p.segMode === 'rows' && p.season !== 'winter' && !noPanels && !panelListT;
  let segList = null, panelsByMat = null, stopScrews = 0;
  let plainStubs = noPanels ? stubList.length : stubList.filter(st => st.j < keepE[st.edge][0]).length;   // втулки ниже листа листом не держатся
  if (rowsMode) {
    segList = []; panelsByMat = {};
    ol.edges.forEach(e => {
      const ke = keepE[e.i];
      for (let i = 0; i + 1 < ke.length; i++) {
        const ja = ke[i], jb = ke[i + 1], key = e.i + ':' + ja;
        /* значение — 'материал|цвет': разные цвета одного материала — разные листы в закупке */
        const val = (p.segs || {})[key], vm = val ? String(val).split('|')[0] : '';
        const grp = PANELS[vm] ? String(val) : p.panel + (p.panelTag ? '|' + p.panelTag : ''), mat = grp.split('|')[0];
        const span = (jb - ja) * 2 * h, width = panels[e.i].width;
        segList.push({ edge: e.i, ja, jb, key, mat, grp, span, width, z0: (2 * ja + e.parity) * h + h / 2, z1: (2 * jb + e.parity) * h + h / 2 });
        if (mat !== 'none') panelsByMat[grp] = (panelsByMat[grp] || 0) + width * span / 1e6;
      }
    });
    ol.edges.forEach(e => {
      const sg = segList.filter(s => s.edge === e.i);
      sg.forEach((s, i) => { if (s.mat !== 'none' && i > 0 && sg[i - 1].mat === 'none') stopScrews += 2; });
    });
    plainStubs = stubList.filter(st => { const s = segList.find(q => q.edge === st.edge && q.ja < st.j && st.j < q.jb); return !s || s.mat === 'none'; }).length;
    let worst = null;
    segList.forEach(s => {
      if (s.mat === 'none') return;
      const c = panelCheck(PANELS[s.mat], s.span, pWind);
      c.ratio = Math.max(c.sigma / c.sAllow, c.defl / c.limit); c.panel = PANELS[s.mat].name;
      if (!worst || c.ratio > worst.ratio) worst = c;
    });
    thinCheck.summer = worst || naChk;
    thinCheck.panel = worst ? worst.panel : 'листов нет';
  }
  const slatCount = shelfOn ? slatsPer * layers + (slatPosT ? slatPosT.length - slatsPer : 0) : 0;
  const saucerOn = shelfOn && p.saucer !== false && p.season !== 'winter';
  const saucer = saucerSpec(pot);

  /* стержни и крышка: стержни прямые, кончаются в глухом отверстии бруска крышки */
  const ring = RINGS[0], ringH = 0, rodArcs = [], bendSigma = 0, bendR = Infinity;
  /* Ножки: нижний брусок поднят — от земли до него по углам колонна втулок на стержне. Сбоку её гнёт ветер
     и толчок 150 Н (задели ногой, облокотились). Работают стержень Ø12 и уголок 60×60, привинченный к каждой
     втулке и к брускам над ней, — консоль длиной до нижнего бруска. Без уголка стержень один — гнётся заметно,
     поэтому при ножках уголок обязателен (как у любых втулок без листа). Зимой стержень в грунте — жёстче. */
  let legs = null;
  if (lift > 0) {
    const Ftot = 0.5 * 1.225 * p.wind * p.wind * 1.3 * ((Math.max(outerX, outerY) / 1000) * ((H - lift) / 1000) + 0.15) + 150;
    const Fl = Ftot / N, Ll = lift;
    const Irod = Math.PI * Math.pow(p.anchorD, 4) / 64, EIrod = GFRP_E * Irod;
    const EItrim = LEG_TRIM.E * LEG_TRIM.I;
    const calc = EI => { const M = Fl * Ll, defl = Fl * Math.pow(Ll, 3) / (3 * EI);
      return { M, defl, sigmaRod: M * (EIrod / EI) * (p.anchorD / 2) / Irod }; };
    const bare = calc(EIrod), withTrim = calc(EIrod + EItrim);
    const limit = Math.min(4, Ll / 100);
    legs = { lift, len: Ll, F: Ftot, Fleg: Fl, limit, bare, withTrim, sAllow: GFRP_ALLOW,
             passBare: bare.defl <= limit && bare.sigmaRod <= GFRP_ALLOW, pass: withTrim.defl <= limit && withTrim.sigmaRod <= GFRP_ALLOW,
             stubs: stubList.filter(st => st.j < keepE[st.edge][0]).length };
  }
  const wsp = square && WHEELS[p.wheels] ? WHEELS[p.wheels] : null;
  const wheels = wsp ? { spec: wsp, n: N, brakes: Math.min(N, Math.max(2, +p.wheelBrakes || 2)), h: wsp.H,
                         fits: Math.max(wsp.plate[0], wsp.plate[1]) <= w + 2 || !!wsp.adapter, adapter: wsp.adapter || null } : null;
  const roof = roofSpec(p, { module, w, h, L, kgm: pr.kgm, square });
  /* столешница */
  let table = null;
  if (square && (p.table === 'solid' || p.table === 'hole') && !(roof && roof.h)) {
    const ov = TABLE_OV.indexOf(+p.tableOv) >= 0 ? +p.tableOv : 0;
    /* вынос — только вдоль планок (две стороны): поперечины спрятаны внутри контура корпуса и не видны;
       спереди и сзади столешница заподлицо с корпусом. Торцы планок закрыты заглушками. */
    const lenX = Math.round(outerX + 2 * ov), widY = Math.round(outerY);
    const nPl = Math.max(2, Math.floor((widY + TABLE.gap) / (w + TABLE.gap)));
    /* проём квадратный: планки режутся прямо, торцы у проёма тоже под заглушки; каждый кусок лежит на стенке и поперечине */
    const holeHalf = p.table === 'hole' ? Math.floor((clear / 2 - w - 10) / 10) * 10 : 0, hole = 2 * holeHalf;
    const batLen = Math.round(clear + w);                         // поперечина — концами на серединах верхних брусков передней и задней стенки
    const sec = lagSection(w, h), E = pr.E || 3000;
    const Pp = TABLE.P / 2, span = module;                       // 750 Н на две планки посередине пролёта
    const mid = { sigma: Pp * span / 4 / sec.W, defl: Pp * Math.pow(span, 3) / (48 * E * sec.I), limit: span / 150 };
    mid.pass = mid.sigma <= TABLE.sAllow && mid.defl <= mid.limit;
    const Pe = TABLE.Pedge / 2;                                  // 500 Н на краю выноса — на две планки (или две поперечины)
    const edge = ov ? { sigma: Pe * ov / sec.W, defl: Pe * Math.pow(ov, 3) / (3 * E * sec.I), limit: Math.max(1, ov / 75) } : null;
    if (edge) edge.pass = edge.sigma <= TABLE.sAllow && edge.defl <= edge.limit;
    const tot = nPl * w + (nPl - 1) * TABLE.gap;
    const cutPl = hole ? Array.from({ length: nPl }, (_, i) => -tot / 2 + w / 2 + i * (w + TABLE.gap)).filter(y => Math.abs(y) - w / 2 < holeHalf).length : 0;
    /* заглушки: торцы планок и оба торца поперечин — поперечина кончается над верхним бруском стенки, её торец виден в щели под столешницей */
    table = { mode: p.table, ov, lenX, widY, nPl, hole, holeHalf, battens: 2, batLen, mid, edge, cutPl,
              pieces: nPl + cutPl + 2, lagLen: nPl * lenX + 2 * batLen, screws: (nPl + cutPl) * 2 + 4, area: lenX * widY / 1e6,
              plugs: (nPl + cutPl) * 2 + 4, batPlugs: 4 };
  }
  /* подсветка: периметр по внутренней грани */
  /* Торцы по углам: у каждого угла свои — заглушки своего цвета, уголок своего цвета или открыто.
     Втулки без листа в углу держит от проворота только саморез через уголок — там уголок обязателен. */
  const nodeOf = V => ol.pts.findIndex(q => Math.abs(q[0] - V[0]) < 0.5 && Math.abs(q[1] - V[1]) < 0.5);
  const isPlain = st => {
    if (noPanels || !clipsOn) return true;                          // лист во втулку не заходит — от проворота её держит саморез через уголок
    if (segList) { const s = segList.find(q => q.edge === st.edge && q.ja < st.j && st.j < q.jb); return !s || s.mat === 'none'; }
    return st.j < keepE[st.edge][0];
  };
  const plainAt = ol.pts.map(() => 0), stubAt = ol.pts.map(() => 0);
  stubList.forEach(st => { const k = nodeOf(st.pos); if (k < 0) return; stubAt[k]++; if (isPlain(st)) plainAt[k]++; });
  const endsAt = ol.pts.map(() => 0);
  ol.edges.forEach(e => { const ka = nodeOf(e.a), kb = nodeOf(e.b), n = keepE[e.i].length; if (ka >= 0) endsAt[ka] += n; if (kb >= 0) endsAt[kb] += n; });
  const gEnds = closedEnds(p, p.ends);
  const nodeEnds = ol.pts.map((V, k) => {
    const convex = Math.abs(ol.turn[k] - Math.PI / 2) < 0.05;
    const ov = square && p.nodeEnds ? p.nodeEnds[k] : null;
    const forced = !!(plainAt[k] && thin > 1 && trimsAllowed && convex);
    let t = ov && ov.t ? closedEnds(p, ov.t) : gEnds;
    if (t === 'trims' && (!trimsAllowed || !convex)) t = 'plugs';
    if (forced) t = 'trims';
    const c = ov && ov.c !== undefined && ov.t === t ? +ov.c : (t === 'trims' ? +p.trimColor || 0 : +p.plugColor || 0);
    return { k, t, c, forced, convex, plain: plainAt[k], stubs: stubAt[k], barEnds: endsAt[k], hN: (nodeTop[k] + 1) * h };
  });
  /* каждая заглушка по отдельности: торец бруска (a — у начала стенки, b — у конца) и торец втулки с угла */
  const plugList = [];
  ol.edges.forEach(e => { const ka = nodeOf(e.a), kb = nodeOf(e.b);
    keepE[e.i].forEach(j => { plugList.push({ key: e.i + ':' + j + ':a', node: ka }); plugList.push({ key: e.i + ':' + j + ':b', node: kb }); }); });
  stubList.forEach(st => plugList.push({ key: 's' + st.edge + ':' + st.j + ':' + (st.sg > 0 ? 'a' : 'b'), node: nodeOf(st.pos) }));
  /* второй торец втулки смотрит вдоль стенки внутрь яруса — уголок его не закрывает, заглушка нужна всегда.
     С 30.09.2026 лист во втулку не заходит, поэтому этот торец закрывается обычной заглушкой всегда (slotEnds = 0) */
  stubList.forEach(st => { st.plain = isPlain(st); });              // в ярусе без листа (ножки, пустой ярус) лист сквозь втулку не идёт
  const innerOk = st => !clipsOn || st.plain;
  stubList.forEach(st => { if (innerOk(st)) plugList.push({ key: 's' + st.edge + ':' + st.j + ':' + (st.sg > 0 ? 'a' : 'b') + 'i', node: nodeOf(st.pos), always: true }); });
  const innerStubPlugs = stubList.filter(innerOk).length, slotEnds = stubList.length - innerStubPlugs;
  const lsp = LIGHTS[p.light] || null;
  const light = lsp ? { spec: lsp, len: Math.round(N * clear) } : null;
  const ext = roof.h ? roof.h + h - 4 : 0;                          // стержень кончается в глухом отверстии нижнего бруска крышки
  const summerRod = H - 2 + ext;
  const rodLen = H + p.anchorL - h / 2 + ext;
  const rodLenBack = rodLen + (roof.winterTilt ? roof.rise : 0);   // при наклоне задние стержни выше на подъём

  return { hole: !!ol.sh.hole, cellBelts, beltsE, edgeTop, nodeTop, cascade: stepAny, pr, sz, L, w, h, module, levels, H, ol, poly, square, N, sides: N,
           outer: Math.max(outerX, outerY), outerX, outerY, clear, barCount,
           panels, panelW, panelH, panelArea: panelsByMat ? Object.keys(panelsByMat).reduce((a, k) => a + panelsByMat[k], 0) : (panelListT ? panelAreaT : panelArea),
           panelList: panelListT, lineT: panelListT ? p.lineT : null, tHoles, tParity, slatPosT, rot90: !!((ol.sh.rot || 0) % 2),
           rodLen, summerRod, stock, cut, rowsMode, segList, panelsByMat, stopScrews, plainStubs: clipsOn ? plainStubs : stubList.length,
           bearing: (w - 8) / 2, convex90, concave, trimsAllowed,
           slatsPer, slatLen, slatCount, slatPos, slatCut, crossings: (slatCount && layers === 2) ? slatsPer * slatsPer : 0,
           layers, layersAuto, check1, check2, pot, potKg, saucerOn, saucer,
           ring, ringH, rodArcs, bendSigma, bendR, ext, roof, rodLenBack,
           thin, keep, keepE, levelOnE, wallBars: keep.length, levelOn, stubList, stubs: stubList.length, thinCheck, clips: 0, slottedStubs: clipsOn ? stubList.length : 0,
           noPanels, solidity: noPanels ? keep.length * h / H : 1 - lift / H, lift, legs, wheels, table, light, nodeEnds, plugList, innerStubPlugs, slotEnds };
}
/* Горшок под размер кашпо: конус с дном 0,74 от верха. Мокрый грунт ≈ 1,3 кг/л, сам горшок ≈ 2 кг. */
function potEstimate(clear, H) {
  const R = Math.min(0.46 * clear, 260), Hp = Math.min(0.78 * clear, H * 0.62), r = 0.74 * R;
  const litres = Math.PI / 3 * Hp * (R * R + R * r + r * r) / 1e6;
  return { R, H: Hp, r, litres, kg: Math.round(litres * 1.3 + 2) };
}
/* Поддон под горшок: наружный Ø = дно горшка + 22 мм на сторону.
   Цены — ОБИ (Роксор Ø34 — 79 ₽, Ø36 — 103 ₽), ВсеИнструменты (от 44 ₽, Bama Ø40 — 1 250 ₽). */
function saucerSpec(pot) {
  const D = Math.round(2 * (pot.r + 22));
  if (D <= 250) return { D, price: 44, src: 'ВсеИнструменты — поддоны от 44 ₽' };
  if (D <= 340) return { D, price: 79, src: 'ОБИ — поддон Ø34 см, 79 ₽' };
  if (D <= 360) return { D, price: 103, src: 'ОБИ — поддон Ø36 см, 103 ₽' };
  if (D <= 400) return { D, price: 1250, src: 'ВсеИнструменты — Bama Spa Ø40 см, 1 250 ₽' };
  return { D, price: 1250, src: 'поддона Ø' + D + ' мм в найденных каталогах нет — оценка по Ø40 см' };
}
/* Проверка полки-решётки. Худший случай: горшок давит сосредоточенно в середине пролёта.
   Два яруса делят нагрузку между всеми четырьмя стенками — принято 50/50.
   ДПК на изгиб: предел ≈ 20–25 МПа, допустимо 8 МПа; прогиб под длительной нагрузкой
   удваивается (ползучесть), предел L/200. */
function shelfCheck(geo, layers, potKg) {
  const g = 9.81, E = 3000, sec = lagSection(geo.w, geo.h), L = geo.slatLen, n = geo.slatsPer;
  const slatKg = layers * n * geo.kgm * L / 1000;
  const P = 1.5 * (potKg + slatKg) * g;
  const Pone = P * (layers === 2 ? 0.5 : 1) / n;
  const sigma = Pone * L / 4 / sec.W;
  const defl = Pone * Math.pow(L, 3) / (48 * E * sec.I);
  const deflLong = defl * 2;
  return { layers, P, sigma, defl, deflLong, limit: L / 200, sigmaAllow: 8,
           pass: sigma <= 8 && deflLong <= L / 200 };
}
function lagSection(w, h) {
  const cw = w / 2 - 4 - 5, ch = h - 8, kw = 4, kh = h - 12;
  const I = (w * Math.pow(h, 3) - 2 * cw * Math.pow(ch, 3) - kw * Math.pow(kh, 3)) / 12;
  return { I, W: I / (h / 2) };
}
/* торцы изделия: только заглушки или уголок; «открыто» (и всё неизвестное) — заглушки. Открытые торцы — лишь для расчёта с p.allowOpenEnds */
function closedEnds(p, e) {
  if (e === 'trims') return 'trims';
  if (e === 'open' && p && p.allowOpenEnds === true) return 'open';
  return 'plugs';
}
function endsOf(p, d) {
  if (d.nodeEnds && d.nodeEnds.length) {
    const ts = d.nodeEnds.map(n => n.t);
    return ts.every(t => t === ts[0]) ? ts[0] : ts.indexOf('trims') >= 0 ? 'trims' : ts.indexOf('plugs') >= 0 ? 'plugs' : 'open';
  }
  /* втулку без листа (нет листов или пустой ярус) от проворота держать нечем — только уголок с саморезом в каждую */
  if (d.plainStubs && d.thin > 1 && d.trimsAllowed) return 'trims';
  const e = closedEnds(p, p.ends);
  return (e === 'trims' && !d.trimsAllowed) ? 'plugs' : e;
}

/* ---------- 11. Масса ---------------------------------------------------- */
function mass(p) {
  const u = unitOf(p);
  if (u) return Object.assign(sumGroups(u, mass), { barKg: mass(u.mainPu).barKg, units: u.n, perUnit: mass(u.mainPu).totalKg });
  const d = derive(p), pr = d.pr, pn = PANELS[p.panel];
  const barKg = pr.kgm * d.L / 1000;
  const bodyKg = d.custom ? pr.kgm * d.pieces.reduce((s, x) => s + x, 0) / 1000 : barKg * d.barCount + (d.stubs || 0) * pr.kgm * (d.slottedStubs ? STUB_LEN : d.w) / 1000;
  const panelKg = d.panelsByMat ? Object.keys(d.panelsByMat).reduce((a, k) => a + PANELS[k.split('|')[0]].kgm2 * d.panelsByMat[k], 0) : pn.kgm2 * d.panelArea;
  const rodLenNow = p.season === 'winter' ? d.rodLen : d.summerRod;
  const rodKg = d.N * Math.PI * Math.pow(p.anchorD / 2, 2) * rodLenNow / 1e9 * 2000;
  const shelfKg = d.slatCount * pr.kgm * d.slatLen / 1000;
  const ends = endsOf(p, d);
  const trimKg = d.nodeEnds && d.nodeEnds.length
    ? d.nodeEnds.reduce((s, n) => s + (n.t === 'trims' ? ((n.hN || d.H) / 1000) * ENDS.trims.kgm : n.t === 'plugs' ? (n.barEnds + n.stubs) * 0.004 : 0), 0) + alwaysPlugs(d) * 0.004
    : ends === 'trims' ? d.convex90 * (d.H / 1000) * ENDS.trims.kgm + (extraPlugs(d) + alwaysPlugs(d)) * 0.004
    : ends === 'plugs' ? (d.barCount * 2 + (d.stubs || 0) + alwaysPlugs(d)) * 0.004 : 0;
  const r = d.roof || {};
  const roofKg = r.h ? ROOF_BARS * barKg + (p.season === 'winter' ? r.sheetKg : 0) : 0;   // боковые бруски зимой хранятся в комплекте
  const saucerKg = d.saucerOn ? 0.25 : 0;
  const wheelKg = d.wheels && p.season !== 'winter' ? d.wheels.n * (d.wheels.spec.kg + 4 * 0.004) : 0;
  const tableKg = d.table && p.season !== 'winter' ? pr.kgm * d.table.lagLen / 1000 : 0;
  const hardKg = 0.15 + saucerKg + roofKg + wheelKg + tableKg;
  const sqKg = d.lineSquares ? d.lineSquares.reduce((s, q) => s + mass(q.p).totalKg, 0) : 0;
  return { barKg, bodyKg, panelKg, rodKg, shelfKg, trimKg, hardKg, sqKg,
           totalKg: bodyKg + panelKg + rodKg + shelfKg + trimKg + hardKg + sqKg };
}

/* ---------- 12. Упаковка и доставка ------------------------------------
   Все отрезки лаги — слоями на дне; сверху плашмя вставки, поддон, стержни и мелочь;
   уголки, если выбраны, — пакетом рядом. Кольцо шире коробки едет отдельно.
   Объёмный вес по коэффициенту 1:5000 см³/кг. */
function packing(p) {
  const u = unitOf(p);
  if (u) {                                   // каждый квадрат — своя коробка
    const k = packing(u.mainPu), sm = sumGroups(u, packing);
    return Object.assign({}, k, { boxes: u.n, flatV: sm.flatV, asmV: sm.asmV, flatVol: sm.flatVol,
      asmVol: sm.asmVol, flatBill: sm.flatBill, asmBill: sm.asmBill });
  }
  const d = derive(p), m = mass(p), pn = PANELS[p.panel];
  const inner = d.custom ? Math.max(d.panelH, 300) + 10 : Math.max(d.module, d.panelW) + 10;
  /* втулки (50 мм + 2 заглушки) лежат по несколько в ряд вдоль ячейки коробки — раньше их не считали, и они налезали на вставки и поддон */
  const stubPer = Math.max(1, Math.floor((Math.max(d.L, d.module) - 10) / (d.w + 6))), stubSlots = d.custom ? 0 : Math.ceil((d.stubs || 0) / stubPer);
  const pieces = d.custom ? d.pieces.length : d.barCount + d.slatCount + (d.roof && d.roof.h ? ROOF_BARS : 0) + (d.table ? d.table.pieces : 0) + stubSlots;
  const across = Math.max(1, Math.floor(inner / d.w));
  const layers = Math.ceil(pieces / across);
  const boxL = d.custom ? d.longest + 25 : Math.max(d.L, d.module) + 25;
  const boxW = Math.max(across * d.w, inner) + 20;
  const topPart = Math.max(d.saucerOn ? 64 : 14, endsOf(p, d) === 'trims' ? 66 : 0);   // стержни лежат поверх бортика поддона
  const nPan = d.segList ? d.segList.filter(s => s.mat !== 'none').length : (d.panelList ? d.panelList.length : d.ol.edges.length);
  const boxH = layers * d.h + nPan * pn.t + topPart + 20;
  const ringSeparate = false;
  const rodsSeparate = d.summerRod > boxL - 10;
  const flatV = boxL * boxW * boxH / 1e9;
  const asmV = d.outerX * d.outerY * (d.H + 20) / 1e9;
  const K = 5000;
  const flatVol = flatV * 1e6 / K, asmVol = asmV * 1e6 / K;
  const flatBill = Math.max(flatVol, m.totalKg), asmBill = Math.max(asmVol, m.totalKg);
  return { boxL: Math.round(boxL), boxW: Math.round(boxW), boxH: Math.round(boxH), boxes: 1, longBox: boxL > 1500,
           across, layers, pieces, stubPer, stubSlots, ringSeparate, rodsSeparate,
           flatV, asmV, flatVol, asmVol, flatBill, asmBill,
           saving: (asmBill - flatBill) / asmBill * 100 };
}

/* ---------- 13. Крепёж --------------------------------------------------
   Вставка снизу встаёт на нижний брусок: у него паз прорезан только в верхней стенке.
   Корпус держится на стержнях собственным весом. */
/* Торцы, которые уголок не закрывает: на входящем углу — по одному на каждом венце;
   у секции под заказ — оба торца каждого бруска перемычки (выходят на длинные стенки). */
function extraPlugs(d) {
  return d.custom ? d.partitions.length * d.levels : d.concave * d.levels;
}
/* Заглушки, которые ставятся при любых торцах (и при уголке): внутренний торец втулки без паза, оба торца каждого
   отрезка полки-решётки, оба торца брусков крышки (уголок до крышки не доходит). Столешница — своей строкой.
   С 30.09.2026 втулок с пазом нет: лист до втулки не доходит, внутренний торец втулки — всегда заглушка (d.slotEnds = 0). */
function alwaysPlugs(d) {
  return innerPlugs(d) + (d.slatCount || 0) * 2 + (d.roof && d.roof.h ? ROOF_BARS * 2 : 0);
}
function innerPlugs(d) {
  return d.innerStubPlugs !== undefined ? d.innerStubPlugs : (d.slottedStubs ? 0 : (d.stubs || 0));
}
function hardware(p) {
  const u = unitOf(p);
  if (u) {
    const items = [];
    u.groups.forEach(g => hardware(g.pu).items.forEach(x => {
      const same = items.find(y => y.name === x.name && y.price === x.price);
      if (same) { same.qty += x.qty * g.count; same.min += (x.min || 0) * g.count; }
      else items.push(Object.assign({}, x, { qty: x.qty * g.count, min: (x.min || 0) * g.count }));
    }));
    return { items, total: items.reduce((s2, x) => s2 + x.qty * x.price, 0), minutes: items.reduce((s2, x) => s2 + x.min, 0) };
  }
  const d = derive(p), ends = endsOf(p, d), summer = p.season !== 'winter';
  const items = [];
  const plugQ = d.barCount * 2 + (d.stubs || 0) + innerPlugs(d);   // у втулки — с угла и внутренний торец (у втулки с пазом внутренний занят листом)
  const NE = d.nodeEnds && d.nodeEnds.length ? d.nodeEnds : null;
  const gpc = +p.plugColor || 0, slatPl = (d.slatCount || 0) * 2, roofPl = d.roof && d.roof.h ? ROOF_BARS * 2 : 0;
  if (NE) {                                                  // по углам: заглушки и уголки — каждого цвета своей строкой
    const byC = {}, pc = p.plugColors || {};
    (d.plugList || []).forEach(q => { const n = NE[q.node]; if (!n || (n.t !== 'plugs' && !q.always)) return;
      const c = pc[q.key] !== undefined ? +pc[q.key] : n.t === 'plugs' ? n.c : gpc; byC[c] = (byC[c] || 0) + 1; });
    if (roofPl) d.ol.edges.forEach(e => [e.a, e.b].forEach(V => {   // бруски крышки: по торцу у каждого угла, цвет — как у заглушек угла
      const k = d.ol.pts.findIndex(q => Math.abs(q[0] - V[0]) < 0.5 && Math.abs(q[1] - V[1]) < 0.5), n = NE[k];
      const c = n && n.t === 'plugs' ? n.c : gpc; byC[c] = (byC[c] || 0) + 1; }));
    Object.keys(byC).forEach(c => { const col = ENDS.plugs.colors[+c] || ENDS.plugs.colors[0];
      items.push({ name:'Заглушка торцевая пластиковая · ' + col.name.toLowerCase() + ' (' + col.stock + ')', qty: byC[c], unit:'шт', price: ENDS.plugs.price,
        note:'в торцы брусков и втулок' + (roofPl ? ' и брусков крышки' : '') + ', на посадке без клея' + (innerPlugs(d) ? '; внутренний торец втулки — всегда' : '') +
             (d.slotEnds ? '; внутренний торец втулки с пазом (' + d.slotEnds + ' шт) занят листом — обычной заглушкой не закрыть, решает владелец' : '') + ' · ' + ENDS.plugs.src, min: byC[c] * ENDS.plugs.min }); });
    const T = d.slottedStubs ? TRIM60 : { size: '50×50', price_m: ENDS.trims.price_m, stick: ENDS.trims.stick, src: ENDS.trims.src };
    const byT = {};
    NE.filter(n => n.t === 'trims').forEach(n => { const key = n.c + '|' + (n.hN || d.H); byT[key] = (byT[key] || 0) + 1; });
    Object.keys(byT).forEach(key => { const c = +key.split('|')[0], hT = +key.split('|')[1], col = ENDS.trims.colors[c] || ENDS.trims.colors[0];
      items.push({ name:'Угловой профиль ДПК ' + T.size + ' × ' + hT + ' мм · ' + col.name.toLowerCase(), qty: byT[key], unit:'шт',
        price: Math.round(T.price_m * hT / 1000),
        note:(d.slottedStubs ? 'шире обычного: полка закрывает выступ втулок 7 мм · ' : '') + T.src + (NE.some(n => n.forced) ? ' · в углах с втулками без листа — обязателен' : ''), min: byT[c] * 1.5 }); });
    const nT = NE.filter(n => n.t === 'trims'), scr = nT.length * 6 + nT.reduce((s, n) => s + n.plain, 0);
    if (scr) items.push({ name:'Саморез нержавеющий 4,5×25', qty: scr, unit:'шт', price: 6,
      note:'уголок крепится в торцы брусков — в центральный канал лаги; втулки без листа — ещё по саморезу в каждую', min: scr * 0.3 });
  }
  if (!NE && ends === 'plugs')
    items.push({ name:'Заглушка торцевая пластиковая', qty: plugQ + roofPl, unit:'шт', price: ENDS.plugs.price,
      note:'в каждый торец бруска' + (d.stubs ? ' и торцы втулок' : '') + ', на посадке без клея · ' + ENDS.plugs.src, min: (plugQ + roofPl) * ENDS.plugs.min });
  if (slatPl) {
    const col = ENDS.plugs.colors[gpc] || ENDS.plugs.colors[0];
    items.push({ name:'Заглушка торцевая пластиковая · ' + col.name.toLowerCase() + ' — в торцы полки-решётки', qty: slatPl, unit:'шт', price: ENDS.plugs.price,
      note:'оба торца каждого отрезка полки: конец лежит в промежутке стенки и виден сквозь прозрачный лист и без листа · ' + ENDS.plugs.src, min: slatPl * ENDS.plugs.min });
  }

  if (d.stopScrews)
    items.push({ name:'Саморез-упор 4,2×45 нержавеющий — под лист над пустым ярусом', qty: d.stopScrews, unit:'шт', price: 3,
      note:'2 на лист: вкручивается с внутренней грани бруска поперёк, через стенку и ребро; стержень пересекает паз — лист стоит на нём и не проваливается. Снаружи не виден; зимой выкручивают. Схема — «P-02 саморез-упор схема.png»; цена — оценка', min: d.stopScrews * 0.3 });
  if (d.stubs)
    items.push({ name: d.slottedStubs ? 'Втулка ДПК 57 мм с пазом — отрезок той же лаги' : 'Втулка ДПК 50×50×30 — отрезок той же лаги', qty: d.stubs, unit:'шт', price: 0,
      note: d.line ? 'на свободных концах линии — держат шаг по высоте; материал — в раскрое лаги'
                   : 'в углах вместо пропущенных брусков — держат шаг по высоте; лист проходит сквозь паз втулки и держит её от проворота; материал — в раскрое лаги', min: d.stubs * 0.3 });
  if (!NE && ends === 'trims') {
    /* При пропуске брусков — уголок 60×60: полка заходит на 10 мм за торец втулки и закрывает прихват
       (губки 5 мм, кончаются за 3 мм до края полки). Уголок 50×50 кончается ровно на торце втулки — прихват торчал бы. */
    const T = d.slottedStubs ? TRIM60 : { size: '50×50', price_m: ENDS.trims.price_m, stick: ENDS.trims.stick, src: ENDS.trims.src };
    const per = Math.floor((T.stick + 3) / (d.H + 3));
    items.push({ name:'Угловой профиль ДПК ' + T.size + ' × ' + d.H + ' мм', qty: d.convex90, unit:'шт',
      price: Math.round(T.price_m * d.H / 1000),
      note: per + ' шт с хлыста ' + T.stick / 1000 + ' м' + (d.slottedStubs ? ' · шире обычного: полка закрывает выступ втулок 7 мм' : '') + ' · ' + T.src, min: d.convex90 * 1.5 });
    const scr = d.convex90 * 6 + (d.plainStubs || 0);    // втулки без листа — ещё по саморезу в каждую
    items.push({ name:'Саморез нержавеющий 4,5×25', qty: scr, unit:'шт', price: 6,
      note:'уголок крепится в торцы брусков — в центральный канал лаги, который сделан под саморез' +
           '', min: scr * 0.3 });
    const xp = extraPlugs(d) + innerPlugs(d) + roofPl;
    if (xp)
      items.push({ name:'Заглушка торцевая пластиковая', qty: xp, unit:'шт', price: ENDS.plugs.price,
        note: (d.custom ? 'торцы перемычек выходят на длинные стенки — уголок их не закрывает'
                        : 'на входящих углах уголок не ставится — торцы закрываются заглушками') + (innerPlugs(d) ? '; внутренний торец каждой втулки' : '') + (roofPl ? '; торцы брусков крышки — уголок до них не доходит' : ''), min: xp * ENDS.plugs.min });
  }
  if (d.custom)
    items.push({ name:'Саморез нержавеющий 4,5×60', qty: d.starters.length * 2, unit:'шт', price: 8,
      note:'нижний добор притянут к бруску над ним через канал под саморез — грунт его не выдавит', min: d.starters.length * 1.5 });
  if (d.crossings)
    items.push({ name:'Саморез нержавеющий 4,5×60', qty: d.crossings, unit:'шт', price: 8,
      note:'два яруса решётки: по одному на каждое пересечение отрезков', min: 0 });
  if (summer && d.saucerOn)
    items.push({ name:'Поддон пластиковый Ø' + d.saucer.D + ' мм', qty: 1, unit:'шт', price: d.saucer.price,
      note:'покупной, стоит на решётке свободно — вынимается, чтобы слить воду и помыть · ' + d.saucer.src, min: 0.5 });
  const rf = d.roof;
  if (rf && rf.h) {
    ROOF_SCREWS.forEach(sc => items.push({ name: sc.name, qty: sc.qty, unit:'шт', price: sc.price,
      note: sc.note + '; ветер снизу поднимает крышку сильнее, чем она весит; цена — оценка', min: sc.season === (summer ? 'summer' : 'winter') ? sc.qty * 0.8 : 0 }));
    if (!summer && !rf.noSheet)
      items.push({ name:'Лист крышки — ' + rf.sheetName + ', ' + Math.round(rf.width) + '×' + Math.round(rf.len) + ' мм, ровно в пазах',
        qty: 1, unit:'шт', price: Math.round(rf.sheetPrice), note:'вставляется в пазы передней и задней пары · ' + rf.sheetSrc, min: 3 });
  }
  if (d.wheels) {                                            // колёса — в комплекте; зимой лежат в коробке
    const ws = d.wheels.spec, nb = d.wheels.brakes, nf = d.wheels.n - nb;
    if (nf) items.push({ name: ws.name, qty: nf, unit:'шт', price: ws.price, note:'без тормоза · ' + ws.src, min: 0 });
    items.push({ name: ws.name + ' с тормозом', qty: nb, unit:'шт', price: ws.priceBrake, note:'стопор колеса и поворота — корпус не уедет от ветра · ' + ws.src, min: 0 });
    items.push({ name: WHEEL_SCREW.name, qty: d.wheels.n * 4, unit:'шт', price: WHEEL_SCREW.price,
      note:(ws.adapter ? 'пластина' : 'площадка колеса') + ' — снизу к торцу нижнего бруска, в нижнюю стенку профиля; держит на образце — проверить', min: d.wheels.n * 3 });
    if (ws.adapter) {
      items.push({ name: ws.adapter.name, qty: d.wheels.n, unit:'шт', price: ws.adapter.price, note: ws.adapter.note, min: d.wheels.n * 1 });
      items.push({ name:'Болт М6×12 с потайной головкой + гайка с нейлоном', qty: d.wheels.n * 4, unit:'шт', price: ws.adapter.bolt,
        note:'колесо к переходной пластине; головки заподлицо — пластина прилегает к брусу', min: d.wheels.n * 2 });
    }
  }
  if (d.table) {
    items.push({ name: TABLE.screw.name + ' — столешница', qty: d.table.screws, unit:'шт', price: TABLE.screw.price,
      note:'по 2 в каждую планку сквозь поперечины снизу; поперечины — по саморезу в верхний брусок передней и задней стенки (от ветра снизу); зимой столешницу снимают', min: 0 });
    const pcS = ENDS.plugs.colors[+p.plugColor || 0] || ENDS.plugs.colors[0];
    items.push({ name:'Заглушка торцевая пластиковая · ' + pcS.name.toLowerCase() + ' — в торцы планок и поперечин столешницы', qty: d.table.plugs, unit:'шт', price: ENDS.plugs.price,
      note:'торцы планок полые — закрыты той же заглушкой, что и торцы брусков' + (d.table.hole ? ', в том числе у проёма' : '') + '; ' + d.table.batPlugs + ' — в торцы поперечин (видны в щели под столешницей)', min: d.table.plugs * ENDS.plugs.min });
  }
  if (d.light) {
    const L = d.light, ls = L.spec, nClip = Math.ceil(L.len / ls.clip.step) + 4;
    if (ls.id === 'mains') {
      const Wt = L.len / 1000 * ls.wPerM, psu = ls.psu.find(x => x.w >= Wt * 1.15) || ls.psu[ls.psu.length - 1];
      items.push({ name: ls.strip, qty: +(L.len / 1000).toFixed(2), unit:'м', price: ls.stripPrice, note:'по внутренней грани под верхним бруском, ' + Wt.toFixed(1).replace('.', ',') + ' Вт · ' + ls.src, min: 0 });
      items.push({ name: psu.name, qty: 1, unit:'шт', price: psu.price, note:'запас по мощности 15 %; ставится снаружи у розетки', min: 0 });
      items.push({ name: ls.plug.name, qty: 1, unit:'шт', price: ls.plug.price, note:'кашпо отстёгивается от провода — катать, разбирать на зиму', min: 0 });
    } else items.push({ name: ls.kit.name, qty: Math.ceil(L.len / ls.kit.len), unit:'компл', price: ls.kit.price, note:'без проводов; панель — на верхнем бруске. Светит слабее сетевой · ' + ls.src, min: 0 });
    items.push({ name: ls.clip.name, qty: nClip, unit:'шт', price: ls.clip.price, note:'шаг 250 мм, на саморезе в брусок', min: nClip * 0.3 });
  }
  items.push({ name:'Колпачок защитный на стержень Ø12', qty: d.N, unit:'шт', price: 18, note:'закрывает торец GFRP сверху', min: 0 });
  const total = items.reduce((s, x) => s + x.qty * x.price, 0);
  const minutes = items.reduce((s, x) => s + (x.min || 0), 0);
  return { items, total, minutes };
}

/* ---------- 14. Смета ---------------------------------------------------- */
function cost(p) {
  const u = unitOf(p);
  if (u) {
    const n = u.n, rows = [['Набор', u.sh.name + ' — ' + n + ' целых квадратов вплотную, ничем не скреплены', n, 'шт', 0, 0]];
    u.groups.forEach(g => {
      const c = cost(g.pu);
      rows.push(['Квадрат', SIZES[g.size].L + ' мм, ' + g.belts + ' поясов', g.count, 'шт', c.full, c.full * g.count]);
      c.rows.forEach(r => rows.push([r[0], r[1], r[2] * g.count, r[3], r[4], r[5] * g.count]));
    });
    return Object.assign(sumGroups(u, cost), { rows, units: n, unitFull: cost(u.mainPu).full, hw: hardware(p) });
  }
  const d = derive(p), pr = d.pr, pn = PANELS[p.panel], rows = [];
  let barMat, barMin;
  if (d.custom) {
    const pc = d.pack, nP = d.partitions.length, half = d.levels / 2;
    barMat = pc.sticks * d.stock / 1000 * pr.price_m;
    const wallMin = (len, holes, slot) => pr.cut_min + 0.2 + holes / 2 * pr.drill_min + (slot ? pr.slot_min * len / d.module : 0);
    barMin = 2 * half * wallMin(d.longest, 2 + nP, true) + 2 * half * wallMin(d.ol.spanY + d.w, 2, true) +
             nP * half * wallMin(d.ol.spanY + d.w, 2, false) + d.starters.length * (pr.cut_min + 0.2);
    rows.push(['Бруски', 'Сквозные: ' + 2 * half + ' шт по ' + Math.round(d.longest) + ' мм, ' + (2 + nP) * half + ' шт по ' +
               Math.round(d.ol.spanY + d.w) + ' мм' + (nP ? ' (в том числе ' + nP + ' перемычк' + (nP === 1 ? 'а' : nP < 5 ? 'и' : 'ек') + ')' : '') +
               ', добор ' + d.starters.length + ' шт — ' + pc.sticks + ' хлыстов по ' + d.stock + ' мм, отход ' + Math.round(pc.waste) + ' мм',
               pc.sticks, 'хлыст', d.stock / 1000 * pr.price_m, barMat]);
  } else if (pr.id === 'eps_p01') {
    barMat = pr.price_bar * d.barCount;
    barMin = pr.hand_min * d.barCount;
    rows.push(['Бруски', 'Армированный EPS: материалы на брусок', d.barCount, 'шт', pr.price_bar, barMat]);
  } else {
    /* один раскрой на всё из лаги: бруски, отрезки решётки, втулки — остаток хлыста не пропадает */
    /* лага разных цветов — разные хлысты: раскрой по каждому цвету отдельно */
    const bc = p.barColors || {}, defC = p.barColor || 'c0', byCol = {};
    const add = (col, len) => (byCol[col] = byCol[col] || []).push(len);
    if (d.keepE) d.ol.edges.forEach(e => d.keepE[e.i].forEach(j => add(bc[e.i + ':' + j] || defC, d.L)));
    else for (let k = 0; k < d.barCount; k++) add(defC, d.L);
    for (let k = 0; k < d.slatCount; k++) add(defC, d.slatLen);
    (d.stubList || []).forEach(st => add(st.edge !== undefined ? bc[st.edge + ':' + st.j] || defC : defC, d.slottedStubs ? STUB_LEN : d.w));
    const nRoof = d.roof && d.roof.h ? ROOF_BARS : 0;
    for (let k = 0; k < nRoof; k++) add(defC, d.L);
    if (d.table) { for (let k = 0; k < d.table.nPl; k++) add(defC, d.table.lenX); add(defC, d.table.widY); add(defC, d.table.widY); }
    const packs = Object.keys(byCol).map(c => packFFD(byCol[c], d.stock));
    const pool = { sticks: packs.reduce((a, q) => a + q.sticks, 0), waste: packs.reduce((a, q) => a + q.waste, 0), colors: packs.length };
    barMat = pool.sticks * d.stock / 1000 * pr.price_m;
    const slotMin = (p.scheme === 'C') ? 0 : pr.slot_min;
    barMin = (pr.cut_min + pr.drill_min + slotMin + 0.2) * d.barCount +
             (d.stubs || 0) * (pr.cut_min + pr.drill_min / 2 + 0.2 + (d.slottedStubs ? 0.3 : 0));   // втулка: отрез, Ø14, короткий паз на выступе
    rows.push(['Лага', pr.name + ' — ' + d.barCount + ' брусков по ' + d.L + ' мм' + (d.slatCount ? ', ' + d.slatCount + ' отрезков решётки по ' + d.slatLen + ' мм' : '') +
               (d.stubs ? ', ' + d.stubs + ' втулок по ' + (d.slottedStubs ? STUB_LEN + ' мм с пазом' : d.w + ' мм') : '') + (nRoof ? ', ' + nRoof + ' бруска крышки' : '') + (d.table ? ', столешница: ' + d.table.nPl + ' планок по ' + d.table.lenX + ' мм и 2 поперечины по ' + d.table.widY + ' мм' : '') + ' — ' + pool.sticks + ' хлыст' + (pool.sticks === 1 ? '' : pool.sticks < 5 ? 'а' : 'ов') +
               ' по ' + d.stock + ' мм, отход ' + Math.round(pool.waste) + ' мм' + (pool.colors > 1 ? ' · ' + pool.colors + ' цвета лаги — раскрой по каждому отдельно' : ''),
               pool.sticks, 'хлыст', d.stock / 1000 * pr.price_m, barMat]);
  }
  let panelCost = 0;
  if (d.panelsByMat) {                                   // вставки по ярусам — по каждому материалу отдельно
    Object.keys(d.panelsByMat).forEach(k => {
      const pk = PANELS[k.split('|')[0]], tag = k.split('|')[1], sa = pk.sheet[0] * pk.sheet[1] / 1e6, nd = d.panelsByMat[k] / 0.85, cst = nd / sa * pk.price_sheet;
      panelCost += cst;
      rows.push(['Вставки', pk.name + (tag ? ', ' + tag.toLowerCase() : '') + ' — по ярусам, выход раскроя 85 %', +nd.toFixed(3), 'м²', +(pk.price_sheet / sa).toFixed(0), cst]);
    });
  } else {
    const sheetArea = pn.sheet[0] * pn.sheet[1] / 1e6;
    const need = d.panelArea / 0.85;
    panelCost = need / sheetArea * pn.price_sheet;
    rows.push(['Вставки', pn.name + ', ' + (d.custom ? d.panelList.length : d.N) + ' шт — выход раскроя 85 %',
               +need.toFixed(3), 'м²', +(pn.price_sheet / sheetArea).toFixed(0), panelCost]);
  }

  const rodPricePerM = p.anchorD <= 10 ? 39.8 : p.anchorD <= 12 ? 55 : p.anchorD <= 16 ? 95 : 140;
  const winter = p.season === 'winter';
  const rodL = winter ? d.rodLen : d.summerRod;
  const tiltW = winter && d.roof && d.roof.winterTilt;
  const rodCost = (tiltW ? 2 * d.rodLen + 2 * d.rodLenBack : d.N * rodL) / 1000 * rodPricePerM;
  rows.push(['Каркас', 'Стержень GFRP Ø' + p.anchorD + ' × ' + Math.round(rodL) + (tiltW ? ' / ' + Math.round(d.rodLenBack) + ' (задние)' : '') + ' мм — ' +
             (winter || d.line ? 'анкерный, на 600 мм в грунт' : 'летний') + (d.roof && d.roof.h ? ', до крышки на ' + d.roof.h + ' мм' : ''),
             d.N, 'шт', +(rodL / 1000 * rodPricePerM).toFixed(0), rodCost]);

  const shelfCost = (d.custom || pr.id === 'eps_p01') ? d.slatCount * d.slatLen / 1000 * (pr.price_m || 0) : 0;   // иначе — в общем раскрое
  const slatMin = d.slatCount * (pr.cut_min + 0.2) + d.crossings * 0.4;
  if (d.slatCount) rows.push(['Дно', 'Полка-решётка, ' + d.layers + (d.layers === 2 ? ' яруса' : ' ярус') + ': ' + d.slatCount + ' отрезков той же лаги по ' + d.slatLen +
                              ' мм (' + d.slatCut.n + ' шт с хлыста ' + d.stock + ' мм)',
                              +(d.slatCount * d.slatLen / 1000).toFixed(2), 'м', pr.price_m || 0, shelfCost]);

  const hw = hardware(p);
  hw.items.forEach(x => rows.push(['Крепёж', x.name + ' — ' + x.note, x.qty, x.unit, x.price, x.qty * x.price]));

  const assyMin = 18 + d.barCount * 0.5 + slatMin + hw.minutes + (d.custom ? 90 : 0) + (d.line ? d.N * 1.5 : 0);
  /* крышка: своя обработка брусков и засверловка торцов стержней */
  const roofMin = d.roof && d.roof.h ? 2 * ROOF_OPS_MIN.slotted + 2 * ROOF_OPS_MIN.side + 4 * ROOF_OPS_MIN.rodEnd : 0;
  const tableMin = d.table ? d.table.pieces * (pr.cut_min + 0.2) + d.table.screws * 0.4 + (d.table.hole ? TABLE.holeMin : 0) : 0;
  const lightMin = d.light ? (d.light.spec.id === 'mains' ? 15 : 8) : 0;
  const tMin = d.tHoles ? d.tHoles * pr.drill_min : 0;          // квадрат-опора линии: Ø14 посередине брусков стенки с Т-узлом
  let labour = (barMin + assyMin + roofMin + tableMin + lightMin + tMin) / 60 * p.hour;
  if (tMin) rows.push(['Труд', 'Т-узел: отверстие Ø14 посередине ' + d.tHoles + ' брусков стенки к линии', +(tMin / 60).toFixed(2), 'ч', p.hour, tMin / 60 * p.hour]);
  if (tableMin) rows.push(['Труд', 'Столешница: отрез ' + d.table.pieces + ' планок, сборка на поперечинах' + (d.table.hole ? ', круглый проём Ø' + d.table.hole + ' лобзиком' : ''),
                           +(tableMin / 60).toFixed(2), 'ч', p.hour, tableMin / 60 * p.hour]);
  if (lightMin) rows.push(['Труд', 'Подсветка: монтаж ленты на клипсы' + (d.light.spec.id === 'mains' ? ', пайка и герметизация разъёма' : ''), +(lightMin / 60).toFixed(2), 'ч', p.hour, lightMin / 60 * p.hour]);
  rows.push(['Труд', 'Изготовление брусков', +(barMin / 60).toFixed(2), 'ч', p.hour, barMin / 60 * p.hour]);
  if (roofMin) rows.push(['Труд', 'Крышка: 2 бруска — глухие Ø14 Форстнером с упором, паз под лист фрезой с упорами, Ø5 под саморезы; ' +
                          '2 боковых — Ø5; засверловка Ø3 в торцы 4 стержней', +(roofMin / 60).toFixed(2), 'ч', p.hour, roofMin / 60 * p.hour]);
  rows.push(['Труд', 'Сборка, крепёж, контроль, упаковка' + (d.custom ? '; индивидуальный заказ — замер, расчёт, раскрой, 1,5 ч' : ''),
             +(assyMin / 60).toFixed(2), 'ч', p.hour, assyMin / 60 * p.hour]);

  let sqMat = 0, sqLab = 0;
  if (d.lineSquares) {                                   // квадраты-опоры линии — полные кашпо, считаются как квадрат
    const k = d.lineSquares.length;
    d.lineSquares.forEach(q => { const sc = cost(q.p); sqMat += sc.materials; sqLab += sc.labour; });
    rows.push(['Опоры', 'Квадрат-кашпо ' + d.L + ' × ' + d.H + ' мм — опора линии, ' + k + ' шт: материалы (раскрой, листы — у стенки с Т-узлом два узких, крепёж)', k, 'шт', +(sqMat / k).toFixed(0), sqMat]);
    rows.push(['Труд', 'Квадраты-опоры: изготовление, отверстия Ø14 посередине брусков стенки к линии, сборка, ' + k + ' шт', +(sqLab / p.hour).toFixed(2), 'ч', p.hour, sqLab]);
  }
  const materials = barMat + panelCost + rodCost + shelfCost + hw.total + sqMat;
  labour += sqLab;
  const base = materials + labour;
  const full = base / (1 - p.defect / 100) * (1 + p.overhead / 100) + p.misc;
  const price = full / p.margin;
  return { rows, materials, labour, labMin: barMin + assyMin + roofMin, roofMin, base, full, price, units: 1, custom: !!d.custom,
           perBarMin: barMin / d.barCount, barMat, panelCost, rodCost, shelfCost, hwCost: hw.total, hw };
}

/* ---------- 15. Устойчивость, анкер, стержень ---------------------------- */
function stability(p) {
  const u = unitOf(p);
  if (u) {                                   // квадраты не скреплены — каждый стоит сам; худший из них
    const all = u.groups.map(g => stability(g.pu)).sort((a, b) => a.Ktip - b.Ktip);
    return Object.assign(all[0], { units: u.n });
  }
  if (p.shape === 'line') {
    const ls = lineSupportCheck(p), lc = derive(p).lineCheck, s0 = stability(Object.assign({}, p, { shape: 'sq' }));
    return Object.assign({}, s0, { Ktip: ls.sqAnch ? Infinity : ls.Ktip, Kanchor: ls.sqAnch ? ls.Kanch : (derive(p).lineInfo.anchored ? lc.Kw : Infinity),
      passTip: ls.sqAnch || ls.Ktip >= 1.5, passAnchor: ls.K >= 1.5, line: ls });
  }
  const d = derive(p), m = mass(p), g = 9.81, rhoAir = 1.225, Cd = 1.3;
  const q = 0.5 * rhoAir * p.wind * p.wind;
  const Abody = (Math.max(d.outerX, d.outerY) / 1000) * (d.H / 1000) * (d.solidity || 1);   // без листа ветер проходит между брусками
  /* с крышкой растение подвязано к брускам и растёт до них: выше и больше парусность (конус 0,35 м по низу) */
  const rfH = d.roof && d.roof.h && p.season === 'summer' ? d.roof.h : 0;
  const plantHm = rfH ? (d.H + rfH - 50) / 1000 : p.plantH / 0.55;
  const plantArea = rfH ? 0.35 * plantHm * 0.7 : p.plantArea, plantLev = rfH ? 0.55 * plantHm : p.plantH;
  const Fbody = q * Cd * Abody, Fplant = q * Cd * plantArea, F = Fbody + Fplant;
  /* на колёсах корпус выше на высоту колеса, а опора ýже: колесо, повёрнутое внутрь, стоит ближе к центру */
  const whl = d.wheels && p.season === 'summer' ? d.wheels : null;
  const lever = (Fbody * (d.H / 2000) + Fplant * plantLev) / F + (whl ? whl.h / 1000 : 0);
  const Mwind = F * lever;
  const halfBase = (d.poly ? d.clear / 2 + d.w / 2 : Math.min(d.outerX, d.outerY) / 2 - (whl ? d.w / 2 + whl.spec.offset : 0)) / 1000;
  /* Горшок стоит на решётке внутри стенок: его вес передаётся на корпус, а сдвинуться
     в сторону ему не дают сами стенки. Поэтому он работает балластом и без поддона. */
  const ballast = p.season !== 'summer' ? 0 : d.custom ? d.soilKg : (d.table && d.table.mode === 'solid') ? 0 : d.slatCount ? d.potKg : 0;
  const Mrest = (m.totalKg + ballast) * g * halfBase;
  const Ktip = Mrest / Mwind;
  const gam = p.frozen ? 90000 : 18000;
  const Kp = 3, D = p.anchorD / 1000, Lp = p.anchorL / 1000;
  const HuOne = 0.5 * gam * D * Math.pow(Lp, 3) * Kp / (lever + Lp);
  const Hu = HuOne * d.N, Kanchor = Hu / F;
  const W = Math.PI * Math.pow(p.anchorD, 3) / 32;
  const sigma = (F / d.N * lever * 1000) / W;
  const sigmaAllow = GFRP_ALLOW;
  return { q, Abody, Fbody, Fplant, F, lever, Mwind, Mrest, Ktip, ballast, HuOne, Hu, Kanchor, sigma, sigmaAllow,
           passTip: Ktip >= 1.5, passAnchor: Kanchor >= 1.5, passRod: sigma <= sigmaAllow,
           bendSigma: d.bendSigma, bendR: d.bendR, passBend: d.bendSigma <= sigmaAllow };
}

/* ---------- 16. Полка-решётка (квадрат) ---------------------------------- */
function shelf(p) {
  const u = unitOf(p);
  if (u) return shelf(u.mainPu);
  const d = derive(p), c = d.layers === 2 ? d.check2 : d.check1;
  return Object.assign({ L: d.slatLen, n: d.slatsPer, potKg: d.potKg, layersAuto: d.layersAuto,
                         check1: d.check1, check2: d.check2 }, c);
}


/* ---------- 17. Рынок: ближайшие аналоги --------------------------------
   Открытые каталоги, проверено 24–25.09.2026. Размер — Д×Ш×В, мм.
   fn: planter — кашпо с дном, box — длинный ящик, bed — клумба/грядка без дна,
       shelter — зимнее укрытие. q — класс материала для сравнения качества. */
const MARKET = [
  { name:'Кашпо «Ландшафт», ДПК на металлокаркасе', fn:'planter', q:'ДПК', size:[500,500,500], price:8799, url:'https://mebeldpk.ru/catalog/mebel-dpk/kashpo-iz-dpk-landshaft/' },
  { name:'КАШПОФ, стеклопластик', fn:'planter', q:'стеклопластик', size:[400,400,300], price:4900, url:'https://kashpof.ru/' },
  { name:'КАШПОФ, стеклопластик', fn:'planter', q:'стеклопластик', size:[400,400,400], price:6200, url:'https://kashpof.ru/' },
  { name:'КАШПОФ, стеклопластик', fn:'planter', q:'стеклопластик', size:[400,400,500], price:7400, url:'https://kashpof.ru/' },
  { name:'КАШПОФ, стеклопластик', fn:'planter', q:'стеклопластик', size:[400,400,600], price:8600, url:'https://kashpof.ru/catalog/' },
  { name:'Живая ёлка, кашпо из сосны', fn:'planter', q:'дерево', size:[400,400,400], price:10200, url:'https://live-elka.ru/aksessuary/kadki-dlya-yolok/kashpo-ulichnoe-40h40h40-sm' },
  { name:'Живая ёлка, кашпо из сосны', fn:'planter', q:'дерево', size:[500,500,500], price:11400, url:'https://live-elka.ru/aksessuary/kadki-dlya-yolok/kashpo-ulichnoe-40h40h40-sm' },
  { name:'Живая ёлка, кашпо из сосны', fn:'planter', q:'дерево', size:[600,600,600], price:13000, url:'https://live-elka.ru/aksessuary/kadki-dlya-yolok/kashpo-ulichnoe-40h40h40-sm' },
  { name:'Живая ёлка, кашпо из сосны', fn:'planter', q:'дерево', size:[700,700,700], price:18800, url:'https://live-elka.ru/aksessuary/kadki-dlya-yolok/kashpo-ulichnoe-40h40h40-sm' },
  { name:'Живая ёлка, кашпо из сосны', fn:'planter', q:'дерево', size:[800,800,500], price:21400, url:'https://live-elka.ru/aksessuary/kadki-dlya-yolok/kashpo-ulichnoe-40h40h40-sm' },
  { name:'Живая ёлка, кашпо из сосны', fn:'planter', q:'дерево', size:[900,900,600], price:25000, url:'https://live-elka.ru/aksessuary/kadki-dlya-yolok/kashpo-ulichnoe-40h40h40-sm' },
  { name:'Живая ёлка, кашпо из сосны', fn:'planter', q:'дерево', size:[1000,1000,750], price:31000, url:'https://live-elka.ru/aksessuary/kadki-dlya-yolok/kashpo-ulichnoe-40h40h40-sm' },
  { name:'LECHUZA CANTO Premium High 40, автополив', fn:'planter', q:'пластик премиум', size:[400,400,760], price:23629, url:'https://www.lechuza.website/kashpo-lechuza/lechuza-canto-premium-high/' },
  { name:'Грин Вуд КН-009, сосна', fn:'box', q:'дерево', size:[800,400,400], price:7349, url:'https://pkgreenwood.ru/kashpo-prjamougolnoe-zakaz-art-kn009/' },
  { name:'Грин Вуд К-002, сосна без покраски', fn:'box', q:'дерево', size:[800,300,500], price:10643, url:'https://pkgreenwood.ru/kashpo-prjamougolnoe-standart-art-k002/' },
  { name:'Грин Вуд К-002, сосна с покраской', fn:'box', q:'дерево', size:[800,300,500], price:17029, url:'https://pkgreenwood.ru/kashpo-prjamougolnoe-standart-art-k002/' },
  { name:'Паркет-сад, прямоугольное из дерева', fn:'box', q:'дерево', size:[1200,500,500], price:11100, url:'https://parket-sad.ru/product/kashpo-derevyannoe-dlya-cvetov-ulichnoe-pryamougolnoe-lameli-gorizontalnye' },
  { name:'Живая ёлка, ящик из дерева', fn:'box', q:'дерево', size:[800,400,400], price:20400, url:'https://live-elka.ru/aksessuary/kadki-dlya-yolok/kashpo-iz-dereva-40h40h40-sm-1' },
  { name:'Живая ёлка, ящик из дерева', fn:'box', q:'дерево', size:[900,400,600], price:24400, url:'https://live-elka.ru/aksessuary/kadki-dlya-yolok/kashpo-iz-dereva-40h40h40-sm-1' },
  { name:'Живая ёлка, ящик из дерева', fn:'box', q:'дерево', size:[1000,300,800], price:28800, url:'https://live-elka.ru/aksessuary/kadki-dlya-yolok/kashpo-iz-dereva-40h40h40-sm-1' },
  { name:'Клумба ДПК «Шестиугольник 30»', fn:'bed', q:'ДПК', size:[300,300,275], price:1854, url:'https://xn----ftbbcuid9am4m.xn--p1ai/klumby.html', poly:true },
  { name:'Клумба ДПК «Шестиугольник 50»', fn:'bed', q:'ДПК', size:[500,500,275], price:2370, url:'https://xn----ftbbcuid9am4m.xn--p1ai/klumby.html', poly:true },
  { name:'Клумба ДПК «Шестиугольник 70»', fn:'bed', q:'ДПК', size:[700,700,275], price:2886, url:'https://xn----ftbbcuid9am4m.xn--p1ai/klumby.html', poly:true },
  { name:'Клумба ДПК прямоугольная 123×27,5', fn:'bed', q:'ДПК', size:[1230,275,275], price:7935, url:'https://xn----ftbbcuid9am4m.xn--p1ai/klumby.html' },
  { name:'Грядка ДПК Woodgrand 2×1 м', fn:'bed', q:'ДПК', size:[2000,1000,200], price:8258, url:'https://woodgrand.ru/katalog/gryadki-iz-dpk/klumby-iz-dpk/' },
  { name:'Грядка ДПК Holzhof, комплект', fn:'bed', q:'ДПК', size:[3000,1000,300], price:9163, url:'https://dec-king.ru/catalog/blagoustroystvo_sada/gryadki_i_klumby_iz_dpk/f/garden_bed_height-is-vysokaya/' },
  { name:'Каркас для укрытия туи 1,7 м, металл, 3 прутка', fn:'shelter', q:'металл', size:[600,600,1700], price:709, url:'https://xn--80aaiesandvsmf9q.xn--p1ai/karkas-dlya-ukritiya-tuy-170' },
  { name:'Каркас для укрытия туи 1,7 м, совместные покупки', fn:'shelter', q:'металл', size:[600,600,1700], price:592, url:'https://63pokupki.ru/item/8e5bcb77581d5d26221cb0bc472eb9ca/karkas-dlya-ukritiya-tui-m' },
  { name:'Чехол для хвойных, спанбонд 60 г/м²', fn:'shelter', q:'ткань', size:[1500,1500,2500], price:190, url:'https://www.vseinstrumenti.ru/category/zimnie-ukrytiya-dlya-rastenij-166829/' }
];
const QPEN = { 'ДПК': 0, 'дерево': 0.08, 'стеклопластик': 0.35, 'пластик премиум': 0.45, 'металл': 0.5, 'ткань': 0.6 };

/* Подбор: функция по сезону и форме, затем близость по площади основания,
   высоте, вытянутости и классу материала. Нижняя/средняя/верхняя — по трём ближайшим. */
function analogs(p) {
  const u = unitOf(p);
  if (u) {                                   // набор из n квадратов — сравниваем с n кашпо тех же размеров
    const n = u.n, a = analogs(u.mainPu), sm = { low: 0, mid: 0, high: 0 };
    u.groups.forEach(g => { const b = analogs(g.pu); sm.low += b.low * g.count; sm.mid += b.mid * g.count; sm.high += b.high * g.count; });
    return Object.assign({}, a, { fnName: u.mixed ? n + ' изделий разного размера и высоты' : n + ' × ' + a.fnName,
      low: sm.low, mid: sm.mid, high: sm.high, units: n,
      note: 'Форма собрана из ' + n + ' квадратов, поэтому рынок — ' + n + ' отдельных изделий тех же размеров. ' + a.note });
  }
  if (p.shape === 'line' && p.season !== 'winter')
    return { fnName: 'декоративное ограждение', fit: 'нет', items: [], low: 0, mid: 0, high: 0,
             note: 'Цены на декоративные заборчики и ширмы для клумб в выборку не собирались — сравнить не с чем. Нужно дособрать.' };
  const d = derive(p), winter = p.season === 'winter';
  const L = Math.max(d.outerX, d.outerY), W = Math.min(d.outerX, d.outerY), H = d.H;
  let fn, fnName;
  if (winter) { fn = ['shelter']; fnName = 'зимнее укрытие растения'; }
  else if (d.square) { fn = ['planter']; fnName = 'уличное кашпо с дном'; }
  else if (d.custom) { fn = ['bed', 'box']; fnName = 'высокая грядка под грунт'; }
  else { fn = ['bed', 'planter']; fnName = 'клумба без дна'; }
  const scored = MARKET.filter(m => fn.indexOf(m.fn) >= 0).map(m => {
    const mL = Math.max(m.size[0], m.size[1]), mW = Math.min(m.size[0], m.size[1]), mH = m.size[2];
    const area = Math.abs(Math.log((mL * mW) / (L * W)));
    const hgt = Math.abs(Math.log(mH / H));
    const asp = Math.abs(Math.log((mL / mW) / (L / W)));
    const fnPen = m.fn === fn[0] ? 0 : 0.35;
    const polyPen = (d.poly && !m.poly && m.fn === 'bed') ? 0.15 : 0;
    const score = winter ? (QPEN[m.q] || 0) * 0.2 + hgt * 0.1
                         : area + 0.6 * hgt + 0.4 * asp + (QPEN[m.q] || 0) + fnPen + polyPen;
    return Object.assign({ score, area, hgt }, m);
  }).sort((a, b) => a.score - b.score);
  const top = scored.slice(0, 3);
  const prices = top.map(m => m.price).sort((a, b) => a - b);
  const best = top[0];
  let fit = 'близкий';
  if (!best) fit = 'нет';
  else if (winter) fit = 'другой класс';
  else if (best.area > 0.9 || best.hgt > 0.6) fit = 'далёкий';
  else if (best.fn !== fn[0]) fit = 'другой класс';
  else if (best.area < 0.25 && best.hgt < 0.25 && (QPEN[best.q] || 0) <= 0.1) fit = 'прямой';
  let note = '';
  if (winter) note = 'Жёсткого разборного ограждения на рынке не нашлось: аналоги — металлический каркас и чехол из спанбонда. ' +
    'У P-02 зимний режим — второе назначение того же изделия.';
  else if (fit === 'далёкий') note = 'Точного аналога такого размера нет: ближайшие заметно меньше или ниже, сравнение ориентировочное.';
  else if (top.some(m => m.fn === 'bed')) note = 'Клумбы и грядки ДПК на рынке низкие, 150–300 мм; P-02 выше.';
  if (d.custom) note = 'Индивидуальный заказ: сравнение ориентировочное. ' + note;
  if (!winter) note += (note ? ' ' : '') + 'Ни у одного аналога нет второго, зимнего назначения.';
  return { fnName, fit, items: top, low: prices[0], mid: prices[Math.floor(prices.length / 2)],
           high: prices[prices.length - 1], note };
}

/* Какие высоты крышки допустимы для этого корпуса. Три проверки:
   1) стержень Ø над корпусом под снегом на крышке не выгнется вбок — запас ≥ 2;
   2) заделка: часть стержня над корпусом не длиннее двух высот корпуса — корпус держит стержень,
      как грунт столб (в грунте не меньше трети длины);
   3) летом корпус стоит на плитке без анкера, растение подвязано к крышке — запас от опрокидывания ≥ 1,5.
   У набора квадратов проверяется каждый квадрат. */
function roofLimits(p) {
  const u = unitOf(p);
  const units = u ? u.groups.map(g => g.pu) : [p];
  const sq = units.every(q => (q.shape || 'sq') === 'sq');
  return ROOF_H.map(hh => {
    if (!sq) return { h: hh, ok: false, why: ['крышка — только для квадрата и наборов квадратов'] };
    const why = []; let rodK = Infinity, embed = 0, tipK = Infinity;
    units.forEach(q => {
      const dw = derive(Object.assign({}, q, { roof: hh, season: 'winter' }));
      rodK = Math.min(rodK, dw.roof.rod.K);
      embed = Math.max(embed, hh / dw.H);
      tipK = Math.min(tipK, stability(Object.assign({}, q, { roof: hh, season: 'summer', shelves: 2 })).Ktip);   // летом горшок на полке — балласт
    });
    if (rodK < 2) why.push('стержень Ø' + p.anchorD + ' под снегом на крышке: запас ' + rodK.toFixed(1).replace('.', ',') + ' из 2');
    if (embed > 2) why.push('корпус низкий: стержень над ним в ' + embed.toFixed(1).replace('.', ',') + ' раза длиннее корпуса, можно не больше 2');
    if (tipK < 1.5) why.push('летом с подвязанным растением опрокидывает ветер: запас ' + tipK.toFixed(2).replace('.', ',') + ' из 1,5');
    return { h: hh, ok: !why.length, why, rodK, embed, tipK };
  });
}

/* Колёса: хватает ли грузоподъёмности и не уедет ли корпус от ветра */
function wheelCheck(p) {
  const u = unitOf(p);
  const pu = u ? u.mainPu : p, d = derive(Object.assign({}, pu, { season: 'summer', shelves: 2 }));
  if (!d.wheels) return null;
  const ps = Object.assign({}, pu, { season: 'summer', shelves: 2 });
  const m = mass(ps), st = stability(ps), g = 9.81;
  const kg = m.totalKg + (d.slatCount ? d.potKg : 0), W = kg * g;
  const perWheel = kg / 3, ws = d.wheels.spec;
  const slideK = 0.5 * W * d.wheels.brakes / d.wheels.n / st.F;      // тормоз: трение резины по плитке ≈ 0,5
  const rollK = 0.03 * W / st.F;                                      // без тормоза: сопротивление качению ≈ 3 %
  return { fits: d.wheels.fits, plate: ws.plate, plateUnchecked: !!ws.plateUnchecked, kg, perWheel, load: ws.load, passLoad: perWheel <= ws.load, F: st.F, slideK, rollK, passSlide: slideK >= 1.5,
           Ktip: st.Ktip, passTip: st.Ktip >= 1.5, h: ws.H, units: u ? u.n : 1 };
}

/* Какие колёса можно предложить для этой конфигурации. Не проходит — кнопка выключена, причина в подсказке.
   Проверки (летом, с горшком, худший квадрат набора): грузоподъёмность на 3 колеса, опрокидывание ≥ 1,5
   (корпус выше на колесо, опора ýже на вынос колеса), удержание ветром при тормозах на всех 4 ≥ 1,5.
   Тормоз на 2 — только если и с двумя запас ≥ 1,5. */
function wheelOptions(p) {
  const u = unitOf(p), units = u ? u.groups.map(g => g.pu) : [p];
  const hasBottom = !u ? (p.shape || 'sq') === 'sq' : units.every(q => (q.shape || 'sq') === 'sq');
  return Object.keys(WHEELS).map(id => {
    if (!hasBottom) return { id, ok: false, why: ['у этой формы нет дна — она стоит на земле, колёса ставить некуда'] };
    let loadR = 0, tip = Infinity, slide4 = Infinity, slide2 = Infinity, kg = 0;
    units.forEach(q => {
      const w4 = wheelCheck(Object.assign({}, q, { wheels: id, wheelBrakes: 4 }));
      const w2 = wheelCheck(Object.assign({}, q, { wheels: id, wheelBrakes: 2 }));
      loadR = Math.max(loadR, w4.perWheel / w4.load); tip = Math.min(tip, w4.Ktip);
      slide4 = Math.min(slide4, w4.slideK); slide2 = Math.min(slide2, w2.slideK); kg = Math.max(kg, w4.kg);
    });
    const why = [];
    if (loadR > 1) why.push('тяжело для колеса: ' + Math.round(loadR * WHEELS[id].load) + ' кг на колесо из ' + WHEELS[id].load);
    if (tip < 1.5) why.push('на колёсах опрокидывает ветер: запас ' + tip.toFixed(2).replace('.', ',') + ' из 1,5');
    if (slide4 < 1.5) why.push('ветер сдвигает даже с 4 тормозами: запас ' + slide4.toFixed(1).replace('.', ',') + ' из 1,5');
    return { id, ok: !why.length, why, loadR, tip, slide4, slide2, two: slide2 >= 1.5, kg };
  });
}

/* Столешница: прочность планок и выноса, опрокидывание, если облокотились на край, подъём ветром */
function tableCheck(p) {
  const u = unitOf(p), pu = u ? u.mainPu : p;
  const ps = Object.assign({}, pu, { season: 'summer', shelves: 2 }), d = derive(ps);
  if (!d.table) return null;
  const t = d.table, m = mass(ps), g = 9.81;
  const kg = m.totalKg + (t.mode === 'hole' && d.slatCount ? d.potKg : 0);     // сплошная — стол без горшка
  const whl = d.wheels;
  const half = Math.min(d.outerX, d.outerY) / 2 - (whl ? d.w / 2 + whl.spec.offset : 0);
  const arm = t.ov + (whl ? d.w / 2 + whl.spec.offset : 0);                 // от края опоры до края столешницы
  const tipK = arm > 0 ? kg * g * half / (TABLE.Pedge * arm) : Infinity;
  const q = 0.5 * 1.225 * p.wind * p.wind, lift = q * t.area, hold = pu.kgm ? 0 : d.pr.kgm * t.lagLen / 1000 * g + 4 * 300;
  return { t, kg, tipK, passTip: tipK >= 1.5, lift, hold, passLift: hold >= 1.5 * lift, units: u ? u.n : 1 };
}

/* Какие столешницы предлагать: вид × вынос. Не проходит — кнопка выключена, причина в подсказке. */
function tableOptions(p) {
  const u = unitOf(p), units = u ? u.groups.map(g => g.pu) : [p];
  const sq = units.every(q => (q.shape || 'sq') === 'sq');
  const out = [];
  ['solid', 'hole'].forEach(mode => TABLE_OV.forEach(ov => {
    const why = [];
    if (!sq) why.push('столешница — только на квадрат и наборы из квадратов');
    else if (+p.roof) why.push('с крышкой столешница не ставится — сверху крышка');
    else units.forEach(q => {
      const c = tableCheck(Object.assign({}, q, { table: mode, tableOv: ov }));
      if (!c) return;
      const t = c.t, f = v => v.toFixed(1).replace('.', ',');
      if (!t.mid.pass) why.push('пролёт ' + Math.round(q.size ? SIZES[q.size].L : 0) + ' мм: присели на середину — прогиб ' + f(t.mid.defl) + ' мм из ' + f(t.mid.limit) + ', σ ' + f(t.mid.sigma) + ' из ' + TABLE.sAllow);
      if (t.edge && !t.edge.pass) why.push('вынос ' + ov + ' мм: край прогибается на ' + f(t.edge.defl) + ' мм из ' + f(t.edge.limit));
      if (!c.passTip) why.push('облокотились на край — опрокидывает: запас ' + c.tipK.toFixed(2).replace('.', ',') + ' из 1,5');
      if (!c.passLift) why.push('ветер срывает столешницу');
    });
    out.push({ mode, ov, ok: !why.length, why: why.filter((x, i) => why.indexOf(x) === i) });
  }));
  return out;
}

const API = { lineSupportCheck, TABLE, TABLE_OV, LIGHTS, tableCheck, tableOptions, WHEELS, wheelCheck, wheelOptions, PROFILES, PANELS, SIZES, SHAPES, ENDS, RINGS, GFRP_E, GFRP_ALLOW, defaults, KERF, roofLimits,
              ROOF_H, ROOF_SNOW, ROOF_SHEETS, ROOF_SCREWS, ROOF_OPS_MIN, TRIM60, roofSpec,
              cutPlan, outline, panelMargin, lagSection, lagSectionV, soilCheck, packFFD, unitOf, extraPlugs,
              panelCheck, plateCheck, wallCheck, lineCheck, SNOW_P, SNOW_ZONE, CLIP, STUB_LEN, STUB_EXT,
              endsOf, closedEnds, alwaysPlugs, innerPlugs, potEstimate, saucerSpec, shelfCheck,
              derive, mass, packing, hardware, cost, stability, shelf, analogs, MARKET };
if (typeof module !== 'undefined') module.exports = API;
root.P02 = API;
})(typeof window !== 'undefined' ? window : globalThis);
