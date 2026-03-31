const STORAGE_KEY = 'webwin-gallery-last-folder';

const openFolderButton = document.getElementById('openFolderButton');
const slideshowButton = document.getElementById('slideshowButton');
const folderPathLabel = document.getElementById('folderPathLabel');
const imageCountLabel = document.getElementById('imageCountLabel');
const searchInput = document.getElementById('searchInput');
const sortSelect = document.getElementById('sortSelect');
const prevButton = document.getElementById('prevButton');
const nextButton = document.getElementById('nextButton');
const openFileButton = document.getElementById('openFileButton');
const showFolderButton = document.getElementById('showFolderButton');
const viewerContent = document.getElementById('viewerContent');
const detailsContent = document.getElementById('detailsContent');
const galleryGrid = document.getElementById('galleryGrid');
const resultsLabel = document.getElementById('resultsLabel');

const state = {
  folderPath: '',
  images: [],
  filteredImages: [],
  selectedImageId: null,
  search: '',
  sort: 'name-asc',
  slideshowTimer: null
};

function bytesToSize(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatDate(value) {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function getSelectedImage() {
  return state.filteredImages.find((image) => image.id === state.selectedImageId) || null;
}

function sortImages(images) {
  const sorted = [...images];
  switch (state.sort) {
    case 'name-desc':
      sorted.sort((a, b) => b.name.localeCompare(a.name));
      break;
    case 'date-desc':
      sorted.sort((a, b) => new Date(b.modifiedAt) - new Date(a.modifiedAt));
      break;
    case 'date-asc':
      sorted.sort((a, b) => new Date(a.modifiedAt) - new Date(b.modifiedAt));
      break;
    case 'size-desc':
      sorted.sort((a, b) => b.size - a.size);
      break;
    case 'size-asc':
      sorted.sort((a, b) => a.size - b.size);
      break;
    default:
      sorted.sort((a, b) => a.name.localeCompare(b.name));
      break;
  }
  return sorted;
}

function applyFilters() {
  const query = state.search.trim().toLowerCase();
  const filtered = state.images.filter((image) => {
    if (!query) return true;
    return image.name.toLowerCase().includes(query);
  });

  state.filteredImages = sortImages(filtered);

  if (!state.filteredImages.some((image) => image.id === state.selectedImageId)) {
    state.selectedImageId = state.filteredImages[0]?.id || null;
  }
}

function renderViewer() {
  const image = getSelectedImage();
  viewerContent.innerHTML = '';

  if (!image) {
    viewerContent.className = 'viewer-content empty-viewer';
    viewerContent.innerHTML = `
      <div class="viewer-empty">
        <div class="empty-title">No image selected</div>
        <div class="empty-text">Choose a folder and click a picture to preview it here.</div>
      </div>`;
    return;
  }

  viewerContent.className = 'viewer-content';
  const img = document.createElement('img');
  img.src = image.fileUrl;
  img.alt = image.name;
  viewerContent.appendChild(img);
}

function renderDetails() {
  const image = getSelectedImage();
  detailsContent.innerHTML = '';

  if (!image) {
    detailsContent.className = 'details-content empty-details';
    detailsContent.innerHTML = '<div class="empty-text">No file selected.</div>';
    return;
  }

  detailsContent.className = 'details-content';

  const fields = [
    ['Filename', image.name],
    ['Path', image.path],
    ['Folder', image.directory],
    ['Extension', image.extension],
    ['Size', bytesToSize(image.size)],
    ['Modified', formatDate(image.modifiedAt)],
    ['Created', formatDate(image.createdAt)]
  ];

  fields.forEach(([label, value]) => {
    const card = document.createElement('div');
    card.className = 'detail-card';
    card.innerHTML = `<span>${label}</span><strong>${value}</strong>`;
    detailsContent.appendChild(card);
  });
}

function renderGrid() {
  galleryGrid.innerHTML = '';
  resultsLabel.textContent = `${state.filteredImages.length} image${state.filteredImages.length > 1 ? 's' : ''}`;
  imageCountLabel.textContent = String(state.images.length);

  if (!state.filteredImages.length) {
    galleryGrid.innerHTML = '<div class="empty-grid">No images found in the current folder or search results.</div>';
    return;
  }

  state.filteredImages.forEach((image) => {
    const card = document.createElement('article');
    card.className = `thumb-card${state.selectedImageId === image.id ? ' active' : ''}`;
    card.innerHTML = `
      <div class="thumb-preview"><img src="${image.fileUrl}" alt="${image.name}" loading="lazy" /></div>
      <div class="thumb-meta">
        <div class="thumb-name">${image.name}</div>
        <div class="thumb-sub">${bytesToSize(image.size)}</div>
      </div>`;
    card.addEventListener('click', () => {
      state.selectedImageId = image.id;
      renderAll();
    });
    galleryGrid.appendChild(card);
  });
}

function renderAll() {
  applyFilters();
  renderViewer();
  renderDetails();
  renderGrid();
  updateButtons();
}

function updateButtons() {
  const index = state.filteredImages.findIndex((image) => image.id === state.selectedImageId);
  prevButton.disabled = index <= 0;
  nextButton.disabled = index === -1 || index >= state.filteredImages.length - 1;
  const hasSelection = index !== -1;
  openFileButton.disabled = !hasSelection;
  showFolderButton.disabled = !hasSelection;
}

function moveSelection(step) {
  const index = state.filteredImages.findIndex((image) => image.id === state.selectedImageId);
  if (index === -1) return;
  const nextIndex = index + step;
  if (nextIndex < 0 || nextIndex >= state.filteredImages.length) return;
  state.selectedImageId = state.filteredImages[nextIndex].id;
  renderAll();
}

async function openFolder() {
  const result = await window.webwin.pickFolder();
  if (result.canceled) return;
  state.folderPath = result.folderPath || '';
  state.images = result.images || [];
  state.selectedImageId = state.images[0]?.id || null;
  folderPathLabel.textContent = state.folderPath || 'No folder selected';
  localStorage.setItem(STORAGE_KEY, state.folderPath);
  renderAll();
}

function toggleSlideshow() {
  if (state.slideshowTimer) {
    clearInterval(state.slideshowTimer);
    state.slideshowTimer = null;
    slideshowButton.textContent = 'Slideshow';
    return;
  }

  if (!state.filteredImages.length) return;

  slideshowButton.textContent = 'Stop slideshow';
  state.slideshowTimer = setInterval(() => {
    const index = state.filteredImages.findIndex((image) => image.id === state.selectedImageId);
    const nextIndex = index >= state.filteredImages.length - 1 ? 0 : index + 1;
    state.selectedImageId = state.filteredImages[nextIndex].id;
    renderAll();
  }, 2500);
}

openFolderButton.addEventListener('click', openFolder);
slideshowButton.addEventListener('click', toggleSlideshow);
searchInput.addEventListener('input', (event) => {
  state.search = event.target.value;
  renderAll();
});
sortSelect.addEventListener('change', (event) => {
  state.sort = event.target.value;
  renderAll();
});
prevButton.addEventListener('click', () => moveSelection(-1));
nextButton.addEventListener('click', () => moveSelection(1));
openFileButton.addEventListener('click', () => {
  const image = getSelectedImage();
  if (!image) return;
  window.webwin.openPath(image.path);
});
showFolderButton.addEventListener('click', () => {
  const image = getSelectedImage();
  if (!image) return;
  window.webwin.showItemInFolder(image.path);
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowLeft') moveSelection(-1);
  if (event.key === 'ArrowRight') moveSelection(1);
});

folderPathLabel.textContent = localStorage.getItem(STORAGE_KEY) || 'No folder selected';
renderAll();
