/**
 * LIFECYCLE SPATIAL PHYSICS ENGINE
 * Smooth 60fps inertia drag, momentum physics, boundary dampening & zoom
 * Desktop pointer + Mobile touch support
 */

export class SpatialPhysics {
  constructor(viewportEl, worldEl, minimapEl, onMoveCallback) {
    this.viewport = viewportEl;
    this.world = worldEl;
    this.minimap = minimapEl;
    this.onMoveCallback = onMoveCallback;

    // Camera State
    this.x = 0;
    this.y = 0;
    this.scale = 1.0;
    this.targetScale = 1.0;

    // Velocity & Physics
    this.vx = 0;
    this.vy = 0;
    this.friction = 0.92;
    this.isDragging = false;
    this.hasMovedSignificantly = false;

    // Bounds (Expanded world area)
    this.bounds = {
      minX: -1400,
      maxX: 1400,
      minY: -1100,
      maxY: 1100,
      minScale: 0.55,
      maxScale: 1.4
    };

    // Tracking pointers
    this.lastPointerX = 0;
    this.lastPointerY = 0;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.lastTime = 0;
    this.animFrameId = null;

    // Touch pinch tracking
    this.initialPinchDist = 0;
    this.initialPinchScale = 1.0;

    if (!this.viewport || !this.world) return;

    this.initEvents();
    this.startLoop();
  }

  initEvents() {
    if (!this.viewport || !this.world) return;

    // Mouse & Pointer events
    this.viewport.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    window.addEventListener('pointermove', (e) => this.onPointerMove(e));
    window.addEventListener('pointerup', (e) => this.onPointerUp(e));
    window.addEventListener('pointercancel', (e) => this.onPointerUp(e));

    // Mouse Wheel Zoom
    this.viewport.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });

    // Touch Pinch Zoom (mobile)
    this.viewport.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: true });
    this.viewport.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: true });

    // Keyboard Panning (WASD & Arrow Keys)
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
  }

  onPointerDown(e) {
    if (e.target.closest('button') || e.target.closest('.spatial-minimap')) return;
    this.isDragging = true;
    this.hasMovedSignificantly = false;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;
    this.dragStartX = e.clientX;
    this.dragStartY = e.clientY;
    this.lastTime = performance.now();
    this.vx = 0;
    this.vy = 0;
    this.viewport.classList.add('is-dragging');
    document.body.classList.add('cursor-drag');
  }

  onPointerMove(e) {
    if (!this.isDragging) return;

    const now = performance.now();
    const dt = Math.max(1, now - this.lastTime);
    const dx = e.clientX - this.lastPointerX;
    const dy = e.clientY - this.lastPointerY;

    // Check if moved enough to distinguish click from drag
    if (Math.hypot(e.clientX - this.dragStartX, e.clientY - this.dragStartY) > 6) {
      this.hasMovedSignificantly = true;
    }

    this.x += dx;
    this.y += dy;

    // Calculate instantaneous velocity
    this.vx = (dx / dt) * 16.6;
    this.vy = (dy / dt) * 16.6;

    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;
    this.lastTime = now;
  }

  onPointerUp() {
    if (!this.isDragging) return;
    this.isDragging = false;
    this.viewport.classList.remove('is-dragging');
    document.body.classList.remove('cursor-drag');
  }

  onWheel(e) {
    if (document.body.classList.contains('reduced-motion-active')) return;
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    this.targetScale = Math.min(
      this.bounds.maxScale,
      Math.max(this.bounds.minScale, this.targetScale * zoomFactor)
    );
  }

  onTouchStart(e) {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      this.initialPinchDist = dist;
      this.initialPinchScale = this.scale;
    }
  }

  onTouchMove(e) {
    if (e.touches.length === 2 && this.initialPinchDist > 0) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const ratio = dist / this.initialPinchDist;
      this.targetScale = Math.min(
        this.bounds.maxScale,
        Math.max(this.bounds.minScale, this.initialPinchScale * ratio)
      );
    }
  }

  onKeyDown(e) {
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
    const panSpeed = e.shiftKey ? 90 : 35;
    let handled = false;

    switch (e.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        this.y += panSpeed;
        handled = true;
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        this.y -= panSpeed;
        handled = true;
        break;
      case 'ArrowLeft':
      case 'a':
      case 'A':
        this.x += panSpeed;
        handled = true;
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        this.x -= panSpeed;
        handled = true;
        break;
      case '+':
      case '=':
        this.targetScale = Math.min(this.bounds.maxScale, this.targetScale * 1.15);
        handled = true;
        break;
      case '-':
      case '_':
        this.targetScale = Math.max(this.bounds.minScale, this.targetScale * 0.85);
        handled = true;
        break;
    }
    if (handled) {
      e.preventDefault();
    }
  }

  centerOnNode(targetX, targetY, scale = 1.0) {
    // Invert coordinate to center the world
    this.x = -targetX;
    this.y = -targetY;
    this.vx = 0;
    this.vy = 0;
    this.targetScale = scale;
  }

  startLoop() {
    const tick = () => {
      // Reduced motion bypass
      if (document.body.classList.contains('reduced-motion-active')) {
        this.world.style.transform = `translate3d(${this.x}px, ${this.y}px, 0) scale(${this.scale})`;
        this.animFrameId = requestAnimationFrame(tick);
        return;
      }

      // Inertia decay
      if (!this.isDragging) {
        this.x += this.vx;
        this.y += this.vy;
        this.vx *= this.friction;
        this.vy *= this.friction;

        // Stop tiny residual velocity
        if (Math.abs(this.vx) < 0.01) this.vx = 0;
        if (Math.abs(this.vy) < 0.01) this.vy = 0;

        // Soft elastic boundary constraints
        if (this.x < this.bounds.minX) {
          this.x += (this.bounds.minX - this.x) * 0.15;
          this.vx *= 0.5;
        } else if (this.x > this.bounds.maxX) {
          this.x += (this.bounds.maxX - this.x) * 0.15;
          this.vx *= 0.5;
        }

        if (this.y < this.bounds.minY) {
          this.y += (this.bounds.minY - this.y) * 0.15;
          this.vy *= 0.5;
        } else if (this.y > this.bounds.maxY) {
          this.y += (this.bounds.maxY - this.y) * 0.15;
          this.vy *= 0.5;
        }
      }

      // Smooth zoom interpolation
      this.scale += (this.targetScale - this.scale) * 0.12;

      // Apply 3D transform to world
      this.world.style.transform = `translate3d(${this.x}px, ${this.y}px, 0) scale(${this.scale})`;

      // Update radar minimap
      this.updateMinimap();

      if (this.onMoveCallback) {
        this.onMoveCallback(this.x, this.y, this.scale);
      }

      this.animFrameId = requestAnimationFrame(tick);
    };

    this.animFrameId = requestAnimationFrame(tick);
  }

  updateMinimap() {
    if (!this.minimap) return;
    const radarBox = this.minimap.querySelector('.minimap-viewport-box');
    if (!radarBox) return;

    // Map -bounds to +bounds into radar coordinates (120x64)
    const mapW = 124;
    const mapH = 64;
    const normalizedX = ((-this.x - this.bounds.minX) / (this.bounds.maxX - this.bounds.minX)) * mapW;
    const normalizedY = ((-this.y - this.bounds.minY) / (this.bounds.maxY - this.bounds.minY)) * mapH;

    radarBox.style.left = `${Math.max(10, Math.min(mapW - 10, normalizedX))}px`;
    radarBox.style.top = `${Math.max(10, Math.min(mapH - 10, normalizedY))}px`;
    radarBox.style.width = `${Math.max(16, 32 / this.scale)}px`;
    radarBox.style.height = `${Math.max(12, 24 / this.scale)}px`;
  }

  destroy() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
  }
}
