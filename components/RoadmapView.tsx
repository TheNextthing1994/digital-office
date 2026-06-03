import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  ListChecks, 
  TrendingUp, 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  RefreshCcw, 
  Sparkles, 
  Check, 
  Layers, 
  Calendar,
  X,
  Loader2,
  Bookmark,
  ChevronRight,
  ArrowRight,
  Lightbulb,
  FileText,
  LayoutGrid,
  List
} from 'lucide-react';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { useFirebase } from './FirebaseContext';
import { GoogleGenAI } from "@google/genai";
import { motion, AnimatePresence } from 'motion/react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

export interface RoadmapTask {
  id: string;
  text: string;
  detailText?: string;
  checked: boolean;
  category: 'CORE' | 'GLOSSAR' | 'DATABASE' | 'CUSTOM';
  weekNumber: number; // Kalenderwoche
  createdAt: string;
  subTasks?: { id: string; text: string; checked: boolean }[];
}

interface RoadmapViewProps {
  onBack?: () => void;
}

const DEFAULT_WEEK = 23;

const DEFAULT_TASKS: RoadmapTask[] = [
  {
    id: 'r1',
    text: 'Mit unserem Repository das Digitale Büro fertigstellen (Features aus dem seitlichen Heft)',
    detailText: 'Die primären Workspaces, das ausklappbare Booklet und erweiterte Layout-Features aus unserem Repository im Code finalisieren.',
    checked: false,
    category: 'CORE',
    weekNumber: 23,
    createdAt: new Date().toISOString(),
    subTasks: [
      { id: 'sub_1_1', text: 'Repo-Struktur clonen und Codebase matchen', checked: false },
      { id: 'sub_1_2', text: 'Features aus dem seitlichen Booklet-Heft übertragen', checked: false },
      { id: 'sub_1_3', text: 'Responsive Drawer & Navigation polieren', checked: false }
    ]
  },
  {
    id: 'r2',
    text: 'Glossar anlegen für die Teammitglieder',
    detailText: 'Zentrales Fachwörterbuch und Erklärungen wichtiger Begriffe (z.B. Recall, CBO, Premium-Fulfillment) für alle Teammitglieder anlegen.',
    checked: false,
    category: 'GLOSSAR',
    weekNumber: 23,
    createdAt: new Date().toISOString(),
    subTasks: [
      { id: 'sub_2_1', text: 'Vokabelliste mit Kern-Fachbegriffen erstellen', checked: false },
      { id: 'sub_2_2', text: 'Glossar-Sektion in die Teamplattform integrieren', checked: false },
      { id: 'sub_2_3', text: 'Beispiel-Workflows für bessere Verständlichkeit ergänzen', checked: false }
    ]
  },
  {
    id: 'r3',
    text: 'Recall als Live-Datenbank mit dem Digitalen Büro verbinden',
    detailText: 'Rechtzeitige und lückenlose Echtzeitdaten-Kopplung der Recall-Engines an das Digital Office Database, um Live-Status zu sichern.',
    checked: false,
    category: 'DATABASE',
    weekNumber: 23,
    createdAt: new Date().toISOString(),
    subTasks: [
      { id: 'sub_3_1', text: 'API-Verbindung zwischen Recall und Digital Office herstellen', checked: false },
      { id: 'sub_3_2', text: 'Live-Listener für Datenänderungen einrichten', checked: false },
      { id: 'sub_3_3', text: 'Stabilitätstest für concurrent requests durchführen', checked: false }
    ]
  }
];

export const RoadmapView: React.FC<RoadmapViewProps> = ({ onBack }) => {
  const { user } = useFirebase();
  const [tasks, setTasks] = useState<RoadmapTask[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<number>(DEFAULT_WEEK);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isModified, setIsModified] = useState<boolean>(false);
  const [saveStatusText, setSaveStatusText] = useState<string | null>(null);

  // Form Inputs
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskDetail, setNewTaskDetail] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState<'CORE' | 'GLOSSAR' | 'DATABASE' | 'CUSTOM'>('CUSTOM');
  const [isAdding, setIsAdding] = useState(false);

  // Intelligent AI Assist
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [activeAiTask, setActiveAiTask] = useState<string | null>(null);

  const [displayMode, setDisplayMode] = useState<'LIST' | 'GRID'>(() => {
    const saved = localStorage.getItem('konferenzhub.roadmap.displayMode');
    return (saved === 'GRID' || saved === 'LIST') ? saved : 'LIST';
  });

  useEffect(() => {
    localStorage.setItem('konferenzhub.roadmap.displayMode', displayMode);
  }, [displayMode]);

  // Load configuration from Firebase
  useEffect(() => {
    if (!user) {
      // Local fallback representation
      const savedLocal = localStorage.getItem('konferenzhub.roadmap_tasks.v1');
      if (savedLocal) {
        try {
          setTasks(JSON.parse(savedLocal));
        } catch {
          setTasks(DEFAULT_TASKS);
        }
      } else {
        setTasks(DEFAULT_TASKS);
      }
      setIsLoading(false);
      return;
    }

    const docRef = doc(db, 'whiteboard_config', 'roadmap_v1');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      setIsLoading(true);
      if (docSnap.exists()) {
        try {
          const data = docSnap.data();
          const parsed = JSON.parse(data.text || '[]');
          if (Array.isArray(parsed) && parsed.length > 0) {
            setTasks(parsed);
          } else {
            setTasks(DEFAULT_TASKS);
          }
        } catch (e) {
          console.error("Failed to parse roadmap tasks", e);
          setTasks(DEFAULT_TASKS);
        }
      } else {
        // Seeding database with defaults on first run
        setTasks(DEFAULT_TASKS);
        setDoc(docRef, {
          text: JSON.stringify(DEFAULT_TASKS),
          updatedAt: serverTimestamp(),
          lastUpdatedBy: user.email || "system"
        }).catch(err => console.error("Error creating roadmap config node", err));
      }
      setIsLoading(false);
    }, (error) => {
      console.error("Firebase connection error for roadmap", error);
      setIsLoading(false);
    });

    return unsubscribe;
  }, [user]);

  // Sync to local storage
  useEffect(() => {
    if (tasks.length > 0) {
      localStorage.setItem('konferenzhub.roadmap_tasks.v1', JSON.stringify(tasks));
    }
  }, [tasks]);

  const handleToggleTask = (taskId: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        const nextChecked = !t.checked;
        const updatedSubtasks = t.subTasks?.map(s => ({ ...s, checked: nextChecked })) || [];
        return { ...t, checked: nextChecked, subTasks: updatedSubtasks };
      }
      return t;
    }));
    setIsModified(true);
    triggerLocalSave();
  };

  const handleToggleSubtask = (taskId: string, subtaskId: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        const updatedSubtasks = t.subTasks?.map(s => {
          if (s.id === subtaskId) return { ...s, checked: !s.checked };
          return s;
        }) || [];
        const allChecked = updatedSubtasks.length > 0 && updatedSubtasks.every(s => s.checked);
        return { ...t, subTasks: updatedSubtasks, checked: allChecked };
      }
      return t;
    }));
    setIsModified(true);
    triggerLocalSave();
  };

  const triggerLocalSave = () => {
    // Flag to alert user that modifications are waiting for cloud sync
    setIsModified(true);
  };

  const handleAddTask = () => {
    if (!newTaskText.trim()) return;

    const newTask: RoadmapTask = {
      id: `task_${Math.random().toString(36).substring(2, 9)}`,
      text: newTaskText.trim(),
      detailText: newTaskDetail.trim() || undefined,
      checked: false,
      category: newTaskCategory,
      weekNumber: selectedWeek,
      createdAt: new Date().toISOString(),
      subTasks: []
    };

    setTasks(prev => [...prev, newTask]);
    setNewTaskText('');
    setNewTaskDetail('');
    setNewTaskCategory('CUSTOM');
    setIsAdding(false);
    setIsModified(true);
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    setIsModified(true);
  };

  const handleSaveToCloud = async () => {
    setIsSaving(true);
    setSaveStatusText("Wird synchronisiert...");
    try {
      if (user) {
        const docRef = doc(db, 'whiteboard_config', 'roadmap_v1');
        await setDoc(docRef, {
          text: JSON.stringify(tasks),
          updatedAt: serverTimestamp(),
          lastUpdatedBy: user.email || "user"
        });
        setIsModified(false);
        setSaveStatusText("Erfolgreich in Cloud gespeichert!");
      } else {
        localStorage.setItem('konferenzhub.roadmap_tasks.v1', JSON.stringify(tasks));
        setIsModified(false);
        setSaveStatusText("Lokal gesichert! (Bitte logge dich ein für Cloud-Persistence)");
      }
      setTimeout(() => setSaveStatusText(null), 3000);
    } catch (e) {
      console.error("Cloud saving failed", e);
      setSaveStatusText("Fehler beim Cloud-Speichern.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = () => {
    setTasks(DEFAULT_TASKS);
    setIsModified(true);
  };

  // Generate subtasks via Gemini AI
  const handleAIAssist = async (task: RoadmapTask) => {
    setActiveAiTask(task.id);
    setAiLoading(true);
    try {
      const apiKey = process.env.GEMINI_API_KEY || (window as any).process?.env?.GEMINI_API_KEY || "";
      const ai = new GoogleGenAI({ apiKey });

      const promptMsg = `Du bist ein professioneller agiler Projektmanager und Softwarearchitekt.
      Zerlege folgendes Roadmap-Ziel in 3 konkrete, klar formulierte, messbare deutsche Arbeitsschritte (Subtasks).
      
      Ziel: "${task.text}"
      Details: "${task.detailText || ''}"
      Kategorie: "${task.category}"
      
      Antworte als ein valides JSON-Array von Zeichenketten (max. 3 Elemente), genau so aufgebaut:
      ["Schritt 1...", "Schritt 2...", "Schritt 3..."]`;

      const response = await ai.models.generateContent({
        model: "gemini-2.1-flash",
        contents: promptMsg,
        config: { responseMimeType: "application/json" }
      });

      const suggestions = JSON.parse(response.text || "[]");
      if (Array.isArray(suggestions) && suggestions.length > 0) {
        setTasks(prev => prev.map(t => {
          if (t.id === task.id) {
            const addedSubtasks = suggestions.map((text, idx) => ({
              id: `${task.id}_sub_ai_${Date.now()}_${idx}`,
              text: String(text).trim(),
              checked: false
            }));
            const combined = [...(t.subTasks || []), ...addedSubtasks];
            return { ...t, subTasks: combined, checked: false };
          }
          return t;
        }));
        setIsModified(true);
      }
    } catch (e) {
      console.error("AI Assistant issue in Roadmap", e);
      // Fallback local subtasks
      setTasks(prev => prev.map(t => {
        if (t.id === task.id) {
          const added = [
            { id: `fallback_1_${Date.now()}`, text: 'Klarheit über nächste KPIs schaffen', checked: false },
            { id: `fallback_2_${Date.now()}`, text: 'Integrations-Schnittstelle prüfen', checked: false }
          ];
          return { ...t, subTasks: [...(t.subTasks || []), ...added], checked: false };
        }
        return t;
      }));
      setIsModified(true);
      alert("AI offline: Lokaler Entwurf hinzugefügt.");
    } finally {
      setAiLoading(false);
      setActiveAiTask(null);
    }
  };

  // Switch weeks or filter
  const currentWeekTasks = tasks.filter(t => t.weekNumber === selectedWeek);
  
  // Calculate Progress Stats
  const totalInWeek = currentWeekTasks.length;
  const completedInWeek = currentWeekTasks.filter(t => t.checked).length;
  const progressPercentage = totalInWeek > 0 ? Math.round((completedInWeek / totalInWeek) * 100) : 0;

  // Pie chart data for dashboard visualization
  const pieData = [
    { name: 'Erledigt', value: completedInWeek, color: '#10b981' },
    { name: 'Offen', value: Math.max(0, totalInWeek - completedInWeek), color: '#312e81' }
  ];

  // Helper render categories
  const getCategoryTheme = (cat: 'CORE' | 'GLOSSAR' | 'DATABASE' | 'CUSTOM') => {
    switch (cat) {
      case 'CORE':
        return { bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300', label: 'Digital Büro' };
      case 'GLOSSAR':
        return { bg: 'bg-amber-500/10 border-amber-500/30 text-amber-300', label: 'Glossar' };
      case 'DATABASE':
        return { bg: 'bg-blue-500/10 border-blue-500/30 text-blue-300', label: 'Live Database' };
      case 'CUSTOM':
      default:
        return { bg: 'bg-purple-500/10 border-purple-500/30 text-purple-300', label: 'Individuell' };
    }
  };

  return (
    <div id="roadmap-agent-root" className="flex flex-col bg-[#0b0d12]/20 text-slate-100 p-1 select-none">
      
      {/* Upper Status Action Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-5 mb-5 bg-slate-900/10 p-4 rounded-xl">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1 px-3 bg-white/5 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-all text-xs flex items-center gap-1 font-bold uppercase"
            >
              ← Zurück
            </button>
          )}
          <div>
            <span className="text-[10px] font-mono uppercase text-[#ff9b5a] tracking-widest font-bold block mb-0.5">
              Fahrplan &amp; Meilensteine
            </span>
            <span className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <Calendar size={18} className="text-indigo-400" />
              Wochenplan Roadmap
            </span>
          </div>
        </div>

        {/* Global actions */}
        <div className="flex items-center gap-4">
          <div className="flex bg-slate-950/60 p-1.5 rounded-full border border-white/5 items-center gap-1">
            <span className="text-[10px] font-mono px-3 text-slate-400 uppercase">Woche auswählen:</span>
            {[22, 23, 24, 25].map(wk => (
              <button
                key={wk}
                onClick={() => setSelectedWeek(wk)}
                className={`px-3 py-1 text-xs font-bold rounded-full transition-all ${selectedWeek === wk ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md shadow-indigo-500/10 scale-105' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
              >
                KW {wk}
              </button>
            ))}
          </div>

          <div className="h-6 w-[1px] bg-white/10 hidden md:block" />

          {/* Cloud Saving Indicator & Actions */}
          <div className="flex items-center gap-2">
            {isModified && (
              <span className="text-[10px] font-mono text-amber-400 animate-pulse bg-amber-500/5 px-2 py-1 rounded border border-amber-500/20 mr-1 hidden sm:block">
                ⚠️ Ungespeicherte Änderungen
              </span>
            )}
            
            <button
              onClick={handleSaveToCloud}
              disabled={isSaving}
              className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:from-emerald-800 text-white font-extrabold rounded-full text-xs shadow-lg flex items-center gap-1.5 transition-all text-center tracking-wider uppercase"
            >
              {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              <span>{isSaving ? 'Sichert...' : 'Sichern'}</span>
            </button>

            <button
              onClick={handleResetDefaults}
              className="p-2 bg-slate-900 border border-white/5 hover:border-white/15 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all text-xs"
              title="Auf KW23 Standards zurücksetzen"
            >
              <RefreshCcw size={13} />
            </button>
          </div>
        </div>
      </div>

      {saveStatusText && (
        <div className="text-xs text-center font-bold text-emerald-400 bg-emerald-500/10 px-4 py-2 border border-emerald-500/20 rounded-xl mb-4 animate-in fade-in duration-300">
          {saveStatusText}
        </div>
      )}

      {/* Main Workspace Layout */}
      <div className="flex-1 flex flex-col xl:flex-row gap-6 min-h-0">
        
        {/* Left Grid: Tasks List & Detailed Progress */}
        <div className="flex-1 flex flex-col gap-6 min-w-0">
          
          {/* Card: Task items of selected week */}
          <div className="bg-slate-950/40 border border-white/5 rounded-2xl p-6 flex flex-col relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-3 border-b border-white/5">
              <div>
                <h3 className="text-sm font-black tracking-widest text-[#ff9b5a] uppercase flex items-center gap-1">
                  <ListChecks size={15} />
                  Ziele für Kalenderwoche {selectedWeek}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Arbeite diese Ziele ab, um deinen Arbeitsplatz fertigzustellen und das Onboarding optimal vorzubereiten.
                </p>
              </div>

              {/* Display Mode control & Progress Badge */}
              <div className="flex items-center gap-4 self-end sm:self-auto">
                {/* Switcher */}
                <div className="flex items-center bg-black/40 border border-white/10 p-1 rounded-xl">
                  <button
                    onClick={() => setDisplayMode('LIST')}
                    className={`p-1.5 rounded-lg transition-all text-xs flex items-center gap-1 font-bold uppercase tracking-wider ${displayMode === 'LIST' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 font-black' : 'text-slate-400 hover:text-slate-200 border border-transparent'}`}
                    title="Listenansicht"
                  >
                    <List size={13} />
                    <span className="text-[10px]">Liste</span>
                  </button>
                  <button
                    onClick={() => setDisplayMode('GRID')}
                    className={`p-1.5 rounded-lg transition-all text-xs flex items-center gap-1 font-bold uppercase tracking-wider ${displayMode === 'GRID' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 font-black' : 'text-slate-400 hover:text-slate-200 border border-transparent'}`}
                    title="Kachelansicht"
                  >
                    <LayoutGrid size={13} />
                    <span className="text-[10px]">Kacheln</span>
                  </button>
                </div>

                <div className="h-8 w-[1px] bg-white/10" />

                <div className="flex flex-col items-end">
                  <span className="text-[9px] font-mono text-indigo-400 font-extrabold tracking-widest uppercase">Fortschritt</span>
                  <span className="text-xl font-black text-white">{progressPercentage}%</span>
                </div>
              </div>
            </div>

            {/* Quick mini-progress-bar */}
            <div className="w-full h-1.5 bg-slate-950/80 rounded-full mb-6 overflow-hidden border border-white/5">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 to-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>

            {/* Empty state in week */}
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-2">
                <Loader2 size={24} className="animate-spin text-indigo-500" />
                <span className="text-xs font-mono font-bold tracking-widest uppercase">Lade Roadmap Einträge...</span>
              </div>
            ) : currentWeekTasks.length === 0 ? (
              <div id="roadmap-empty-state" className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-white/5 rounded-xl bg-black/10">
                <Bookmark size={28} className="text-slate-600 mb-2" />
                <h4 className="text-sm font-bold text-slate-300">Keine Ziele für Woche {selectedWeek} eingetragen</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-[340px]">
                  Füge rechts ein neues Ziel hinzu oder wechsle zur Kalenderwoche 23, um die Kernroadmap zu sehen.
                </p>
                <button
                  onClick={() => {
                    setSelectedWeek(23);
                    setTasks(DEFAULT_TASKS);
                    setIsModified(true);
                  }}
                  className="mt-4 px-3.5 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-200 rounded-full text-xs font-bold transition-all uppercase tracking-wider"
                >
                  Standard KW 23 laden
                </button>
              </div>
            ) : displayMode === 'LIST' ? (
              <div className="space-y-4">
                {currentWeekTasks.map((t) => {
                  const theme = getCategoryTheme(t.category);
                  return (
                    <div 
                      key={t.id}
                      className={`p-5 rounded-2xl border transition-all duration-300 relative group flex flex-col md:flex-row gap-4 justify-between items-start ${
                        t.checked 
                          ? 'bg-emerald-950/10 border-emerald-500/20' 
                          : 'bg-white/[0.015] border-white/5 hover:border-white/10 hover:bg-white/[0.03]'
                      }`}
                    >
                      {/* Checkbox + Title block */}
                      <div className="flex gap-4 flex-1 items-start min-w-0">
                        <button
                          onClick={() => handleToggleTask(t.id)}
                          className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-all mt-0.5 ${
                            t.checked 
                              ? 'bg-emerald-500 border-emerald-400 text-slate-900' 
                              : 'border-white/20 hover:border-white/40 bg-slate-900/60'
                          }`}
                        >
                          {t.checked && <Check size={14} className="stroke-[3]" />}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${theme.bg}`}>
                              {theme.label}
                            </span>
                          </div>

                          <h4 className={`text-sm font-bold tracking-tight leading-normal ${t.checked ? 'text-slate-400 line-through' : 'text-slate-100'}`}>
                            {t.text}
                          </h4>

                          {t.detailText && (
                            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                              {t.detailText}
                            </p>
                          )}

                          {/* Subtasks Block */}
                          <div className="mt-4 pl-1 border-l border-white/5 space-y-2">
                            {t.subTasks && t.subTasks.map((sub) => (
                              <div key={sub.id} className="flex items-center gap-2 text-xs">
                                <button
                                  onClick={() => handleToggleSubtask(t.id, sub.id)}
                                  className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all ${
                                    sub.checked 
                                      ? 'bg-[#10b981]/30 border-[#10b981] text-emerald-400' 
                                      : 'border-white/10 hover:border-white/25 bg-black/20'
                                  }`}
                                >
                                  {sub.checked && <Check size={10} className="stroke-[3]" />}
                                </button>
                                <span className={`font-mono text-[11px] ${sub.checked ? 'text-slate-500 line-through' : 'text-slate-300'}`}>
                                  {sub.text}
                                </span>
                              </div>
                            ))}
                          </div>
                          
                          {/* AI Task breakdown assist button */}
                          <div className="mt-4 flex items-center gap-3">
                            <button
                              onClick={() => handleAIAssist(t)}
                              disabled={aiLoading && activeAiTask === t.id}
                              className="inline-flex items-center gap-1 text-[9px] font-mono font-bold tracking-widest text-indigo-400 hover:text-indigo-300 transition-colors uppercase bg-indigo-500/5 px-2 py-1 rounded border border-indigo-500/20 hover:bg-indigo-500/10 disabled:opacity-50"
                            >
                              <Sparkles size={10} className={aiLoading && activeAiTask === t.id ? "animate-spin" : "animate-pulse"} />
                              <span>{aiLoading && activeAiTask === t.id ? 'Generiert Schritte...' : 'Arbeitsschritte generieren (AI)'}</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Right Control Actions */}
                      <div className="flex md:flex-col justify-end items-center gap-2 flex-shrink-0 w-full md:w-auto mt-4 md:mt-0 pt-4 md:pt-0 border-t md:border-t-0 border-white/5">
                        <button
                          onClick={() => handleDeleteTask(t.id)}
                          className="flex items-center gap-1.5 px-3 py-1 bg-red-500/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg text-xs leading-none select-none transition-all border border-transparent hover:border-red-500/20 w-full md:w-auto justify-center"
                          title="Ziel löschen"
                        >
                          <Trash2 size={12} />
                          <span className="md:hidden">Löschen</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentWeekTasks.map((t) => {
                  const theme = getCategoryTheme(t.category);
                  return (
                    <div 
                      key={t.id}
                      className={`p-5 rounded-2xl border transition-all duration-300 relative group flex flex-col justify-between h-full min-h-[220px] ${
                        t.checked 
                          ? 'bg-emerald-950/10 border-emerald-500/20 shadow-[0_8px_20px_rgba(16,185,129,0.03)]' 
                          : 'bg-white/[0.015] border-white/5 hover:border-white/10 hover:bg-white/[0.03] hover:shadow-[0_8px_20px_rgba(255,255,255,0.02)]'
                      }`}
                    >
                      <div>
                        {/* Category & Top action row */}
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${theme.bg}`}>
                            {theme.label}
                          </span>
                          <button
                            onClick={() => handleDeleteTask(t.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 bg-red-500/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded transition-all"
                            title="Ziel löschen"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>

                        {/* Title & Checkbox */}
                        <div className="flex gap-3 items-start mb-2">
                          <button
                            onClick={() => handleToggleTask(t.id)}
                            className={`w-4.5 h-4.5 rounded border flex items-center justify-center flex-shrink-0 transition-all mt-0.5 ${
                              t.checked 
                                ? 'bg-emerald-500 border-emerald-400 text-slate-900' 
                                : 'border-white/20 hover:border-white/40 bg-slate-900/60'
                            }`}
                          >
                            {t.checked && <Check size={12} className="stroke-[3]" />}
                          </button>
                          <h4 className={`text-xs sm:text-xs md:text-sm font-bold tracking-tight leading-snug ${t.checked ? 'text-slate-500 line-through' : 'text-slate-100'}`}>
                            {t.text}
                          </h4>
                        </div>

                        {t.detailText && (
                          <p className="text-[11px] text-slate-400 leading-normal mb-3">
                            {t.detailText}
                          </p>
                        )}

                        {/* Subtasks Block */}
                        {t.subTasks && t.subTasks.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-white/5 space-y-1.5">
                            <span className="text-[9px] font-mono tracking-wider text-slate-500 uppercase block mb-1">Schritte:</span>
                            {t.subTasks.map((sub) => (
                              <div key={sub.id} className="flex items-center gap-2 text-[11px]">
                                <button
                                  onClick={() => handleToggleSubtask(t.id, sub.id)}
                                  className={`w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 transition-all ${
                                    sub.checked 
                                      ? 'bg-[#10b981]/30 border-[#10b981] text-emerald-400' 
                                      : 'border-white/10 hover:border-white/25 bg-black/20'
                                  }`}
                                >
                                  {sub.checked && <Check size={8} className="stroke-[3]" />}
                                </button>
                                <span className={`font-mono leading-none truncate flex-1 ${sub.checked ? 'text-slate-500 line-through' : 'text-slate-300'}`} title={sub.text}>
                                  {sub.text}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* AI Assist at the bottom */}
                      <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                        <button
                          onClick={() => handleAIAssist(t)}
                          disabled={aiLoading && activeAiTask === t.id}
                          className="inline-flex items-center gap-1 text-[8px] font-mono font-bold tracking-widest text-[#a5b4fc] hover:text-[#c7d2fe] hover:bg-indigo-500/10 transition-colors uppercase bg-indigo-500/5 px-2 py-1 rounded border border-indigo-500/20"
                        >
                          <Sparkles size={9} className={aiLoading && activeAiTask === t.id ? "animate-spin" : "animate-pulse"} />
                          <span>{aiLoading && activeAiTask === t.id ? 'Generiert...' : 'AI Schrittplan'}</span>
                        </button>
                        <button
                          onClick={() => handleDeleteTask(t.id)}
                          className="md:hidden p-1 bg-red-500/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded transition-all"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar: Details, Statistics and Add Forms */}
        <div className="w-full xl:w-[350px] flex flex-col gap-6 flex-shrink-0">
          
          {/* Card: Circle Chart Visual Indicator */}
          <div className="bg-slate-950/40 border border-white/5 rounded-2xl p-5 flex flex-col relative items-center justify-center">
            <span className="text-[10px] font-mono uppercase text-slate-400 tracking-widest block mb-4 text-center w-full font-bold">
              KW {selectedWeek} Abschlussrate
            </span>

            <div className="w-full h-[180px] flex items-center justify-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              {/* Inner Label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-black text-white">{progressPercentage}%</span>
                <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">Erledigt</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-4 mt-1 bg-slate-950/80 px-4 py-2 rounded-xl border border-white/5 w-full">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />
                <span className="text-xs font-mono text-slate-300">{completedInWeek} Erledigt</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 bg-indigo-950 rounded-full" />
                <span className="text-xs font-mono text-slate-300">{Math.max(0, totalInWeek - completedInWeek)} Offen</span>
              </div>
            </div>
          </div>

          {/* Card: Add goal to Roadmap */}
          <div className="bg-slate-950/40 border border-white/5 rounded-2xl p-5 flex flex-col">
            <h4 className="text-xs font-black tracking-widest text-[#ff9b5a] uppercase flex items-center gap-1 mb-4">
              <Plus size={13} />
              Neues Ziel anlegen
            </h4>

            <div className="space-y-3.5">
              <div>
                <label className="text-[9px] font-mono text-slate-400 uppercase tracking-wider block mb-1">Titel des Ziels</label>
                <input
                  type="text"
                  placeholder="z.B. FAQ-Katalog erstellen"
                  value={newTaskText}
                  onChange={(e) => setNewTaskText(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950/80 border border-white/10 rounded-lg text-xs hover:border-white/20 focus:ring-1 focus:ring-indigo-400 outline-none text-slate-100 placeholder-slate-600 transition-all"
                />
              </div>

              <div>
                <label className="text-[9px] font-mono text-slate-400 uppercase tracking-wider block mb-1">Details / Beschreibung (Optional)</label>
                <textarea
                  placeholder="Beschreibe kurz die Anforderungen..."
                  value={newTaskDetail}
                  onChange={(e) => setNewTaskDetail(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-950/80 border border-white/10 rounded-lg text-xs hover:border-white/20 focus:ring-1 focus:ring-indigo-400 outline-none text-slate-100 placeholder-slate-600 transition-all resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] font-mono text-slate-400 uppercase tracking-wider block mb-1">Kategorie</label>
                  <select
                    value={newTaskCategory}
                    onChange={(e: any) => setNewTaskCategory(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-white/10 rounded-lg text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="CORE">Digital Büro</option>
                    <option value="GLOSSAR">Glossar</option>
                    <option value="DATABASE">Live Database</option>
                    <option value="CUSTOM">Individuell</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-mono text-slate-400 uppercase tracking-wider block mb-1">Ziel-Woche</label>
                  <select
                    value={selectedWeek}
                    onChange={(e: any) => setSelectedWeek(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-white/10 rounded-lg text-xs text-slate-200 focus:outline-none"
                  >
                    <option value={22}>KW 22</option>
                    <option value={23}>KW 23</option>
                    <option value={24}>KW 24</option>
                    <option value={25}>KW 25</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleAddTask}
                disabled={!newTaskText.trim()}
                className="w-full py-2 bg-gradient-to-r from-indigo-500 to-purple-500 disabled:from-indigo-950 disabled:to-purple-950 disabled:text-slate-500 hover:from-indigo-600 hover:to-purple-600 border border-white/10 text-white font-black text-[10px] tracking-wider uppercase transition-all flex items-center justify-center gap-1 rounded-lg mt-2"
              >
                <Plus size={12} />
                <span>Ziel hinzufügen</span>
              </button>
            </div>
          </div>

          {/* Quick Informational Tips Box */}
          <div className="bg-[#141419]/60 border border-white/5 rounded-2xl p-4 flex flex-col gap-2.5">
            <span className="text-[10px] font-mono text-[#ff9b5a] tracking-widest uppercase font-bold flex items-center gap-1">
              <Lightbulb size={12} />
              Roadmap Guide
            </span>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Deine Meilensteine umfassen die Kernaufgaben KW 23 für dein <strong>Digitales Büro</strong>, inklusive Anbindung der <strong>Recall Live-Datenbank</strong> und Integration der Features aus dem seitlichen Handbuch. Nutze den AI-Knopf an jedem Ziel für automatisierte Arbeitsschritte.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
};
