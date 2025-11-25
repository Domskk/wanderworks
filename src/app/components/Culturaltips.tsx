"use client";

import { Globe, Sparkles } from "lucide-react";

export default function CulturalTip({ tip }: { tip: string }) {
  if (!tip) return null;

  return (
    <div className="mt-4 p-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl text-white text-sm shadow-lg">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles size={18} />
        <span className="font-semibold">Travel Tip</span>
      </div>
      <p className="italic">{tip}</p>
      <div className="flex items-center gap-1 mt-2 text-xs opacity-90">
        <Globe size={14} /> Cultural etiquette
      </div>
    </div>
  );
}