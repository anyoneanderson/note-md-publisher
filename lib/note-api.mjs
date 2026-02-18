/**
 * note.com API Client - 2-step article posting
 *
 * Step 1: POST /api/v1/text_notes  -> create article, get { id, key }
 * Step 2: PUT  /api/v1/text_notes/{articleId} -> update body, status, image
 *
 * @module note-api
 */

const BASE_URL = 'https://note.com/api/v1';
const MIN_REQUEST_INTERVAL_MS = 1000;
const MAX_RETRIES = 3;
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

/** Timestamp of the last HTTP request, used for rate limiting. */
let lastRequestTime = 0;

/**
 * Convert a cookies object to a Cookie header string.
 *
 * @param {Record<string, string>} cookies - { name: value } pairs
 * @returns {string} "name1=value1; name2=value2"
 */
function formatCookieHeader(cookies) {
  return Object.entries(cookies)
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');
}

/**
 * Build HTTP headers required by the note.com API.
 *
 * @param {Record<string, string>} cookies
 * @returns {Record<string, string>}
 */
function buildHeaders(cookies) {
  return {
    'Content-Type': 'application/json',
    'User-Agent': USER_AGENT,
    Cookie: formatCookieHeader(cookies),
  };
}

/**
 * Sleep for the given number of milliseconds.
 *
 * @param {number} ms
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Enforce the minimum interval between requests.
 * If less than MIN_REQUEST_INTERVAL_MS has passed since the last request,
 * wait for the remaining time before proceeding.
 */
async function enforceRateLimit() {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (lastRequestTime > 0 && elapsed < MIN_REQUEST_INTERVAL_MS) {
    await sleep(MIN_REQUEST_INTERVAL_MS - elapsed);
  }
}

/**
 * Map an HTTP status code to a descriptive Japanese error message.
 *
 * @param {number} status
 * @param {string} statusText
 * @param {string} [detail]
 * @returns {string}
 */
function formatErrorMessage(status, statusText, detail) {
  switch (status) {
    case 401:
      return 'Cookieが期限切れです。再認証してください';
    case 400:
      return `リクエストが不正です: ${detail || statusText}`;
    case 429:
      return 'レート制限に達しました。時間をおいて再実行してください';
    default:
      return `API通信エラー: ${status} ${statusText}`;
  }
}

/**
 * Fetch with exponential backoff retry.
 *
 * Retries on network errors and 5xx / 429 responses.
 * Non-retryable HTTP errors (4xx except 429) throw immediately.
 *
 * @param {string} url
 * @param {RequestInit} options
 * @param {number} [maxRetries=3]
 * @returns {Promise<Response>}
 */
async function fetchWithRetry(url, options, maxRetries = MAX_RETRIES) {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    await enforceRateLimit();

    try {
      lastRequestTime = Date.now();
      const response = await fetch(url, options);

      // Non-retryable client errors (except 429)
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        let detail = '';
        try {
          const body = await response.text();
          detail = body;
        } catch {
          // ignore parse errors
        }
        const message = formatErrorMessage(response.status, response.statusText, detail);
        throw new Error(message);
      }

      // Retryable: 429 or 5xx
      if (response.status === 429 || response.status >= 500) {
        if (attempt < maxRetries) {
          const backoff = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
          await sleep(backoff);
          continue;
        }
        const message = formatErrorMessage(response.status, response.statusText);
        throw new Error(message);
      }

      return response;
    } catch (error) {
      lastError = error;

      // If it is our own formatted error (from non-retryable branch), rethrow immediately
      if (error.message && (
        error.message.startsWith('Cookieが期限切れです') ||
        error.message.startsWith('リクエストが不正です') ||
        error.message.startsWith('レート制限に達しました') ||
        error.message.startsWith('API通信エラー')
      )) {
        throw error;
      }

      // Network error - retry with backoff
      if (attempt < maxRetries) {
        const backoff = Math.pow(2, attempt) * 1000;
        await sleep(backoff);
        continue;
      }
    }
  }

  throw lastError;
}

/**
 * Post an article to note.com using the 2-step flow.
 *
 * Step 1 creates the article and returns id + key.
 * Step 2 updates the article with body, status, and optional header image.
 *
 * @param {object} params
 * @param {string} params.htmlContent - Converted HTML body
 * @param {string} params.title - Article title
 * @param {string|null} [params.imageKey] - Image key from upload_image (eyecatch)
 * @param {"draft"|"published"} [params.status="draft"] - Publication status
 * @param {Record<string, string>} params.cookies - Session cookies
 * @param {string} params.username - note.com username for URL construction
 * @returns {Promise<{success: boolean, articleId: number, articleKey: string, noteUrl: string, status: string}>}
 */
export async function postArticle({
  htmlContent,
  title,
  imageKey = null,
  status = 'draft',
  cookies,
  username,
}) {
  const headers = buildHeaders(cookies);

  // --- Step 1: Create article ---
  const createUrl = `${BASE_URL}/text_notes`;
  const createBody = JSON.stringify({
    body: htmlContent,
    name: title,
    template_key: null,
  });

  const createResponse = await fetchWithRetry(createUrl, {
    method: 'POST',
    headers,
    body: createBody,
  });

  const createData = await createResponse.json();

  if (!createData?.data?.id || !createData?.data?.key) {
    throw new Error(
      `API通信エラー: 記事作成レスポンスに id または key が含まれていません。レスポンス: ${JSON.stringify(createData)}`
    );
  }

  const articleId = createData.data.id;
  const articleKey = createData.data.key;

  // --- Step 2: Update article ---
  const updateUrl = `${BASE_URL}/text_notes/${articleId}`;
  const updatePayload = {
    body: htmlContent,
    name: title,
    status,
  };
  if (imageKey) {
    updatePayload.eyecatch_image_key = imageKey;
  }

  await fetchWithRetry(updateUrl, {
    method: 'PUT',
    headers,
    body: JSON.stringify(updatePayload),
  });

  const noteUrl = `https://note.com/${username}/n/${articleKey}`;

  return {
    success: true,
    articleId,
    articleKey,
    noteUrl,
    status,
  };
}
