// src/app/api/chat/route.ts
import { NextResponse } from "next/server";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const userMemory = new Map<string, { lastLang?: string; lastTopic?: string }>();

const LANG_TO_COUNTRY: Record<string, string> = {
  ja: "Japan", ko: "Korea", th: "Thailand", vi: "Vietnam", tl: "Philippines",
  zh: "China", fr: "France", it: "Italy", es: "Spain", de: "Germany",
  pt: "Brazil", id: "Indonesia", hi: "India", ar: "Egypt", nl: "Netherlands",
};

const LANG_MAP: Record<string, { code: string; name: string }> = {
  japanese: { code: "ja", name: "Japanese" }, japan: { code: "ja", name: "Japanese" },
  korean: { code: "ko", name: "Korean" }, korea: { code: "ko", name: "Korean" }, kor: { code: "ko", name: "Korean" },
  chinese: { code: "zh", name: "Chinese" }, mandarin: { code: "zh", name: "Chinese" },
  thai: { code: "th", name: "Thai" }, thailand: { code: "th", name: "Thai" },
  vietnamese: { code: "vi", name: "Vietnamese" }, vietnam: { code: "vi", name: "Vietnamese" },
  spanish: { code: "es", name: "Spanish" }, french: { code: "fr", name: "French" },
  german: { code: "de", name: "German" }, italian: { code: "it", name: "Italian" },
  tagalog: { code: "tl", name: "Tagalog" }, filipino: { code: "tl", name: "Tagalog" }, philippines: { code: "tl", name: "Tagalog" },
};

export async function POST(req: Request) {
  try {
    const { message, userId = "guest" } = await req.json();
    const lower = message.trim().toLowerCase();

    let phrase = "";
    let langInput = "";
    let isTranslation = false;
    let localSpeak = "";
    let localLang = "";
    let targetCountry = ""; // ← will be used in response

    // 1. Detect translation intent
    const translationPatterns = [
      /how.*?say.*?["']([^"']+)["'].*?(?:in|to)\s+([a-zA-Z]+)/i,
      /what.*?is.*?["']([^"']+)["'].*?(?:in|to)\s+([a-zA-Z]+)/i,
      /["']([^"']+)["'].*?(?:in|to)\s+([a-zA-Z]+)/i,
      /(?:in|to)\s+([a-zA-Z]+).*?["']([^"']+)["']/i,
      /translate ["']([^"']+)["'].*?(?:to|in)\s+([a-zA-Z]+)/i,
    ];

    for (const pattern of translationPatterns) {
      const match = message.match(pattern);
      if (match) {
        phrase = match[1].trim();
        langInput = match[2].trim();
        isTranslation = true;
        break;
      }
    }

    // 2. Follow-up translation
    if (!isTranslation && /^(and|what about|how about|also|or|another one|what'?s)/i.test(lower)) {
      const memory = userMemory.get(userId);
      if (memory?.lastTopic === "translation") {
        phrase = lower
          .replace(/^(and|what about|how about|also|or|another one|what'?s)\s+/i, "")
          .replace(/(\?|\.|!)*$/, "")
          .trim()
          .replace(/^["']|["']$/g, "");
        langInput = memory.lastLang || "english";
        isTranslation = true;
      }
    }

    // 3. Handle translation request
    if (isTranslation && phrase && langInput && OPENROUTER_API_KEY) {
      const langKey = langInput.toLowerCase().replace(/[^a-z]/g, "");
      const targetLang = LANG_MAP[langKey] ?? { code: "en", name: "English" };
      targetCountry = LANG_TO_COUNTRY[targetLang.code] || targetLang.name;

      const response = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          temperature: 0.8,
          max_tokens: 200,
          messages: [
            {
              role: "system",
              content: `You are WanderBot — a super friendly, warm, and fun travel buddy.
You're helping someone learn phrases abroad.

Rules:
- Respond naturally and enthusiastically
- For Japanese, Korean, Chinese, Thai: pronunciation first in (parentheses), then native script
- Example: (annyeonghaseyo) 안녕하세요
- Always mention the country naturally
- Add a fun tip or emoji sometimes
- Never repeat the same message

Translate this: "${phrase}"
To: ${targetLang.name} (${targetCountry})`,
            },
            { role: "user", content: phrase },
          ],
        }),
      });

      const data = await response.json();
      const reply = (data?.choices?.[0]?.message?.content || "").trim() || `In ${targetLang.name}, it's "${phrase}"`;

      const needsRomaji = ["ja", "ko", "zh", "th"].includes(targetLang.code);
      localSpeak = needsRomaji
        ? reply.match(/\(([^)]+)\)/)?.[1]?.trim() || phrase
        : reply.split(/\s+/)[0]?.replace(/[^\w\s]/g, "").trim() || phrase;

      localLang = targetLang.code;

      userMemory.set(userId, { lastLang: langInput, lastTopic: "translation" });

      return NextResponse.json({
        reply,
        isTranslation: true,
        localSpeak,
        localLang,
        targetCountry, // ← now used!
      });
    }

    // 4. Full conversational mode (non-translation)
    if (OPENROUTER_API_KEY) {
      const response = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          temperature: 0.9,
          max_tokens: 250,
          messages: [
            {
              role: "system",
              content: `You are WanderBot — a super fun, friendly, and knowledgeable travel companion.
You help with:
- Translations
- Travel tips, food, culture, greetings
- Any travel question
Always be warm, excited, and helpful. Use emojis sometimes.`,
            },
            { role: "user", content: message },
          ],
        }),
      });

      const data = await response.json();
      const reply = (data?.choices?.[0]?.message?.content || "Hey! What's up?").trim();

      return NextResponse.json({
        reply,
        isTranslation: false,
        localSpeak: "",
        localLang: "",
        targetCountry: "", // ← still returned, but empty for non-translations
      });
    }

    // Fallback
    return NextResponse.json({
      reply: "Hey traveler! I'm WanderBot — ask me anything: translations, food, tips, culture... I'm ready!",
      isTranslation: false,
      localSpeak: "",
      localLang: "",
      targetCountry: "",
    });

  } catch (err) {
    console.error("Chat API error:", err);
    return NextResponse.json({
      reply: "Oops! My brain hiccuped. Try again?",
      isTranslation: false,
      localSpeak: "",
      localLang: "",
      targetCountry: "",
    });
  }
}