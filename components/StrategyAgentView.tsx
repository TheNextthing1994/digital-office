import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Lightbulb, 
  Sparkles, 
  Sliders, 
  Play, 
  X, 
  Trash2, 
  Image as ImageIcon, 
  Clock, 
  Check, 
  Send, 
  Plus, 
  Loader2,
  Bookmark,
  ChevronRight,
  Zap
} from 'lucide-react';
import { useFirebase } from './FirebaseContext';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

interface StrategyProject {
  id: string;
  title: string;
  description: string;
  startPrompt: string;
  completionScore: number; // 0 to 100
  thumbnailSeed: string; // Used to generate beautifully colored SVG background
  createdAt: string;
  estimatedTime: number; // minutes depending on completion score
  statusLabel: string;
  notes?: string;
}

interface StrategyAgentViewProps {
  onBack: () => void;
}

export const StrategyAgentView: React.FC<StrategyAgentViewProps> = ({ onBack }) => {
  const { user } = useFirebase();

  // Connection mode from localStorage
  const [connectionMode, setConnectionMode] = useState<'DIRECT_API' | 'LOCAL_GATEWAY'>('LOCAL_GATEWAY');

  // Dynamic responsive states for high fidelity mobile interaction
  const [isMobileLayout, setIsMobileLayout] = useState(false);
  const [mobileActiveTab, setMobileActiveTab] = useState<'LIST' | 'DETAILS'>('LIST');

  useEffect(() => {
    const handleResize = () => {
      setIsMobileLayout(window.innerWidth < 1024);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const savedMode = localStorage.getItem('ops_agent_connection_mode');
    if (savedMode === 'DIRECT_API' || savedMode === 'LOCAL_GATEWAY') {
      setConnectionMode(savedMode as 'DIRECT_API' | 'LOCAL_GATEWAY');
    }
  }, []);

  // Projects State synced with Firestore
  const [projects, setProjects] = useState<StrategyProject[]>([]);
  const [activeProjId, setActiveProjId] = useState<string | null>(null);
  
  // Idea capturing form
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPrompt, setNewPrompt] = useState('');
  const [isCapturing, setIsCapturing] = useState(false);
  
  // Interactive Slider State for current project
  const [currentScore, setCurrentScore] = useState<number>(30);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionLog, setExecutionLog] = useState<string[]>([]);

  // Real-time synchronization using Firebase
  useEffect(() => {
    if (!user) return;

    const docRef = doc(db, 'whiteboard_config', 'strategy_agent_projects');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        try {
          const data = docSnap.data();
          const parsed = JSON.parse(data.text || '[]');
          setProjects(parsed);
          if (parsed.length > 0 && !activeProjId) {
            setActiveProjId(parsed[0].id);
            setCurrentScore(parsed[0].completionScore);
          }
        } catch (e) {
          console.error("Failed to parse strategy projects", e);
        }
      } else {
        // Seed default projects
        const defaultProjects: StrategyProject[] = [
          {
            id: 'strat_1',
            title: 'Kundenportal Mobil-App',
            description: 'Eine schlanke Kunden-Plattform für rasche Serviceanfragen direkt vom Smartphone aus.',
            startPrompt: 'Entwerfe ein Figma Design Kit für mobile Eingabeformulare.',
            completionScore: 25,
            thumbnailSeed: 'linear-gradient(135deg, #f59e0b, #ec4899)',
            createdAt: new Date().toISOString(),
            estimatedTime: 15,
            statusLabel: 'Konzept-Skizze vorproduziert'
          },
          {
            id: 'strat_2',
            title: 'Automatischer E-Mail Responder',
            description: 'Intelligente Klassifizierung von eingehenden Leads per KI.',
            startPrompt: 'Generiere Node-JS Server-Router für E-Mail API Callbacks.',
            completionScore: 60,
            thumbnailSeed: 'linear-gradient(135deg, #10b981, #3b82f6)',
            createdAt: new Date().toISOString(),
            estimatedTime: 45,
            statusLabel: 'Detaillierter Entwurf erstellt'
          }
        ];
        setProjects(defaultProjects);
        setActiveProjId('strat_1');
        setCurrentScore(25);

        setDoc(docRef, {
          text: JSON.stringify(defaultProjects),
          updatedAt: serverTimestamp(),
          lastUpdatedBy: user.email || ""
        }).catch(err => console.error("Error creating strategy seed", err));
      }
    });

    return unsubscribe;
  }, [user]);

  // Generate beautiful background pattern from Title
  const getGradientFromTitle = (titleString: string) => {
    const hash = titleString.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const hues = [
      ['#ec4899', '#8b5cf6'],
      ['#3b82f6', '#10b981'],
      ['#f59e0b', '#ef4444'],
      ['#6366f1', '#a855f7'],
      ['#06b6d4', '#3b82f6']
    ];
    const picked = hues[hash % hues.length];
    return `linear-gradient(135deg, ${picked[0]}, ${picked[1]})`;
  };

  const currentProject = projects.find(p => p.id === activeProjId) || null;

  // Track slider state to update in real time when changed
  useEffect(() => {
    if (currentProject) {
      setCurrentScore(currentProject.completionScore);
    }
  }, [activeProjId]);

  // Determine label & time requirement depending on the slider score
  const getStatusDetails = (score: number) => {
    if (score < 15) {
      return { 
        label: "Spontane Idee", 
        time: 5, 
        desc: "Nur ein kurzer Gedanke. Perfekt für ein schnelles 5-Minuten Brainstorming."
      };
    } else if (score < 40) {
      return { 
        label: "Konzept-Skizze", 
        time: 15, 
        desc: "Strukturierte Gliederung & erstes Mockup. Benötigt ca. 15 Minuten Bearbeitung." 
      };
    } else if (score < 70) {
      return { 
        label: "Detaillierter Entwurf", 
        time: 45, 
        desc: "Vollständige Spezifikation & API-Strukturen sind aufbereitet. Dauer: ca. 45 Minuten." 
      };
    } else if (score < 95) {
      return { 
        label: "Interaktiver Prototyp", 
        time: 90, 
        desc: "Klickbare Benutzeroberfläche und Sandbox-Datenbank-Einträge. Dauer: ca. 90 Minuten." 
      };
    } else {
      return { 
        label: "Vollständig Fertiggestellt", 
        time: 120, 
        desc: "Komplett deploybares Softwaremodul. Bereit für die Live-Schaltung! Dauer: ca. 120 Minuten." 
      };
    }
  };

  const activeDetails = getStatusDetails(currentScore);

  // Instantly record a new Spontaneous Idea/Project
  const handleCaptureIdea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const parsedTitle = newTitle.trim();
    // Intelligently build empty fields if not supplied to make it seamless
    const parsedDesc = newDesc.trim() || `Automatisierte Strategie-Vorbereitung für die Umsetzung von: ${parsedTitle}.`;
    const parsedPrompt = newPrompt.trim() || `Setze das Projekt "${parsedTitle}" auf und erstelle die grundlegenden Module.`;

    const newProj: StrategyProject = {
      id: 'strat_' + Math.random().toString(36).substring(2, 11),
      title: parsedTitle,
      description: parsedDesc,
      startPrompt: parsedPrompt,
      completionScore: 10, // Starts as standard raw idea
      thumbnailSeed: getGradientFromTitle(parsedTitle),
      createdAt: new Date().toISOString(),
      estimatedTime: 5,
      statusLabel: 'Spontane Idee aufgenommen'
    };

    const updated = [newProj, ...projects];
    setProjects(updated);
    setActiveProjId(newProj.id);
    setCurrentScore(10);
    setIsCapturing(false);
    setNewTitle('');
    setNewDesc('');
    setNewPrompt('');

    if (isMobileLayout) {
      setMobileActiveTab('DETAILS');
    }

    // Write to DB with real-time sync wrapper
    if (user) {
      try {
        await setDoc(doc(db, 'whiteboard_config', 'strategy_agent_projects'), {
          text: JSON.stringify(updated),
          updatedAt: serverTimestamp(),
          lastUpdatedBy: user.email || ""
        });
      } catch (err) {
        console.error("Failed saving to Firebase:", err);
      }
    }
  };

  // Run or execute the project to state level
  const handleExecuteProject = async () => {
    if (!currentProject) return;
    setIsExecuting(true);
    setExecutionLog([]);

    // Publish to Firestore so the local PC/VPS script actually captures it!
    if (user) {
      try {
        await setDoc(doc(db, 'whiteboard_config', 'local_gateway_jobs'), {
          jobId: 'strat_job_' + Date.now(),
          type: 'STRATEGY_EXECUTION',
          title: currentProject.title,
          startPrompt: currentProject.startPrompt,
          requestedLevel: activeDetails.label,
          targetScore: currentScore,
          connectionMode: connectionMode,
          timestamp: Date.now(),
          status: 'PENDING'
        });
      } catch (err) {
        console.error("Firestore gateway job register error:", err);
      }
    }

    const modeText = connectionMode === 'LOCAL_GATEWAY'
      ? `💻 [Lokales PC Gateway] Sende Befehl an Ihren Server/PC...`
      : `💎 Claude Cloud-API wird initiiert (Modell: Claude 3.5 Sonnet)...`;

    const executionTarget = connectionMode === 'LOCAL_GATEWAY'
      ? `📂 Lokale VS-Code Instanz wird über Ihre Claude-Subscription angesteuert...`
      : `📝 Automatische Code & Architekturskizzen werden ins Sandbox-Workspace implementiert...`;

    const steps = [
      `🚀 Starte Projekt-Zündung für "${currentProject.title}"...`,
      `🔍 Scanne definierten Start-Prompt: "${currentProject.startPrompt}"`,
      `⚙️ Kalibriere Arbeitsstufe auf: ${activeDetails.label} (${currentScore}%)`,
      `⏱️ Reserviere geschätztes Zeitfenster: ${activeDetails.time} Minuten für die Ausführung...`,
      modeText,
      executionTarget,
      `🎉 Fertig! Das Projekt wurde erfolgreich auf Ihrem PC auf die Stufe [${activeDetails.label}] gehoben.`
    ];

    // Trigger step-by-step logs printing beautifully
    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        setExecutionLog(prev => [...prev, steps[currentStep]]);
        currentStep++;
      } else {
        clearInterval(interval);
        setIsExecuting(false);
        
        // Save the updated completion score to Database so that it persists
        const updated = projects.map(p => {
          if (p.id === currentProject.id) {
            return {
              ...p,
              completionScore: currentScore,
              estimatedTime: activeDetails.time,
              statusLabel: activeDetails.label
            };
          }
          return p;
        });
        setProjects(updated);

        if (user) {
          setDoc(doc(db, 'whiteboard_config', 'strategy_agent_projects'), {
            text: JSON.stringify(updated),
            updatedAt: serverTimestamp(),
            lastUpdatedBy: user.email || ""
          }).catch(err => console.error(err));
        }
      }
    }, 400);
  };

  const handleDeleteProject = async (idToDelete: string) => {
    const filtered = projects.filter(p => p.id !== idToDelete);
    setProjects(filtered);
    if (activeProjId === idToDelete) {
      setActiveProjId(filtered[0]?.id || null);
    }

    if (user) {
      try {
        await setDoc(doc(db, 'whiteboard_config', 'strategy_agent_projects'), {
          text: JSON.stringify(filtered),
          updatedAt: serverTimestamp(),
          lastUpdatedBy: user.email || ""
        });
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-[78vh] gap-4 relative font-sans overflow-hidden bg-[#fafafa] rounded-[24px] border border-neutral-200/80 shadow-[0_10px_40px_rgba(0,0,0,0.03)] text-neutral-800 text-left">
      
      {/* LEFT COLUMN/TAB: Smartphone layout of ideas */}
      {(!isMobileLayout || mobileActiveTab === 'LIST') && (
        <div className={`flex-1 flex flex-col items-center justify-center bg-neutral-200/30 overflow-y-auto ${isMobileLayout ? 'h-full p-0 bg-white' : 'p-4 h-full'}`}>
          <div className={isMobileLayout 
            ? "w-full h-full flex flex-col bg-white relative" 
            : "w-full max-w-[420px] h-[72vh] rounded-[44px] border-[12px] border-neutral-900 bg-white shadow-[0_25px_60px_-15px_rgba(0,0,0,0.2)] overflow-hidden flex flex-col relative"
          }>
            
            {/* Status Speaker/notch - Only on large screens when the mockup frame is visible */}
            {!isMobileLayout && (
              <div className="absolute top-0 inset-x-0 h-6 flex justify-center items-center z-50 pointer-events-none">
                <div className="w-24 h-4 bg-neutral-900 rounded-b-2xl" />
              </div>
            )}

            {/* Android/Mobile Navigation Header */}
            <div className={`px-5 pb-3 border-b border-neutral-100 flex items-center justify-between text-neutral-600 bg-white ${isMobileLayout ? 'pt-4' : 'pt-8'}`}>
              <button 
                onClick={onBack}
                className="flex items-center gap-1 text-[13px] font-semibold text-neutral-500 hover:text-neutral-950 transition-colors"
              >
                <ArrowLeft size={14} />
                <span>Zurück</span>
              </button>
              <div className="flex items-center gap-1.5 bg-amber-50 px-2.5 py-1 rounded-full text-[10px] font-black uppercase text-amber-600 tracking-wide">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                STRATEGIE ACTIVE
              </div>
            </div>

            {/* Main scrollable body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-white scrollbar-hide">
              
              {/* Quick Agent Greeting & Identity */}
              <div className="text-center mt-2 flex flex-col items-center scale-95 origin-top">
                <div className="w-[64px] h-[64px] bg-[#fef3c7] border border-amber-200/60 rounded-3xl flex items-center justify-center mb-3 shadow-sm hover:rotate-6 transition-transform">
                  <Sparkles size={28} className="text-amber-600" />
                </div>
                <h2 className="text-xl font-bold tracking-tight text-neutral-900">Strategie-Manager</h2>
                <p className="text-[12px] leading-relaxed text-neutral-500 max-w-xs mt-1.5 font-medium">
                  Erfasse spontane Ideen sofort mobil & bereite diese passend zu deiner Bearbeitungszeit vor!
                </p>
              </div>

              {/* Quick capture triggers */}
              {!isCapturing ? (
                <button
                  onClick={() => setIsCapturing(true)}
                  className="w-full py-3 px-4 bg-amber-50 hover:bg-amber-100/70 border border-dashed border-amber-300 rounded-2xl text-[12px] font-bold text-amber-800 flex items-center justify-center gap-2 transition"
                >
                  <Plus size={16} />
                  <span>Spontane Idee aufnehmen (+Vorschaubild)</span>
                </button>
              ) : (
                <form onSubmit={handleCaptureIdea} className="bg-neutral-50 border border-neutral-200 rounded-2xl p-4 space-y-3.5 animate-in slide-in-from-top-3 duration-200">
                  <div className="flex justify-between items-center border-b border-neutral-200/60 pb-1.5">
                    <span className="text-[11px] font-black uppercase text-neutral-700">Neue Idee aufnehmen</span>
                    <button type="button" onClick={() => setIsCapturing(false)} className="text-neutral-400 hover:text-neutral-700">
                      <X size={14} />
                    </button>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-black text-neutral-400">Projekt-Titel / Idee</label>
                    <input
                      type="text"
                      required
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="z.B. AI Meeting summarizer"
                      className="w-full text-xs p-2.5 bg-white border border-neutral-300 rounded-xl focus:ring-1 focus:ring-amber-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-black text-neutral-400">Detaillierte Beschreibung</label>
                    <textarea
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                      placeholder="Kurze Beschreibung zur Systemarchitektur..."
                      className="w-full text-xs p-2.5 bg-white border border-neutral-300 rounded-xl focus:ring-1 focus:ring-amber-500 focus:outline-none focus:border-amber-500 resize-none h-14"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-black text-neutral-400">Start-Prompt</label>
                    <input
                      type="text"
                      value={newPrompt}
                      onChange={(e) => setNewPrompt(e.target.value)}
                      placeholder="Prompt um Projektentwicklung zu starten..."
                      className="w-full text-xs p-2.5 bg-white border border-neutral-300 rounded-xl focus:ring-1 focus:ring-amber-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs uppercase tracking-wider rounded-xl transition shadow-md"
                  >
                    Idee Speichern
                  </button>
                </form>
              )}

              {/* List of active projects & Ideas cards */}
              <div className="space-y-3">
                <span className="text-[10px] uppercase font-black tracking-widest text-neutral-400 block border-b border-neutral-100 pb-2">Vorhandene Ideen & Projekte ({projects.length})</span>
                
                {projects.map((proj) => (
                  <div
                    key={proj.id}
                    onClick={() => {
                      setActiveProjId(proj.id);
                      if (isMobileLayout) {
                        setMobileActiveTab('DETAILS');
                      }
                    }}
                    className={`relative p-3 rounded-2xl border text-left cursor-pointer transition flex items-start gap-3.5 group ${
                      activeProjId === proj.id
                        ? 'border-amber-500 bg-amber-50/20 shadow-sm'
                        : 'border-neutral-200/80 bg-white hover:bg-neutral-50/50'
                    }`}
                  >
                    <div 
                      className="w-14 h-14 rounded-xl flex-shrink-0 flex items-center justify-center relative overflow-hidden shadow-inner border border-neutral-200/10"
                      style={{ background: proj.thumbnailSeed || 'linear-gradient(135deg, #ddd, #999)' }}
                    >
                      <div className="absolute inset-0 bg-black/10" />
                      <ImageIcon className="text-white/80" size={16} />
                    </div>

                    <div className="flex-1 space-y-1 min-w-0">
                      <span className="text-xs font-bold text-neutral-800 block truncate leading-tight">{proj.title}</span>
                      <p className="text-[11px] text-neutral-500 truncate leading-snug">{proj.description}</p>
                      
                      <div className="flex items-center gap-1.5 pt-1 text-[9px] font-extrabold uppercase">
                        <span className="text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-md">{proj.statusLabel || 'Spontane Idee'}</span>
                        <span className="text-neutral-400 flex items-center gap-0.5">
                          <Clock size={8} />
                          {proj.estimatedTime || 5} min
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteProject(proj.id);
                      }}
                      className="absolute top-2 right-2 text-neutral-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Idee verwerfen"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Simulated Live Processing Container */}
              {executionLog.length > 0 && (
                <div className="bg-neutral-900 text-neutral-100 rounded-2xl p-4 font-mono text-[10px] text-left leading-normal space-y-1.5 border border-neutral-950 shadow-inner animate-in zoom-in-95">
                  <div className="flex items-center justify-between border-b border-white/5 pb-1.5 uppercase text-[9px] text-neutral-400 font-bold tracking-wider">
                    <span>Strategy Agent Console</span>
                    <span className="text-amber-400">Claude-3.5 Active</span>
                  </div>
                  <div className="max-h-[140px] overflow-y-auto space-y-1 scrollbar-hide py-1">
                    {executionLog.map((log, idx) => (
                      <p key={idx} className={idx === executionLog.length - 1 ? "text-amber-300 animate-pulse" : "text-neutral-300"}>
                        {log}
                      </p>
                    ))}
                  </div>
                </div>
              )}

            </div>

            <div className="p-3 border-t border-neutral-100 bg-white/95 text-center text-[10px] font-black uppercase tracking-widest text-neutral-400">
              🤖 Claude-Subscription Workspace
            </div>

          </div>
        </div>
      )}

      {/* RIGHT COLUMN/TAB: Full workspace controls with description, score slider */}
      {(!isMobileLayout || mobileActiveTab === 'DETAILS') && (
        <div className={`border-neutral-200 bg-white p-6 overflow-y-auto space-y-6 flex flex-col justify-between ${
          isMobileLayout 
            ? 'w-full h-full border-t-0 p-5' 
            : 'w-full lg:w-[420px] border-t lg:border-t-0 lg:border-l'
        }`}>
          
          {currentProject ? (
            <div className="space-y-6">
              
              {/* Back button for mobile view details */}
              {isMobileLayout && (
                <button
                  onClick={() => setMobileActiveTab('LIST')}
                  className="flex items-center gap-1.5 text-xs font-extrabold text-amber-600 bg-amber-50 hover:bg-amber-100/80 px-3 py-1.5 rounded-full transition"
                >
                  <ArrowLeft size={14} />
                  <span>Zurück zur Ideenliste</span>
                </button>
              )}

              <div className="border-b border-neutral-200 pb-4">
                <span className="text-[10px] uppercase font-black text-amber-600 tracking-wider">Aktives Strategie Projekt</span>
                <h1 className="text-xl font-black text-neutral-900 mt-1">{currentProject.title}</h1>
                <p className="text-xs text-neutral-500 mt-2 leading-relaxed">{currentProject.description}</p>
              </div>

              {/* STAGE & PROMPT BOX SETUP */}
              <div className="space-y-4">
                <div className="bg-neutral-50 border border-neutral-200 p-4 rounded-2xl text-left space-y-2">
                  <h3 className="text-xs font-black uppercase text-neutral-400 tracking-wider">Projekt Start-Prompt</h3>
                  <p className="text-xs text-neutral-700 italic font-medium">"{currentProject.startPrompt}"</p>
                  <div className="text-[10px] text-neutral-500 leading-normal pt-1 border-t border-neutral-100">
                    Dieser Prompt wird beim Start geladen, um das Projekt im Workspace sofort aufzubauen.
                  </div>
                </div>

                {/* ESTIMATED TIRED DETAILED SLIDER */}
                <div className="bg-amber-50/50 border border-amber-100 p-5 rounded-3xl text-left space-y-4 shadow-sm">
                  <div className="flex justify-between items-baseline">
                    <h3 className="text-xs font-black uppercase text-amber-800 tracking-wider flex items-center gap-1">
                      <Sliders size={12} />
                      Stufe der Fertigstellung
                    </h3>
                    <span className="text-lg font-black text-amber-600">{currentScore}%</span>
                  </div>

                  {/* Continuous HTML Slider for exact completion scores */}
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={currentScore}
                    onChange={(e) => setCurrentScore(parseInt(e.target.value, 10))}
                    disabled={isExecuting}
                    className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-amber-500 focus:outline-none"
                  />

                  {/* Continuous dynamic states representation */}
                  <div className="flex justify-between text-[9px] font-black uppercase tracking-wider text-neutral-400">
                    <span>Idee</span>
                    <span>Skizze</span>
                    <span>Entwurf</span>
                    <span>Prototyp</span>
                    <span>Fertig</span>
                  </div>

                  {/* Time depending block */}
                  <div className="pt-2 border-t border-amber-200/60 flex items-start gap-2.5">
                    <div className="p-1.5 bg-amber-100 rounded-xl text-amber-700 mt-0.5">
                      <Clock size={14} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-neutral-800">{activeDetails.label}</span>
                        <span className="text-xs font-black text-amber-700">{activeDetails.time} Min. Arbeitszeit</span>
                      </div>
                      <p className="text-[11px] text-neutral-500 mt-1 font-medium leading-relaxed">
                        {activeDetails.desc} Passend umgesetzt auf deine Zeit, die du gerade zur Verfügung hast.
                      </p>
                    </div>
                  </div>

                </div>
              </div>

              {/* BUTTON TO EXECUTE THE STAGE */}
              <button
                 onClick={handleExecuteProject}
                 disabled={isExecuting}
                 className="w-full py-4 px-6 bg-neutral-950 hover:bg-neutral-800 text-white font-black text-xs uppercase tracking-widest rounded-full transition shadow-md flex items-center justify-center gap-2"
              >
                {isExecuting ? (
                  <>
                    <Loader2 size={16} className="animate-spin text-amber-400" />
                    <span>Projekt wird aufbereitet...</span>
                  </>
                ) : (
                  <>
                    <Play size={10} fill="currentColor" />
                    <span>Projekt ausführen & fertigstellen</span>
                  </>
                )}
              </button>

            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-3">
              <Bookmark className="text-neutral-300" size={48} />
              <span className="text-sm font-bold text-neutral-500">Kein Strategie Projekt ausgewählt</span>
              <p className="text-xs text-neutral-400 max-w-xs leading-normal">
                Nimm entweder eine spontane Idee über die Ideenliste auf oder klicke auf ein vorhandenes Projekt.
              </p>
            </div>
          )}

          <div className="pt-4 border-t border-neutral-100 flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-neutral-400">
            <span>Konferenzhub OS v2</span>
            <span className="flex items-center gap-1 text-emerald-600 font-extrabold">
              <Zap size={10} />
              Claude Engine Active
            </span>
          </div>

        </div>
      )}

    </div>
  );
};
