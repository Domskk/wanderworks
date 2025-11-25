'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import LogoutButton from '../../components/LogoutButton';
import ChatUI from '../../components/ChatUI';
import type { User } from '@supabase/supabase-js';
import { Menu, Plus, Trash2, X } from 'lucide-react';

interface ChatEntry {
  id: string;
  title: string;
  created_at: string;
}

export default function UserPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [history, setHistory] = useState<ChatEntry[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);

  const loadHistory = useCallback(async (email: string) => {
    const { data, error } = await supabase
      .from('chat_history')
      .select('id, title, created_at')
      .eq('user_email', email)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Load history error:', error);
      return;
    }

    setHistory(data || []);
    if (!selectedChatId && data && data.length > 0) {
      setSelectedChatId(data[0].id);
    }
  }, [selectedChatId]);

  const startNewChat = async () => {
    if (!user?.email) return;

    const { data, error } = await supabase
      .from('chat_history')
      .insert({
        user_email: user.email,
        title: 'New Chat',
        messages: [],
      })
      .select()
      .single();

    if (error) {
      console.error('Insert error:', error);
      return;
    }

    if (data) {
      setSelectedChatId(data.id);
      await loadHistory(user.email);
      setSidebarOpen(false);
    }
  };

  const deleteChat = async (id: string) => {
    const { error } = await supabase.from('chat_history').delete().eq('id', id);
    if (error) {
      console.error('Delete error:', error);
      return;
    }

    const remaining = history.filter((h) => h.id !== id);
    setHistory(remaining);
    if (selectedChatId === id) {
      setSelectedChatId(remaining[0]?.id ?? null);
    }
  };

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data?.user) {
        router.push('/');
      } else {
        setUser(data.user);
        await loadHistory(data.user.email!);
      }
    };
    checkUser();
  }, [router, loadHistory]);

  if (!user) return null;

  return (
    <main className="flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white overflow-hidden">
      {/* Overlay – covers everything when sidebar is open */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar – always slides in/out */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-80 bg-gray-800 border-r border-gray-700
          flex flex-col transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <h2 className="text-lg font-bold text-white">Chat History</h2>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 hover:bg-gray-700 rounded"
          >
            <X size={20} className="text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <button
            onClick={startNewChat}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-3 px-4 rounded-xl font-medium transition"
          >
            <Plus size={18} />
            New Chat
          </button>

          {history.length === 0 ? (
            <p className="text-center text-gray-400 mt-3">No chats yet</p>
          ) : (
            history.map((chat) => (
              <div
                key={chat.id}
                onClick={() => {
                  setSelectedChatId(chat.id);
                  setSidebarOpen(false);
                }}
                className={`group flex justify-between items-center p-3 rounded-lg cursor-pointer transition ${
                  selectedChatId === chat.id
                    ? 'bg-emerald-900 text-white'
                    : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{chat.title || 'New Chat'}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(chat.created_at).toLocaleTimeString([], {
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
                  className="p-1 opacity-0 group-hover:opacity-100 hover:bg-red-900 rounded transition"
                >
                  <Trash2 size={16} className="text-red-400" />
                </button>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Main Content – expands when sidebar is closed */}
      <div className="flex-1 flex flex-col relative z-30">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <Menu size={20} />
            </button>
            <h1 className="text-xl font-bold">WanderBot</h1>
          </div>
          <div className="flex items-center gap-2">
            <LogoutButton />
          </div>
        </header>

        {/* Chat Area */}
        <div className="flex-1 bg-gray-900 flex flex-col min-h-0">
          <ChatUI
            selectedChatId={selectedChatId}
            onChatUpdate={() => loadHistory(user.email!)}
          />
        </div>
      </div>
    </main>
  );
} 