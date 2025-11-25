// src/lib/translateService.ts
const MYMEMORY_URL = "https://api.mymemory.translated.net/get";

export async function translateText(
  text: string,
  target: string,
  source = "auto"
): Promise<string> {
  if (!text.trim()) return text;

  try {
    const params = new URLSearchParams({
      q: text,
      langpair: `${source}|${target}`,
    });

    const res = await fetch(`${MYMEMORY_URL}?${params}`);
    if (!res.ok) return text;

    const data = await res.json();
    return data.responseData?.translatedText ?? text;
  } catch {
    return text;
  }
}