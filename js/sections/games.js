// ── GAMES SECTION ─────────────────────────────────────────────────────────────
// Terminal-style section for now. Convert to type:'panel' when there's a
// catalog to browse (see art.js for the panel shape).
export default {
  type: 'terminal',
  content: [
    ['bright', '[ GAMES ]'],
    ['dim',    '─'.repeat(36)],
    null,
    ['dim',    '> ls ~/games/'],
    ['ok',     '  project-alpha/    [IN DEV]'],
    ['ok',     '  void-crawler/     [SHIPPED]'],
    ['ok',     '  neon-tactics/     [SHIPPED]'],
    null,
    ['dim',    '> cat status.log'],
    ['',       '2 shipped  ·  1 in development'],
    ['',       'Platform: web, desktop'],
    null,
    ['bright', '  — projects coming soon —'],
  ],
};
