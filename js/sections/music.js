// ── MUSIC SECTION ─────────────────────────────────────────────────────────────
export default {
  type: 'terminal',
  content: [
    ['bright', '[ MUSIC ]'],
    ['dim',    '─'.repeat(36)],
    null,
    ['dim',    '> ls ~/audio/'],
    ['ok',     '  tracks/   releases/   collabs/'],
    null,
    ['dim',    '> aplay --info'],
    ['',       '47 tracks  ·  4 EPs  ·  1 LP'],
    ['',       'ambient / electronic / experimental'],
    null,
    ['bright', '  — listen coming soon —'],
  ],
};
