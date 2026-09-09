// ── VIEW STATE ───────────────────────────────────────────────────────────────
// One mutable bag shared by every module — a live binding can't be reassigned
// across module boundaries, so the fields hang off a plain object instead.
export const view = {
  state:          'BOOT',
  menuMode:       false,
  currentSection: null,
  inputBuffer:    '',
  hackQueue:      [],
  hackTimer:      null,
};
