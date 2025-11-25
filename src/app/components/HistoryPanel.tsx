'use client';

import { Trash2 } from 'lucide-react';

interface Props {
  history: { id: string; title?: string; created_at: string }[];
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  selectedId: string | null;
}

export default function HistoryPanel({ history, onSelect, onDelete, selectedId }: Props) {
  if (!history.length) return <p className="text-gray-400">No history</p>;

  return (
    <div className="space-y-2">
      {history.map((chat) => (
        <div
          key={chat.id}
          onClick={() => onSelect(chat.id)}
          className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition
            ${selectedId === chat.id ? "bg-emerald-700 text-white" : "bg-gray-800 text-gray-300"}
          `}
        >
          <div className="flex flex-col min-w-0 flex-1">
            <p className="font-medium truncate">{chat.title || "Untitled Chat"}</p>
            <p className="text-xs opacity-70">{new Date(chat.created_at).toLocaleTimeString()}</p>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(chat.id);
            }}
            className="p-1 md:opacity-0 md:group-hover:opacity-100 hover:bg-red-900 rounded transition"
          >
            <Trash2 size={16} className="text-red-400" />
          </button>
        </div>
      ))}
    </div>
  );
}
