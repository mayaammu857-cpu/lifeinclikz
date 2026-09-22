/**
 * LIFE IN CLICKS — Luxury Editorial Wedding Photography
 * Interactive Engine: GSAP ScrollTrigger, Camera Craft & Audio Synthesis
 */

(function () {
  'use strict';

  /* ==========================================================================
     0. Lenis Inertial Smooth Scroll Engine
     ========================================================================== */
  let lenisInstance = null;

  const initLenisSmoothScroll = () => {
    if (typeof Lenis === 'undefined') return;

    try {
      lenisInstance = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Luxurious exponential decay
        direction: 'vertical',
        gestureDirection: 'vertical',
        smooth: true,
        mouseMultiplier: 0.95,
        smoothTouch: false,
        touchMultiplier: 1.5,
      });

      // Synchronize Lenis with GSAP ScrollTrigger
      lenisInstance.on('scroll', ScrollTrigger.update);

      gsap.ticker.add((time) => {
        lenisInstance.raf(time * 1000);
      });

      // Disable GSAP lag smoothing to guarantee zero jitter
      gsap.ticker.lagSmoothing(0);

      // Smooth anchor navigation
      document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
        anchor.addEventListener('click', (e) => {
          const targetId = anchor.getAttribute('href');
          if (targetId && targetId !== '#') {
            const targetEl = document.querySelector(targetId) || (targetId === '#hero' ? document.getElementById('camera-scroll-section') : null);
            if (targetEl) {
              e.preventDefault();
              lenisInstance.scrollTo(targetEl, { offset: 0, duration: 1.3 });
            }
          }
        });
      });
    } catch (err) {
      console.warn('Lenis init notice:', err);
    }
  };

  /* ==========================================================================
     1. Web Audio API — Mechanical Shutter Sound Synthesizer & Optical Bling
     ========================================================================== */
  class CameraAudioEngine {
    constructor() {
      this.ctx = null;
      this.isMuted = false;
      this.isInitialized = false;
    }

    init() {
      if (this.ctx) return;
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;
        this.ctx = new AudioContextClass();
        this.isInitialized = true;
      } catch (e) {
        console.warn('Web Audio API initialization notice:', e);
      }
    }

    unlock() {
      this.init();
      if (this.ctx && this.ctx.state === 'suspended') {
        return this.ctx.resume().catch(() => {});
      }
      return Promise.resolve();
    }

    playShutterClick() {
      if (this.isMuted) return;
      this.init();
      if (!this.ctx) return;

      if (this.ctx.state === 'suspended') {
        this.ctx.resume().then(() => {
          this._renderShutterSound();
        }).catch((err) => {
          console.warn('Audio resume deferred until user gesture:', err);
        });
        return;
      }

      this._renderShutterSound();
    }

    playFocusBeep() {
      if (this.isMuted) return;
      this.init();
      if (!this.ctx) return;

      if (this.ctx.state === 'suspended') {
        this.ctx.resume().then(() => {
          this._renderFocusBeep();
        }).catch(() => {});
        return;
      }

      this._renderFocusBeep();
    }

    _renderShutterSound() {
      if (!this.ctx || this.ctx.state !== 'running') return;
      const now = this.ctx.currentTime + 0.005;

      const master = this.ctx.createGain();
      master.gain.setValueAtTime(0.85, now);
      master.connect(this.ctx.destination);

      // 1. Mirror-up & Front Curtain Snap (transient mechanical click)
      this._createCurtainSnap(now, 2900, 0.032, 0.7, master);
      this._createMechanicalThump(now, 175, 45, 0.045, 0.65, master);

      // 2. Rear Curtain Travel & Latch (42ms later)
      this._createCurtainSnap(now + 0.042, 2200, 0.038, 0.6, master);
      this._createMechanicalThump(now + 0.042, 130, 40, 0.05, 0.55, master);

      // 3. Signature Optical "Bling" Crystal Chime (65ms later)
      // Dual harmonic acoustic chime (A6: 1760Hz & E7: 2637Hz) with lush crystal decay
      this._createBlingChime(now + 0.065, 1760, 2637, 0.32, 0.35, master);
    }

    _renderFocusBeep() {
      if (!this.ctx || this.ctx.state !== 'running') return;
      const now = this.ctx.currentTime + 0.005;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1760, now);
      osc.frequency.setValueAtTime(2200, now + 0.04);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.12);
    }

    _createCurtainSnap(time, freq, duration, volume, destination) {
      const bufferSize = Math.max(256, Math.floor(this.ctx.sampleRate * duration));
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);

      // High-frequency burst noise
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.28));
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(freq, time);
      filter.Q.setValueAtTime(3.5, time);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(volume, time);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(destination);

      noise.start(time);
      noise.stop(time + duration);
    }

    _createMechanicalThump(time, startFreq, endFreq, duration, volume, destination) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(startFreq, time);
      osc.frequency.exponentialRampToValueAtTime(endFreq, time + duration);

      gain.gain.setValueAtTime(volume, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

      osc.connect(gain);
      gain.connect(destination);

      osc.start(time);
      osc.stop(time + duration);
    }

    _createBlingChime(time, freq1, freq2, duration, volume, destination) {
      [freq1, freq2].forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);

        const v = volume * (idx === 0 ? 1.0 : 0.6);
        gain.gain.setValueAtTime(v, time);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

        osc.connect(gain);
        gain.connect(destination);

        osc.start(time);
        osc.stop(time + duration);
      });
    }

    toggleMute() {
      this.isMuted = !this.isMuted;
      return this.isMuted;
    }
  }

  const soundEngine = new CameraAudioEngine();

  // Universal user gesture activation to unlock Web Audio in all browsers
  const unlockAudioOnGesture = () => {
    soundEngine.unlock();
  };
  ['click', 'pointerdown', 'touchstart', 'keydown', 'wheel'].forEach((evt) => {
    window.addEventListener(evt, unlockAudioOnGesture, { passive: true });
  });

  /* ==========================================================================
     2. Custom Camera Focus Reticle Cursor
     ========================================================================== */
  const initCustomCursor = () => {
    const cursor = document.getElementById('custom-cursor');
    if (!cursor) return;

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let cursorX = mouseX;
    let cursorY = mouseY;

    window.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    });

    const animateCursor = () => {
      const dx = mouseX - cursorX;
      const dy = mouseY - cursorY;
      cursorX += dx * 0.18;
      cursorY += dy * 0.18;

      cursor.style.transform = `translate3d(${cursorX}px, ${cursorY}px, 0) translate(-50%, -50%)`;
      requestAnimationFrame(animateCursor);
    };
    requestAnimationFrame(animateCursor);

    // Hover interactive elements
    const interactiveElements = document.querySelectorAll(
      'a, button, input, select, textarea, .btn-magnetic, .story-img-container, .archival-print, .interactive-hover'
    );

    interactiveElements.forEach((el) => {
      el.addEventListener('mouseenter', () => cursor.classList.add('cursor-hover'));
      el.addEventListener('mouseleave', () => cursor.classList.remove('cursor-hover'));
    });

    window.addEventListener('mousedown', () => cursor.classList.add('cursor-click'));
    window.addEventListener('mouseup', () => cursor.classList.remove('cursor-click'));
  };

  /* ==========================================================================
     3. Magnetic Buttons Physics
     ========================================================================== */
  const initMagneticButtons = () => {
    const magneticBtns = document.querySelectorAll('.btn-magnetic');
    magneticBtns.forEach((btn) => {
      btn.addEventListener('mousemove', (e) => {
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        gsap.to(btn, {
          x: x * 0.35,
          y: y * 0.35,
          duration: 0.3,
          ease: 'power2.out'
        });
      });

      btn.addEventListener('mouseleave', () => {
        gsap.to(btn, {
          x: 0,
          y: 0,
          duration: 0.5,
          ease: 'elastic.out(1, 0.3)'
        });
      });
    });
  };

  /* ==========================================================================
     4. Shutter Click Flash & Aperture Action
     ========================================================================== */
  const triggerCameraClick = () => {
    soundEngine.playShutterClick();

    // Visual Flash
    const flash = document.getElementById('shutter-flash');
    if (flash) {
      gsap.fromTo(
        flash,
        { opacity: 0.95 },
        { opacity: 0, duration: 0.45, ease: 'power2.out' }
      );
    }

    // Iris aperture contraction and snap
    const iris = document.getElementById('aperture-iris');
    if (iris) {
      gsap.timeline()
        .to(iris, { scale: 0.25, rotate: 45, duration: 0.08, ease: 'power2.in' })
        .to(iris, { scale: 1, rotate: 0, duration: 0.28, ease: 'elastic.out(1, 0.4)' });
    }

    // Shutter button mechanical dip
    const shutterBtn = document.getElementById('camera-shutter-button');
    if (shutterBtn) {
      gsap.timeline()
        .to(shutterBtn, { y: 4, duration: 0.06 })
        .to(shutterBtn, { y: 0, duration: 0.18, ease: 'back.out(2)' });
    }
  };

  /* ==========================================================================
     5. Hero Ambient Slideshow with "Bling" Shutter Flash & Natural Scroll
     ========================================================================== */
  const initHeroSlideshow = () => {
    const slides = document.querySelectorAll('.hero-slide');
    const dots = document.querySelectorAll('.hero-dot');
    const counter = document.getElementById('hero-slide-counter');
    const blingFlash = document.getElementById('hero-bling-flash');
    const prevBtn = document.getElementById('hero-prev-btn');
    const nextBtn = document.getElementById('hero-next-btn');
    const heroSection = document.getElementById('camera-scroll-section');
    const heroContent = document.getElementById('hero-main-content');

    if (!slides.length) return;

    let currentIndex = 0;
    let slideTimer = null;
    const totalSlides = slides.length;

    // Trigger optical "bling" flash + shutter sound ONLY on demand (scroll to hero section)
    let lastBlingTime = 0;
    const triggerHeroBling = () => {
      const now = Date.now();
      // Minimum 1.2s cooldown to avoid spamming / rapid repeated firing
      if (now - lastBlingTime < 1200) return;
      lastBlingTime = now;

      // 1. Shutter sound with metallic spring ring
      if (soundEngine && soundEngine.playShutterClick) {
        soundEngine.playShutterClick();
      }

      // 2. Optical "bling" flash effect on hero image
      if (blingFlash) {
        blingFlash.classList.remove('bling-active');
        void blingFlash.offsetWidth; // Force DOM reflow to re-trigger CSS animation
        blingFlash.classList.add('bling-active');
      }

      // 3. Global optical shutter flash pulse
      const globalFlash = document.getElementById('shutter-flash');
      if (globalFlash && window.gsap) {
        gsap.fromTo(
          globalFlash,
          { opacity: 0.45 },
          { opacity: 0, duration: 0.35, ease: 'power2.out' }
        );
      }
    };

    // Smooth silent crossfade slides (no continuous bling sound on timer)
    const goToSlide = (newIndex) => {
      if (newIndex === currentIndex) return;
      const prevIndex = currentIndex;
      currentIndex = (newIndex + totalSlides) % totalSlides;

      // Smooth crossfade slides silently
      slides[prevIndex].classList.remove('active');
      slides[currentIndex].classList.add('active');

      // Update numerical counter & dots
      if (counter) {
        counter.textContent = `${String(currentIndex + 1).padStart(2, '0')} / ${String(totalSlides).padStart(2, '0')}`;
      }

      dots.forEach((dot, idx) => {
        if (idx === currentIndex) {
          dot.classList.add('active', 'w-6', 'bg-muted-gold');
          dot.classList.remove('w-2', 'bg-warm-ivory/30');
        } else {
          dot.classList.remove('active', 'w-6', 'bg-muted-gold');
          dot.classList.add('w-2', 'bg-warm-ivory/30');
        }
      });
    };

    const nextSlide = () => goToSlide(currentIndex + 1);
    const prevSlide = () => goToSlide(currentIndex - 1);

    // Auto-advance every 5.5 seconds - COMPLETELY SILENT (Zero continuous bling sound)
    const startTimer = () => {
      stopTimer();
      slideTimer = setInterval(nextSlide, 5500);
    };

    const stopTimer = () => {
      if (slideTimer) clearInterval(slideTimer);
    };

    startTimer();

    // Arrow navigation (silent, smooth slide transitions)
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        nextSlide();
        startTimer();
      });
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        prevSlide();
        startTimer();
      });
    }

    // Dot indicators navigation
    dots.forEach((dot) => {
      dot.addEventListener('click', () => {
        const targetIdx = parseInt(dot.getAttribute('data-index'), 10);
        if (!isNaN(targetIdx)) {
          goToSlide(targetIdx);
          startTimer();
        }
      });
    });

    // Clean, natural unpinned scroll & Hero Scroll Audio Trigger
    if (heroSection && window.gsap && window.ScrollTrigger) {
      if (heroContent) {
        gsap.to(heroContent, {
          opacity: 0,
          y: -60,
          ease: 'power1.out',
          scrollTrigger: {
            trigger: heroSection,
            start: 'top top',
            end: 'bottom 40%',
            scrub: true
          }
        });
      }

      // Trigger bling sound ONLY when scrolling back into the hero section
      ScrollTrigger.create({
        trigger: heroSection,
        start: 'top top',
        end: 'bottom 20%',
        onEnterBack: () => {
          triggerHeroBling();
        }
      });
    }

    // Dual-check for scroll into hero section (handles Lenis smooth scroll & native touch/wheel)
    let hasScrolledPastHero = false;
    let initialHeroScrollDone = false;

    const handleHeroScrollAudio = (scrollPosition) => {
      const scrollY = typeof scrollPosition === 'number'
        ? scrollPosition
        : (window.scrollY || document.documentElement.scrollTop || 0);
      const heroHeight = heroSection ? (heroSection.offsetHeight || window.innerHeight) : window.innerHeight;

      if (scrollY > heroHeight * 0.45) {
        hasScrolledPastHero = true;
      } else if (hasScrolledPastHero && scrollY <= heroHeight * 0.35) {
        // Scrolled back up into hero section
        hasScrolledPastHero = false;
        triggerHeroBling();
      } else if (!initialHeroScrollDone && scrollY > 20 && scrollY < heroHeight * 0.4) {
        // Initial user scroll within hero section
        initialHeroScrollDone = true;
        triggerHeroBling();
      }
    };

    window.addEventListener('scroll', () => handleHeroScrollAudio(), { passive: true });
    if (typeof lenisInstance !== 'undefined' && lenisInstance) {
      lenisInstance.on('scroll', (e) => handleHeroScrollAudio(e.scroll));
    }
  };

  const initScrollStoryTimeline = initHeroSlideshow;


  /* ==========================================================================
     6. Story Chapter Parallax & Reveal Animations
     ========================================================================== */
  const initStoryGalleryScroll = () => {
    const chapters = document.querySelectorAll('.story-chapter-card');
    chapters.forEach((chapter) => {
      const container = chapter.querySelector('.story-img-container');
      const img = chapter.querySelector('.story-img');
      const textGroup = chapter.querySelector('.story-text-group');

      // 1. Chapter card entrance on scroll
      gsap.fromTo(
        chapter,
        { opacity: 0, y: 80 },
        {
          opacity: 1,
          y: 0,
          duration: 1.2,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: chapter,
            start: 'top 82%',
            toggleActions: 'play none none reverse'
          }
        }
      );

      // 2. Cinematic curtain clip-path reveal on image container
      if (container) {
        gsap.fromTo(
          container,
          { clipPath: 'inset(100% 0% 0% 0%)' },
          {
            clipPath: 'inset(0% 0% 0% 0%)',
            duration: 1.3,
            ease: 'power4.inOut',
            scrollTrigger: {
              trigger: chapter,
              start: 'top 78%',
              toggleActions: 'play none none reverse'
            }
          }
        );
      }

      // 3. Gentle inner-image vertical parallax scrub with top edge anchored
      if (img) {
        gsap.fromTo(
          img,
          { yPercent: 0, scale: 1.05, transformOrigin: 'top center' },
          {
            yPercent: 4,
            scale: 1.0,
            transformOrigin: 'top center',
            ease: 'none',
            scrollTrigger: {
              trigger: chapter,
              start: 'top bottom',
              end: 'bottom top',
              scrub: 1.2
            }
          }
        );
      }

      // 4. Staggered text & telemetry entrance on scroll
      if (textGroup) {
        const textElements = Array.from(textGroup.children);
        gsap.fromTo(
          textElements,
          { opacity: 0, y: 30 },
          {
            opacity: 1,
            y: 0,
            duration: 0.75,
            stagger: 0.08,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: chapter,
              start: 'top 78%',
              toggleActions: 'play none none reverse'
            }
          }
        );
      }
    });

    // Manifesto Typography Reveal
    const manifesto = document.getElementById('manifesto-quote');
    if (manifesto) {
      gsap.fromTo(
        manifesto,
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration: 1.4,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: manifesto,
            start: 'top 78%'
          }
        }
      );
    }
  };

  /* ==========================================================================
     7. Viewfinder Telemetry Clock & Metadata
     ========================================================================== */
  const initViewfinderClock = () => {
    const timeDisplay = document.getElementById('viewfinder-timecode');
    if (!timeDisplay) return;

    const updateTime = () => {
      const d = new Date();
      const h = String(d.getHours()).padStart(2, '0');
      const m = String(d.getMinutes()).padStart(2, '0');
      const s = String(d.getSeconds()).padStart(2, '0');
      const f = String(Math.floor(d.getMilliseconds() / 40)).padStart(2, '0');
      timeDisplay.innerText = `${h}:${m}:${s}:${f}`;
    };

    setInterval(updateTime, 40);
  };

  /* ==========================================================================
     8. Mobile Navigation Glassmorphism Drawer
     ========================================================================== */
  const initMobileNav = () => {
    const hamburger = document.getElementById('nav-hamburger-btn');
    const closeBtn = document.getElementById('mobile-drawer-close');
    const drawer = document.getElementById('mobile-nav-drawer');
    const links = document.querySelectorAll('.mobile-drawer-link');

    if (!hamburger || !drawer) return;

    const openDrawer = () => {
      drawer.classList.remove('pointer-events-none', 'opacity-0');
      drawer.classList.add('pointer-events-auto', 'opacity-100');
      gsap.fromTo(
        drawer.querySelector('.drawer-inner'),
        { x: '100%' },
        { x: '0%', duration: 0.5, ease: 'power3.out' }
      );
      gsap.fromTo(
        links,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.06, delay: 0.2, ease: 'power2.out' }
      );
    };

    const closeDrawer = () => {
      gsap.to(drawer.querySelector('.drawer-inner'), {
        x: '100%',
        duration: 0.4,
        ease: 'power3.in',
        onComplete: () => {
          drawer.classList.add('pointer-events-none', 'opacity-0');
          drawer.classList.remove('pointer-events-auto', 'opacity-100');
        }
      });
    };

    hamburger.addEventListener('click', openDrawer);
    if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
    links.forEach((l) => l.addEventListener('click', closeDrawer));
  };

  /* ==========================================================================
     9. Audio Toggle Button
     ========================================================================== */
  const initAudioToggle = () => {
    const btn = document.getElementById('sound-toggle-btn');
    const statusText = document.getElementById('sound-status-text');
    const iconWaves = document.getElementById('sound-icon-waves');

    if (!btn) return;

    btn.addEventListener('click', () => {
      soundEngine.init();
      const isMuted = soundEngine.toggleMute();
      if (statusText) statusText.innerText = isMuted ? 'AUDIO OFF' : 'AUDIO ON';
      if (iconWaves) {
        iconWaves.style.opacity = isMuted ? '0.2' : '1';
      }
      if (!isMuted) {
        soundEngine.playShutterClick();
      }
    });
  };

  /* ==========================================================================
     10. "BOOK YOUR DATE" & Customer Dealing Concierge
     ========================================================================== */
  const STUDIO_WHATSAPP_NUMBER = '18257345178'; // Studio Concierge WhatsApp (+1 825-734-5178)

  const buildWhatsAppDealUrl = (details = {}) => {
    const text = 
      `Hello LIFE IN CLICKS Studio! 📸✨\n\n` +
      `I would like to inquire about booking my event:\n` +
      `• Names: ${details.name || 'Client'}\n` +
      `• Event: ${details.eventType || 'Wedding & Celebration'}\n` +
      `• Date: ${details.date || 'Upcoming 2025/2026'}\n` +
      `• Venue / City: ${details.venue || 'Banff, Alberta'}\n` +
      `• Desired Package: ${details.package || 'Royal Bespoke Archive'}\n` +
      (details.notes ? `• Special Vision: ${details.notes}\n` : '') +
      `\nCould you please share your availability and quote details?`;
    return `https://wa.me/${STUDIO_WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
  };

  const saveInquiryDualLayer = (inquiry) => {
    // 1. LocalStorage (100% reliable on Netlify & offline)
    try {
      const stored = JSON.parse(localStorage.getItem('lifecycle_inquiries') || '[]');
      stored.unshift(inquiry);
      localStorage.setItem('lifecycle_inquiries', JSON.stringify(stored));
    } catch (e) {
      console.warn('LocalStorage save warning:', e);
    }

    // 2. Node.js backend API (if running locally or hosted on Render/Railway)
    fetch('/api/admin/inquiries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inquiry)
    }).catch(() => {
      // Quiet fallback for static hosts
    });
  };

  const initBookingModal = () => {
    const openBtns = document.querySelectorAll('.trigger-booking-modal');
    const modal = document.getElementById('booking-modal');
    const closeBtn = document.getElementById('booking-modal-close');
    const form = document.getElementById('booking-form');
    const whatsappModalBtn = document.getElementById('btn-whatsapp-deal-modal');
    const quickWhatsAppFloat = document.getElementById('quick-deal-whatsapp-btn');

    if (!modal) return;

    const openModal = () => {
      modal.classList.remove('pointer-events-none', 'opacity-0');
      modal.classList.add('pointer-events-auto', 'opacity-100');
      gsap.fromTo(
        modal.querySelector('.modal-card'),
        { scale: 0.9, y: 30, opacity: 0 },
        { scale: 1, y: 0, opacity: 1, duration: 0.45, ease: 'power3.out' }
      );
      soundEngine.playFocusBeep();
    };

    const closeModal = () => {
      gsap.to(modal.querySelector('.modal-card'), {
        scale: 0.95,
        y: 20,
        opacity: 0,
        duration: 0.3,
        ease: 'power2.in',
        onComplete: () => {
          modal.classList.add('pointer-events-none', 'opacity-0');
          modal.classList.remove('pointer-events-auto', 'opacity-100');
        }
      });
    };

    openBtns.forEach((b) => b.addEventListener('click', (e) => {
      e.preventDefault();
      openModal();
    }));

    if (closeBtn) closeBtn.addEventListener('click', closeModal);

    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    // Helper to read form fields
    const getFormData = () => {
      if (!form) return {};
      const couple = form.elements['couple-names']?.value || 'Couple';
      const date = form.elements['wedding-date']?.value || '';
      const email = form.elements['email']?.value || '';
      const phone = form.elements['phone']?.value || '';
      const eventType = form.elements['event-type']?.value || 'Wedding & Reception';
      const pkg = form.elements['curatorial-package']?.value || 'Royal Bespoke Archive ($6,800)';
      const venue = form.elements['wedding-venue']?.value || 'Banff, Alberta';
      const vision = form.elements['vision']?.value || '';

      let quoteAmount = 0;
      if (pkg.includes('6,800')) quoteAmount = 6800;
      else if (pkg.includes('4,500')) quoteAmount = 4500;
      else if (pkg.includes('3,200')) quoteAmount = 3200;

      return {
        name: couple,
        date,
        email,
        phone,
        eventType,
        package: pkg,
        quoteAmount,
        venue,
        notes: vision
      };
    };

    // 1. Submit form via inquiry database
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        soundEngine.playShutterClick();
        const data = getFormData();

        const newDeal = {
          id: 'deal_' + Date.now(),
          ...data,
          status: 'New Inquiry',
          createdAt: new Date().toISOString(),
          source: 'Website Booking Form'
        };

        saveInquiryDualLayer(newDeal);

        const submitBtn = document.getElementById('btn-submit-inquiry') || form.querySelector('button[type="submit"]');
        if (submitBtn) {
          submitBtn.innerHTML = `
            <span class="inline-block w-4 h-4 border-2 border-charcoal border-t-transparent rounded-full animate-spin mr-2"></span>
            SAVING COMMISSION INQUIRY...
          `;
          setTimeout(() => {
            submitBtn.innerText = '✓ INQUIRY RECEIVED — CONCIERGE WILL CONNECT IN 24H';
            submitBtn.classList.remove('bg-muted-gold');
            submitBtn.classList.add('bg-emerald-400');
            setTimeout(() => {
              closeModal();
              submitBtn.innerText = 'SUBMIT PRIVATE INQUIRY';
              submitBtn.classList.remove('bg-emerald-400');
              submitBtn.classList.add('bg-muted-gold');
              form.reset();
            }, 2000);
          }, 900);
        }
      });
    }

    // 2. Direct WhatsApp Customer Dealing from inside modal
    if (whatsappModalBtn) {
      whatsappModalBtn.addEventListener('click', () => {
        soundEngine.playFocusBeep();
        const data = getFormData();
        const dealUrl = buildWhatsAppDealUrl(data);

        // Also save to CRM as "In Discussion"
        if (data.name && data.name !== 'Couple') {
          const newDeal = {
            id: 'deal_' + Date.now(),
            ...data,
            status: 'In Discussion',
            createdAt: new Date().toISOString(),
            source: 'Modal WhatsApp Dealing'
          };
          saveInquiryDualLayer(newDeal);
        }

        window.open(dealUrl, '_blank');
      });
    }

    // 3. Quick Float WhatsApp Dealing button (bottom left)
    if (quickWhatsAppFloat) {
      quickWhatsAppFloat.addEventListener('click', () => {
        soundEngine.playFocusBeep();
        const quickUrl = buildWhatsAppDealUrl({
          name: 'Prospective Client',
          venue: 'Banff / Canadian Rockies'
        });
        window.open(quickUrl, '_blank');
      });
    }
  };

  /* ==========================================================================
     11. Scroll Progress Bar
     ========================================================================== */
  const initScrollProgressBar = () => {
    const bar = document.getElementById('scroll-progress-bar');
    if (!bar) return;

    window.addEventListener('scroll', () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const progress = (scrollTop / height) * 100;
      bar.style.width = `${progress}%`;
    }, { passive: true });
  };

  /* ==========================================================================
     12. Interactive Camera Direct Click Feature
     ========================================================================== */
  const initInteractiveCameraDirectClick = () => {
    const cam = document.getElementById('hero-camera-container');
    if (!cam) return;

    cam.addEventListener('click', () => {
      triggerCameraClick();
    });
  };

  /* ==========================================================================
     13. Complete 81-Plate Visual Archive & Kinetic Filmstrip Engine
     ========================================================================== */
  let globalPlatesData = [];
  let currentLightboxIndex = 0;

  const initComplete81PlateArchive = async () => {
    // 1. Check synchronous preloaded dataset for 100% file:/// and offline compatibility
    if (window.ALL_81_PLATES && Array.isArray(window.ALL_81_PLATES) && window.ALL_81_PLATES.length > 0) {
      globalPlatesData = window.ALL_81_PLATES;
    } else {
      // 2. Fallback to HTTP fetch
      try {
        const resp = await fetch('data/all-81-plates.json');
        if (!resp.ok) throw new Error('Failed to load plates');
        globalPlatesData = await resp.json();
      } catch (e) {
        console.warn('Could not fetch all-81-plates.json:', e);
        return;
      }
    }

    renderKineticTracks(globalPlatesData);
    renderExhibitionGrid(globalPlatesData);
    initArchiveFilters();
    initLightboxControls();

    // Ensure ScrollTrigger positions are calculated cleanly
    setTimeout(() => {
      ScrollTrigger.refresh();
    }, 200);
  };

  const renderKineticTracks = (plates) => {
    const track1 = document.getElementById('filmstrip-track-1');
    const track2 = document.getElementById('filmstrip-track-2');
    if (!track1 || !track2) return;

    const row1Plates = plates.slice(0, 40);
    const row2Plates = plates.slice(40);

    const createCardHtml = (p, idx) => `
      <div class="filmstrip-card interactive-hover group" data-plate-index="${idx}">
        <div class="overflow-hidden bg-rich-black rounded-xs">
          <img src="${p.src}" alt="${p.title}" loading="lazy" class="group-hover:scale-105 transition-transform duration-700">
        </div>
        <div class="filmstrip-meta">
          <span class="font-bold text-deep-charcoal">PL.${p.plateNumber}</span>
          <span class="truncate ml-2 text-soft-charcoal text-[11px]">${p.title}</span>
        </div>
      </div>
    `;

    track1.innerHTML = row1Plates.map((p, i) => createCardHtml(p, i)).join('') + row1Plates.map((p, i) => createCardHtml(p, i)).join('');
    track2.innerHTML = row2Plates.map((p, i) => createCardHtml(p, i + 40)).join('') + row2Plates.map((p, i) => createCardHtml(p, i + 40)).join('');

    // GSAP continuous marquee animation
    const tween1 = gsap.to(track1, {
      xPercent: -50,
      repeat: -1,
      duration: 55,
      ease: 'none'
    });

    const tween2 = gsap.fromTo(track2, {
      xPercent: -50
    }, {
      xPercent: 0,
      repeat: -1,
      duration: 55,
      ease: 'none'
    });

    // Smooth slowdown on hover
    [track1, track2].forEach(track => {
      track.addEventListener('mouseenter', () => gsap.to([tween1, tween2], { timeScale: 0.15, duration: 0.3 }));
      track.addEventListener('mouseleave', () => gsap.to([tween1, tween2], { timeScale: 1, duration: 0.3 }));
    });
  };

  const renderExhibitionGrid = (plates) => {
    const grid = document.getElementById('all-plates-grid');
    if (!grid) return;

    // 4 Alternating Entrance Animation Styles ("Maari Maari Varunna 3D Animations")
    const animClasses = ['anim-tilt-left', 'anim-scale-up', 'anim-tilt-right', 'anim-perspective'];

    grid.innerHTML = plates.map((p, idx) => {
      const animClass = animClasses[idx % animClasses.length];
      return `
        <div class="archive-plate-card ${animClass} group interactive-hover" data-series="${p.series}" data-plate-index="${idx}">
          <div class="plate-img-wrapper">
            <img src="${p.src}" alt="${p.title}" loading="lazy" class="w-full h-full object-cover">
            <div class="absolute top-2.5 left-2.5 px-2 py-0.5 bg-rich-black/80 backdrop-blur-md rounded text-[9px] font-mono tracking-widest text-warm-ivory uppercase z-10">
              PL.${p.plateNumber}
            </div>
            <button class="trigger-inspect absolute bottom-2.5 right-2.5 px-2.5 py-1 bg-muted-gold text-rich-black text-[9px] font-sans font-bold tracking-widest uppercase opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xs shadow-lg z-10">
              INSPECT
            </button>
          </div>
          <div class="archive-plate-meta">
            <h4 class="text-xs font-serif font-medium text-deep-charcoal truncate pr-2">${p.title}</h4>
            <span class="text-[10px] font-mono text-soft-charcoal uppercase">${p.camera.replace('Sony ', '')}</span>
          </div>
          <div class="mt-1 flex justify-between text-[9px] font-mono text-soft-charcoal/70 uppercase">
            <span>${p.series}</span>
            <span>${p.aperture} • ${p.shutterSpeed}</span>
          </div>
        </div>
      `;
    }).join('');

    // Ultra-smooth, hardware-accelerated ScrollTrigger batch entrance (Butter-smooth 60-120 FPS)
    ScrollTrigger.batch('.archive-plate-card', {
      interval: 0.06,
      batchMax: 4,
      start: 'top 92%',
      once: true,
      onEnter: batch => gsap.to(batch, {
        opacity: 1,
        y: 0,
        rotationZ: 0,
        scale: 1,
        stagger: 0.06,
        duration: 0.75,
        ease: 'power3.out',
        overwrite: true
      })
    });
  };

  const initArchiveFilters = () => {
    const tabs = document.querySelectorAll('.filter-tab-btn');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const filter = tab.getAttribute('data-filter');

        const cards = document.querySelectorAll('.archive-plate-card');
        cards.forEach(card => {
          const series = card.getAttribute('data-series') || '';
          if (filter === 'all' || series.toLowerCase().includes(filter.toLowerCase())) {
            gsap.to(card, {
              display: 'block',
              opacity: 1,
              scale: 1,
              duration: 0.4,
              ease: 'power2.out'
            });
          } else {
            gsap.to(card, {
              opacity: 0,
              scale: 0.9,
              duration: 0.3,
              ease: 'power2.in',
              onComplete: () => card.style.display = 'none'
            });
          }
        });
        setTimeout(() => ScrollTrigger.refresh(), 400);
      });
    });
  };

  const initLightboxControls = () => {
    const modal = document.getElementById('archival-lightbox');
    const img = document.getElementById('lightbox-img');
    const plateNum = document.getElementById('lightbox-plate-num');
    const title = document.getElementById('lightbox-title');
    const exif = document.getElementById('lightbox-exif');
    const closeBtn = document.getElementById('lightbox-close');
    const prevBtn = document.getElementById('lightbox-prev');
    const nextBtn = document.getElementById('lightbox-next');

    if (!modal) return;

    const openLightbox = (index) => {
      currentLightboxIndex = (index + globalPlatesData.length) % globalPlatesData.length;
      const p = globalPlatesData[currentLightboxIndex];
      if (!p) return;

      img.src = p.src;
      plateNum.innerText = `PLATE ${p.plateNumber} / ${String(globalPlatesData.length).padStart(2, '0')}`;
      title.innerText = p.title;
      exif.innerText = `${p.camera} • ${p.lens} • ${p.focalLength} • ${p.aperture} • ${p.shutterSpeed} • ${p.iso}`;

      modal.classList.add('active');
      soundEngine.playFocusBeep();
    };

    const closeLightbox = () => {
      modal.classList.remove('active');
    };

    const nextPlate = () => {
      soundEngine.playShutterClick();
      openLightbox(currentLightboxIndex + 1);
    };

    const prevPlate = () => {
      soundEngine.playShutterClick();
      openLightbox(currentLightboxIndex - 1);
    };

    // Delegate click on cards
    document.addEventListener('click', (e) => {
      const card = e.target.closest('[data-plate-index]');
      if (card) {
        const idx = parseInt(card.getAttribute('data-plate-index'), 10);
        if (!isNaN(idx)) openLightbox(idx);
      }
    });

    if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
    if (prevBtn) prevBtn.addEventListener('click', prevPlate);
    if (nextBtn) nextBtn.addEventListener('click', nextPlate);

    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeLightbox();
    });

    window.addEventListener('keydown', (e) => {
      if (!modal.classList.contains('active')) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') nextPlate();
      if (e.key === 'ArrowLeft') prevPlate();
    });
  };

  /* ==========================================================================
     Header Adaptive Scroll State (Dark Hero -> Warm Ivory Frosted Nav)
     ========================================================================== */
  const initHeaderScrollState = () => {
    const header = document.getElementById('site-header');
    if (!header) return;
    const updateHeader = () => {
      if (window.scrollY > 80) {
        header.classList.add('is-scrolled');
      } else {
        header.classList.remove('is-scrolled');
      }
    };
    window.addEventListener('scroll', updateHeader, { passive: true });
    updateHeader();
  };

  /* ==========================================================================
     Initialization Lifecycle
     ========================================================================== */
  document.addEventListener('DOMContentLoaded', () => {
    initLenisSmoothScroll();
    initHeaderScrollState();
    initCustomCursor();
    initMagneticButtons();
    initViewfinderClock();
    initMobileNav();
    initAudioToggle();
    initBookingModal();
    initScrollProgressBar();
    initInteractiveCameraDirectClick();
    initComplete81PlateArchive();

    // Small delay to ensure Tailwind & fonts layout before calculating ScrollTrigger coordinates
    setTimeout(() => {
      initScrollStoryTimeline();
      initStoryGalleryScroll();
      ScrollTrigger.refresh();
    }, 150);

    // Discreet Stealth Shortcut: Ctrl + Shift + A opens Admin Vault without any public UI buttons
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        e.preventDefault();
        window.open('/admin.html', '_blank');
      }
    });
  });

  // Expose triggers globally for interactive inspect
  window.LifeInClicks = {
    triggerCameraClick,
    soundEngine,
    getPlates: () => globalPlatesData
  };
})();
