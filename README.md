# brifnikonov

Бриф на фотосъёмку nikonovphoto — статичная страница, сборщик не нужен.

- `index.html` — разметка
- `css/brief.css` — стили брифа (остальные css — общие со страницами сайта)
- `js/brief.js` — вопросы, черновик и отправка. Адрес приёмника брифов — `endpoint` в начале файла (пока пустой: клиент скачивает или копирует ответы).

## Отправка брифов в Telegram

`worker/worker.js` — приёмник для Cloudflare Workers: принимает ответы с сайта и пересылает их боту в Telegram (сводка, по сообщению на этап, файлы-референсы документами).

1. dash.cloudflare.com → Workers & Pages → Create → Worker → вставить код `worker/worker.js` → Deploy.
2. Settings → Variables and Secrets:
   - `BOT_TOKEN` — токен бота от @BotFather, тип **Secret**;
   - `CHAT_ID` — `2133882921`;
   - `ALLOWED_ORIGIN` — `https://enikonov565-cloud.github.io`.
3. Адрес воркера (`https://….workers.dev`) вписать в `endpoint` в начале `js/brief.js`.

Токен бота никогда не кладите в файлы сайта — репозиторий публичный.
