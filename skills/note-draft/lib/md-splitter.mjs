import { resolve } from 'node:path';

/**
 * Split Markdown body into alternating text and image sections.
 *
 * Text sections contain the raw Markdown between image references.
 * Image sections contain the resolved absolute path and alt text.
 *
 * @param {string} markdown - Markdown body (frontmatter already stripped)
 * @param {string} imageBase - Base directory to resolve image paths against
 * @returns {{ type: 'text', content: string }[] | { type: 'image', alt: string, path: string }[]}
 */
export function splitAtImages(markdown, imageBase) {
  const sections = [];
  let currentLines = [];

  for (const line of markdown.split('\n')) {
    const imgMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)/);
    if (imgMatch) {
      if (currentLines.length > 0) {
        sections.push({ type: 'text', content: currentLines.join('\n') });
        currentLines = [];
      }
      const imgPath = imgMatch[2];
      sections.push({
        type: 'image',
        alt: imgMatch[1],
        path: resolve(
          imageBase,
          imgPath.startsWith('/') ? imgPath.slice(1) : imgPath
        ),
      });
    } else {
      currentLines.push(line);
    }
  }

  if (currentLines.length > 0) {
    sections.push({ type: 'text', content: currentLines.join('\n') });
  }

  return sections;
}

/**
 * Check if a Markdown body contains inline image references.
 *
 * @param {string} markdown - Markdown body
 * @returns {boolean}
 */
export function hasBodyImages(markdown) {
  return /^!\[.*\]\(.*\)/m.test(markdown);
}
