import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve, dirname, extname } from 'node:path';
import matter from 'gray-matter';

/**
 * Load and parse a Markdown/MDX file with frontmatter.
 * @param {string} inputPath - File or directory path
 * @returns {Promise<ContentResult>}
 */
export async function loadContent(inputPath) {
  const absolutePath = resolve(inputPath);
  const filePath = await resolveFilePath(absolutePath);
  const raw = await readFile(filePath, 'utf-8');
  const { data: frontmatter, content: body } = matter(raw);

  const title = resolveTitle(frontmatter, body);
  const tags = Array.isArray(frontmatter.tags) ? frontmatter.tags : [];
  const imagePath = frontmatter.image
    ? resolve(dirname(filePath), frontmatter.image)
    : null;

  return {
    metadata: { title, tags, imagePath },
    body,
    filePath,
  };
}

/**
 * Resolve inputPath to an actual .md/.mdx file.
 * If directory, find the first MD/MDX file inside.
 */
async function resolveFilePath(inputPath) {
  const info = await stat(inputPath);
  if (info.isFile()) return inputPath;

  if (info.isDirectory()) {
    const files = await readdir(inputPath);
    const mdFile = files.find(
      (f) => extname(f) === '.md' || extname(f) === '.mdx'
    );
    if (!mdFile) {
      throw new Error(
        `ディレクトリ内にMD/MDXファイルが見つかりません: ${inputPath}`
      );
    }
    return resolve(inputPath, mdFile);
  }

  throw new Error(`パスが見つかりません: ${inputPath}`);
}

/**
 * Extract title from frontmatter or first h1 heading.
 */
function resolveTitle(frontmatter, body) {
  if (frontmatter.title) return frontmatter.title;

  const h1Match = body.match(/^#\s+(.+)$/m);
  if (h1Match) return h1Match[1].trim();

  return 'Untitled';
}
