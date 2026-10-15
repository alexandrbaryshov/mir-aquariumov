// Каталог конструктора. Цены ориентировочные (на сайте магазина прайса нет) —
// их нужно сверить с магазином, как и цены витрины.

export const WATERS = [
  { id: 'fresh', label: 'Пресная' },
  { id: 'marine', label: 'Морская' },
]

// size: ширина × высота × глубина в «дециметрах» сцены (1 ед. = 10 см).
export const TANKS = [
  { id: 'nano', label: 'Нано', liters: 30, size: [4, 3, 3], note: '40 × 30 × 30 см', price: 6900 },
  { id: 'classic', label: 'Классика', liters: 100, size: [8, 4, 3.5], note: '80 × 40 × 35 см', price: 14900 },
  { id: 'panorama', label: 'Панорама', liters: 200, size: [10, 5, 4], note: '100 × 50 × 40 см', price: 28900 },
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

  { id: 'stone', group: 'decor', kind: 'many', max: 4, label: 'Камни «Сейрю»', spec: '3 шт', price: 1200, water: 'fresh', color: '#8d979c' },
  { id: 'wood', group: 'decor', kind: 'many', max: 3, label: 'Коряга', price: 1900, water: 'fresh', color: '#7a5537' },
  { id: 'amphora', group: 'decor', kind: 'many', max: 2, label: 'Грот-амфора', price: 900, water: 'fresh', color: '#c07041' },
  { id: 'liverock', group: 'decor', kind: 'many', max: 4, label: 'Живой камень', spec: 'основа рифа', price: 2600, water: 'marine', color: '#a7678f' },
  { id: 'arch', group: 'decor', kind: 'many', max: 1, label: 'Рифовая арка', price: 3400, water: 'marine', color: '#b48a9c' },

  { id: 'vallis', group: 'flora', kind: 'many', max: 6, label: 'Валлиснерия', spec: 'задний план', price: 350, water: 'fresh', color: '#4f9a4a' },
  { id: 'sword', group: 'flora', kind: 'many', max: 4, label: 'Эхинодорус', spec: 'средний план', price: 450, water: 'fresh', color: '#5fae4c' },
  { id: 'anubias', group: 'flora', kind: 'many', max: 4, label: 'Анубиас', spec: 'на камне', price: 690, water: 'fresh', color: '#2f6f3c' },
  { id: 'moss', group: 'flora', kind: 'many', max: 6, label: 'Мох-шар', spec: 'кладофора', price: 290, water: 'fresh', color: '#3b8a3a' },
  { id: 'leather', group: 'flora', kind: 'many', max: 3, label: 'Саркофитон', spec: 'мягкий коралл', price: 2400, water: 'marine', color: '#e5d2a6' },
  { id: 'anemone', group: 'flora', kind: 'many', max: 2, label: 'Актиния', spec: 'дом для клоуна', price: 1900, water: 'marine', color: '#ff8f7a' },
  { id: 'acropora', group: 'flora', kind: 'many', max: 3, label: 'Акропора', spec: 'жёсткий коралл', price: 3600, water: 'marine', color: '#b9a3e6' },
  { id: 'zoa', group: 'flora', kind: 'many', max: 4, label: 'Зоантусы', spec: 'колония', price: 1500, water: 'marine', color: '#7fd27a' },

  { id: 'filter', group: 'tech', kind: 'many', max: 1, label: 'Фильтр', spec: 'чистая вода', price: 3900, water: 'both', color: '#3a434a' },
  { id: 'light', group: 'tech', kind: 'many', max: 1, label: 'Светильник LED', spec: 'свет для жизни', price: 5900, water: 'both', color: '#f2c94c' },
  { id: 'heater', group: 'tech', kind: 'many', max: 1, label: 'Обогреватель', spec: '24–26 °C', price: 1900, water: 'both', color: '#e0452b' },
  { id: 'air', group: 'tech', kind: 'many', max: 1, label: 'Компрессор', spec: 'пузырьки', price: 1400, water: 'fresh', color: '#7ccbd6' },
  { id: 'pump', group: 'tech', kind: 'many', max: 1, label: 'Помпа течения', spec: 'кораллам нужно течение', price: 4900, water: 'marine', color: '#4a90b8' },

  { id: 'neon', group: 'fauna', kind: 'many', max: 3, label: 'Неоны', spec: 'стайка из 5', price: 750, water: 'fresh', load: 5, count: 5, color: '#29a8e0' },
  { id: 'guppy', group: 'fauna', kind: 'many', max: 3, label: 'Гуппи', spec: 'пара', price: 400, water: 'fresh', load: 4, count: 2, color: '#ff9a3c' },
  { id: 'betta', group: 'fauna', kind: 'many', max: 1, label: 'Петушок', spec: 'один на банку', price: 600, water: 'fresh', load: 4, count: 1, color: '#d6334a' },
  { id: 'angel', group: 'fauna', kind: 'many', max: 2, label: 'Скалярия', spec: 'от 100 л', price: 900, water: 'fresh', load: 12, count: 1, minLiters: 100, color: '#c9c4b0' },
  { id: 'shrimp', group: 'fauna', kind: 'many', max: 2, label: 'Креветки', spec: '5 шт', price: 1000, water: 'fresh', load: 2, count: 5, color: '#3d7bd9' },
  { id: 'clown', group: 'fauna', kind: 'many', max: 1, label: 'Рыбы-клоуны', spec: 'пара', price: 5800, water: 'marine', load: 12, count: 2, color: '#ff7a1a' },
  { id: 'chromis', group: 'fauna', kind: 'many', max: 2, label: 'Хромисы', spec: 'стайка из 3', price: 2100, water: 'marine', load: 9, count: 3, color: '#5ec8c2' },
  { id: 'tang', group: 'fauna', kind: 'many', max: 1, label: 'Жёлтый хирург', spec: 'от 200 л', price: 7800, water: 'marine', load: 30, count: 1, minLiters: 200, color: '#ffd23f' },
  { id: 'cleaner', group: 'fauna', kind: 'many', max: 2, label: 'Креветка-чистильщик', price: 2600, water: 'marine', load: 2, count: 1, color: '#e2403a' },
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
    { id: 'filter', label: 'Фильтр', done: has('filter') },
    { id: 'light', label: 'Свет', done: has('light') },
    { id: 'heater', label: 'Обогрев', done: has('heater') },
    { id: 'fauna', label: 'Жители', done: placed.some((p) => byId[p.id]?.group === 'fauna') },
  ]
}
