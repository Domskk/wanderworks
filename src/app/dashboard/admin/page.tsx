'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import LogoutButton from '../../components/LogoutButton';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import type { User } from '@supabase/supabase-js';

interface BaseType {
  id?: number;
  created_at?: string | null;
}

interface CulturalTip extends BaseType {
  country: string;
  tip: string;
  etiquette?: string | null;
}

interface LocalPhrase extends BaseType {
  country: string;
  phrase: string;
  translation: string;
  scenario?: string | null;
}

interface Destination extends BaseType {
  country: string;
  country_code: string;
  default_language: string;
}

interface Language extends BaseType {
  code: string;
  name: string;
}

type TabType = 'tips' | 'phrases' | 'destinations' | 'languages';

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('tips');
  const [loading, setLoading] = useState(true);

  const [tips, setTips] = useState<CulturalTip[]>([]);
  const [phrases, setPhrases] = useState<LocalPhrase[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);

  const [editingTip, setEditingTip] = useState<CulturalTip | null>(null);
  const [editingPhrase, setEditingPhrase] = useState<LocalPhrase | null>(null);
  const [editingDestination, setEditingDestination] = useState<Destination | null>(null);
  const [editingLanguage, setEditingLanguage] = useState<Language | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [tipsRes, phrasesRes, destRes, langRes] = await Promise.all([
      supabase.from('cultural_tips').select('*').order('id'),
      supabase.from('local_phrases').select('*').order('id'),
      supabase.from('destinations').select('*').order('id'),
      supabase.from('languages').select('*').order('id'),
    ]);

    setTips((tipsRes.data ?? []) as CulturalTip[]);
    setPhrases((phrasesRes.data ?? []) as LocalPhrase[]);
    setDestinations((destRes.data ?? []) as Destination[]);
    setLanguages((langRes.data ?? []) as Language[]);

    setLoading(false);
  }, []);

  useEffect(() => {
    const check = async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return router.push('/');

      const email = authData.user.email;
      if (!email) {
        console.error('User has no email');
        return router.push('/');
      }

      const { data: roleData, error } = await supabase
        .from('users')
        .select('role')
        .eq('email', email)
        .single();

      if (error || roleData?.role !== 'admin') {
        return router.push('/');
      }

      setUser(authData.user);
      loadData();
    };
    check();
  }, [router, loadData]);

  // Fixed: Proper typing for saveItem with temp ID replacement
  const saveItem = async <T extends BaseType>(
  table:
    | 'cultural_tips'
    | 'local_phrases'
    | 'destinations'
    | 'languages',
  editing: T | null,
  stateSetter: React.Dispatch<React.SetStateAction<T[]>>,
  clearEditing: () => void
) => {
  if (!editing) return;

  const isNew = !editing.id;
  const tempId = isNew ? Date.now() : editing.id!;

  // Optimistic UI update
  stateSetter(prev =>
    isNew
      ? [...prev, { ...editing, id: tempId } as T]
      : prev.map(item => (item.id === editing.id ? editing : item))
  );
  clearEditing();

  // Strip id and created_at before sending
  const { id, ...payload } = editing;

  const { error, data } = isNew
    ? await supabase.from(table).insert(payload).select().single()
    : await supabase.from(table).update(payload).eq('id', id!).select().single();

  if (error) {
    console.error('Save error:', error);
    alert('Failed to save. Reverting...');
    loadData();
    return;
  }

  // Only replace temp item on insert — and cast safely
  if (isNew && data) {
    stateSetter(prev =>
      prev.map(item =>
        item.id === tempId
          ? (data as unknown as T)  // This is safe because we know the table matches T
          : item
      )
    );
  }
};

  const deleteItem = async <T extends BaseType>(
    table:
      | 'cultural_tips'
      | 'local_phrases'
      | 'destinations'
      | 'languages',
    id: number | undefined,
    stateSetter: React.Dispatch<React.SetStateAction<T[]>>
  ) => {
    if (!id || !confirm('Delete this item permanently?')) return;

    stateSetter(prev => prev.filter(item => item.id !== id));

    const { error } = await supabase.from(table).delete().eq('id', id);

    if (error) {
      console.error('Delete error:', error);
      alert('Failed to delete.');
      loadData();
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center text-xl">Loading…</div>;
  if (!user) return null;

  return (
    <main className="min-h-screen bg-gray-900 text-white p-4 md:p-6 overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 bg-gray-800 p-5 rounded-xl shadow-lg">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-gray-400 text-sm md:text-base">Welcome, {user.email}</p>
          </div>
          <LogoutButton />
        </header>

        <div className="flex flex-wrap gap-2 mb-8 bg-gray-800 p-2 rounded-xl w-fit mx-auto sm:mx-0">
          {[
            { id: 'tips', label: `Cultural Tips (${tips.length})` },
            { id: 'phrases', label: `Local Phrases (${phrases.length})` },
            { id: 'destinations', label: `Destinations (${destinations.length})` },
            { id: 'languages', label: `Languages (${languages.length})` },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`px-4 py-2 rounded-lg font-medium text-sm md:text-base transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 pb-10">
          {/* Editor Forms */}
          {editingTip && activeTab === 'tips' && (
            <EditorForm
              title="Cultural Tip"
              editing={editingTip}
              setEditing={setEditingTip}
              save={() =>
                saveItem('cultural_tips', editingTip, setTips, () => setEditingTip(null))
              }
              fields={[
                { key: 'country', placeholder: 'Country' },
                { key: 'tip', placeholder: 'Tip...', textarea: true },
                { key: 'etiquette', placeholder: 'Etiquette (Do / Don’t)...', textarea: true },
              ]}
            />
          )}

          {editingPhrase && activeTab === 'phrases' && (
            <EditorForm
              title="Local Phrase"
              editing={editingPhrase}
              setEditing={setEditingPhrase}
              save={() =>
                saveItem('local_phrases', editingPhrase, setPhrases, () => setEditingPhrase(null))
              }
              fields={[
                { key: 'country', placeholder: 'Country' },
                { key: 'phrase', placeholder: 'Local phrase (e.g. 감사합니다)' },
                { key: 'translation', placeholder: 'Translation (e.g. Thank you)' },
                { key: 'scenario', placeholder: 'Scenario (optional)' },
              ]}
            />
          )}

          {editingDestination && activeTab === 'destinations' && (
            <EditorForm
              title="Destination"
              editing={editingDestination}
              setEditing={setEditingDestination}
              save={() =>
                saveItem('destinations', editingDestination, setDestinations, () => setEditingDestination(null))
              }
              fields={[
                { key: 'country', placeholder: 'Country Name' },
                { key: 'country_code', placeholder: 'Code (e.g. kr)' },
                { key: 'default_language', placeholder: 'Language (e.g. ko)' },
              ]}
            />
          )}

          {editingLanguage && activeTab === 'languages' && (
            <EditorForm
              title="Language"
              editing={editingLanguage}
              setEditing={setEditingLanguage}
              save={() =>
                saveItem('languages', editingLanguage, setLanguages, () => setEditingLanguage(null))
              }
              fields={[
                { key: 'code', placeholder: 'Code (e.g. ja)' },
                { key: 'name', placeholder: 'Name (e.g. Japanese)' },
              ]}
            />
          )}

          {/* Add Button */}
          {!editingTip && !editingPhrase && !editingDestination && !editingLanguage && (
            <button
              onClick={() => {
                if (activeTab === 'tips') setEditingTip({ country: '', tip: '' });
                if (activeTab === 'phrases') setEditingPhrase({ country: '', phrase: '', translation: '' });
                if (activeTab === 'destinations') setEditingDestination({ country: '', country_code: '', default_language: '' });
                if (activeTab === 'languages') setEditingLanguage({ code: '', name: '' });
              }}
              className="bg-gray-800 border-2 border-dashed border-gray-600 rounded-xl p-6 flex flex-col items-center justify-center gap-3 hover:bg-gray-750 hover:border-emerald-600 transition-all cursor-pointer"
            >
              <Plus size={32} className="text-emerald-500" />
              <span className="font-medium text-lg">
                Add New {activeTab === 'tips' ? 'Tip' : activeTab === 'phrases' ? 'Phrase' : activeTab === 'destinations' ? 'Destination' : 'Language'}
              </span>
            </button>
          )}

          {/* Data Cards */}
          {activeTab === 'tips' &&
            tips.map(item => (
              <DataCard
                key={item.id}
                item={item}
                fields={[
                  { key: 'country', label: 'Country' },
                  { key: 'tip', label: 'Tip', multiline: true },
                  { key: 'etiquette', label: 'Etiquette', multiline: true },
                ]}
                onEdit={() => setEditingTip(item)}
                onDelete={() => deleteItem('cultural_tips', item.id, setTips)}
              />
            ))}

          {activeTab === 'phrases' &&
            phrases.map(item => (
              <DataCard
                key={item.id}
                item={item}
                fields={[
                  { key: 'country', label: 'Country' },
                  { key: 'phrase', label: 'Phrase' },
                  { key: 'translation', label: 'Translation' },
                  { key: 'scenario', label: 'Scenario' },
                ]}
                onEdit={() => setEditingPhrase(item)}
                onDelete={() => deleteItem('local_phrases', item.id, setPhrases)}
              />
            ))}

          {activeTab === 'destinations' &&
            destinations.map(item => (
              <DataCard
                key={item.id}
                item={item}
                fields={[
                  { key: 'country', label: 'Country' },
                  { key: 'country_code', label: 'Code' },
                  { key: 'default_language', label: 'Language' },
                ]}
                onEdit={() => setEditingDestination(item)}
                onDelete={() => deleteItem('destinations', item.id, setDestinations)}
              />
            ))}

          {activeTab === 'languages' &&
            languages.map(item => (
              <DataCard
                key={item.id}
                item={item}
                fields={[
                  { key: 'code', label: 'Code' },
                  { key: 'name', label: 'Name' },
                ]}
                onEdit={() => setEditingLanguage(item)}
                onDelete={() => deleteItem('languages', item.id, setLanguages)}
              />
            ))}
        </div>

        {/* Empty State */}
        {(() => {
          const data = activeTab === 'tips' ? tips : activeTab === 'phrases' ? phrases : activeTab === 'destinations' ? destinations : languages;
          const isEditing = !!(editingTip || editingPhrase || editingDestination || editingLanguage);
          if (data.length > 0 || isEditing) return null;
          return (
            <div className="col-span-full text-center py-20">
              <p className="text-gray-500 text-lg">No {activeTab} yet. Click Add New to create one.</p>
            </div>
          );
        })()}
      </div>
    </main>
  );
}

// Generic Editor Form
function EditorForm<T extends BaseType>({
  title,
  editing,
  setEditing,
  save,
  fields,
}: {
  title: string;
  editing: T;
  setEditing: (value: T | null) => void;
  save: () => void;
  fields: { key: keyof T; placeholder: string; textarea?: boolean }[];
}) {
  return (
    <div className="bg-gray-800 rounded-xl p-5 shadow-lg border border-gray-700">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-emerald-400">
          {editing.id ? 'Edit' : 'New'} {title}
        </h3>
        <button onClick={() => setEditing(null)} className="text-gray-400 hover:text-white">
          <X size={20} />
        </button>
      </div>

      <div className="space-y-3">
        {fields.map(field => (
          <div key={String(field.key)}>
            {field.textarea ? (
              <textarea
                placeholder={field.placeholder}
                value={(editing[field.key] as string) ?? ''}
                onChange={e => setEditing({ ...editing, [field.key]: e.target.value })}
                className="w-full p-3 bg-gray-700 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                rows={4}
              />
            ) : (
              <input
                type="text"
                placeholder={field.placeholder}
                value={(editing[field.key] as string) ?? ''}
                onChange={e => setEditing({ ...editing, [field.key]: e.target.value })}
                className="w-full p-3 bg-gray-700 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            )}
          </div>
        ))}
      </div>

      <button
        onClick={save}
        className="mt-5 w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 py-3 rounded-lg font-medium transition"
      >
        <Save size={18} /> Save
      </button>
    </div>
  );
}

// Generic Data Card
function DataCard<T extends BaseType>({
  item,
  fields,
  onEdit,
  onDelete,
}: {
  item: T;
  fields: { key: keyof T; label: string; multiline?: boolean }[];
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="bg-gray-800 rounded-xl p-5 shadow-md border border-gray-700 hover:shadow-lg hover:border-gray-600 transition-all">
      <div className="space-y-3 mb-4">
        {fields.map((field, i) => {
          const value = item[field.key];
          if (value === null || value === undefined) return null;
          return (
            <div key={i}>
              <p className="text-xs text-gray-500 uppercase tracking-wider">{field.label}</p>
              <p className={`text-white ${field.multiline ? 'whitespace-pre-wrap' : 'truncate'}`}>
                {String(value)}
              </p>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end gap-2">
        <button onClick={onEdit} className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition">
          <Edit2 size={16} />
        </button>
        <button onClick={onDelete} className="p-2 bg-red-600 hover:bg-red-700 rounded-lg transition">
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}