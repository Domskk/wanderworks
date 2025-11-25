'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import LogoutButton from '../../components/LogoutButton';
import ChatUI from '../../components/ChatUI';
import type { User } from '@supabase/supabase-js';
import { Menu, Plus, Trash2, X } from 'lucide-react';

type ChatEntry = { id: number; title: string | null; created_at: string | null };

export default function UserPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [history, setHistory] = useState<ChatEntry[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);

  const loadHistory = useCallback(async (email: string) => {
    const { data } = await supabase
      .from('chat_history')
      .select('id, title, created_at')
      .eq('user_email', email)
      .order('created_at', { ascending: false });
    setHistory(data ?? []);
    if (!selectedChatId && data && data.length > 0) {
      setSelectedChatId(String(data[0].id));
    }
  }, [selectedChatId]);

  const startNewChat = async () => {
    if (!user?.email) return;
    const { data } = await supabase
      .from('chat_history')
      .insert({ user_email: user.email, title: 'New Chat', messages: null })
      .select('id, title, created_at')
      .single();
    if (data) {
      setHistory(prev => [data, ...prev]);
      setSelectedChatId(String(data.id));
      setSidebarOpen(false);
    }
  };

  const deleteChat = async (id: number) => {
    await supabase.from('chat_history').delete().eq('id', id);
    setHistory(prev => prev.filter(h => h.id !== id));
    if (selectedChatId === String(id)) {
      const remaining = history.filter(h => h.id !== id);
      setSelectedChatId(remaining[0] ? String(remaining[0].id) : null);
    }
  };

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) router.push('/');
      else {
        setUser(data.user);
        if (data.user.email) await loadHistory(data.user.email);
      }
    };
    checkUser();
  }, [router, loadHistory]);

  if (!user) return null;

  return (
    <div className="flex h-screen bg-gray-900 text-white overflow-hidden">
      {/* Mobile overlay
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/70 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — collapsible everywhere */}
      <aside
        className={`
          ${sidebarOpen ? 'w-80' : 'w-0'} 
          bg-gray-800 border-r border-gray-700 flex flex-col
          transition-all duration-300 overflow-hidden
          fixed inset-y-0 left-0 z-50
          lg:relative lg:z-auto
        `}
      >
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <h2 className={`text-lg font-bold transition-opacity ${sidebarOpen ? 'opacity-100' : 'opacity-0'}`}>
            Chat History
          </h2>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 hover:bg-gray-700 rounded-lg lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <button
            onClick={startNewChat}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 py-3 px-4 rounded-xl font-medium transition shadow-lg"
          >
            <Plus size={18} /> New Chat
          </button>

          {history.map((chat) => (
            <div
              key={chat.id}
              onClick={() => {
                setSelectedChatId(String(chat.id));
                setSidebarOpen(false);
              }}
              className={`group p-4 rounded-xl cursor-pointer transition-all ${
                selectedChatId === String(chat.id)
                  ? 'bg-emerald-900/60 ring-2 ring-emerald-500 shadow-xl'
                  : 'bg-gray-700/60 hover:bg-gray-700'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{chat.title || 'New Chat'}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {chat.created_at &&
                      new Date(chat.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteChat(chat.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-900/50 rounded-lg transition"
                >
                  <Trash2 size={16} className="text-red-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-gray-800 border-b border-gray-700 p-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            {/* MAGIC BUTTON: Shows X when open, Menu when closed */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="relative p-2 hover:bg-gray-700 rounded-lg transition"
            >
              {/* X icon — appears when sidebar is open */}
              <X
                size={24}
                className={`absolute inset-0 m-auto text-white transition-all duration-200 ${
                  sidebarOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
                }`}
              />
              {/* Menu icon — appears when sidebar is closed */}
              <Menu
                size={24}
                className={`text-white transition-all duration-200 ${
                  sidebarOpen ? 'opacity-0 scale-50' : 'opacity-100 scale-100'
                }`}
              />
            </button>

            <h1 className="text-xl font-bold">WanderBot</h1>
          </div>
          <LogoutButton />
        </header>

        <div className="flex-1 min-h-0">
          <ChatUI
            selectedChatId={selectedChatId !== null ? Number(selectedChatId) : null}
            onChatUpdate={() => user?.email && loadHistory(user.email)}
          />
        </div>
      </div>
    </div>
  );
}