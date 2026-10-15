# Мир аквариумов — Test Plan

## Application Overview

Одностраничный сайт магазина аквариумистики «Мир аквариумов» (Чебоксары, просп. Ленина, 27). Контакты и
ассортимент — с сайта mir-aquariumov. Ключевые пользовательские сценарии: интро-погружение сквозь кораллы,
просмотр витрины (фильтр, сортировка, карточка товара в модальном окне), корзина (добавление, количество,
перестановка, сохранение в localStorage), 3D-конструктор аквариума (вода, объём, грунт, декор, растения/кораллы,
техника, жители; набор в корзину), контакты с картой Яндекса и запись на визит (валидация, ошибка сервера,
успешная запись). Плюс системные режимы: reduced motion, тёмная тема, отсутствие горизонтального скролла на телефоне.

## Test Scenarios

### 1. Витрина

**Seed:** `tests/seed.spec.js`

#### 1.1. should-filter-and-sort-products

**File:** `tests/shop/should-filter-and-sort-products.spec.js`

**Steps:**
  1. Нажать вкладку «Обитатели»
    - expect: в сетке 4 товара
  2. Выбрать порядок «Дешевле»
    - expect: первая карточка — «Креветка «Голубой бархат»» за 350 ₽

#### 1.2. should-open-and-close-product-dialog

**File:** `tests/shop/should-open-and-close-product-dialog.spec.js`

**Steps:**
  1. Нажать на фото «Нано-куб «Подоконник»»
    - expect: открыт диалог с заголовком товара и ценой 14 900 ₽
    - expect: фокус на кнопке «Закрыть»
  2. Нажать Escape
    - expect: диалог закрыт

### 2. Корзина

**Seed:** `tests/seed.spec.js`

#### 2.1. should-add-change-and-persist-cart

**File:** `tests/cart/should-add-change-and-persist-cart.spec.js`

**Steps:**
  1. Добавить «Гуппи эндлера, пара» дважды и «Светильник «Полдень»» один раз
    - expect: счётчик корзины — 3
  2. Перезагрузить страницу
    - expect: счётчик корзины по-прежнему 3
  3. Открыть корзину
    - expect: две строки, итог 19 880 ₽
  4. Удалить обе строки
    - expect: «Пока пусто — рыбка скучает.»

### 3. Конструктор

**Seed:** `tests/seed.spec.js`

#### 3.1. should-build-tank-in-3d-and-add-set-to-cart

**File:** `tests/builder/should-calculate-project-price.spec.js`

**Steps:**
  1. Прокрутить к конструктору
    - expect: 3D-канвас загрузился, смета 15 800 ₽ («Классика» + песок)
  2. Добавить корягу дважды и камни
    - expect: смета 15 800 + 2 × 1 900 + 1 200, на вкладке «Декор» счётчик 3
  3. Убрать одну корягу
    - expect: смета уменьшилась на 1 900
  4. Добавить фильтр, свет, обогреватель и неонов
    - expect: шкала целей — «Готов к запуску»
  5. Переключить воду на «Морская»
    - expect: пресноводное убрано, появилась вкладка «Кораллы», смета 27 500 ₽
  6. Нажать «Весь набор в корзину»
    - expect: счётчик корзины — 1

### 4. Визит

**Seed:** `tests/seed.spec.js`

#### 4.1. should-validate-booking-form

**File:** `tests/visit/should-validate-booking-form.spec.js`

**Steps:**
  1. Нажать «Записаться» с пустой формой
    - expect: три сообщения об ошибке
    - expect: фокус в поле «Имя»

#### 4.2. should-show-server-error-and-recover

**File:** `tests/visit/should-show-server-error-and-recover.spec.js`

**Steps:**
  1. Замокать POST /api/booking ответом 500, заполнить форму и отправить
    - expect: alert «Не получилось отправить: Сервер на обслуживании…»
  2. Снять мок и отправить снова
    - expect: «Ждём вас, Мария!» и номер записи вида MA-1234

#### 4.3. should-show-contacts-and-yandex-map

**File:** `tests/visit/should-show-contacts-and-yandex-map.spec.js`

**Steps:**
  1. Прокрутить к контактам
    - expect: адрес «Чебоксары, просп. Ленина, 27», телефон tel:+78352571955, часы «Уточняйте по телефону»
    - expect: виджет Яндекс Карт с меткой на просп. Ленина, 27 и ссылка «Построить маршрут»

### 5. Системные режимы

**Seed:** `tests/seed.spec.js`

#### 5.1. should-respect-user-preferences

**File:** `tests/system/should-respect-user-preferences.spec.js`

**Steps:**
  1. Эмулировать prefers-reduced-motion: reduce
    - expect: пузырьков нет, вместо плывущей рыбы — статичная
  2. Эмулировать тёмную схему
    - expect: фон страницы тёмный (#06191d)
  3. Переключить тему кнопкой в шапке
    - expect: выбор сохранён в localStorage
  4. Проверить ширину документа
    - expect: нет горизонтального скролла

### 6. Главный экран

**Seed:** `tests/seed.spec.js`

#### 6.1. should-show-name-and-swimming-fish

**File:** `tests/hero/should-show-name-and-swimming-fish.spec.js`

**Steps:**
  1. Открыть главную и дождаться конца погружения
    - expect: по центру заголовок «Мир аквариумов» полностью проявился после ряби, снизу кнопка «Смотреть витрину»
    - expect: в плашке адрес «просп. Ленина, 27» и телефон «+7 (8352) 57-19-55»
  2. Дождаться конца интро
    - expect: слой рыбы проявился (opacity 1)
  3. Подождать
    - expect: клип проплыва проигрывается (currentTime растёт)

#### 6.2. should-layer-fish-behind-and-in-front-of-the-name

**File:** `tests/hero/should-show-name-and-swimming-fish.spec.js`

**Steps:**
  1. Открыть `/?fish=a:behind:3`
    - expect: рыба под буквами (z-index 1)
  2. Открыть `/?fish=b:graze:5`
    - expect: рыба поверх букв (z-index 3), но заходит только на нижний край названия

#### 6.3. should-dive-in-through-corals

**File:** `tests/hero/should-dive-in-through-corals.spec.js`

**Steps:**
  1. Открыть сайт
    - expect: заставки нет, герой сразу в состоянии `data-intro="diving"`
  2. Наблюдать передний план
    - expect: слой ближних кораллов растёт (камера проходит сквозь них)
  3. Дождаться остановки камеры
    - expect: `data-intro="done"`, слои кораллов убраны, название проявилось
  4. Проверить клипы рыбы
    - expect: оба клипа подключены как blob: (скачаны во время погружения)

### 7. Разделы зала

**Seed:** `tests/seed.spec.js`

#### 7.1. should-navigate-halls-with-buttons

**File:** `tests/halls/should-navigate-halls-with-buttons.spec.js`

**Steps:**
  1. Прокрутить к разделам
    - expect: «Предыдущий раздел» неактивна, «Следующий раздел» активна
  2. Нажать «Следующий раздел»
    - expect: лента сдвинулась, «Предыдущий раздел» активна
  3. Листать вперёд до конца
    - expect: «Следующий раздел» неактивна, счётчик заканчивается на «06 / 06»
  4. Нажать «Предыдущий раздел»
    - expect: лента сдвинулась назад
  5. Покрутить колесо мыши над каруселью
    - expect: прокручивается страница — карусель скролл не останавливает