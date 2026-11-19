// Chord data and microphone strum detection for Woodshed.
// Pitch classes: C=0 C#=1 D=2 D#=3 E=4 F=5 F#=6 G=7 G#=8 A=9 A#=10 B=11
window.CHORDS = {
  E:  { frets: [0, 2, 2, 1, 0, 0],   pcs: [4, 8, 11], root: 4, known: true,  tip: "Middle finger on the A string, ring on D, index on G." },
  D:  { frets: [-1, -1, 0, 2, 3, 2], pcs: [2, 6, 9],  root: 2, known: true,  tip: "Strum from the D string down. Keep the low E and A quiet." },
  C:  { frets: [-1, 3, 2, 0, 1, 0],  pcs: [0, 4, 7],  root: 0, known: true,  tip: "Arch your fingers so the open G and high E ring." },
  G:  { frets: [3, 2, 0, 0, 0, 3],   pcs: [7, 11, 2], root: 7, known: true,  tip: "All six strings. Try ring finger on low E, pinky on high E." },
  Em: { frets: [0, 2, 2, 0, 0, 0],   pcs: [4, 7, 11], root: 4, known: false, tip: "Your E chord with the index finger lifted. The easiest new one." },
  Am: { frets: [-1, 0, 2, 2, 1, 0],  pcs: [9, 0, 4],  root: 9, known: false, tip: "Same shape as E, moved over one string. Skip the low E." },
  A:  { frets: [-1, 0, 2, 2, 2, 0],  pcs: [9, 1, 4],  root: 9, known: false, tip: "Three fingers in a row on fret 2. Squeeze them in." },
  Dm: { frets: [-1, -1, 0, 2, 3, 1], pcs: [2, 5, 9],  root: 2, known: false, tip: "Like D, but the high E string drops to fret 1." },
};

window.chordSVG = function (name) {
  const f = CHORDS[name].frets;
  const x0 = 18, dx = 17, y0 = 30, dy = 26, frets = 4, xs = (i) => x0 + i * dx;
  const ink = "#1a1710";
  let s = `<svg viewBox="0 0 121 146" role="img" aria-label="${name} chord diagram">`;
  for (let r = 0; r <= frets; r++) s += `<line x1="${x0}" y1="${y0 + r * dy}" x2="${xs(5)}" y2="${y0 + r * dy}" stroke="${ink}" stroke-width="${r === 0 ? 5 : 1.2}"/>`;
  for (let i = 0; i < 6; i++) {
    s += `<line x1="${xs(i)}" y1="${y0}" x2="${xs(i)}" y2="${y0 + frets * dy}" stroke="${ink}" stroke-width="${1 + (5 - i) * 0.25}"/>`;
    const v = f[i];
    if (v === -1) s += `<text x="${xs(i)}" y="20" text-anchor="middle" font-size="14" font-family="DM Mono, monospace" fill="${ink}">×</text>`;
    else if (v === 0) s += `<circle cx="${xs(i)}" cy="15" r="5" fill="none" stroke="${ink}" stroke-width="1.6"/>`;
    else s += `<circle cx="${xs(i)}" cy="${y0 + (v - 0.5) * dy}" r="7.5" fill="${ink}"/>`;
  }
  return s + `</svg>`;
};

// Scores a 12-bin chroma vector against every chord. Higher is closer.
window.scoreChroma = function (c) {
  const out = {};
  for (const name in CHORDS) {
    const ch = CHORDS[name];
    let s = 0, n = 0;
    for (let k = 0; k < 12; k++) {
      const w = ch.pcs.includes(k) ? (k === ch.root ? 1.15 : 1) : -0.35;
      s += c[k] * w; n += w * w;
    }
    out[name] = s / Math.sqrt(n);
  }
  return out;
};

window.StrumDetector = class {
  constructor(onStrum, onLevel) {
    this.onStrum = onStrum; this.onLevel = onLevel || (() => {});
    this.floor = 0.004; this.recent = []; this.pending = null; this.lastOnset = 0; this.loop = null;
  }
  async start() {
    this.ctx = this.ctx || new (window.AudioContext || window.webkitAudioContext)();
    await this.ctx.resume();
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    const src = this.ctx.createMediaStreamSource(this.stream);
    this.an = this.ctx.createAnalyser(); this.an.fftSize = 8192; this.an.smoothingTimeConstant = 0;
    src.connect(this.an);
    this.freq = new Float32Array(this.an.frequencyBinCount);
    this.time = new Float32Array(2048);
    this.loop = setInterval(() => this.tick(), 40);
  }
  stop() {
    clearInterval(this.loop); this.loop = null;
    if (this.stream) this.stream.getTracks().forEach((t) => t.stop());
    this.stream = null;
  }
  calibrate(on) { this.calibrating = on; if (on) this.floor = 0; }
  level() {
    this.an.getFloatTimeDomainData(this.time);
    let s = 0; for (let i = 0; i < this.time.length; i++) s += this.time[i] * this.time[i];
    return Math.sqrt(s / this.time.length);
  }
  chroma() {
    this.an.getFloatFrequencyData(this.freq);
    const c = new Float32Array(12), binHz = this.ctx.sampleRate / this.an.fftSize;
    const lo = Math.ceil(75 / binHz), hi = Math.min(this.freq.length, Math.floor(1000 / binHz));
    for (let i = lo; i < hi; i++) {
      const m = Math.pow(10, this.freq[i] / 20);
      const f = i * binHz, midi = 69 + 12 * Math.log2(f / 440), r = Math.round(midi);
      const w = 1 - Math.abs(midi - r) * 2;
      // Low notes count a bit more than their overtones.
      if (w > 0) c[((r % 12) + 12) % 12] += m * m * w * (f < 400 ? 1.4 : 1);
    }
    let n = 0; for (let k = 0; k < 12; k++) { c[k] = Math.sqrt(c[k]); n += c[k] * c[k]; }
    n = Math.sqrt(n) || 1; for (let k = 0; k < 12; k++) c[k] /= n;
    return c;
  }
  tick() {
    const rms = this.level(), now = performance.now();
    if (this.calibrating) { this.floor = Math.max(this.floor * 0.97, rms); }
    const thr = Math.max(0.01, this.floor * 3);
    this.onLevel(rms, thr);
    const prevMin = this.recent.length ? Math.min(...this.recent) : rms;
    this.recent.push(rms); if (this.recent.length > 6) this.recent.shift();
    if (this.calibrating) return;

    if (this.pending) {
      this.pending.frames++;
      if (this.pending.frames >= 2 && this.pending.frames <= 7 && rms > thr * 0.6) {
        const c = this.chroma(); for (let k = 0; k < 12; k++) this.pending.sum[k] += c[k];
        this.pending.used++;
      }
      if (this.pending.frames > 7) {
        const p = this.pending; this.pending = null;
        if (p.used >= 2) {
          let n = 0; for (let k = 0; k < 12; k++) n += p.sum[k] * p.sum[k];
          n = Math.sqrt(n) || 1; const c = p.sum.map((v) => v / n);
          const scores = scoreChroma(c);
          const best = Object.keys(scores).sort((a, b) => scores[b] - scores[a])[0];
          this.onStrum({ best, scores });
        }
      }
      return;
    }
    // A strum: loud enough, and a clear jump up from the last ~quarter second.
    if (rms > thr && rms > prevMin * 1.8 && now - this.lastOnset > 280) {
      this.lastOnset = now;
      this.pending = { frames: 0, used: 0, sum: new Float32Array(12) };
    }
  }
};
