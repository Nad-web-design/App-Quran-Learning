// ===== CONFIGURATION =====
const API_BASE = 'https://api.alquran.cloud/v1';
const ARABIC_EDITION = 'quran-uthmani';
const FRENCH_EDITION = 'fr.hamidullah';

// ===== ÉTAT DE L'APP =====
let state = {
  surahs: [],
  currentSurah: null,
  showTranslation: true,
  memorizeMode: false,
  darkMode: false,
  memorized: JSON.parse(localStorage.getItem('memorized') || '{}'),
  notes: JSON.parse(localStorage.getItem('notes') || '{}'),
};

// ===== ÉLÉMENTS DOM =====
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

// ===== GÉNÉRATION DES ANNEAUX DE SPIRALE =====
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

// ===== OUVERTURE DU CAHIER =====
openBtn.addEventListener('click', () => {
  coverPage.style.transition = 'opacity 0.8s';
  coverPage.style.opacity = '0';
  setTimeout(() => {
    coverPage.classList.add('hidden');
    app.classList.remove('hidden');
    loadSurahs();
  }, 800);
});

// ===== CHARGEMENT DES SOURATES =====
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

// ===== AFFICHAGE DE LA LISTE =====
function renderSurahList(surahs) {
  surahList.innerHTML = '';
  surahs.forEach(surah => {
    const li = document.createElement('li');
    const memorizedCount = Object.keys(state.memorized).filter(k => k.startsWith(`${surah.number}-`)).length;
    const isCompleted = memorizedCount === surah.numberOfAyahs;

    if (isCompleted) li.classList.add('completed');
    if (state.currentSurah?.number === surah.number) li.classList.add('active');

    li.innerHTML = `
      <span>${surah.number}. ${surah.englishName} <br/>
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

// ===== CHARGEMENT D'UNE SOURATE =====
async function loadSurah(surahNumber) {
  versesContainer.innerHTML = '<div class="loading">📖 Chargement des versets...</div>';
  surahTitle.textContent = 'Chargement...';
  pageNumber.textContent = '';

  // Mettre à jour la liste active
  document.querySelectorAll('#surah-list li').forEach(li => li.classList.remove('active'));

  try {
    const [arabicRes, frenchRes] = await Promise.all([
      fetch(`${API_BASE}/surah/${surahNumber}/${ARABIC_EDITION}`),
      fetch(`${API_BASE}/surah/${surahNumber}/${FRENCH_EDITION}`)
    ]);

    const arabicData = await arabicRes.json();
    const frenchData = await frenchRes.json();

    state.currentSurah = arabicData.data;
    const arabicAyahs = arabicData.data.ayahs;
    const frenchAyahs = frenchData.data.ayahs;

    surahTitle.textContent = `${arabicData.data.number}. ${arabicData.data.englishName} — ${arabicData.data.name}`;
    pageNumber.textContent = `📄 ${arabicData.data.numberOfAyahs} versets • ${arabicData.data.revelationType}`;

    renderVerses(arabicAyahs, frenchAyahs, surahNumber);
    renderSurahList(state.surahs);

  } catch (err) {
    versesContainer.innerHTML = '<div class="loading" style="color:red">Erreur lors du chargement 😢</div>';
  }
}

// ===== AFFICHAGE DES VERSETS =====
function renderVerses(arabicAyahs, frenchAyahs, surahNumber) {
  versesContainer.innerHTML = '';

  arabicAyahs.forEach((ayah, index) => {
    const key = `${surahNumber}-${ayah.numberInSurah}`;
    const isMemorized = state.memorized[key];
    const noteValue = state.notes[key] || '';
    const frenchText = frenchAyahs[index]?.text || '';

    const card = document.createElement('div');
    card.className = 'verse-card';
    card.id = `verse-${ayah.numberInSurah}`;

    card.innerHTML = `
      <div class="verse-header">
        <div class="verse-num">${ayah.numberInSurah}</div>
        <div class="verse-actions">
          <button class="memorize-btn ${isMemorized ? 'memorized' : ''}" data-key="${key}">
            ${isMemorized ? '✅ Mémorisé' : '☐ Mémoriser'}
          </button>
        </div>
      </div>

      <div class="verse-arabic ${state.memorizeMode && !isMemorized ? 'hidden-text' : ''}" 
           data-key="${key}">
        ${ayah.text}
      </div>

      <div class="verse-translation" style="display:${state.showTranslation ? 'block' : 'none'}">
        ${frenchText}
      </div>

      <input 
        type="text" 
        class="verse-note" 
        placeholder="✏️ Ajouter une note..." 
        value="${noteValue}"
        data-key="${key}"
      />
    `;

    // Clic sur texte arabe en mode mémorisation
    card.querySelector('.verse-arabic').addEventListener('click', function () {
      if (state.memorizeMode) {
        this.classList.toggle('hidden-text');
      }
    });

    // Bouton mémoriser
    card.querySelector('.memorize-btn').addEventListener('click', function () {
      const k = this.dataset.key;
      if (state.memorized[k]) {
        delete state.memorized[k];
        this.textContent = '☐ Mémoriser';
        this.classList.remove('memorized');
        card.querySelector('.verse-arabic').style.opacity = '1';
      } else {
        state.memorized[k] = true;
        this.textContent = '✅ Mémorisé';
        this.classList.add('memorized');
      }
      localStorage.setItem('memorized', JSON.stringify(state.memorized));
      renderSurahList(state.surahs);
    });

    // Sauvegarde des notes
    card.querySelector('.verse-note').addEventListener('input', function () {
      const k = this.dataset.key;
      state.notes[k] = this.value;
      localStorage.setItem('notes', JSON.stringify(state.notes));
    });

    versesContainer.appendChild(card);
  });

  // Scroll en haut
  versesContainer.scrollTop = 0;
}

// ===== TOGGLE TRADUCTION =====
toggleTranslationBtn.addEventListener('click', () => {
  state.showTranslation = !state.showTranslation;
  toggleTranslationBtn.classList.toggle('active', state.showTranslation);
  document.querySelectorAll('.verse-translation').forEach(el => {
    el.style.display = state.showTranslation ? 'block' : 'none';
  });
});

// ===== TOGGLE MODE MÉMORISATION =====
toggleMemorizeBtn.addEventListener('click', () => {
  state.memorizeMode = !state.memorizeMode;
  toggleMemorizeBtn.classList.toggle('active', state.memorizeMode);

  document.querySelectorAll('.verse-arabic').forEach(el => {
    const key = el.dataset.key;
    const isMemorized = state.memorized[key];
    if (state.memorizeMode && !isMemorized) {
      el.classList.add('hidden-text');
    } else {
      el.classList.remove('hidden-text');
    }
  });
});

// ===== TOGGLE MODE NUIT =====
toggleDarkBtn.addEventListener('click', () => {
  state.darkMode = !state.darkMode;
  document.body.classList.toggle('dark-mode', state.darkMode);
  toggleDarkBtn.classList.toggle('active', state.darkMode);
  toggleDarkBtn.textContent = state.darkMode ? '☀️' : '🌙';
});

// ===== INITIALISATION =====
generateSpiral();