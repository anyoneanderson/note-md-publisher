import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkHtml from 'remark-html';

/**
 * Remove MDX-specific elements from markdown source before parsing.
 *
 * Filters out:
 * - import statements (lines starting with "import ")
 * - Self-closing JSX tags: <Component prop="value" />
 * - JSX tag pairs with non-standard HTML attributes (className, etc.)
 * - Image references: ![alt](src)
 *
 * @param {string} markdown - Raw markdown/MDX string
 * @returns {string} Cleaned markdown string
 */
function filterMdx(markdown) {
  const lines = markdown.split('\n');
  const filtered = [];
  let skipBlock = false;
  let skipTagName = null;

  for (const line of lines) {
    const trimmed = line.trimStart();

    // Skip import statements
    if (trimmed.startsWith('import ')) {
      continue;
    }

    // Skip image references: ![alt](src)
    if (/^!\[.*\]\(.*\)\s*$/.test(trimmed)) {
      continue;
    }

    // Skip self-closing JSX tags: <Component prop="value" />
    if (/^<[A-Z][A-Za-z0-9]*[\s\S]*\/>\s*$/.test(trimmed)) {
      continue;
    }

    // Detect opening JSX tags with non-standard attributes (className, etc.)
    // or PascalCase component tags (opening)
    if (!skipBlock) {
      const openMatch = trimmed.match(/^<([A-Za-z][A-Za-z0-9]*)[\s].*(?:className|onClick|onChange|onSubmit|htmlFor|tabIndex|dangerouslySetInnerHTML).*>\s*$/);
      if (openMatch) {
        skipBlock = true;
        skipTagName = openMatch[1];
        continue;
      }
    }

    // Detect closing tag matching the skipped opening tag
    if (skipBlock && skipTagName) {
      if (trimmed.startsWith(`</${skipTagName}>`)) {
        skipBlock = false;
        skipTagName = null;
        continue;
      }
      // Inside a skipped block, skip all lines
      continue;
    }

    filtered.push(line);
  }

  // Remove any remaining inline image references: ![alt](src)
  return filtered.join('\n').replace(/!\[[^\]]*\]\([^)]*\)/g, '');
}

/**
 * Convert a Markdown string to HTML suitable for note.com API.
 *
 * Handles MDX filtering (import statements, JSX components) before conversion.
 * Images are filtered out from the body content.
 *
 * @param {string} markdown - Markdown source string (frontmatter should already be stripped)
 * @returns {Promise<string>} HTML string
 */
export async function convert(markdown) {
  const cleaned = filterMdx(markdown);

  const result = await unified()
    .use(remarkParse)
    .use(remarkHtml, { sanitize: false })
    .process(cleaned);

  return String(result);
}
