// Leonida Legend — GTA VI trophy guide & tracker (offline, no build step).
// Loads app/data/trophies.json, renders the checklist, and keeps progress in
// localStorage with export/import. No network request besides the local data
// file; nothing here phones home.
const EARNED_KEY = 'gta6-trophy-guide-01-earned';
const SPOILER_KEY = 'gta6-trophy-guide-01-spoiler';

const listEl = document.getElementById('list');
const showingEl = document.getElementById('showing');
const searchEl = document.getElementById('search');
const chipsEl = document.getElementById('kind-chips');
const gradeEl = document.getElementById('grade-filter');
const earnedEl = document.getElementById('earned-filter');
const spoilerEl = document.getElementById('spoiler');

let trophies = [];
let earned = new Set(JSON.parse(localStorage.getItem(EARNED_KEY) ?? '[]'));
const openGuides = new Set();
let kind = 'all';
let spoilerOn = localStorage.getItem(SPOILER_KEY) !== '0';
spoilerEl.checked = spoilerOn;

function saveEarned() {
  localStorage.setItem(EARNED_KEY, JSON.stringify([...earned].sort()));
}

function saveSpoiler() {
  localStorage.setItem(SPOILER_KEY, spoilerOn ? '1' : '0');
}

function gradeLabel(g) {
  return g[0].toUpperCase() + g.slice(1);
}

function isMasked(t) {
  return spoilerOn && t.hidden && !earned.has(t.name);
}

function matches(t) {
  if (kind === 'story' && !t.tags.includes('story')) return false;
  if (kind === 'missable' && !t.missable) return false;
  if (kind === 'collectible' && !t.tags.includes('collectible')) return false;
  if (kind === 'activity' && !t.tags.includes('activity')) return false;
  if (kind === 'online' && !t.tags.includes('online')) return false;
  if (gradeEl.value !== 'all' && t.grade !== gradeEl.value) return false;
  if (earnedEl.value === 'earned' && !earned.has(t.name)) return false;
  if (earnedEl.value === 'unearned' && earned.has(t.name)) return false;
  const q = searchEl.value.trim().toLowerCase();
  if (q) {
    const hay = `${t.name} ${t.description} ${t.guide}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

function renderProgress() {
  const total = trophies.length;
  const n = earned.size;
  const pct = total ? Math.round((n / total) * 100) : 0;
  document.getElementById('progress-big').textContent = `${n} / ${total}`;
  document.getElementById('progress-fill').style.width = `${pct}%`;
  document.getElementById('progress-pct').textContent =
    n === total && total ? 'Platinum earned — Leonida Legend!' : `${pct}% to the platinum`;
  const counts = {};
  for (const t of trophies) counts[t.grade] = (counts[t.grade] ?? 0) + (earned.has(t.name) ? 1 : 0);
  const totals = {};
  for (const t of trophies) totals[t.grade] = (totals[t.grade] ?? 0) + 1;
  document.getElementById('grade-counts').innerHTML = ['platinum', 'gold', 'silver', 'bronze']
    .map((g) => `<li><b>${counts[g] ?? 0}/${totals[g] ?? 0}</b> ${gradeLabel(g)}</li>`)
    .join('');
}

function card(t) {
  const el = document.createElement('article');
  el.className = 'card' + (earned.has(t.name) ? ' earned' : '');
  el.dataset.id = String(t.id);

  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = earned.has(t.name);
  box.setAttribute('aria-label', `Mark ${t.name} as earned`);
  box.addEventListener('change', () => {
    if (box.checked) earned.add(t.name);
    else earned.delete(t.name);
    saveEarned();
    render();
  });
  el.append(box);

  const head = document.createElement('div');
  head.className = 'head';
  const name = document.createElement('h3');
  name.className = 'name';
  name.textContent = isMasked(t) ? 'Hidden story trophy' : t.name;
  head.append(name);
  const badge = document.createElement('span');
  badge.className = `badge ${t.grade}`;
  badge.textContent = gradeLabel(t.grade);
  head.append(badge);
  if (t.missable) {
    const m = document.createElement('span');
    m.className = 'tag miss';
    m.textContent = 'Missable';
    head.append(m);
  }
  if (t.hidden) {
    const h = document.createElement('span');
    h.className = 'tag hidden-tag';
    h.textContent = 'Hidden on PS5';
    head.append(h);
  }
  const stage = document.createElement('span');
  stage.className = 'tag';
  stage.textContent = `Roadmap stage ${t.stage}`;
  head.append(stage);
  el.append(head);

  const desc = document.createElement('p');
  desc.className = 'desc';
  desc.textContent = isMasked(t)
    ? 'Hidden until earned — turn the spoiler setting off to see it.'
    : t.description;
  el.append(desc);

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'guide-toggle';
  const guide = document.createElement('div');
  guide.className = 'guide';
  const isOpen = openGuides.has(t.id);
  guide.hidden = !isOpen;
  if (isMasked(t)) {
    toggle.textContent = 'Guide hidden — earn it or turn spoilers off';
    toggle.disabled = true;
  } else {
    toggle.textContent = isOpen ? 'Hide guide & sources' : 'Show guide & sources';
    const unconfirmed = t.guide.startsWith('Unconfirmed at launch');
    const p = document.createElement('p');
    if (unconfirmed) {
      const strong = document.createElement('strong');
      strong.className = 'unconfirmed';
      strong.textContent = 'Unconfirmed at launch. ';
      p.append(strong);
      p.append(t.guide.slice('Unconfirmed at launch: '.length));
    } else {
      p.textContent = t.guide.split(' Sources: ')[0];
    }
    guide.append(p);
    const label = document.createElement('p');
    label.className = 'src-label';
    label.textContent = 'Sources';
    guide.append(label);
    const ul = document.createElement('ul');
    for (const s of t.sources) {
      const li = document.createElement('li');
      li.textContent = s;
      ul.append(li);
    }
    guide.append(ul);
    toggle.addEventListener('click', () => {
      if (openGuides.has(t.id)) openGuides.delete(t.id);
      else openGuides.add(t.id);
      guide.hidden = !openGuides.has(t.id);
      toggle.textContent = guide.hidden ? 'Show guide & sources' : 'Hide guide & sources';
    });
  }
  el.append(toggle);
  el.append(guide);
  return el;
}

function render() {
  renderProgress();
  const y = window.scrollY;
  listEl.replaceChildren();
  const shown = trophies.filter(matches);
  showingEl.textContent = trophies.length
    ? `Showing ${shown.length} of ${trophies.length} trophies` +
      (kind === 'online' ? ' — GTA VI has no online trophies at launch; every trophy is single-player.' : '')
    : 'Loading trophies…';
  if (!shown.length) {
    const empty = document.createElement('p');
    empty.className = 'empty';
    empty.textContent = kind === 'online'
      ? 'No online trophies — every trophy in GTA VI is single-player at launch. (Source: Output Lag — GTA 6 Trophy List, checked 19 Nov 2026.)'
      : 'No trophies match these filters. Try clearing the search or a filter.';
    listEl.append(empty);
    return;
  }
  for (const t of shown) listEl.append(card(t));
  window.scrollTo(0, y);
}

chipsEl.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-kind]');
  if (!btn) return;
  kind = btn.dataset.kind;
  for (const b of chipsEl.querySelectorAll('.chip')) b.classList.toggle('on', b === btn);
  render();
});
searchEl.addEventListener('input', render);
gradeEl.addEventListener('change', render);
earnedEl.addEventListener('change', render);
spoilerEl.addEventListener('change', () => {
  spoilerOn = spoilerEl.checked;
  saveSpoiler();
  render();
});

document.getElementById('export').addEventListener('click', () => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(
    [JSON.stringify({ game: 'Grand Theft Auto VI', earned: [...earned].sort() }, null, 2)],
    { type: 'application/json' },
  ));
  a.download = 'gta6-trophy-progress.json';
  a.click();
  URL.revokeObjectURL(a.href);
});
document.getElementById('import').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const names = Array.isArray(data) ? data : data.earned;
    if (!Array.isArray(names)) throw new Error('no earned list');
    const known = new Set(trophies.map((t) => t.name));
    earned = new Set(names.filter((n) => known.has(n)));
    saveEarned();
    render();
  } catch {
    alert('That file is not a trophy-progress export from this guide.');
  }
  e.target.value = '';
});
document.getElementById('reset').addEventListener('click', () => {
  if (confirm('Clear all earned trophies? This cannot be undone.')) {
    earned = new Set();
    saveEarned();
    render();
  }
});

const doc = await (await fetch('data/trophies.json')).json();
trophies = doc.trophies;
earned = new Set([...earned].filter((n) => trophies.some((t) => t.name === n)));
render();
