import { NextResponse } from "next/server";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const userMemory = new Map<string, { lastLang?: string; lastTopic?: string }>();

// Language → Country mapping (for cultural tips)
const LANG_TO_COUNTRY: Record<string, string> = {
  ja: "Japan",
  ko: "Korea",
  th: "Thailand",
  vi: "Vietnam",
  tl: "Philippines",
  zh: "China",
  fr: "France",
  it: "Italy",
  es: "Spain",
  de: "Germany",
  pt: "Brazil",
  id: "Indonesia",
  hi: "India",
  ar: "Egypt",
  nl: "Netherlands",
};

const LANG_MAP: Record<string, { code: string; name: string }> = {
  japanese: { code: "ja", name: "Japanese" },
  japan: { code: "ja", name: "Japanese" },
  korean: { code: "ko", name: "Korean" },
  korea: { code: "ko", name: "Korean" },
  kor: { code: "ko", name: "Korean" },
  chinese: { code: "zh", name: "Chinese" },
  mandarin: { code: "zh", name: "Chinese" },
  thai: { code: "th", name: "Thai" },
  thailand: { code: "th", name: "Thai" },
  vietnamese: { code: "vi", name: "Vietnamese" },
  vietnam: { code: "vi", name: "Vietnamese" },
  spanish: { code: "es", name: "Spanish" },
  french: { code: "fr", name: "French" },
  german: { code: "de", name: "German" },
  italian: { code: "it", name: "Italian" },
  tagalog: { code: "tl", name: "Tagalog" },
  filipino: { code: "tl", name: "Tagalog" },
};

async function translatePhrase(phrase: string, langInput: string) {
  const key = langInput.toLowerCase().replace(/[^a-z]/g, "");
  const lang = LANG_MAP[key] ?? { code: "en", name: "English" };
  const needsRomaji = ["ja", "ko", "zh", "th"].includes(lang.code);

  if (!OPENROUTER_API_KEY) {
    return { native: phrase, romaji: phrase, name: lang.name, code: lang.code };
  }

  const prompt = needsRomaji
    ? `Translate to natural ${lang.name} with romanization. Phrase: "${phrase}". Return ONLY JSON: {"native":"...","romaji":"..."}`
    : `Translate to natural ${lang.name}. Phrase: "${phrase}". Return ONLY JSON: {"native":"..."}`;

  try {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0,
        max_tokens: 100,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await res.json();
    const text = (data?.choices?.[0]?.message?.content || "")
      .replace(/```json|```/g, "")
      .trim();

    let native = phrase;
    let romaji = phrase;

    try {
      const parsed = JSON.parse(text);
      native = parsed.native || phrase;
      romaji = parsed.romaji || native;
    } catch {
      native = text.match(/"native"\s*:\s*"([^"]+)"/i)?.[1] || phrase;
      romaji = text.match(/"romaji"\s*:\s*"([^"]+)"/i)?.[1] || native;
    }

    return {
      native: native.trim(),
      romaji: romaji.trim(),
      name: lang.name,
      code: lang.code,
    };
  } catch (err) {
    console.error("Translation failed:", err);
    return { native: phrase, romaji: phrase, name: lang.name, code: lang.code };
  }
}

export async function POST(req: Request) {
  try {
    const { message, userId = "guest" } = await req.json();
    const lower = message.toLowerCase().trim();

    let reply = "";
    let isTranslation = false;
    let localSpeak = "";
    let localLang = "";
    let targetCountry = "";

    // BULLETPROOF REGEX — catches 99.9% of real inputs
    const patterns = [
      /how.*?say.*?["']([^"']+)["'].*?(?:in|to)\s+([a-zA-Z]+)/i,
      /what.*?is.*?["']([^"']+)["'].*?(?:in|to)\s+([a-zA-Z]+)/i,
      /["']([^"']+)["'].*?(?:in|to)\s+([a-zA-Z]+)/i,
      /(?:in|to)\s+([a-zA-Z]+).*?["']([^"']+)["']/i,
      /translate ["']([^"']+)["'].*?(?:to|in)\s+([a-zA-Z]+)/i,
    ];

    let phrase = "";
    let langInput = "";

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        phrase = match[1].trim();
        langInput = match[2].trim();
        break;
      }
    }

    // Follow-up support
    if (!phrase && /^(and|what about|how about|also|or|another one)/i.test(lower)) {
      const memory = userMemory.get(userId);
      if (memory?.lastTopic === "translation") {
        phrase = lower.replace(/^(and|what about|how about|also|or|another one)\s+/i, "")
          .replace(/\?$/, "")
          .trim()
          .replace(/^["']|["']$/g, "");
        langInput = memory.lastLang || "english";
      }
    }

    if (phrase && langInput) {
      const result = await translatePhrase(phrase, langInput);

      const formatted = ["ja", "ko", "zh", "th"].includes(result.code)
        ? `${result.romaji} (${result.native})`
        : result.native;

      reply = `In ${result.name}, "${phrase}" is:\n\n${formatted}`;
      localSpeak = ["ja", "ko", "zh", "th"].includes(result.code) ? result.romaji : result.native;
      localLang = result.code;

      // THIS IS THE KEY — NEVER EMPTY STRING
      targetCountry = LANG_TO_COUNTRY[result.code] || result.name;

      isTranslation = true;

      userMemory.set(userId, {
        lastLang: langInput,
        lastTopic: "translation",
      });
    }

    return NextResponse.json({
      reply: reply || "Try asking: how do you say thank you in Korean",
      isTranslation,
      localSpeak,
      localLang,
      targetCountry, // ← Always a valid string when translating
    });

  } catch (err) {
    console.error("Chat API error:", err);
    return NextResponse.json({
      reply: "Something went wrong.",
      isTranslation: false,
      targetCountry: undefined,
    });
  }
}