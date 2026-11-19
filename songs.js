// Luk's "Guitar" Spotify playlist (19 songs, read 2026-11-19).
// Chord names and capo only, never lyrics. Source: Ultimate Guitar chord pages.
// Chords are simplified to open shapes (Cadd9 -> C, Em7 -> Em, Dsus4 -> D) and, where it
// helps, moved to an easier key. `capo` is the fret that keeps the same pitch as the
// Ultimate Guitar version. `partial` means only the intro/verse chords were readable.
window.SONGS = [
  { title: "The One That Got Away", artist: "Katy Perry", chords: ["C", "Em", "Am", "F"], capo: 4, partial: true },
  { title: "Perfect", artist: "Ed Sheeran", chords: ["G", "Em", "C", "D"], capo: 1, partial: true },
  { title: "Something Just Like This", artist: "The Chainsmokers, Coldplay", chords: ["C", "D", "Em", "G"], capo: 7, partial: true },
  { title: "There's Nothing Holdin' Me Back", artist: "Shawn Mendes", chords: ["C", "Em", "D", "G"], capo: 5, partial: true },
  { title: "Someone You Loved", artist: "Lewis Capaldi", chords: ["G", "D", "Em", "C"], capo: 5, partial: true },
  { title: "I Want It That Way", artist: "Backstreet Boys", chords: ["Em", "C", "G", "D"], capo: 2, note: "one passing chord left out" },
  { title: "Viva La Vida", artist: "Coldplay", chords: ["C", "D", "G", "Em"], capo: 1 },
  { title: "A Sky Full of Stars", artist: "Coldplay", chords: ["Em", "C", "G", "D"], capo: 5, partial: true },
  { title: "Payphone", artist: "Maroon 5, Wiz Khalifa", chords: ["C", "G", "Em", "D"], capo: 0, partial: true },
  { title: "Hong Kong (feat. 王菲季候風)", artist: "The Weeknd", chords: [], note: "too new, no chords online yet" },
  { title: "晴天", artist: "Jay Chou", chords: ["Em", "C", "G", "D"], capo: 0, partial: true, note: "intro only so far" },
  { title: "童話", artist: "Michael Wong", chords: ["G", "Em", "C", "D"], capo: 0, partial: true },
  { title: "就算世界無童話", artist: "Janice Vidal", chords: [], note: "no chord sheet found yet" },
  { title: "A Thousand Years", artist: "James Arthur", chords: [], note: "chord page couldn't be read" },
  { title: "drunk text", artist: "Henry Moodie", chords: ["C", "Em", "Am", "F"], capo: 0, partial: true },
  { title: "pick up the phone", artist: "Henry Moodie", chords: ["C", "Em", "D", "G"], capo: 5, partial: true },
  { title: "Rewrite The Stars", artist: "James Arthur, Anne-Marie", chords: ["G", "D", "Em"], capo: 0, partial: true },
  { title: "In The Stars", artist: "Benson Boone", chords: [], note: "chord page couldn't be read" },
  { title: "Imagination", artist: "Shawn Mendes", chords: ["Em", "C", "G", "D"], capo: 5, note: "main loop; the bridge adds harder chords" },
];

// ---------- full charts for play-along ----------
// Each chart is typed from a chord sheet (chord names only), then simplified to open
// shapes and moved by `shift` semitones into the key of the shapes above.
(function () {
  const NAMES = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
  const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function simple(ch, shift) {
    const m = /^([A-G])([#b]?)(m(?!aj))?/.exec(ch);
    if (!m) return ch;
    const pc = (PC[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0) + shift + 24) % 12;
    return NAMES[pc] + (m[3] ? "m" : "");
  }
  window.makeChart = function (opts) {
    const shift = opts.shift || 0;
    return {
      bpm: opts.bpm, beats: opts.beats || 4, src: opts.src,
      sections: opts.sections.map(([name, text, own]) => ({
        name,
        lines: text.split("|").map((l) => l.trim().split(/\s+/).filter((c) => /^[A-G]/.test(c)).map((c) => simple(c, own === undefined ? shift : own)).join(" ")).filter(Boolean),
      })),
    };
  };
  const by = (t) => window.SONGS.find((s) => s.title === t);
  const add = (t, opts) => {
    const s = by(t); if (!s) return;
    s.chart = makeChart(opts); s.partial = false;
    if (opts.capo !== undefined) s.capo = opts.capo;
    if (opts.note !== undefined) s.note = opts.note;
    // the chord list on the Songs page now covers the whole song
    const seen = []; s.chart.sections.forEach((x) => x.lines.forEach((l) => l.split(" ").forEach((c) => { if (!seen.includes(c)) seen.push(c); })));
    s.chords = seen;
  };

  add("Perfect", { bpm: 63, src: "Chordify / Guitartwitt", sections: [
    ["Intro", "G"],
    ["Verse 1", "G Em | C D | G Em | C D"],
    ["Pre-chorus", "G | Em C G D | G Em | C D"],
    ["Chorus", "Em C G D Em | C G D Em | C G D Em | C G D G | G D/F# Em D | C D"],
    ["Verse 2", "G Em | C D | G Em | C D"],
    ["Pre-chorus", "G Em | C G D | G Em | C D"],
    ["Chorus", "Em C G D Em | C G D Em | C G D | Em C G D G"],
    ["Interlude", "G G Em Em | C C D D"],
    ["Chorus", "Em C G D Em | C G D Em | C G D Em | C G D"],
    ["Outro", "G/B C | Dsus4 D G | G D/F# Em D | C D | G"],
  ] });
  add("Someone You Loved", { bpm: 110, shift: 7, capo: 6, src: "Guitartwitt", note: "", sections: [
    ["Intro", "C G Am F"],
    ["Verse 1", "C G Am F | C G Am F | C G | Am F | C G | Am F"],
    ["Chorus", "C G | Am F | C G | Am F"],
    ["Verse 2", "C G Am F | C G Am F | C G Am F | C G | Am F"],
    ["Chorus", "C G | Am F | C G | Am F"],
    ["Bridge", "Dm Am G | Am Dm | Am G"],
    ["Chorus", "C G | Am F | C G | Am F"],
    ["Chorus", "C G | Am F | C G | Am F"],
    ["Outro", "C G | Am F C"],
  ] });

  add("Viva La Vida", { bpm: 138, capo: 1, src: "Guitartwitt", note: "Bm comes once at the end of each chorus", sections: [
    ["Intro", "C D G Em | C D G Em"],
    ["Verse 1", "Em C D | G Em | C D | G Em"],
    ["Interlude", "C D G Em | C D G Em"],
    ["Verse 2", "Em C D | G Em | C D | G Em | Em C D | G Em | C D | G Em"],
    ["Chorus", "C D | G Em | C D | G Em | C D | G Em | C D | Bm Em"],
    ["Interlude", "C D G Em | C D G Em"],
    ["Verse 3", "Em C D | G Em | C D | G Em | Em C D | G Em | C D | G Em"],
    ["Chorus", "C D | G Em | C D | G Em | C D | G Em | C D | Bm Em"],
    ["Bridge", "C Em | C Em | C Em | D D C D G Em | C Em | C Em | C Em | D D C D G Em"],
    ["Chorus", "C D | G Em | C D | G Em | C D | G Em | C D | Bm Em"],
    ["Outro", "C D Bm Em | C D Bm Em"],
  ] });

  const PAY_CH = "Cadd9 G | Em7 Dsus4 | Cadd9 | G Em7 Dsus4 | Cadd9 G | Em7 Dsus4 | Cadd9 G | Em7 Dsus4";
  add("Payphone", { bpm: 110, capo: 4, src: "guitartabs.cc", note: "", sections: [
    ["Intro", "Cadd9 G | Em7 Dsus4 | Cadd9 | G Em7 Dsus4"],
    ["Verse 1", "Cadd9 | G Em7 | Dsus4 Cadd9 | G Em7 | Dsus4 Cadd9"],
    ["Pre-chorus", "G Em7 | Dsus4 Cadd9 G | Em7 Dsus4"],
    ["Chorus", PAY_CH],
    ["Verse 2", "Cadd9 G | Em7 Dsus4 | Cadd9 G | Em7 Dsus4 Cadd9"],
    ["Pre-chorus", "G Em7 | Dsus4 Cadd9 G | Em7 Dsus4"],
    ["Chorus", PAY_CH],
    ["Rap verse", "G | Em7 | Dsus4 | Cadd9 | G | Em7 | Dsus4 | Cadd9 | G Em7 | Dsus4 | Cadd9 | G Em7 | Dsus4"],
    ["Chorus", PAY_CH + " | Cadd9"],
  ] });

  add("The One That Got Away", { bpm: 134, capo: 4, src: "guitartabs.cc", sections: [
    ["Verse 1", "C | Em | Am F | C | Em | Am F"],
    ["Chorus", "C Am | Em F | C Em | Am F | F"],
    ["Verse 2", "C | Em | Am F | C | Em | Am F"],
    ["Chorus", "C Em | Am F | C Em | Am F | F | C Em Am | F"],
    ["Bridge", "G Am F | G Am F | G Am F | G"],
    ["Chorus", "C Em | Am F | C Em | Am F | F"],
    ["Tag", "Em Am F | C Em | Am F | C"],
  ] });

  add("Something Just Like This", { bpm: 103, shift: 5, capo: 4, beats: 2, src: "GuitarTabsExplorer", note: "", sections: [
    ["Intro", "G A Bm A G A Bm"],
    ["Verse 1", "D G | A Bm | D G | A Bm | D G | A Bm | D G Bm"],
    ["Pre-chorus", "A | G A Bm | A G | A Bm | A G | A Bm | A G | A Bm"],
    ["Build", "A G | A Bm | A G | A Bm | A G | A Bm | A G | A Bm"],
    ["Chorus", "F#m | D G A Bm"],
    ["Drop", "D G Bm A | D G Bm A | D G Bm A"],
    ["Verse 2", "D G | A Bm | D G | A Bm | D G | A Bm | D G A Bm"],
    ["Pre-chorus", "A | G A Bm | A G | A Bm | A G | A Bm | A G | A Bm"],
    ["Chorus", "F#m | D G A Bm"],
    ["Drop", "D G Bm A | D G Bm A | D G Bm A"],
    ["Bridge", "D G | D Bm | D G | D Bm | D G | D Bm | D G | D Bm"],
    ["Build", "D | G D Bm | D G | D Bm | D G | D Bm | D G | D Bm | D G A Bm"],
    ["Drop", "D G A Bm | D G A Bm | D G A Bm"],
    ["Chorus", "D G A Bm"],
    ["Outro", "D G A Bm | D G A Bm | D G A Bm | D G A Bm"],
  ] });

  const TN_CH = "G D | Bm D | A D | A D | G D Bm D | A D | A D | G D Bm D A D | A D | G D Bm D A D | A D";
  add("There's Nothing Holdin' Me Back", { bpm: 122, shift: 5, capo: 7, beats: 2, src: "GuitarTabsExplorer", note: "", sections: [
    ["Intro", "G Bm A"],
    ["Verse 1", "G D Bm D | A D A D | G D Bm D | A D A D"],
    ["Pre-chorus", "G D Bm D A D | G D Bm D A D | A"],
    ["Chorus", TN_CH],
    ["Verse 2", "D Bm D A | D A D | G D Bm D A | D A D"],
    ["Pre-chorus", "G D Bm D A D | G D Bm D A D"],
    ["Chorus", TN_CH],
    ["Bridge", "G D Bm | D A D A D | G D Bm | D A D A D | G D Bm | D A D A | G D Bm | D A D A D"],
    ["Chorus", TN_CH],
  ] });

  add("I Want It That Way", { bpm: 99, capo: 2, src: "Guitartwitt", note: "", sections: [
    ["Intro", "Em C G | Em C G"],
    ["Verse 1", "Em C G | Em C G | Em C G | Em D G | Em C G Em | C G Em | C G | Em D G"],
    ["Chorus", "C D Em | C D Em | C D G | Em D G"],
    ["Verse 2", "Em C G Am | Em C G | Em C G | Em D G"],
    ["Chorus", "C D Em | C D Em | C D G | Em D Bm"],
    ["Bridge", "Em | G/D | C Am D | Em | G/D | C D"],
    ["Verse 3", "Em C G | Em C G | C D G Em D"],
    // the sheet writes this part in sounding pitch, so move it back to capo-2 shapes
    ["Chorus", "D | D E F#m | D E F#m | D E A | F#m E A", -2],
    ["Chorus", "D E F#m | D E F#m | D E A | F#m E A | D E F#m | D E F#m | D E A | F#m E A", -2],
    ["Outro", "F#m E A", -2],
  ] });

  add("A Sky Full of Stars", { bpm: 125, shift: 6, capo: 6, src: "guitartabs.cc", note: "", sections: [
    ["Intro", "D#m F# F# A#m7 | D#m F# F# A#m7"],
    ["Verse 1", "D#m F# A#m7 | D#m F# A#m7 | D#m F# A#m7 | D#m F# A#m7"],
    ["Chorus", "D#m B F# A#m7 | D#m B F# A#m7 | D#m F# A#m7 | D#m B F# A#m7"],
    ["Drop", "D#m B F# A#m7 | D#m B F# A#m7 | D#m B F# A#m7 | D#m B F# A#m7"],
    ["Verse 2", "D#m F# A#m7 | D#m F# A#m7 | D#m F# A#m7 | D#m F# A#m7"],
    ["Chorus", "D#m B F# A#m7 | D#m B F# A#m7 | D#m F# A#m7 | D#m B F# A#m7 | D#m B F# A#m7"],
    ["Drop", "D#m B F# A#m7 | D#m B F# A#m7 | D#m B F# A#m7 | D#m B F# A#m7 | B C# D#m | B C# D#m"],
    ["Outro", "B C# D#m | B C# D#m | B C# D#m | B C# D#m"],
  ] });

  add("drunk text", { bpm: 70, shift: 7, capo: 5, src: "GuitarTabsExplorer", note: "has a few barre chords (Cm, Gm)", sections: [
    ["Verse 1", "F | Fm | Fm | C | F | Fm | Fm | C G"],
    ["Pre-chorus", "F | Fm | Gm | Gm | C G"],
    ["Chorus", "F | Fm | Gm | C G | F | Fm | Gm | C Cm"],
    ["Verse 2", "F | Fm | Fm | C | F | Fm | Fm | C G"],
    ["Chorus", "F | Fm | Gm | C G | F | Fm | Gm | C Cm"],
    ["Bridge", "Gm | G | Fm C | Gm | G | F | Fm | C Cm"],
    ["Ending", "F | Fm | Gm | C Cm"],
  ] });

  add("Rewrite The Stars", { bpm: 125, capo: 0, src: "GuitarTabsExplorer", note: "", sections: [
    ["Intro", "G C"],
    ["Verse 1", "G | C | G | C | D Em | C | D | Em | C"],
    ["Chorus", "Em C | G D | Em C | G D | Em C | G D | Em C | G D G Am Em D"],
    ["Verse 2", "G C | G C | G C | G C | D Em | C D | Em | C"],
    ["Chorus", "Em C | G D | Em C | G D | Em C | G D | Em C | G D Em"],
    ["Bridge", "C G | D Em | Bm C | C | Em C"],
    ["Chorus", "Em C | G D | Em C | G D | Em C | G D | Em C | G D Em C G C"],
    ["Ending", "G C | G C | G C | G C G C"],
  ] });

  add("童話", { bpm: 68, shift: 1, capo: 0, src: "UkuTabs", note: "half a step above the record; the last choruses change key on the record but stay in G here", sections: [
    ["Intro", "Gb Ebm B Db"],
    ["Verse", "Gb | Ebm | B Db | Gb | Ebm | B Db"],
    ["Pre-chorus", "Bbm | Ebm | B Db | Bbm | Ebm | B | Db"],
    ["Chorus", "Gb | Bbm | Ebm Gb | B | Db Gb | B | Db | Gb Ebm | B Db Gb"],
    ["Pre-chorus", "Bbm | Ebm | B Db | Bbm | Ebm | B | Db"],
    ["Chorus", "Gb | Bbm | Ebm Gb | B | Db Gb | B | Db | Gb Ebm | B Db Gb"],
    ["Chorus", "Ab | Cm | Fm Ab | Db | Eb Ab | Db | Eb | Ab Fm | Db Eb Ab", -1],
    ["Chorus", "Bb | Dm | Gm Bb | Eb | F Bb | Eb | F | Bb Gm | Eb F Bb", -3],
    ["Outro", "Eb F Bb", -3],
  ] });
})();
