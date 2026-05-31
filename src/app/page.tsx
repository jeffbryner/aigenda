'use client';

import { useState, useRef, useEffect } from 'react';
import { useKeyboard } from '@/hooks/use-keyboard';
import { functions } from '@/lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { AgendaItem } from '@/types/agenda';

export default function Home() {
  const [activeArea, setActiveArea] = useState<'input' | 'grid'>('input');
  const [selectedCol, setSelectedCol] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [showPalette, setShowPalette] = useState(false);
  const [items, setItems] = useState<AgendaItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on load
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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
      if (activeArea === 'input') {
        inputRef.current?.blur();
        setActiveArea('grid');
      }
    },
    'ArrowRight': () => {
      if (activeArea === 'grid') {
        setSelectedCol(prev => (prev + 1) % 3);
      }
    },
    'ArrowLeft': () => {
      if (activeArea === 'grid') {
        setSelectedCol(prev => (prev - 1 + 3) % 3);
      }
    },
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    
    const raw = inputValue;
    setInputValue('');

    // Optimistic Update
    const newItem: AgendaItem = {
      id: Math.random().toString(36).substr(2, 9),
      rawText: raw,
      status: 'active',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    setItems(prev => [newItem, ...prev]);

    try {
      const extractAgendaItem = httpsCallable(functions, 'extractAgendaItem');
      const result = await extractAgendaItem({ 
        rawText: raw,
        currentTimestamp: new Date().toISOString()
      });
      
      const aiData = result.data as any;
      
      // Update item with AI data
      setItems(prev => prev.map(item => 
        item.id === newItem.id 
          ? { ...item, aiParsed: {
              actionItems: aiData.action_items,
              people: aiData.people,
              tags: aiData.tags,
              dates: aiData.dates
            } } 
          : item
      ));
    } catch (error) {
      console.error('AI Extraction failed:', error);
    }
  };

  return (
    <main className="flex-1 flex flex-col p-4 md:p-8 space-y-8 relative overflow-hidden">
      {/* Global Command Bar */}
      <div className="w-full max-w-4xl mx-auto">
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

      {/* Matrix Grid */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6">
        {[0, 1, 2].map((colIndex) => (
          <div 
            key={colIndex}
            className={`border transition-colors p-4 flex flex-col ${
              activeArea === 'grid' && selectedCol === colIndex 
                ? 'border-white ring-1 ring-white' 
                : 'border-zinc-800'
            }`}
          >
            <h2 className={`text-sm font-bold uppercase tracking-widest mb-4 border-b pb-2 transition-colors ${
              activeArea === 'grid' && selectedCol === colIndex ? 'text-white border-white' : 'text-zinc-500 border-zinc-800'
            }`}>
              {['Unassigned', 'Timeline', 'Projects'][colIndex]}
            </h2>
            <div className="flex-1 overflow-y-auto space-y-4">
              {colIndex === 0 && items.map(item => (
                <div key={item.id} className="bg-zinc-900/30 border border-zinc-800 p-3 text-sm group">
                  <p className="mb-2 text-zinc-300">{item.rawText}</p>
                  <div className="flex flex-wrap gap-2">
                    {item.aiParsed?.tags.map(tag => (
                      <span key={tag} className="tag-soft">#{tag}</span>
                    ))}
                    {item.aiParsed?.people.map(person => (
                      <span key={person} className="tag-hard-green">@{person}</span>
                    ))}
                    {item.aiParsed?.dates.map(date => (
                      <span key={date.label} className="tag-hard-amber">{date.label}: {new Date(date.iso_date).toLocaleDateString()}</span>
                    ))}
                  </div>
                  {!item.aiParsed && (
                    <div className="mt-2 text-[10px] text-zinc-600 animate-pulse">Processing AI...</div>
                  )}
                </div>
              ))}
              
              {colIndex === 0 && items.length === 0 && (
                 <div className="flex items-center justify-center h-full text-zinc-800 text-xs italic">
                  Empty
                 </div>
              )}

              {colIndex !== 0 && (
                 <div className="flex items-center justify-center h-full text-zinc-800 text-xs italic">
                  Empty
                 </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Command Palette Overlay */}
      {showPalette && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-white p-6 shadow-2xl">
            <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-6">Command Palette</h3>
            <div className="space-y-2 font-mono">
              <div className="flex justify-between items-center p-2 hover:bg-white hover:text-black cursor-pointer group">
                <span>1. Switch to Project View</span>
                <span className="text-[10px] opacity-50">#TAGS</span>
              </div>
              <div className="flex justify-between items-center p-2 hover:bg-white hover:text-black cursor-pointer group">
                <span>2. Switch to People View</span>
                <span className="text-[10px] opacity-50">@PEOPLE</span>
              </div>
              <div className="flex justify-between items-center p-2 hover:bg-white hover:text-black cursor-pointer group">
                <span>3. Switch to Timeline View</span>
                <span className="text-[10px] opacity-50">DATE</span>
              </div>
            </div>
            <p className="mt-8 text-[10px] text-zinc-600 uppercase">Press ESC to close</p>
          </div>
        </div>
      )}

      {/* Footer Status */}
      <footer className="text-[10px] font-mono uppercase tracking-widest text-zinc-600 flex justify-between">
        <div className="flex gap-4">
          <span>Focus: {activeArea}</span>
          {activeArea === 'grid' && <span>Column: {['Unassigned', 'Timeline', 'Projects'][selectedCol]}</span>}
        </div>
        <div>
          PROJECT AGENDA v0.1.0
        </div>
      </footer>
    </main>
  );
}
