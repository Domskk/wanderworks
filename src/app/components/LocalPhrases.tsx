'use client';

import { useEffect, useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

interface LocalPhrasesProps {
  country: string;
  language: string;
  onInsert: (text: string) => void;
}

export default function LocalPhrases({ country, language, onInsert }: LocalPhrasesProps) {
  const [scenarios, setScenarios] = useState<string[]>([]);
  const [currentScenario, setCurrentScenario] = useState("");
  const [phrases, setPhrases] = useState<{ phrase: string }[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!country) return;
    const load = async () => {
      const { data } = await supabase
        .from("local_phrases")
        .select("scenario")
        .eq("country", country)
        .order("scenario");
      const unique = [...new Set(data?.map(d => d.scenario))];
      setScenarios(unique);
      setCurrentScenario(unique[0] || "");
      setLoading(false);
    };
    load();
  }, [country]);

  useEffect(() => {
    if (!currentScenario || !country) return;
    const load = async () => {
      const { data } = await supabase
        .from("local_phrases")
        .select("phrase")
        .eq("country", country)
        .eq("scenario", currentScenario)
        .limit(10);
      setPhrases(data || []);
      setIndex(0);
    };
    load();
  }, [currentScenario, country,language]);

  if (loading) return <div className="text-xs text-gray-500 text-center">Loading...</div>;
  if (scenarios.length === 0) return <div className="text-xs text-gray-500 text-center">No phrases</div>;

  const current = phrases[index]?.phrase || "";

  return (
    <div className="space-y-2">
      <div className="flex gap-1 overflow-x-auto pb-1">
        {scenarios.map(scenario => (
          <button
            key={scenario}
            onClick={() => setCurrentScenario(scenario)}
            className={`px-3 py-1 text-xs rounded-full whitespace-nowrap transition-all ${
              currentScenario === scenario
                ? "bg-emerald-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            {scenario}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => setIndex(i => Math.max(0, i - 1))}
          disabled={index === 0}
          className="p-1 bg-gray-700 hover:bg-gray-600 rounded-full disabled:opacity-50"
        >
          <ChevronUp size={14} />
        </button>
        <button
          onClick={() => onInsert(current)}
          className="flex-1 min-w-0 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-xs font-medium text-center truncate"
          title={current}
        >
          {current}
        </button>
        <button
          onClick={() => setIndex(i => Math.min(phrases.length - 1, i + 1))}
          disabled={index === phrases.length - 1}
          className="p-1 bg-gray-700 hover:bg-gray-600 rounded-full disabled:opacity-50"
        >
          <ChevronDown size={14} />
        </button>
      </div>
    </div>
  );
}