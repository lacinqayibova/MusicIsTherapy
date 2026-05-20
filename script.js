const AUTH_TOKEN_KEY = 'mit_auth_token';
const THEME_KEY = 'theme';

const state = {
    user: null,
    catalog: null,
    userState: {
        favorites: [],
        history: [],
        playlists: [],
    },
    activePanel: 'home',
    searchQuery: '',
    currentSongIndex: 0,
    currentGenre: null,
    saveInFlight: false,
};

const audio = new Audio();
audio.volume = 0.8;

const ui = {};

document.addEventListener('DOMContentLoaded', init);

async function init() {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
        redirectToLogin();
        return;
    }

    cacheUi();
    bindCoreEvents();
    applyTheme(localStorage.getItem(THEME_KEY) || 'black');

    try {
        const payload = await api('/api/app');
        state.user = payload.user;
        state.catalog = payload.catalog;
        state.userState = normalizeUserState(payload.state);
    } catch (error) {
        clearAuth();
        redirectToLogin();
        return;
    }

    ensurePlayer();
    renderUser();
    renderAllPanels();
    showPanel('home');
    loadSong(0);
    revealApp();
}

function cacheUi() {
    ui.loader = document.getElementById('loader');
    ui.app = document.querySelector('.app');
    ui.main = document.querySelector('.main');
    ui.title = document.querySelector('.title');
    ui.subtitle = document.getElementById('topbar-subtitle');
    ui.searchInput = document.querySelector('.search-input');
    ui.navButtons = Array.from(document.querySelectorAll('.nav-btn'));
    ui.userName = document.getElementById('user-name');
    ui.userEmail = document.getElementById('user-email');
    ui.userInit = document.getElementById('user-init');
    ui.panelHome = document.getElementById('panel-home');
    ui.panelFavorites = document.getElementById('panel-favorites');
    ui.panelHistory = document.getElementById('panel-history');
    ui.panelPlaylists = document.getElementById('panel-playlists');
    ui.logoutBtn = document.getElementById('logout-btn');
}

function bindCoreEvents() {
    ui.navButtons.forEach((button) => {
        button.addEventListener('click', () => showPanel(button.dataset.panel));
    });

    ui.searchInput.addEventListener('input', (event) => {
        state.searchQuery = event.target.value.trim().toLowerCase();
        renderAllPanels();
        showPanel(state.activePanel);
    });

    ui.logoutBtn.addEventListener('click', logout);

    document.querySelectorAll('.theme-btn').forEach((button) => {
        button.addEventListener('click', () => applyTheme(button.dataset.theme));
    });

    ui.main.addEventListener('click', handleMainClick);
    ui.panelPlaylists.addEventListener('submit', handlePlaylistSubmit);

    audio.addEventListener('timeupdate', updateProgressUi);
    audio.addEventListener('loadedmetadata', updateProgressUi);
    audio.addEventListener('ended', playNextSong);
}

function handleMainClick(event) {
    const playTarget = event.target.closest('[data-play-song]');
    if (playTarget) {
        loadSongById(Number(playTarget.dataset.playSong), true);
        return;
    }

    const favoriteTarget = event.target.closest('[data-toggle-favorite]');
    if (favoriteTarget) {
        event.stopPropagation();
        toggleFavorite(Number(favoriteTarget.dataset.toggleFavorite));
        return;
    }

    const deletePlaylistTarget = event.target.closest('[data-delete-playlist]');
    if (deletePlaylistTarget) {
        event.stopPropagation();
        deletePlaylist(deletePlaylistTarget.dataset.deletePlaylist);
        return;
    }

    const genreTarget = event.target.closest('[data-genre]');
    if (genreTarget) {
        state.currentGenre = state.currentGenre === genreTarget.dataset.genre ? null : genreTarget.dataset.genre;
        renderAllPanels();
    }
}

function handlePlaylistSubmit(event) {
    if (event.target.id !== 'playlist-form') {
        return;
    }

    event.preventDefault();
    const input = event.target.querySelector('#new-playlist-name');
    const name = input.value.trim();
    if (!name) {
        showToast('Pleylist adı boş ola bilməz');
        return;
    }

    state.userState.playlists.unshift({
        id: cryptoRandomId(),
        name,
        songIds: [],
        createdAt: Date.now(),
    });

    input.value = '';
    renderPlaylists();
    persistUserState();
    showToast('Pleylist yaradıldı');
}

function ensurePlayer() {
    document.body.insertAdjacentHTML('beforeend', `
        <div class="player" id="player">
            <div class="now-playing">
                <img id="np-cover" src="" alt="Hazırda çalan musiqi">
                <div class="now-playing-info">
                    <p class="now-playing-title" id="np-title">Hazır deyil</p>
                    <p class="now-playing-artist" id="np-artist">Mahnı seç</p>
                </div>
                <button class="fav-btn" id="fav-btn" type="button" title="Sevimlilərə əlavə et">🤍</button>
            </div>

            <div class="player-controls">
                <div class="control-buttons">
                    <button class="ctrl-btn" id="prev-btn" type="button" title="Əvvəlki">⏮</button>
                    <button class="ctrl-btn play-btn" id="play-btn" type="button" title="Çal">▶</button>
                    <button class="ctrl-btn" id="next-btn" type="button" title="Növbəti">⏭</button>
                </div>
                <div class="progress-row">
                    <span class="time-label" id="cur-time">0:00</span>
                    <div class="progress-bar" id="progress-bar">
                        <div class="progress" id="progress"></div>
                    </div>
                    <span class="time-label right" id="tot-time">0:00</span>
                </div>
            </div>

            <div class="player-right">
                <span aria-hidden="true">🔊</span>
                <input type="range" class="volume-slider" id="vol-slider" min="0" max="1" step="0.01" value="0.8" aria-label="Səs səviyyəsi">
            </div>
        </div>
    `);

    ui.playBtn = document.getElementById('play-btn');
    ui.prevBtn = document.getElementById('prev-btn');
    ui.nextBtn = document.getElementById('next-btn');
    ui.favBtn = document.getElementById('fav-btn');
    ui.progressBar = document.getElementById('progress-bar');
    ui.progress = document.getElementById('progress');
    ui.currentTime = document.getElementById('cur-time');
    ui.totalTime = document.getElementById('tot-time');
    ui.volumeSlider = document.getElementById('vol-slider');
    ui.nowPlayingTitle = document.getElementById('np-title');
    ui.nowPlayingArtist = document.getElementById('np-artist');
    ui.nowPlayingCover = document.getElementById('np-cover');

    ui.playBtn.addEventListener('click', togglePlayback);
    ui.prevBtn.addEventListener('click', playPreviousSong);
    ui.nextBtn.addEventListener('click', playNextSong);
    ui.favBtn.addEventListener('click', () => toggleFavorite(currentSong().id));
    ui.volumeSlider.addEventListener('input', (event) => {
        audio.volume = Number(event.target.value);
    });
    ui.progressBar.addEventListener('click', seekPlayback);
}

function revealApp() {
    setTimeout(() => {
        ui.loader.classList.add('hidden');
        ui.app.classList.remove('hidden');
        ui.app.classList.add('visible');
    }, 350);
}

function renderUser() {
    ui.userName.textContent = state.user.name;
    ui.userEmail.textContent = state.user.email;
    ui.userInit.textContent = state.user.name.charAt(0).toUpperCase();
}

function renderAllPanels() {
    renderHome();
    renderFavorites();
    renderHistory();
    renderPlaylists();
    syncFavoriteButton();
}

function renderHome() {
    const featuredSongs = filterSongsBySearch(getSongsByIds(state.catalog.featured));
    const trendingSongs = filterSongsBySearch(getSongsByIds(state.catalog.trending));
    const newReleaseSongs = filterSongsBySearch(getSongsByIds(state.catalog.newReleases));
    const artistCards = filterArtistsBySearch(state.catalog.artists);

    const noResults = !featuredSongs.length && !trendingSongs.length && !newReleaseSongs.length && !artistCards.length;

    ui.panelHome.innerHTML = `
        ${renderSection('Sənin üçün seçdiklərimiz', 'Gündəlik miks və rahatlaşdırıcı seçimlər.', renderSongCards(featuredSongs))}
        ${renderSection('Trenddə olanlar', 'Bu həftə ən çox diqqət çəkən treklər.', renderReleaseRows(trendingSongs, 'Trenddədir'))}
        <section class="section">
            <div class="section-head">
                <h2 class="section-title">Janrlar</h2>
                <p class="section-sub">Axtarışı ruh halına görə daralt.</p>
            </div>
            <div class="genre-grid">
                ${state.catalog.genres.map((genre) => `
                    <button class="genre-pill ${state.currentGenre === genre ? 'active' : ''}" data-genre="${escapeHtml(genre)}" type="button">${escapeHtml(genre)}</button>
                `).join('')}
            </div>
        </section>
        ${renderSection('Yeni çıxanlar', 'Son əlavə olunan albom və singllar.', renderReleaseRows(newReleaseSongs, 'Yeni'))}
        ${renderSection('Artist profili', 'Tez-tez dinlənilən ifaçılar.', renderArtistCards(artistCards))}
        ${noResults ? renderEmptyState('🔎', 'Axtarışa uyğun nəticə tapılmadı.') : ''}
    `;
}

function renderFavorites() {
    const favoriteSongs = filterSongsBySearch(getSongsByIds(state.userState.favorites));
    ui.panelFavorites.innerHTML = favoriteSongs.length
        ? renderReleaseRows(favoriteSongs, 'Sevimli')
        : renderEmptyState('🤍', state.searchQuery ? 'Axtarışa uyğun sevimli tapılmadı.' : 'Hələ sevimli mahnı yoxdur.');
}

function renderHistory() {
    const historySongs = state.userState.history
        .map((entry) => {
            const song = getSongById(entry.songId);
            return song ? { ...song, playedAt: entry.playedAt } : null;
        })
        .filter(Boolean)
        .filter((song) => matchesSearch(`${song.title} ${song.artist} ${song.genre}`));

    ui.panelHistory.innerHTML = historySongs.length
        ? `
            <section class="section">
                <div class="section-head">
                    <h2 class="section-title">Dinləmə tarixçən</h2>
                    <p class="section-sub">Son 30 trek saxlanılır.</p>
                </div>
                <div class="release-grid">
                    ${historySongs.map((song) => `
                        <article class="release-card" data-play-song="${song.id}">
                            <img src="${escapeAttribute(song.cover)}" alt="${escapeAttribute(song.title)}">
                            <div class="release-copy">
                                <p class="release-title">${escapeHtml(song.title)}</p>
                                <p class="release-sub">${escapeHtml(song.artist)} · ${timeAgo(song.playedAt)}</p>
                            </div>
                        </article>
                    `).join('')}
                </div>
            </section>
        `
        : renderEmptyState('🕒', state.searchQuery ? 'Axtarışa uyğun tarixçə tapılmadı.' : 'Hələ heç nə dinlənilməyib.');
}

function renderPlaylists() {
    const playlists = state.userState.playlists.filter((playlist) => matchesSearch(playlist.name));
    ui.panelPlaylists.innerHTML = `
        <div class="playlist-layout">
            <form id="playlist-form" class="playlist-form">
                <input id="new-playlist-name" class="playlist-input" type="text" placeholder="Yeni pleylist adı..." maxlength="40" aria-label="Yeni pleylist adı">
                <button class="playlist-submit" type="submit">+ Yarat</button>
            </form>
            ${
                playlists.length
                    ? `<div class="playlist-cards">
                        ${playlists.map((playlist) => `
                            <article class="playlist-card">
                                <div class="playlist-cover">🎵</div>
                                <p class="playlist-title">${escapeHtml(playlist.name)}</p>
                                <p class="playlist-sub">${playlist.songIds.length} mahnı</p>
                                <button class="playlist-delete" data-delete-playlist="${playlist.id}" type="button">Sil</button>
                            </article>
                        `).join('')}
                    </div>`
                    : renderEmptyState('🎵', state.searchQuery ? 'Axtarışa uyğun pleylist tapılmadı.' : 'Hələ pleylist yoxdur.')
            }
        </div>
    `;
}

function renderSection(title, subtitle, content) {
    return `
        <section class="section">
            <div class="section-head">
                <h2 class="section-title">${title}</h2>
                <p class="section-sub">${subtitle}</p>
            </div>
            ${content}
        </section>
    `;
}

function renderSongCards(songs) {
    if (!songs.length) {
        return renderEmptyState('🎧', 'Bu bölmədə göstəriləcək trek yoxdur.');
    }

    return `
        <div class="card-container">
            ${songs.map((song) => `
                <article class="card" data-play-song="${song.id}">
                    <img src="${escapeAttribute(song.cover)}" alt="${escapeAttribute(song.title)}">
                    <p class="card-title">${escapeHtml(song.title)}</p>
                    <p class="card-sub">${escapeHtml(song.blurb)}</p>
                </article>
            `).join('')}
        </div>
    `;
}

function renderReleaseRows(songs, actionLabel) {
    if (!songs.length) {
        return renderEmptyState('🎼', 'Uyğun trek tapılmadı.');
    }

    return `
        <div class="release-grid">
            ${songs.map((song) => `
                <article class="release-card" data-play-song="${song.id}">
                    <img src="${escapeAttribute(song.cover)}" alt="${escapeAttribute(song.title)}">
                    <div class="release-copy">
                        <p class="release-title">${escapeHtml(song.title)}</p>
                        <p class="release-sub">${escapeHtml(song.artist)} · ${escapeHtml(song.genre)}</p>
                    </div>
                    <button class="row-action" data-toggle-favorite="${song.id}" type="button">${isFavorite(song.id) ? 'Sevimlidir' : actionLabel}</button>
                </article>
            `).join('')}
        </div>
    `;
}

function renderArtistCards(artists) {
    if (!artists.length) {
        return renderEmptyState('🎤', 'Artist tapılmadı.');
    }

    return `
        <div class="artist-grid">
            ${artists.map((artist) => `
                <article class="artist-card" data-play-song="${artist.featuredSongId}">
                    <img src="${escapeAttribute(artist.image)}" alt="${escapeAttribute(artist.name)}">
                    <p class="artist-name">${escapeHtml(artist.name)}</p>
                    <p class="artist-meta">${escapeHtml(artist.genre)} · ${escapeHtml(artist.listeners)} dinləyici</p>
                </article>
            `).join('')}
        </div>
    `;
}

function renderEmptyState(icon, text) {
    return `
        <div class="empty-state">
            <div class="empty-icon">${icon}</div>
            <p>${text}</p>
        </div>
    `;
}

function showPanel(panelName) {
    state.activePanel = panelName;

    document.querySelectorAll('.tab-panel').forEach((panel) => {
        panel.classList.toggle('active', panel.id === `panel-${panelName}`);
    });

    ui.navButtons.forEach((button) => {
        button.classList.toggle('active', button.dataset.panel === panelName);
    });

    const titles = {
        home: ['Sənin üçün tövsiyələr', 'Sakitləşdirici və enerjili seçimləri bir yerdə saxla.'],
        playlists: ['Pleylistlərin', 'Backend üzərində saxlanılan şəxsi siyahılar.'],
        favorites: ['Sevimlilər', 'Ən çox qayıtdığın treklər.'],
        history: ['Son Dinlənilənlər', 'Dinləmə tarixçən burada qalır.'],
    };

    const [title, subtitle] = titles[panelName];
    ui.title.textContent = title;
    ui.subtitle.textContent = subtitle;
}

function loadSong(index) {
    state.currentSongIndex = index;
    const song = currentSong();

    audio.src = song.previewUrl || '';
    audio.currentTime = 0;
    ui.nowPlayingTitle.textContent = song.title;
    ui.nowPlayingArtist.textContent = song.artist;
    ui.nowPlayingCover.src = song.cover;
    ui.currentTime.textContent = '0:00';
    ui.totalTime.textContent = '0:00';
    ui.progress.style.width = '0%';
    syncFavoriteButton();
}

function loadSongById(songId, autoplay = false) {
    const index = state.catalog.songs.findIndex((song) => song.id === songId);
    if (index === -1) {
        return;
    }

    loadSong(index);
    if (autoplay) {
        void playCurrentSong();
    }
}

async function togglePlayback() {
    if (audio.paused) {
        await playCurrentSong();
        return;
    }

    audio.pause();
    ui.playBtn.textContent = '▶';
}

async function playCurrentSong() {
    const song = currentSong();
    if (!song.previewUrl) {
        showToast('Bu trek üçün audio önizləməsi yoxdur');
        return;
    }

    try {
        await audio.play();
        ui.playBtn.textContent = '⏸';
        addToHistory(song.id);
    } catch (error) {
        showToast('Səs başladılmadı');
    }
}

function playPreviousSong() {
    const nextIndex = (state.currentSongIndex - 1 + state.catalog.songs.length) % state.catalog.songs.length;
    loadSong(nextIndex);
    void playCurrentSong();
}

function playNextSong() {
    const nextIndex = (state.currentSongIndex + 1) % state.catalog.songs.length;
    loadSong(nextIndex);
    void playCurrentSong();
}

function seekPlayback(event) {
    if (!audio.duration) {
        return;
    }

    const rect = ui.progressBar.getBoundingClientRect();
    const percent = (event.clientX - rect.left) / rect.width;
    audio.currentTime = percent * audio.duration;
}

function updateProgressUi() {
    const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
    const current = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;

    ui.currentTime.textContent = formatTime(current);
    ui.totalTime.textContent = formatTime(duration);
    ui.progress.style.width = duration ? `${(current / duration) * 100}%` : '0%';
    ui.playBtn.textContent = audio.paused ? '▶' : '⏸';
}

function toggleFavorite(songId) {
    const favorites = new Set(state.userState.favorites);
    const wasFavorite = favorites.has(songId);

    if (wasFavorite) {
        favorites.delete(songId);
        showToast('Sevimlilərdən silindi');
    } else {
        favorites.add(songId);
        showToast('Sevimlilərə əlavə edildi');
    }

    state.userState.favorites = Array.from(favorites);
    renderFavorites();
    renderHome();
    syncFavoriteButton();
    persistUserState();
}

function syncFavoriteButton() {
    const song = currentSong();
    if (!song || !ui.favBtn) {
        return;
    }

    ui.favBtn.textContent = isFavorite(song.id) ? '❤️' : '🤍';
}

function addToHistory(songId) {
    state.userState.history = [
        { songId, playedAt: Date.now() },
        ...state.userState.history.filter((entry) => entry.songId !== songId),
    ].slice(0, 30);

    renderHistory();
    persistUserState();
}

function deletePlaylist(playlistId) {
    state.userState.playlists = state.userState.playlists.filter((playlist) => playlist.id !== playlistId);
    renderPlaylists();
    persistUserState();
    showToast('Pleylist silindi');
}

async function persistUserState() {
    if (state.saveInFlight) {
        return;
    }

    state.saveInFlight = true;

    try {
        const payload = await api('/api/state', {
            method: 'PUT',
            body: JSON.stringify(state.userState),
        });
        state.userState = normalizeUserState(payload.state);
    } catch (error) {
        showToast('Məlumat backend-ə yazılmadı');
    } finally {
        state.saveInFlight = false;
    }
}

async function logout() {
    try {
        await api('/api/auth/logout', { method: 'POST' });
    } catch (error) {
        // Local cleanup still matters if logout request fails.
    }

    audio.pause();
    clearAuth();
    redirectToLogin();
}

function currentSong() {
    return state.catalog.songs[state.currentSongIndex];
}

function getSongById(songId) {
    return state.catalog.songs.find((song) => song.id === songId) || null;
}

function getSongsByIds(songIds) {
    return songIds.map((songId) => getSongById(songId)).filter(Boolean);
}

function filterSongsBySearch(songs) {
    return songs.filter((song) => {
        if (state.currentGenre && song.genre !== state.currentGenre) {
            return false;
        }

        return matchesSearch(`${song.title} ${song.artist} ${song.genre} ${song.blurb}`);
    });
}

function filterArtistsBySearch(artists) {
    return artists.filter((artist) => matchesSearch(`${artist.name} ${artist.genre} ${artist.listeners}`));
}

function matchesSearch(text) {
    if (!state.searchQuery) {
        return true;
    }
    return text.toLowerCase().includes(state.searchQuery);
}

function isFavorite(songId) {
    return state.userState.favorites.includes(songId);
}

function normalizeUserState(payload) {
    return {
        favorites: Array.isArray(payload?.favorites) ? payload.favorites : [],
        history: Array.isArray(payload?.history) ? payload.history : [],
        playlists: Array.isArray(payload?.playlists) ? payload.playlists : [],
    };
}

async function api(path, options = {}) {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const response = await fetch(path, {
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(options.headers || {}),
        },
        ...options,
    });

    if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
    }

    return response.json();
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);

    document.querySelectorAll('.theme-btn').forEach((button) => {
        button.classList.toggle('active', button.dataset.theme === theme);
    });
}

function showToast(message) {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'toast';
        document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.classList.add('show');
    window.clearTimeout(showToast.timeoutId);
    showToast.timeoutId = window.setTimeout(() => {
        toast.classList.remove('show');
    }, 2200);
}

function timeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) {
        return 'indicə';
    }
    if (seconds < 3600) {
        return `${Math.floor(seconds / 60)} dəq əvvəl`;
    }
    if (seconds < 86400) {
        return `${Math.floor(seconds / 3600)} saat əvvəl`;
    }
    return `${Math.floor(seconds / 86400)} gün əvvəl`;
}

function formatTime(seconds) {
    if (!Number.isFinite(seconds)) {
        return '0:00';
    }
    const wholeSeconds = Math.floor(seconds);
    return `${Math.floor(wholeSeconds / 60)}:${String(wholeSeconds % 60).padStart(2, '0')}`;
}

function cryptoRandomId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function redirectToLogin() {
    window.location.href = 'login.html';
}

function clearAuth() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
}

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function escapeAttribute(value) {
    return escapeHtml(value);
}
