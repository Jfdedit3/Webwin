const HOME_URL = 'https://www.google.com/';
const SEARCH_URL = 'https://www.google.com/search?q=';
const BOOKMARKS_KEY = 'webwin-bookmarks';
const HISTORY_KEY = 'webwin-history';
const SESSION_KEY = 'webwin-session';
const NEWTAB_URL = new URL('./newtab.html', window.location.href).href;

const tabsElement = document.getElementById('tabs');
const webviewsElement = document.getElementById('webviews');
const addressForm = document.getElementById('addressForm');
const addressInput = document.getElementById('addressInput');
const newTabButton = document.getElementById('newTabButton');
const menuButton = document.getElementById('menuButton');
const backButton = document.getElementById('backButton');
const forwardButton = document.getElementById('forwardButton');
const reloadButton = document.getElementById('reloadButton');
const homeButton = document.getElementById('homeButton');
const bookmarkButton = document.getElementById('bookmarkButton');
const bookmarksToggleButton = document.getElementById('bookmarksToggleButton');
const statusText = document.getElementById('statusText');
const pageMeta = document.getElementById('pageMeta');

const menuPanel = document.getElementById('menuPanel');
const closeMenuButton = document.getElementById('closeMenuButton');
const menuNewTab = document.getElementById('menuNewTab');
const menuBookmarks = document.getElementById('menuBookmarks');
const menuHistory = document.getElementById('menuHistory');
const menuDownloads = document.getElementById('menuDownloads');
const menuRestore = document.getElementById('menuRestore');

const bookmarksPanel = document.getElementById('bookmarksPanel');
const bookmarksList = document.getElementById('bookmarksList');
const closeBookmarksButton = document.getElementById('closeBookmarksButton');

const historyPanel = document.getElementById('historyPanel');
const historyList = document.getElementById('historyList');
const closeHistoryButton = document.getElementById('closeHistoryButton');
const clearHistoryButton = document.getElementById('clearHistoryButton');

const downloadsPanel = document.getElementById('downloadsPanel');
const downloadsList = document.getElementById('downloadsList');
const closeDownloadsButton = document.getElementById('closeDownloadsButton');

let tabs = [];
let activeTabId = null;
let downloads = [];

function makeId() {
  return window.crypto?.randomUUID ? window.crypto.randomUUID() : `tab_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function normalizeUrl(value) {
  const input = (value || '').trim();
  if (!input) return HOME_URL;
  if (input === 'webwin:newtab') return NEWTAB_URL;
  const hasScheme = /^https?:\/\//i.test(input) || /^file:\/\//i.test(input);
  const looksLikeUrl = /^(localhost|\d{1,3}(?:\.\d{1,3}){3}|[\w-]+\.[a-z]{2,})/i.test(input);
  if (hasScheme) return input;
  if (looksLikeUrl) return `https://${input}`;
  return `${SEARCH_URL}${encodeURIComponent(input)}`;
}

function closeAllPanels() {
  menuPanel.classList.add('hidden');
  bookmarksPanel.classList.add('hidden');
  historyPanel.classList.add('hidden');
  downloadsPanel.classList.add('hidden');
}

function openPanel(panel) {
  closeAllPanels();
  panel.classList.remove('hidden');
}

function readJson(key, fallback = []) {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
  catch { return fallback; }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getBookmarks() { return readJson(BOOKMARKS_KEY, []); }
function getHistory() { return readJson(HISTORY_KEY, []); }

function saveSession() {
  const payload = {
    activeTabId,
    tabs: tabs.map((tab) => ({
      id: tab.id,
      url: tab.webview.getAttribute('src') || NEWTAB_URL,
      title: tab.titleElement.textContent || 'New Tab'
    }))
  };
  writeJson(SESSION_KEY, payload);
}

function addHistoryEntry(title, url) {
  if (!url || url === NEWTAB_URL) return;
  const current = getHistory().filter((item) => item.url !== url);
  current.unshift({ title: title || 'Untitled', url, time: new Date().toISOString() });
  writeJson(HISTORY_KEY, current.slice(0, 150));
  renderHistory();
}

function renderBookmarks() {
  const bookmarks = getBookmarks();
  bookmarksList.innerHTML = '';
  if (!bookmarks.length) {
    bookmarksList.innerHTML = '<div class="empty-state">No bookmarks saved yet.</div>';
    return;
  }
  bookmarks.forEach((bookmark, index) => {
    const item = document.createElement('div');
    item.className = 'bookmark-item';
    item.innerHTML = `
      <div class="bookmark-head"><div class="bookmark-title">${escapeHtml(bookmark.title || 'Untitled')}</div></div>
      <div class="bookmark-url">${escapeHtml(bookmark.url)}</div>
      <div class="item-actions">
        <button class="action-button" data-open="${index}">Open</button>
        <button class="action-button" data-delete="${index}">Delete</button>
      </div>`;
    item.querySelector('[data-open]').addEventListener('click', () => {
      closeAllPanels();
      navigateActiveTab(bookmark.url);
    });
    item.querySelector('[data-delete]').addEventListener('click', () => {
      const next = getBookmarks().filter((_, currentIndex) => currentIndex !== index);
      writeJson(BOOKMARKS_KEY, next);
      renderBookmarks();
    });
    bookmarksList.appendChild(item);
  });
}

function renderHistory() {
  const history = getHistory();
  historyList.innerHTML = '';
  if (!history.length) {
    historyList.innerHTML = '<div class="empty-state">No history yet.</div>';
    return;
  }
  history.forEach((entry) => {
    const item = document.createElement('div');
    item.className = 'history-item';
    item.innerHTML = `
      <div class="history-head"><div class="history-title">${escapeHtml(entry.title || 'Untitled')}</div></div>
      <div class="history-url">${escapeHtml(entry.url)}</div>
      <div class="history-time">${new Date(entry.time).toLocaleString()}</div>
      <div class="item-actions"><button class="action-button">Open</button></div>`;
    item.querySelector('button').addEventListener('click', () => {
      closeAllPanels();
      navigateActiveTab(entry.url);
    });
    historyList.appendChild(item);
  });
}

function renderDownloads() {
  downloadsList.innerHTML = '';
  if (!downloads.length) {
    downloadsList.innerHTML = '<div class="empty-state">No downloads yet.</div>';
    return;
  }
  downloads.forEach((entry) => {
    const item = document.createElement('div');
    item.className = 'download-item';
    const percent = entry.totalBytes > 0 ? Math.min(100, Math.round((entry.receivedBytes / entry.totalBytes) * 100)) : 0;
    item.innerHTML = `
      <div class="download-head"><div class="download-title">${escapeHtml(entry.fileName || 'Download')}</div></div>
      <div class="download-url">${escapeHtml(entry.url || '')}</div>
      <div class="download-meta">${escapeHtml(entry.state || 'progressing')} · ${percent}%</div>
      <div class="progress-track"><div class="progress-bar" style="width:${percent}%"></div></div>
      <div class="item-actions">
        <button class="action-button" data-open>Open</button>
        <button class="action-button" data-folder>Show in folder</button>
      </div>`;
    item.querySelector('[data-open]').addEventListener('click', () => window.webwin.openPath(entry.savePath));
    item.querySelector('[data-folder]').addEventListener('click', () => window.webwin.showItemInFolder(entry.savePath));
    downloadsList.appendChild(item);
  });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function updateTabTitle(id, title) {
  const tab = tabs.find((entry) => entry.id === id);
  if (!tab) return;
  tab.titleElement.textContent = title || 'New Tab';
  saveSession();
}

function getActiveTab() {
  return tabs.find((tab) => tab.id === activeTabId) || null;
}

function updateNavButtons() {
  const tab = getActiveTab();
  if (!tab) {
    backButton.disabled = true;
    forwardButton.disabled = true;
    return;
  }
  try {
    backButton.disabled = !tab.webview.canGoBack();
    forwardButton.disabled = !tab.webview.canGoForward();
  } catch {
    backButton.disabled = true;
    forwardButton.disabled = true;
  }
}

function syncActiveAddress(id = activeTabId) {
  const tab = tabs.find((entry) => entry.id === id);
  if (!tab) return;
  let currentUrl = tab.webview.getAttribute('src') || NEWTAB_URL;
  let currentTitle = tab.titleElement.textContent || 'New Tab';
  try {
    const webviewUrl = tab.webview.getURL();
    if (webviewUrl) currentUrl = webviewUrl;
  } catch {}
  try {
    const webviewTitle = tab.webview.getTitle();
    if (webviewTitle) currentTitle = webviewTitle;
  } catch {}
  if (activeTabId === id) {
    addressInput.value = currentUrl === NEWTAB_URL ? '' : currentUrl;
    pageMeta.textContent = currentTitle;
    statusText.textContent = 'Ready';
  }
  updateNavButtons();
  saveSession();
}

function setActiveTab(id) {
  activeTabId = id;
  tabs.forEach((tab) => {
    const isActive = tab.id === id;
    tab.tabElement.classList.toggle('active', isActive);
    tab.webview.classList.toggle('active', isActive);
  });
  syncActiveAddress(id);
}

function navigateActiveTab(value) {
  const tab = getActiveTab();
  if (!tab) return;
  const target = value === 'webwin:newtab' ? NEWTAB_URL : normalizeUrl(value);
  tab.webview.loadURL(target);
  tab.webview.setAttribute('src', target);
  addressInput.value = target === NEWTAB_URL ? '' : target;
  statusText.textContent = 'Loading';
  saveSession();
}

function closeTab(id) {
  const index = tabs.findIndex((tab) => tab.id === id);
  if (index === -1) return;
  const wasActive = activeTabId === id;
  const [tab] = tabs.splice(index, 1);
  tab.tabElement.remove();
  tab.webview.remove();
  if (!tabs.length) {
    createTab('webwin:newtab');
    return;
  }
  if (wasActive) {
    const fallbackIndex = Math.max(0, index - 1);
    setActiveTab(tabs[fallbackIndex].id);
  }
  saveSession();
}

function attachWebviewEvents(id, webview) {
  webview.addEventListener('did-start-loading', () => {
    updateTabTitle(id, 'Loading...');
    if (activeTabId === id) statusText.textContent = 'Loading';
  });

  webview.addEventListener('did-stop-loading', () => {
    let title = 'New Tab';
    let url = webview.getAttribute('src') || NEWTAB_URL;
    try { title = webview.getTitle() || title; } catch {}
    try { url = webview.getURL() || url; } catch {}
    if (url === NEWTAB_URL) title = 'New Tab';
    updateTabTitle(id, title);
    webview.setAttribute('src', url);
    if (url !== NEWTAB_URL) addHistoryEntry(title, url);
    if (activeTabId === id) {
      statusText.textContent = 'Done';
      pageMeta.textContent = title;
      syncActiveAddress(id);
    }
  });

  webview.addEventListener('page-title-updated', (event) => {
    const title = event.title || 'New Tab';
    updateTabTitle(id, title);
    if (activeTabId === id) pageMeta.textContent = title;
  });

  webview.addEventListener('did-navigate', () => syncActiveAddress(id));
  webview.addEventListener('did-navigate-in-page', () => syncActiveAddress(id));
  webview.addEventListener('dom-ready', () => syncActiveAddress(id));
  webview.addEventListener('did-fail-load', () => {
    if (activeTabId === id) statusText.textContent = 'Failed to load';
  });
  webview.addEventListener('new-window', (event) => {
    if (event.url) createTab(event.url);
  });
}

function createTab(initialUrl = 'webwin:newtab', savedTitle = 'New Tab', forcedId = null) {
  const id = forcedId || makeId();
  const tabElement = document.createElement('button');
  tabElement.className = 'tab';
  tabElement.type = 'button';
  tabElement.dataset.tabId = id;

  const titleElement = document.createElement('span');
  titleElement.className = 'tab-title';
  titleElement.textContent = savedTitle;

  const closeElement = document.createElement('button');
  closeElement.className = 'tab-close';
  closeElement.type = 'button';
  closeElement.textContent = '×';
  closeElement.addEventListener('click', (event) => {
    event.stopPropagation();
    closeTab(id);
  });

  tabElement.append(titleElement, closeElement);
  tabElement.addEventListener('click', () => setActiveTab(id));

  const webview = document.createElement('webview');
  const resolvedUrl = initialUrl === 'webwin:newtab' ? NEWTAB_URL : normalizeUrl(initialUrl);
  webview.dataset.tabId = id;
  webview.setAttribute('allowpopups', 'true');
  webview.setAttribute('src', resolvedUrl);
  attachWebviewEvents(id, webview);

  tabs.push({ id, titleElement, tabElement, webview });
  tabsElement.appendChild(tabElement);
  webviewsElement.appendChild(webview);
  setActiveTab(id);
}

function saveCurrentBookmark() {
  const tab = getActiveTab();
  if (!tab) return;
  let url = tab.webview.getAttribute('src') || NEWTAB_URL;
  let title = tab.titleElement.textContent || 'Untitled';
  try {
    const realUrl = tab.webview.getURL();
    if (realUrl) url = realUrl;
  } catch {}
  if (url === NEWTAB_URL) return;
  const current = getBookmarks();
  if (current.some((bookmark) => bookmark.url === url)) {
    statusText.textContent = 'Bookmark already saved';
    return;
  }
  current.unshift({ title, url });
  writeJson(BOOKMARKS_KEY, current.slice(0, 100));
  renderBookmarks();
  statusText.textContent = 'Bookmark saved';
}

function restoreSession() {
  const session = readJson(SESSION_KEY, null);
  if (!session || !Array.isArray(session.tabs) || !session.tabs.length) {
    createTab('webwin:newtab');
    return;
  }
  session.tabs.forEach((tab) => createTab(tab.url || 'webwin:newtab', tab.title || 'New Tab', tab.id));
  if (session.activeTabId && tabs.some((tab) => tab.id === session.activeTabId)) {
    setActiveTab(session.activeTabId);
  }
}

addressForm.addEventListener('submit', (event) => {
  event.preventDefault();
  navigateActiveTab(addressInput.value);
});

newTabButton.addEventListener('click', () => createTab('webwin:newtab'));
menuButton.addEventListener('click', () => menuPanel.classList.toggle('hidden'));
closeMenuButton.addEventListener('click', closeAllPanels);
menuNewTab.addEventListener('click', () => { closeAllPanels(); createTab('webwin:newtab'); });
menuBookmarks.addEventListener('click', () => openPanel(bookmarksPanel));
menuHistory.addEventListener('click', () => openPanel(historyPanel));
menuDownloads.addEventListener('click', () => openPanel(downloadsPanel));
menuRestore.addEventListener('click', () => { closeAllPanels(); tabs.forEach((tab) => { tab.tabElement.remove(); tab.webview.remove(); }); tabs = []; activeTabId = null; restoreSession(); });

bookmarksToggleButton.addEventListener('click', () => openPanel(bookmarksPanel));
closeBookmarksButton.addEventListener('click', closeAllPanels);
closeHistoryButton.addEventListener('click', closeAllPanels);
closeDownloadsButton.addEventListener('click', closeAllPanels);
clearHistoryButton.addEventListener('click', () => { writeJson(HISTORY_KEY, []); renderHistory(); });

backButton.addEventListener('click', () => {
  const tab = getActiveTab();
  try { if (tab?.webview.canGoBack()) tab.webview.goBack(); } catch {}
});
forwardButton.addEventListener('click', () => {
  const tab = getActiveTab();
  try { if (tab?.webview.canGoForward()) tab.webview.goForward(); } catch {}
});
reloadButton.addEventListener('click', () => {
  const tab = getActiveTab();
  try { tab?.webview.reload(); } catch {}
});
homeButton.addEventListener('click', () => navigateActiveTab(HOME_URL));
bookmarkButton.addEventListener('click', saveCurrentBookmark);
window.addEventListener('beforeunload', saveSession);

window.webwin.onOpenNewTab((url) => createTab(url || 'webwin:newtab'));
window.webwin.onDownloadCreated((entry) => {
  downloads = [entry, ...downloads.filter((item) => item.id !== entry.id)];
  renderDownloads();
});
window.webwin.onDownloadUpdated((entry) => {
  downloads = downloads.map((item) => item.id === entry.id ? entry : item);
  if (!downloads.some((item) => item.id === entry.id)) downloads.unshift(entry);
  renderDownloads();
});

(async () => {
  downloads = await window.webwin.getDownloads();
  renderBookmarks();
  renderHistory();
  renderDownloads();
  restoreSession();
})();
