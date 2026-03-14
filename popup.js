// ── Shared constants (must match content.js) ───────────────────────────────
const COLOR_PALETTE = [
  { textColor: '#7B5000', bg: '#FFFDE7', border: '#F9A825' },
  { textColor: '#BF360C', bg: '#FBE9E7', border: '#FF5722' },
  { textColor: '#B71C1C', bg: '#FFEBEE', border: '#F44336' },
  { textColor: '#0D47A1', bg: '#E3F2FD', border: '#2196F3' },
  { textColor: '#4A148C', bg: '#F3E5F5', border: '#9C27B0' },
  { textColor: '#1B5E20', bg: '#E8F5E9', border: '#4CAF50' },
  { textColor: '#006064', bg: '#E0F7FA', border: '#00BCD4' },
  { textColor: '#4E342E', bg: '#EFEBE9', border: '#795548' },
];

const DEFAULT_KEYWORDS = [
  { word: 'visa',      colorIdx: 0 },
  { word: 'sponsor',   colorIdx: 1 },
  { word: 'citizen',   colorIdx: 2 },
  { word: 'security',  colorIdx: 3 },
  { word: 'clearance', colorIdx: 4 },
  { word: 'graduat',   colorIdx: 5 },
];

function getColor(idx) {
  return COLOR_PALETTE[idx % COLOR_PALETTE.length];
}

// ── Tab switching ──────────────────────────────────────────────────────────
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
  });
});

// ── Helpers ────────────────────────────────────────────────────────────────
function normalizeWord(raw) {
  // Strip trailing * and whitespace, lowercase
  return raw.trim().toLowerCase().replace(/\*+$/, '');
}

function saveKeywords(keywords) {
  return new Promise(resolve => {
    chrome.storage.local.set({ kwf_keywords: keywords }, resolve);
  });
}

function loadKeywords() {
  return new Promise(resolve => {
    chrome.storage.local.get('kwf_keywords', result => {
      if (result.kwf_keywords && result.kwf_keywords.length > 0) {
        resolve(result.kwf_keywords);
      } else {
        chrome.storage.local.set({ kwf_keywords: DEFAULT_KEYWORDS });
        resolve(DEFAULT_KEYWORDS);
      }
    });
  });
}

// ── Render keyword management list ─────────────────────────────────────────
function renderManageList(keywords) {
  const container = document.getElementById('kw-manage-list');
  if (!keywords.length) {
    container.innerHTML = '<div class="status" style="padding:8px 0">No keywords yet. Add one below.</div>';
    return;
  }
  container.innerHTML = keywords.map((kw, i) => {
    const c = getColor(kw.colorIdx);
    return `
      <div class="kw-item">
        <span class="kw-item-badge" style="background:${c.bg};color:${c.textColor};border:1.5px solid ${c.border}">
          ${kw.word}*
        </span>
        <button class="kw-del-btn" data-idx="${i}" title="Delete">✕</button>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.kw-del-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const idx = parseInt(btn.dataset.idx);
      const kws = await loadKeywords();
      kws.splice(idx, 1);
      await saveKeywords(kws);
      renderManageList(kws);
    });
  });
}

// ── Add keyword ────────────────────────────────────────────────────────────
document.getElementById('kw-add-btn').addEventListener('click', async () => {
  const input = document.getElementById('kw-input');
  const errEl = document.getElementById('kw-error');
  const word  = normalizeWord(input.value);

  errEl.textContent = '';

  if (!word) {
    errEl.textContent = 'Please enter a keyword.';
    return;
  }
  if (word.length < 2) {
    errEl.textContent = 'Keyword must be at least 2 characters.';
    return;
  }

  const kws = await loadKeywords();

  if (kws.some(k => k.word === word)) {
    errEl.textContent = `"${word}" already exists.`;
    return;
  }

  const nextColorIdx = kws.length % COLOR_PALETTE.length;
  kws.push({ word, colorIdx: nextColorIdx });
  await saveKeywords(kws);

  input.value = '';
  renderManageList(kws);
});

// Allow pressing Enter in the input to add
document.getElementById('kw-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('kw-add-btn').click();
});

// ── Render results tab ─────────────────────────────────────────────────────
async function renderResults() {
  const resultsBody   = document.getElementById('results-body');
  const resultsFooter = document.getElementById('results-footer');

  const [tab] = await new Promise(r => chrome.tabs.query({ active: true, currentWindow: true }, r));

  if (!tab?.url?.includes('linkedin.com')) {
    resultsBody.innerHTML = '<div class="status">Navigate to a LinkedIn job listing to see keyword highlights.</div>';
    return;
  }

  chrome.tabs.sendMessage(tab.id, { type: 'KWF_GET_COUNTS' }, resp => {
    if (chrome.runtime.lastError || !resp) {
      resultsBody.innerHTML = '<div class="status">Click a job listing on LinkedIn first.</div>';
      return;
    }

    const { counts, keywords } = resp;
    if (!keywords || !keywords.length) {
      resultsBody.innerHTML = '<div class="status">No keywords configured.</div>';
      return;
    }

    const total = keywords.reduce((s, k) => s + (counts[k.word] || 0), 0);

    if (total === 0) {
      resultsBody.innerHTML = '<div class="status">No flagged keywords found in this job description.</div>';
      resultsFooter.textContent = '✓ No flags detected.';
      return;
    }

    resultsBody.innerHTML = keywords.map(kw => {
      const c   = getColor(kw.colorIdx);
      const cnt = counts[kw.word] || 0;
      return `
        <div class="kw-row ${cnt === 0 ? 'zero' : ''}">
          <span class="badge" style="background:${c.bg};color:${c.textColor};border:1.5px solid ${c.border}">
            ${kw.word}*
          </span>
          <span class="kw-count" style="color:${c.textColor}">${cnt}</span>
        </div>
      `;
    }).join('');

    resultsFooter.innerHTML = `Total: <strong>${total}</strong> match${total !== 1 ? 'es' : ''}`;
  });
}

// ── Init ───────────────────────────────────────────────────────────────────
(async () => {
  const kws = await loadKeywords();
  renderManageList(kws);
  renderResults();
})();
