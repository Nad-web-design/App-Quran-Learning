// ===== CONFIGURATION =====
const API_BASE = 'https://api.alquran.cloud/v1';
const ARABIC_EDITION = 'quran-uthmani';
const FRENCH_EDITION = 'fr.hamidullah';
const TOTAL_AYAHS = 6236;

// ===== ÉTAT =====
let state = {
  surahs: [],
  currentSurah: null,
  showTranslation: true,
  memorizeMode: false,
  darkMode: false,
  memorized: JSON.parse(localStorage.getItem('memorized') || '{}'),
  notes: JSON.parse(localStorage.getItem('notes') || '{}'),
  favorites: JSON.parse(localStorage.getItem('favorites') || '{}'),
  journal: localStorage.getItem('journal') || '',
  reminder: JSON.parse(localStorage.getItem('reminder') || '{"goal": 5, "enabled": false}'),
};

// ===== DOM =====
const coverPage = document.getElementById('cover-page');
const app = document.getElementById('app');
const openBtn = document.getElementById('open-btn');
const surahList = document.getElementById('surah-list');
const searchInput = document.getElementById('search');
const versesContainer = document.getElementById('verses-container');
const surahTitle = document.getElementById('surah-title');
const pageNumber = document.getElementById('page-number');
const toggleTranslationBtn = document.getElementById('toggle-translation');
const toggleMemorizeBtn = document.getElementById('toggle-memorize');
const toggleDarkBtn = document.getElementById('toggle-dark');
const printBtn = document.getElementById('print-btn');
const freeJournal = document.getElementById('free-journal');

// ===== SPIRALE =====
function generateSpiral() {
  const spiral = document.querySelector('.spiral');
  spiral.innerHTML = '';
  const ringsDiv = document.createElement('div');
  ringsDiv.className = 'spiral-rings';
  for (let i = 0; i < 18; i++) {
    const ring = document.createElement('div');
    ring.className = 'ring';
    ringsDiv.appendChild(ring);
  }
  spiral.appendChild(ringsDiv);
}

// ===== NAVIGATION TABS =====
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.view-content').forEach(v => v.classList.add('hidden'));
    btn.classList.add('active');
    const target = document.getElementById(btn.dataset.target);
    target.classList.remove('hidden');
    if (btn.dataset.target === 'stats-view') renderStats();
    if (btn.dataset.target === 'favs-view') renderFavorites();
  });
});

// ===== OUVERTURE =====
openBtn.addEventListener('click', () => {
  coverPage.style.transition = 'opacity 0.8s';
  coverPage.style.opacity = '0';
  setTimeout(() => {
    coverPage.classList.add('hidden');
    app.classList.remove('hidden');
    loadSurahs();
    initJournal();
    checkReminder();
  }, 800);
});

// ===== CHARGEMENT SOURATES =====
async function loadSurahs() {
  surahList.innerHTML = '<li style="padding:1rem;color:#7f8c8d">Chargement... ⏳</li>';
  try {
    const res = await fetch(`${API_BASE}/surah`);
    const data = await res.json();
    state.surahs = data.data;
    renderSurahList(state.surahs);
  } catch (err) {
    surahList.innerHTML = '<li style="padding:1rem;color:red">Erreur de connexion 😢</li>';
  }
}

// ===== LISTE SOURATES =====
function renderSurahList(surahs) {
  surahList.innerHTML = '';
  surahs.forEach(surah => {
    const li = document.createElement('li');
    const memorizedCount = Object.keys(state.memorized).filter(k => k.startsWith(`${surah.number}-`)).length;
    const isCompleted = memorizedCount === surah.numberOfAyahs;
    if (isCompleted) li.classList.add('completed');
    if (state.currentSurah?.number === surah.number) li.classList.add('active');
    li.innerHTML = `
      <span>${surah.number}. ${surah.englishName}<br/>
        <small style="color:#7f8c8d;font-size:0.85rem">${surah.name}</small>
      </span>
      <span class="surah-num">${surah.numberOfAyahs}</span>
    `;
    li.addEventListener('click', () => loadSurah(surah.number));
    surahList.appendChild(li);
  });
}

// ===== RECHERCHE =====
searchInput.addEventListener('input', () => {
  const query = searchInput.value.toLowerCase();
  const filtered = state.surahs.filter(s =>
    s.englishName.toLowerCase().includes(query) ||
    s.name.includes(query) ||
    s.number.toString().includes(query)
  );
  renderSurahList(filtered);
});

// ===== CHARGEMENT SOURATE =====
async function loadSurah(surahNumber) {
  versesContainer.innerHTML = '<div class="loading">📖 Chargement...</div>';
  surahTitle.textContent = 'Chargement...';
  try {
    const [arabicRes, frenchRes] = await Promise.all([
      fetch(`${API_BASE}/surah/${surahNumber}/${ARABIC_EDITION}`),
      fetch(`${API_BASE}/surah/${surahNumber}/${FRENCH_EDITION}`)
    ]);
    const arabicData = await arabicRes.json();
    const frenchData = await frenchRes.json();
    state.currentSurah = arabicData.data;
    surahTitle.textContent = `${arabicData.data.number}. ${arabicData.data.englishName} — ${arabicData.data.name}`;
    pageNumber.textContent = `📄 ${arabicData.data.numberOfAyahs} versets • ${arabicData.data.revelationType}`;
    renderVerses(arabicData.data.ayahs, frenchData.data.ayahs, surahNumber);
    renderSurahList(state.surahs);
  } catch (err) {
    versesContainer.innerHTML = '<div class="loading" style="color:red">Erreur 😢</div>';
  }
}

// ===== AFFICHAGE VERSETS =====
function renderVerses(arabicAyahs, frenchAyahs, surahNumber) {
  versesContainer.innerHTML = '';
  arabicAyahs.forEach((ayah, index) => {
    const key = `${surahNumber}-${ayah.numberInSurah}`;
    const isMemorized = state.memorized[key];
    const isFav = state.favorites[key];
    const noteValue = state.notes[key] || '';
    const frenchText = frenchAyahs[index]?.text || '';

    const card = document.createElement('div');
    card.className = 'verse-card';

    card.innerHTML = `
      <div class="verse-header">
        <div class="verse-num">${ayah.numberInSurah}</div>
        <div class="verse-actions">
          <button class="fav-btn ${isFav ? 'active' : ''}" data-key="${key}" title="Favori">⭐</button>
          <button class="memorize-btn ${isMemorized ? 'memorized' : ''}" data-key="${key}">
            ${isMemorized ? '✅ Mémorisé' : '☐ Mémoriser'}
          </button>
        </div>
      </div>
      <div class="verse-arabic ${state.memorizeMode && !isMemorized ? 'hidden-text' : ''}" data-key="${key}">
        ${ayah.text}
      </div>
      <div class="verse-translation" style="display:${state.showTranslation ? 'block' : 'none'}">
        ${frenchText}
      </div>
      <input type="text" class="verse-note" placeholder="✏️ Ajouter une note..." value="${noteValue}" data-key="${key}" />
    `;

    // Clic arabe (mode mémorisation)
    card.querySelector('.verse-arabic').addEventListener('click', function () {
      if (state.memorizeMode) this.classList.toggle('hidden-text');
    });

    // Mémoriser
    card.querySelector('.memorize-btn').addEventListener('click', function () {
      const k = this.dataset.key;
      if (state.memorized[k]) {
        delete state.memorized[k];
        this.textContent = '☐ Mémoriser';
        this.classList.remove('memorized');
      } else {
        state.memorized[k] = true;
        this.textContent = '✅ Mémorisé';
        this.classList.add('memorized');
      }
      localStorage.setItem('memorized', JSON.stringify(state.memorized));
      renderSurahList(state.surahs);
    });

    // Favori
    card.querySelector('.fav-btn').addEventListener('click', function () {
      const k = this.dataset.key;
      if (state.favorites[k]) {
        delete state.favorites[k];
        this.classList.remove('active');
      } else {
        state.favorites[k] = {
          surahName: state.currentSurah.englishName,
          arabic: ayah.text,
          french: frenchText,
          surahNumber: surahNumber,
          ayahNumber: ayah.numberInSurah
        };
        this.classList.add('active');
      }
      localStorage.setItem('favorites', JSON.stringify(state.favorites));
    });

    // Notes
    card.querySelector('.verse-note').addEventListener('input', function () {
      state.notes[this.dataset.key] = this.value;
      localStorage.setItem('notes', JSON.stringify(state.notes));
    });

    versesContainer.appendChild(card);
  });
  versesContainer.scrollTop = 0;
}

// ===== STATISTIQUES =====
function renderStats() {
  const totalMemorized = Object.keys(state.memorized).length;
  const percent = ((totalMemorized / TOTAL_AYAHS) * 100).toFixed(2);
  document.getElementById('total-learned').textContent = totalMemorized;
  document.getElementById('percent-complete').textContent = percent + '%';

  const container = document.getElementById('progress-container');
  container.innerHTML = '<h3 style="margin-bottom:1rem">📚 Progression par Sourate</h3>';

  state.surahs.forEach(surah => {
    const memorizedCount = Object.keys(state.memorized).filter(k => k.startsWith(`${surah.number}-`)).length;
    if (memorizedCount === 0) return;
    const pct = Math.round((memorizedCount / surah.numberOfAyahs) * 100);
    const bar = document.createElement('div');
    bar.style.marginBottom = '1rem';
    bar.innerHTML = `
      <div style="display:flex;justify-content:space-between;margin-bottom:4px">
        <span>${surah.number}. ${surah.englishName} (${surah.name})</span>
        <span>${memorizedCount}/${surah.numberOfAyahs} — ${pct}%</span>
      </div>
      <div style="background:#e0e0e0;border-radius:20px;height:12px">
        <div style="background:var(--accent);width:${pct}%;height:100%;border-radius:20px;transition:0.5s"></div>
      </div>
    `;
    container.appendChild(bar);
  });

  if (container.children.length === 1) {
    container.innerHTML += '<p style="color:#7f8c8d;margin-top:1rem">Commence à mémoriser des versets pour voir ta progression ici ! 💪</p>';
  }
}

// ===== FAVORIS =====
function renderFavorites() {
  const container = document.getElementById('favs-container');
  const favKeys = Object.keys(state.favorites);
  if (favKeys.length === 0) {
    container.innerHTML = '<p class="empty-msg">Aucun favori pour le moment... Appuie sur ⭐ sur un verset ! </p>';
    return;
  }
  container.innerHTML = '';
  favKeys.forEach(key => {
    const fav = state.favorites[key];
    const div = document.createElement('div');
    div.className = 'fav-item';
    div.innerHTML = `
      <div style="font-size:0.9rem;color:var(--ink-light);margin-bottom:0.5rem">
        📖 ${fav.surahName} — Verset ${fav.ayahNumber}
        <button onclick="removeFav('${key}')" style="float:right;background:none;border:none;cursor:pointer;color:#e74c3c">🗑️ Supprimer</button>
      </div>
      <div style="font-family:'Amiri',serif;font-size:1.6rem;text-align:right;direction:rtl;margin-bottom:0.5rem">${fav.arabic}</div>
      <div style="color:var(--ink-light);font-style:italic">${fav.french}</div>
    `;
    container.appendChild(div);
  });
}

function removeFav(key) {
  delete state.favorites[key];
  localStorage.setItem('favorites', JSON.stringify(state.favorites));
  renderFavorites();
}

// ===== JOURNAL MANUSCRIT =====
let canvas, ctx, isDrawing = false, currentTool = 'pen';
let currentEntryId = null;
let lastX = 0, lastY = 0;

function initJournal() {
  canvas = document.getElementById('drawing-canvas');
  ctx = canvas.getContext('2d');
  resizeCanvas();

  // Charger la liste
  loadJournalList();
  openTodayEntry();

  // Resize
  window.addEventListener('resize', resizeCanvas);

  // Stylet / doigt — events
  canvas.addEventListener('pointerdown', startDraw);
  canvas.addEventListener('pointermove', draw);
  canvas.addEventListener('pointerup', stopDraw);
  canvas.addEventListener('pointerleave', stopDraw);

  // Désactiver le scroll sur le canvas
  canvas.addEventListener('touchstart', e => e.preventDefault(), { passive: false });

  // Outils
  document.getElementById('btn-pen').addEventListener('click', () => setTool('pen'));
  document.getElementById('btn-eraser').addEventListener('click', () => setTool('eraser'));
  document.getElementById('btn-clear').addEventListener('click', clearCanvas);
  document.getElementById('save-page-btn').addEventListener('click', savePage);
  document.getElementById('print-page-btn').addEventListener('click', printPage);
  document.getElementById('new-page-btn').addEventListener('click', createNewPage);

  // Couleur & taille
  document.getElementById('pen-color').addEventListener('input', function () {
    document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
  });

  document.getElementById('pen-size').addEventListener('input', function () {
    document.getElementById('pen-size-label').textContent = this.value + 'px';
  });

  // Couleurs rapides
  document.querySelectorAll('.color-dot').forEach(dot => {
    dot.addEventListener('click', function () {
      document.getElementById('pen-color').value = this.dataset.color;
      document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
      this.classList.add('active');
    });
  });
}

function resizeCanvas() {
  const wrapper = document.querySelector('.canvas-wrapper');
  if (!wrapper || !canvas) return;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  canvas.width = wrapper.clientWidth;
  canvas.height = wrapper.clientHeight;
  ctx.putImageData(imageData, 0, 0);
  setCanvasStyle();
}

function setCanvasStyle() {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
}

function setTool(tool) {
  currentTool = tool;
  document.getElementById('btn-pen').classList.toggle('active', tool === 'pen');
  document.getElementById('btn-eraser').classList.toggle('active', tool === 'eraser');
  canvas.style.cursor = tool === 'eraser' ? 'cell' : 'crosshair';
}

function getPos(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  };
}

function startDraw(e) {
  // Ignorer si ce n'est pas le stylet (optionnel — retire cette ligne pour autoriser le doigt aussi)
  // if (e.pointerType !== 'pen') return;
  isDrawing = true;
  const pos = getPos(e);
  lastX = pos.x;
  lastY = pos.y;
  ctx.beginPath();
  ctx.moveTo(lastX, lastY);
}

function draw(e) {
  if (!isDrawing) return;
  e.preventDefault();

  const pos = getPos(e);
  const pressure = e.pressure || 0.5;
  const size = parseFloat(document.getElementById('pen-size').value);
  const color = document.getElementById('pen-color').value;

  ctx.lineWidth = currentTool === 'eraser' ? size * 8 : size * pressure * 2;
  ctx.strokeStyle = currentTool === 'eraser' ? '#ffffff' : color;
  ctx.globalCompositeOperation = currentTool === 'eraser' ? 'destination-out' : 'source-over';

  ctx.lineTo(pos.x, pos.y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(pos.x, pos.y);

  lastX = pos.x;
  lastY = pos.y;
}

function stopDraw() {
  if (!isDrawing) return;
  isDrawing = false;
  ctx.globalCompositeOperation = 'source-over';
  autoSavePage();
}

function clearCanvas() {
  if (confirm('Effacer toute la page ?')) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    autoSavePage();
  }
}

// ===== GESTION DES PAGES =====
function getTodayId() {
  return new Date().toISOString().split('T')[0];
}

function formatDate(id) {
  const d = new Date(id);
  return d.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function getJournalEntries() {
  return JSON.parse(localStorage.getItem('journalPages') || '{}');
}

function saveJournalEntries(entries) {
  localStorage.setItem('journalPages', JSON.stringify(entries));
}

function openTodayEntry() {
  const todayId = getTodayId();
  const entries = getJournalEntries();
  if (!entries[todayId]) {
    entries[todayId] = { date: todayId, imageData: null };
    saveJournalEntries(entries);
  }
  openEntry(todayId);
}

function createNewPage() {
  const id = new Date().toISOString().split('T')[0] + '-' + Date.now();
  const entries = getJournalEntries();
  entries[id] = { date: id, imageData: null };
  saveJournalEntries(entries);
  loadJournalList();
  openEntry(id);
}

function openEntry(id) {
  currentEntryId = id;
  const entries = getJournalEntries();
  const entry = entries[id];

  // Afficher la date
  const dateStr = id.split('-').slice(0, 3).join('-');
  document.getElementById('journal-date').textContent = formatDate(dateStr);

  // Charger le dessin
  clearCanvasSilent();
  if (entry.imageData) {
    const img = new Image();
    img.onload = () => ctx.drawImage(img, 0, 0);
    img.src = entry.imageData;
  }

  // Mettre à jour la liste
  document.querySelectorAll('#journal-list li').forEach(li => {
    li.classList.toggle('active', li.dataset.id === id);
  });
}

function clearCanvasSilent() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function autoSavePage() {
  if (!currentEntryId) return;
  const entries = getJournalEntries();
  entries[currentEntryId].imageData = canvas.toDataURL('image/png');
  saveJournalEntries(entries);
  loadJournalList();
}

function savePage() {
  autoSavePage();
  showToast('✅ Page sauvegardée !');
}

function loadJournalList() {
  const entries = getJournalEntries();
  const list = document.getElementById('journal-list');
  list.innerHTML = '';

  const sorted = Object.keys(entries).sort((a, b) => b.localeCompare(a));

  if (sorted.length === 0) {
    list.innerHTML = '<li style="padding:1rem;color:#7f8c8d">Aucune page 📄</li>';
    return;
  }

  sorted.forEach(id => {
    const entry = entries[id];
    const li = document.createElement('li');
    li.dataset.id = id;
    if (id === currentEntryId) li.classList.add('active');

    const dateStr = id.split('-').slice(0, 3).join('-');
    li.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div style="font-size:0.85rem;color:var(--ink-light)">${formatDate(dateStr)}</div>
        <button class="delete-page-btn" data-id="${id}" title="Supprimer">🗑️</button>
      </div>
      ${entry.imageData 
        ? `<img src="${entry.imageData}" class="journal-page-thumb" />` 
        : '<div style="color:#bbb;font-size:0.8rem">Page vide</div>'
      }
    `;

    // Ouvrir la page
    li.addEventListener('click', (e) => {
      if (e.target.classList.contains('delete-page-btn')) return;
      openEntry(id);
    });

    // Supprimer
    li.querySelector('.delete-page-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      deletePage(id);
    });

    list.appendChild(li);
  });
}

function deletePage(id) {
  if (!confirm('Supprimer cette page définitivement ?')) return;
  const entries = getJournalEntries();
  delete entries[id];
  saveJournalEntries(entries);

  // Si c'était la page active, ouvrir la plus récente ou créer une nouvelle
  if (currentEntryId === id) {
    const remaining = Object.keys(entries).sort((a, b) => b.localeCompare(a));
    if (remaining.length > 0) {
      openEntry(remaining[0]);
    } else {
      currentEntryId = null;
      clearCanvasSilent();
      document.getElementById('journal-date').textContent = '';
    }
  }

  loadJournalList();
  showToast('🗑️ Page supprimée !');
}

function printPage() {
  if (!currentEntryId) {
    showToast('⚠️ Aucune page à imprimer !');
    return;
  }
  const entries = getJournalEntries();
  const entry = entries[currentEntryId];
  if (!entry.imageData) {
    showToast('⚠️ La page est vide !');
    return;
  }

  const dateStr = currentEntryId.split('-').slice(0, 3).join('-');
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Journal du Coran — ${formatDate(dateStr)}</title>
      <style>
        body { margin: 0; padding: 20px; font-family: 'Caveat', cursive; text-align: center; }
        h2 { color: #2980b9; margin-bottom: 10px; }
        img { max-width: 100%; border: 1px solid #eee; border-radius: 8px; }
        .footer { margin-top: 10px; color: #999; font-size: 0.9rem; }
        @media print { button { display: none; } }
      </style>
      <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&display=swap" rel="stylesheet"/>
    </head>
    <body>
      <h2>📓 Mon Cahier du Coran</h2>
      <p style="color:#7f8c8d">${formatDate(dateStr)}</p>
      <img src="${entry.imageData}" />
      <div class="footer">Mon Cahier du Coran ✨</div>
      <br/>
      <button onclick="window.print()" style="
        padding: 0.8rem 2rem;
        background: #2980b9;
        color: white;
        border: none;
        border-radius: 20px;
        font-size: 1.2rem;
        cursor: pointer;
        font-family: 'Caveat', cursive;
      ">🖨️ Imprimer</button>
    </body>
    </html>
  `);
  printWindow.document.close();
}

// ===== RAPPEL QUOTIDIEN =====
function checkReminder() {
  const lastDate = localStorage.getItem('lastVisit');
  const today = new Date().toDateString();
  if (lastDate !== today) {
    localStorage.setItem('lastVisit', today);
    setTimeout(() => {
      const goal = state.reminder.goal;
      showToast(`🌙 Bismillah ! Objectif du jour : ${goal} versets à mémoriser. Bonne chance ! 💪`);
    }, 1500);
  }
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position:fixed; bottom:80px; left:50%; transform:translateX(-50%);
    background:#2c3e50; color:white; padding:1rem 2rem;
    border-radius:20px; font-family:'Caveat',cursive; font-size:1.2rem;
    z-index:9999; box-shadow:0 5px 20px rgba(0,0,0,0.3);
    animation: fadeIn 0.5s ease;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 5000);
}

// ===== IMPRESSION =====
printBtn.addEventListener('click', () => window.print());

// ===== TOGGLES =====
toggleTranslationBtn.addEventListener('click', () => {
  state.showTranslation = !state.showTranslation;
  toggleTranslationBtn.classList.toggle('active', state.showTranslation);
  document.querySelectorAll('.verse-translation').forEach(el => {
    el.style.display = state.showTranslation ? 'block' : 'none';
  });
});

toggleMemorizeBtn.addEventListener('click', () => {
  state.memorizeMode = !state.memorizeMode;
  toggleMemorizeBtn.classList.toggle('active', state.memorizeMode);
  document.querySelectorAll('.verse-arabic').forEach(el => {
    const key = el.dataset.key;
    if (state.memorizeMode && !state.memorized[key]) {
      el.classList.add('hidden-text');
    } else {
      el.classList.remove('hidden-text');
    }
  });
});

toggleDarkBtn.addEventListener('click', () => {
  state.darkMode = !state.darkMode;
  document.body.classList.toggle('dark-mode', state.darkMode);
  toggleDarkBtn.classList.toggle('active', state.darkMode);
  toggleDarkBtn.textContent = state.darkMode ? '☀️' : '🌙';
});

// ===== INIT =====
generateSpiral();