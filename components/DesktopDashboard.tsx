import React, { useState, useEffect } from 'react';
import { 
  X, 
  Layers, 
  Calendar as CalendarIcon, 
  Edit3, 
  Cpu, 
  Plus, 
  Trash2, 
  Clock, 
  CheckSquare, 
  Activity, 
  Zap, 
  TrendingUp, 
  Layout, 
  Sparkles,
  Info,
  Sun,
  Moon,
  Compass
} from 'lucide-react';
import { PinnwandEintrag, EntryCategory } from './Pinnwand';
import { WhiteboardNote } from './Whiteboard';
import { getISOWeek, getDateLabel } from './pinnwandUtils';
import { useFirebase } from './FirebaseContext';
import { OpsAgentView } from './OpsAgentView';
import { StrategyAgentView } from './StrategyAgentView';
import { CreativeAgentView } from './CreativeAgentView';
import { RoadmapView } from './RoadmapView';
import { VayBoardCanvas } from './VayBoardCanvas';

type BoardMode = 'PINNWAND' | 'KALENDER' | 'WHITEBOARD' | 'AGENTEN' | 'ROADMAP' | 'VAYBOARD';

interface DesktopDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: BoardMode;
  setActiveTab: (tab: BoardMode) => void;
}

export const DesktopDashboard: React.FC<DesktopDashboardProps> = ({ 
  isOpen, 
  onClose, 
  activeTab, 
  setActiveTab 
}) => {
  const {
    pinnwandNotes,
    whiteboardNotes,
    whiteboardMainText,
    addPinnwandNote: addPinnwandNoteDb,
    deletePinnwandNote: deletePinnwandNoteDb,
    addWhiteboardNote: addWhiteboardNoteDb,
    deleteWhiteboardNote: deleteWhiteboardNoteDb,
    updateWhiteboardMainText: updateWhiteboardMainTextDb
  } = useFirebase();

  // Alias variable to remain fully backward-compatible with 900+ lines of JSX codes
  const notes = pinnwandNotes;

  const [pinnwandInputs, setPinnwandInputs] = useState<Record<string, string>>({
    PROCESS: '',
    TASK: '',
    NOTE: '',
    FOKUS: ''
  });

  const [newStickyText, setNewStickyText] = useState('');
  const [newStickyColor, setNewStickyColor] = useState('#fef08a');
  const [showStickyForm, setShowStickyForm] = useState(false);
  const [activeOpsView, setActiveOpsView] = useState<'GRID' | 'OPS' | 'STRATEGIE' | 'CREATIVE'>('GRID');
  const [theme, setTheme] = useState<'DARK' | 'LIGHT'>(() => {
    const saved = localStorage.getItem('konferenzhub.workspaceTheme');
    return (saved === 'LIGHT') ? 'LIGHT' : 'DARK';
  });

  const toggleTheme = () => {
    const nextTheme = theme === 'DARK' ? 'LIGHT' : 'DARK';
    setTheme(nextTheme);
    localStorage.setItem('konferenzhub.workspaceTheme', nextTheme);
  };

  // --- Keyboard Listener to exit on Escape ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // --- Pinnwand Core Actions (Updated to Firebase) ---
  const addPinnwandNote = (text: string, category: EntryCategory) => {
    if (!text.trim()) return;
    addPinnwandNoteDb(text.trim(), category);
  };

  const deletePinnwandNote = (id: string) => {
    deletePinnwandNoteDb(id);
  };

  const handlePinnwandSubmit = async (category: EntryCategory) => {
    const text = pinnwandInputs[category];
    if (!text?.trim()) return;
    
    // For FOCUS category, replace any existing focus note to maintain exactly one focus item
    if (category === 'FOKUS') {
      const existingFokus = notes.find(n => n.category === 'FOKUS');
      if (existingFokus) {
        await deletePinnwandNoteDb(existingFokus.id);
      }
    }

    await addPinnwandNoteDb(text.trim(), category);
    setPinnwandInputs(prev => ({ ...prev, [category]: '' }));
  };

  // --- Whiteboard Core Actions (Updated to Firebase) ---
  const addStickyNote = () => {
    if (!newStickyText.trim()) return;
    const x = (Math.random() - 0.5) * 5;
    const z = (Math.random() - 0.5) * 3;
    const rotationZ = (Math.random() - 0.5) * 0.2;
    addWhiteboardNoteDb(newStickyText.trim(), newStickyColor, x, z, rotationZ);
    setNewStickyText('');
    setShowStickyForm(false);
  };

  const deleteStickyNote = (id: string) => {
    deleteWhiteboardNoteDb(id);
  };

  const updateWhiteboardMainText = (text: string) => {
    updateWhiteboardMainTextDb(text);
  };

  // --- Filtering Notes helper ---
  const getPinnwandCategoryList = (category: EntryCategory) => {
    return notes.filter(n => n.category === category);
  };

  // Pre-configured lists for rendering
  const processNotes = getPinnwandCategoryList('PROCESS');
  const taskNotes = getPinnwandCategoryList('TASK');
  const regularNotes = getPinnwandCategoryList('NOTE');
  const focusNote = getPinnwandCategoryList('FOKUS')[0];

  const categoryColors = {
    PROCESS: '#3b82f6', // blue
    TASK: '#d97706',    // yellow/orange
    NOTE: '#10b981',    // green
    KPI: '#ec4899',     // magenta
    FOKUS: '#ff9b5a'    // warm peach
  };

  const getWeekDays = () => {
    return [
      { name: 'Montag', label: 'MO' },
      { name: 'Dienstag', label: 'DI' },
      { name: 'Mittwoch', label: 'MI' },
      { name: 'Donnerstag', label: 'DO' },
      { name: 'Freitag', label: 'FR' },
      { name: 'Samstag', label: 'SA' },
      { name: 'Sonntag', label: 'SO' }
    ];
  };

  const todayIndex = (new Date().getDay() + 6) % 7; // Convert 0-6 (Sun-Sat) to 0-6 (Mon-Sun)
  const currentWeek = getISOWeek(new Date());

  return (
    <div className={`fixed inset-0 z-[9990] backdrop-blur-md flex flex-col p-4 md:p-8 overflow-hidden animate-in fade-in duration-300 transition-all ${theme === 'LIGHT' ? 'bg-slate-100/90 workspace-light-root' : 'bg-[#07080a]/92'}`}>
      
      <style>{`
        /* Segmented, elegant, glass-like floating scrollbars that follow window rounding */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
          margin-top: 20px;
          margin-bottom: 24px;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.18) !important;
          border-radius: 9999px !important;
          border: 2px solid transparent !important;
          background-clip: padding-box !important;
          transition: background 0.3s ease;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.35) !important;
        }
        ::-webkit-scrollbar-button {
          display: none !important; /* Hides native up/down browser buttons */
        }
        /* Custom scrollbar fallback for Firefox */
        * {
          scrollbar-width: thin;
          scrollbar-color: rgba(255, 255, 255, 0.18) transparent;
        }

        /* --- Complete Workspace Light Theme System --- */
        .workspace-light-root {
          background-color: #f1f5f9 !important;
          color: #1e293b !important;
        }

        .workspace-light-root .bg-\[\#0b0d12\]\/90 {
          background-color: #ffffff !important;
          border-color: #cbd5e1 !important;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.02) !important;
        }

        .workspace-light-root header {
          background-color: #ffffff !important;
          border-bottom: 1px solid #e2e8f0 !important;
        }

        .workspace-light-root main {
          background-color: #f8fafc !important;
          color: #0f172a !important;
        }

        /* Nav & Tabs inside header */
        .workspace-light-root nav {
          background-color: #f1f5f9 !important;
          border: 1px solid #cbd5e1 !important;
        }
        .workspace-light-root nav button {
          color: #475569 !important;
        }
        .workspace-light-root nav button:hover {
          color: #0f172a !important;
          background-color: rgba(0, 0, 0, 0.04) !important;
        }
        /* Active tabs style override */
        .workspace-light-root nav button.text-white,
        .workspace-light-root nav button.bg-gradient-to-r {
          background: #ffffff !important;
          border: 1px solid #cbd5e1 !important;
          color: #4f46e5 !important;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06) !important;
          font-weight: 800 !important;
        }
        .workspace-light-root nav button.text-white span,
        .workspace-light-root nav button.bg-gradient-to-r span {
          color: #4f46e5 !important;
        }

        /* Scrollbars in light mode */
        .workspace-light-root ::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.16) !important;
        }
        .workspace-light-root ::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 0, 0, 0.28) !important;
        }
        .workspace-light-root * {
          scrollbar-color: rgba(0, 0, 0, 0.16) transparent !important;
        }

        /* Calendar columns and day slots */
        .workspace-light-root .bg-slate-900\/20,
        .workspace-light-root .bg-white\/\[0\.015\] {
          background-color: #ffffff !important;
          border-color: #cbd5e1 !important;
        }
        .workspace-light-root .bg-slate-900\/10 {
          background-color: #f1f5f9 !important;
          border: 1px solid #e2e8f0 !important;
        }

        /* KPI panel items in light mode */
        .workspace-light-root .grid.grid-cols-2 > div {
          background-color: #f8fafc !important;
          border: 1px solid #e2e8f0 !important;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.01) !important;
        }
        .workspace-light-root .grid.grid-cols-2 > div:hover {
          border-color: #cbd5e1 !important;
          background-color: #ffffff !important;
        }
        .workspace-light-root .grid.grid-cols-2 > div span.text-3xl {
          color: #1e293b !important;
        }
        .workspace-light-root .grid.grid-cols-2 > div span.text-\[11px\] {
          color: #475569 !important;
        }
        .workspace-light-root .grid.grid-cols-2 > div .bg-white\/20 {
          background-color: #cbd5e1 !important;
        }

        /* Header Close and ESC items */
        .workspace-light-root button.group.px-4.py-2.bg-white\/5 {
          background-color: #f1f5f9 !important;
          border: 1px solid #cbd5e1 !important;
          color: #475569 !important;
        }
        .workspace-light-root button.group.px-4.py-2.bg-white\/5:hover {
          background-color: #fee2e2 !important;
          border-color: #fca5a5 !important;
          color: #ef4444 !important;
        }
        .workspace-light-root button.group.px-4.py-2.bg-white\/5 kbd {
          background-color: #cbd5e1 !important;
          color: #334155 !important;
        }

        /* Whiteboard Sticky note specific controls */
        .workspace-light-root .lg\:col-span-3.flex.flex-col.bg-\[\#14161f\]\/30 {
          background-color: #ffffff !important;
          border: 1px solid #cbd5e1 !important;
        }
        .workspace-light-root .bg-slate-950\/20.border-white\/5 {
          background-color: #f8fafc !important;
          border: 1px solid #e2e8f0 !important;
        }
      `}</style>
      
      {/* Visual Glowing Background Accents */}
      <div className="absolute top-[-10%] left-[20%] w-[50%] h-[40%] rounded-full bg-indigo-500/10 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[20%] w-[40%] h-[40%] rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none" />

      {/* Main glass frame */}
      <div className="w-full max-w-7xl mx-auto flex-1 bg-[#0b0d12]/90 border border-[#3a3f4b]/40 rounded-[28px] shadow-[0_24px_60px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden relative">
        
        {/* Fine Header High-contrast bar */}
        <header className="px-8 py-5 border-b border-[#3a3f4b]/20 flex flex-col md:flex-row items-center justify-between gap-4 bg-black/20">
          <div className="flex flex-col">
            <span className="text-xs font-mono text-[#9aa3b2] tracking-widest uppercase mb-0.5">
              Smart Workspace Hub
            </span>
            <span className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <Clock size={16} className="text-[#ff9b5a]" />
              {new Date().toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
            </span>
          </div>

          {/* Symmetrical Inline Tabs */}
          <nav className="flex items-center gap-1.5 p-1 bg-white/5 border border-white/5 rounded-full">
            {(['PINNWAND', 'KALENDER', 'WHITEBOARD', 'AGENTEN', 'ROADMAP', 'VAYBOARD'] as BoardMode[]).map((tab) => {
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-5 py-2 text-[10px] font-black tracking-widest uppercase transition-all duration-200 rounded-full flex items-center gap-2 ${
                    isActive 
                      ? 'bg-gradient-to-r from-indigo-500/15 to-emerald-500/15 border border-white/10 text-white shadow-lg' 
                      : 'text-white/40 hover:text-white/70 hover:bg-white/5 border border-transparent'
                  }`}
                >
                  {tab === 'PINNWAND' && <Layers size={12} />}
                  {tab === 'KALENDER' && <CalendarIcon size={12} />}
                  {tab === 'WHITEBOARD' && <Edit3 size={12} />}
                  {tab === 'AGENTEN' && <Cpu size={12} />}
                  {tab === 'ROADMAP' && <TrendingUp size={12} />}
                  {tab === 'VAYBOARD' && <Compass size={12} />}
                  <span>{tab}</span>
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981]" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Action Row - Symmetrical & Clean Theme Toggle + Close Button */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className={`p-2.5 rounded-full border transition-all duration-300 flex items-center justify-center relative ${
                theme === 'LIGHT'
                  ? 'bg-slate-200 hover:bg-slate-300 border-slate-300 text-slate-800'
                  : 'bg-white/5 hover:bg-white/10 border-white/10 text-white hover:text-[#ff9b5a]'
              }`}
              title={theme === 'LIGHT' ? 'Dunkelmodus aktivieren' : 'Hellmodus aktivieren'}
            >
              {theme === 'LIGHT' ? <Moon size={15} /> : <Sun size={15} />}
            </button>

            <button
              onClick={onClose}
              className="group px-4 py-2 bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/30 rounded-full flex items-center gap-2 transition-all text-xs font-semibold text-slate-300 hover:text-red-400"
              title="Schließen [ESC]"
            >
              <span>Schließen</span>
              <kbd className="px-1.5 py-0.5 text-[8px] bg-white/10 rounded font-mono group-hover:bg-red-500/20">ESC</kbd>
              <X size={14} />
            </button>
          </div>
        </header>

        {/* Dashboard Workspace - Scrollable */}
        <main className="flex-1 overflow-y-auto dashboard-scrollbar p-6 md:p-8 bg-gradient-to-b from-[#0b0d12]/40 to-[#07080b]/90 text-slate-200">
          
          {/* TAB: PINNWAND */}
          {activeTab === 'PINNWAND' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 min-h-[500px] h-full items-start">
              
              {/* Left Column: PROZESSE */}
              <section className={`flex flex-col h-full p-5 rounded-2xl border transition-all ${theme === 'LIGHT' ? 'bg-white border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.02)]' : 'bg-white/[0.02] border-white/5'}`}>
                <div className="flex items-center justify-between border-b-2 border-blue-500/60 pb-2 mb-4">
                  <span className={`text-sm font-black tracking-widest flex items-center gap-2 ${theme === 'LIGHT' ? 'text-slate-800' : 'text-white'}`}>
                    <Activity size={14} className="text-blue-400 animate-pulse" />
                    PROZESSE
                  </span>
                  <span className={`text-[10px] font-mono border px-2 py-0.5 rounded-full ${theme === 'LIGHT' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' : 'bg-blue-500/10 text-blue-300 border border-blue-500/20'}`}>
                    {processNotes.length} AKTIV
                  </span>
                </div>

                {/* Process List */}
                <div className="flex-1 flex flex-col gap-3 max-h-[420px] overflow-y-auto dashboard-scrollbar pr-1 mb-4">
                  {processNotes.length === 0 ? (
                    <div className={`flex-1 flex flex-col items-center justify-center p-8 border border-dashed rounded-xl text-center text-xs ${theme === 'LIGHT' ? 'border-slate-200 text-slate-400' : 'border-white/5 text-slate-500'}`}>
                      <Zap size={18} className={`${theme === 'LIGHT' ? 'text-slate-300' : 'text-slate-600'} mb-2 opacity-50`} />
                      Keine aktiven Prozesse.
                    </div>
                  ) : (
                    processNotes.map((note) => (
                      <div 
                        key={note.id} 
                        className={`group relative flex items-center justify-between p-3.5 border rounded-xl transition-all duration-200 animate-in fade-in slide-in-from-bottom-2 ${
                          theme === 'LIGHT'
                            ? 'bg-slate-50 border-slate-200/60 hover:bg-slate-100/50 hover:border-blue-500/30 shadow-[0_2px_8px_rgba(0,0,0,0.02)]'
                            : 'bg-slate-950/60 border-white/5 hover:border-blue-500/20 hover:bg-slate-950/80'
                        }`}
                      >
                        <div className="absolute left-0 top-2.5 bottom-2.5 w-1 rounded-r bg-blue-500" />
                        <div className="pl-3 pr-4 flex-1">
                          <p className={`text-sm font-semibold leading-relaxed ${theme === 'LIGHT' ? 'text-slate-800' : 'text-slate-200'}`}>{note.text}</p>
                          <span className={`text-[9px] font-mono mt-1 block ${theme === 'LIGHT' ? 'text-slate-400' : 'text-slate-400'}`}>{note.dateLabel}</span>
                        </div>
                        <button 
                          onClick={() => deletePinnwandNote(note.id)}
                          className={`opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all ${
                            theme === 'LIGHT'
                              ? 'hover:bg-red-500/10 text-slate-400 hover:text-red-500'
                              : 'hover:bg-red-500/20 hover:text-red-400 text-slate-400'
                          }`}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Add process input inline */}
                <form 
                  onSubmit={(e) => { e.preventDefault(); handlePinnwandSubmit('PROCESS'); }}
                  className={`flex gap-2 items-center border rounded-xl p-1 transition-all ${
                    theme === 'LIGHT'
                      ? 'bg-slate-50 border-slate-200 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500/40'
                      : 'bg-slate-950/80 border-white/10 focus-within:ring-2 focus-within:ring-blue-500/40 focus-within:border-blue-500/40'
                  }`}
                >
                  <input
                    type="text"
                    placeholder="Neuen Prozess starten..."
                    value={pinnwandInputs.PROCESS}
                    onChange={(e) => setPinnwandInputs(prev => ({ ...prev, PROCESS: e.target.value }))}
                    className={`flex-1 px-3 py-2 bg-transparent text-xs border-none outline-none ${
                      theme === 'LIGHT' ? 'text-slate-800 placeholder-slate-400' : 'text-white placeholder-slate-500'
                    }`}
                  />
                  <button 
                    type="submit" 
                    className="p-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center justify-center"
                  >
                    <Plus size={14} />
                  </button>
                </form>
              </section>

              {/* Center Column: FOKUS & AUFGABEN */}
              <section className={`flex flex-col h-full p-5 rounded-2xl border transition-all ${theme === 'LIGHT' ? 'bg-white border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.02)]' : 'bg-white/[0.02] border-white/5'}`}>
                
                {/* 1) HEUTIGER FOKUS SECTION */}
                <div className="flex items-center gap-2 border-b-2 border-orange-500/60 pb-2 mb-4">
                  <Sparkles size={14} className="text-[#ff9b5a]" />
                  <span className={`text-xs font-black tracking-widest ${theme === 'LIGHT' ? 'text-slate-800' : 'text-slate-100'}`}>
                    HEUTIGER FOKUS
                  </span>
                </div>

                <div className="mb-6">
                  {focusNote ? (
                    <div className={`group relative flex items-center justify-between p-4 bg-gradient-to-r border rounded-xl transition-all duration-300 animate-in zoom-in-95 ${
                      theme === 'LIGHT'
                        ? 'from-orange-500/5 to-transparent border-orange-500/20 shadow-[0_4px_12px_rgba(251,146,60,0.05)] hover:border-orange-500/35'
                        : 'from-orange-500/10 to-transparent border-orange-500/30'
                    }`}>
                      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-orange-500 rounded-l" />
                      <div className="pl-4 pr-4 flex-1">
                        <span className="text-[8px] font-mono uppercase text-orange-500 tracking-widest font-black block mb-1">
                          Aktueller Tagesschwerpunkt
                        </span>
                        <p className={`text-sm font-extrabold leading-relaxed ${theme === 'LIGHT' ? 'text-slate-800' : 'text-slate-100'}`}>{focusNote.text}</p>
                      </div>
                      <button 
                        onClick={() => deletePinnwandNote(focusNote.id)}
                        className={`opacity-0 group-hover:opacity-100 p-2 rounded-lg transition-all ${
                          theme === 'LIGHT'
                            ? 'hover:bg-red-500/10 text-slate-400 hover:text-red-500'
                            : 'hover:bg-red-500/20 text-slate-450 hover:text-red-400'
                        }`}
                        title="Fokus entfernen"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <form 
                      onSubmit={(e) => { e.preventDefault(); handlePinnwandSubmit('FOKUS'); }}
                      className={`flex gap-2 items-center border border-dashed rounded-xl p-2.5 transition-all outline-none ${
                        theme === 'LIGHT'
                          ? 'bg-slate-50 border-slate-300 hover:border-orange-500/40'
                          : 'bg-slate-950/40 border border-dashed border-white/10 hover:border-orange-500/20'
                      }`}
                    >
                      <input
                        type="text"
                        placeholder="Heutigen Fokus festlegen..."
                        value={pinnwandInputs.FOKUS}
                        onChange={(e) => setPinnwandInputs(prev => ({ ...prev, FOKUS: e.target.value }))}
                        className={`flex-1 px-3 py-1.5 bg-transparent text-xs border-none outline-none ${
                          theme === 'LIGHT' ? 'text-slate-800 placeholder-slate-400' : 'text-white placeholder-slate-500'
                        }`}
                      />
                      <button 
                        type="submit" 
                        className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-[10px] font-bold transition-colors flex items-center gap-1"
                      >
                        <Plus size={12} /> Setzen
                      </button>
                    </form>
                  )}
                </div>

                {/* 2) AUFGABEN SECTION */}
                <div className="flex items-center justify-between border-b-2 border-amber-500/60 pb-2 mb-4 mt-2">
                  <span className={`text-sm font-black tracking-widest flex items-center gap-2 ${theme === 'LIGHT' ? 'text-slate-800' : 'text-slate-100'}`}>
                    <CheckSquare size={14} className="text-amber-500" />
                    AUFGABEN
                  </span>
                  <span className={`text-[10px] font-mono border px-2 py-0.5 rounded-full ${theme === 'LIGHT' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'}`}>
                    {taskNotes.length} OFFEN
                  </span>
                </div>

                {/* Tasks List */}
                <div className="flex-1 flex flex-col gap-2.5 max-h-[280px] overflow-y-auto dashboard-scrollbar pr-1 mb-4">
                  {taskNotes.length === 0 ? (
                    <div className={`flex-1 flex flex-col items-center justify-center p-8 border border-dashed rounded-xl text-center text-xs ${theme === 'LIGHT' ? 'border-slate-200 text-slate-400' : 'border-white/5 text-slate-500'}`}>
                      <CheckSquare size={18} className={`${theme === 'LIGHT' ? 'text-slate-400' : 'text-slate-600'} mb-2 opacity-50`} />
                      Alles erledigt! Keine Aufgaben mehr offen.
                    </div>
                  ) : (
                    taskNotes.map((note) => (
                      <div 
                        key={note.id} 
                        className={`group relative flex items-center justify-between p-3 border rounded-xl transition-all duration-200 animate-in fade-in slide-in-from-bottom-2 ${
                          theme === 'LIGHT'
                            ? 'bg-slate-50 border-slate-200/60 hover:bg-slate-100/50 hover:border-amber-500/35 shadow-[0_2px_8px_rgba(0,0,0,0.02)]'
                            : 'bg-slate-950/60 border-white/5 hover:border-amber-500/20 hover:bg-slate-950/80'
                        }`}
                      >
                        <div className="absolute left-0 top-2.5 bottom-2.5 w-1 rounded-r bg-amber-500" />
                        <div className="pl-3 pr-4 flex-1">
                          <p className={`text-sm font-semibold leading-relaxed ${theme === 'LIGHT' ? 'text-slate-800' : 'text-slate-200'}`}>{note.text}</p>
                          <span className={`text-[9px] font-mono mt-1 block ${theme === 'LIGHT' ? 'text-slate-400' : 'text-slate-400'}`}>{note.dateLabel}</span>
                        </div>
                        <button 
                          onClick={() => deletePinnwandNote(note.id)}
                          className={`opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all ${
                            theme === 'LIGHT'
                              ? 'hover:bg-red-500/10 text-slate-400 hover:text-red-500'
                              : 'hover:bg-red-500/20 hover:text-red-400 text-slate-400'
                          }`}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Add task inline */}
                <form 
                  onSubmit={(e) => { e.preventDefault(); handlePinnwandSubmit('TASK'); }}
                  className={`flex gap-2 items-center border rounded-xl p-1 transition-all ${
                    theme === 'LIGHT'
                      ? 'bg-slate-50 border-slate-200 focus-within:ring-2 focus-within:ring-amber-500/20 focus-within:border-amber-500/40'
                      : 'bg-slate-950/80 border-white/10 focus-within:ring-2 focus-within:ring-amber-500/40 focus-within:border-amber-500/40'
                  }`}
                >
                  <input
                    type="text"
                    placeholder="Neue Aufgabe hinzufügen..."
                    value={pinnwandInputs.TASK}
                    onChange={(e) => setPinnwandInputs(prev => ({ ...prev, TASK: e.target.value }))}
                    className={`flex-1 px-3 py-2 bg-transparent text-xs border-none outline-none ${
                      theme === 'LIGHT' ? 'text-slate-800 placeholder-slate-400' : 'text-white placeholder-slate-500'
                    }`}
                  />
                  <button 
                    type="submit" 
                    className="p-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors flex items-center justify-center animate-pulse"
                  >
                    <Plus size={14} />
                  </button>
                </form>
              </section>

              {/* Right Column: NOTIZEN & KPIS */}
              <section className={`flex flex-col h-full p-5 rounded-2xl border transition-all ${theme === 'LIGHT' ? 'bg-white border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.02)]' : 'bg-white/[0.02] border-white/5'}`}>
                <div className="flex items-center justify-between border-b-2 border-emerald-500/60 pb-2 mb-4">
                  <span className={`text-sm font-black tracking-widest flex items-center gap-2 ${theme === 'LIGHT' ? 'text-slate-800' : 'text-white'}`}>
                    <Layers size={14} className="text-emerald-400" />
                    NOTIZEN & KPIS
                  </span>
                  <span className={`text-[10px] font-mono border px-2 py-0.5 rounded-full ${theme === 'LIGHT' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'}`}>
                    {regularNotes.length} MEMOS
                  </span>
                </div>

                {/* PRECISE 2x2 KPI GRID - Match visual parameters perfectly */}
                <div className="grid grid-cols-2 gap-3 mb-5">
                  {/* Card 1: Offene Tasks */}
                  <div className={`border p-3 rounded-xl flex flex-col justify-between transition-all relative overflow-hidden ${
                    theme === 'LIGHT'
                      ? 'bg-slate-50 border-slate-200 hover:border-slate-300'
                      : 'bg-slate-950/90 border-white/5 hover:border-white/12'
                  }`}>
                    <span className={`text-[11px] font-mono uppercase tracking-wider block mb-1.5 ${theme === 'LIGHT' ? 'text-slate-500 font-bold' : 'text-slate-300'}`}>
                      OFFENE TASKS
                    </span>
                    <span className={`text-3xl font-black tracking-tight ${theme === 'LIGHT' ? 'text-slate-800' : 'text-white'}`}>{taskNotes.length || 12}</span>
                    <div className={`h-0.5 w-8 mt-2.5 rounded-full ${theme === 'LIGHT' ? 'bg-slate-300' : 'bg-white/20'}`} />
                  </div>

                  {/* Card 2: Aktive Prozesse */}
                  <div className={`border p-3 rounded-xl flex flex-col justify-between transition-all relative overflow-hidden ${
                    theme === 'LIGHT'
                      ? 'bg-slate-50 border-slate-200 hover:border-slate-300'
                      : 'bg-slate-950/90 border-white/5 hover:border-white/12'
                  }`}>
                    <span className={`text-[11px] font-mono uppercase tracking-wider block mb-1.5 ${theme === 'LIGHT' ? 'text-slate-500 font-bold' : 'text-slate-300'}`}>
                      AKTIVE PROZESSE
                    </span>
                    <span className={`text-3xl font-black tracking-tight ${theme === 'LIGHT' ? 'text-slate-800' : 'text-white'}`}>{processNotes.length || 3}</span>
                    <div className={`h-0.5 w-8 mt-2.5 rounded-full ${theme === 'LIGHT' ? 'bg-slate-300' : 'bg-white/20'}`} />
                  </div>

                  {/* Card 3: Agent-Auslastung */}
                  <div className={`border p-3 rounded-xl flex flex-col justify-between transition-all relative overflow-hidden ${
                    theme === 'LIGHT'
                      ? 'bg-slate-50 border-slate-200 hover:border-slate-300'
                      : 'bg-slate-950/90 border-white/5 hover:border-white/12'
                  }`}>
                    <span className={`text-[11px] font-mono uppercase tracking-wider block mb-1.5 ${theme === 'LIGHT' ? 'text-slate-500 font-bold' : 'text-slate-300'}`}>
                      AGENT-AUSLASTUNG
                    </span>
                    <span className={`text-3xl font-black tracking-tight ${theme === 'LIGHT' ? 'text-slate-800' : 'text-white'}`}>85%</span>
                    <div className={`h-0.5 w-8 mt-2.5 rounded-full ${theme === 'LIGHT' ? 'bg-slate-300' : 'bg-white/20'}`} />
                  </div>

                  {/* Card 4: Wochenbudget */}
                  <div className={`border p-3 rounded-xl flex flex-col justify-between transition-all relative overflow-hidden ${
                    theme === 'LIGHT'
                      ? 'bg-slate-50 border-slate-200 hover:border-slate-300'
                      : 'bg-slate-950/90 border-white/5 hover:border-white/12'
                  }`}>
                    <span className={`text-[11px] font-mono uppercase tracking-wider block mb-1.5 ${theme === 'LIGHT' ? 'text-slate-500 font-bold' : 'text-slate-300'}`}>
                      WOCHENBUDGET
                    </span>
                    <span className={`text-3xl font-black tracking-tight ${theme === 'LIGHT' ? 'text-slate-800' : 'text-white'}`}>€2.4k</span>
                    <div className={`h-0.5 w-8 mt-2.5 rounded-full ${theme === 'LIGHT' ? 'bg-slate-300' : 'bg-white/20'}`} />
                  </div>
                </div>

                {/* Notes List */}
                <div className="flex-1 flex flex-col gap-2.5 max-h-[190px] overflow-y-auto dashboard-scrollbar pr-1 mb-4">
                  {regularNotes.length === 0 ? (
                    <div className={`flex-1 flex flex-col items-center justify-center p-8 border border-dashed rounded-xl text-center text-xs ${theme === 'LIGHT' ? 'border-slate-200 text-slate-400' : 'border-white/5 text-slate-500'}`}>
                      <Layers size={18} className={`${theme === 'LIGHT' ? 'text-slate-300' : 'text-slate-600'} mb-2 opacity-50`} />
                      Keine Notizen aufgezeichnet.
                    </div>
                  ) : (
                    regularNotes.map((note) => (
                      <div 
                        key={note.id} 
                        className={`group relative flex items-center justify-between p-3 border rounded-xl transition-all duration-200 animate-in fade-in slide-in-from-bottom-2 ${
                          theme === 'LIGHT'
                            ? 'bg-slate-50 border-slate-200/60 hover:bg-slate-100/50 hover:border-emerald-500/35 shadow-[0_2px_8px_rgba(0,0,0,0.02)]'
                            : 'bg-slate-950/60 border-white/5 hover:border-emerald-500/20 hover:bg-slate-950/80'
                        }`}
                      >
                        <div className="absolute left-0 top-2.5 bottom-2.5 w-1 rounded-r bg-emerald-400" />
                        <div className="pl-3 pr-4 flex-1">
                          <p className={`text-xs font-semibold leading-relaxed ${theme === 'LIGHT' ? 'text-slate-800' : 'text-slate-200'}`}>{note.text}</p>
                          <span className={`text-[9px] font-mono mt-1 block ${theme === 'LIGHT' ? 'text-slate-400' : 'text-slate-400'}`}>{note.dateLabel}</span>
                        </div>
                        <button 
                          onClick={() => deletePinnwandNote(note.id)}
                          className={`opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all ${
                            theme === 'LIGHT'
                              ? 'hover:bg-red-500/10 text-slate-400 hover:text-red-500'
                              : 'hover:bg-red-500/20 hover:text-red-400 text-slate-400'
                          }`}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Add note inline */}
                <form 
                  onSubmit={(e) => { e.preventDefault(); handlePinnwandSubmit('NOTE'); }}
                  className={`flex gap-2 items-center border rounded-xl p-1 transition-all ${
                    theme === 'LIGHT'
                      ? 'bg-slate-50 border-slate-200 focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500/40'
                      : 'bg-slate-950/80 border-white/10 focus-within:ring-2 focus-within:ring-emerald-500/40 focus-within:border-emerald-500/40'
                  }`}
                >
                  <input
                    type="text"
                    placeholder="Neue Notiz vermerken..."
                    value={pinnwandInputs.NOTE}
                    onChange={(e) => setPinnwandInputs(prev => ({ ...prev, NOTE: e.target.value }))}
                    className={`flex-1 px-3 py-2 bg-transparent text-xs border-none outline-none ${
                      theme === 'LIGHT' ? 'text-slate-800 placeholder-slate-400' : 'text-white placeholder-slate-500'
                    }`}
                  />
                  <button 
                    type="submit" 
                    className="p-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors flex items-center justify-center flex-shrink-0"
                  >
                    <Plus size={14} />
                  </button>
                </form>
              </section>

            </div>
          )}

          {/* TAB: KALENDER */}
          {activeTab === 'KALENDER' && (
            <div className="flex flex-col h-full gap-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-[#3a3f4b]/20 pb-4 bg-slate-900/10 p-4 rounded-xl">
                <span className="text-sm font-semibold tracking-wide text-slate-300">
                  Wöchentliche Terminübersicht
                </span>
                <span className="text-xl font-black text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-5 py-2 rounded-xl">
                  KALENDERWOCHE {currentWeek}
                </span>
                <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                  <Info size={12} className="text-slate-500" />
                  Notizen werden anhand ihres Erstellungsdatums einsortiert.
                </span>
              </div>

              {/* 7-Weekday Columns Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-7 gap-3 min-h-[420px]">
                {getWeekDays().map((dayConfig, dIdx) => {
                  const isToday = dIdx === todayIndex;
                  const dayNotes = notes.filter(n => {
                    const d = new Date(n.createdAt);
                    const nWeek = getISOWeek(d);
                    const nDay = (d.getDay() + 6) % 7;
                    return nWeek === currentWeek && nDay === dIdx;
                  });

                  return (
                    <div 
                      key={dayConfig.label} 
                      className={`flex flex-col rounded-2xl p-3 border transition-all h-full min-h-[300px] ${
                        isToday 
                          ? 'bg-slate-950/80 border-emerald-400/40 shadow-[0_0_20px_rgba(16,185,129,0.06)]' 
                          : 'bg-white/[0.012] border-white/5'
                      }`}
                    >
                      <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-3">
                        <span className={`text-xs font-black tracking-widest ${isToday ? 'text-emerald-400 font-extrabold' : 'text-slate-300'}`}>
                          {dayConfig.label}
                        </span>
                        <span className="text-[9px] font-mono text-slate-500 uppercase">{dayConfig.name}</span>
                      </div>

                      {/* Day Entries List */}
                      <div className="flex-1 flex flex-col gap-2 overflow-y-auto dashboard-scrollbar max-h-[240px] pr-0.5 mb-2">
                        {dayNotes.length === 0 ? (
                          <div className="text-[9px] text-slate-600 italic text-center py-8">Bereich frei</div>
                        ) : (
                          dayNotes.map(note => (
                            <div 
                              key={note.id} 
                              className="group relative bg-slate-950 p-2 border border-white/5 hover:border-white/10 rounded-lg text-left transition-all"
                            >
                              <div className="absolute top-1.5 left-1.5 w-1 h-3 rounded" style={{ backgroundColor: categoryColors[note.category] || '#ccc' }} />
                              <p className="text-[10px] text-slate-200 font-medium pl-3 pr-4 leading-normal break-words">
                                {note.text}
                              </p>
                              <button
                                onClick={() => deletePinnwandNote(note.id)}
                                className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 cursor-pointer p-0.5 rounded transition-all"
                                title="Löschen"
                              >
                                <X size={10} />
                              </button>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Fast-add for that day */}
                      <button
                        onClick={() => {
                          const text = prompt(`Neue Notiz für ${dayConfig.name} hinzufügen:`);
                          if (text && text.trim()) {
                            // Align date to match the target weekday of the current year/week
                            const offsetDays = dIdx - todayIndex;
                            const targetDate = new Date();
                            targetDate.setDate(targetDate.getDate() + offsetDays);

                            addPinnwandNoteDb(text.trim(), 'NOTE', targetDate);
                          }
                        }}
                        className={`w-full py-1.5 bg-slate-950/40 hover:bg-white/5 border border-dashed border-white/10 rounded-lg text-[9px] font-semibold text-slate-400 group flex items-center justify-center gap-1 transition-colors`}
                      >
                        <Plus size={10} /> Notiz
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB: WHITEBOARD */}
          {activeTab === 'WHITEBOARD' && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 h-full min-h-[480px]">
              
              {/* Left 3 columns: STICKY NOTES BOARD CANVAS */}
              <div className="lg:col-span-3 flex flex-col bg-[#14161f]/30 border border-white/5 rounded-2xl p-5 relative overflow-hidden">
                <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
                  <span className="text-xs font-black tracking-widest text-[#ff9b5a] uppercase flex items-center gap-2">
                    <Edit3 size={14} className="text-[#ff9b5a]" />
                    Sticky Notes Brainstorming
                  </span>

                  {/* Add Sticky Note form toggle */}
                  {!showStickyForm ? (
                    <button
                      onClick={() => setShowStickyForm(true)}
                      className="px-3.5 py-1.5 bg-[#ff9b5a] text-white hover:bg-[#eb8c47] rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                    >
                      <Plus size={12} /> Stick-it erstellen
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 bg-[#0b0d12] border border-white/10 p-1.5 rounded-xl animate-in slide-in-from-right-3">
                      <div className="flex gap-1.5 px-2">
                        {['#fef08a', '#fed7aa', '#bfdbfe', '#bbf7d0', '#fbcfe8'].map(color => (
                          <button
                            key={color}
                            onClick={() => setNewStickyColor(color)}
                            className={`w-4 h-4 rounded-full transition-transform ${newStickyColor === color ? 'scale-125 ring-2 ring-white/50 border border-black' : 'opacity-60 hover:opacity-100'}`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      <input
                        type="text"
                        placeholder="Inhalt..."
                        value={newStickyText}
                        onChange={(e) => setNewStickyText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addStickyNote(); } }}
                        className="px-2.5 py-1 text-xs bg-white/5 rounded-lg border border-white/10 outline-none w-36 text-white"
                      />
                      <button onClick={addStickyNote} className="px-2.5 py-1 bg-white hover:bg-slate-100 text-black text-[10px] font-bold rounded-lg transition-colors">Hinzufügen</button>
                      <button onClick={() => setShowStickyForm(false)} className="px-2 py-1 text-slate-400 hover:text-white text-[10px]">Abbrechen</button>
                    </div>
                  )}
                </div>

                {/* Sticky notes container Grid */}
                <div className="flex-1 overflow-y-auto dashboard-scrollbar max-h-[400px] p-4 bg-slate-950/20 border border-white/5 rounded-xl min-h-[300px]">
                  {whiteboardNotes.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center p-12 text-slate-500 text-center text-xs">
                      <Edit3 size={32} className="text-[#ff9b5a]/30 mb-3" />
                      Dein Whiteboard ist noch leer. Erstelle oben eine neue Notiz, um Gedanken oder Konzepte zu pinnen!
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {whiteboardNotes.map((note) => {
                        // Reproduce rotation slightly for hand-crafted post-it look
                        const rotateClass = (parseInt(note.id, 36) % 3 === 0) 
                          ? 'rotate-1 hover:rotate-0' 
                          : (parseInt(note.id, 36) % 3 === 1) ? '-rotate-1 hover:rotate-0' : 'rotate-2 hover:rotate-0';

                        return (
                          <div 
                            key={note.id} 
                            style={{ backgroundColor: note.color }}
                            className={`p-3 rounded-md shadow-xl text-slate-800 text-xs text-center font-medium aspect-square flex flex-col justify-between transition-all duration-350 relative hover:scale-105 active:scale-95 ${rotateClass}`}
                          >
                            <button
                              onClick={() => deleteStickyNote(note.id)}
                              className="absolute top-1 right-1 p-0.5 bg-black/5 hover:bg-black/15 text-slate-600 hover:text-slate-900 rounded-full cursor-pointer transition-colors"
                              title="Sticky Note löschen"
                            >
                              <X size={10} />
                            </button>
                            <div className="flex-1 flex items-center justify-center px-1 font-sans font-bold py-2 overflow-y-auto max-h-[82%] select-text">
                              <p className="break-all">{note.text}</p>
                            </div>
                            <span className="text-[7.5px] font-mono text-slate-500 text-right opacity-60">
                              {new Date(note.createdAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Right 1 column: PERSISTENT MAIN BOARD TEXT */}
              <div className="flex flex-col bg-[#14161f]/30 border border-white/5 rounded-2xl p-5">
                <span className="text-xs font-black tracking-widest text-[#ff9b5a] uppercase border-b border-white/5 pb-2.5 mb-4 block">
                  Zentrale Boardnotiz
                </span>
                
                <p className="text-[10px] text-slate-400 leading-normal mb-3 leading-relaxed">
                  Trage wichtige Systemparameter, Diskussionsleitfäden oder Tagesziele ein. Diese Notiz bleibt persistent im Studio sichtbar.
                </p>

                <textarea
                  placeholder="Schreibe hier wichtiges Wissen für dein Team..."
                  value={whiteboardMainText}
                  onChange={(e) => updateWhiteboardMainText(e.target.value)}
                  className="flex-1 w-full p-4 bg-slate-950/80 border border-white/10 rounded-xl focus:ring-2 focus:ring-[#ff9b5a]/40 text-slate-100 text-sm outline-none resize-none placeholder-slate-600 shadow-inner"
                />
              </div>

            </div>
          )}

          {/* TAB: AGENTEN */}
          {activeTab === 'AGENTEN' && (
            activeOpsView === 'OPS' ? (
              <OpsAgentView onBack={() => setActiveOpsView('GRID')} />
            ) : activeOpsView === 'STRATEGIE' ? (
              <StrategyAgentView onBack={() => setActiveOpsView('GRID')} />
            ) : activeOpsView === 'CREATIVE' ? (
              <CreativeAgentView onBack={() => setActiveOpsView('GRID')} />
            ) : (
              <div className="flex flex-col h-full gap-6">
                <div className="border-b border-[#3a3f4b]/20 pb-4 bg-slate-900/10 p-4 rounded-xl">
                  <span className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                    <Cpu size={18} className="text-[#3b82f6]" />
                    KI-Agenten Dashboard
                  </span>
                  <p className="text-xs text-slate-400 mt-1">
                    Hier siehst du die verfügbaren autonomen Agenten, die deine Workflows unterstützen, Recherchen betreiben und Prozesse beschleunigen.
                  </p>
                </div>

                {/* Bento Grid - 4 specialized agents */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  
                  {/* Agent 1: OPS */}
                  <div 
                    onClick={() => setActiveOpsView('OPS')}
                    className="group relative bg-[#141419]/60 border border-white/5 hover:border-blue-500/30 rounded-[22px] p-6 flex flex-col justify-between transition-all duration-300 hover:shadow-[0_12px_24px_rgba(59,130,246,0.06)] overflow-hidden cursor-pointer"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-blue-500/10 transition-colors" />
                    <div>
                      {/* Glowing bar header */}
                      <div className="h-1 bg-blue-500 rounded-full w-[40px] mb-4 shadow-[0_0_10px_#3b82f6]" />
                      <div className="flex items-baseline justify-between mb-2">
                        <h3 className="text-2xl font-black text-white tracking-wide">OPS</h3>
                        <span className="text-[10px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full font-bold">BETRIEB</span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed font-normal mt-2.5">
                        Verantwortlich für die Überwachung laufender Pipelines, Fehlerprüfungen im Code und die Steuerung von System-Workflows. Erzeugt Berichterstattungen und synchronisiert Aufgaben.
                      </p>
                    </div>
                    <div className="mt-8 pt-4 border-t border-white/5 flex items-center justify-between">
                      <span className="text-[9px] font-mono tracking-widest text-[#3b82f6] uppercase font-black">WORKSTATION ÖFFNEN</span>
                      <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                    </div>
                  </div>

                {/* Agent 2: STRATEGIE */}
                <div 
                  onClick={() => setActiveOpsView('STRATEGIE')}
                  className="group relative bg-[#141419]/60 border border-white/5 hover:border-amber-500/30 rounded-[22px] p-6 flex flex-col justify-between transition-all duration-300 hover:shadow-[0_12px_24px_rgba(245,158,11,0.06)] overflow-hidden cursor-pointer"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-amber-500/10 transition-colors" />
                  <div>
                    <div className="h-1 bg-amber-500 rounded-full w-[40px] mb-4 shadow-[0_0_10px_#f59e0b]" />
                    <div className="flex items-baseline justify-between mb-2">
                      <h3 className="text-2xl font-black text-white tracking-wide">STRATEGIE</h3>
                      <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full font-bold">PLANUNG</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed font-normal mt-2.5">
                      Erfasse spontane Ideen sofort mobil oder am Desktop samt Vorschaubild, Beschreibung und Start-Prompt, und bereite diese passend zu deiner verfügbaren Bearbeitungszeit vor!
                    </p>
                  </div>
                  <div className="mt-8 pt-4 border-t border-white/5 flex items-center justify-between">
                    <span className="text-[9px] font-mono tracking-widest text-[#f59e0b] uppercase font-black">WORKSTATION ÖFFNEN</span>
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                    </span>
                  </div>
                </div>

                {/* Agent 3: SCOUT */}
                <div className="group relative bg-[#141419]/60 border border-white/5 hover:border-emerald-500/30 rounded-[22px] p-6 flex flex-col justify-between transition-all duration-300 hover:shadow-[0_12px_24px_rgba(16,185,129,0.06)] overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/10 transition-colors" />
                  <div>
                    <div className="h-1 bg-emerald-500 rounded-full w-[40px] mb-4 shadow-[0_0_10px_#10b981]" />
                    <div className="flex items-baseline justify-between mb-2">
                      <h3 className="text-2xl font-black text-white tracking-wide">SCOUT</h3>
                      <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full font-bold">RECHERCHE</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed font-normal mt-2.5">
                      Eigenständiger Web-Searcher, sammelt Marktkennzahlen, recherchiert technologische Neuentwicklungen und bereitet detaillierte Dossiers zu Sachthemen auf.
                    </p>
                  </div>
                  <div className="mt-8 pt-4 border-t border-white/5 flex items-center justify-between">
                    <span className="text-[9px] font-mono tracking-widest text-[#888] uppercase font-bold">BALD VERFÜGBAR</span>
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                  </div>
                </div>

                {/* Agent 4: CREATIVE */}
                <div 
                  onClick={() => setActiveOpsView('CREATIVE')}
                  className="group relative bg-[#141419]/60 border border-white/5 hover:border-purple-500/30 rounded-[22px] p-6 flex flex-col justify-between transition-all duration-300 hover:shadow-[0_12px_24px_rgba(139,92,246,0.06)] overflow-hidden cursor-pointer"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-purple-500/10 transition-colors" />
                  <div>
                    <div className="h-1 bg-purple-500 rounded-full w-[40px] mb-4 shadow-[0_0_10px_#8b5cf6]" />
                    <div className="flex items-baseline justify-between mb-2">
                      <h3 className="text-2xl font-black text-white tracking-wide">CREATIVE</h3>
                      <span className="text-[10px] text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full font-bold">DESIGN</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed font-normal mt-2.5">
                      Kreativer Sparringspartner für Logo-Entwürfe, Präsentations-Layouts und Textredaktionen. Generiert interaktiv visuelle Stile und unterstützt die Content-Erstellung.
                    </p>
                  </div>
                  <div className="mt-8 pt-4 border-t border-white/5 flex items-center justify-between">
                    <span className="text-[9px] font-mono tracking-widest text-[#8b5cf6] uppercase font-black">WORKSTATION ÖFFNEN</span>
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                    </span>
                  </div>
                </div>

              </div>
            </div>
          )
        )}

        {/* TAB: ROADMAP */}
        {activeTab === 'ROADMAP' && (
          <RoadmapView />
        )}

        {/* TAB: VAYBOARD */}
        {activeTab === 'VAYBOARD' && (
          <VayBoardCanvas />
        )}

        </main>

      </div>
    </div>
  );
};
