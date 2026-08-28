// src/vault/view.js — Vite seam for vault rendering (future: app.js delegates here)
// For now, app.js keeps the full renderVault/openVaultModal implementation and shims
// window.LumenLib.vault for tests. This module will house vaultCardHTML, vaultRowHTML,
// vaultWidgetHTML, renderVault, openVaultModal when the god-file is split.
export const VAULT_TYPES = [
  { id: 'link', label: 'Link', icon: '🔗' },
  { id: 'doc', label: 'Doc', icon: '📄' },
  { id: 'sheet', label: 'Sheet', icon: '📊' },
  { id: 'pdf', label: 'PDF', icon: '📕' },
  { id: 'image', label: 'Image', icon: '🖼️' },
  { id: 'video', label: 'Video', icon: '🎬' },
  { id: 'other', label: 'Other', icon: '📦' }
];
export function vaultTypeLabel(id){ const t=VAULT_TYPES.find(x=>x.id===id); return t? t.label : id; }
