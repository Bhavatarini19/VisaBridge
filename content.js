// ── Color palette (cycles for new keywords) ────────────────────────────────
const COLOR_PALETTE = [
  { textColor: '#7B5000', bg: '#FFFDE7', border: '#F9A825' }, // yellow
  { textColor: '#BF360C', bg: '#FBE9E7', border: '#FF5722' }, // orange
  { textColor: '#B71C1C', bg: '#FFEBEE', border: '#F44336' }, // red
  { textColor: '#0D47A1', bg: '#E3F2FD', border: '#2196F3' }, // blue
  { textColor: '#4A148C', bg: '#F3E5F5', border: '#9C27B0' }, // purple
  { textColor: '#1B5E20', bg: '#E8F5E9', border: '#4CAF50' }, // green
  { textColor: '#006064', bg: '#E0F7FA', border: '#00BCD4' }, // cyan
  { textColor: '#4E342E', bg: '#EFEBE9', border: '#795548' }, // brown
];

const DEFAULT_KEYWORDS = [
  { word: 'visa',      colorIdx: 0 },
  { word: 'sponsor',   colorIdx: 1 },
  { word: 'citizen',   colorIdx: 2 },
  { word: 'security',  colorIdx: 3 },
  { word: 'clearance', colorIdx: 4 },
  { word: 'graduat',   colorIdx: 5 },
];

// ── State ──────────────────────────────────────────────────────────────────
let KEYWORDS = [];          // loaded from storage: [{ word, colorIdx }, ...]
let counts   = {};
let lastUrl  = location.href;
let lastProcessedText = '';

function getColor(idx) {
  return COLOR_PALETTE[idx % COLOR_PALETTE.length];
}

function resetCounts() {
  KEYWORDS.forEach(k => { counts[k.word] = 0; });
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ── Highlighting ───────────────────────────────────────────────────────────
function processTextNode(node) {
  const text = node.textContent;
  if (!text.trim() || !KEYWORDS.length) return;

  const alt   = KEYWORDS.map(k => escapeRegex(k.word)).join('|');
  const regex = new RegExp(`(${alt})(\\w*)`, 'gi');

  const parts = [];
  let last = 0, match, found = false;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(document.createTextNode(text.slice(last, match.index)));
    }

    const full = match[0];
    const kw   = KEYWORDS.find(k => full.toLowerCase().startsWith(k.word));

    if (kw) {
      counts[kw.word]++;
      const c    = getColor(kw.colorIdx);
      const mark = document.createElement('mark');
      mark.className  = 'kwf-mark';
      mark.dataset.kw = kw.word;
      mark.style.cssText = [
        `background:${c.bg}`,
        `color:${c.textColor}`,
        `border:1.5px solid ${c.border}`,
        'border-radius:3px',
        'padding:1px 5px',
        'font-weight:700',
        'font-style:normal',
      ].join(';');
      mark.textContent = full;
      parts.push(mark);
      found = true;
    } else {
      parts.push(document.createTextNode(full));
    }

    last = match.index + full.length;
  }

  if (!found) return;
  if (last < text.length) parts.push(document.createTextNode(text.slice(last)));

  const frag = document.createDocumentFragment();
  parts.forEach(p => frag.appendChild(p));
  node.parentNode.replaceChild(frag, node);
}

function walkAndHighlight(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      const tag = n.parentNode?.tagName?.toLowerCase() || '';
      if (['script', 'style', 'mark', 'noscript', 'textarea'].includes(tag)) {
        return NodeFilter.FILTER_REJECT;
      }
      if (n.parentNode?.classList?.contains('kwf-mark')) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const nodes = [];
  let n;
  while ((n = walker.nextNode())) nodes.push(n);
  nodes.forEach(processTextNode);
}

function clearHighlights() {
  document.querySelectorAll('.kwf-mark').forEach(m => {
    m.replaceWith(document.createTextNode(m.textContent));
  });
}

// ── Job description detection ──────────────────────────────────────────────
function getDescEl() {
  const specific = [
    '#job-details',
    '.jobs-description-content__text',
    '.jobs-description__content',
    '.jobs-description',
    '.jobs-box__html-content',
    '.jobs-details__main-content',
    'article.jobs-description__container',
  ];
  for (const s of specific) {
    const el = document.querySelector(s);
    if (el && (el.innerText || el.textContent || '').trim().length > 50) return el;
  }
  // Broad fallback
  for (const s of ['[class*="jobs-description"]', '[class*="job-details"]']) {
    for (const el of document.querySelectorAll(s)) {
      const text = (el.innerText || el.textContent || '').trim();
      if (text.length > 200 && el.querySelectorAll('p, li, ul, ol').length >= 2) return el;
    }
  }
  return null;
}

// ── Floating panel ─────────────────────────────────────────────────────────
function buildPanel() {
  let panel = document.getElementById('kwf-panel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'kwf-panel';
    document.body.appendChild(panel);
  }

  const total = KEYWORDS.reduce((s, k) => s + (counts[k.word] || 0), 0);

  const bodyHtml = total === 0
    ? `<div class="kwf-no-match">✓ No flagged keywords found</div>`
    : KEYWORDS
        .filter(k => (counts[k.word] || 0) > 0)
        .map(k => {
          const c = getColor(k.colorIdx);
          return `
            <div class="kwf-row">
              <span class="kwf-badge" style="background:${c.bg};color:${c.textColor};border:1.5px solid ${c.border}">
                ${k.word}*
              </span>
              <span class="kwf-num" style="color:${c.textColor}">${counts[k.word]}</span>
            </div>`;
        }).join('');

  const footHtml = total === 0
    ? ''
    : `<div class="kwf-foot">Total: <strong>${total}</strong> match${total !== 1 ? 'es' : ''}</div>`;

  panel.innerHTML = `
    <div class="kwf-head">
      <span>🔍 Keyword Finder</span>
      <button class="kwf-close-btn" id="kwf-close" title="Close">✕</button>
    </div>
    <div class="kwf-rows">${bodyHtml}</div>
    ${footHtml}
  `;

  panel.style.display = 'block';
  document.getElementById('kwf-close').addEventListener('click', () => {
    panel.style.display = 'none';
  });
}

// ── Main entry ─────────────────────────────────────────────────────────────
function tryProcess() {
  if (!KEYWORDS.length) return;
  const el = getDescEl();
  if (!el) return;

  const text = (el.innerText || el.textContent || '').trim();
  if (text.length < 30) return;
  if (text === lastProcessedText) return;

  clearHighlights();
  lastProcessedText = text;
  resetCounts();
  walkAndHighlight(el);
  buildPanel();

  try { chrome.runtime.sendMessage({ type: 'KWF_COUNTS', counts }); } catch (_) {}
}

let _timer;
function debouncedTryProcess() {
  clearTimeout(_timer);
  _timer = setTimeout(tryProcess, 600);
}

// ── Storage ────────────────────────────────────────────────────────────────
function loadKeywordsAndRun() {
  chrome.storage.local.get('kwf_keywords', result => {
    if (result.kwf_keywords && result.kwf_keywords.length > 0) {
      KEYWORDS = result.kwf_keywords;
    } else {
      KEYWORDS = DEFAULT_KEYWORDS;
      chrome.storage.local.set({ kwf_keywords: DEFAULT_KEYWORDS });
    }
    resetCounts();
    tryProcess();
  });
}

// When keywords are changed from the popup, re-scan immediately
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.kwf_keywords) {
    KEYWORDS = changes.kwf_keywords.newValue || [];
    clearHighlights();
    lastProcessedText = '';
    resetCounts();
    const panel = document.getElementById('kwf-panel');
    if (panel) panel.style.display = 'none';
    debouncedTryProcess();
  }
});

// ── Observers ──────────────────────────────────────────────────────────────
const observer = new MutationObserver(debouncedTryProcess);
observer.observe(document.body, { childList: true, subtree: true });

setInterval(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    clearHighlights();
    lastProcessedText = '';
    resetCounts();
    const panel = document.getElementById('kwf-panel');
    if (panel) panel.style.display = 'none';
  }
}, 400);

chrome.runtime.onMessage.addListener((msg, _sender, respond) => {
  if (msg.type === 'KWF_GET_COUNTS') respond({ counts, keywords: KEYWORDS });
});

// ── Boot ───────────────────────────────────────────────────────────────────
loadKeywordsAndRun();
