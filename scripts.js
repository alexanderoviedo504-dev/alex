const filters = document.querySelectorAll('.filter-button');

filters.forEach((button) => {
  button.addEventListener('click', () => {
    filters.forEach((btn) => btn.classList.remove('active'));
    button.classList.add('active');
  });
});

const heroButton = document.querySelector('.hero-button');
if (heroButton) {
  heroButton.addEventListener('click', () => {
    const audio = new Audio(
      'https://cdn.pixabay.com/download/audio/2023/09/19/audio_14944a79a0.mp3?filename=future-bass-150160.mp3'
    );
    audio.volume = 0.4;
    audio.play().catch(() => {});
  });
}
