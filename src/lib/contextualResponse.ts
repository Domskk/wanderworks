import { translateText } from './translateService';

interface ContextEntry {
  regex: RegExp;
  en: string;
  scenario?: string;
}
const CONTEXTS: Record<string, ContextEntry> = {
  greeting: { regex: /hi|hello|hey/i, en: 'Hello! How can I help you?' },
  direction: {
    regex: /where.*(gate|exit)|how.*get/i,
    en: 'Follow the signs to Gate B12.',
    scenario: 'airport',
  },
  food: {
    regex: /restaurant|food|hungry|menu/i,
    en: 'Try the local paella!',
    scenario: 'restaurant',
  },
  taxi: {
    regex: /taxi|cab|ride/i,
    en: 'To the station, please.',
    scenario: 'taxi',
  },
  emergency: {
    regex: /help|police|hospital/i,
    en: 'Call 112 for emergencies.',
    scenario: 'emergency',
  },
};

let lastLog = 0;
const COOLDOWN = 3000;   // 3 seconds

export async function getContextualReply(
  message: string,
  targetLang: string,
  countryCode?: string
): Promise<{ reply: string; scenario?: string }> {
  const lower = message.toLowerCase();
  const match = Object.values(CONTEXTS).find(c => c.regex.test(lower));

  const base = match?.en ?? 'Tell me more about your trip!';
  const scenario = match?.scenario;

  const reply = targetLang === 'en' ? base : await translateText(base, 'en', targetLang);

  // ----- usage log with cooldown -----
  if (match && countryCode) {
    const now = Date.now();
    if (now - lastLog >= COOLDOWN) {
      lastLog = now;
      fetch('/api/usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: targetLang,
          country: countryCode,
          feature: scenario || 'chat',
        }),
      }).catch(() => {});
    }
  }

  return { reply, scenario };
}