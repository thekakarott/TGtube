const _BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8765";
const API = _BASE.endsWith("/api") ? _BASE : `${_BASE}/api`;

export function getThumbUrl(videoId: string, thumbs: any[]): string {
  if (videoId) return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  if (thumbs?.length) return thumbs[thumbs.length - 1]?.url || thumbs[0]?.url || "";
  return "";
}

export function getHighResThumb(videoId: string): string {
  if (!videoId) return "";
  return `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  album_art: string;
  duration: number;
}

async function getJSON(url: string): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(await res.text().catch(() => `${res.status}`));
    return res.json();
  } finally {
    clearTimeout(timeout);
  }
}

export const api = {
  getHome: (): Promise<any[]> => getJSON(`${API}/home`),

  search: (q: string, filter?: string): Promise<any> => {
    const params = new URLSearchParams({ q });
    if (filter) params.set("filter", filter);
    return getJSON(`${API}/search?${params}`);
  },

  getAlbum: (browseId: string): Promise<any> =>
    getJSON(`${API}/album?browseId=${encodeURIComponent(browseId)}`),

  getArtist: (channelId: string): Promise<any> =>
    getJSON(`${API}/artist?channelId=${encodeURIComponent(channelId)}`),

  getPlaylist: (listId: string): Promise<any> =>
    getJSON(`${API}/playlist?listId=${encodeURIComponent(listId)}`),

  getWatchQueue: (videoId: string): Promise<any> =>
    getJSON(`${API}/watch-queue?videoId=${encodeURIComponent(videoId)}`),

  getStreamUrl: async (videoId: string): Promise<string> => {
    const data = await getJSON(`${API}/stream-url?videoId=${videoId}`);
    if (!data.url) throw new Error("No stream URL");
    return data.url;
  },

  getLyrics: async (videoId: string): Promise<string> => {
    const data = await getJSON(`${API}/lyrics?videoId=${videoId}`);
    const l = data.lyrics;
    if (!l) return "";
    if (typeof l === "string") return l;
    if (l.lyrics && typeof l.lyrics === "string") return l.lyrics;
    return "";
  },

  streamUrl: (videoId: string) => `${API}/stream/${videoId}`,

  getSearchSuggestions: (q: string): Promise<string[]> =>
    getJSON(`${API}/search-suggestions?q=${encodeURIComponent(q)}`),

  getMoodsGenres: (): Promise<any[]> =>
    getJSON(`${API}/moods-genres`),

  getCharts: (country?: string): Promise<any> =>
    getJSON(`${API}/charts${country ? `?country=${country}` : ""}`),
};
