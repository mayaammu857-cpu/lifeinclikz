/**
 * LIFECYCLE PHOTOGRAPHIC ARCHIVE
 * Main Application Bootstrap & Curatorial Coordinator
 */

import { ARCHIVE_DATA, SERIES_CATEGORIES, STUDIO_METADATA } from '../data/archive-data.js';
import { soundEngine } from './audio-synthesizer.js';
import { SpatialPhysics } from './spatial-physics.js';
import { OpticalLoupe } from './optical-loupe.js';
import { ViewOrchestrator } from './view-orchestrator.js';
import { scrollEngine } from './scroll-animation-engine.js';

class LifecycleApp {
  constructor() {
    this.physics = null;
    this.loupe = null;
    this.orchestrator = null;
    this.activePlate = null;

    this.init();
  }

  init() {
    // 1. Initialize engines first
    this.initEngines();

    // 2. Render all plates into view DOMs
    this.renderSpatialCanvas();
    this.renderEditorialSpread();
    this.renderCuratorLedger();

    // 3. Bind global event listeners (keyboard, audio, cursor, drawers)
    this.initCursor();
    this.initTimecode();
    this.initGlobalShortcuts();
    this.initAudioHUD();
    this.initDrawers();
    this.initAccessibilityPreferences();

    console.log('LIFECYCLE Universe initialized with 31 photographic plates.');
  }

  /* ========================================================================
     VIEW RENDERING
     ======================================================================== */

  renderSpatialCanvas() {
    const worldEl = document.getElementById('spatial-world');
    const svgEl = document.getElementById('spatial-constellations');
    if (!worldEl) return;

    let nodesHtml = '';
    let svgPaths = '';

    ARCHIVE_DATA.forEach((plate, i) => {
      const { x, y } = plate.spatialCoords;
      const glowRgba = plate.dominantColor + '40';
      const accent = plate.accentColor;

      nodesHtml += `
        <article 
          class="spatial-plate-node" 
          id="node-${plate.id}"
          data-plate-id="${plate.id}"
          data-orientation="${plate.orientation}"
          style="left: ${x}px; top: ${y}px; --node-glow: ${glowRgba}; --node-accent: ${accent};"
          tabindex="0"
          role="button"
          aria-label="Inspect ${plate.title}, Plate ${plate.index} of 31"
        >
          <div class="spatial-node-aura"></div>
          <div class="spatial-plate-inner">
            <div class="spatial-thumb-box">
              <img src="${plate.src}" alt="${plate.altText}" loading="lazy" decoding="async">
            </div>
            <div class="spatial-node-meta">
              <span class="node-meta-index">[${String(plate.index).padStart(2, '0')}]</span>
              <span class="node-meta-title">${plate.title}</span>
              <span class="node-meta-tag">${plate.focalLength}</span>
            </div>
          </div>
        </article>
      `;

      // Connect constellation lines to nearby nodes in the same series
      if (i > 0) {
        const prevPlate = ARCHIVE_DATA[i - 1];
        if (prevPlate.series === plate.series) {
          const px = prevPlate.spatialCoords.x + 2800;
          const py = prevPlate.spatialCoords.y + 2400;
          const cx = x + 2800;
          const cy = y + 2400;
          svgPaths += `<path class="constellation-path" d="M ${px} ${py} L ${cx} ${cy}" />`;
        }
      }
    });

    worldEl.innerHTML = nodesHtml;
    if (svgEl) svgEl.innerHTML = svgPaths;

    // Node click/inspect listeners
    worldEl.querySelectorAll('.spatial-plate-node').forEach(node => {
      node.addEventListener('click', (e) => {
        if (this.physics && this.physics.hasMovedSignificantly) return;
        const id = node.getAttribute('data-plate-id');
        this.openInspection(id);
      });

      node.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const id = node.getAttribute('data-plate-id');
          this.openInspection(id);
        }
      });

      // Atmospheric aura on hover
      node.addEventListener('mouseenter', () => {
        const id = node.getAttribute('data-plate-id');
        const plate = ARCHIVE_DATA.find(p => p.id === id);
        if (plate) {
          document.documentElement.style.setProperty('--aura-color-1', plate.dominantColor + '50');
          document.documentElement.style.setProperty('--aura-color-2', plate.secondaryColor + '30');
          const cursorText = document.querySelector('.custom-cursor-text');
          if (cursorText) cursorText.textContent = `VIEW [${String(plate.index).padStart(2, '0')}]`;
          document.body.classList.add('cursor-inspect');
        }
      });

      node.addEventListener('mouseleave', () => {
        document.body.classList.remove('cursor-inspect');
      });
    });
  }

  renderEditorialSpread() {
    const container = document.getElementById('editorial-spread-container');
    if (!container) return;

    // Group plates by Chapter
    const chapters = [
      {
        id: "ch-1",
        title: "I. The Monolith & The Ice",
        plates: ARCHIVE_DATA.filter(p => p.chapter.startsWith("I")),
        quote: "“The ancient limestone does not bend to the cold. It waits, millions of years in silent communion with turquoise meltwater.”",
        citation: "LIFECYCLE FIELD JOURNAL • ALBERTA CORRIDOR"
      },
      {
        id: "ch-2",
        title: "II. Intimate Botany & Wildlife",
        plates: ARCHIVE_DATA.filter(p => p.chapter.startsWith("II")),
        quote: "“In the micro-architecture of the fern and the velvet crown of the elk, the forest speaks its oldest dialect.”",
        citation: "NOTES ON SUBALPINE FLORA & FAUNA"
      },
      {
        id: "ch-3",
        title: "III. Human Scale & Silence",
        plates: ARCHIVE_DATA.filter(p => p.chapter.startsWith("III")),
        quote: "“To stand miniature beneath the divide is not to feel diminished, but to feel awake.”",
        citation: "ESSAYS ON MOUNTAIN SOLITUDE"
      },
      {
        id: "ch-4",
        title: "IV. Tactile Devotion",
        plates: ARCHIVE_DATA.filter(p => p.chapter.startsWith("IV")),
        quote: "“The weight of crimson silk, the symmetry of platinum, the ancient blessing of henna inscribed upon open skin.”",
        citation: "CEREMONIAL ARCHIVES"
      },
      {
        id: "ch-5",
        title: "V. Optics & Process",
        plates: ARCHIVE_DATA.filter(p => p.chapter.startsWith("V")),
        quote: "“Glass, shutter, and light: the precise mechanical apparatus bridging vision and eternal form.”",
        citation: "THE ATELIER MANIFESTO"
      }
    ];

    // STICKY SCROLLYTELLING SEQUENCE: Images switch and transform as user scrolls
    const featuredPlates = ARCHIVE_DATA.slice(0, 5);
    let scrollySlidesHtml = '';
    let scrollyTimelineHtml = '';

    featuredPlates.forEach((plate, i) => {
      const isActive = i === 0 ? 'is-active' : '';
      scrollySlidesHtml += `
        <div 
          class="scrolly-slide-layer ${isActive}" 
          data-slide-index="${i}"
          data-plate-id="${plate.id}"
          data-title="${plate.title}"
          data-counter="PLATE [${String(plate.index).padStart(2, '0')} / 31]"
          data-specs="${plate.location} • ${plate.camera} • ${plate.focalLength} • ${plate.aperture}"
          tabindex="0"
          role="button"
          aria-label="Inspect ${plate.title}"
        >
          <img src="${plate.src}" alt="${plate.altText}" loading="eager">
        </div>
      `;

      scrollyTimelineHtml += `
        <div class="scrolly-timeline-segment ${isActive}" data-slide-index="${i}" role="button" aria-label="Jump to sequence slide ${i + 1}">
          <div class="scrolly-segment-fill"></div>
        </div>
      `;
    });

    const firstFeatured = featuredPlates[0];
    let html = `
      <!-- STICKY SCROLLYTELLING SHOWCASE: Images switch and transform on scroll -->
      <section class="scrolly-reel-container" id="scrolly-reel-container" aria-label="Interactive scroll-driven featured sequence">
        <div class="scrolly-reel-stage">
          <div class="scrolly-reel-header">
            <div class="scrolly-reel-badge">FEATURED CHRONICLE // SCROLL TO TRANSFORM</div>
            <div class="scrolly-scroll-indicator-hint">SCROLL DOWN TO CYCLE PLATES ↓</div>
          </div>

          <div class="scrolly-reel-viewport" id="scrolly-reel-viewport">
            ${scrollySlidesHtml}

            <div class="scrolly-plate-hud">
              <div class="scrolly-hud-left">
                <span class="scrolly-hud-counter" id="scrolly-active-counter">PLATE [${String(firstFeatured.index).padStart(2, '0')} / 31]</span>
                <h3 class="scrolly-hud-title" id="scrolly-active-title">${firstFeatured.title}</h3>
                <div class="scrolly-hud-specs" id="scrolly-active-specs">${firstFeatured.location} • ${firstFeatured.camera} • ${firstFeatured.focalLength} • ${firstFeatured.aperture}</div>
              </div>
            </div>
          </div>

          <div class="scrolly-timeline-bar" id="scrolly-timeline-bar" aria-label="Sequence timeline scrub">
            ${scrollyTimelineHtml}
          </div>
        </div>
      </section>
    `;

    chapters.forEach(ch => {
      html += `
        <section class="editorial-chapter" id="${ch.id}">
          <header class="editorial-chapter-header scroll-reveal">
            <span class="chapter-number">CHAPTER ARCHIVE</span>
            <h3 class="chapter-title">${ch.title}</h3>
            <div class="chapter-line-tracker"></div>
          </header>

          <div class="editorial-spread-grid">
      `;

      ch.plates.forEach((plate, idx) => {
        // Create rhythmic asymmetrical editorial layout
        let spanClass = 'span-6';
        let offsetClass = '';

        if (plate.orientation === 'landscape') {
          spanClass = idx % 3 === 0 ? 'span-12' : 'span-7';
        } else {
          spanClass = idx % 2 === 0 ? 'span-5' : 'span-6';
          if (idx % 2 !== 0) offsetClass = 'offset-1';
        }

        // Alternating varied animation archetypes ("maari maari varunna animations")
        const animTypes = [
          'anim-type-curtain',
          'anim-type-3d-flip',
          'anim-type-slide-left',
          'anim-type-lens-zoom',
          'anim-type-slide-right'
        ];
        const animClass = animTypes[idx % animTypes.length];
        const staggerClass = `stagger-${(idx % 3) + 1}`;

        html += `
          <article 
            class="spread-card scroll-reveal ${animClass} ${staggerClass} ${spanClass} ${offsetClass}" 
            data-plate-id="${plate.id}"
            tabindex="0"
            role="button"
            aria-label="View ${plate.title}, ${plate.location}"
          >
            <div class="editorial-photo-wrap">
              <img src="${plate.src}" alt="${plate.altText}" class="parallax-img" loading="lazy" decoding="async">
            </div>
            <div class="editorial-caption-block">
              <div class="caption-top-line">
                <span class="caption-plate-title">${plate.title}</span>
                <span>[${String(plate.index).padStart(2, '0')}]</span>
              </div>
              <p class="caption-prose">${plate.curatorialNote}</p>
              <div class="caption-tech-stamp">
                ${plate.location} • ${plate.camera} • ${plate.lens} (${plate.focalLength}, ${plate.aperture})
              </div>
            </div>
          </article>
        `;
      });

      if (ch.quote) {
        html += `
          <aside class="editorial-pull-quote scroll-reveal">
            <p>${ch.quote}</p>
            <cite>${ch.citation}</cite>
          </aside>
        `;
      }

      html += `
          </div>
        </section>
      `;
    });

    container.innerHTML = html;

    // Scrollytelling slide click listeners
    container.querySelectorAll('.scrolly-slide-layer').forEach(slide => {
      slide.addEventListener('click', () => {
        const id = slide.getAttribute('data-plate-id');
        this.openInspection(id);
      });
      slide.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const id = slide.getAttribute('data-plate-id');
          this.openInspection(id);
        }
      });
    });

    // Spread card click listeners
    container.querySelectorAll('.spread-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.getAttribute('data-plate-id');
        this.openInspection(id);
      });
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const id = card.getAttribute('data-plate-id');
          this.openInspection(id);
        }
      });
    });

    scrollEngine.refresh();
  }

  renderCuratorLedger() {
    const tbody = document.getElementById('curator-table-tbody');
    if (!tbody) return;

    let rowsHtml = '';
    ARCHIVE_DATA.forEach(plate => {
      const swatches = plate.palette.map(color => `
        <span class="swatch-dot" style="background-color: ${color};" title="${color}" data-color="${color}"></span>
      `).join('');

      rowsHtml += `
        <tr 
          class="curator-table-row scroll-reveal" 
          data-plate-id="${plate.id}"
          tabindex="0"
          role="button"
          aria-label="Inspect ${plate.title}"
        >
          <td class="col-plate-num">[${String(plate.index).padStart(2, '0')}]</td>
          <td class="col-thumbnail-mini">
            <img src="${plate.src}" alt="${plate.title}" class="mini-thumb-img" loading="lazy">
          </td>
          <td class="col-title-main">
            <div>${plate.title}</div>
            <div style="font-size: 0.7rem; color: var(--text-muted); font-weight: normal;">${plate.location}</div>
          </td>
          <td class="col-series-badge">
            <span class="series-badge-pill">${plate.series}</span>
          </td>
          <td class="col-palette-swatches">
            <div class="swatch-group">${swatches}</div>
          </td>
          <td class="col-technical-meta">
            ${plate.focalLength} • ${plate.aperture} • ${plate.shutterSpeed}
          </td>
          <td class="col-action-inspect">
            <span class="inspect-action-btn">INSPECT</span>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = rowsHtml;

    // Hover preview card logic
    const previewEl = document.getElementById('curator-hover-preview');
    const previewImg = document.getElementById('hover-preview-img');
    const previewTitle = document.getElementById('hover-preview-title');
    const previewMeta = document.getElementById('hover-preview-meta');

    tbody.querySelectorAll('.curator-table-row').forEach(row => {
      const id = row.getAttribute('data-plate-id');
      const plate = ARCHIVE_DATA.find(p => p.id === id);

      row.addEventListener('click', (e) => {
        // If clicking swatch, filter by color instead of open
        if (e.target.classList.contains('swatch-dot')) {
          const color = e.target.getAttribute('data-color');
          this.orchestrator.setColorFilter(color);
          return;
        }
        this.openInspection(id);
      });

      row.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.openInspection(id);
        }
      });

      row.addEventListener('mouseenter', (e) => {
        if (!previewEl || !plate || document.body.classList.contains('reduced-motion-active')) return;
        previewImg.src = plate.src;
        previewTitle.textContent = plate.title;
        previewMeta.textContent = `${plate.series} • ${plate.location}`;
        previewEl.classList.add('is-visible');
        this.updatePreviewPos(e, previewEl);
      });

      row.addEventListener('mousemove', (e) => {
        if (!previewEl || !previewEl.classList.contains('is-visible')) return;
        this.updatePreviewPos(e, previewEl);
      });

      row.addEventListener('mouseleave', () => {
        if (previewEl) previewEl.classList.remove('is-visible');
      });
    });

    // Search input
    const searchInput = document.getElementById('curator-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        if (this.orchestrator) {
          this.orchestrator.setSearchQuery(e.target.value);
        }
      });
    }

    scrollEngine.refresh();
  }

  updatePreviewPos(e, previewEl) {
    const x = Math.min(window.innerWidth - 240, e.clientX + 24);
    const y = Math.min(window.innerHeight - 340, Math.max(80, e.clientY - 140));
    previewEl.style.left = `${x}px`;
    previewEl.style.top = `${y}px`;
  }

  /* ========================================================================
     ENGINES INITIALIZATION
     ======================================================================== */

  initEngines() {
    // 1. Spatial Physics
    const viewport = document.getElementById('spatial-view-container') || document.getElementById('spatial-viewport');
    const world = document.getElementById('spatial-world');
    const minimap = document.getElementById('spatial-minimap');

    this.physics = new SpatialPhysics(viewport, world, minimap, (x, y, scale) => {
      // Find closest node to center
      const centerDistances = ARCHIVE_DATA.map(plate => {
        const dx = plate.spatialCoords.x - (-x);
        const dy = plate.spatialCoords.y - (-y);
        return { plate, dist: Math.hypot(dx, dy) };
      });
      centerDistances.sort((a, b) => a.dist - b.dist);
      const closest = centerDistances[0].plate;

      const coordsEl = document.getElementById('hud-current-coordinates');
      if (coordsEl && closest) {
        coordsEl.textContent = `${closest.coordinates} // ${closest.location.toUpperCase()}`;
      }
    });

    // 2. Optical Loupe
    const imageContainer = document.getElementById('inspection-image-container');
    const loupeEl = document.getElementById('optical-loupe');
    this.loupe = new OpticalLoupe(imageContainer, loupeEl);

    // 3. View Orchestrator
    this.orchestrator = new ViewOrchestrator({
      spatialContainer: document.getElementById('spatial-view-container'),
      editorialContainer: document.getElementById('editorial-view-container'),
      indexContainer: document.getElementById('index-view-container'),
      projectionContainer: document.getElementById('projection-view-container'),
      projectionProgressBar: document.getElementById('projection-progress-bar'),
      onPlateSelect: (id) => this.openInspection(id)
    });
  }

  /* ========================================================================
     INSPECTION MODAL & OPTICAL LOUPE WORKFLOW
     ======================================================================== */

  openInspection(plateId) {
    const plate = ARCHIVE_DATA.find(p => p.id === plateId);
    if (!plate) return;

    this.activePlate = plate;
    soundEngine.playShutterClick();

    const dialog = document.getElementById('inspection-dialog');
    const img = document.getElementById('inspection-large-img');
    const counter = document.getElementById('inspection-counter');
    const seriesPill = document.getElementById('inspection-series-pill');
    const title = document.getElementById('inspection-title');
    const essay = document.getElementById('inspection-essay');
    const specsCard = document.getElementById('inspection-specs');
    const paletteBars = document.getElementById('inspection-palette-bars');

    // Populate data
    img.src = plate.src;
    img.alt = plate.altText;
    counter.textContent = `PLATE [${String(plate.index).padStart(2, '0')} / 31]`;
    seriesPill.textContent = `${plate.series} // ${plate.chapter}`;
    title.textContent = plate.title;
    essay.textContent = `"${plate.curatorialNote}"`;

    // Specs
    specsCard.innerHTML = `
      <div class="spec-item">
        <span class="spec-label">Camera System</span>
        <span class="spec-value">${plate.camera}</span>
      </div>
      <div class="spec-item">
        <span class="spec-label">Optics</span>
        <span class="spec-value">${plate.lens}</span>
      </div>
      <div class="spec-item">
        <span class="spec-label">Focal & Aperture</span>
        <span class="spec-value">${plate.focalLength} • ${plate.aperture}</span>
      </div>
      <div class="spec-item">
        <span class="spec-label">Shutter & ISO</span>
        <span class="spec-value">${plate.shutterSpeed} • ${plate.iso}</span>
      </div>
      <div class="spec-item">
        <span class="spec-label">Coordinates</span>
        <span class="spec-value">${plate.coordinates}</span>
      </div>
      <div class="spec-item">
        <span class="spec-label">Location / Year</span>
        <span class="spec-value">${plate.location} • ${plate.year}</span>
      </div>
    `;

    // Palette Bars
    paletteBars.innerHTML = plate.palette.map(hex => `
      <div class="palette-bar-segment" style="background-color: ${hex};" data-color="${hex}">
        <span class="palette-hex-code">${hex}</span>
      </div>
    `).join('');

    paletteBars.querySelectorAll('.palette-bar-segment').forEach(seg => {
      seg.addEventListener('click', () => {
        const hex = seg.getAttribute('data-color');
        this.closeInspection();
        this.orchestrator.setColorFilter(hex);
      });
    });

    // Bind image to optical loupe
    if (this.loupe) {
      img.onload = () => {
        if (this.loupe) this.loupe.setImage(img);
      };
      if (img.complete) {
        this.loupe.setImage(img);
      }
    }

    // Dynamic aura shift
    document.documentElement.style.setProperty('--aura-color-1', plate.dominantColor + '55');
    document.documentElement.style.setProperty('--aura-color-2', plate.secondaryColor + '35');

    dialog.classList.add('is-open');
    dialog.setAttribute('open', '');
    if (typeof dialog.showModal === 'function' && !dialog.open) {
      try { dialog.showModal(); } catch (e) {}
    }
    document.body.style.overflow = 'hidden';
    dialog.setAttribute('aria-hidden', 'false');

    // Focus close button for accessibility
    const closeBtn = document.getElementById('inspection-close-btn');
    if (closeBtn) closeBtn.focus();
  }

  closeInspection() {
    const dialog = document.getElementById('inspection-dialog');
    if (!dialog) return;

    dialog.classList.remove('is-open');
    dialog.removeAttribute('open');
    if (typeof dialog.close === 'function' && dialog.open) {
      try { dialog.close(); } catch (e) {}
    }
    document.body.style.overflow = '';
    dialog.setAttribute('aria-hidden', 'true');
    soundEngine.playShutterClick();
  }

  stepInspection(delta) {
    if (!this.activePlate) return;
    const currentIndex = ARCHIVE_DATA.findIndex(p => p.id === this.activePlate.id);
    const nextIndex = (currentIndex + delta + ARCHIVE_DATA.length) % ARCHIVE_DATA.length;
    this.openInspection(ARCHIVE_DATA[nextIndex].id);
  }

  /* ========================================================================
     GLOBAL INTERFACE LISTENERS
     ======================================================================== */

  initCursor() {
    const cursor = document.getElementById('custom-cursor');
    if (!cursor) return;

    window.addEventListener('mousemove', (e) => {
      cursor.style.left = `${e.clientX}px`;
      cursor.style.top = `${e.clientY}px`;
    });
  }

  initTimecode() {
    const timecodeEl = document.getElementById('hud-live-timecode');
    const updateTime = () => {
      if (!timecodeEl) return;
      const now = new Date();
      const banffTime = now.toLocaleTimeString('en-US', {
        timeZone: 'America/Edmonton',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      const utcTime = now.toLocaleTimeString('en-US', {
        timeZone: 'UTC',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
      });
      timecodeEl.textContent = `BANFF ${banffTime} MST // UTC ${utcTime}`;
    };
    setInterval(updateTime, 1000);
    updateTime();
  }

  initGlobalShortcuts() {
    window.addEventListener('keydown', (e) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

      switch (e.key) {
        case 'Escape':
          this.closeInspection();
          this.closeDrawers();
          break;
        case '1':
          this.orchestrator.switchMode('spatial');
          break;
        case '2':
          this.orchestrator.switchMode('editorial');
          break;
        case '3':
          this.orchestrator.switchMode('index');
          break;
        case '4':
          this.orchestrator.switchMode('projection');
          break;
        case 'm':
        case 'M':
          this.toggleAudio();
          break;
        case 'ArrowRight':
          if (document.getElementById('inspection-dialog').classList.contains('is-open')) {
            this.stepInspection(1);
          } else if (this.orchestrator.currentView === 'projection') {
            this.orchestrator.nextProjectionSlide();
          }
          break;
        case 'ArrowLeft':
          if (document.getElementById('inspection-dialog').classList.contains('is-open')) {
            this.stepInspection(-1);
          } else if (this.orchestrator.currentView === 'projection') {
            this.orchestrator.prevProjectionSlide();
          }
          break;
      }
    });

    // Pager buttons in modal
    const prevBtn = document.getElementById('inspection-prev-plate');
    const nextBtn = document.getElementById('inspection-next-plate');
    const closeBtn = document.getElementById('inspection-close-btn');

    if (prevBtn) prevBtn.addEventListener('click', () => this.stepInspection(-1));
    if (nextBtn) nextBtn.addEventListener('click', () => this.stepInspection(1));
    if (closeBtn) closeBtn.addEventListener('click', () => this.closeInspection());
  }

  initAudioHUD() {
    const audioBtn = document.getElementById('hud-sound-toggle');
    if (!audioBtn) return;

    audioBtn.addEventListener('click', () => this.toggleAudio());
  }

  toggleAudio() {
    const isUnmuted = soundEngine.toggleMute();
    const audioBtn = document.getElementById('hud-sound-toggle');
    if (!audioBtn) return;

    audioBtn.classList.toggle('is-active', isUnmuted);
    audioBtn.setAttribute('aria-pressed', isUnmuted ? 'true' : 'false');
    const textSpan = audioBtn.querySelector('.sound-status-text');
    if (textSpan) {
      textSpan.textContent = isUnmuted ? 'SOUND: ON' : 'SOUND: OFF';
    }
  }

  initDrawers() {
    const aboutBtn = document.getElementById('hud-about-btn');
    const studioDrawerBackdrop = document.getElementById('studio-drawer-backdrop');
    const drawerCloseBtn = document.getElementById('studio-drawer-close');
    const inquireBtnModal = document.getElementById('inspection-inquire-btn');
    const inquiryForm = document.getElementById('commercial-inquiry-form');

    if (aboutBtn && studioDrawerBackdrop) {
      aboutBtn.addEventListener('click', () => {
        studioDrawerBackdrop.classList.add('is-open');
        document.body.style.overflow = 'hidden';
      });
    }

    if (drawerCloseBtn && studioDrawerBackdrop) {
      drawerCloseBtn.addEventListener('click', () => this.closeDrawers());
    }

    if (studioDrawerBackdrop) {
      studioDrawerBackdrop.addEventListener('click', (e) => {
        if (e.target === studioDrawerBackdrop) this.closeDrawers();
      });
    }

    if (inquireBtnModal && studioDrawerBackdrop) {
      inquireBtnModal.addEventListener('click', () => {
        this.closeInspection();
        studioDrawerBackdrop.classList.add('is-open');
        document.body.style.overflow = 'hidden';
        const licenseInput = document.getElementById('inquiry-work-reference');
        if (licenseInput && this.activePlate) {
          licenseInput.value = `Plate [${String(this.activePlate.index).padStart(2, '0')}] "${this.activePlate.title}"`;
        }
      });
    }

    if (inquiryForm) {
      inquiryForm.addEventListener('submit', (e) => {
        e.preventDefault();
        soundEngine.playShutterClick();
        const submitBtn = inquiryForm.querySelector('.form-submit-btn');
        if (submitBtn) {
          submitBtn.textContent = 'TRANSMITTED TO STUDIO ✓';
          submitBtn.style.background = '#4cd964';
          submitBtn.style.color = '#000';
          setTimeout(() => {
            this.closeDrawers();
            submitBtn.textContent = 'TRANSMIT INQUIRY';
            submitBtn.style.background = '';
            submitBtn.style.color = '';
            inquiryForm.reset();
          }, 1800);
        }
      });
    }
  }

  closeDrawers() {
    const studioDrawerBackdrop = document.getElementById('studio-drawer-backdrop');
    if (studioDrawerBackdrop) {
      studioDrawerBackdrop.classList.remove('is-open');
      document.body.style.overflow = '';
    }
  }

  initAccessibilityPreferences() {
    // Reduced motion media query listener
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const applyReducedMotion = (matches) => {
      document.body.classList.toggle('reduced-motion-active', matches);
      const motionToggleBtn = document.getElementById('hud-reduced-motion-toggle');
      if (motionToggleBtn) {
        motionToggleBtn.classList.toggle('is-active', matches);
        motionToggleBtn.setAttribute('aria-pressed', matches ? 'true' : 'false');
      }
      // If reduced motion is active, switch to editorial mode
      if (matches && this.orchestrator && this.orchestrator.currentView === 'spatial') {
        this.orchestrator.switchMode('editorial');
      }
    };

    motionQuery.addEventListener('change', (e) => applyReducedMotion(e.matches));
    applyReducedMotion(motionQuery.matches);

    // Manual reduced motion toggle in HUD
    const motionToggleBtn = document.getElementById('hud-reduced-motion-toggle');
    if (motionToggleBtn) {
      motionToggleBtn.addEventListener('click', () => {
        const isNowActive = !document.body.classList.contains('reduced-motion-active');
        applyReducedMotion(isNowActive);
      });
    }
  }
}

// Instantiate on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.__lifecycleApp = new LifecycleApp();
});
