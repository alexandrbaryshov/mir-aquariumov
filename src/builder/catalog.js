// Каталог конструктора. Цены ориентировочные (на сайте магазина прайса нет) —
// их нужно сверить с магазином, как и цены витрины.

export const WATERS = [
  { id: 'fresh', label: 'Пресная' },
  { id: 'marine', label: 'Морская' },
]

// size: ширина × высота × глубина в «дециметрах» сцены (1 ед. = 10 см).
export const TANKS = [
  { id: 'nano', label: 'Нано', liters: 30, size: [4, 3, 3], note: '40 × 30 × 30 см', price: 6900 },
  { id: 'cube', label: 'Куб', liters: 60, size: [4, 4, 4], note: '40 × 40 × 40 см', price: 9900 },
  { id: 'classic', label: 'Классика', liters: 100, size: [8, 4, 3.5], note: '80 × 40 × 35 см', price: 14900 },
  { id: 'column', label: 'Колонна', liters: 120, size: [4, 7.5, 4], note: '40 × 75 × 40 см', price: 21900 },
  { id: 'panorama', label: 'Панорама', liters: 200, size: [10, 5, 4], note: '100 × 50 × 40 см', price: 28900 },
  { id: 'living', label: 'Гостиная', liters: 300, size: [12, 5, 5], note: '120 × 50 × 50 см', price: 44900 },
]

export const GROUPS = [
  { id: 'tank', label: 'Аквариум' },
  { id: 'ground', label: 'Грунт' },
  { id: 'decor', label: 'Декор' },
  { id: 'flora', label: 'Растения', marineLabel: 'Кораллы' },
  { id: 'tech', label: 'Техника' },
  { id: 'fauna', label: 'Жители' },
]

/**
 * kind: 'one' — выбирается один вариант из группы (грунт);
 *       'many' — можно добавить несколько штук до max (декор, растения, жители, техника).
 * water: 'fresh' | 'marine' | 'both'.
 * load: «нагрузка» на аквариум для шкалы заселённости; count — сколько особей в позиции.
 */
export const ITEMS = [
  { id: 'sand', group: 'ground', kind: 'one', label: 'Белый кварцевый песок', price: 900, water: 'both', color: '#eee3cc' },
  { id: 'gravel', group: 'ground', kind: 'one', label: 'Тёмный гравий', price: 1100, water: 'fresh', color: '#55595b' },
  { id: 'soil', group: 'ground', kind: 'one', label: 'Питательный грунт', spec: 'для растений', price: 2400, water: 'fresh', color: '#4a3527' },
  { id: 'aragonite', group: 'ground', kind: 'one', label: 'Арагонитовый песок', spec: 'держит pH', price: 1800, water: 'marine', color: '#f5efe3' },
  { id: 'pebble', group: 'ground', kind: 'one', label: 'Речная галька', spec: 'окатанная, 5–10 мм', price: 1300, water: 'fresh', color: '#9b9184' },
  { id: 'blacksand', group: 'ground', kind: 'one', label: 'Чёрный песок', spec: 'контраст для ярких рыб', price: 1400, water: 'both', color: '#2c2d31' },
  { id: 'lava', group: 'ground', kind: 'one', label: 'Вулканический грунт', spec: 'пористый, для травника', price: 2100, water: 'fresh', color: '#7a3b2c' },
  { id: 'coralsand', group: 'ground', kind: 'one', label: 'Коралловая крошка', spec: 'для рифа', price: 2200, water: 'marine', color: '#efe2d2' },

  { id: 'stone', group: 'decor', kind: 'many', max: 4, label: 'Камни «Сейрю»', spec: '3 шт', price: 1200, water: 'fresh', color: '#8d979c' },
  { id: 'wood', group: 'decor', kind: 'many', max: 3, label: 'Коряга', price: 1900, water: 'fresh', color: '#7a5537' },
  { id: 'amphora', group: 'decor', kind: 'many', max: 2, label: 'Грот-амфора', price: 900, water: 'fresh', color: '#c07041' },
  { id: 'slate', group: 'decor', kind: 'many', max: 3, label: 'Сланцевые плиты', spec: 'террасы', price: 1600, water: 'fresh', color: '#5d6066' },
  { id: 'root', group: 'decor', kind: 'many', max: 2, label: 'Корень «Паук»', spec: 'ветвистая коряга', price: 2300, water: 'fresh', color: '#8a6a4a' },
  { id: 'cave', group: 'decor', kind: 'many', max: 2, label: 'Каменный грот', spec: 'укрытие для рыб', price: 1500, water: 'fresh', color: '#9a8f84' },
  { id: 'liverock', group: 'decor', kind: 'many', max: 4, label: 'Живой камень', spec: 'основа рифа', price: 2600, water: 'marine', color: '#a7678f' },
  { id: 'arch', group: 'decor', kind: 'many', max: 1, label: 'Рифовая арка', price: 3400, water: 'marine', color: '#b48a9c' },
  { id: 'pillar', group: 'decor', kind: 'many', max: 1, label: 'Рифовая скала', spec: 'вертикаль из живого камня', price: 4200, water: 'marine', color: '#9c6b8a' },
  { id: 'shell', group: 'decor', kind: 'many', max: 3, label: 'Раковины', spec: 'стромбус и гребешок', price: 900, water: 'marine', color: '#e9c9a8' },

  { id: 'vallis', group: 'flora', kind: 'many', max: 6, label: 'Валлиснерия', spec: 'задний план', price: 350, water: 'fresh', color: '#4f9a4a' },
  { id: 'cabomba', group: 'flora', kind: 'many', max: 6, label: 'Кабомба', spec: 'пушистый задний план', price: 390, water: 'fresh', color: '#62b04c' },
  { id: 'ludwigia', group: 'flora', kind: 'many', max: 6, label: 'Людвигия', spec: 'красная верхушка', price: 420, water: 'fresh', color: '#c4503d' },
  { id: 'sword', group: 'flora', kind: 'many', max: 4, label: 'Эхинодорус', spec: 'средний план', price: 450, water: 'fresh', color: '#5fae4c' },
  { id: 'crypt', group: 'flora', kind: 'many', max: 4, label: 'Криптокорина', spec: 'бронзовые листья', price: 490, water: 'fresh', color: '#8a6d3a' },
  { id: 'anubias', group: 'flora', kind: 'many', max: 4, label: 'Анубиас', spec: 'на камне', price: 690, water: 'fresh', color: '#2f6f3c' },
  { id: 'hairgrass', group: 'flora', kind: 'many', max: 6, label: 'Элеохарис', spec: 'газон переднего плана', price: 350, water: 'fresh', color: '#6dbb4f' },
  { id: 'moss', group: 'flora', kind: 'many', max: 6, label: 'Мох-шар', spec: 'кладофора', price: 290, water: 'fresh', color: '#3b8a3a' },
  { id: 'leather', group: 'flora', kind: 'many', max: 3, label: 'Саркофитон', spec: 'мягкий коралл', price: 2400, water: 'marine', color: '#e5d2a6' },
  { id: 'anemone', group: 'flora', kind: 'many', max: 2, label: 'Актиния', spec: 'дом для клоуна', price: 1900, water: 'marine', color: '#ff8f7a' },
  { id: 'acropora', group: 'flora', kind: 'many', max: 3, label: 'Акропора', spec: 'жёсткий коралл', price: 3600, water: 'marine', color: '#b9a3e6' },
  { id: 'zoa', group: 'flora', kind: 'many', max: 4, label: 'Зоантусы', spec: 'колония', price: 1500, water: 'marine', color: '#7fd27a' },
  { id: 'brain', group: 'flora', kind: 'many', max: 2, label: 'Мозговик', spec: 'крупнополипный коралл', price: 3900, water: 'marine', color: '#9fd18a' },
  { id: 'disco', group: 'flora', kind: 'many', max: 4, label: 'Дискосомы', spec: 'грибовидные кораллы', price: 1700, water: 'marine', color: '#4a7fd6' },
  { id: 'gorgonian', group: 'flora', kind: 'many', max: 2, label: 'Горгонария', spec: 'морской веер', price: 3200, water: 'marine', color: '#d8602f' },
  { id: 'euphyllia', group: 'flora', kind: 'many', max: 2, label: 'Эуфиллия', spec: 'коралл-молот', price: 4400, water: 'marine', color: '#7dd6b8' },

  { id: 'filter', group: 'tech', kind: 'many', max: 1, label: 'Фильтр', spec: 'чистая вода', price: 3900, water: 'both', color: '#3a434a' },
  { id: 'canister', group: 'tech', kind: 'many', max: 1, label: 'Внешний фильтр', spec: 'тише и мощнее, стоит рядом', price: 8900, water: 'both', color: '#3d4a52' },
  { id: 'light', group: 'tech', kind: 'many', max: 1, label: 'Светильник LED', spec: 'свет для жизни', price: 5900, water: 'both', color: '#f2c94c' },
  { id: 'heater', group: 'tech', kind: 'many', max: 1, label: 'Обогреватель', spec: '24–26 °C', price: 1900, water: 'both', color: '#e0452b' },
  { id: 'thermo', group: 'tech', kind: 'many', max: 1, label: 'Термометр', spec: 'на стекле', price: 390, water: 'both', color: '#d94f3d' },
  { id: 'feeder', group: 'tech', kind: 'many', max: 1, label: 'Автокормушка', spec: 'кормит по расписанию', price: 2900, water: 'both', color: '#e8a33d' },
  { id: 'air', group: 'tech', kind: 'many', max: 1, label: 'Компрессор', spec: 'пузырьки', price: 1400, water: 'fresh', color: '#7ccbd6' },
  { id: 'co2', group: 'tech', kind: 'many', max: 1, label: 'CO₂-система', spec: 'для пышных растений', price: 6900, water: 'fresh', color: '#8fd0a8' },
  { id: 'pump', group: 'tech', kind: 'many', max: 1, label: 'Помпа течения', spec: 'кораллам нужно течение', price: 4900, water: 'marine', color: '#4a90b8' },
  { id: 'skimmer', group: 'tech', kind: 'many', max: 1, label: 'Пеноотделитель', spec: 'чистит морскую воду', price: 9900, water: 'marine', color: '#2f3a40' },

  { id: 'neon', group: 'fauna', kind: 'many', max: 3, label: 'Неоны', spec: 'стайка из 5', price: 750, water: 'fresh', load: 5, count: 5, color: '#29a8e0' },
  { id: 'guppy', group: 'fauna', kind: 'many', max: 3, label: 'Гуппи', spec: 'пара', price: 400, water: 'fresh', load: 4, count: 2, color: '#ff9a3c' },
  { id: 'platy', group: 'fauna', kind: 'many', max: 3, label: 'Пецилии', spec: 'пара', price: 380, water: 'fresh', load: 4, count: 2, color: '#ff6a2a' },
  { id: 'barb', group: 'fauna', kind: 'many', max: 2, label: 'Суматранские барбусы', spec: 'стайка из 5', price: 650, water: 'fresh', load: 8, count: 5, color: '#f2b13a' },
  { id: 'cory', group: 'fauna', kind: 'many', max: 2, label: 'Коридорасы', spec: 'донные, стайка из 3', price: 690, water: 'fresh', load: 6, count: 3, color: '#b8a68a' },
  { id: 'betta', group: 'fauna', kind: 'many', max: 1, label: 'Петушок', spec: 'один на банку', price: 600, water: 'fresh', load: 4, count: 1, color: '#d6334a' },
  { id: 'angel', group: 'fauna', kind: 'many', max: 2, label: 'Скалярия', spec: 'от 100 л', price: 900, water: 'fresh', load: 12, count: 1, minLiters: 100, color: '#c9c4b0' },
  { id: 'discus', group: 'fauna', kind: 'many', max: 2, label: 'Дискус', spec: 'от 200 л', price: 3500, water: 'fresh', load: 25, count: 1, minLiters: 200, color: '#2f8bd6' },
  { id: 'shrimp', group: 'fauna', kind: 'many', max: 2, label: 'Креветки', spec: '5 шт', price: 1000, water: 'fresh', load: 2, count: 5, color: '#3d7bd9' },
  { id: 'snail', group: 'fauna', kind: 'many', max: 3, label: 'Улитка-ампулярия', spec: 'чистит стёкла и дно', price: 290, water: 'fresh', load: 1, count: 1, color: '#e3b23c' },
  { id: 'clown', group: 'fauna', kind: 'many', max: 1, label: 'Рыбы-клоуны', spec: 'пара', price: 5800, water: 'marine', load: 12, count: 2, color: '#ff7a1a' },
  { id: 'chromis', group: 'fauna', kind: 'many', max: 2, label: 'Хромисы', spec: 'стайка из 3', price: 2100, water: 'marine', load: 9, count: 3, color: '#5ec8c2' },
  { id: 'gramma', group: 'fauna', kind: 'many', max: 1, label: 'Королевская грамма', spec: 'фиолетово-жёлтая', price: 3200, water: 'marine', load: 6, count: 1, color: '#8b3fc4' },
  { id: 'mandarin', group: 'fauna', kind: 'many', max: 1, label: 'Мандаринка', spec: 'от 200 л, держится у дна', price: 4800, water: 'marine', load: 8, count: 1, minLiters: 200, color: '#2e9fd0' },
  { id: 'tang', group: 'fauna', kind: 'many', max: 1, label: 'Жёлтый хирург', spec: 'от 200 л', price: 7800, water: 'marine', load: 30, count: 1, minLiters: 200, color: '#ffd23f' },
  { id: 'bluetang', group: 'fauna', kind: 'many', max: 1, label: 'Голубой хирург', spec: 'от 300 л', price: 9900, water: 'marine', load: 30, count: 1, minLiters: 300, color: '#2457d6' },
  { id: 'cleaner', group: 'fauna', kind: 'many', max: 2, label: 'Креветка-чистильщик', price: 2600, water: 'marine', load: 2, count: 1, color: '#e2403a' },
  { id: 'star', group: 'fauna', kind: 'many', max: 2, label: 'Морская звезда', spec: 'ползает по камням и дну', price: 1900, water: 'marine', load: 3, count: 1, color: '#e8632e' },
]

export const byId = Object.fromEntries(ITEMS.map((i) => [i.id, i]))
export const tankById = Object.fromEntries(TANKS.map((t) => [t.id, t]))

export const fitsWater = (item, water) => item.water === 'both' || item.water === water

/** Сколько «нагрузки» выдержит банка: в море запас меньше. */
export const capacity = (tank, water) => Math.round(tank.liters * (water === 'marine' ? 0.4 : 0.5))

export const DEFAULT_GROUND = { fresh: 'sand', marine: 'aragonite' }

/** Цели «готов к запуску» — маленькая игровая шкала. */
export function goals({ ground, placed }) {
  const has = (id) => placed.some((p) => p.id === id)
  return [
    { id: 'ground', label: 'Грунт', done: !!ground },
    { id: 'filter', label: 'Фильтр', done: has('filter') || has('canister') },
    { id: 'light', label: 'Свет', done: has('light') },
    { id: 'heater', label: 'Обогрев', done: has('heater') },
    { id: 'fauna', label: 'Жители', done: placed.some((p) => byId[p.id]?.group === 'fauna') },
  ]
}
