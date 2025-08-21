// --- Elements
const themeBtn = document.getElementById('themeBtn');
const text = document.getElementById('text');
const maxLenEl = document.getElementById('maxLen');
const hardLimitEl = document.getElementById('hardLimit');
const copyBtn = document.getElementById('copyBtn');
const clearBtn = document.getElementById('clearBtn');

const charsEl = document.getElementById('chars');
const wordsEl = document.getElementById('words');
const linesEl = document.getElementById('lines');
const bytesEl = document.getElementById('bytes');

const fillEl = document.getElementById('fill');
const usedLabel = document.getElementById('usedLabel');
const remainingLabel = document.getElementById('remainingLabel');

// --- Emoji-safe character counting (grapheme clusters)
// Use Intl.Segmenter if available; fallback to Array.from (code points)
const seg = (typeof Intl !== 'undefined' && Intl.Segmenter)
    ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    : null;

function countGraphemes(str) {
    if (seg) {
        let c = 0;
        for (const _ of seg.segment(str)) c++;
        return c;
    }
    // Fallback: counts Unicode code points (good enough for most cases)
    return Array.from(str).length;
}

// Word counting: sequences of letters/numbers/apostrophes
function countWords(str) {
    const matches = str.match(/[\p{L}\p{N}’']+/gu);
    return matches ? matches.length : 0;
}

// Lines: split on \n, at least 1
function countLines(str) {
    return str.length ? str.split(/\n/).length : 1;
}

// UTF-8 byte length
function utf8Bytes(str) {
    // TextEncoder available in modern browsers
    return new TextEncoder().encode(str).length;
}

function clampToMax(str, max) {
    // Clamp by graphemes so we don't cut emojis in half
    if (max <= 0) return str;
    let out = '';
    let i = 0;
    if (seg) {
        for (const part of seg.segment(str)) {
            if (i >= max) break;
            out += part.segment;
            i++;
        }
        return out;
    } else {
        // Fallback: code points
        return Array.from(str).slice(0, max).join('');
    }
}

function updateStats() {
    const raw = text.value;
    const max = Math.max(0, parseInt(maxLenEl.value || '0', 10));
    const charCount = countGraphemes(raw);
    const wordCount = countWords(raw);
    const lineCount = countLines(raw);
    const byteCount = utf8Bytes(raw);

    charsEl.textContent = charCount;
    wordsEl.textContent = wordCount;
    linesEl.textContent = lineCount;
    bytesEl.textContent = byteCount;

    // Progress bar / labels
    const used = max ? Math.min(charCount, max) : charCount;
    const pct = max ? Math.min(100, (used / max) * 100) : 0;
    fillEl.style.width = max ? pct.toFixed(2) + '%' : '0%';
    usedLabel.textContent = max ? `${used} / ${max}` : `${charCount} chars`;
    const remaining = max ? (max - charCount) : 0;
    remainingLabel.textContent = max ? (remaining >= 0 ? `${remaining} left` : `${-remaining} over`) : 'No limit';

    // Colorize bar on overflow
    if (max && charCount > max) {
        fillEl.style.background = 'linear-gradient(90deg, var(--danger), #f59e0b)';
    } else {
        fillEl.style.background = 'linear-gradient(90deg, var(--accent), #8b5cf6)';
    }
}

// Input handling with optional hard limit
function handleInput() {
    const max = Math.max(0, parseInt(maxLenEl.value || '0', 10));
    if (hardLimitEl.checked && max > 0) {
        const currentCount = countGraphemes(text.value);
        if (currentCount > max) {
            // Clamp safely
            text.value = clampToMax(text.value, max);
        }
    }
    updateStats();
}

// Events
['input', 'keyup', 'change', 'paste'].forEach(ev => text.addEventListener(ev, handleInput));
maxLenEl.addEventListener('input', handleInput);
hardLimitEl.addEventListener('change', handleInput);

copyBtn.addEventListener('click', async () => {
    try {
        await navigator.clipboard.writeText(text.value);
        copyBtn.textContent = '✅ Copied';
        setTimeout(() => copyBtn.textContent = '📋 Copy', 1200);
    } catch {
        // Fallback
        text.select(); document.execCommand('copy');
        copyBtn.textContent = '✅ Copied';
        setTimeout(() => copyBtn.textContent = '📋 Copy', 1200);
    }
});

clearBtn.addEventListener('click', () => {
    text.value = '';
    updateStats();
});

// Theme toggle (persisted)
const THEME_KEY = 'cwuzma-charcounter-theme';
function applyTheme(mode) {
    document.body.classList.toggle('dark', mode === 'dark');
    themeBtn.textContent = document.body.classList.contains('dark') ? '☀️ Light Mode' : '🌙 Dark Mode';
}
function loadTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) applyTheme(saved);
}
themeBtn.addEventListener('click', () => {
    const next = document.body.classList.contains('dark') ? 'light' : 'dark';
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
});

// Init
loadTheme();
updateStats();
