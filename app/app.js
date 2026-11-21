// Leonida Trophy Guide — tracker: checklist with localStorage, filters by kind and
// grade, a spoiler setting, search, and export/import. Everything runs offline:
// the only file it loads is data/trophies.json, beside this script.
const KEY = 'gta6-trophy-guide-v1';
const listEl = document.getElementById('list');
const emptyEl = document.getElementById('empty');
const countLine = document.getElementById('countLine');
const searchEl = document.getElementById('search');
const gradeEl = document.getElementById('grade');
const spoilerEl = document.getElementById('spoiler');
const earnedOnlyEl = document.getElementById('earnedOnly');
const kindButtons = [...document.querySelectorAll('#kindFilters button')];

let doc = null;
let earned = new Set(JSON.parse(localStorage.getItem(KEY) ?? '[]'));
let kind = 'all';
let demoEarned = new Set();

function save() {
  localStorage.setItem(KEY, JSON.stringify([...earned]));
}

function isEarned(t) {
  return earned.has(t.name) || demoEarned.has(t.name);
}

function isMissableGroup(t) {
  return t.missable === true || t.early === true;
}

function gradeWord(g) {
  return g === 'platinum' ? 'Platinum' : g === 'gold' ? 'Gold' : g === 'silver' ? 'Silver' : 'Bronze';
}

function badge(text, cls) {
  const s = document.createElement('span');
  s.className = `badge ${cls}`;
  s.textContent = text;
  return s;
}

function trophyCard(t) {
  const card = document.createElement('article');
  card.className = 'card';
  card.dataset.id = String(t.id);
  if (isEarned(t)) card.classList.add('earned');
  if (t.missable) card.classList.add('missable');

  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = isEarned(t);
  box.setAttribute('aria-label', `Mark ${t.name} as earned`);
  box.addEventListener('change', () => {
    if (box.checked) earned.add(t.name);
    else earned.delete(t.name);
    demoEarned.delete(t.name);
    save();
    render();
  });
  card.append(box);

  const body = document.createElement('div');
  const spoilerOn = spoilerEl.checked && t.hidden && !isEarned(t);

  const head = document.createElement('div');
  head.className = 'card-head';
  const h = document.createElement('h3');
  h.textContent = spoilerOn ? 'Hidden trophy' : t.name;
  head.append(h, badge(gradeWord(t.grade), t.grade), badge(t.kind, 'kind'));
  if (t.hidden) head.append(badge('Hidden', 'flag-hidden'));
  if (t.missable) head.append(badge('Missable', 'flag-missable'));
  if (t.early) head.append(badge('Do early', 'flag-early'));
  body.append(head);

  const desc = document.createElement('p');
  desc.className = 'desc';
  desc.textContent = spoilerOn
    ? 'Earn this trophy to reveal its official name and description.'
    : `“${t.description}”`;
  body.append(desc);

  const meta = document.createElement('p');
  meta.className = 'meta';
  const bits = [];
  if (t.chapter) bits.push(typeof t.chapter === 'number' ? `Chapter ${t.chapter}` : 'Final mission');
  if (t.mission) bits.push(`Mission: ${t.mission}`);
  if (t.count) bits.push(`Target: ${Number(t.count).toLocaleString('en-US')}`);
  if (t.count && t.id === 48) bits.push('choices tracked by PlayStation');
  meta.textContent = bits.join(' · ');
  // The mission name itself is a spoiler, so it stays hidden with the rest.
  if (bits.length && !spoilerOn) body.append(meta);

  if (spoilerOn) {
    const hidden = document.createElement('p');
    hidden.className = 'spoiler-hidden';
    hidden.textContent = 'Guide hidden until earned (spoiler-free mode is on).';
    body.append(hidden);
  } else {
    const details = document.createElement('details');
    details.className = 'guide';
    const summary = document.createElement('summary');
    summary.textContent = 'Guide';
    details.append(summary);
    const p = document.createElement('p');
    p.textContent = t.guide;
    details.append(p);
    const src = document.createElement('p');
    src.className = 'sources';
    src.textContent = 'Sources: ';
    (t.sources ?? []).forEach((s, i) => {
      if (i) src.append(document.createTextNode(' · '));
      const a = document.createElement('a');
      a.href = s.url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = s.name;
      src.append(a);
    });
    details.append(src);
    body.append(details);
  }

  card.append(body);
  return card;
}

function visibleTrophies() {
  const q = searchEl.value.trim().toLowerCase();
  return doc.trophies.filter((t) => {
    if (kind === 'story' && t.kind !== 'story') return false;
    if (kind === 'collectibles' && t.kind !== 'collectibles') return false;
    if (kind === 'activities' && t.kind !== 'activities') return false;
    if (kind === 'missable' && !isMissableGroup(t)) return false;
    if (kind === 'online') return false;
    if (gradeEl.value !== 'all' && t.grade !== gradeEl.value) return false;
    if (earnedOnlyEl.checked && !isEarned(t)) return false;
    if (q) {
      const hay = `${t.name} ${t.description} ${t.guide} ${t.mission ?? ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function render() {
  const shown = visibleTrophies();
  listEl.replaceChildren(...shown.map(trophyCard));
  emptyEl.hidden = shown.length > 0;

  const total = doc.trophies.length;
  const n = doc.trophies.filter(isEarned).length;
  const pct = Math.round((n / total) * 100);
  document.getElementById('earnedCount').textContent = String(n);
  document.getElementById('barFill').style.width = `${pct}%`;
  document.getElementById('miniProgress').textContent = `${n}/55 · ${pct}%`;
  document.getElementById('progressText').textContent =
    `${n} of ${total} earned · ${pct}% — ${n === total ? 'platinum earned. Leonida legend.' : `the platinum is ${total - n} trophies away.`}`;
  const byGrade = {};
  for (const t of doc.trophies) {
    byGrade[t.grade] = byGrade[t.grade] ?? [0, 0];
    byGrade[t.grade][1] += 1;
    if (isEarned(t)) byGrade[t.grade][0] += 1;
  }
  document.getElementById('gradesLine').textContent =
    ['platinum', 'gold', 'silver', 'bronze'].map((g) => `${gradeWord(g)} ${byGrade[g][0]}/${byGrade[g][1]}`).join(' · ');
  countLine.textContent = kind === 'online'
    ? 'Online: this list has no online trophies — all 55 are offline and single-player.'
    : `Showing ${shown.length} of ${total} trophies.`;

  const missable = doc.trophies.filter((t) => t.missable);
  const early = doc.trophies.filter((t) => t.early);
  document.getElementById('missableNote').textContent =
    `Missable: ${missable.map((t) => t.name).join(', ')} — the only trophy guides flag as possibly missable. ` +
    `Do early: ${early.map((t) => t.name).join(', ')} — stranger strands can lock as the story moves on. ` +
    `Everything else can be earned after the story.`;
}

function applyHash() {
  const hash = new URLSearchParams(location.hash.slice(1));
  const k = hash.get('kind');
  if (k && ['all', 'story', 'missable', 'collectibles', 'activities', 'online'].includes(k)) {
    kind = k;
    kindButtons.forEach((b) => b.classList.toggle('active', b.dataset.kind === k));
  }
  if (hash.get('grade')) gradeEl.value = hash.get('grade');
  if (hash.get('spoiler') === 'on') spoilerEl.checked = true;
  if (hash.get('demo') === '1') demoEarned = new Set(doc.trophies.slice(0, 12).map((t) => t.name));
  if (hash.get('demo') === 'many') demoEarned = new Set(doc.trophies.slice(0, 30).map((t) => t.name));
  const open = Number(hash.get('open'));
  if (open) {
    requestAnimationFrame(() => {
      const article = listEl.querySelector(`[data-id="${open}"]`);
      const details = article?.querySelector('details');
      if (article && details) {
        details.open = true;
        article.scrollIntoView();
        window.scrollBy(0, -130);
      }
    });
  }
  if (hash.get('scroll') === 'list') {
    requestAnimationFrame(() => {
      listEl.scrollIntoView();
      window.scrollBy(0, -130);
    });
  }
  if (hash.get('view') === 'roadmap') {
    requestAnimationFrame(() => document.getElementById('roadmap').scrollIntoView());
  }
}

async function main() {
  doc = await (await fetch('data/trophies.json')).json();
  const srcList = document.getElementById('sourceList');
  for (const s of doc.listSources ?? []) {
    const li = document.createElement('li');
    if (s.url) {
      const a = document.createElement('a');
      a.href = s.url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = s.name;
      li.append(a);
      if (s.note) li.append(document.createTextNode(` — ${s.note}`));
    } else {
      li.textContent = `${s.name} — ${s.note ?? ''}`;
    }
    srcList.append(li);
  }
  applyHash();
  render();
}

kindButtons.forEach((b) => b.addEventListener('click', () => {
  kind = b.dataset.kind;
  kindButtons.forEach((x) => x.classList.toggle('active', x === b));
  render();
}));
searchEl.addEventListener('input', render);
gradeEl.addEventListener('change', render);
spoilerEl.addEventListener('change', render);
earnedOnlyEl.addEventListener('change', render);

document.getElementById('export').addEventListener('click', () => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify({ game: 'Grand Theft Auto VI', earned: [...earned] }, null, 2)], { type: 'application/json' }));
  a.download = 'gta6-trophy-progress.json';
  a.click();
});
document.getElementById('import').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const names = Array.isArray(data) ? data : data.earned;
    earned = new Set((names ?? []).filter((n) => doc.trophies.some((t) => t.name === n)));
    save();
    render();
  } catch {
    countLine.textContent = 'That file could not be read as trophy progress — export a file from this guide and try again.';
  }
});
document.getElementById('reset').addEventListener('click', () => {
  earned = new Set();
  demoEarned = new Set();
  save();
  render();
});

main();
