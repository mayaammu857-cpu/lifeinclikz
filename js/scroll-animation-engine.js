/**
 * LIFECYCLE SCROLL ANIMATION & DYNAMIC PARALLAX ENGINE
 * Drives scroll-driven reveals, alternating animation styles ("maari maari varunna animations"),
 * sticky scrollytelling image switcher, scroll progress, chapter scroll-spy, and parallax.
 */

export class ScrollAnimationEngine {
  constructor() {
    this.currentMode = 'spatial';
    this.ticking = false;
    this.parallaxElements = [];
    this.visibleParallaxElements = new Set();
    this.chapters = [];
    this.activeChapterId = null;

    // DOM Elements
    this.progressBar = document.getElementById('scroll-progress-bar');
    this.progressContainer = document.getElementById('scroll-progress-container');
    this.scrollPrompt = document.getElementById('editorial-scroll-prompt');
    this.chapterNav = document.getElementById('editorial-chapter-nav');
    this.backToTopBtn = document.getElementById('scroll-top-btn');

    this.observer = null;
    this.parallaxObserver = null;

    this.init();
  }

  init() {
    this.setupIntersectionObserver();
    this.setupParallaxObserver();
    this.setupEventListeners();
    this.refresh();
  }

  setupIntersectionObserver() {
    if (this.observer) {
      this.observer.disconnect();
    }

    const options = {
      root: null,
      rootMargin: '0px 0px -40px 0px',
      threshold: [0, 0.1, 0.25]
    };

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in-view');
        }
      });
    }, options);
  }

  setupParallaxObserver() {
    if (this.parallaxObserver) {
      this.parallaxObserver.disconnect();
    }

    // Only update parallax on elements currently inside or near viewport
    const options = {
      root: null,
      rootMargin: '120px 0px 120px 0px',
      threshold: 0
    };

    this.parallaxObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.visibleParallaxElements.add(entry.target);
        } else {
          this.visibleParallaxElements.delete(entry.target);
        }
      });
    }, options);
  }

  refresh() {
    // 1. Observe all scroll-reveal elements (cards, headers, quotes, table rows)
    const revealEls = document.querySelectorAll(
      '.scroll-reveal, .editorial-pull-quote, .curator-table-row, .editorial-chapter-header'
    );
    revealEls.forEach(el => {
      if (this.observer) this.observer.observe(el);
    });

    // 2. Register parallax images
    this.parallaxElements = Array.from(document.querySelectorAll('.parallax-img'));
    this.visibleParallaxElements.clear();
    this.parallaxElements.forEach(img => {
      if (this.parallaxObserver) this.parallaxObserver.observe(img);
    });

    // 3. Register chapters for scrollspy
    this.chapters = Array.from(document.querySelectorAll('.editorial-chapter'));

    // 4. Register Scrollytelling Reel timeline segments click handlers
    this.setupScrollyReelClicks();

    // Trigger initial tick
    this.requestUpdate();
  }

  setupScrollyReelClicks() {
    const reel = document.getElementById('scrolly-reel-container');
    if (!reel) return;

    const segments = reel.querySelectorAll('.scrolly-timeline-segment');
    segments.forEach((seg) => {
      seg.addEventListener('click', (e) => {
        e.stopPropagation();
        const slideIdx = parseInt(seg.getAttribute('data-slide-index'), 10);
        const total = segments.length;
        const reelTop = reel.getBoundingClientRect().top + window.scrollY;
        const totalScrollable = reel.offsetHeight - window.innerHeight;
        const targetScroll = reelTop + (slideIdx / total) * totalScrollable + 20;
        window.scrollTo({ top: targetScroll, behavior: 'smooth' });
      });
    });
  }

  setupEventListeners() {
    // Scroll listener with requestAnimationFrame throttling
    window.addEventListener('scroll', () => this.requestUpdate(), { passive: true });
    window.addEventListener('resize', () => this.requestUpdate(), { passive: true });

    // Scroll Prompt Click: glides down into the scrollytelling reel
    if (this.scrollPrompt) {
      this.scrollPrompt.addEventListener('click', () => {
        const reel = document.getElementById('scrolly-reel-container') || document.getElementById('ch-1');
        if (reel) {
          reel.scrollIntoView({ behavior: 'smooth' });
        }
      });
    }

    // Back to Top Click
    if (this.backToTopBtn) {
      this.backToTopBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    // Chapter Nav Links
    document.querySelectorAll('.chapter-nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = item.getAttribute('href')?.replace('#', '');
        const targetEl = document.getElementById(targetId);
        if (targetEl) {
          const targetY = targetEl.getBoundingClientRect().top + window.scrollY - 100;
          window.scrollTo({ top: targetY, behavior: 'smooth' });
        }
      });
    });
  }

  requestUpdate() {
    if (!this.ticking) {
      requestAnimationFrame(() => {
        this.update();
        this.ticking = false;
      });
      this.ticking = true;
    }
  }

  update() {
    const scrollY = window.scrollY || window.pageYOffset;
    const isReducedMotion = document.body.classList.contains('reduced-motion-active') ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // 1. Scroll Progress Bar
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (docHeight > 0 && this.progressBar) {
      const pct = Math.min(100, Math.max(0, (scrollY / docHeight) * 100));
      this.progressBar.style.width = `${pct}%`;
    }

    // 2. Scroll Prompt Fadeout
    if (this.scrollPrompt) {
      this.scrollPrompt.classList.toggle('is-hidden', scrollY > 60);
    }

    // 3. Back to Top Button Visibility
    if (this.backToTopBtn) {
      const isVisible = (this.currentMode === 'editorial' || this.currentMode === 'index') && scrollY > 480;
      this.backToTopBtn.classList.toggle('is-visible', isVisible);
    }

    // 4. STICKY SCROLLYTELLING SEQUENCE (Images dynamically switch as user scrolls)
    if (this.currentMode === 'editorial') {
      this.updateScrollyReel();
    }

    // 5. Chapter ScrollSpy & Header Line Tracker
    if (this.currentMode === 'editorial') {
      let currentChapterId = null;
      const viewportMid = window.innerHeight * 0.45;

      this.chapters.forEach(chapter => {
        const rect = chapter.getBoundingClientRect();
        if (rect.top <= viewportMid && rect.bottom >= viewportMid) {
          currentChapterId = chapter.id;
        }

        // Active state on chapter for horizontal line tracker
        const isCurrent = rect.top <= viewportMid + 120 && rect.bottom >= 120;
        chapter.classList.toggle('is-active', isCurrent);
      });

      if (currentChapterId && currentChapterId !== this.activeChapterId) {
        this.activeChapterId = currentChapterId;
        this.updateChapterNav(currentChapterId);
      }

      // Continuous Focal Highlight: Center Card
      const viewportCenter = window.innerHeight * 0.5;
      const visibleCards = document.querySelectorAll('.spread-card.is-in-view');
      let closestCard = null;
      let minDistance = Infinity;

      visibleCards.forEach(card => {
        const rect = card.getBoundingClientRect();
        const cardCenter = rect.top + rect.height * 0.5;
        const dist = Math.abs(cardCenter - viewportCenter);
        if (dist < minDistance && dist < window.innerHeight * 0.4) {
          minDistance = dist;
          closestCard = card;
        }
      });

      visibleCards.forEach(card => {
        card.classList.toggle('is-centered', card === closestCard);
      });
    }

    // 6. Parallax Image Motion (disabled in reduced motion)
    if (!isReducedMotion && this.visibleParallaxElements.size > 0) {
      const windowHeight = window.innerHeight;
      this.visibleParallaxElements.forEach(img => {
        const rect = img.getBoundingClientRect();
        // progress: -1 when at bottom of screen, 0 when centered, +1 when at top
        const centerOffset = (rect.top + rect.height * 0.5) - (windowHeight * 0.5);
        const normalized = centerOffset / windowHeight;
        const parallaxY = Math.round(normalized * 32); // Max shift ~32px
        img.style.transform = `translate3d(0, ${parallaxY}px, 0)`;
      });
    }
  }

  updateScrollyReel() {
    const reelEl = document.getElementById('scrolly-reel-container');
    if (!reelEl) return;

    const rect = reelEl.getBoundingClientRect();
    const containerH = reelEl.offsetHeight;
    const winH = window.innerHeight;
    const totalScrollable = containerH - winH;

    if (totalScrollable <= 0) return;

    const scrolledIn = -rect.top;
    const rawProgress = Math.max(0, Math.min(1, scrolledIn / totalScrollable));

    const slides = reelEl.querySelectorAll('.scrolly-slide-layer');
    const segments = reelEl.querySelectorAll('.scrolly-timeline-segment');
    const total = slides.length;

    if (total === 0) return;

    // Determine active index
    const activeIdx = Math.min(total - 1, Math.floor(rawProgress * total));

    slides.forEach((slide, i) => {
      slide.classList.toggle('is-active', i === activeIdx);
    });

    segments.forEach((seg, i) => {
      const isPassed = i < activeIdx;
      const isCurrent = i === activeIdx;
      seg.classList.toggle('is-active', isPassed || isCurrent);

      const fill = seg.querySelector('.scrolly-segment-fill');
      if (fill) {
        if (isPassed) {
          fill.style.width = '100%';
        } else if (isCurrent) {
          const stepProgress = (rawProgress * total) - activeIdx;
          fill.style.width = `${Math.min(100, Math.max(0, stepProgress * 100))}%`;
        } else {
          fill.style.width = '0%';
        }
      }
    });

    // Update Live HUD Information
    const activeSlide = slides[activeIdx];
    if (activeSlide) {
      const title = activeSlide.getAttribute('data-title');
      const counter = activeSlide.getAttribute('data-counter');
      const specs = activeSlide.getAttribute('data-specs');

      const titleEl = document.getElementById('scrolly-active-title');
      const counterEl = document.getElementById('scrolly-active-counter');
      const specsEl = document.getElementById('scrolly-active-specs');

      if (titleEl && title && titleEl.textContent !== title) titleEl.textContent = title;
      if (counterEl && counter && counterEl.textContent !== counter) counterEl.textContent = counter;
      if (specsEl && specs && specsEl.textContent !== specs) specsEl.textContent = specs;
    }
  }

  updateChapterNav(chapterId) {
    document.querySelectorAll('.chapter-nav-item').forEach(btn => {
      const href = btn.getAttribute('href');
      const isActive = href === `#${chapterId}`;
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-current', isActive ? 'true' : 'false');
    });
  }

  onModeChange(targetMode) {
    this.currentMode = targetMode;

    const isScrollableView = targetMode === 'editorial' || targetMode === 'index';

    // Toggle progress container
    if (this.progressContainer) {
      this.progressContainer.classList.toggle('is-active', isScrollableView);
    }

    // Toggle chapter nav
    if (this.chapterNav) {
      this.chapterNav.classList.toggle('is-visible', targetMode === 'editorial');
    }

    // Toggle back to top button
    if (this.backToTopBtn) {
      this.backToTopBtn.classList.toggle('is-visible', isScrollableView && window.scrollY > 480);
    }

    // Delay slightly to let layout adjust after DOM visibility toggle
    setTimeout(() => {
      this.refresh();
      this.requestUpdate();
    }, 80);
  }
}

// Export singleton instance
export const scrollEngine = new ScrollAnimationEngine();
