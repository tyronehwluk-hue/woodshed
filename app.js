(function () {
  const $ = (id) => document.getElementById(id);
  const NAMES = Object.keys(CHORDS);
  const DAY = 86400000;

  // ---------- storage ----------
  const store = {
    get(k, d) { try { const v = localStorage.getItem("fw-" + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("fw-" + k, JSON.stringify(v)); } catch (e) {} },
  };
  const drills = () => store.get("drills", []); // {at, a, b, secs, n}
  const dayKey = (t) => { const d = new Date(t); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); };
  const pairName = (a, b) => [a, b].sort().join(" ↔ ");
  const pace = (d) => Math.round((d.n * 60) / d.secs);

  function streak() {
    const days = new Set(drills().map((d) => dayKey(d.at)));
    let n = 0, t = Date.now();
    if (!days.has(dayKey(t))) t -= DAY; // today not done yet still keeps yesterday's streak
    while (days.has(dayKey(t))) { n++; t -= DAY; }
    return n;
  }

  // ---------- routing ----------
  const ROUTES = ["home", "changes", "songs", "chords", "progress"];
  function route() {
    const r = ROUTES.includes(location.hash.slice(1)) ? location.hash.slice(1) : "home";
    ROUTES.forEach((x) => ($("view-" + x).hidden = x !== r));
    document.querySelectorAll(".nav a").forEach((a) => { if (a.dataset.route === r) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
    if (r !== "changes" && drill.phase !== "idle") finish(false);
    ({ home: renderHome, changes: renderDrill, songs: renderSongs, chords: renderChords, progress: renderProgress })[r]();
    window.scrollTo(0, 0);
  }
  window.addEventListener("hashchange", route);

  // ---------- shared bits ----------
  const ICON_PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
  function hue(str) { let h = 0; for (const ch of str) h = (h * 31 + ch.charCodeAt(0)) % 360; return h; }
  function coverStyle(str) { const h = hue(str); return `background: linear-gradient(135deg, hsl(${h} 65% 48%), hsl(${(h + 50) % 360} 70% 30%))`; }
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const KNOWN = () => NAMES.filter((n) => CHORDS[n].known);
  function songStatus(s) {
    const missing = s.chords.filter((c) => !KNOWN().includes(c));
    return { missing, ready: missing.length === 0 };
  }

  // ---------- home ----------
  function renderHome() {
    const h = new Date().getHours();
    $("greeting").textContent = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
    const all = drills(), weekAgo = Date.now() - 7 * DAY;
    $("homeStreak").textContent = streak();
    $("homeWeek").textContent = all.filter((d) => d.at > weekAgo).reduce((s, d) => s + d.n, 0);
    $("homePace").textContent = all.length ? Math.max(...all.map(pace)) : 0;

    const bestOf = (a, b) => Math.max(0, ...all.filter((d) => pairName(d.a, d.b) === pairName(a, b)).map(pace));
    const knownPairs = [["G", "C"], ["C", "D"], ["G", "D"], ["E", "D"], ["G", "E"], ["C", "E"]];
    knownPairs.sort((x, y) => bestOf(...x) - bestOf(...y));
    const newPairs = [["E", "Em"], ["C", "Am"], ["D", "A"], ["D", "Dm"]];
    const nextNew = newPairs.find((p) => bestOf(...p) < 20) || newPairs[0];
    const items = [
      { t: `${knownPairs[0][0]} to ${knownPairs[0][1]}`, s: "Chord changes · 60 sec · your slowest pair", pair: knownPairs[0] },
      { t: `${knownPairs[1][0]} to ${knownPairs[1][1]}`, s: "Chord changes · 60 sec", pair: knownPairs[1] },
      { t: `${nextNew[0]} to ${nextNew[1]}`, s: `New chord · 60 sec · learn ${nextNew[1]}`, pair: nextNew },
    ];
    $("setlist").innerHTML = "";
    items.forEach((it) => {
      const a = document.createElement("a");
      a.className = "row"; a.href = "#changes";
      a.innerHTML = `<span class="row-icon" style="${coverStyle(it.t)}">${esc(it.pair[0])}·${esc(it.pair[1])}</span><span class="row-main"><span class="row-title">${esc(it.t)}</span><span class="row-sub">${esc(it.s)}</span></span><span class="row-go">${ICON_PLAY}</span>`;
      a.addEventListener("click", () => { drill.a = it.pair[0]; drill.b = it.pair[1]; drill.secs = 60; savePrefs(); });
      $("setlist").appendChild(a);
    });

    const ready = SONGS.filter((s) => songStatus(s).ready).slice(0, 8);
    $("homeSongs").innerHTML = ready.map((s) => `<a class="tile" href="#songs"><span class="cover" style="${coverStyle(s.title)}">${esc(s.title)}</span><span class="tile-t">${esc(s.title)}</span><span class="tile-s">${esc(s.chords.join(" · "))}</span></a>`).join("");
  }

  // ---------- songs ----------
  let songFilter = "all";
  function renderSongs() {
    const filters = [["all", "All"], ["ready", "Play now"], ["near", "One chord away"]];
    $("songFilter").innerHTML = "";
    filters.forEach(([k, label]) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "chip"; b.textContent = label;
      b.setAttribute("aria-pressed", String(songFilter === k));
      b.addEventListener("click", () => { songFilter = k; renderSongs(); });
      $("songFilter").appendChild(b);
    });
    const q = $("songSearch").value.trim().toLowerCase();
    const list = SONGS.map((s) => ({ s, st: songStatus(s) }))
      .filter(({ s }) => !q || s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q) || s.chords.some((c) => c.toLowerCase() === q))
      .filter(({ st }) => songFilter === "all" || (songFilter === "ready" ? st.ready : st.missing.length === 1))
      .sort((a, b) => a.st.missing.length - b.st.missing.length);
    if (!list.length) { $("songList").innerHTML = `<p class="empty">No songs match "${esc(q)}". Try an artist, a title, or a chord like Am.</p>`; return; }
    $("songList").innerHTML = list.map(({ s, st }, i) => {
      const chips = s.chords.map((c) => `<span class="cpill ${st.missing.includes(c) ? "new" : ""}">${esc(c)}</span>`).join("");
      const label = st.ready ? `<span class="status ready">Play now</span>` : `<span class="status near">Learn ${esc(st.missing.join(", "))}</span>`;
      return `<div class="track"><span class="track-n">${i + 1}</span><span class="cover" style="${coverStyle(s.title)}">${esc(s.title.split(" ").map((w) => w[0]).join("").slice(0, 3))}</span><span class="track-main"><span class="track-t">${esc(s.title)}</span><span class="track-s">${esc(s.artist)}${s.note ? " · " + esc(s.note) : ""} · ${label}</span></span><span class="track-chords">${chips}</span></div>`;
    }).join("");
  }
  $("songSearch").addEventListener("input", renderSongs);

  // ---------- chord library ----------
  function renderChords() {
    $("chordGrid").innerHTML = "";
    NAMES.forEach((n) => {
      const c = CHORDS[n], d = document.createElement("div");
      d.className = "libcard";
      d.innerHTML = `<div class="nm">${n}</div><span class="st ${c.known ? "" : "new"}">${c.known ? "You know it" : "Learn next"}</span>${chordSVG(n)}<p></p>`;
      d.querySelector("p").textContent = c.tip;
      $("chordGrid").appendChild(d);
    });
  }

  // ---------- progress ----------
  function renderProgress() {
    const all = drills();
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const t = Date.now() - i * DAY, k = dayKey(t);
      const ds = all.filter((d) => dayKey(d.at) === k);
      days.push({ t, v: ds.length ? Math.max(...ds.map(pace)) : 0 });
    }
    if (!all.length) {
      $("chart").innerHTML = `<p class="empty">No drills yet. Finish a chord changes drill and your pace shows up here.</p>`;
    } else {
      const W = 640, H = 220, L = 34, B = 26, T = 12, max = Math.max(10, ...days.map((d) => d.v));
      const step = Math.ceil(max / 4 / 5) * 5, top = step * 4;
      const bw = (W - L - 8) / 14;
      let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Best changes per minute each day">`;
      for (let g = 0; g <= 4; g++) {
        const y = H - B - ((H - B - T) * g) / 4;
        s += `<line x1="${L}" x2="${W - 4}" y1="${y}" y2="${y}" stroke="#2c2c30"/><text x="${L - 6}" y="${y + 4}" text-anchor="end" font-size="11" font-family="DM Mono, monospace" fill="#a7a4a0">${g * step}</text>`;
      }
      days.forEach((d, i) => {
        const h = ((H - B - T) * d.v) / top, x = L + 4 + i * bw;
        if (d.v) s += `<rect x="${x + 3}" y="${H - B - h}" width="${bw - 6}" height="${h}" fill="${i === 13 ? "#ff5f7e" : "#ff8a4c"}" rx="6"/>`;
        if (d.v) s += `<text x="${x + bw / 2}" y="${H - B - h - 5}" text-anchor="middle" font-size="11" font-family="DM Mono, monospace" fill="#f4f2ee">${d.v}</text>`;
        if (i % 2 === 1 || i === 13) s += `<text x="${x + bw / 2}" y="${H - 8}" text-anchor="middle" font-size="11" font-family="DM Mono, monospace" fill="#a7a4a0">${i === 13 ? "today" : new Date(d.t).getDate()}</text>`;
      });
      $("chart").innerHTML = s + `</svg>`;
    }
    const pairs = {};
    all.forEach((d) => { const k = pairName(d.a, d.b); (pairs[k] = pairs[k] || []).push(d); });
    const keys = Object.keys(pairs);
    if (!keys.length) { $("pairTable").innerHTML = `<p class="empty">Each chord pair you drill gets a row here.</p>`; }
    else {
      let h = `<table><thead><tr><th>Pair</th><th>Best / min</th><th>Last / min</th><th>Drills</th></tr></thead><tbody>`;
      keys.sort((x, y) => Math.max(...pairs[y].map(pace)) - Math.max(...pairs[x].map(pace))).forEach((k) => {
        const p = pairs[k];
        h += `<tr><td>${k}</td><td class="n">${Math.max(...p.map(pace))}</td><td class="n">${pace(p[p.length - 1])}</td><td class="n">${p.length}</td></tr>`;
      });
      $("pairTable").innerHTML = h + `</tbody></table>`;
    }
  }
  $("resetBtn").addEventListener("click", () => { $("resetConfirm").hidden = false; });
  $("resetNo").addEventListener("click", () => { $("resetConfirm").hidden = true; });
  $("resetYes").addEventListener("click", () => { store.set("drills", []); $("resetConfirm").hidden = true; renderProgress(); });

  // ---------- drill ----------
  const drill = Object.assign({ a: "G", b: "C", secs: 60 }, store.get("prefs", {}), { phase: "idle", count: 0, left: 60, target: "a", started: false, timer: null });
  if (!CHORDS[drill.a] || !CHORDS[drill.b] || drill.a === drill.b) { drill.a = "G"; drill.b = "C"; }
  function savePrefs() { store.set("prefs", { a: drill.a, b: drill.b, secs: drill.secs }); }
  let detector = null;

  function heard(text, kind) { const h = $("heard"); h.textContent = text; h.className = "heard" + (kind ? " " + kind : ""); }

  function chips(el, vals, cur, pick, disabled, fmt) {
    el.innerHTML = "";
    vals.forEach((v) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "chip"; b.textContent = fmt ? fmt(v) : v;
      b.setAttribute("aria-pressed", String(v === cur));
      b.disabled = v === disabled || drill.phase !== "idle";
      b.addEventListener("click", () => { pick(v); savePrefs(); drill.left = drill.secs; renderDrill(); });
      el.appendChild(b);
    });
  }

  function bestFor() {
    const p = drills().filter((d) => pairName(d.a, d.b) === pairName(drill.a, drill.b) && d.secs === drill.secs);
    return p.length ? Math.max(...p.map((d) => d.n)) : null;
  }

  function renderDrill() {
    ["a", "b"].forEach((s) => {
      const el = $(s === "a" ? "cardA" : "cardB");
      el.innerHTML = `<div class="nm">${drill[s]}</div>${chordSVG(drill[s])}`;
      el.classList.toggle("lit", drill.phase === "running" && drill.target === s);
    });
    $("time").textContent = drill.phase === "idle" ? drill.secs : drill.left;
    $("count").textContent = drill.count;
    const b = bestFor(); $("best").textContent = b === null ? "–" : b;
    $("start").textContent = drill.phase === "idle" ? "Start" : "Stop";
    chips($("pickA"), NAMES, drill.a, (v) => (drill.a = v), drill.b);
    chips($("pickB"), NAMES, drill.b, (v) => (drill.b = v), drill.a);
    chips($("pickTime"), [30, 60, 90], drill.secs, (v) => (drill.secs = v), null, (v) => v + " sec");
  }

  function onLevel(rms, thr) {
    $("vu").style.width = Math.min(100, Math.sqrt(rms) * 220) + "%";
    $("vuMark").style.left = Math.min(100, Math.sqrt(thr) * 220) + "%";
  }

  function onStrum({ best, scores }) {
    if (drill.phase !== "running") return;
    const want = drill[drill.target], other = drill[drill.target === "a" ? "b" : "a"];
    const top = scores[best];
    const ok = (best === want || scores[want] >= top - 0.02) && scores[want] > scores[other] + 0.03;
    if (ok) {
      if (!drill.started) { drill.started = true; heard(`Heard ${want}. Now switch to ${other}.`, "ok"); }
      else {
        drill.count++;
        const ro = document.querySelector(".ro-main"); ro.classList.add("flash"); setTimeout(() => ro.classList.remove("flash"), 150);
        heard(`Clean ${want}! Now ${other}.`, "ok");
      }
      drill.target = drill.target === "a" ? "b" : "a";
      renderDrill();
    } else if (best === other || scores[other] > scores[want]) {
      heard(`Still hearing ${other}. Switch to ${want}.`, "bad");
    } else {
      heard(`That sounded more like ${best} than ${want}. Check your fingers and strum again.`, "bad");
    }
  }

  async function start() {
    drill.count = 0; drill.left = drill.secs; drill.target = "a"; drill.started = false;
    heard("Asking for your microphone…");
    try {
      detector = detector || new StrumDetector(onStrum, onLevel);
      await detector.start();
    } catch (e) {
      heard("I couldn't use your microphone. Allow mic access for this site in your browser settings, then press Start again.", "bad");
      return;
    }
    drill.phase = "countdown"; detector.calibrate(true); renderDrill();
    let n = 2;
    const cd = () => {
      if (drill.phase !== "countdown") return;
      if (n > 0) { heard(`Quiet for a moment, listening to the room… ${n}`); n--; drill.timer = setTimeout(cd, 1000); return; }
      detector.calibrate(false);
      drill.phase = "running";
      heard(`Go! Strum ${drill.a}.`);
      renderDrill();
      drill.timer = setInterval(() => {
        drill.left--; $("time").textContent = drill.left;
        if (drill.left <= 0) finish(true);
      }, 1000);
    };
    cd();
  }

  function finish(done) {
    clearTimeout(drill.timer); clearInterval(drill.timer);
    const was = drill.phase; drill.phase = "idle";
    if (detector) detector.stop();
    $("vu").style.width = "0";
    if (done && was === "running") {
      const prev = bestFor();
      const all = drills(); all.push({ at: Date.now(), a: drill.a, b: drill.b, secs: drill.secs, n: drill.count });
      store.set("drills", all.slice(-500));
      const perMin = Math.round((drill.count * 60) / drill.secs);
      heard(prev === null || drill.count > prev
        ? `New best: ${drill.count} clean changes (${perMin} a minute).`
        : `${drill.count} clean changes (${perMin} a minute). Your best is ${prev}.`, drill.count > (prev || 0) ? "ok" : "");
    } else {
      drill.count = 0; heard("Stopped. Press Start when you're ready.");
    }
    renderDrill();
  }

  $("start").addEventListener("click", () => (drill.phase === "idle" ? start() : finish(false)));

  // test hook
  window.__fw = { drill, onStrum };
  route();
})();
