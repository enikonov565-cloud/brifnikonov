/* =========================================================
   Бриф на фотосъёмку nikonovphoto — логика (brief.html)
   Вопросы и этапы описаны массивами в начале файла:
   чтобы поменять анкету, достаточно править только их.
   ========================================================= */
'use strict';

// Адрес приёмника брифов (например, Cloudflare Worker, который пересылает бриф в Telegram).
// Пока адрес пустой, форма предлагает клиенту скачать или скопировать ответы и прислать их в Telegram.

window.BRIEF_CONFIG = window.BRIEF_CONFIG || {
  endpoint: 'https://aged-salad-01e8.enikonov565.workers.dev/'
};

/* ---------- ЭТАПЫ ----------
   id          — внутреннее имя этапа (на него ссылаются вопросы)
   title       — заголовок этапа
   description — пояснение под заголовком                     */
const STEPS = [
  { id: 'format',  title: 'Какой будет съёмка',     description: 'Начнём с главного: формат, повод и кто будет в кадре. От ответа про вид съёмки зависят следующие вопросы.' },
  { id: 'idea',    title: 'Настроение и идея',      description: 'Расскажите, какие фотографии вам хочется получить. Если чёткой идеи пока нет — это нормально, придумаем вместе.' },
  { id: 'place',   title: 'Место и пространство',   description: 'Где пройдёт съёмка и каким будет свет. Всё, что пока непонятно, можно пропустить.' },
  { id: 'details', title: 'Образы и детали',        description: 'Одежда, реквизит, помощники и запасные планы — мелочи, которые делают съёмку спокойной.' },
  { id: 'result',  title: 'Обработка и результат',  description: 'Какими будут готовые кадры: цвет, количество и ретушь.' },
  { id: 'terms',   title: 'Сроки и бюджет',         description: 'Чтобы предложить формат, который впишется в ваши планы и ожидания.' },
  { id: 'contact', title: 'Контакты',               description: 'Последний шаг: как к вам обращаться и куда написать ответ.' }
];

/* ---------- ВОПРОСЫ ----------
   id          — уникальное имя ответа (латиница, без пробелов)
   step        — id этапа из STEPS
   label       — текст вопроса
   hint        — подсказка под вопросом человеческим языком ('' — без подсказки)
   required    — обязательный вопрос (true/false)
   key         — ключевой вопрос: показывается плашка «важно»
   type        — 'textarea' | 'text' | 'choice' | 'files' | 'links'
   options     — варианты ответа для 'choice'
   multi       — можно выбрать несколько вариантов
   other       — под вариантами есть поле «свой вариант»
   placeholder — подсказка внутри поля
   showIf      — показывать вопрос только при ответе: { id: 'shootType', equals: 'Студийная' }
   summary     — короткая подпись для сводки в Telegram (если вопрос нужен в первом сообщении)
   validate    — 'contact': проверить, что это ник Telegram или телефон                    */
const STUDIO = { id: 'shootType', equals: 'Студийная' };
const STREET = { id: 'shootType', equals: 'Уличная' };

const QUESTIONS = [
  // Какой будет съёмка
  { id: 'genre', step: 'format', type: 'choice', multi: true, other: true, required: false, key: false, summary: 'Жанр',
    label: 'Какой жанр вам ближе?',
    hint: 'Можно выбрать несколько.',
    options: ['Портрет', 'Уличный портрет', 'Архитектура', 'Пейзаж'] },
  { id: 'shootType', step: 'format', type: 'choice', required: true, key: true, summary: 'Вид съёмки',
    label: 'Какой вид съёмки вы хотели бы: уличную или студийную?',
    hint: 'Если сомневаетесь, выберите то, что ближе по духу. Всегда можно передумать и обсудить.',
    options: ['Уличная', 'Студийная'] },
  { id: 'goal', step: 'format', type: 'textarea', required: true, key: true, summary: 'Цель',
    label: 'Для какой цели вам нужна съёмка?',
    hint: 'Например: день рождения, портреты для блога, контент для бренда, подарок близкому человеку. Можно в двух словах.',
    placeholder: 'Хочу обновить фото для…' },
  { id: 'people', step: 'format', type: 'choice', required: true, summary: 'Участников',
    label: 'Сколько человек будет участвовать в съёмке?', hint: '',
    options: ['Только я', 'Двое', '3–5 человек', 'Больше пяти', 'Без людей в кадре'] },

  // Настроение и идея
  { id: 'mood', step: 'idea', type: 'textarea', required: true, key: true,
    label: 'Какую атмосферу и настроение вы хотите передать на фотографиях?',
    hint: 'Опишите своими словами: нежно и тепло, дерзко, спокойно, как в кино… Правильных ответов здесь нет.',
    placeholder: 'Хочется, чтобы на фото было…' },
  { id: 'concept', step: 'idea', type: 'textarea', required: false, key: false,
    label: 'Есть ли у вас конкретная идея или концепция съёмки?',
    hint: 'Сюжет, образ, место из фильма — всё, что крутится в голове. Если идеи пока нет, просто пропустите.',
    placeholder: '' },
  { id: 'refFiles', step: 'idea', type: 'files', required: false, key: true,
    label: 'Есть ли у вас примеры фотографий, на которые вы хотите ориентироваться?',
    hint: 'Референсы лучше любых слов показывают, что вам нравится: свет, позы, цвет. Хватит 3–10 картинок.' },
  { id: 'refLinks', step: 'idea', type: 'links', required: false, key: false,
    label: 'Ссылки на примеры',
    hint: 'Pinterest, Instagram, сайты — по одной ссылке на строку.',
    placeholder: 'https://pinterest.com/…' },
  { id: 'outfit', step: 'idea', type: 'textarea', required: false, key: false,
    label: 'Какой стиль одежды вы хотели бы использовать?',
    hint: '', placeholder: 'Повседневный, вечерний, деловой, что-то яркое…' },

  // Место и пространство — студия
  { id: 'studioPick', step: 'place', type: 'choice', required: false, key: true, showIf: STUDIO, summary: 'Подбор студии',
    label: 'Нужен ли вам подбор фотостудии под вашу задумку?',
    hint: 'Я знаю студии с разными интерьерами и светом и подскажу ту, что подойдёт под идею и бюджет.',
    options: ['Да, подберите', 'Студия уже есть', 'Пока не знаю'] },
  { id: 'studioBg', step: 'place', type: 'textarea', required: false, key: false, showIf: STUDIO,
    label: 'Какой интерьер или фон вы хотели бы видеть в студии?',
    hint: '', placeholder: 'Светлый лофт, однотонный фон, домашний интерьер…' },
  { id: 'studioLight', step: 'place', type: 'textarea', required: false, key: false, showIf: STUDIO,
    label: 'Есть ли у вас пожелания по освещению и оформлению пространства?',
    hint: 'Мягкий дневной свет, контрастные тени, цветные акценты, цветы, дым — что угодно.', placeholder: '' },
  { id: 'studioHours', step: 'place', type: 'choice', required: false, key: false, showIf: STUDIO,
    label: 'На сколько часов планируется аренда студии?',
    hint: 'Если не уверены, подскажу по объёму задачи.',
    options: ['1 час', '2 часа', '3 часа и больше', 'Пока не знаю'] },

  // Место и пространство — улица
  { id: 'location', step: 'place', type: 'textarea', required: false, key: true, showIf: STREET, summary: 'Локация',
    label: 'Есть ли у вас конкретная локация для съёмки или нужно подобрать её вместе?',
    hint: 'Если место уже есть, напишите адрес или название. Если нет — подберу варианты под настроение.',
    placeholder: '' },
  { id: 'placeType', step: 'place', type: 'choice', multi: true, other: true, required: false, key: false, showIf: STREET,
    label: 'Какой тип места вам ближе: центр города, улицы, парки, архитектура, дворы или другие локации?',
    hint: 'Можно выбрать несколько.',
    options: ['Центр города', 'Улицы', 'Парки', 'Архитектура', 'Дворы'] },
  { id: 'daytime', step: 'place', type: 'choice', required: false, key: false, showIf: STREET,
    label: 'В какое время суток вы хотели бы провести съёмку?',
    hint: 'Самый мягкий свет бывает утром и в час перед закатом.',
    options: ['Утро', 'День', 'Перед закатом', 'Вечер', 'Не важно'] },
  { id: 'multiLoc', step: 'place', type: 'choice', required: false, key: false, showIf: STREET,
    label: 'Готовы ли вы перемещаться между несколькими локациями?', hint: '',
    options: ['Да, с удовольствием', 'Лучше одна локация', 'Обсудим'] },
  { id: 'placePick', step: 'place', type: 'choice', required: false, key: false, showIf: STREET,
    label: 'Нужен ли вам подбор мест под определённый стиль и настроение?', hint: '',
    options: ['Да, подберите', 'Нет, места уже есть'] },

  // Образы и детали — студия
  { id: 'team', step: 'details', type: 'choice', multi: true, other: true, required: false, key: false, showIf: STUDIO,
    label: 'Нужен ли вам визажист, стилист или другие специалисты?',
    hint: 'Могу порекомендовать проверенных специалистов, с которыми работаю.',
    options: ['Визажист', 'Стилист', 'Парикмахер', 'Никто не нужен'] },
  { id: 'props', step: 'details', type: 'choice', required: false, key: false, showIf: STUDIO,
    label: 'Как будем поступать с реквизитом: используем ваш, подбираем вместе или докупаем?', hint: '',
    options: ['Используем мой', 'Подберём вместе', 'Докупим'] },
  { id: 'wardrobe', step: 'details', type: 'choice', required: false, key: false, showIf: STUDIO,
    label: 'Кто будет заниматься подбором одежды и образов?', hint: '',
    options: ['Я сам(а)', 'Вместе с вами', 'Стилист'] },
  { id: 'ideaHelp', step: 'details', type: 'choice', required: false, key: true, showIf: STUDIO,
    label: 'Нужна ли помощь с разработкой идеи и подготовкой к съёмке?',
    hint: 'Помогу собрать мудборд, продумать образы и сценарий съёмки.',
    options: ['Да, нужна', 'Немного помощи не помешает', 'Справлюсь сам(а)'] },

  // Образы и детали — улица
  { id: 'streetProps', step: 'details', type: 'textarea', required: false, key: false, showIf: STREET,
    label: 'Планируете ли вы использовать реквизит или дополнительные аксессуары?',
    hint: '', placeholder: 'Цветы, шляпа, велосипед, кофе с собой…' },
  { id: 'outfitHelp', step: 'details', type: 'choice', required: false, key: false, showIf: STREET,
    label: 'Нужна ли помощь с подбором одежды под выбранную локацию?', hint: '',
    options: ['Да, помогите', 'Посоветуйте немного', 'Нет, справлюсь'] },
  { id: 'weather', step: 'details', type: 'choice', other: true, required: false, key: true, showIf: STREET,
    label: 'Что будем делать, если погода испортится: перенесём съёмку или заранее подберём запасное место?',
    hint: 'Лучше договориться заранее — тогда дождь не испортит планы.',
    options: ['Перенесём съёмку', 'Подберём запасное место', 'Решим по ситуации'] },
  { id: 'limits', step: 'details', type: 'textarea', required: false, key: false, showIf: STREET,
    label: 'Есть ли ограничения по времени или расстоянию, на которое вы готовы перемещаться?',
    hint: '', placeholder: 'Например: не больше двух часов, только в пределах центра…' },

  // Обработка и результат
  { id: 'grading', step: 'result', type: 'choice', other: true, required: false, key: true,
    label: 'Какую обработку вы предпочитаете: естественную, кинематографичную, яркую или другую?',
    hint: 'Если сложно описать словами, приложите пример на втором этапе.',
    options: ['Естественная', 'Кинематографичная', 'Яркая'] },
  { id: 'bw', step: 'result', type: 'choice', required: false, key: false,
    label: 'Хотели бы вы чёрно-белые фотографии или только цветные?', hint: '',
    options: ['Только цветные', 'Немного чёрно-белых', 'Побольше чёрно-белых'] },
  { id: 'count', step: 'result', type: 'choice', required: false, key: false,
    label: 'Сколько готовых фотографий вы хотели бы получить?', hint: '',
    options: ['До 15', '15–30', '30–50', 'Больше 50', 'Пока не знаю'] },
  { id: 'retouch', step: 'result', type: 'choice', required: false, key: false,
    label: 'Нужна ли вам дополнительная ретушь отдельных фотографий?',
    hint: 'Это детальная работа с кожей, фигурой и фоном сверх базовой обработки. Её можно заказать и после съёмки.',
    options: ['Да', 'Нет', 'Решу после съёмки'] },

  // Сроки и бюджет
  { id: 'budget', step: 'terms', type: 'textarea', required: false, key: true, summary: 'Бюджет',
    label: 'Какой бюджет вы планируете на съёмку?',
    hint: 'Можно вилкой: «от… до…». Так я сразу предложу формат, который в него впишется, — без неловких разговоров.',
    placeholder: 'Например, 15–25 тысяч' },
  { id: 'deadline', step: 'terms', type: 'textarea', required: false, key: true, summary: 'Сроки',
    label: 'В какие сроки вам нужны готовые фотографии?',
    hint: 'Если есть точная дата — день рождения, запуск, поездка, — напишите её.',
    placeholder: '' },
  { id: 'usage', step: 'terms', type: 'choice', multi: true, other: true, required: false, key: false,
    label: 'Как вы планируете использовать фотографии: для себя, социальных сетей, портфолио или других целей?',
    hint: 'Можно выбрать несколько.',
    options: ['Для себя', 'Социальные сети', 'Портфолио', 'Для бизнеса или бренда'] },
  { id: 'extra', step: 'terms', type: 'textarea', required: false, key: false,
    label: 'Есть ли у вас дополнительные пожелания, идеи или детали, которые важно учесть перед съёмкой?',
    hint: 'Что вас волнует, чего точно не хочется, какие ракурсы любите или не любите.', placeholder: '' },

  // Контакты
  { id: 'name', step: 'contact', type: 'text', required: true, key: false,
    label: 'Как к вам обращаться?', hint: '', placeholder: 'Имя' },
  { id: 'contact', step: 'contact', type: 'text', required: true, key: true, validate: 'contact',
    label: 'Ник в Telegram или телефон',
    hint: 'Сюда я напишу ответ на бриф. Проверьте, пожалуйста, что нет опечатки.',
    placeholder: '@username или +7…' },
  { id: 'channel', step: 'contact', type: 'choice', required: false, key: false, summary: 'Удобно писать в',
    label: 'Где вам удобнее общаться?', hint: '',
    options: ['Telegram', 'WhatsApp', 'Звонок'] }
];

/* ---------- НАСТРОЙКИ ---------- */
const SETTINGS = {
  maxFiles: 10,                          // сколько файлов можно приложить
  maxFileSize: 18 * 1024 * 1024,         // размер одного файла
  accept: 'image/*,.heic,.heif,.pdf',    // какие файлы принимаем
  draftKey: 'nikonov-brief-draft-v1',    // ключ черновика в localStorage
  telegram: 'https://t.me/Nikonovevgeny',
  privacyUrl: ''                         // ссылка на политику обработки данных, когда она появится на сайте
};

/* =========================================================
   Дальше — код. Для смены вопросов править его не нужно.
   ========================================================= */

const TOTAL = STEPS.length;
const FINAL = TOTAL + 1;                 // 0 — интро, 1..TOTAL — этапы, FINAL — «Спасибо»
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const pad2 = n => String(n).padStart(2, '0');
const qById = Object.fromEntries(QUESTIONS.map(q => [q.id, q]));

const state = {
  step: 0,
  answers: {},     // { id: строка | массив строк, id__other: строка }
  files: [],       // { id, name, size, type, blob }
  consent: false,
  touched: false,  // человек уже что-то ввёл
  submitted: false,// бриф успешно отправлен
  attempt: 0,      // номер попытки отправки
  briefId: '',
  lastPayload: null
};

/* ---------- Типограф: предлоги и союзы не висят в конце строки ---------- */
const SHORT_WORDS = 'а|без|в|во|вы|где|да|для|до|же|за|и|из|или|как|к|ко|ли|мы|на|над|не|ни|но|о|об|обо|от|по|под|при|про|с|со|у|что|чтобы|через|я|бы';
const RE_SHORT = new RegExp('(^|[\\s«(„"])(' + SHORT_WORDS + ')\\s+', 'giu');
function typo(text) {
  if (!text) return text;
  let t = String(text);
  t = t.replace(RE_SHORT, (m, p, w) => p + w + ' ');
  t = t.replace(RE_SHORT, (m, p, w) => p + w + ' ');   // второй проход для «и в», «а с»
  t = t.replace(/ +([—–])/g, ' $1');                     // тире не начинает строку
  t = t.replace(/(\d) +(?=[а-яё])/giu, '$1 ');           // «7 этапов», «2 часа»
  if (t.trim().length > 24) t = t.replace(/ (\S+)$/u, ' $1'); // последнее слово не висит
  return t;
}
function typoTree(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: n => /^(SCRIPT|STYLE|TEXTAREA|OPTION)$/.test(n.parentNode.nodeName) || !n.nodeValue.trim()
      ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(n => { const v = typo(n.nodeValue); if (v !== n.nodeValue) n.nodeValue = v; });
}

/* ---------- Создание элементов ---------- */
function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = typo(v);
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v === true ? '' : v);
  }
  children.flat().forEach(c => c != null && node.append(c));
  return node;
}

function pluralize(n, one, few, many) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' Б';
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' КБ';
  return (bytes / 1024 / 1024).toFixed(1).replace(/\.0$/, '').replace('.', ',') + ' МБ';
}

/* =========================================================
   Отрисовка этапов
   ========================================================= */
function renderStages() {
  const wrap = $('#stages');
  STEPS.forEach((step, i) => {
    const n = i + 1;
    const questions = QUESTIONS.filter(q => q.step === step.id);
    const section = el('section', { class: 'stage', 'data-step': n, 'aria-labelledby': 'stageTitle' + n, hidden: true },
      el('aside', { class: 'stage__aside' },
        el('p', { class: 'stage__num', 'aria-hidden': 'true' }, el('span', {}, pad2(n)), el('small', {}, '/ ' + pad2(TOTAL))),
        el('h2', { class: 'stage__title', id: 'stageTitle' + n, tabindex: '-1', text: step.title }),
        el('p', { class: 'stage__desc', text: step.description }),
        el('p', { class: 'stage__meta', 'data-meta': '' })
      ),
      el('div', { class: 'stage__body' },
        questions.map(renderQuestion),
        // Если вопросы этапа зависят от вида съёмки, а он ещё не выбран
        questions.length && questions.every(q => q.showIf) ? el('div', { class: 'stage__empty', 'data-empty': '' },
          el('p', { text: 'Вопросы этого этапа зависят от вида съёмки. Выберите его на первом шаге — и они появятся здесь.' }),
          el('button', { class: 'pill-btn', type: 'button', onclick: () => goTo(1) }, '← К выбору вида съёмки')
        ) : null,
        step.id === 'contact' ? renderConsent() : null
      )
    );
    wrap.append(section);
  });

  // Точки навигации
  const dots = $('#dots');
  STEPS.forEach((step, i) => {
    dots.append(el('li', {},
      el('button', {
        class: 'dot', type: 'button', 'data-dot': i + 1,
        'aria-label': `Этап ${i + 1} из ${TOTAL}: ${step.title}`,
        onclick: () => goTo(i + 1)
      })
    ));
  });
}

function renderQuestion(q) {
  const fid = 'f-' + q.id, hid = 'h-' + q.id, eid = 'e-' + q.id;
  const isGroup = q.type === 'choice';
  const describedBy = [q.hint ? hid : null, eid].filter(Boolean).join(' ');

  const labelInner = [typo(q.label), q.required ? el('span', { class: 'req', 'aria-hidden': 'true' }, '*') : null];
  const head = el('div', { class: 'q__head' },
    isGroup
      ? el('p', { class: 'q__label', id: 'l-' + q.id }, ...labelInner)
      : el('label', { class: 'q__label', for: fid, id: 'l-' + q.id }, ...labelInner),
    q.key ? el('span', { class: 'badge' }, 'важно') : null
  );
  const hint = q.hint ? el('p', { class: 'q__hint', id: hid, text: q.hint }) : null;
  const error = el('p', { class: 'q__error', id: eid, 'aria-live': 'polite' });

  let control;
  if (q.type === 'text') {
    control = el('input', {
      class: 'field', id: fid, type: 'text', name: q.id, placeholder: q.placeholder || '',
      autocomplete: q.id === 'name' ? 'given-name' : 'off',
      'aria-describedby': describedBy, 'aria-required': q.required ? 'true' : null,
      enterkeyhint: 'next'
    });
    control.addEventListener('input', () => setAnswer(q.id, control.value));
  } else if (q.type === 'textarea' || q.type === 'links') {
    control = el('textarea', {
      class: 'field' + (q.type === 'links' ? ' field--small' : ''), id: fid, name: q.id, rows: q.type === 'links' ? 3 : 4,
      placeholder: q.placeholder || '', 'aria-describedby': describedBy,
      'aria-required': q.required ? 'true' : null,
      spellcheck: q.type === 'links' ? 'false' : 'true',
      inputmode: q.type === 'links' ? 'url' : null
    });
    control.addEventListener('input', () => { autoGrow(control); setAnswer(q.id, control.value); });
  } else if (q.type === 'choice') {
    const type = q.multi ? 'checkbox' : 'radio';
    control = el('div', {},
      el('div', { class: 'opts' },
        q.options.map(opt => {
          const input = el('input', { type, name: q.id, value: opt, 'aria-describedby': describedBy });
          input.addEventListener('change', () => {
            if (q.multi) setAnswer(q.id, $$(`input[name="${q.id}"]:checked`).map(i => i.value));
            else setAnswer(q.id, input.value);
          });
          // Повторный клик по выбранному варианту снимает выбор
          if (!q.multi) input.addEventListener('click', () => {
            if (input.dataset.was === '1') { input.checked = false; setAnswer(q.id, ''); }
            input.dataset.was = '0';
          });
          if (!q.multi) input.addEventListener('pointerdown', () => { input.dataset.was = input.checked ? '1' : '0'; });
          return el('label', { class: 'opt' + (q.multi ? ' opt--multi' : '') }, input, el('span', {}, opt));
        })
      ),
      q.other ? el('div', { class: 'other' }, (() => {
        const ta = el('textarea', {
          class: 'field', rows: 1, name: q.id + '__other', id: fid + '-other',
          placeholder: 'Свой вариант', 'aria-label': 'Свой вариант: ' + q.label
        });
        ta.addEventListener('input', () => { autoGrow(ta); setAnswer(q.id + '__other', ta.value); });
        return ta;
      })()) : null
    );
  } else if (q.type === 'files') {
    control = renderDrop(q, fid, describedBy);
  }

  const box = el('div', {
    class: 'q', id: 'q-' + q.id, 'data-q': q.id,
    role: isGroup ? 'group' : null,
    'aria-labelledby': isGroup ? 'l-' + q.id : null,
    'aria-describedby': isGroup ? describedBy : null
  }, head, hint, control, error);
  return box;
}

function renderDrop(q, fid, describedBy) {
  const input = el('input', { type: 'file', id: fid, multiple: true, accept: SETTINGS.accept, 'aria-describedby': describedBy });
  input.addEventListener('change', () => { addFiles(input.files); input.value = ''; });

  const drop = el('label', { class: 'drop', for: fid },
    input,
    el('span', { class: 'drop__icon', html: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/></svg>' }),
    el('span', { class: 'drop__title', html: typo('Перетащите файлы сюда или <u>выберите на устройстве</u>') }),
    el('span', { class: 'drop__meta', text: `До ${SETTINGS.maxFiles} файлов, каждый до ${formatSize(SETTINGS.maxFileSize)} · JPG, PNG, HEIC, PDF` })
  );

  // Перетаскивание
  let depth = 0;
  drop.addEventListener('dragenter', e => { e.preventDefault(); depth++; drop.classList.add('is-over'); });
  drop.addEventListener('dragover', e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
  drop.addEventListener('dragleave', () => { if (--depth <= 0) { depth = 0; drop.classList.remove('is-over'); } });
  drop.addEventListener('drop', e => {
    e.preventDefault(); depth = 0; drop.classList.remove('is-over');
    if (e.dataTransfer && e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  });

  return el('div', {}, drop, el('ul', { class: 'files', id: 'fileList', 'aria-live': 'polite' }), el('p', { class: 'files__count', id: 'fileCount', hidden: true }));
}

function renderConsent() {
  const input = el('input', { type: 'checkbox', id: 'consent', name: 'consent', 'aria-describedby': 'e-consent', 'aria-required': 'true' });
  input.addEventListener('change', () => {
    state.consent = input.checked;
    if (input.checked) clearError('consent');
    updateNextButton();
    saveDraft();
  });
  const text = el('span', {});
  const consentText = 'Я даю согласие на обработку моих персональных данных (имя, контакт и ответы брифа) для ответа на заявку';
  text.innerHTML = (SETTINGS.privacyUrl
    ? typo(consentText + ' в соответствии с ') + `<a href="${SETTINGS.privacyUrl}" target="_blank" rel="noopener">${typo('Политикой обработки персональных данных')}</a>`
    : typo(consentText)) + '<span class="req" aria-hidden="true"> *</span>';
  return el('div', { class: 'consent', id: 'q-consent' },
    el('label', { class: 'consent__row' }, input, text),
    el('p', { class: 'q__error', id: 'e-consent', 'aria-live': 'polite' })
  );
}

/* ---------- Поле растёт по мере набора текста ---------- */
function autoGrow(ta) {
  if (!ta || !ta.offsetParent) return;
  ta.style.height = 'auto';
  ta.style.height = (ta.scrollHeight + 2) + 'px';
}
function growAll(root = document) { $$('textarea.field', root).forEach(autoGrow); }

/* =========================================================
   Ответы и видимость вопросов
   ========================================================= */
function setAnswer(id, value) {
  state.answers[id] = value;
  state.touched = true;
  const baseId = id.replace(/__other$/, '');
  clearError(baseId);
  if (id === 'shootType') updateVisibility();
  updateDots();
  scheduleSave();
}

function isVisible(q) {
  if (!q.showIf) return true;
  return state.answers[q.showIf.id] === q.showIf.equals;
}

function updateVisibility() {
  QUESTIONS.forEach(q => {
    const box = document.getElementById('q-' + q.id);
    if (box) box.hidden = !isVisible(q);
  });
  $$('[data-empty]').forEach(node => {
    const stage = node.closest('.stage');
    node.hidden = $$('.q', stage).some(b => !b.hidden);
  });
  // Подпись «N вопросов» в левой колонке
  STEPS.forEach((step, i) => {
    const meta = $(`.stage[data-step="${i + 1}"] [data-meta]`);
    const visible = QUESTIONS.filter(q => q.step === step.id && isVisible(q) && q.type !== 'links');
    const req = visible.filter(q => q.required).length;
    if (!visible.length) { meta.textContent = ''; return; }
    meta.textContent = typo(`${visible.length} ${pluralize(visible.length, 'вопрос', 'вопроса', 'вопросов')}` +
      (req ? ` · ${req} ${pluralize(req, 'обязательный', 'обязательных', 'обязательных')}` : ' · все по желанию'));
  });
}

function answerText(q) {
  // Текст ответа для отправки и файла (пустая строка — вопрос пропущен)
  if (q.type === 'files') return state.files.map(f => `${f.name} (${formatSize(f.size)})`).join('\n');
  let v = state.answers[q.id];
  const other = (state.answers[q.id + '__other'] || '').trim();
  if (Array.isArray(v)) v = v.join(', ');
  v = (v || '').trim();
  if (q.type === 'links') v = v.split(/\n+/).map(s => s.trim()).filter(Boolean).join('\n');
  if (other) v = v ? `${v}; свой вариант: ${other}` : other;
  return v;
}

function isAnswered(q) { return answerText(q) !== ''; }

/* ---------- Заполнение полей из черновика ---------- */
function fillForm() {
  QUESTIONS.forEach(q => {
    const v = state.answers[q.id];
    if (q.type === 'text' || q.type === 'textarea' || q.type === 'links') {
      const f = document.getElementById('f-' + q.id);
      if (f && typeof v === 'string') f.value = v;
    } else if (q.type === 'choice') {
      const values = Array.isArray(v) ? v : [v];
      $$(`input[name="${q.id}"]`).forEach(i => { i.checked = values.includes(i.value); });
      const o = document.getElementById('f-' + q.id + '-other');
      if (o) o.value = state.answers[q.id + '__other'] || '';
    }
  });
  const c = $('#consent');
  if (c) c.checked = !!state.consent;
  renderFiles();
  updateVisibility();
}

/* =========================================================
   Проверка обязательных полей
   ========================================================= */
const CONTACT_RE = /^(@?[a-z0-9_]{4,32}|(https?:\/\/)?t\.me\/[a-z0-9_]{4,32}|\+?[\d\s()\-]{10,20})$/i;

function questionError(q) {
  if (!isVisible(q)) return '';
  const v = answerText(q);
  if (q.required && !v) return q.type === 'choice' ? 'Выберите вариант, пожалуйста' : 'Ответьте, пожалуйста — это поможет подготовиться';
  if (q.validate === 'contact' && v && !CONTACT_RE.test(v.trim())) return 'Укажите ник в Telegram (например, @nikonovphoto) или номер телефона';
  return '';
}

function showError(id, msg) {
  const box = document.getElementById('q-' + id);
  const err = document.getElementById('e-' + id);
  if (!box || !err) return;
  box.classList.add('is-invalid');
  err.textContent = msg;
  const f = document.getElementById('f-' + id);
  if (f) f.setAttribute('aria-invalid', 'true');
}
function clearError(id) {
  const box = document.getElementById('q-' + id);
  if (!box || !box.classList.contains('is-invalid')) return;
  box.classList.remove('is-invalid');
  const err = document.getElementById('e-' + id);
  if (err) err.textContent = '';
  const f = document.getElementById('f-' + id);
  if (f) f.removeAttribute('aria-invalid');
  updateDots();
}

// Возвращает список вопросов с ошибками на этапе; show — подсветить их
function validateStep(n, show = true) {
  const step = STEPS[n - 1];
  const bad = [];
  QUESTIONS.filter(q => q.step === step.id).forEach(q => {
    const msg = questionError(q);
    if (msg) { bad.push(q.id); if (show) showError(q.id, msg); }
    else if (show) clearError(q.id);
  });
  return bad;
}

function focusFirstError(n) {
  const box = $(`.stage[data-step="${n}"] .q.is-invalid, .stage[data-step="${n}"] .consent.is-invalid`);
  if (!box) return;
  box.scrollIntoView({ behavior: prefersReduced() ? 'auto' : 'smooth', block: 'center' });
  const target = $('input:not([type=hidden]), textarea', box);
  if (target) setTimeout(() => target.focus({ preventScroll: true }), prefersReduced() ? 0 : 350);
}

const prefersReduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* =========================================================
   Переходы между экранами
   ========================================================= */
function goTo(n, opts = {}) {
  n = Math.max(0, Math.min(FINAL, n));
  state.step = n;

  $('#intro').hidden = n !== 0;
  $('#brief').hidden = n === 0 || n === FINAL;
  $('#final').hidden = n !== FINAL;
  $$('.stage').forEach(s => {
    const on = Number(s.dataset.step) === n;
    s.hidden = !on;
    s.classList.toggle('is-entering', on && !opts.instant);
  });

  // Шапка: счётчик и прогресс
  const counter = $('#counter');
  counter.hidden = n === 0 || n === FINAL;
  $('#counterNow').textContent = pad2(Math.min(n, TOTAL));
  const pct = n === FINAL ? 100 : Math.round((n / TOTAL) * 100) - (n ? 4 : 0);
  $('#progressBar').style.width = Math.max(0, pct) + '%';
  $('.progress').setAttribute('aria-valuenow', Math.max(0, pct));

  $('#backBtn').disabled = false;
  updateNextButton();
  updateDots();

  if (n >= 1 && n <= TOTAL) requestAnimationFrame(() => growAll($(`.stage[data-step="${n}"]`)));
  if (n === FINAL) renderFinal();

  window.scrollTo({ top: 0, behavior: 'auto' });
  if (!opts.noFocus) {
    const title = n === 0 ? $('#introTitle') : n === FINAL ? $('#finalTitle') : $('#stageTitle' + n);
    if (title) title.focus({ preventScroll: true });
  }
  if (n !== FINAL) saveDraft(true);
}

function next() {
  const n = state.step;
  const bad = validateStep(n);
  if (bad.length) { focusFirstError(n); return; }
  if (n < TOTAL) goTo(n + 1);
  else submit();
}

function back() {
  if (state.step > 1) goTo(state.step - 1);
  else goTo(0);
}

function updateNextButton() {
  const last = state.step === TOTAL;
  $('#nextLabel').textContent = last ? 'Отправить бриф' : 'Далее';
  $('#nextBtn').setAttribute('aria-disabled', last && !state.consent ? 'true' : 'false');
}

function updateDots() {
  $$('.dot').forEach(dot => {
    const n = Number(dot.dataset.dot);
    const step = STEPS[n - 1];
    const qs = QUESTIONS.filter(q => q.step === step.id && isVisible(q));
    const hasError = !!$(`.stage[data-step="${n}"] .is-invalid`);
    const done = qs.length > 0 && qs.filter(q => q.required).every(isAnswered) && qs.some(isAnswered);
    dot.classList.toggle('is-current', n === state.step);
    dot.classList.toggle('is-done', done && n !== state.step);
    dot.classList.toggle('is-error', hasError && n !== state.step);
    if (n === state.step) dot.setAttribute('aria-current', 'step'); else dot.removeAttribute('aria-current');
  });
}

/* =========================================================
   Черновик: localStorage для ответов, IndexedDB для файлов
   ========================================================= */
let saveTimer = null;
function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveDraft(), 300);
}

function saveDraft(silent = false) {
  if (state.submitted) return;                  // бриф уже отправлен — черновик не нужен
  if (!state.touched && !state.files.length) return;
  try {
    localStorage.setItem(SETTINGS.draftKey, JSON.stringify({
      v: 1,
      step: state.step === FINAL ? TOTAL : state.step,
      answers: state.answers,
      consent: state.consent,
      briefId: state.briefId,
      savedAt: Date.now()
    }));
    if (!silent) flashSaved();
  } catch (e) { /* хранилище недоступно — форма всё равно работает */ }
}

let savedTimer = null;
function flashSaved() {
  const s = $('#saved');
  s.textContent = 'черновик сохранён';
  s.classList.add('is-on');
  clearTimeout(savedTimer);
  savedTimer = setTimeout(() => s.classList.remove('is-on'), 2200);
}

function readDraft() {
  try {
    const raw = localStorage.getItem(SETTINGS.draftKey);
    if (!raw) return null;
    const d = JSON.parse(raw);
    return d && d.v === 1 ? d : null;
  } catch (e) { return null; }
}

function clearDraft() {
  try { localStorage.removeItem(SETTINGS.draftKey); } catch (e) { /* ничего */ }
  fileStore.clear().catch(() => {});
}

// Мини-обёртка над IndexedDB: файлы переживают закрытие вкладки
const fileStore = (() => {
  let dbPromise = null;
  function open() {
    if (!('indexedDB' in window)) return Promise.reject(new Error('no idb'));
    if (!dbPromise) {
      dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open('nikonov-brief', 1);
        req.onupgradeneeded = () => req.result.createObjectStore('files', { keyPath: 'id' });
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    }
    return dbPromise;
  }
  async function run(mode, fn) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('files', mode);
      const req = fn(tx.objectStore('files'));
      tx.oncomplete = () => resolve(req ? req.result : undefined);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }
  return {
    put: f => run('readwrite', s => s.put(f)),
    remove: id => run('readwrite', s => s.delete(id)),
    all: () => run('readonly', s => s.getAll()),
    clear: () => run('readwrite', s => s.clear())
  };
})();

/* =========================================================
   Файлы
   ========================================================= */
function addFiles(list) {
  const incoming = [...list];
  const problems = [];
  for (const file of incoming) {
    if (state.files.length >= SETTINGS.maxFiles) {
      problems.push(`Можно приложить не больше ${SETTINGS.maxFiles} файлов — «${file.name}» не добавлен`);
      continue;
    }
    if (file.size > SETTINGS.maxFileSize) {
      problems.push(`«${file.name}» больше ${formatSize(SETTINGS.maxFileSize)} — пришлите его потом в Telegram`);
      continue;
    }
    if (state.files.some(f => f.name === file.name && f.size === file.size)) continue;
    const item = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      name: file.name, size: file.size, type: file.type, blob: file
    };
    state.files.push(item);
    fileStore.put(item).catch(() => {});
  }
  state.touched = true;
  renderFiles();
  const err = $('#e-refFiles');
  if (err) {
    err.textContent = problems.join('. ');
    $('#q-refFiles').classList.toggle('is-invalid', problems.length > 0);
  }
  updateDots();
  saveDraft();
}

function removeFile(id) {
  state.files = state.files.filter(f => f.id !== id);
  fileStore.remove(id).catch(() => {});
  renderFiles();
  clearError('refFiles');
  saveDraft();
}

const thumbUrls = new Map();
function renderFiles() {
  const list = $('#fileList');
  if (!list) return;
  // Освобождаем превью удалённых файлов
  for (const [id, url] of thumbUrls) {
    if (!state.files.some(f => f.id === id)) { URL.revokeObjectURL(url); thumbUrls.delete(id); }
  }
  list.replaceChildren(...state.files.map(f => {
    const isImage = /^image\/(jpeg|png|gif|webp|avif)$/.test(f.type);
    let thumb;
    if (isImage) {
      if (!thumbUrls.has(f.id)) thumbUrls.set(f.id, URL.createObjectURL(f.blob));
      thumb = el('span', { class: 'file__thumb', style: `background-image:url("${thumbUrls.get(f.id)}")` });
    } else {
      const ext = (f.name.split('.').pop() || '').slice(0, 4);
      thumb = el('span', { class: 'file__thumb' }, ext);
    }
    return el('li', { class: 'file' },
      thumb,
      el('span', { class: 'file__name', title: f.name }, f.name),
      el('span', { class: 'file__size' }, formatSize(f.size)),
      el('button', { class: 'file__del', type: 'button', 'aria-label': 'Удалить файл ' + f.name, onclick: () => removeFile(f.id) }, '×')
    );
  }));
  const count = $('#fileCount');
  count.hidden = !state.files.length;
  count.textContent = `Загружено ${state.files.length} из ${SETTINGS.maxFiles}`;
}

/* =========================================================
   Сбор ответов: для Telegram и для файла-копии
   ========================================================= */
function makeBriefId() {
  const d = new Date();
  return 'B' + d.getFullYear().toString().slice(2) + pad2(d.getMonth() + 1) + pad2(d.getDate()) + '-' +
    Math.random().toString(36).slice(2, 6).toUpperCase();
}

function buildPayload() {
  if (!state.briefId) state.briefId = makeBriefId();
  const sections = STEPS.map(step => ({
    title: step.title,
    items: QUESTIONS
      .filter(q => q.step === step.id && isVisible(q))
      .map(q => ({ q: q.label, a: answerText(q) }))
      .filter(item => item.a)                         // пустые вопросы не отправляем
  })).filter(s => s.items.length);

  const summary = QUESTIONS
    .filter(q => q.summary && isVisible(q) && isAnswered(q))
    .map(q => ({ q: q.summary, a: shorten(answerText(q).replace(/\s*\n+\s*/g, ', '), 160) }));

  return {
    id: state.briefId,
    attempt: state.attempt,
    createdAt: new Date().toISOString(),
    page: location.href.split('#')[0],
    name: answerText(qById.name),
    contact: answerText(qById.contact),
    summary,
    sections,
    files: state.files.map(f => ({ name: f.name, size: f.size })),
    website: $('#hpWebsite').value               // ловушка для ботов
  };
}

// Обрезает длинный ответ для сводки по границе слова (полный ответ — в сообщении этапа)
function shorten(text, max) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return cut.slice(0, Math.max(cut.lastIndexOf(' '), max * 0.6)).replace(/[\s,.;:—–-]+$/, '') + '…';
}

function payloadToText(p) {
  const date = new Date(p.createdAt).toLocaleString('ru-RU', { dateStyle: 'long', timeStyle: 'short' });
  const lines = [
    'БРИФ НА ФОТОСЪЁМКУ',
    'nikonovphoto · ' + SETTINGS.telegram,
    '',
    `Заполнено: ${date}`,
    `Номер брифа: ${p.id}`,
    '',
    '— Коротко —',
    `Имя: ${p.name || '—'}`,
    `Контакт: ${p.contact || '—'}`,
    ...p.summary.map(s => `${s.q}: ${s.a}`)
  ];
  p.sections.forEach(s => {
    lines.push('', '', `— ${s.title} —`);
    s.items.forEach(it => lines.push('', it.q, it.a));
  });
  if (p.files.length) {
    lines.push('', '', 'Файлы с примерами не помещаются в этот документ —', 'пришлите их, пожалуйста, отдельно в Telegram.');
  }
  return lines.join('\n').replace(/\r?\n/g, '\r\n');   // переносы строк, понятные Блокноту
}

function downloadAnswers(payload) {
  const p = payload || buildPayload();
  const text = '﻿' + payloadToText(p);     // BOM — чтобы Блокнот открыл кириллицу
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const slug = (p.name || 'бриф').trim().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '').slice(0, 30) || 'бриф';
  const a = el('a', { href: URL.createObjectURL(blob), download: `бриф-${slug}-${p.id}.txt` });
  document.body.append(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  toast('Файл с ответами скачан');
}

async function copyAnswers(payload) {
  const text = payloadToText(payload || buildPayload());
  try {
    await navigator.clipboard.writeText(text);
    toast('Ответы скопированы — вставьте их в чат');
  } catch (e) {
    // Запасной способ для старых браузеров
    const ta = el('textarea', { style: 'position:fixed;opacity:0' });
    ta.value = text;
    document.body.append(ta);
    ta.select();
    try { document.execCommand('copy'); toast('Ответы скопированы — вставьте их в чат'); }
    catch (err) { toast('Не получилось скопировать — скачайте файл'); }
    ta.remove();
  }
}

/* =========================================================
   Отправка
   ========================================================= */
let sending = false;

async function submit() {
  if (sending) return;

  // 1. Все обязательные поля на всех этапах
  for (let n = 1; n <= TOTAL; n++) {
    if (validateStep(n, false).length) {
      if (state.step !== n) goTo(n, { noFocus: true });
      validateStep(n, true);
      updateDots();
      toast('Остался вопрос без ответа — он подсвечен');
      setTimeout(() => focusFirstError(n), 120);
      return;
    }
  }
  // 2. Согласие на обработку данных
  if (!state.consent) {
    const box = $('#q-consent');
    box.classList.add('is-invalid');
    $('#e-consent').textContent = 'Без этого согласия я не смогу получить бриф';
    box.scrollIntoView({ behavior: prefersReduced() ? 'auto' : 'smooth', block: 'center' });
    $('#consent').focus({ preventScroll: true });
    return;
  }

  state.attempt += 1;
  const payload = buildPayload();
  state.lastPayload = payload;
  saveDraft(true);

  const endpoint = ((window.BRIEF_CONFIG && window.BRIEF_CONFIG.endpoint) || '').trim();
  if (!endpoint) { openDialog('offline'); return; }

  sending = true;
  setBusy(true, 'Отправляю…');
  try {
    const res = await fetchWithTimeout(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }, 30000);
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.ok === false) throw new Error(data.error || 'HTTP ' + res.status);
  } catch (e) {
    sending = false;
    setBusy(false);
    console.warn('Бриф не отправлен:', e);
    openDialog('error');
    return;
  }

  // 3. Файлы — по одному, чтобы большой файл не мешал тексту дойти
  const failed = [];
  for (let i = 0; i < state.files.length; i++) {
    const f = state.files[i];
    setBusy(true, `Файлы: ${i + 1} из ${state.files.length}`);
    try {
      const fd = new FormData();
      fd.append('briefId', payload.id);
      fd.append('name', payload.name);
      fd.append('index', String(i + 1));
      fd.append('total', String(state.files.length));
      fd.append('file', f.blob, f.name);
      const r = await fetchWithTimeout(endpoint, { method: 'POST', body: fd }, 180000);
      const d = await r.json().catch(() => ({}));
      if (!r.ok || d.ok === false) throw new Error(d.error || 'HTTP ' + r.status);
    } catch (e) {
      failed.push(f.name);
    }
  }

  sending = false;
  setBusy(false);
  state.failedFiles = failed;
  state.submitted = true;
  clearTimeout(saveTimer);
  clearDraft();
  goTo(FINAL);
}

function fetchWithTimeout(url, options, ms) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { ...options, signal: ctrl.signal }).finally(() => clearTimeout(timer));
}

function setBusy(on, label) {
  const btn = $('#nextBtn');
  btn.classList.toggle('is-busy', on);
  btn.setAttribute('aria-busy', on ? 'true' : 'false');
  $('#nextLabel').textContent = on ? label : (state.step === TOTAL ? 'Отправить бриф' : 'Далее');
  $('#backBtn').disabled = on;
}

/* ---------- Диалог «скачайте ответы» ---------- */
function openDialog(kind) {
  const dlg = $('#dlg');
  const p = state.lastPayload;
  const texts = {
    offline: {
      title: 'Бриф готов',
      text: 'Онлайн-отправка пока не подключена. Скачайте файл с ответами и пришлите его мне в Telegram — или скопируйте текст и вставьте в чат.'
    },
    error: {
      title: 'Не получилось отправить',
      text: 'Похоже, пропала связь или сервис временно недоступен. Попробуйте ещё раз через минуту — или скачайте ответы и пришлите их мне в Telegram.'
    }
  }[kind];
  $('#dlgTitle').textContent = typo(texts.title);
  $('#dlgText').textContent = typo(texts.text);

  const actions = $('#dlgActions');
  const primary = (label, onclick) => el('button', { class: 'brf__cta', type: 'button', onclick }, label + ' →');
  const ghost = (label, onclick, href) => href
    ? el('a', { class: 'pill-btn', href, target: '_blank', rel: 'noopener' }, label)
    : el('button', { class: 'pill-btn', type: 'button', onclick }, label);

  if (kind === 'offline') {
    actions.replaceChildren(
      primary('Скачать ответы', () => downloadAnswers(p)),
      ghost('Скопировать текст', () => copyAnswers(p)),
      ghost('Написать в Telegram', null, SETTINGS.telegram)
    );
  } else {
    actions.replaceChildren(
      primary('Попробовать ещё раз', () => { dlg.close(); submit(); }),
      ghost('Скачать ответы', () => downloadAnswers(p)),
      ghost('Написать в Telegram', null, SETTINGS.telegram)
    );
  }
  if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
}

/* ---------- Финальный экран ---------- */
function renderFinal() {
  const warn = $('#finalWarn');
  const failed = state.failedFiles || [];
  warn.hidden = !failed.length;
  if (failed.length) {
    warn.textContent = typo(`Ответы дошли, но ${failed.length === 1 ? 'один файл не загрузился' : 'часть файлов не загрузилась'}: ${failed.join(', ')}. Пришлите, пожалуйста, ${failed.length === 1 ? 'его' : 'их'} мне в Telegram.`);
  }
}

/* ---------- Уведомления ---------- */
let toastTimer = null;
function toast(text, action) {
  const t = $('#toast');
  $('#toastText').textContent = typo(text);
  const btn = $('#toastAction');
  btn.hidden = !action;
  btn.onclick = null;
  if (action) {
    btn.textContent = action.label;
    btn.onclick = () => { hideToast(); action.onClick(); };
  }
  t.classList.remove('is-leaving');
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, action ? 7000 : 3200);
}
function hideToast() {
  const t = $('#toast');
  t.classList.add('is-leaving');
  setTimeout(() => { t.hidden = true; t.classList.remove('is-leaving'); }, 350);
}

/* ---------- Начать заново ---------- */
function resetBrief() {
  state.answers = {};
  state.files = [];
  state.consent = false;
  state.touched = false;
  state.attempt = 0;
  state.briefId = '';
  state.lastPayload = null;
  state.failedFiles = [];
  state.submitted = false;
  clearDraft();
  $$('#brief input[type=text], #brief textarea').forEach(f => { f.value = ''; f.style.height = ''; });
  $$('#brief input[type=radio], #brief input[type=checkbox]').forEach(i => { i.checked = false; });
  $$('.is-invalid').forEach(b => b.classList.remove('is-invalid'));
  $$('.q__error').forEach(e => { e.textContent = ''; });
  fillForm();
  updateDots();
  updateIntroButton();
}

function updateIntroButton() {
  const d = readDraft();
  $('#startLabel').textContent = d && d.step > 0 ? 'Продолжить' : 'Начать';
}

/* =========================================================
   Запуск
   ========================================================= */
async function init() {
  renderStages();
  typoTree(document.body);
  $('#counterAll').textContent = pad2(TOTAL);
  $('#introSteps').textContent = `${TOTAL} ${pluralize(TOTAL, 'этап', 'этапа', 'этапов')}`;

  // Кнопки
  $('#startBtn').addEventListener('click', () => {
    const d = readDraft();
    goTo(d && d.step > 0 ? d.step : 1);
  });
  $('#nextBtn').addEventListener('click', next);
  $('#backBtn').addEventListener('click', back);
  $('#finalDownload').addEventListener('click', () => downloadAnswers(state.lastPayload));
  $('#newBrief').addEventListener('click', () => { resetBrief(); goTo(0); });
  $('#dlgClose').addEventListener('click', () => $('#dlg').close());
  $('#dlg').addEventListener('click', e => { if (e.target === e.currentTarget) e.currentTarget.close(); });

  // Enter в однострочном поле — переход дальше, а не отправка формы
  $('#brief').addEventListener('submit', e => e.preventDefault());
  $('#brief').addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.matches('input[type=text]')) { e.preventDefault(); next(); }
  });

  // Файл, брошенный мимо области загрузки, не должен открыться вместо страницы
  ['dragover', 'drop'].forEach(type => window.addEventListener(type, e => {
    if (!e.target.closest || !e.target.closest('.drop')) e.preventDefault();
  }));

  // Пересчёт высоты полей при повороте экрана и смене ширины
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => growAll($('.stage:not([hidden])') || document), 120);
  });

  // Сохранить черновик перед закрытием вкладки
  window.addEventListener('pagehide', () => saveDraft(true));
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') saveDraft(true); });

  // Восстановление черновика
  const draft = readDraft();
  if (draft) {
    state.answers = draft.answers || {};
    state.consent = !!draft.consent;
    state.briefId = draft.briefId || '';
    state.touched = true;
  }
  try {
    const stored = await fileStore.all();
    if (stored && stored.length) {
      state.files = stored.slice(0, SETTINGS.maxFiles);
      state.touched = true;
    }
  } catch (e) { /* IndexedDB недоступна — файлы просто не восстановятся */ }

  fillForm();
  const hasContent = Object.values(state.answers).some(v => Array.isArray(v) ? v.length : String(v || '').trim()) || state.files.length;
  if (draft && hasContent) {
    goTo(Math.min(Math.max(draft.step || 1, 1), TOTAL), { instant: true, noFocus: true });
    toast('Черновик восстановлен', {
      label: 'Начать заново',
      onClick: () => { resetBrief(); goTo(0); toast('Черновик удалён'); }
    });
  } else {
    goTo(0, { instant: true, noFocus: true });
  }
  updateIntroButton();
}

init();
