/* =========================================================
   Приёмник брифов nikonovphoto — Cloudflare Worker
   Принимает ответы с сайта брифа и пересылает их в Telegram.

   Переменные (Settings → Variables and Secrets):
     BOT_TOKEN      — токен бота от @BotFather (тип Secret!)
     CHAT_ID        — куда слать брифы, например 2133882921
     ALLOWED_ORIGIN — адрес сайта брифа: https://enikonov565-cloud.github.io

   Сайт шлёт два вида запросов:
     1. JSON с ответами — одно сообщение со сводкой и по сообщению на этап;
     2. multipart с одним файлом-референсом — уходит документом в тот же чат.
   ========================================================= */

const MAX_TEXT = 3900;                  // лимит Telegram — 4096, оставляем запас
const MAX_FILE = 20 * 1024 * 1024;      // через Bot API можно отправить до 50 МБ, сайт режет на 18

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request, env);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'POST') return json({ ok: false, error: 'method' }, 405, cors);
    if (!env.BOT_TOKEN || !env.CHAT_ID) return json({ ok: false, error: 'not configured' }, 500, cors);

    const type = request.headers.get('content-type') || '';
    try {
      if (type.includes('multipart/form-data')) return await handleFile(request, env, cors);
      if (type.includes('application/json')) return await handleBrief(request, env, cors);
      return json({ ok: false, error: 'content-type' }, 415, cors);
    } catch (e) {
      return json({ ok: false, error: String(e && e.message || e) }, 502, cors);
    }
  }
};

/* ---------- ответы брифа ---------- */
async function handleBrief(request, env, cors) {
  const p = await request.json();

  // ловушка для ботов: людям поле не видно — делаем вид, что всё хорошо
  if (p.website) return json({ ok: true }, 200, cors);
  if (!p || !p.id || !Array.isArray(p.sections)) return json({ ok: false, error: 'bad payload' }, 400, cors);

  const head = [
    `<b>📸 Новый бриф${p.attempt > 1 ? ' (повторная отправка)' : ''}</b>`,
    `№ <code>${esc(p.id)}</code>`,
    '',
    `<b>Имя:</b> ${esc(p.name || '—')}`,
    `<b>Контакт:</b> ${contactLink(p.contact)}`,
    ...(p.summary || []).map(s => `<b>${esc(s.q)}:</b> ${esc(s.a)}`)
  ];
  if (p.files && p.files.length) head.push('', `📎 Файлов с примерами: ${p.files.length} — придут следом`);
  await sendChunks(env, head.join('\n'));

  for (const s of p.sections) {
    const lines = [`<b>— ${esc(s.title)} —</b>`];
    (s.items || []).forEach(it => lines.push('', `<i>${esc(it.q)}</i>`, esc(it.a)));
    await sendChunks(env, lines.join('\n'));
  }

  return json({ ok: true }, 200, cors);
}

/* ---------- файл-референс ---------- */
async function handleFile(request, env, cors) {
  const fd = await request.formData();
  const file = fd.get('file');
  if (!file || typeof file === 'string') return json({ ok: false, error: 'no file' }, 400, cors);
  if (file.size > MAX_FILE) return json({ ok: false, error: 'too big' }, 413, cors);

  const caption = `📎 ${esc(fd.get('index') || '?')}/${esc(fd.get('total') || '?')} · бриф <code>${esc(fd.get('briefId') || '')}</code>` +
    (fd.get('name') ? ` · ${esc(fd.get('name'))}` : '');

  const out = new FormData();
  out.append('chat_id', env.CHAT_ID);
  out.append('caption', caption);
  out.append('parse_mode', 'HTML');
  out.append('document', file, file.name || 'file');
  await tg(env, 'sendDocument', out);

  return json({ ok: true }, 200, cors);
}

/* ---------- Telegram ---------- */
async function sendChunks(env, text) {
  // длинный текст режем по строкам, чтобы не порвать теги
  const parts = [];
  let buf = '';
  for (const line of text.split('\n')) {
    if (buf && (buf + '\n' + line).length > MAX_TEXT) { parts.push(buf); buf = ''; }
    buf = buf ? buf + '\n' + line : line.slice(0, MAX_TEXT);
  }
  if (buf) parts.push(buf);
  for (const part of parts) {
    await tg(env, 'sendMessage', JSON.stringify({
      chat_id: env.CHAT_ID, text: part, parse_mode: 'HTML', disable_web_page_preview: true
    }));
  }
}

async function tg(env, method, body) {
  const res = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: typeof body === 'string' ? { 'Content-Type': 'application/json' } : undefined,
    body
  });
  const data = await res.json().catch(() => ({}));
  if (!data.ok) throw new Error('telegram: ' + (data.description || res.status));
  return data;
}

/* ---------- мелочи ---------- */
function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ник Telegram превращаем в ссылку, чтобы ответить в один клик
function contactLink(c) {
  const v = String(c || '').trim();
  const nick = v.match(/^(?:@|(?:https?:\/\/)?t\.me\/)?([a-z0-9_]{4,32})$/i);
  if (nick && !/^\d+$/.test(nick[1])) return `<a href="https://t.me/${nick[1]}">@${esc(nick[1])}</a>`;
  return esc(v || '—');
}

function corsHeaders(request, env) {
  const origin = request.headers.get('origin') || '';
  const allowed = (env.ALLOWED_ORIGIN || '*').split(',').map(s => s.trim());
  const ok = allowed.includes('*') || allowed.includes(origin) || origin.startsWith('http://localhost');
  return {
    'Access-Control-Allow-Origin': ok ? (origin || '*') : allowed[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin'
  };
}

function json(data, status, headers) {
  return new Response(JSON.stringify(data), { status, headers: { ...headers, 'Content-Type': 'application/json' } });
}
