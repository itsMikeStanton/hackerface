// ── WRITING SECTION ───────────────────────────────────────────────────────────
export default {
  type: 'terminal',
  content: [
    ['bright', '[ WRITING ]'],
    ['dim',    '─'.repeat(36)],
    null,
    ['dim',    '> ls ~/writing/'],
    ['ok',     '  essays/   fiction/   notes/'],
    null,
    ['dim',    '> wc -w **/*.md'],
    ['',       '  ~47,000 words and counting'],
    null,
    ['bright', '  — archive coming soon —'],
  ],
};
