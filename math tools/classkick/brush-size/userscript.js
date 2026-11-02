// ==UserScript==
// @name         Classkick Brush Size Memory v2
// @namespace    https://app.classkick.com/
// @version      2.0.0
// @description  Persist separate Classkick brush sizes across refresh, logout, and expired sessions (same browser).
// @match        https://app.classkick.com/*
// @run-at       document-idle
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(() => {
  'use strict';
  const KEY = 'classkick-brush-sizes-v2';
  const LEGACY = 'ck-brush-memory-v1';
  const patterns = {
    highlighter: /\b(highlighter|highlight)\b/i,
    eraser: /\b(eraser|erase)\b/i,
    pen: /\b(pen|pencil|draw|marker)\b/i,
    line: /\b(line tool|straight line|add line)\b/i
  };
  const controls = 'input[type="range"], input[type="number"], [role="slider"], md-slider';
  const clickable = 'button, [role="button"], [role="menuitem"], [role="option"], md-button, .md-button';
  const label = el => el ? [el.getAttribute('aria-label'), el.getAttribute('title'), el.getAttribute('data-tooltip'), el.getAttribute('md-tooltip'), el.getAttribute('data-testid'), el.getAttribute('placeholder'), el.textContent?.trim().slice(0, 65)].filter(Boolean).join(' ') : '';
  const toolOf = text => Object.keys(patterns).find(tool => patterns[tool].test(text)) || null;
  const safeJSON = text => { try { const value = JSON.parse(text); return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; } catch { return {}; } };
  let saved = safeJSON(GM_getValue(KEY, '{}'));
  if (!Object.keys(saved).length) saved = safeJSON(localStorage.getItem(LEGACY) || '{}');
  let tool = null;
  let restoring = false;
  let pending = false;
  let lastUserAction = 0;
  const applied = new WeakMap();

  function store(name, number) {
    const n = Number(number);
    if (!name || !Number.isFinite(n) || n <= 0 || n > 1000 || saved[name] === n) return;
    saved[name] = n;
    GM_setValue(KEY, JSON.stringify(saved));
    try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch {}
    console.debug('[Classkick Brush Memory] saved', name, n);
  }
  function isSize(el) {
    if (!(el instanceof Element) || !el.matches(controls)) return false;
    const words = [el, el.parentElement, el.parentElement?.parentElement].map(label).join(' ');
    return /\b(brush|size|width|thickness|stroke|weight|diameter)\b/i.test(words) ||
      (tool && (el.matches('input[type="range"],md-slider,[role="slider"]')));
  }
  function valueOf(el) {
    const raw = el.getAttribute('aria-valuenow') ?? el.value ?? el.getAttribute('value');
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  function setValue(el, value) {
    if (el instanceof HTMLInputElement) {
      const min = el.min ? Number(el.min) : -Infinity;
      const max = el.max ? Number(el.max) : Infinity;
      if (value < min || value > max) return false;
      const desc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
      if (!desc?.set) return false;
      desc.set.call(el, String(value));
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }
    // Angular Material and custom sliders require their app-specific handlers.
    return false;
  }
  function visible(el) { return el.getClientRects().length > 0; }
  function restore() {
    if (!tool || saved[tool] == null || restoring) return;
    const value = saved[tool];
    restoring = true;
    try {
      document.querySelectorAll(controls).forEach(el => {
        if (!visible(el) || !isSize(el) || applied.get(el) === `${tool}:${value}`) return;
        if (valueOf(el) === value || setValue(el, value)) applied.set(el, `${tool}:${value}`);
      });
      document.querySelectorAll('[role="menu"], [role="listbox"], .md-menu-content, [class*="brush"], [class*="thickness"], [class*="size-picker"]').forEach(group => {
        if (!visible(group)) return;
        for (const el of group.querySelectorAll(clickable)) {
          if (!visible(el) || applied.get(el) === `${tool}:${value}`) continue;
          const match = label(el).trim().match(/^(?:(?:size|width|thickness|stroke)\s*[:=-]?\s*)?(\d+(?:\.\d+)?)\s*(?:px|pt)?$/i);
          if (match && Number(match[1]) === value) { applied.set(el, `${tool}:${value}`); el.click(); break; }
        }
      });
    } finally { restoring = false; }
  }
  function requestRestore(delay = 120) {
    if (pending) return;
    pending = true;
    setTimeout(() => { pending = false; restore(); }, delay);
  }
  function selectedTool() {
    const selected = document.querySelectorAll('[aria-pressed="true"], [aria-selected="true"], .active, .selected, .md-checked');
    for (const item of selected) {
      if (!item.matches(clickable) && !item.closest(clickable)) continue;
      const candidate = item.closest(clickable) || item;
      const result = toolOf(label(candidate));
      if (result) return result;
    }
    return null;
  }
  function track(e) {
    if (restoring || !(e.target instanceof Element)) return;
    const el = e.target.closest(controls);
    if (tool && el && isSize(el)) store(tool, valueOf(el));
  }
  document.addEventListener('pointerdown', e => {
    if (!(e.target instanceof Element)) return;
    lastUserAction = Date.now();
    const control = e.target.closest(clickable);
    const name = toolOf(label(control));
    if (name) {
      tool = name;
      requestRestore(100);
      setTimeout(restore, 450);
      return;
    }
    if (tool && control && control.closest('[class*="size"], [class*="brush"], [class*="stroke"], [class*="thickness"], [role="menu"], [role="listbox"]')) {
      const m = label(control).trim().match(/(?:^|\b)(\d+(?:\.\d+)?)\s*(?:px|pt)?$/i);
      if (m) store(tool, Number(m[1]));
    }
  }, true);
  document.addEventListener('input', track, true);
  document.addEventListener('change', track, true);
  const observer = new MutationObserver(() => {
    if (!tool) tool = selectedTool();
    if (tool && Date.now() - lastUserAction > 200) requestRestore(180);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('pageshow', () => { tool = selectedTool() || tool; requestRestore(400); });
  tool = selectedTool();
  requestRestore(600);
  console.info('[Classkick Brush Memory v2] Ready. Sizes saved in Tampermonkey storage.');
})();
