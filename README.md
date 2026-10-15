# Мир аквариумов

Концепт одностраничного сайта магазина аквариумистики «Мир аквариумов» (Чебоксары).

- интро-погружение сквозь кораллы с плавающими рыбами (хромакей-видео);
- витрина с фильтрами, сортировкой и карточкой товара;
- корзина с сохранением в `localStorage`;
- 3D-конструктор аквариума на three.js / react-three-fiber;
- контакты с картой Яндекса и форма записи на визит.

Учитываются `prefers-reduced-motion` и тёмная тема.

## Стек

React 19, Vite, three.js + @react-three/fiber, Motion, Playwright.

## Запуск

Нужен Node.js 20.19+ или 22.12+.

```bash
npm install
npm run dev       # http://localhost:5179
npm run build     # сборка в dist/
npm run preview   # http://localhost:5180
```

Форма записи отправляет `POST /api/booking`. Отвечает на него небольшой фейковый бэкенд, встроенный в dev- и preview-сервер Vite (см. `vite.config.js`). В статической сборке этого эндпоинта нет.

## Тесты

E2E-тесты на Playwright лежат в `tests/`, план тестирования — в `specs/mir-aquariumov.plan.md`. Тесты запускаются в системном Google Chrome (`channel: 'chrome'`) в двух профилях: desktop и mobile.

```bash
npm test
```

## Структура

```
public/          картинки и видео для сайта
src/
  components/    секции страницы
  builder/       3D-конструктор (сцена, модели, каталог)
tests/           Playwright-тесты
specs/           план тестирования
sources/coral/   скрипты нарезки кораллов из исходного кадра (Python: numpy, Pillow, scipy)
```
