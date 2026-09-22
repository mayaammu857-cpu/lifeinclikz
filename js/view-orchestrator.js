/**
 * LIFECYCLE VIEW ORCHESTRATOR
 * Coordinates view transitions between Spatial, Editorial, Index, and Projection modes
 * Filter management across all 31 plates
 */

import { ARCHIVE_DATA } from '../data/archive-data.js';
import { soundEngine } from './audio-synthesizer.js';
import { scrollEngine } from './scroll-animation-engine.js';

export class ViewOrchestrator {
  constructor(options) {
    this.currentView = 'spatial';
    this.activeFilter = 'all';
    this.searchQuery = '';
    this.activeColorFilter = null;

    // View Containers
    this.spatialContainer = options.spatialContainer;
    this.editorialContainer = options.editorialContainer;
    this.indexContainer = options.indexContainer;
    this.projectionContainer = options.projectionContainer;

    // Projection Mode Engine
    this.projectionIndex = 0;
    this.projectionTimer = null;
    this.projectionIntervalMs = 6000;
    this.isProjectionPlaying = true;
    this.projectionProgressBar = options.projectionProgressBar;

    // Callbacks
    this.onPlateSelect = options.onPlateSelect;

    this.init();
  }

  init() {
    this.initModeTriggers();
    this.initFilterTriggers();
    this.initProjectionControls();
  }

  initModeTriggers() {
    const triggers = document.querySelectorAll('[data-view-mode]');
    triggers.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetBtn = e.target.closest('[data-view-mode]');
        if (targetBtn) {
          const targetMode = targetBtn.getAttribute('data-view-mode');
          this.switchMode(targetMode);
        }
      });
    });
  }

  switchMode(targetMode) {
    if (!targetMode || this.currentView === targetMode) return;

    // Audio chime
    const modeIndex = { spatial: 1, editorial: 2, index: 3, projection: 4 }[targetMode] || 1;
    soundEngine.playModeSwitchTone(modeIndex);

    // Stop projection if leaving it
    if (this.currentView === 'projection') {
      this.pauseProjection();
    }

    this.currentView = targetMode;

    // Update buttons
    document.querySelectorAll('[data-view-mode]').forEach(btn => {
      const isCurrent = btn.getAttribute('data-view-mode') === targetMode;
      btn.classList.toggle('is-active', isCurrent);
      btn.setAttribute('aria-selected', isCurrent ? 'true' : 'false');
    });

    // Hide/Show containers
    if (this.spatialContainer) this.spatialContainer.style.display = targetMode === 'spatial' ? 'block' : 'none';
    if (this.editorialContainer) this.editorialContainer.style.display = targetMode === 'editorial' ? 'block' : 'none';
    if (this.indexContainer) this.indexContainer.style.display = targetMode === 'index' ? 'block' : 'none';
    if (this.projectionContainer) this.projectionContainer.style.display = targetMode === 'projection' ? 'flex' : 'none';

    // Start projection if entering it
    if (targetMode === 'projection') {
      this.renderProjectionSlide();
      this.startProjection();
    }

    // Scroll to top for page views
    if (targetMode === 'editorial' || targetMode === 'index') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Notify scroll engine of mode change
    scrollEngine.onModeChange(targetMode);
  }

  initFilterTriggers() {
    const filterPills = document.querySelectorAll('[data-filter-series]');
    filterPills.forEach(pill => {
      pill.addEventListener('click', (e) => {
        const targetPill = e.target.closest('[data-filter-series]');
        if (targetPill) {
          const series = targetPill.getAttribute('data-filter-series');
          this.setSeriesFilter(series);
        }
      });
    });
  }

  setSeriesFilter(series) {
    this.activeFilter = series;
    this.activeColorFilter = null;

    document.querySelectorAll('[data-filter-series]').forEach(pill => {
      pill.classList.toggle('is-active', pill.getAttribute('data-filter-series') === series);
    });

    this.applyFiltering();
  }

  setColorFilter(hexColor) {
    this.activeColorFilter = hexColor;
    this.applyFiltering();
  }

  setSearchQuery(query) {
    this.searchQuery = (query || '').toLowerCase().trim();
    this.applyFiltering();
  }

  applyFiltering() {
    const filteredIds = new Set();

    ARCHIVE_DATA.forEach(plate => {
      let matchesSeries = this.activeFilter === 'all' || plate.series === this.activeFilter;
      let matchesColor = !this.activeColorFilter || plate.palette.includes(this.activeColorFilter);
      let matchesSearch = true;

      if (this.searchQuery) {
        const searchCorpus = `${plate.title} ${plate.series} ${plate.location} ${plate.curatorialNote} ${plate.camera} ${plate.lens}`.toLowerCase();
        matchesSearch = searchCorpus.includes(this.searchQuery);
      }

      if (matchesSeries && matchesColor && matchesSearch) {
        filteredIds.add(plate.id);
      }
    });

    // Update Spatial Canvas Nodes
    document.querySelectorAll('.spatial-plate-node').forEach(node => {
      const id = node.getAttribute('data-plate-id');
      node.classList.toggle('is-filtered-out', !filteredIds.has(id));
    });

    // Update Editorial Cards
    document.querySelectorAll('.spread-card').forEach(card => {
      const id = card.getAttribute('data-plate-id');
      card.style.display = filteredIds.has(id) ? 'block' : 'none';
    });

    // Update Curator Table Rows
    document.querySelectorAll('.curator-table-row').forEach(row => {
      const id = row.getAttribute('data-plate-id');
      row.style.display = filteredIds.has(id) ? 'table-row' : 'none';
    });

    // Update count indicator in HUD
    const counterEl = document.getElementById('archive-count-indicator');
    if (counterEl) {
      counterEl.textContent = `${filteredIds.size} / 31 PLATES`;
    }

    // Refresh scroll animations
    scrollEngine.refresh();
  }

  /* ========================================================================
     PROJECTION MODE ENGINE
     ======================================================================== */

  initProjectionControls() {
    const playBtn = document.getElementById('projection-toggle-play');
    const nextBtn = document.getElementById('projection-next-btn');
    const prevBtn = document.getElementById('projection-prev-btn');

    if (playBtn) {
      playBtn.addEventListener('click', () => {
        this.isProjectionPlaying = !this.isProjectionPlaying;
        playBtn.innerHTML = this.isProjectionPlaying 
          ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`
          : `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;
        if (this.isProjectionPlaying) {
          this.startProjection();
        } else {
          this.pauseProjection();
        }
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => this.nextProjectionSlide());
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', () => this.prevProjectionSlide());
    }
  }

  startProjection() {
    this.pauseProjection();
    if (!this.isProjectionPlaying) return;

    let startTime = performance.now();
    const updateProgress = () => {
      if (!this.isProjectionPlaying || this.currentView !== 'projection') return;
      const elapsed = performance.now() - startTime;
      const pct = Math.min(100, (elapsed / this.projectionIntervalMs) * 100);

      if (this.projectionProgressBar) {
        this.projectionProgressBar.style.width = `${pct}%`;
      }

      if (elapsed >= this.projectionIntervalMs) {
        this.nextProjectionSlide();
        startTime = performance.now();
      }
      this.projectionTimer = requestAnimationFrame(updateProgress);
    };

    this.projectionTimer = requestAnimationFrame(updateProgress);
  }

  pauseProjection() {
    if (this.projectionTimer) {
      cancelAnimationFrame(this.projectionTimer);
      this.projectionTimer = null;
    }
    if (this.projectionProgressBar) {
      this.projectionProgressBar.style.width = '0%';
    }
  }

  nextProjectionSlide() {
    this.projectionIndex = (this.projectionIndex + 1) % ARCHIVE_DATA.length;
    this.renderProjectionSlide();
    if (this.isProjectionPlaying) this.startProjection();
  }

  prevProjectionSlide() {
    this.projectionIndex = (this.projectionIndex - 1 + ARCHIVE_DATA.length) % ARCHIVE_DATA.length;
    this.renderProjectionSlide();
    if (this.isProjectionPlaying) this.startProjection();
  }

  renderProjectionSlide() {
    const plate = ARCHIVE_DATA[this.projectionIndex];
    if (!plate) return;

    const imgEl = document.getElementById('projection-current-img');
    const titleEl = document.getElementById('projection-current-title');
    const specsEl = document.getElementById('projection-current-specs');
    const indexEl = document.getElementById('projection-current-counter');

    if (imgEl) {
      imgEl.src = plate.src;
      imgEl.alt = plate.altText;
    }
    if (titleEl) titleEl.textContent = plate.title;
    if (specsEl) specsEl.textContent = `${plate.location} • ${plate.camera} • ${plate.focalLength} • ${plate.aperture}`;
    if (indexEl) indexEl.textContent = `EXHIBITION SLIDE [${String(this.projectionIndex + 1).padStart(2, '0')}/31]`;

    // Dynamic aura shift in projection
    document.documentElement.style.setProperty('--aura-color-1', plate.dominantColor + '40');
    document.documentElement.style.setProperty('--aura-color-2', plate.secondaryColor + '25');
  }
}
