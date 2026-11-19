// Learning path: units that each add one chord, with lessons that tick off
// automatically from chord-change drills and fingerpicking sessions.
window.Path = (function () {
  const $ = (id) => document.getElementById(id);
  const get = (k, d) => { try { const v = localStorage.getItem("fw-" + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
  const set = (k, v) => { try { localStorage.setItem("fw-" + k, JSON.stringify(v)); } catch (e) {} };
  const BASE = ["E", "D", "C", "G"];
  const PATTERN_NAMES = { arp: "Simple arpeggio", wave: "Up and down", roll: "Folk roll" };

  const ch = (a, b, goal) => ({ type: "changes", a, b, goal });
  const pk = (pattern, chords, goal, mode = "follow") => ({ type: "picking", pattern, chords, mode, goal });

  const UNITS = [
    { id: "u1", chord: null, title: "Your first four", blurb: "Make the chords you already know smooth and quick.",
      lessons: [ch("G", "C", 20), ch("C", "D", 20), ch("G", "D", 20), ch("E", "D", 20), pk("arp", ["G", "C"], 2)] },
    { id: "u2", chord: "Em", title: "E minor", blurb: "The easiest new chord: your E with one finger lifted.",
      lessons: [ch("E", "Em", 20), ch("G", "Em", 15), ch("Em", "C", 15), pk("arp", ["Em", "C"], 2), pk("arp", ["G", "Em"], 70, "tempo")] },
    { id: "u3", chord: "Am", title: "A minor", blurb: "Same shape as E, one string over. Unlocks a lot of songs.",
      lessons: [ch("C", "Am", 15), ch("G", "Am", 15), ch("Am", "Em", 15), pk("wave", ["Am", "C"], 2), pk("wave", ["Am", "G"], 65, "tempo")] },
    { id: "u4", chord: "A", title: "A major", blurb: "Three fingers squeezed onto fret 2.",
      lessons: [ch("D", "A", 15), ch("A", "G", 15), ch("A", "E", 15), pk("roll", ["A", "D"], 2)] },
    { id: "u5", chord: "Dm", title: "D minor", blurb: "Like D, with the top string dropped to fret 1.",
      lessons: [ch("D", "Dm", 15), ch("Dm", "Am", 15), ch("Dm", "C", 15), pk("wave", ["Dm", "Am"], 2)] },
    { id: "u6", chord: "F", title: "The F chord", blurb: "Your first partial barre. Coming once you've finished D minor.", soon: true, lessons: [] },
  ];
  UNITS.forEach((u) => u.lessons.forEach((l, i) => (l.id = `${u.id}-${i}`)));

  const same = (x, y) => x.length === y.length && x.every((v, i) => v === y[i]);
  const pairKey = (a, b) => [a, b].sort().join("|");

  function score(l) {
    if (l.type === "changes") {
      const ds = get("drills", []).filter((d) => pairKey(d.a, d.b) === pairKey(l.a, l.b));
      return ds.length ? Math.max(...ds.map((d) => Math.round((d.n * 60) / d.secs))) : 0;
    }
    const ps = get("picks", []).filter((p) => p.pattern === l.pattern && same(p.chords, l.chords) && p.mode === l.mode);
    if (!ps.length) return 0;
    return l.mode === "tempo" ? Math.max(...ps.map((p) => p.bestBpm || 0)) : Math.max(...ps.map((p) => p.loops || 0));
  }
  const done = (l) => score(l) >= l.goal;
  function unitState(i) {
    const u = UNITS[i];
    if (u.soon) return i === 0 || UNITS[i - 1].lessons.every(done) ? "soon" : "locked";
    const open = i === 0 || UNITS.slice(0, i).every((p) => p.soon || p.lessons.every(done));
    if (!open) return "locked";
    return u.lessons.every(done) ? "done" : "open";
  }

  // Chords you know: the starting four plus the chord of each finished unit.
  function learned() {
    return BASE.concat(UNITS.filter((u, i) => u.chord && unitState(i) === "done").map((u) => u.chord));
  }
  function learning() {
    const i = UNITS.findIndex((u, k) => u.chord && unitState(k) === "open");
    return i >= 0 ? UNITS[i].chord : null;
  }
  function sync() {
    const L = learned();
    Object.keys(CHORDS).forEach((n) => (CHORDS[n].known = L.includes(n)));
  }

  function title(l) {
    return l.type === "changes" ? `${l.a} to ${l.b}` : `${PATTERN_NAMES[l.pattern]} · ${l.chords.join(" then ")}`;
  }
  function goalText(l) {
    if (l.type === "changes") return `${l.goal} clean changes a minute`;
    return l.mode === "tempo" ? `Tempo mode at ${l.goal} bpm` : `${l.goal} full loops in Follow mode`;
  }
  function bestText(l) {
    const s = score(l);
    if (!s) return "Not tried yet";
    if (l.type === "changes") return `Best ${s} a minute`;
    return l.mode === "tempo" ? `Best ${s} bpm` : `Best ${s} loop${s === 1 ? "" : "s"}`;
  }

  function nextLessons(n) {
    const out = [];
    UNITS.forEach((u, i) => { if (unitState(i) === "open") u.lessons.forEach((l) => { if (!done(l)) out.push({ l, u }); }); });
    return out.slice(0, n);
  }

  function start(l) {
    if (l.type === "changes") { App.setDrill(l.a, l.b, 60); location.hash = "changes"; }
    else { Picking.setup(l.pattern, l.chords, l.mode, l.mode === "tempo" ? Math.max(50, l.goal - 15) : undefined); location.hash = "picking"; }
  }

  // ---------- completion tracking ----------
  function check() {
    const before = new Set(get("done", []));
    const nowDone = [];
    UNITS.forEach((u) => u.lessons.forEach((l) => { if (done(l)) nowDone.push(l.id); }));
    set("done", nowDone);
    const fresh = [];
    UNITS.forEach((u, i) => u.lessons.forEach((l) => { if (done(l) && !before.has(l.id)) fresh.push({ l, u, i }); }));
    sync();
    if (!fresh.length) return;
    const last = fresh[fresh.length - 1];
    const unitDone = last.u.lessons.every(done);
    const nextUnit = UNITS[last.i + 1];
    if (unitDone && nextUnit) toast(`Unit complete! ${nextUnit.soon ? "Next: " + nextUnit.title + " (coming soon)." : "You unlocked " + nextUnit.title + "."}`);
    else if (unitDone) toast("Unit complete!");
    else {
      const nx = nextLessons(1)[0];
      toast(`Lesson complete: ${title(last.l)}.${nx ? " Next: " + title(nx.l) + "." : ""}`);
    }
  }
  let toastTimer = null;
  function toast(text) {
    let t = $("toast");
    if (!t) { t = document.createElement("div"); t.id = "toast"; t.className = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
    t.textContent = text; t.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 5000);
  }

  // Banner on the practice pages when the current settings match an unfinished lesson.
  function banner(el, kind, s) {
    const l = UNITS.flatMap((u, i) => (unitState(i) === "open" || unitState(i) === "done" ? u.lessons : []))
      .find((x) => x.type === kind && (kind === "changes" ? pairKey(x.a, x.b) === pairKey(s.a, s.b) : x.pattern === s.pattern && same(x.chords, s.chords) && x.mode === s.mode));
    if (!l) { el.hidden = true; return; }
    el.hidden = false;
    el.innerHTML = `<span class="lb-dot ${done(l) ? "ok" : ""}"></span><span class="lb-main"><span class="lb-t">${done(l) ? "Lesson done" : "Lesson goal"}: ${goalText(l)}</span><span class="lb-s">${bestText(l)}</span></span><a class="more" href="#path">Path</a>`;
  }

  // ---------- render ----------
  const ICON = {
    done: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 16.2 5.3 12l-1.4 1.4 5.6 5.6L21 7.5l-1.4-1.4z"/></svg>',
    lock: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10V7a5 5 0 0 1 10 0v3h1a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1zm2 0h6V7a3 3 0 0 0-6 0z"/></svg>',
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>',
  };
  function render() {
    sync();
    const L = learned();
    $("pathKnown").innerHTML = L.map((c) => `<span class="cpill">${c}</span>`).join("") + (learning() ? `<span class="cpill new">${learning()} learning</span>` : "");
    const all = UNITS.flatMap((u) => u.lessons), n = all.filter(done).length;
    $("pathCount").textContent = `${n} of ${all.length} lessons done`;
    $("pathBar").style.width = Math.round((n / all.length) * 100) + "%";
    const box = $("pathUnits");
    box.innerHTML = "";
    UNITS.forEach((u, i) => {
      const stt = unitState(i);
      const sec = document.createElement("section");
      sec.className = `unit ${stt}`;
      const dn = u.lessons.filter(done).length;
      sec.innerHTML = `
        <div class="unit-head">
          <div class="unit-badge">${u.chord || "1–4"}</div>
          <div class="unit-text">
            <span class="unit-n">Unit ${i + 1}${stt === "done" ? " · complete" : stt === "locked" ? " · locked" : stt === "soon" ? " · coming soon" : ` · ${dn} of ${u.lessons.length}`}</span>
            <h2>${u.title}</h2>
            <p>${u.blurb}</p>
          </div>
          ${u.chord && !u.soon ? `<div class="unit-diagram">${chordSVG(u.chord)}</div>` : ""}
        </div>`;
      if (u.lessons.length) {
        const list = document.createElement("div");
        list.className = "lessons";
        u.lessons.forEach((l) => {
          const d = done(l), locked = stt === "locked";
          const row = document.createElement(locked ? "div" : "button");
          if (!locked) { row.type = "button"; row.addEventListener("click", () => start(l)); }
          row.className = `lesson ${d ? "done" : ""} ${locked ? "locked" : ""}`;
          row.innerHTML = `<span class="lesson-icon">${d ? ICON.done : locked ? ICON.lock : ICON.play}</span>
            <span class="lesson-main"><span class="lesson-t">${title(l)}</span><span class="lesson-s">${goalText(l)}${locked ? "" : " · " + bestText(l)}</span></span>
            <span class="lesson-kind">${l.type === "changes" ? "Changes" : "Picking"}</span>`;
          list.appendChild(row);
        });
        sec.appendChild(list);
      }
      if (stt === "locked") { const p = document.createElement("p"); p.className = "unit-lock"; p.textContent = `Finish Unit ${i} to unlock.`; sec.appendChild(p); }
      box.appendChild(sec);
    });
  }

  return { render, check, sync, banner, nextLessons, start, title, goalText, bestText, learned, learning, UNITS };
})();
