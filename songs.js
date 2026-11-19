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
