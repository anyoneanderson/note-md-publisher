import { readFile, stat } from 'node:fs/promises';
import { basename, extname } from 'node:path';

const API_BASE = 'https://note.com/api';
const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif']);
const MIME_TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
};

/**
 * Upload a header image to note.com.
 * @param {string} imagePath - Absolute path to image file
 * @param {Record<string, string>} cookies - Session cookies
 * @returns {Promise<{ imageKey: string, imageUrl: string }>}
 */
export async function uploadImage(imagePath, cookies) {
  const ext = extname(imagePath).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new Error(
      `非対応の画像形式です: ${ext}（対応形式: JPEG, PNG, GIF）`
    );
  }

  const info = await stat(imagePath);
  if (info.size > MAX_SIZE) {
    throw new Error(
      `画像ファイルが大きすぎます: ${(info.size / 1024 / 1024).toFixed(1)}MB（上限: 10MB）`
    );
  }

  const buffer = await readFile(imagePath);
  const fileName = basename(imagePath);
  const mimeType = MIME_TYPES[ext];

  const blob = new Blob([buffer], { type: mimeType });
  const formData = new FormData();
  formData.append('file', blob, fileName);

  const cookieHeader = Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');

  const response = await fetch(`${API_BASE}/v1/upload_image`, {
    method: 'POST',
    headers: {
      Cookie: cookieHeader,
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(
      `画像アップロードに失敗しました: ${response.status} ${response.statusText} ${text}`
    );
  }

  const json = await response.json();
  if (!json.data?.key || !json.data?.url) {
    throw new Error(
      `画像APIの応答が想定外です: ${JSON.stringify(json)}`
    );
  }

  return {
    imageKey: json.data.key,
    imageUrl: json.data.url,
  };
}
