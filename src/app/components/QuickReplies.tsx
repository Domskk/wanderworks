'use client'
const commonPhrases = [
  "Hello!",
  "Where is the nearest restaurant?",
  "How do I say 'thank you' in Japanese?",
  "What are some local customs?",
  "Tell me about local food",
  "Teach me greetings",
];

export default function QuickReplies({ onSelect }: { onSelect: (text: string) => void }) {
  return (
    <div className="flex gap-2 overflow-x-auto px-3 py-2 bg-gray-800 snap-x snap-mandatory scrollbar-hide">
      {commonPhrases.map((phrase, i) => (
        <button
          key={i}
          onClick={() => onSelect(phrase)}
          className="whitespace-nowrap bg-gray-700 hover:bg-gray-600 text-gray-100 px-4 py-2 rounded-full text-sm font-medium transition flex-shrink-0 snap-center"
        >
          {phrase}
        </button>
      ))}
    </div>
  );
}
