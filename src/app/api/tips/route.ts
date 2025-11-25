import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

// Hardcoded fallbacks (safety net)
const FALLBACKS: Record<string, string> = {
  Korea: "Use both hands when giving/receiving from elders.\nTurn your head when drinking with seniors.",
  Japan: "Bow to show respect — deeper = more polite.\nRemove shoes indoors. No tipping!",
  Thailand: "Never touch someone's head. Don't point feet at people. Wai greeting!",
  Vietnam: "Use both hands when giving/receiving. Smiling can mean embarrassment.",
  Philippines: "Use 'po' and 'opo' with elders. 'Mano po' gesture = respect.",
  France: "Always say 'Bonjour' when entering a shop.",
  Italy: "No cappuccino after 11 AM. Dinner starts late.",
  Spain: "Dinner at 9–11 PM is normal. Two kisses greeting.",
  Germany: "Punctuality is everything. Direct communication.",
  China: "Red envelopes for gifts. Slurping = good!",
};

export async function POST(request: Request) {
  try {
    const { country } = await request.json();
    if (!country?.trim()) return NextResponse.json({ tip: null });

    const input = country.trim();
    console.log("[TIPS] Requested:", input);

    // Normalize input
    const normalized = input.toLowerCase().replace(/[^a-z]/g, "");

    // Try Supabase with fuzzy matching
    const { data } = await supabase
      .from("cultural_tips")
      .select("tip, etiquette")
      .or(`country.ilike.%${input}%, country.ilike.%${normalized}%`)
      .limit(1);

    if (data && data[0]?.tip) {
      let tip = data[0].tip.trim();
      if (data[0].etiquette?.trim()) tip += `\n\n${data[0].etiquette.trim()}`;
      console.log("[TIPS] Found in DB → sending");
      return NextResponse.json({ tip });
    }

    // Fallback to hardcoded
    const fallbackKey = Object.keys(FALLBACKS).find(k =>
      normalized.includes(k.toLowerCase()) ||
      k.toLowerCase().includes(normalized)
    );

    if (fallbackKey) {
      console.log("[TIPS] Using fallback →", fallbackKey);
      return NextResponse.json({ tip: FALLBACKS[fallbackKey] });
    }

    console.log("[TIPS] No tip found for:", input);
    return NextResponse.json({ tip: null });

  } catch (err) {
    console.error("Tips error:", err);
    return NextResponse.json({ tip: null });
  }
}