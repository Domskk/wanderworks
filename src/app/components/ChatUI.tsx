'use client';
import { useEffect, useRef, useState, useCallback } from "react";
import {
  Loader2,
  Mic,
  Copy,
  RefreshCw,
  Send,
  Globe,
  ChevronUp,
  ChevronDown,
  MapPin,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { countryCodeToEmoji } from "@/lib/flag";
import { useVoice } from "@/lib/useVoice";

interface Message {
  sender: "user" | "ai";
  text: string;
  id?: string;
}

const WELCOME_MESSAGE = `Hello! I'm WanderBot ✈️\nYou can ask me:\n\n• How do you say "thank you" in Japanese?\n• Translate "hello" in Korean\n• And goodbye? (follow-up)\n• Best street food in Bangkok?`;

export default function ChatUI({
  selectedChatId,
  onChatUpdate,
}: {
  selectedChatId: number | null;
  onChatUpdate: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [country, setCountry] = useState("Philippines");
  const [countryCode, setCountryCode] = useState("PH");
  const [language, setLanguage] = useState("en");
  const [isVoiceInput, setIsVoiceInput] = useState(false);
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);

  // Track shown tip countries to avoid repeats
  const [shownTipCountries, setShownTipCountries] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const saved = localStorage.getItem("wanderbot_shown_tips");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Save shown tips to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("wanderbot_shown_tips", JSON.stringify(Array.from(shownTipCountries)));
    } catch {}
  }, [shownTipCountries]);

  // Voice toggles
  const [aiVoiceEnabled, setAiVoiceEnabled] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem("aiVoiceEnabled");
      return v === null ? true : v === "true";
    } catch { return true; }
  });
  const [micEnabled, setMicEnabled] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem("micEnabled");
      return v === null ? true : v === "true";
    } catch { return true; }
  });

  useEffect(() => {
    try {
      localStorage.setItem("aiVoiceEnabled", String(aiVoiceEnabled));
      localStorage.setItem("micEnabled", String(micEnabled));
    } catch {}
  }, [aiVoiceEnabled, micEnabled]);

  const { startListening, isListening, speakLocal, speakReply } = useVoice((text) => {
    if (text && !loading && micEnabled) handleSend(text, true);
  });

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const persistMessages = useCallback(async (msgs: Message[]) => {
    const key = `chat_${selectedChatId}`;
    localStorage.setItem(key, JSON.stringify(msgs));
    if (selectedChatId) {
      await supabase
        .from("chat_history")
        .update({
          messages: JSON.stringify(msgs),
          title: msgs.find(m => m.sender === "user")?.text.slice(0, 40) || "New Chat",
        })
        .eq("id", selectedChatId);
      onChatUpdate();
    }
  }, [selectedChatId, onChatUpdate]);

  // Load messages
  useEffect(() => {
    if (!selectedChatId) {
      setMessages([]);
      return;
    }
    const load = async () => {
      const { data } = await supabase
        .from("chat_history")
        .select("messages")
        .eq("id", selectedChatId)
        .single();

      if (data?.messages) {
        try {
          const parsedMessages = typeof data.messages === 'string' 
            ? JSON.parse(data.messages) 
            : data.messages;
          
          if (Array.isArray(parsedMessages) && parsedMessages.length > 0) {
            setMessages(parsedMessages as Message[]);
            return;
          }
        } catch (err) {
          console.error("Error parsing messages:", err);
        }
      }
      
      // Fallback to localStorage
      const saved = localStorage.getItem(`chat_${selectedChatId}`);
      if (saved) {
        try {
          setMessages(JSON.parse(saved));
        } catch {
          setMessages([{ sender: "ai", text: WELCOME_MESSAGE }]);
        }
      } else {
        setMessages([{ sender: "ai", text: WELCOME_MESSAGE }]);
      }
    };
    load();
  }, [selectedChatId]);

  // Geo detection
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res = await fetch("/api/geo-code", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lat: coords.latitude, lon: coords.longitude }),
          });
          const geo = await res.json();
          setCountry(geo.country ?? "Philippines");
          setCountryCode(geo.country_code ?? "PH");
          
          const { data } = await supabase
            .from("destinations")
            .select("default_language")
            .eq("country", geo.country)
            .maybeSingle();
          
          if (data && 'default_language' in data) {
            setLanguage(data.default_language ?? "en");
          }
        } catch (err) {
          console.error("Geo error:", err);
        }
      },
      () => {},
      { timeout: 10000 }
    );
  }, []);

  const handleSend = useCallback(
    async (text: string, fromVoice = false) => {
      if (!text.trim() || !selectedChatId || loading) return;
      setIsVoiceInput(fromVoice);
      setInput("");

      const userMsg: Message = { sender: "user", text };
      const newMsgs = [...messages, userMsg];
      setMessages(newMsgs);
      setLoading(true);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            userId: selectedChatId,
            country,
          }),
        });
        if (!res.ok) throw new Error("Chat failed");

        const data = await res.json();
        let aiReply = data.reply || "No response.";
        const localSpeak = data.localSpeak || "";
        const localLang = data.localLang || language;

        if (data.isTranslation && data.targetCountry) {
          const tipCountry = data.targetCountry.trim();

          if (tipCountry && !shownTipCountries.has(tipCountry)) {
            try {
              const tipRes = await fetch("/api/tips", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ country: tipCountry }),
              });

              if (tipRes.ok) {
                const tipData = await tipRes.json();
                if (tipData.tip) {
                  aiReply += `\n\n**Cultural Tip**\n${tipData.tip}`;

                  setShownTipCountries(prev => {
                    const next = new Set(prev);
                    next.add(tipCountry);
                    return next;
                  });
                }
              }
            } catch (err) {
              console.error("Failed to fetch cultural tip:", err);
            }
          }
        }
        const aiMsg: Message = { sender: "ai", text: aiReply };
        const updated = [...newMsgs, aiMsg];
        setMessages(updated);

        // Voice output
        if (aiVoiceEnabled) {
          const speakText = localSpeak.trim() ? localSpeak : aiReply.split("\n\n")[0];
          const speakLang = localLang.trim() || language;
          if (speakLang !== "en") {
            speakLocal(speakText, speakLang);
          } else {
            speakReply(speakText);
          }
        }

        await persistMessages(updated);
      } catch (err) {
        console.error("Chat error:", err);
        setMessages(prev => [...prev, { sender: "ai", text: "Sorry, something went wrong." }]);
      } finally {
        setLoading(false);
        setIsVoiceInput(false);
      }
    },
    [messages, selectedChatId, language, speakLocal, speakReply, loading, persistMessages, country, shownTipCountries, aiVoiceEnabled, setShownTipCountries]
  );

  const regenerateLast = useCallback(async () => {
    const lastUser = [...messages].reverse().find(m => m.sender === "user");
    if (!lastUser || regenerating) return;
    setRegenerating(true);
    const filtered = messages.slice(0, -1);
    setMessages(filtered);
    await handleSend(lastUser.text, isVoiceInput);
    setRegenerating(false);
  }, [messages, regenerating, handleSend, isVoiceInput]);

  const startVoice = useCallback(() => {
    if (!micEnabled) return;
    const voiceLang = language === "en" ? "en-US" : `${language}-PH`;
    startListening(voiceLang);
  }, [language, startListening, micEnabled]);

  const showWelcome = messages.length === 0 ||
    (messages.length === 1 && messages[0].text === WELCOME_MESSAGE);

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white min-h-0">
      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between p-3 border-b border-gray-700 bg-gray-800 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl flex-shrink-0">
            {countryCode ? countryCodeToEmoji(countryCode) : <Globe size={20} />}
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{country}</p>
            <p className="text-xs text-gray-400">{language}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setAiVoiceEnabled(v => !v)}
            className={`px-2 py-1 rounded-md text-xs ${aiVoiceEnabled ? 'bg-emerald-600' : 'bg-gray-700'}`}>
            {aiVoiceEnabled ? "AI Voice: ON" : "AI Voice: OFF"}
          </button>
          <button onClick={() => setMicEnabled(v => !v)}
            className={`px-2 py-1 rounded-md text-xs ${micEnabled ? 'bg-sky-600' : 'bg-gray-700'}`}>
            {micEnabled ? "Mic: ON" : "Mic: OFF"}
          </button>
        </div>
      </header>

      {/* Country Switcher */}
      <div className="bg-gray-800/80 backdrop-blur-sm border-b border-gray-700 shrink-0 z-40">
        <button onClick={() => setIsSwitcherOpen(!isSwitcherOpen)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-700/50 transition-colors">
          <div className="flex items-center gap-2">
            <MapPin size={16} className="text-emerald-400" />
            <span className="text-sm font-medium">Select Countries</span>
          </div>
          {isSwitcherOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
        <div className={`grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 px-4 pb-3 transition-all duration-300 overflow-hidden ${isSwitcherOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}`}>
          {[
            { name: "Philippines", code: "PH" }, { name: "Japan", code: "JP" }, { name: "Korea", code: "KR" },
            { name: "Thailand", code: "TH" }, { name: "Vietnam", code: "VN" }, { name: "Indonesia", code: "ID" },
            { name: "Malaysia", code: "MY" }, { name: "Singapore", code: "SG" }, { name: "France", code: "FR" },
            { name: "Italy", code: "IT" }, { name: "Spain", code: "ES" }, { name: "Germany", code: "DE" },
            { name: "Mexico", code: "MX" }, { name: "Brazil", code: "BR" }, { name: "India", code: "IN" },
            { name: "Turkey", code: "TR" }, { name: "Egypt", code: "EG" }, { name: "Morocco", code: "MA" },
            { name: "Greece", code: "GR" }, { name: "Netherlands", code: "NL" },
          ].map(({ name, code }) => (
            <button key={name} onClick={() => {
              setCountry(name);
              setCountryCode(code);
              setIsSwitcherOpen(false);
            }}
              className={`flex flex-col items-center gap-1 py-2 px-3 rounded-lg transition-all ${country === name ? "bg-emerald-600 text-white shadow-lg ring-2 ring-emerald-400" : "bg-gray-700 hover:bg-gray-600 text-gray-200"}`}>
              <span className="text-2xl">{countryCodeToEmoji(code)}</span>
              <span className="text-xs font-medium">{name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto p-3 pb-32 min-h-0">
        <div className="space-y-3">
          {showWelcome && (
            <div className="flex justify-start">
              <div className="bg-gray-700 px-4 py-3 rounded-2xl max-w-[85%] whitespace-pre-wrap text-sm">
                {WELCOME_MESSAGE}
              </div>
            </div>
          )}

          {messages.filter(m => m.text !== WELCOME_MESSAGE).map((msg, i) => (
            <div key={msg.id ?? i} className="flex flex-col">
              <div className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`relative max-w-[85%] px-4 py-3 rounded-2xl whitespace-pre-wrap text-sm group ${msg.sender === "user" ? "bg-emerald-600 text-white" : "bg-gray-700 text-gray-100"}`}>
                  {msg.sender === "ai" ? (
                    <>
                      {msg.text.split("\n\n").map((part, idx) => (
                        <div key={idx}>
                          {part.startsWith("**Cultural Tip**") ? (
                            <div className="mt-5 pt-5 border-t-2 border-emerald-500/30 rounded-lg bg-emerald-900/20 px-4 py-3 -mx-4">
                              <p className="text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">Cultural Tip</p>
                              <p className="text-white text-sm leading-relaxed">{part.replace("**Cultural Tip**\n", "")}</p>
                            </div>
                          ) : (
                            <p className="mb-3">{part}</p>
                          )}
                        </div>
                      ))}
                    </>
                  ) : msg.text}
                  <button onClick={() => copyToClipboard(msg.text.split("\n\n")[0])}
                    className="absolute -top-4 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Copy size={12} className="text-gray-400" />
                  </button>
                </div>
              </div>
              {msg.sender === "ai" && i === messages.length - 1 && (
                <div className="flex justify-start mt-1 ml-1">
                  <button onClick={regenerateLast} disabled={regenerating || loading}
                    className="p-1 bg-gray-600 hover:bg-gray-500 rounded-full disabled:opacity-50 text-xs">
                    <RefreshCw size={10} className={regenerating ? "animate-spin" : ""} />
                  </button>
                </div>
              )}
            </div>
          ))}

          {(loading || regenerating) && (
            <div className="flex justify-start">
              <div className="bg-gray-700 px-3 py-2 rounded-2xl flex items-center gap-2 text-xs">
                <Loader2 className="animate-spin" size={14} />
                <span>{regenerating ? "Regenerating..." : "Thinking..."}</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>


      {/* Input Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 p-3 flex gap-2 items-center z-10">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend(input, false)}
          placeholder="Type your message..."
          className="flex-1 px-4 py-2.5 bg-gray-800 text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 placeholder-gray-500"
          disabled={loading || regenerating}
        />
        <button onClick={() => handleSend(input, false)}
          disabled={!input.trim() || loading || regenerating}
          className="p-2.5 bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50 transition-colors">
          <Send size={18} className="text-white" />
        </button>
        <button onClick={startVoice}
          disabled={!micEnabled || isListening || loading || regenerating}
          className={`p-2.5 rounded-lg transition-all ${isListening ? "bg-red-600 animate-pulse" : micEnabled ? "bg-gray-700 hover:bg-gray-600" : "bg-gray-800 opacity-50"}`}>
          <Mic size={18} className={isListening ? "text-white" : "text-gray-300"} />
        </button>
      </div>
    </div>
  );
}