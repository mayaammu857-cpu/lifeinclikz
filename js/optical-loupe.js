/**
 * LIFECYCLE OPTICAL LOUPE
 * High-precision 2.5x magnifying lens for creative directors & photo editors
 */

export class OpticalLoupe {
  constructor(imageContainerEl, loupeEl) {
    this.container = imageContainerEl;
    this.loupe = loupeEl;
    this.img = null;
    this.zoomFactor = 2.4;
    this.isActive = false;

    this.init();
  }

  init() {
    if (!this.container || !this.loupe) return;

    this.container.addEventListener('mouseenter', () => this.onMouseEnter());
    this.container.addEventListener('mouseleave', () => this.onMouseLeave());
    this.container.addEventListener('mousemove', (e) => this.onMouseMove(e));
  }

  setImage(imageElement) {
    this.img = imageElement;
    if (this.img) {
      this.loupe.style.backgroundImage = `url("${this.img.src}")`;
    }
  }

  onMouseEnter() {
    if (!this.img || document.body.classList.contains('reduced-motion-active')) return;
    this.isActive = true;
    this.loupe.style.display = 'block';
    this.updateBackgroundSize();
  }

  onMouseLeave() {
    this.isActive = false;
    this.loupe.style.display = 'none';
  }

  updateBackgroundSize() {
    if (!this.img) return;
    const rect = this.img.getBoundingClientRect();
    const bgWidth = rect.width * this.zoomFactor;
    const bgHeight = rect.height * this.zoomFactor;
    this.loupe.style.backgroundSize = `${bgWidth}px ${bgHeight}px`;
  }

  onMouseMove(e) {
    if (!this.isActive || !this.img) return;

    const imgRect = this.img.getBoundingClientRect();
    const containerRect = this.container.getBoundingClientRect();

    // Check if cursor is directly over the rendered image
    if (
      e.clientX < imgRect.left ||
      e.clientX > imgRect.right ||
      e.clientY < imgRect.top ||
      e.clientY > imgRect.bottom
    ) {
      this.loupe.style.display = 'none';
      return;
    } else {
      this.loupe.style.display = 'block';
    }

    // Relative to container for lens positioning
    const relX = e.clientX - containerRect.left;
    const relY = e.clientY - containerRect.top;

    this.loupe.style.left = `${relX}px`;
    this.loupe.style.top = `${relY}px`;

    // Position of background relative to image
    const imgX = e.clientX - imgRect.left;
    const imgY = e.clientY - imgRect.top;

    const bgX = -((imgX * this.zoomFactor) - (this.loupe.offsetWidth / 2));
    const bgY = -((imgY * this.zoomFactor) - (this.loupe.offsetHeight / 2));

    this.loupe.style.backgroundPosition = `${bgX}px ${bgY}px`;
  }
}
