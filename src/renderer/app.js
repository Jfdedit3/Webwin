const apps = Array.isArray(window.WEBWIN_APPS) ? window.WEBWIN_APPS : [];
const state = {
  query: '',
  category: 'All',
  selectedAppId: apps[0]?.id || null,
  downloads: [],
  view: 'discover'
};

const navItems = [...document.querySelectorAll('.nav-item')];
const views = {
  discover: document.getElementById('discoverView'),
  downloads: document.getElementById('downloadsView'),
  about: document.getElementById('aboutView')
};

const searchInput = document.getElementById('searchInput');
const categoryFilters = document.getElementById('categoryFilters');
const appsGrid = document.getElementById('appsGrid');
const resultsLabel = document.getElementById('resultsLabel');
const totalAppsStat = document.getElementById('totalAppsStat');
const visibleAppsStat = document.getElementById('visibleAppsStat');
const categoriesStat = document.getElementById('categoriesStat');
const refreshButton = document.getElementById('refreshButton');
const downloadsList = document.getElementById('downloadsList');

const detailsPanel = document.getElementById('detailsPanel');
const closeDetailsButton = document.getElementById('closeDetailsButton');
const detailsCategory = document.getElementById('detailsCategory');
const detailsName = document.getElementById('detailsName');
const detailsDescription = document.getElementById('detailsDescription');
const detailsPublisher = document.getElementById('detailsPublisher');
const detailsLicense = document.getElementById('detailsLicense');
const detailsPlatforms = document.getElementById('detailsPlatforms');
const detailsTags = document.getElementById('detailsTags');
const downloadButton = document.getElementById('downloadButton');
const websiteButton = document.getElementById('websiteButton');
const repoButton = document.getElementById('repoButton');

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getCategories() {
  return ['All', ...new Set(apps.map((app) => app.category).sort())];
}

function getFilteredApps() {
  const query = state.query.trim().toLowerCase();
  return apps.filter((app) => {
    const matchCategory = state.category === 'All' || app.category === state.category;
    if (!matchCategory) return false;
    if (!query) return true;
    const haystack = [app.name, app.publisher, app.category, app.license, ...(app.tags || []), app.summary, app.description]
      .join(' ')
      .toLowerCase();
    return haystack.includes(query);
  });
}

function renderCategoryFilters() {
  categoryFilters.innerHTML = '';
  getCategories().forEach((category) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `category-pill${state.category === category ? ' active' : ''}`;
    button.textContent = category;
    button.addEventListener('click', () => {
      state.category = category;
      renderAll();
    });
    categoryFilters.appendChild(button);
  });
}

function selectApp(appId) {
  state.selectedAppId = appId;
  renderDetails();
}

function renderApps() {
  const filtered = getFilteredApps();
  appsGrid.innerHTML = '';

  totalAppsStat.textContent = String(apps.length);
  visibleAppsStat.textContent = String(filtered.length);
  categoriesStat.textContent = String(getCategories().length - 1);
  resultsLabel.textContent = `${filtered.length} result${filtered.length > 1 ? 's' : ''}`;

  if (!filtered.length) {
    appsGrid.innerHTML = '<div class="empty-state">No apps match the current search or category filter.</div>';
    return;
  }

  filtered.forEach((app) => {
    const card = document.createElement('article');
    card.className = 'app-card';
    card.innerHTML = `
      <div class="app-card-top">
        <div>
          <div class="app-category">${escapeHtml(app.category)}</div>
          <h4>${escapeHtml(app.name)}</h4>
        </div>
        <button class="icon-button" type="button" data-details="${escapeHtml(app.id)}">→</button>
      </div>
      <div class="app-summary">${escapeHtml(app.summary)}</div>
      <div class="app-tags">${(app.tags || []).slice(0, 4).map((tag) => `<span class="app-tag">${escapeHtml(tag)}</span>`).join('')}</div>
      <div class="card-actions">
        <button class="primary-button" type="button" data-download="${escapeHtml(app.id)}">Download</button>
        <button class="ghost-button" type="button" data-website="${escapeHtml(app.id)}">Website</button>
      </div>`;

    card.querySelector('[data-details]').addEventListener('click', () => selectApp(app.id));
    card.querySelector('[data-download]').addEventListener('click', () => startDownload(app.id));
    card.querySelector('[data-website]').addEventListener('click', () => openWebsite(app.id));
    appsGrid.appendChild(card);
  });

  if (!filtered.some((app) => app.id === state.selectedAppId)) {
    state.selectedAppId = filtered[0]?.id || null;
  }
}

function getSelectedApp() {
  return apps.find((app) => app.id === state.selectedAppId) || null;
}

function renderDetails() {
  const app = getSelectedApp();
  if (!app) {
    detailsPanel.classList.add('hidden');
    return;
  }

  detailsPanel.classList.remove('hidden');
  detailsCategory.textContent = app.category;
  detailsName.textContent = app.name;
  detailsDescription.textContent = app.description;
  detailsPublisher.textContent = app.publisher;
  detailsLicense.textContent = app.license;
  detailsPlatforms.textContent = app.platforms;
  detailsTags.innerHTML = (app.tags || []).map((tag) => `<span class="app-tag">${escapeHtml(tag)}</span>`).join('');

  downloadButton.onclick = () => startDownload(app.id);
  websiteButton.onclick = () => window.webwin.openExternal(app.website);
  repoButton.onclick = () => window.webwin.openExternal(app.repository);
}

function startDownload(appId) {
  const app = apps.find((item) => item.id === appId);
  if (!app) return;
  window.webwin.startDownload(app.downloadUrl);
  state.view = 'downloads';
  switchView('downloads');
}

function openWebsite(appId) {
  const app = apps.find((item) => item.id === appId);
  if (!app) return;
  window.webwin.openExternal(app.website);
}

function renderDownloads() {
  downloadsList.innerHTML = '';
  if (!state.downloads.length) {
    downloadsList.innerHTML = '<div class="empty-state">No downloads have been started yet.</div>';
    return;
  }

  state.downloads.forEach((entry) => {
    const percent = entry.totalBytes > 0 ? Math.min(100, Math.round((entry.receivedBytes / entry.totalBytes) * 100)) : 0;
    const card = document.createElement('div');
    card.className = 'download-card';
    card.innerHTML = `
      <div class="download-title">${escapeHtml(entry.fileName || 'Download')}</div>
      <div class="download-meta">${escapeHtml(entry.state || 'progressing')} · ${percent}%</div>
      <div class="progress-track"><div class="progress-bar" style="width:${percent}%"></div></div>
      <div class="download-actions">
        <button class="ghost-button" type="button" data-open>Open</button>
        <button class="ghost-button" type="button" data-folder>Show in folder</button>
      </div>`;

    card.querySelector('[data-open]').addEventListener('click', () => window.webwin.openPath(entry.savePath));
    card.querySelector('[data-folder]').addEventListener('click', () => window.webwin.showItemInFolder(entry.savePath));
    downloadsList.appendChild(card);
  });
}

function switchView(viewName) {
  state.view = viewName;
  Object.entries(views).forEach(([name, node]) => node.classList.toggle('active-view', name === viewName));
  navItems.forEach((button) => button.classList.toggle('active', button.dataset.view === viewName));
}

function renderAll() {
  renderCategoryFilters();
  renderApps();
  renderDetails();
  renderDownloads();
}

navItems.forEach((button) => {
  button.addEventListener('click', () => switchView(button.dataset.view));
});

searchInput.addEventListener('input', (event) => {
  state.query = event.target.value;
  renderAll();
});

refreshButton.addEventListener('click', () => renderAll());
closeDetailsButton.addEventListener('click', () => detailsPanel.classList.add('hidden'));

window.webwin.onDownloadCreated((entry) => {
  state.downloads = [entry, ...state.downloads.filter((item) => item.id !== entry.id)];
  renderDownloads();
});

window.webwin.onDownloadUpdated((entry) => {
  state.downloads = state.downloads.map((item) => item.id === entry.id ? entry : item);
  if (!state.downloads.some((item) => item.id === entry.id)) {
    state.downloads.unshift(entry);
  }
  renderDownloads();
});

(async () => {
  state.downloads = await window.webwin.getDownloads();
  renderAll();
  switchView('discover');
});
