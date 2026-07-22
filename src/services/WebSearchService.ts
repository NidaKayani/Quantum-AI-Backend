import { AppError } from '../utils/errors.js';

export type SearchSource = 'google' | 'youtube' | 'reddit';

export interface SearchHit {
  source: SearchSource;
  title: string;
  url: string;
  snippet: string;
  meta?: string;
}

export interface WebSearchResult {
  query: string;
  results: SearchHit[];
}

const USER_AGENT =
  'QuantumAI/1.0 (+https://github.com/QuantumLogicsLabs; educational research bot)';

const INVIDIOUS_INSTANCES = [
  'https://yewtu.be',
  'https://inv.nadeko.net',
  'https://invidious.fdn.fr',
  'https://vid.puffyan.us',
];

function decodeEntities(text: string): string {
  return text
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function resolveDuckDuckGoUrl(href: string): string {
  try {
    const url = new URL(href, 'https://duckduckgo.com');
    const uddg = url.searchParams.get('uddg');
    if (uddg) return decodeURIComponent(uddg);
    return url.toString();
  } catch {
    return href;
  }
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = 12_000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/json,*/*',
        ...(init.headers ?? {}),
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

/** Free web results via DuckDuckGo HTML (no API key). */
async function searchDuckDuckGo(
  query: string,
  limit: number,
  source: SearchSource
): Promise<SearchHit[]> {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const response = await fetchWithTimeout(url, { method: 'GET' });
  if (!response.ok) {
    throw new AppError(
      502,
      `DuckDuckGo search failed (${response.status})`,
      'SEARCH_PROVIDER_ERROR'
    );
  }

  const html = await response.text();
  const hits: SearchHit[] = [];
  const blocks =
    html.match(
      /<div class="result results_links[\s\S]*?(?=<div class="result results_links|<\/body>)/gi
    ) ?? [];

  for (const block of blocks) {
    if (hits.length >= limit) break;

    const linkMatch = block.match(
      /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i
    );
    if (!linkMatch) continue;

    const rawUrl = resolveDuckDuckGoUrl(linkMatch[1] ?? '');
    const title = decodeEntities(linkMatch[2] ?? '');
    if (!rawUrl || !title) continue;

    if (source === 'reddit' && !/reddit\.com/i.test(rawUrl)) continue;
    if (source === 'youtube' && !/(youtube\.com|youtu\.be)/i.test(rawUrl)) continue;

    const snippetMatch = block.match(
      /class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/(?:a|td|div)/i
    );
    const snippet = decodeEntities(snippetMatch?.[1] ?? '');

    hits.push({
      source,
      title,
      url: rawUrl,
      snippet,
    });
  }

  // Fallback simpler parse if block regex missed (DDG markup varies)
  if (!hits.length) {
    const linkRe =
      /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    let match: RegExpExecArray | null;
    while ((match = linkRe.exec(html)) !== null && hits.length < limit) {
      const rawUrl = resolveDuckDuckGoUrl(match[1] ?? '');
      const title = decodeEntities(match[2] ?? '');
      if (!rawUrl || !title) continue;
      if (source === 'reddit' && !/reddit\.com/i.test(rawUrl)) continue;
      if (source === 'youtube' && !/(youtube\.com|youtu\.be)/i.test(rawUrl)) continue;
      hits.push({ source, title, url: rawUrl, snippet: '' });
    }
  }

  return hits.slice(0, limit);
}

/** Reddit public JSON search (no API key). */
async function searchReddit(query: string, limit: number): Promise<SearchHit[]> {
  const url = new URL('https://www.reddit.com/search.json');
  url.searchParams.set('q', query);
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('sort', 'relevance');
  url.searchParams.set('type', 'link');

  const response = await fetchWithTimeout(url.toString(), {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new AppError(502, `Reddit search failed (${response.status})`, 'SEARCH_PROVIDER_ERROR');
  }

  const data = (await response.json()) as {
    data?: {
      children?: Array<{
        data?: {
          title?: string;
          url?: string;
          permalink?: string;
          selftext?: string;
          subreddit_name_prefixed?: string;
          score?: number;
        };
      }>;
    };
  };

  return (data.data?.children ?? [])
    .map((child) => child.data)
    .filter((post): post is NonNullable<typeof post> => Boolean(post?.title))
    .slice(0, limit)
    .map((post) => {
      const permalink = post.permalink
        ? `https://www.reddit.com${post.permalink}`
        : post.url ?? '';
      return {
        source: 'reddit' as const,
        title: String(post.title),
        url: permalink,
        snippet: String(post.selftext ?? '').slice(0, 300),
        meta: [post.subreddit_name_prefixed, post.score != null ? `${post.score} pts` : '']
          .filter(Boolean)
          .join(' · ') || undefined,
      };
    })
    .filter((hit) => hit.url);
}

type InvidiousVideo = {
  type?: string;
  title?: string;
  videoId?: string;
  author?: string;
  description?: string;
  publishedText?: string;
  lengthSeconds?: number;
};

/** YouTube via public Invidious instances, with DuckDuckGo fallback. */
async function searchYouTube(query: string, limit: number): Promise<SearchHit[]> {
  for (const base of INVIDIOUS_INSTANCES) {
    try {
      const url = `${base}/api/v1/search?q=${encodeURIComponent(query)}&type=video`;
      const response = await fetchWithTimeout(url, { headers: { Accept: 'application/json' } }, 8_000);
      if (!response.ok) continue;

      const data = (await response.json()) as InvidiousVideo[];
      if (!Array.isArray(data) || !data.length) continue;

      const hits = data
        .filter((item) => item.type === 'video' && item.videoId && item.title)
        .slice(0, limit)
        .map((item) => {
          const mins = item.lengthSeconds != null ? Math.floor(item.lengthSeconds / 60) : undefined;
          const secs =
            item.lengthSeconds != null ? String(item.lengthSeconds % 60).padStart(2, '0') : undefined;
          return {
            source: 'youtube' as const,
            title: String(item.title),
            url: `https://www.youtube.com/watch?v=${item.videoId}`,
            snippet: String(item.description ?? '').slice(0, 300),
            meta:
              [item.author, item.publishedText, mins != null ? `${mins}:${secs}` : '']
                .filter(Boolean)
                .join(' · ') || undefined,
          };
        });

      if (hits.length) return hits;
    } catch {
      // try next instance
    }
  }

  return searchDuckDuckGo(`site:youtube.com ${query}`, limit, 'youtube');
}

export class WebSearchService {
  async search(
    query: string,
    sources: SearchSource[] = ['google', 'youtube', 'reddit'],
    perSource = 5
  ): Promise<WebSearchResult> {
    const trimmed = query.trim();
    if (!trimmed) {
      throw new AppError(400, 'Search query is required', 'VALIDATION_ERROR');
    }

    const uniqueSources = [...new Set(sources)];
    const tasks = uniqueSources.map(async (source) => {
      if (source === 'google') {
        return searchDuckDuckGo(trimmed, perSource, 'google');
      }
      if (source === 'youtube') {
        return searchYouTube(trimmed, perSource);
      }
      try {
        return await searchReddit(trimmed, perSource);
      } catch {
        return searchDuckDuckGo(`site:reddit.com ${trimmed}`, perSource, 'reddit');
      }
    });

    const settled = await Promise.allSettled(tasks);
    const results: SearchHit[] = [];
    const errors: string[] = [];

    for (const outcome of settled) {
      if (outcome.status === 'fulfilled') {
        results.push(...outcome.value);
      } else {
        const message =
          outcome.reason instanceof Error ? outcome.reason.message : 'Search source failed';
        errors.push(message);
      }
    }

    if (!results.length && errors.length) {
      throw new AppError(502, errors[0] ?? 'Web search failed', 'SEARCH_PROVIDER_ERROR');
    }

    return { query: trimmed, results };
  }

  formatForContext(result: WebSearchResult): string {
    if (!result.results.length) return 'No live web results were found for this query.';
    return result.results
      .map(
        (hit, index) =>
          `[${index + 1}] (${hit.source.toUpperCase()}) ${hit.title}\nURL: ${hit.url}\n${hit.snippet}${
            hit.meta ? `\nMeta: ${hit.meta}` : ''
          }`
      )
      .join('\n\n');
  }
}

export const webSearchService = new WebSearchService();
