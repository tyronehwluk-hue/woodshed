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
  const ROUTES = ["home", "changes", "chords", "progress"];
  function route() {
    const r = ROUTES.includes(location.hash.slice(1)) ? location.hash.slice(1) : "home";
    ROUTES.forEach((x) => ($("view-" + x).hidden = x !== r));
    document.querySelectorAll("nav a").forEach((a) => { if (a.dataset.route === r) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
    if (r !== "changes" && drill.phase !== "idle") finish(false);
    ({ home: renderHome, changes: renderDrill, chords: renderChords, progress: renderProgress })[r]();
    window.scrollTo(0, 0);
  }
  window.addEventListener("hashchange", route);

  // ---------- home ----------
  function renderHome() {
    $("todayDate").textContent = new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" });
    const all = drills(), weekAgo = Date.now() - 7 * DAY;
    $("homeStreak").textContent = streak();
    $("homeWeek").textContent = all.filter((d) => d.at > weekAgo).reduce((s, d) => s + d.n, 0);
    $("homePace").textContent = all.length ? Math.max(...all.map(pace)) : 0;

    // Suggest: weakest known pair, then one pair bringing in a new chord.
    const bestOf = (a, b) => Math.max(0, ...all.filter((d) => pairName(d.a, d.b) === pairName(a, b)).map(pace));
    const knownPairs = [["G", "C"], ["C", "D"], ["G", "D"], ["E", "D"], ["G", "E"], ["C", "E"]];
    knownPairs.sort((x, y) => bestOf(...x) - bestOf(...y));
    const newPairs = [["E", "Em"], ["C", "Am"], ["D", "A"], ["D", "Dm"]];
    const nextNew = newPairs.find((p) => bestOf(...p) < 20) || newPairs[0];
    const items = [
      { what: "Warm up: strum each chord you know 4 times, slowly", link: "#chords", label: "Chords" },
      { what: `Changes: ${knownPairs[0][0]} ↔ ${knownPairs[0][1]}, 60 sec (your slowest pair)`, pair: knownPairs[0] },
      { what: `Changes: ${knownPairs[1][0]} ↔ ${knownPairs[1][1]}, 60 sec`, pair: knownPairs[1] },
      { what: `New chord: ${nextNew[0]} ↔ ${nextNew[1]}, 60 sec`, pair: nextNew },
    ];
    $("setlist").innerHTML = "";
    items.forEach((it, i) => {
      const li = document.createElement("li");
      li.innerHTML = `<span class="n">${String(i + 1).padStart(2, "0")}</span><span class="what"></span>`;
      li.querySelector(".what").textContent = it.what;
      const a = document.createElement("a");
      if (it.pair) { a.href = "#changes"; a.textContent = "Go"; a.addEventListener("click", () => { drill.a = it.pair[0]; drill.b = it.pair[1]; drill.secs = 60; savePrefs(); }); }
      else { a.href = it.link; a.textContent = it.label; }
      li.appendChild(a); $("setlist").appendChild(li);
    });
  }

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
        s += `<line x1="${L}" x2="${W - 4}" y1="${y}" y2="${y}" stroke="#2d2a24"/><text x="${L - 6}" y="${y + 4}" text-anchor="end" font-size="11" font-family="DM Mono, monospace" fill="#a49d8f">${g * step}</text>`;
      }
      days.forEach((d, i) => {
        const h = ((H - B - T) * d.v) / top, x = L + 4 + i * bw;
        if (d.v) s += `<rect x="${x + 3}" y="${H - B - h}" width="${bw - 6}" height="${h}" fill="${i === 13 ? "#e2412f" : "#c8a457"}" rx="2"/>`;
        if (d.v) s += `<text x="${x + bw / 2}" y="${H - B - h - 5}" text-anchor="middle" font-size="11" font-family="DM Mono, monospace" fill="#efe9dc">${d.v}</text>`;
        if (i % 2 === 1 || i === 13) s += `<text x="${x + bw / 2}" y="${H - 8}" text-anchor="middle" font-size="11" font-family="DM Mono, monospace" fill="#a49d8f">${i === 13 ? "today" : new Date(d.t).getDate()}</text>`;
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
