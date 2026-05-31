export default function Home() {
  return (
    <main className="flex-1 flex flex-col p-4 md:p-8 space-y-8">
      {/* Global Command Bar Placeholder */}
      <div className="w-full max-w-4xl mx-auto">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
            /
          </div>
          <input
            type="text"
            placeholder="Type a thought and hit Enter..."
            className="w-full bg-zinc-900/50 border border-zinc-800 focus:border-white focus:outline-none px-8 py-3 rounded-none text-lg transition-all"
            autoFocus
          />
        </div>
      </div>

      {/* Grid Placeholder */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="border border-zinc-800 p-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-4 border-b border-zinc-800 pb-2">
            Unassigned
          </h2>
          <div className="space-y-4">
            <div className="bg-zinc-900/30 border border-zinc-800 p-3 text-sm">
              <p className="mb-2">This is a sample agenda item.</p>
              <div className="flex flex-wrap gap-2">
                <span className="tag-soft">#sample</span>
                <span className="tag-hard-green">@Marcus</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="border border-zinc-800 p-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-4 border-b border-zinc-800 pb-2">
            Timeline
          </h2>
          <div className="flex items-center justify-center h-full text-zinc-700 text-xs italic">
            Waiting for input...
          </div>
        </div>

        <div className="border border-zinc-800 p-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-4 border-b border-zinc-800 pb-2">
            Projects
          </h2>
          <div className="flex items-center justify-center h-full text-zinc-700 text-xs italic">
            Waiting for input...
          </div>
        </div>
      </div>
    </main>
  );
}
