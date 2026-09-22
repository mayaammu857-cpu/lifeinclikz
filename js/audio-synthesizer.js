/**
 * LIFECYCLE ACOUSTIC ARCHITECTURE
 * Procedural Web Audio Synthesizer (Zero External Audio Files)
 * Mechanical leaf shutter, harmonic drone & tactile feedback
 */

class AudioSynthesizer {
  constructor() {
    this.ctx = null;
    this.isMuted = true; // Muted by default to respect browser autoplay policies
    this.masterGain = null;
    this.droneOscillators = [];
    this.droneGain = null;
    this.isInitialized = false;
  }

  init() {
    if (this.isInitialized) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.4, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
      this.isInitialized = true;
    } catch (e) {
      console.warn('Web Audio not supported in this environment', e);
    }
  }

  ensureContext() {
    if (!this.isInitialized) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.ensureContext();
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      const target = this.isMuted ? 0 : 0.4;
      this.masterGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.05);
    }
    if (!this.isMuted) {
      this.startAmbientDrone();
    } else {
      this.stopAmbientDrone();
    }
    return !this.isMuted;
  }

  /**
   * Synthesize mechanical camera leaf-shutter click
   */
  playShutterClick() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // Stage 1: High crisp shutter blade click
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(1400, t);
    osc1.frequency.exponentialRampToValueAtTime(180, t + 0.025);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2200, t);
    filter.Q.setValueAtTime(3, t);

    gain1.gain.setValueAtTime(0.35, t);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.035);

    osc1.connect(filter);
    filter.connect(gain1);
    gain1.connect(this.masterGain);

    osc1.start(t);
    osc1.stop(t + 0.04);

    // Stage 2: Low body thump (damping of focal plane)
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(160, t + 0.015);
    osc2.frequency.exponentialRampToValueAtTime(45, t + 0.07);

    gain2.gain.setValueAtTime(0.4, t + 0.015);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc2.connect(gain2);
    gain2.connect(this.masterGain);

    osc2.start(t + 0.015);
    osc2.stop(t + 0.09);
  }

  /**
   * Subtle harmonic tactile chime on view mode switches
   */
  playModeSwitchTone(modeIndex = 1) {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const frequencies = [261.63, 329.63, 392.00, 523.25]; // C, E, G, High C
    const freq = frequencies[(modeIndex - 1) % frequencies.length] || 329.63;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);

    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.3);
  }

  /**
   * Ethereal ambient installation drone (55Hz sub, 110Hz fifth, filtered resonance)
   */
  startAmbientDrone() {
    if (this.isMuted || this.droneOscillators.length > 0) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    this.droneGain = this.ctx.createGain();
    this.droneGain.gain.setValueAtTime(0.001, t);
    this.droneGain.gain.exponentialRampToValueAtTime(0.08, t + 2.0);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(260, t);
    filter.Q.setValueAtTime(2, t);

    const freqs = [55.0, 110.0, 164.81]; // A1, A2, E3
    freqs.forEach(freq => {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      osc.connect(filter);
      osc.start(t);
      this.droneOscillators.push(osc);
    });

    filter.connect(this.droneGain);
    this.droneGain.connect(this.masterGain);
  }

  stopAmbientDrone() {
    if (!this.ctx || this.droneOscillators.length === 0) return;
    const t = this.ctx.currentTime;
    if (this.droneGain) {
      this.droneGain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
    }
    setTimeout(() => {
      this.droneOscillators.forEach(osc => {
        try { osc.stop(); } catch (e) {}
      });
      this.droneOscillators = [];
      this.droneGain = null;
    }, 850);
  }
}

export const soundEngine = new AudioSynthesizer();
