const HOME_URL = 'https://duckduckgo.com/';
const SEARCH_URL = 'https://duckduckgo.com/?q=';
const STORAGE_KEY = 'webwin-bookmarks';

const tabsElement = document.getElementById('tabs');
const webviewsElement = document.getElementById('webviews');
const addressForm = document.getElementById('addressForm');
const addressInput = document.getElementById('addressInput');
const newTabButton = document.getElementById('newTabButton');
const backButton = document.getElementById('backButton');
const forwardButton = document.getElementById('forwardButton');
const reloadButton = document.getElementById('reloadButton');
const homeButton = document.getElementById('homeButton');
const bookmarkButton = document.getElementById('bookmarkButton');
const bookmarksToggleButton = document.getElementById('bookmarksToggleButton');
const bookmarksPanel = document.getElementById('bookmarksPanel');
const bookmarksList = document.getElementById('bookmarksList');
const closeBookmarksButton = document.getElementById('closeBookmarksButton');
const statusText = document.getElementById('statusText');
const pageMeta = document.getElementById('pageMeta');

let tabs = [];
let activeTabId = null;

function normalizeUrl(value) {
  const input = (value || '').trim();
  if (!input) return HOME_URL;

  const hasScheme = /^https?:\/\//i.test(input);
  const looksLikeUrl = /^(localhost|\d{1,3}(?:\.\d{1,3}){3}|[\w-]+\.[a-z]{2,}|file:\/\/)/i.test(input);

  if (hasScheme) return input;
  if (looksLikeUrl) return `https://${input}`;
  return `${SEARCH_URL}${encodeURIComponent(input)}`;
}

function getBookmarks() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveBookmarks(bookmarks) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
  renderBookmarks();
}

function renderBookmarks() {
  const bookmarks = getBookmarks();
  bookmarksList.innerHTML = '';

  if (!bookmarks.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'No bookmarks saved yet.';
    bookmarksList.appendChild(empty);
    return;
  }

  bookmarks.forEach((bookmark, index) => {
    const item = document.createElement('div');
    item.className = 'bookmark-item';

    const meta = document.createElement('div');
    meta.className = 'bookmark-meta';

    const title = document.createElement('div');
    title.className = 'bookmark-title';
    title.textContent = bookmark.title || 'Untitled';

    const url = document.createElement('div');
    url.className = 'bookmark-url';
    url.textContent = bookmark.url;

    const openButton = document.createElement('button');
    openButton.className = 'action-button';
    openButton.textContent = 'Open';
    openButton.addEventListener('click', () => navigateActiveTab(bookmark.url));

    const deleteButton = document.createElement('button');
    deleteButton.className = 'action-button';
    deleteButton.textContent = 'Delete';
    deleteButton.addEventListener('click', () => {
      const next = getBookmarks().filter((_, currentIndex) => currentIndex !== index);
      saveBookmarks(next);
    });

    meta.append(title, url);
    item.append(meta, openButton, deleteButton);
    bookmarksList.appendChild(item);
  });
}

function createTab(initialUrl = HOME_URL) {
  const id = crypto.randomUUID();

  const tabElement = document.createElement('button');
  tabElement.className = 'tab';
  tabElement.type = 'button';
  tabElement.dataset.tabId = id;

  const titleElement = document.createElement('span');
  titleElement.className = 'tab-title';
  titleElement.textContent = 'New Tab';

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
  webview.dataset.tabId = id;
  webview.setAttribute('allowpopups', 'true');
  webview.src = normalizeUrl(initialUrl);

  webview.addEventListener('did-start-loading', () => {
    updateTabTitle(id, 'Loading...');
    if (activeTabId === id) {
      statusText.textContent = 'Loading';
      addressInput.value = webview.getURL() || webview.src;
    }
  });

  webview.addEventListener('did-stop-loading', () => {
    const currentTitle = webview.getTitle() || 'New Tab';
    updateTabTitle(id, currentTitle);
    if (activeTabId === id) {
      statusText.textContent = 'Done';
      addressInput.value = webview.getURL() || webview.src;
      pageMeta.textContent = currentTitle;
    }
  });

  webview.addEventListener('page-title-updated', (event) => {
    updateTabTitle(id, event.title || 'New Tab');
    if (activeTabId === id) {
      pageMeta.textContent = event.title || 'New Tab';
    }
  });

  webview.addEventListener('did-navigate', () => syncActiveAddress(id));
  webview.addEventListener('did-navigate-in-page', () => syncActiveAddress(id));

  webview.addEventListener('did-fail-load', () => {
    if (activeTabId === id) {
      statusText.textContent = 'Failed to load';
    }
  });

  webview.addEventListener('new-window', (event) => {
    createTab(event.url);
  });

  tabs.push({ id, titleElement, tabElement, webview });
  tabsElement.appendChild(tabElement);
  webviewsElement.appendChild(webview);
  setActiveTab(id);
}

function closeTab(id) {
  const tabIndex = tabs.findIndex((tab) => tab.id === id);
  if (tabIndex === -1) return;

  const wasActive = activeTabId === id;
  const [tab] = tabs.splice(tabIndex, 1);
  tab.tabElement.remove();
  tab.webview.remove();

  if (!tabs.length) {
    createTab(HOME_URL);
    return;
  }

  if (wasActive) {
    const fallbackIndex = Math.max(0, tabIndex - 1);
    setActiveTab(tabs[fallbackIndex].id);
  }
}

function updateTabTitle(id, title) {
  const tab = tabs.find((entry) => entry.id === id);
  if (!tab) return;
  tab.titleElement.textContent = title;
}

function setActiveTab(id) {
  activeTabId = id;

  tabs.forEach((tab) => {
    const isActive = tab.id === id;
    tab.tabElement.classList.toggle('active', isActive);
    tab.webview.classList.toggle('active', isActive);
  });

  syncActiveAddress(id);
  updateNavButtons();
}

function getActiveTab() {
  return tabs.find((tab) => tab.id === activeTabId) || null;
}

function syncActiveAddress(id = activeTabId) {
  const tab = tabs.find((entry) => entry.id === id);
  if (!tab) return;

  const currentUrl = tab.webview.getURL() || tab.webview.src || HOME_URL;
  const currentTitle = tab.webview.getTitle() || 'New Tab';

  if (activeTabId === id) {
    addressInput.value = currentUrl;
    pageMeta.textContent = currentTitle;
    statusText.textContent = 'Ready';
  }

  updateNavButtons();
}

function navigateActiveTab(value) {
  const tab = getActiveTab();
  if (!tab) return;

  const target = normalizeUrl(value);
  tab.webview.loadURL(target);
  addressInput.value = target;
}

function updateNavButtons() {
  const tab = getActiveTab();
  if (!tab) {
    backButton.disabled = true;
    forwardButton.disabled = true;
    return;
  }

  backButton.disabled = !tab.webview.canGoBack();
  forwardButton.disabled = !tab.webview.canGoForward();
}

function saveCurrentBookmark() {
  const tab = getActiveTab();
  if (!tab) return;

  const url = tab.webview.getURL() || tab.webview.src;
  const title = tab.webview.getTitle() || 'Untitled';
  const current = getBookmarks();

  if (current.some((bookmark) => bookmark.url === url)) {
    statusText.textContent = 'Bookmark already saved';
    return;
  }

  current.unshift({ title, url });
  saveBookmarks(current);
  statusText.textContent = 'Bookmark saved';
}

addressForm.addEventListener('submit', (event) => {
  event.preventDefault();
  navigateActiveTab(addressInput.value);
});

newTabButton.addEventListener('click', () => createTab(HOME_URL));
backButton.addEventListener('click', () => {
  const tab = getActiveTab();
  if (tab?.webview.canGoBack()) tab.webview.goBack();
});
forwardButton.addEventListener('click', () => {
  const tab = getActiveTab();
  if (tab?.webview.canGoForward()) tab.webview.goForward();
});
reloadButton.addEventListener('click', () => {
  const tab = getActiveTab();
  if (tab) tab.webview.reload();
});
homeButton.addEventListener('click', () => navigateActiveTab(HOME_URL));
bookmarkButton.addEventListener('click', saveCurrentBookmark);
bookmarksToggleButton.addEventListener('click', () => bookmarksPanel.classList.toggle('hidden'));
closeBookmarksButton.addEventListener('click', () => bookmarksPanel.classList.add('hidden'));

window.webwin.onOpenNewTab((url) => createTab(url));

renderBookmarks();
createTab(HOME_URL);
