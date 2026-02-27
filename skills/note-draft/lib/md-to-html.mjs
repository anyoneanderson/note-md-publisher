/**
 * Simple Markdown-to-HTML converter for note.com editor paste.
 *
 * Handles headings, paragraphs, bold, italic, links, code,
 * code blocks, tables, blockquotes, lists, and horizontal rules.
 *
 * Unlike markdown-converter.mjs (which uses remark and strips images),
 * this module is designed for the Playwright-based flow where images
 * are handled separately via editor UI uploads.
 */

/**
 * Convert a Markdown string to HTML.
 *
 * Filters out MDX-specific syntax (imports, JSX components).
 * Does NOT handle image references — those should be split out
 * beforehand via md-splitter.mjs.
 *
 * @param {string} md - Markdown source
 * @returns {string} HTML string
 */
export function mdToHtml(md) {
  const text = md
    .replace(/^import\s+.+$/gm, '')
    .replace(/^<[A-Z][A-Za-z0-9]*[\s\S]*?\/>\s*$/gm, '');

  const lines = text.split('\n');
  const parts = [];
  let i = 0;

  while (i < lines.length) {
    const trimmed = lines[i].trim();

    if (trimmed === '') {
      i++;
      continue;
    }

    // Fenced code blocks
    if (trimmed.startsWith('```')) {
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++;
      parts.push(
        `<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`
      );
      continue;
    }

    // Tables
    if (trimmed.startsWith('|')) {
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        const tl = lines[i].trim();
        if (!tl.match(/^\|[\s-:|]+\|$/)) rows.push(tl);
        i++;
      }
      parts.push(renderTable(rows));
      continue;
    }

    // Blockquotes
    if (trimmed.startsWith('> ')) {
      const qLines = [];
      while (i < lines.length && lines[i].trim().startsWith('> ')) {
        qLines.push(lines[i].trim().slice(2));
        i++;
      }
      parts.push(
        `<blockquote><p>${inlineFmt(qLines.join(' '))}</p></blockquote>`
      );
      continue;
    }

    // Unordered lists
    if (trimmed.match(/^[-*]\s+/)) {
      const items = [];
      while (i < lines.length && lines[i].trim().match(/^[-*]\s+/)) {
        items.push(lines[i].trim().replace(/^[-*]\s+/, ''));
        i++;
      }
      parts.push(
        '<ul>' + items.map((li) => `<li>${inlineFmt(li)}</li>`).join('') + '</ul>'
      );
      continue;
    }

    // Ordered lists
    if (trimmed.match(/^\d+\.\s+/)) {
      const items = [];
      while (i < lines.length && lines[i].trim().match(/^\d+\.\s+/)) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ''));
        i++;
      }
      parts.push(
        '<ol>' + items.map((li) => `<li>${inlineFmt(li)}</li>`).join('') + '</ol>'
      );
      continue;
    }

    // Headings
    if (trimmed.startsWith('### ')) {
      parts.push(`<h3>${inlineFmt(trimmed.slice(4))}</h3>`);
      i++;
      continue;
    }
    if (trimmed.startsWith('## ')) {
      parts.push(`<h2>${inlineFmt(trimmed.slice(3))}</h2>`);
      i++;
      continue;
    }

    // Horizontal rule
    if (trimmed === '---') {
      parts.push('<hr>');
      i++;
      continue;
    }

    // Paragraph
    parts.push(`<p>${inlineFmt(trimmed)}</p>`);
    i++;
  }

  return parts.join('\n');
}

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function inlineFmt(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

function renderTable(rows) {
  if (rows.length === 0) return '';
  let html = '<table>';
  rows.forEach((row, idx) => {
    const cells = row
      .split('|')
      .filter(Boolean)
      .map((c) => c.trim());
    const tag = idx === 0 ? 'th' : 'td';
    html +=
      '<tr>' +
      cells.map((c) => `<${tag}>${inlineFmt(c)}</${tag}>`).join('') +
      '</tr>';
  });
  html += '</table>';
  return html;
}
