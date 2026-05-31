'use client';

import { useState, useRef, useEffect } from 'react';
import { useKeyboard } from '@/hooks/use-keyboard';
import { auth, functions } from '@/lib/firebase';
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  onAuthStateChanged, 
  User,
  signOut 
} from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { agendaService } from '@/lib/agenda-service';
import { AgendaItem } from '@/types/agenda';

type ViewMode = 'UNASSIGNED' | 'PROJECTS' | 'PEOPLE' | 'TIMELINE';

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [activeArea, setActiveArea] = useState<'input' | 'grid'>('input');
  const [viewMode, setViewMode] = useState<ViewMode>('UNASSIGNED');
  const [selectedCol, setSelectedCol] = useState(0);
  const [selectedItemIdx, setSelectedItemIdx] = useState(0);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [showPalette, setShowPalette] = useState(false);
  const [items, setItems] = useState<AgendaItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auth Listener
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
  }, []);

  // Firestore Sync Listener
  useEffect(() => {
    if (!user) {
      setItems([]);
      return;
    }
    return agendaService.subscribeToItems(user.uid, (data) => {
      setItems(data.filter(i => i.status === 'active'));
    });
  }, [user]);

  // Grouping Logic
  const getGroupedData = () => {
    if (viewMode === 'UNASSIGNED') {
      return [
        { title: 'Unassigned', items: items.filter(i => !i.aiParsed?.tags.length && !i.aiParsed?.people.length) },
        { title: 'Processing', items: items.filter(i => !i.aiParsed) },
        { title: 'Recent', items: items.slice(0, 10) }
      ];
    }

    if (viewMode === 'PROJECTS') {
      const allTags = Array.from(new Set(items.flatMap(i => [...(i.aiParsed?.tags || []), ...(i.userOverrides?.tags || [])])));
      const cols = allTags.slice(0, 3).map(tag => ({
        title: `#${tag}`,
        items: items.filter(i => i.aiParsed?.tags.includes(tag) || i.userOverrides?.tags?.includes(tag))
      }));
      while (cols.length < 3) cols.push({ title: '---', items: [] });
      return cols;
    }

    if (viewMode === 'PEOPLE') {
      const allPeople = Array.from(new Set(items.flatMap(i => [...(i.aiParsed?.people || []), ...(i.userOverrides?.people || [])])));
      const cols = allPeople.slice(0, 3).map(person => ({
        title: `@${person}`,
        items: items.filter(i => i.aiParsed?.people.includes(person) || i.userOverrides?.people?.includes(person))
      }));
      while (cols.length < 3) cols.push({ title: '---', items: [] });
      return cols;
    }

    if (viewMode === 'TIMELINE') {
      const today = new Date().toISOString().split('T')[0];
      return [
        { title: 'Today', items: items.filter(i => i.aiParsed?.dates.some(d => d.iso_date.startsWith(today))) },
        { title: 'This Week', items: items.filter(i => i.aiParsed?.dates.length && !i.aiParsed?.dates.some(d => d.iso_date.startsWith(today))) },
        { title: 'Someday', items: items.filter(i => !i.aiParsed?.dates.length) }
      ];
    }

    return [];
  };

  const groupedCols = getGroupedData();

  // Focus input on load
  useEffect(() => {
    if (user && activeArea === 'input' && !editingItemId) {
      inputRef.current?.focus();
    }
  }, [user, activeArea, editingItemId]);

  useKeyboard({
    '/': (e) => {
      if (activeArea !== 'input') {
        e.preventDefault();
        inputRef.current?.focus();
        setActiveArea('input');
      }
    },
    'cmd+k': (e) => {
      e.preventDefault();
      setShowPalette(prev => !prev);
    },
    'Escape': () => {
      setShowPalette(false);
      setEditingItemId(null);
      if (activeArea === 'input') {
        inputRef.current?.blur();
        setActiveArea('grid');
      }
    },
    'ArrowRight': () => {
      if (activeArea === 'grid' && !editingItemId) {
        setSelectedCol(prev => (prev + 1) % 3);
        setSelectedItemIdx(0);
      }
    },
    'ArrowLeft': () => {
      if (activeArea === 'grid' && !editingItemId) {
        setSelectedCol(prev => (prev - 1 + 3) % 3);
        setSelectedItemIdx(0);
      }
    },
    'ArrowDown': () => {
      if (activeArea === 'grid' && !editingItemId) {
        const colItems = groupedCols[selectedCol].items;
        setSelectedItemIdx(prev => (prev + 1) % Math.max(1, colItems.length));
      }
    },
    'ArrowUp': () => {
      if (activeArea === 'grid' && !editingItemId) {
        const colItems = groupedCols[selectedCol].items;
        setSelectedItemIdx(prev => (prev - 1 + colItems.length) % Math.max(1, colItems.length));
      }
    },
    ' ': (e) => {
      if (activeArea === 'grid' && !editingItemId) {
        e.preventDefault();
        const item = groupedCols[selectedCol].items[selectedItemIdx];
        if (item && user) agendaService.archiveItem(user.uid, item.id);
      }
    },
    'd': (e) => {
      if (activeArea === 'grid' && !editingItemId) {
        const item = groupedCols[selectedCol].items[selectedItemIdx];
        if (item && user) agendaService.archiveItem(user.uid, item.id);
      }
    },
    'e': (e) => {
      if (activeArea === 'grid' && !editingItemId) {
        const item = groupedCols[selectedCol].items[selectedItemIdx];
        if (item) setEditingItemId(item.id);
      }
    },
    '1': () => { if (showPalette) { setViewMode('UNASSIGNED'); setShowPalette(false); } },
    '2': () => { if (showPalette) { setViewMode('PROJECTS'); setShowPalette(false); } },
    '3': () => { if (showPalette) { setViewMode('PEOPLE'); setShowPalette(false); } },
    '4': () => { if (showPalette) { setViewMode('TIMELINE'); setShowPalette(false); } },
    'Tab': (e) => {
      e.preventDefault();
      if (activeArea === 'input') {
        setActiveArea('grid');
        inputRef.current?.blur();
      } else {
        setActiveArea('input');
        inputRef.current?.focus();
      }
    }
  });

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !user) return;
    
    const raw = inputValue;
    const tempId = Math.random().toString(36).substr(2, 9);
    setInputValue('');

    const newItem: Partial<AgendaItem> & { id: string } = {
      id: tempId,
      rawText: raw,
      status: 'active',
      createdAt: Date.now(),
    };
    
    try {
      await agendaService.saveItem(user.uid, newItem);
      const extractAgendaItem = httpsCallable(functions, 'extractAgendaItem');
      const result = await extractAgendaItem({ 
        rawText: raw,
        currentTimestamp: new Date().toISOString()
      });
      
      const aiData = result.data as any;
      await agendaService.updateAiResults(user.uid, tempId, {
        actionItems: aiData.action_items,
        people: aiData.people,
        tags: aiData.tags,
        dates: aiData.dates
      });
    } catch (error) {
      console.error('Operation failed:', error);
    }
  };

  const handleEditSubmit = async (itemId: string, newText: string) => {
    if (!user) return;
    await agendaService.updateItemText(user.uid, itemId, newText);
    setEditingItemId(null);
  };

  if (!user) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 bg-black text-white font-mono">
        <h1 className="text-2xl mb-8 tracking-tighter uppercase font-bold border-b-4 border-white pb-2">Project Agenda</h1>
        <button 
          onClick={handleLogin}
          className="px-8 py-3 bg-white text-black font-bold uppercase tracking-widest hover:bg-zinc-200 transition-colors"
        >
          Login with Google
        </button>
        <p className="mt-8 text-[10px] text-zinc-500 uppercase tracking-widest">Zero Friction Data Dump + AI Structuring</p>
      </div>
    );
  }

  return (
    <main className="flex-1 flex flex-col p-4 md:p-8 space-y-8 relative overflow-hidden">
      <div className="w-full max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-2">
           <div className="text-[10px] uppercase tracking-widest text-zinc-600">
            View: <span className="text-white">{viewMode}</span>
           </div>
           <button onClick={() => signOut(auth)} className="text-[10px] uppercase tracking-widest text-zinc-600 hover:text-white">Logout</button>
        </div>
        <form onSubmit={handleSubmit} className="relative group">
          <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors ${activeArea === 'input' ? 'text-white' : 'text-zinc-500'}`}>
            /
          </div>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onFocus={() => setActiveArea('input')}
            placeholder="Type a thought and hit Enter..."
            className={`w-full bg-zinc-900/50 border ${activeArea === 'input' ? 'border-white' : 'border-zinc-800'} focus:outline-none px-8 py-3 rounded-none text-lg transition-all placeholder:text-zinc-700`}
          />
        </form>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6">
        {groupedCols.map((col, colIndex) => (
          <div 
            key={colIndex}
            className={`border transition-colors p-4 flex flex-col ${
              activeArea === 'grid' && selectedCol === colIndex 
                ? 'border-zinc-700 ring-1 ring-zinc-700' 
                : 'border-zinc-900'
            }`}
          >
            <h2 className={`text-sm font-bold uppercase tracking-widest mb-4 border-b pb-2 transition-colors ${
              activeArea === 'grid' && selectedCol === colIndex ? 'text-white border-white' : 'text-zinc-600 border-zinc-900'
            }`}>
              {col.title}
            </h2>
            <div className="flex-1 overflow-y-auto space-y-3">
              {col.items.map((item, itemIdx) => {
                const isSelected = activeArea === 'grid' && selectedCol === colIndex && selectedItemIdx === itemIdx;
                const isEditing = editingItemId === item.id;

                return (
                  <div 
                    key={item.id} 
                    className={`p-3 text-sm transition-all ${
                      isSelected ? 'bg-zinc-800 border-l-4 border-white' : 'bg-zinc-900/30 border-l-4 border-transparent'
                    } ${isEditing ? 'ring-1 ring-white' : ''}`}
                  >
                    {isEditing ? (
                      <input
                        autoFocus
                        defaultValue={item.rawText}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleEditSubmit(item.id, e.currentTarget.value);
                          if (e.key === 'Escape') setEditingItemId(null);
                        }}
                        onBlur={(e) => handleEditSubmit(item.id, e.target.value)}
                        className="w-full bg-black text-white border-none focus:outline-none p-1"
                      />
                    ) : (
                      <p className={`mb-2 ${isSelected ? 'text-white' : 'text-zinc-400'}`}>{item.rawText}</p>
                    )}
                    
                    <div className="flex flex-wrap gap-2">
                      {item.aiParsed?.tags.map(tag => (
                        <span key={tag} className="tag-soft">#{tag}</span>
                      ))}
                      {item.userOverrides?.tags?.map(tag => (
                        <span key={tag} className="tag-hard-green">#{tag}</span>
                      ))}
                      
                      {item.aiParsed?.people.map(person => (
                        <span key={person} className="tag-soft">@{person}</span>
                      ))}
                      {item.userOverrides?.people?.map(person => (
                        <span key={person} className="tag-hard-green">@{person}</span>
                      ))}

                      {item.aiParsed?.dates.map(date => (
                        <span key={date.label} className="tag-soft">{date.label}: {new Date(date.iso_date).toLocaleDateString()}</span>
                      ))}
                    </div>
                    
                    {!item.aiParsed && (
                      <div className="mt-2 text-[10px] text-zinc-700 animate-pulse uppercase">Thinking...</div>
                    )}
                  </div>
                );
              })}
              
              {col.items.length === 0 && (
                 <div className="flex items-center justify-center h-full text-zinc-900 text-[10px] uppercase tracking-tighter">
                  - Empty -
                 </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {showPalette && (
        <div className="absolute inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-950 border border-white p-8 shadow-2xl">
            <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-8 border-b border-zinc-800 pb-2">Switch View</h3>
            <div className="space-y-4 font-mono">
              <div 
                onClick={() => { setViewMode('UNASSIGNED'); setShowPalette(false); }}
                className="flex justify-between items-center p-3 hover:bg-white hover:text-black cursor-pointer transition-colors group"
              >
                <span>1. UNASSIGNED</span>
                <span className="text-[10px] opacity-50">Default</span>
              </div>
              <div 
                onClick={() => { setViewMode('PROJECTS'); setShowPalette(false); }}
                className="flex justify-between items-center p-3 hover:bg-white hover:text-black cursor-pointer transition-colors group"
              >
                <span>2. PROJECTS</span>
                <span className="text-[10px] opacity-50">#TAGS</span>
              </div>
              <div 
                onClick={() => { setViewMode('PEOPLE'); setShowPalette(false); }}
                className="flex justify-between items-center p-3 hover:bg-white hover:text-black cursor-pointer transition-colors group"
              >
                <span>3. PEOPLE</span>
                <span className="text-[10px] opacity-50">@PEOPLE</span>
              </div>
              <div 
                onClick={() => { setViewMode('TIMELINE'); setShowPalette(false); }}
                className="flex justify-between items-center p-3 hover:bg-white hover:text-black cursor-pointer transition-colors group"
              >
                <span>4. TIMELINE</span>
                <span className="text-[10px] opacity-50">DATE</span>
              </div>
            </div>
            <p className="mt-12 text-[10px] text-zinc-700 uppercase tracking-widest">Esc to close • Select with Mouse or Key</p>
          </div>
        </div>
      )}

      <footer className="text-[10px] font-mono uppercase tracking-widest text-zinc-600 flex justify-between">
        <div className="flex gap-4">
          <span>Focus: {activeArea}</span>
          {activeArea === 'grid' && <span>Column: {groupedCols[selectedCol].title}</span>}
        </div>
        <div>
          PROJECT AGENDA v0.1.0
        </div>
      </footer>
    </main>
  );
}
