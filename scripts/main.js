const featuredVideoId = 'the-last-dawn';
const modal = document.querySelector('.video-modal');
const modalVideo = modal.querySelector('video');
const modalTitle = modal.querySelector('.modal-title');
const modalDescription = modal.querySelector('.modal-description');
const modalMeta = modal.querySelector('.modal-meta');
const closeButton = modal.querySelector('.video-close');
const searchInput = document.querySelector('#search');

async function loadVideos() {
  try {
    const response = await fetch('data/videos.json');
    if (!response.ok) throw new Error('No se pudo cargar el catálogo');
    const videos = await response.json();
    buildCatalog(videos);
  } catch (error) {
    console.error(error);
    document.querySelector('#catalog').innerHTML = '<p class="error">No se pudo cargar el catálogo. Revisa el archivo data/videos.json.</p>';
  }
}

function buildCatalog(videos) {
  const sectionsContainer = document.querySelector('#catalog');
  sectionsContainer.innerHTML = '';

  if (!videos.length) {
    sectionsContainer.innerHTML = '<p class="error">Tu catálogo está vacío. Agrega elementos en data/videos.json.</p>';
    return;
  }

  const categories = [...new Set(videos.map(video => video.category))];

  categories.forEach(category => {
    const section = document.createElement('section');
    section.className = 'section';
    section.dataset.category = category.toLowerCase();

    const title = document.createElement('h2');
    title.textContent = category;

    const carousel = document.createElement('div');
    carousel.className = 'carousel';

    videos
      .filter(video => video.category === category)
      .forEach(video => {
        const card = createCard(video);
        carousel.appendChild(card);
      });

    section.append(title, carousel);
    sectionsContainer.appendChild(section);
  });

  const featured = videos.find(video => video.id === featuredVideoId) || videos[0];
  if (featured) {
    renderHero(featured);
  }

  bindSearch();
}

function createCard(video) {
  const card = document.createElement('article');
  card.className = 'card';
  card.tabIndex = 0;
  card.setAttribute('role', 'button');
  card.dataset.title = video.title.toLowerCase();
  card.dataset.description = video.description.toLowerCase();

  const thumb = document.createElement('img');
  thumb.src = video.thumbnail || 'assets/images/default-thumb.svg';
  thumb.alt = `Miniatura de ${video.title}`;

  const content = document.createElement('div');
  content.className = 'card-content';

  const title = document.createElement('h3');
  title.textContent = video.title;

  const description = document.createElement('p');
  description.textContent = video.description;

  content.append(title, description);
  card.append(thumb, content);

  card.addEventListener('click', () => openVideo(video));
  card.addEventListener('keypress', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openVideo(video);
    }
  });

  return card;
}

function renderHero(video) {
  const hero = document.querySelector('.hero');
  hero.style.backgroundImage = `url(${video.thumbnail || 'assets/images/default-thumb.svg'})`;
  hero.querySelector('h1').textContent = video.title;
  hero.querySelector('.hero-description').textContent = video.description;
  hero.querySelector('.hero-meta .year').textContent = video.year;
  hero.querySelector('.hero-meta .duration').textContent = video.duration;
  const categoryElement = hero.querySelector('.hero-meta .category');
  if (categoryElement) {
    categoryElement.textContent = video.category;
  }

  const playButton = hero.querySelector('.button.primary');
  playButton.onclick = () => openVideo(video);
}

function openVideo(video) {
  modal.classList.add('active');
  modalVideo.src = video.video;
  modalVideo.setAttribute('aria-label', `Reproduciendo ${video.title}`);
  modalTitle.textContent = video.title;
  modalDescription.textContent = video.description;
  modalMeta.textContent = `${video.year} · ${video.duration} · ${video.category}`;
  modalVideo.play().catch(() => {
    // En algunos navegadores la reproducción automática requiere interacción previa.
  });
}

function closeModal() {
  modal.classList.remove('active');
  modalVideo.pause();
  modalVideo.currentTime = 0;
  modalVideo.removeAttribute('src');
}

closeButton.addEventListener('click', closeModal);
modal.addEventListener('click', event => {
  if (event.target === modal) {
    closeModal();
  }
});

document.addEventListener('keyup', event => {
  if (event.key === 'Escape' && modal.classList.contains('active')) {
    closeModal();
  }
});

function bindSearch() {
  if (!searchInput) return;

  searchInput.addEventListener('input', event => {
    const term = event.target.value.toLowerCase().trim();

    document.querySelectorAll('.section').forEach(section => {
      let visibleCards = 0;
      const categoryMatch = section.dataset.category.includes(term);

      section.querySelectorAll('.card').forEach(card => {
        const titleMatch = card.dataset.title.includes(term);
        const descriptionMatch = card.dataset.description.includes(term);

        if (!term || titleMatch || descriptionMatch || categoryMatch) {
          card.style.display = '';
          visibleCards += 1;
        } else {
          card.style.display = 'none';
        }
      });

      section.style.display = visibleCards > 0 || !term ? '' : 'none';
    });
  });
}

loadVideos();
