// Play-along for whole songs: the chart scrolls in time and the site strums each chord.
// Chord names come from songs.js charts (already in the shapes Luk plays). Sound is a
// plucked-string synth (Karplus-Strong), pitched with the song's capo.
(function () {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const OPEN = [40, 45, 50, 55, 59, 64]; // E2 A2 D3 G3 B3 E4
  const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

  // ---------- chord names ----------
  function parse(name) {
    const m = /^([A-G])([#b]?)(m(?!aj))?/.exec(name);
    if (!m) return null;
    const root = (PC[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0) + 12) % 12;
    return { root, minor: !!m[3] };
  }
  // Notes for a chord: the Woodshed shape if we have one, else a simple root-position voicing.
  function voicing(name) {
    const c = window.CHORDS[name];
    if (c) return c.frets.map((f, i) => (f < 0 ? null : OPEN[i] + f)).filter((n) => n !== null);
    const p = parse(name); if (!p) return [];
    let bass = 40 + ((p.root - 4 + 12) % 12); // lowest from E2
    const third = p.minor ? 3 : 4;
    return [bass, bass + 7, bass + 12, bass + 12 + third, bass + 19];
  }

  // ---------- sound ----------
  let ctx = null, master = null;
  const bufs = {};
  function audio() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = 0.55;
      const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 4200;
      master.connect(lp); lp.connect(ctx.destination);
    }
    return ctx;
  }
  function pluckBuffer(midi) {
    if (bufs[midi]) return bufs[midi];
    const sr = ctx.sampleRate, f = 440 * Math.pow(2, (midi - 69) / 12);
    const len = Math.floor(sr * 2.2), N = Math.max(2, Math.round(sr / f));
    const out = new Float32Array(len), ring = new Float32Array(N);
    for (let i = 0; i < N; i++) ring[i] = Math.random() * 2 - 1;
    // soften the attack a little
    for (let k = 0; k < 2; k++) for (let i = 1; i < N; i++) ring[i] = (ring[i] + ring[i - 1]) / 2;
    const decay = 0.996 - Math.max(0, midi - 52) * 0.00006;
    let p = 0;
    for (let i = 0; i < len; i++) {
      const nx = (p + 1) % N;
      const v = ring[p];
      out[i] = v;
      ring[p] = decay * 0.5 * (v + ring[nx]);
      p = nx;
    }
    const b = ctx.createBuffer(1, len, sr); b.copyToChannel(out, 0);
    return (bufs[midi] = b);
  }
  function strum(name, t, { up = false, vel = 1, capo = 0 } = {}) {
    let notes = voicing(name).map((n) => n + capo);
    if (up) notes = notes.slice().reverse().slice(0, 4);
    notes.forEach((m, i) => {
      const s = ctx.createBufferSource(); s.buffer = pluckBuffer(m);
      const g = ctx.createGain();
      const at = t + i * (up ? 0.012 : 0.016);
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(0.32 * vel, at + 0.004);
      g.gain.setTargetAtTime(0.0001, at + 0.05, 0.9);
      s.connect(g); g.connect(master);
      s.start(at); s.stop(at + 2.2);
    });
  }
  function click(t, accent) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.value = accent ? 1500 : 1000;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(accent ? 0.35 : 0.2, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + 0.06);
  }

  // ---------- state ----------
  const st = { song: null, flat: [], idx: 0, playing: false, bpm: 80, sound: true, clickOn: false, timer: null, raf: null, next: 0, beat: 0, events: [], countLeft: 0 };
  const prefs = (() => { try { return JSON.parse(localStorage.getItem("fw-player")) || {}; } catch (e) { return {}; } })();
  const savePrefs = () => { try { localStorage.setItem("fw-player", JSON.stringify({ sound: st.sound, clickOn: st.clickOn, bpm: prefs.bpm || {} })); } catch (e) {} };
  st.sound = prefs.sound !== false; st.clickOn = !!prefs.clickOn; prefs.bpm = prefs.bpm || {};

  function flatten(chart) {
    const out = [];
    chart.sections.forEach((sec, si) => sec.lines.forEach((line, li) => line.split(/\s+/).filter(Boolean).forEach((ch, ci) => out.push({ ch, si, li, ci }))));
    return out;
  }
  const beatsPer = () => st.song.chart.beats || 4;

  // ---------- render ----------
  function render(song) {
    stop();
    st.song = song;
    const box = $("playBlock");
    if (!song.chart) { box.hidden = true; return; }
    box.hidden = false;
    st.flat = flatten(song.chart); st.idx = 0;
    st.bpm = prefs.bpm[song.title] || song.chart.bpm || 80;
    $("playNote").textContent = song.chart.src ? `Full chart from ${song.chart.src}. Each chord gets ${beatsPer()} beats, so it follows the song's chords, not the exact timing of the record.` : "";
    let html = "", k = 0;
    song.chart.sections.forEach((sec) => {
      html += `<div class="pl-sec"><div class="pl-sec-n">${esc(sec.name)}</div>`;
      sec.lines.forEach((line) => {
        html += `<div class="pl-line">` + line.split(/\s+/).filter(Boolean).map((c) => `<button type="button" class="pl-ch" data-k="${k++}">${esc(c)}</button>`).join("") + `</div>`;
      });
      html += `</div>`;
    });
    $("playChart").innerHTML = html;
    $("playChart").querySelectorAll(".pl-ch").forEach((b) => b.addEventListener("click", () => { seek(+b.dataset.k); }));
    paint();
  }

  function chordFace(name, big) {
    const known = !!window.CHORDS[name];
    return `<div class="nm">${esc(name)}</div>${big && known ? chordSVG(name) : ""}`;
  }
  function paint() {
    if (!st.song || !st.song.chart) return;
    const cur = st.flat[st.idx], nxt = st.flat[st.idx + 1];
    $("playNow").innerHTML = chordFace(cur.ch, true);
    $("playNext").innerHTML = nxt ? `<span class="pl-l">Next</span>${chordFace(nxt.ch, true)}` : `<span class="pl-l">Last chord</span>`;
    $("playSec").textContent = st.countLeft > 0 ? `Count-in ${st.countLeft}` : st.song.chart.sections[cur.si].name;
    $("playBpm").textContent = st.bpm;
    $("playBtn").innerHTML = st.playing ? `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5h4v14H6zm8 0h4v14h-4z"/></svg>Pause` : `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>${st.idx ? "Resume" : "Play"}`;
    $("playSound").setAttribute("aria-pressed", String(st.sound));
    $("playClick").setAttribute("aria-pressed", String(st.clickOn));
    const chips = $("playChart").querySelectorAll(".pl-ch");
    chips.forEach((c, i) => { c.classList.toggle("on", i === st.idx); c.classList.toggle("past", i < st.idx); });
    const on = chips[st.idx];
    if (on && st.playing) {
      const box = $("playChart"), top = on.offsetTop - box.offsetTop;
      if (top < box.scrollTop + 20 || top > box.scrollTop + box.clientHeight - 60) box.scrollTo({ top: top - 40, behavior: "smooth" });
    }
    const pct = st.flat.length > 1 ? (st.idx / (st.flat.length - 1)) * 100 : 0;
    $("playBar").style.width = pct + "%";
  }

  // ---------- transport ----------
  function schedule() {
    const spb = 60 / st.bpm, bp = beatsPer();
    while (st.next < ctx.currentTime + 0.12) {
      const t = st.next;
      if (st.beat < 0) {
        const n = -st.beat;
        click(t, n === bp);
        st.events.push({ t, count: n - 1 });
      } else {
        const pos = st.beat + st.offset, i = Math.floor(pos / bp), b = pos % bp;
        if (i >= st.flat.length) { st.events.push({ t, end: true }); st.timer && clearInterval(st.timer); st.timer = null; break; }
        const ch = st.flat[i].ch;
        if (st.sound) {
          if (b === 0) strum(ch, t, { vel: 1, capo: st.song.capo || 0 });
          else strum(ch, t, { vel: 0.55, up: b % 2 === 1, capo: st.song.capo || 0 });
        }
        if (st.clickOn) click(t, b === 0);
        if (b === 0) st.events.push({ t, idx: i });
      }
      st.beat++; st.next += spb;
    }
  }
  function frame() {
    const now = ctx.currentTime;
    let changed = false;
    while (st.events.length && st.events[0].t <= now) {
      const e = st.events.shift();
      if (e.end) { st.playing = false; st.idx = 0; st.countLeft = 0; paint(); stop(); return; }
      if (e.count !== undefined) { st.countLeft = e.count; }
      if (e.idx !== undefined) { st.idx = e.idx; st.countLeft = 0; }
      changed = true;
    }
    if (changed) paint();
    st.raf = requestAnimationFrame(frame);
  }
  async function play() {
    audio(); await ctx.resume();
    const bp = beatsPer();
    st.playing = true; st.events = [];
    st.countLeft = bp; st.beat = -bp; // one bar of count-in clicks, then the current chord
    st.offset = st.idx * bp;
    st.next = ctx.currentTime + 0.08;
    st.timer = setInterval(schedule, 25);
    st.raf = requestAnimationFrame(frame);
    paint();
  }
  function stop() {
    if (st.timer) clearInterval(st.timer); st.timer = null;
    if (st.raf) cancelAnimationFrame(st.raf); st.raf = null;
    st.events = []; st.countLeft = 0;
    if (st.playing) { st.playing = false; }
  }
  function toggle() { if (st.playing) { stop(); paint(); } else play(); }
  function seek(k) { const was = st.playing; stop(); st.idx = Math.max(0, Math.min(st.flat.length - 1, k)); paint(); if (was) play(); }
  function tempo(d) {
    st.bpm = Math.max(40, Math.min(200, st.bpm + d));
    prefs.bpm[st.song.title] = st.bpm; savePrefs();
    if (st.playing) { stop(); play(); } else paint();
  }

  $("playBtn").addEventListener("click", toggle);
  $("playRestart").addEventListener("click", () => seek(0));
  $("playSlower").addEventListener("click", () => tempo(-5));
  $("playFaster").addEventListener("click", () => tempo(5));
  $("playSound").addEventListener("click", () => { st.sound = !st.sound; savePrefs(); paint(); });
  $("playClick").addEventListener("click", () => { st.clickOn = !st.clickOn; savePrefs(); paint(); });

  window.Player = { render, stop, _st: st, _voicing: voicing };
})();
