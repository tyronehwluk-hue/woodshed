// Fingerpicking trainer: shows a pattern as tab, listens for each picked note.
window.Picking = (function () {
  const $ = (id) => document.getElementById(id);
  const OPEN = [40, 45, 50, 55, 59, 64]; // E2 A2 D3 G3 B3 E4, low string first
  const STRING_NAMES = ["low E", "A", "D", "G", "B", "high E"];
  const BASS = { E: 0, Em: 0, G: 0, A: 1, Am: 1, C: 1, D: 2, Dm: 2 };
  // Steps: "p" = thumb on the chord's bass string, i/m/a = G/B/high E strings.
  const PATTERNS = {
    arp:  { name: "Simple arpeggio", steps: ["p", "i", "m", "a", "p", "i", "m", "a"], tip: "Thumb, then index, middle, ring. Twice per bar." },
    wave: { name: "Up and down", steps: ["p", "i", "m", "a", "m", "i"], tip: "Up the strings and back down. Six notes, waltz feel." },
    roll: { name: "Folk roll", steps: ["p", "i", "m", "p", "i", "m", "p", "i"], tip: "Groups of three, three, two. Sounds like a lot of folk songs." },
  };
  const FINGER_STRING = { i: 3, m: 4, a: 5 };
  const FINGER_LABEL = { p: "Thumb", i: "Index", m: "Middle", a: "Ring" };

  const st = {
    pattern: "arp", chords: ["G", "C"], mode: "follow", bpm: 60,
    running: false, steps: [], pos: 0, hits: 0, judged: 0, loopHits: 0, loopJudged: 0,
    t0: 0, raf: null, clicks: [], countIn: false,
  };
  try { const p = JSON.parse(localStorage.getItem("fw-picking") || "{}"); Object.assign(st, { pattern: PATTERNS[p.pattern] ? p.pattern : st.pattern, chords: Array.isArray(p.chords) && p.chords.length ? p.chords.filter((c) => CHORDS[c]) : st.chords, mode: p.mode === "tempo" ? "tempo" : "follow", bpm: p.bpm >= 40 && p.bpm <= 160 ? p.bpm : 60 }); } catch (e) {}
  function save() { try { localStorage.setItem("fw-picking", JSON.stringify({ pattern: st.pattern, chords: st.chords, mode: st.mode, bpm: st.bpm })); } catch (e) {} }

  // Build the full loop of steps: each chord gets one bar of the pattern.
  function build() {
    const out = [];
    st.chords.forEach((ch) => {
      PATTERNS[st.pattern].steps.forEach((f) => {
        const s = f === "p" ? BASS[ch] : FINGER_STRING[f];
        const fret = CHORDS[ch].frets[s];
        out.push({ chord: ch, finger: f, string: s, fret, midi: OPEN[s] + fret, state: "" });
      });
    });
    return out;
  }

  // ---------- note detection ----------
  let ctx = null, an = null, stream = null, freq = null, timeBuf = null, loop = null;
  let prevE = {}, prevE2 = {}, lastFire = 0, pending = null, recentPeak = 0;
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  function noteEnergy(m) {
    const binHz = ctx.sampleRate / an.fftSize;
    let e = 0;
    [[1, 1], [2, 0.5], [3, 0.25]].forEach(([h, w]) => {
      const f = hz(m) * h, lo = Math.floor((f * 0.985) / binHz), hi = Math.ceil((f * 1.015) / binHz);
      let mx = 0; for (let b = lo; b <= hi && b < freq.length; b++) mx = Math.max(mx, Math.pow(10, freq[b] / 20));
      e += mx * w;
    });
    return e;
  }
  async function startMic() {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    await ctx.resume();
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    const src = ctx.createMediaStreamSource(stream);
    an = ctx.createAnalyser(); an.fftSize = 8192; an.smoothingTimeConstant = 0;
    src.connect(an);
    freq = new Float32Array(an.frequencyBinCount); timeBuf = new Float32Array(2048);
    prevE = {}; prevE2 = {}; pending = null; recentPeak = 0;
    loop = setInterval(listen, 25);
  }
  function stopMic() {
    clearInterval(loop); loop = null;
    if (stream) stream.getTracks().forEach((t) => t.stop());
    stream = null;
  }
  function listen() {
    an.getFloatTimeDomainData(timeBuf);
    let s = 0; for (let i = 0; i < timeBuf.length; i++) s += timeBuf[i] * timeBuf[i];
    $("pkVu").style.width = Math.min(100, Math.sqrt(Math.sqrt(s / timeBuf.length)) * 220) + "%";
    an.getFloatFrequencyData(freq);
    // Listen for every string of the chords in use, so a wrong string is named as itself.
    const cands = [...new Set(OPEN.concat(st.chords.flatMap((c) => CHORDS[c].frets.map((f, i) => (f < 0 ? null : OPEN[i] + f)).filter((m) => m !== null))))];
    const now = performance.now();
    // When any string's energy jumps, wait ~75 ms, then pick the string whose energy
    // grew the most since just before the jump. Overtones and the pick's click grow less.
    const E = {}; let peak = 0;
    cands.forEach((m) => { E[m] = noteEnergy(m); peak = Math.max(peak, E[m]); });
    recentPeak = Math.max(peak, recentPeak * 0.97);
    if (pending) {
      pending.ticks++;
      if (pending.ticks >= 3) {
        let best = null, bestD = 0;
        cands.forEach((m) => { const d = E[m] - (pending.base[m] || 0); if (d > bestD) { bestD = d; best = m; } });
        const at = pending.at; pending = null;
        if (best !== null && bestD > 0.15 * recentPeak && !st.countIn) {
          onNote(best, at);
        }
      }
    } else if (now - lastFire > 110) {
      const trig = cands.some((m) => E[m] > 0.06 * recentPeak && E[m] > 1.7 * Math.max(prevE2[m] || 0, prevE[m] || 0, 1e-5));
      if (trig) { lastFire = now; pending = { ticks: 0, at: now, base: Object.assign({}, prevE2) }; }
    }
    cands.forEach((m) => { prevE2[m] = prevE[m] || 0; prevE[m] = E[m]; });
  }

  // ---------- metronome ----------
  function click(at, accent) {
    try {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = accent ? 1500 : 1000; o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(0.25, at + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.05);
      o.start(at); o.stop(at + 0.06);
    } catch (e) {}
  }
  const stepDur = () => 30 / st.bpm; // eighth notes, in seconds

  // ---------- flow ----------
  function heard(t, kind) { const h = $("pkHeard"); h.textContent = t; h.className = "heard" + (kind ? " " + kind : ""); }
  const noteName = (m) => ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"][m % 12];

  function onNote(m, now) {
    if (!st.running) return;
    if (st.mode === "follow") {
      const want = st.steps[st.pos];
      if (m === want.midi) {
        want.state = "hit"; st.hits++; st.judged++;
        heard(`Good. Next: ${FINGER_LABEL[st.steps[(st.pos + 1) % st.steps.length].finger].toLowerCase()} on the ${STRING_NAMES[st.steps[(st.pos + 1) % st.steps.length].string]} string.`, "ok");
        advance();
      } else {
        const s = st.steps.find((x) => x.midi === m);
        heard(`That was the ${s ? STRING_NAMES[s.string] + " string" : noteName(m)}. Pick the ${STRING_NAMES[want.string]} string with your ${FINGER_LABEL[want.finger].toLowerCase()}.`, "bad");
      }
      render();
      return;
    }
    // Tempo mode: match against the nearest unjudged step with this note.
    const t = (ctx.currentTime - (performance.now() - now) / 1000) - st.t0;
    const d = stepDur(), idx = Math.round(t / d);
    let match = null;
    for (const k of [idx, idx - 1, idx + 1]) {
      if (k < 0) continue;
      const s = st.steps[k % st.steps.length];
      if (s.midi === m && Math.abs(t - k * d) < d * 0.45 && s.loop !== Math.floor(k / st.steps.length)) { match = { k, s }; break; }
    }
    if (match) {
      match.s.state = "hit"; match.s.loop = Math.floor(match.k / st.steps.length);
      st.hits++; st.loopHits++;
      const ms = Math.round((t - match.k * d) * 1000);
      heard(Math.abs(ms) < 60 ? "Right on time." : ms < 0 ? `A little early (${-ms} ms).` : `A little late (${ms} ms).`, "ok");
      render();
    }
  }

  function advance() {
    st.pos++;
    if (st.pos >= st.steps.length) { st.pos = 0; st.steps.forEach((x) => (x.state = "")); }
  }

  function tick() {
    if (!st.running || st.mode !== "tempo") return;
    const d = stepDur();
    const t = ctx.currentTime - st.t0;
    // schedule clicks a little ahead, one per quarter note
    while (st.nextClick < ctx.currentTime + 0.15) {
      const beat = Math.round((st.nextClick - st.t0) / (2 * d));
      const perBar = PATTERNS[st.pattern].steps.length / 2;
      click(st.nextClick, ((beat % perBar) + perBar) % perBar === 0);
      st.nextClick += 2 * d;
    }
    if (t < 0) {
      if (st.firstCount) { st.countIn = true; heard(`Get ready… ${Math.ceil(-t / (2 * d))}`); }
      st.raf = requestAnimationFrame(tick); return;
    }
    if (st.firstCount) { st.firstCount = false; st.countIn = false; heard("Go!"); }
    const k = Math.floor(t / d + 0.5);
    const pos = k % st.steps.length, loopN = Math.floor(k / st.steps.length);
    // judge the step that just passed its window
    const passed = Math.floor(t / d - 0.45);
    if (passed >= 0 && passed > (st.lastJudged ?? -1)) {
      for (let j = (st.lastJudged ?? -1) + 1; j <= passed; j++) {
        const s = st.steps[j % st.steps.length];
        st.judged++; st.loopJudged++;
        if (s.loop !== Math.floor(j / st.steps.length)) { s.state = "miss"; }
        if ((j + 1) % st.steps.length === 0 && endLoop(j)) { st.raf = requestAnimationFrame(tick); render(); return; }
      }
      st.lastJudged = passed;
    }
    if (t >= 0 && pos !== st.pos) {
      st.pos = pos;
      if (pos === 0 && loopN > 0) st.steps.forEach((x) => { if (x.loop !== loopN) x.state = ""; });
      render();
    }
    st.raf = requestAnimationFrame(tick);
  }

  function endLoop(j) {
    const acc = st.loopJudged ? st.loopHits / st.loopJudged : 0;
    let msg;
    const boundary = st.t0 + (j + 1) * stepDur();
    let changed = false;
    if (acc >= 0.85 && st.bpm < 160) { st.bpm += 5; changed = true; msg = `${Math.round(acc * 100)}% that loop. Speeding up to ${st.bpm} bpm.`; }
    else if (acc < 0.5 && st.bpm > 40) { st.bpm -= 5; changed = true; msg = `${Math.round(acc * 100)}% that loop. Slowing to ${st.bpm} bpm.`; }
    else msg = `${Math.round(acc * 100)}% that loop. Staying at ${st.bpm} bpm.`;
    heard(msg, acc >= 0.85 ? "ok" : "");
    st.loopHits = 0; st.loopJudged = 0;
    const best = Math.max(st.bestBpm || 0, acc >= 0.85 ? st.bpm - 5 : 0);
    st.bestBpm = best; save();
    if (changed) {
      // Restart the clock at the loop boundary with the new tempo.
      st.t0 = boundary; st.nextClick = boundary; st.lastJudged = -1; st.pos = -1;
      st.steps.forEach((x) => { x.loop = undefined; x.state = ""; });
    }
    return changed;
  }

  async function start() {
    st.steps = build(); st.pos = 0; st.hits = 0; st.judged = 0; st.loopHits = 0; st.loopJudged = 0; st.lastJudged = -1;
    heard("Asking for your microphone…");
    try { await startMic(); } catch (e) { heard("I couldn't use your microphone. Allow mic access for this site in your browser settings, then press Start again.", "bad"); return; }
    st.running = true;
    if (st.mode === "tempo") {
      const d = stepDur();
      st.t0 = ctx.currentTime + 0.2 + 8 * d; // one bar of 4 clicks to count in
      st.nextClick = ctx.currentTime + 0.2; st.countIn = true; st.firstCount = true;
      st.raf = requestAnimationFrame(tick);
    } else {
      heard(`Pick the ${STRING_NAMES[st.steps[0].string]} string with your thumb.`);
    }
    render();
  }
  function stop() {
    if (!st.running) return;
    st.running = false; st.countIn = false; cancelAnimationFrame(st.raf); stopMic();
    const acc = st.judged ? Math.round((st.hits / st.judged) * 100) : null;
    heard(acc === null ? "Stopped." : `Stopped. ${st.hits} notes right${st.mode === "tempo" ? `, ${acc}% accuracy, reached ${st.bpm} bpm` : ""}.`);
    save(); render();
  }

  // ---------- render ----------
  function chips(el, vals, isOn, onPick, fmt) {
    el.innerHTML = "";
    vals.forEach((v) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "chip"; b.textContent = fmt ? fmt(v) : v;
      b.setAttribute("aria-pressed", String(isOn(v))); b.disabled = st.running;
      b.addEventListener("click", () => { onPick(v); save(); render(); });
      el.appendChild(b);
    });
  }
  function render() {
    if (!st.running) st.steps = build();
    const steps = st.steps, cur = steps[Math.max(0, st.pos)] || steps[0];
    $("pkChord").innerHTML = `<span class="pk-chord-l">Hold</span><span class="pk-chord-n">${cur.chord}</span>`;
    $("pkFinger").textContent = cur.finger;
    $("pkCueL").textContent = `${FINGER_LABEL[cur.finger]} · ${STRING_NAMES[cur.string]} string${cur.fret ? ", fret " + cur.fret : " (open)"}`;
    // tab: high E on top
    let h = `<div class="tab-grid" style="grid-template-columns: 22px repeat(${steps.length}, minmax(19px, 1fr))">`;
    for (let row = 5; row >= 0; row--) {
      h += `<span class="tab-s">${["E", "A", "D", "G", "B", "e"][row]}</span>`;
      steps.forEach((s, i) => {
        const bar = i > 0 && steps[i - 1].chord !== s.chord ? " bar" : "";
        const on = s.string === row;
        const now = st.running && i === st.pos && on ? " now" : "";
        h += `<span class="tab-c${bar}">${on ? `<span class="tab-n ${s.state}${now}">${s.fret}</span>` : ""}</span>`;
      });
    }
    h += `<span class="tab-s"></span>`;
    steps.forEach((s, i) => { h += `<span class="tab-f${st.running && i === st.pos ? " now" : ""}">${s.finger}</span>`; });
    h += `<span class="tab-s"></span>`;
    steps.forEach((s, i) => { h += `<span class="tab-ch">${i === 0 || steps[i - 1].chord !== s.chord ? s.chord : ""}</span>`; });
    $("pkTab").innerHTML = h + `</div>`;
    $("pkBpm").textContent = st.mode === "tempo" ? st.bpm : "–";
    $("pkHits").textContent = st.hits;
    $("pkAcc").textContent = st.judged ? Math.round((st.hits / st.judged) * 100) + "%" : "–";
    $("pkStart").textContent = st.running ? "Stop" : "Start";
    chips($("pkPattern"), Object.keys(PATTERNS), (v) => v === st.pattern, (v) => (st.pattern = v), (v) => PATTERNS[v].name);
    chips($("pkChords"), Object.keys(CHORDS), (v) => st.chords.includes(v), (v) => {
      if (st.chords.includes(v)) { if (st.chords.length > 1) st.chords = st.chords.filter((c) => c !== v); }
      else if (st.chords.length < 4) st.chords = st.chords.concat(v);
    });
    chips($("pkMode"), ["follow", "tempo"], (v) => v === st.mode, (v) => (st.mode = v), (v) => (v === "follow" ? "Follow (waits for you)" : "Tempo (metronome)"));
    $("pkModeHint").textContent = st.mode === "follow"
      ? `${PATTERNS[st.pattern].tip} The lit note waits until you pick it correctly. Tap up to 4 chords; they play in order.`
      : `${PATTERNS[st.pattern].tip} Play along with the click. Get 85% of a loop right and it speeds up by 5 bpm.`;
  }

  $("pkStart").addEventListener("click", () => (st.running ? stop() : start()));
  return { render, stop, _st: st, _build: build };
})();
