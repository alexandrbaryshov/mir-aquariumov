# Мир аквариумов

Концепт одностраничного сайта магазина аквариумистики «Мир аквариумов» (Чебоксары).

- интро-погружение сквозь кораллы с плавающими рыбами (хромакей-видео);
- витрина с фильтрами, сортировкой и карточкой товара;
- корзина с сохранением в `localStorage`;
- 3D-конструктор аквариума на three.js / react-three-fiber;
- контакты с картой Яндекса и форма записи на визит;
- последняя страница — фото с выставки с подписями и просмотром на весь экран. Кнопка «Записаться на выставку» на главном экране ведёт сначала сюда, а отсюда — к форме записи.

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

Форма записи отправляет `POST /api/booking`. Отвечает на него небольшой фейковый бэкенд, встроенный в dev- и preview-сервер Vite (см. `vite.config.js`). В статической сборке этого эндпоинта нет, поэтому сборка для GitHub Pages собирается с `VITE_DEMO_BOOKING=1`: форма проверяет поля и показывает успешную запись, ничего не отправляя.

## Деплой

Сайт публикуется на GitHub Pages workflow-ом [.github/workflows/deploy.yml](.github/workflows/deploy.yml) при каждом пуше в `main`. В настройках репозитория (Settings → Pages → Source) должно быть выбрано **GitHub Actions**.

Pages отдаёт сайт из подпапки `/<имя-репозитория>/`, поэтому сборка идёт с `--base`, а файлы из `public/` в коде подключаются через `asset()` из `src/asset.js`, а не абсолютным путём `/img/...`.

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
  fonts/         шрифты (Golos Text, JetBrains Mono, Literata), подключены в fonts.css
tests/           Playwright-тесты
specs/           план тестирования
sources/coral/   make_reef.py — готовит кораллы погружения (public/img/reef/, свой набор для
                 телефона и для десктопа) из сгенерированных вырезок sources/coral/reef/
                 (Python: numpy, Pillow, scipy); bake-dive.mjs — запекает размытый фон в public/img/dive/
vistavka/        исходные фото с выставки; на сайте — public/img/expo/
```
