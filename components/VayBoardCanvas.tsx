import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Minus,
  Trash2, 
  Zap, 
  Youtube, 
  FileText, 
  Mic, 
  Users, 
  Move, 
  Link, 
  Compass, 
  Tag, 
  Share2, 
  HelpCircle, 
  Cpu,
  Bookmark,
  CheckCircle,
  Clock,
  ArrowRight,
  AlertCircle,
  Eye,
  ListFilter,
  CheckSquare,
  X,
  Sparkles
} from 'lucide-react';
import { useFirebase } from './FirebaseContext';
import { VayBoardCard, VayBoardBoard, VayBoardBoardItem, VayBoardAgentEvent } from '../types';
import { analyzeKnowledgeInput, generateAgentCommentary, queryInboxWithQuestion } from '../services/geminiService';

export const VayBoardCanvas: React.FC = () => {
  const {
    vayBoardCards,
    vayBoardBoards,
    vayBoardItems,
    vayBoardEvents,
    addVayBoardCard,
    updateVayBoardCard,
    deleteVayBoardCard,
    addVayBoardBoard,
    deleteVayBoardBoard,
    addVayBoardItem,
    updateVayBoardItemPos,
    updateVayBoardItemConfig,
    deleteVayBoardItem,
    addVayBoardEvent,
    updateVayBoardEventStatus
  } = useFirebase();

  // Active Board Handling
  const [activeBoardId, setActiveBoardId] = useState<string>('default_board');
  const [showAddBoard, setShowAddBoard] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');

  // UI Tabs / Active View
  const [canvasViewMode, setCanvasViewMode] = useState<'CANVAS' | 'INBOX' | 'EVENTS'>('CANVAS');

  // Zoom level state
  const [zoom, setZoom] = useState<number>(1.0);
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);

  // Register native passive: false wheel listener for real-time zoom control
  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container || canvasViewMode !== 'CANVAS') return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const scaleStep = 0.05;
      setZoom((prev) => {
        let nextZoom = prev;
        if (e.deltaY < 0) {
          nextZoom = Math.min(2.0, prev + scaleStep); // Zoom in
        } else {
          nextZoom = Math.max(0.4, prev - scaleStep); // Zoom out
        }
        // Avoid precision floating residue
        return Number(nextZoom.toFixed(2));
      });
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [canvasViewMode]);

  // New Card Input Fields
  const [inputValue, setInputValue] = useState('');
  const [sourceType, setSourceType] = useState<'YOUTUBE' | 'PDF' | 'TEXT' | 'VOICE' | 'TEAM'>('TEXT');
  const [sourceUrl, setSourceUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState('');

  // Detailed Card View Modal / Sidebar
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  // Connection Setup Tool state
  const [connectingFromId, setConnectingFromId] = useState<string | null>(null);

  // Group Builder Tool state
  const [groupBuilderTitle, setGroupBuilderTitle] = useState('');
  const [groupBuilderColor, setGroupBuilderColor] = useState('#1e293b');
  const [showGroupBuilder, setShowGroupBuilder] = useState(false);

  // Filter criteria
  const [selectedFilterTag, setSelectedFilterTag] = useState<string>('ALL');
  const [selectedFilterRole, setSelectedFilterRole] = useState<string>('ALL');

  // Interactive AI sorting and query states
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null);
  const [queryAnswer, setQueryAnswer] = useState<string | null>(null);
  const [queryRelevantIds, setQueryRelevantIds] = useState<string[]>([]);
  const [isQuerying, setIsQuerying] = useState<boolean>(false);
  const [queryError, setQueryError] = useState<string | null>(null);

  const inboxQuestions = [
    "Ist das eine Mission?",
    "Ist das eine Meilenstein?",
    "Was ist neu für Frontend?",
    "Welche Karte bringt uns am schnellsten Geld?",
    "Was soll ich heute bauen?",
    "Welche Videos hängen zusammen?",
    "Was ist wichtig für meinen D.T.?"
  ];

  const handleSelectQuestion = async (question: string) => {
    if (selectedQuestion === question) {
      setSelectedQuestion(null);
      setQueryAnswer(null);
      setQueryRelevantIds([]);
      setQueryError(null);
      return;
    }

    setSelectedQuestion(question);
    setIsQuerying(true);
    setQueryAnswer(null);
    setQueryRelevantIds([]);
    setQueryError(null);

    try {
      const response = await queryInboxWithQuestion(question, vayBoardCards);
      setQueryAnswer(response.answer);
      setQueryRelevantIds(response.relevantCardIds || []);
    } catch (err: any) {
      console.error("Failed to query inbox:", err);
      setQueryError("Die Wissensanalyse ist fehlgeschlagen. Bitte versuche es erneut.");
    } finally {
      setIsQuerying(false);
    }
  };

  const handleClearQuestionFilter = () => {
    setSelectedQuestion(null);
    setQueryAnswer(null);
    setQueryRelevantIds([]);
    setQueryError(null);
  };

  // Setup default board and group variables if empty
  useEffect(() => {
    if (vayBoardBoards.length === 0) {
      addVayBoardBoard("Haupt-Analyse-Board").then(id => {
        setActiveBoardId(id);
      }).catch(console.error);
    } else if (activeBoardId === 'default_board') {
      setActiveBoardId(vayBoardBoards[0].id);
    }
  }, [vayBoardBoards]);

  // Aggregate all unique tags for filtering
  const allTags = Array.from(new Set(vayBoardCards.flatMap(c => c.tags)));

  const handleCreateBoard = async () => {
    if (!newBoardName.trim()) return;
    try {
      const bId = await addVayBoardBoard(newBoardName.trim());
      setActiveBoardId(bId);
      setNewBoardName('');
      setShowAddBoard(false);
    } catch (e) {
      console.error(e);
    }
  };

  // 1. Core trigger that runs Gemini analysis and writes results + triggers agents
  const handleAnalyzeAndSave = async () => {
    if (!inputValue.trim()) {
      setAnalysisError('Bitte Text oder Quellen-Inhalt eingeben');
      return;
    }
    setIsAnalyzing(true);
    setAnalysisError('');

    try {
      // Analyze input via Gemini service
      const analysis = await analyzeKnowledgeInput(inputValue, sourceType, sourceUrl || undefined);
      
      // Save newly formed Card to Firebase
      const cardId = await addVayBoardCard({
        title: analysis.title,
        sourceType,
        sourceUrl: sourceUrl || undefined,
        rawText: inputValue,
        summary: analysis.summary,
        tags: analysis.tags,
        roles: analysis.roles,
        projectRelevance: analysis.projectRelevance,
        nextActions: analysis.nextActions,
        status: 'NEW',
        importance: analysis.importance
      });

      // Clear Inputs
      setInputValue('');
      setSourceUrl('');

      // Auto-pin this newly processed card to the Visual Canvas (at center-ish position)
      await addVayBoardItem({
        boardId: activeBoardId,
        cardId: cardId,
        x: 150 + Math.random() * 150,
        y: 100 + Math.random() * 150,
        width: 250,
        height: 220
      });

      // Trigger AI Agent review logs (Simulated Trigger in UI via client-side Gemini call)
      for (const role of analysis.roles) {
        try {
          const commentary = await generateAgentCommentary(analysis.title, analysis.summary, analysis.projectRelevance, role);
          await addVayBoardEvent({
            agent: role,
            triggerType: `CROSS_REFERENCE_${sourceType}`,
            cardId,
            description: commentary,
            status: 'PENDING'
          });
        } catch (err) {
          console.error(`Failed to trigger agent commentary for ${role}:`, err);
        }
      }

      // Select newly entered card
      setSelectedCardId(cardId);
      setIsAnalyzing(false);
      setCanvasViewMode('CANVAS'); // Head directly to visual workspace
    } catch (err: any) {
      console.error("Gemini Ingestion analysis failed:", err);
      // Fallback: Create card with dummy content so operations never freeze
      try {
        const titleFallback = sourceType === 'YOUTUBE' ? "YouTube Analyse: " + (sourceUrl || "Link") : "Wissenskarte: " + (inputValue.slice(0, 30) + "...");
        const cardId = await addVayBoardCard({
          title: titleFallback,
          sourceType,
          sourceUrl: sourceUrl || undefined,
          rawText: inputValue,
          summary: "AI Analyse noch ausstehend oder unvollständig.",
          tags: ["Automated", "Forschung"],
          roles: ["STRATEGY", "CREATIVE", "OPERATIONS"],
          projectRelevance: "Wird vom Team bei Bedarf evaluiert.",
          nextActions: ["Inhalt direkt sichten", "In Team-Meeting besprechen"],
          status: 'NEW',
          importance: 'MEDIUM'
        });

        await addVayBoardItem({
          boardId: activeBoardId,
          cardId: cardId,
          x: 200,
          y: 200,
          width: 250,
          height: 220
        });

        // Add a default fallback analysis event
        await addVayBoardEvent({
          agent: 'STRATEGY',
          triggerType: `INGEST_FAILURE_FALLBACK`,
          cardId,
          description: "Ingestion-Backend war kurz überlastet, habe eine manuelle IngestionsCard auf das Canvas abgelegt zur Strukturierung.",
          status: 'PENDING'
        });

        setIsAnalyzing(false);
        setCanvasViewMode('CANVAS');
      } catch (innerErr) {
        setAnalysisError("Analyse fehlgeschlagen. Bitte überprüfen Sie Ihre Internetverbindung.");
        setIsAnalyzing(false);
      }
    }
  };

  // Add customized Section Group to the Canvas
  const handleAddGroupContainer = async () => {
    if (!groupBuilderTitle.trim()) return;
    try {
      await addVayBoardItem({
        boardId: activeBoardId,
        x: 100 + Math.random() * 200,
        y: 100 + Math.random() * 200,
        width: 380,
        height: 480,
        groupColor: groupBuilderColor,
        groupTitle: groupBuilderTitle.trim()
      });
      setGroupBuilderTitle('');
      setShowGroupBuilder(false);
    } catch (e) {
      console.error(e);
    }
  };

  // Connect Card A with Card B on visual Canvas
  const handleInitiateConnection = (itemId: string) => {
    if (!connectingFromId) {
      setConnectingFromId(itemId);
    } else {
      if (connectingFromId !== itemId) {
        // Toggle connection write
        const sourceItem = vayBoardItems.find(i => i.id === connectingFromId);
        if (sourceItem) {
          const currentConns = sourceItem.connectedTo || [];
          const updatedConns = currentConns.includes(itemId) 
            ? currentConns.filter(id => id !== itemId)
            : [...currentConns, itemId];
          updateVayBoardItemConfig(connectingFromId, { connectedTo: updatedConns }).catch(console.error);
        }
      }
      setConnectingFromId(null);
    }
  };

  // Filter cards on the Canvas
  const filteredItems = vayBoardItems.filter(item => {
    if (item.boardId !== activeBoardId) return false;
    if (item.groupColor) return true; // section groups are always shown

    // Find card attributes
    const card = vayBoardCards.find(c => c.id === item.cardId);
    if (!card) return false;

    if (selectedFilterTag !== 'ALL' && !card.tags.includes(selectedFilterTag)) return false;
    if (selectedFilterRole !== 'ALL' && !card.roles.includes(selectedFilterRole as any)) return false;

    return true;
  });

  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'YOUTUBE': return <Youtube className="w-5 h-4 text-rose-500" />;
      case 'PDF': return <FileText className="w-5 h-4 text-emerald-500" />;
      case 'VOICE': return <Mic className="w-5 h-4 text-violet-500" />;
      case 'TEAM': return <Users className="w-5 h-4 text-cyan-500" />;
      default: return <FileText className="w-5 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 font-sans text-slate-100 rounded-xl overflow-hidden shadow-2xl border border-slate-800">
      
      {/* VayBoard Navbar Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-emerald-600 rounded-lg shadow-inner">
            <Compass className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              VayBoard <span className="text-xs bg-emerald-500/10 text-emerald-400 font-mono py-0.5 px-2 rounded-full border border-emerald-500/20">Knowledge MVP</span>
            </h1>
            <p className="text-xs text-slate-400">Verbinde Recall-Wissen mit Milanote-Canvas & Agenten-Intelligence</p>
          </div>
        </div>

        {/* Board Selection & Add board */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-700">
            <span className="text-xs text-slate-400 px-1 font-mono">WORKSPACE:</span>
            <select 
              value={activeBoardId} 
              onChange={(e) => setActiveBoardId(e.target.value)}
              className="bg-transparent text-sm font-medium text-slate-200 outline-none cursor-pointer pr-1"
            >
              {vayBoardBoards.map(b => (
                <option key={b.id} value={b.id} className="bg-slate-900 text-slate-200">
                  {b.name}
                </option>
              ))}
            </select>
            <button 
              onClick={() => setShowAddBoard(!showAddBoard)}
              className="p-1 hover:bg-slate-700 rounded text-slate-300 hover:text-white"
              title="Neues Board"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Core App View switcher */}
          <div className="flex bg-slate-950/80 p-1 rounded-lg border border-slate-800">
            <button 
              onClick={() => setCanvasViewMode('CANVAS')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center space-x-1.5 ${canvasViewMode === 'CANVAS' ? 'bg-emerald-650 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Canvas</span>
            </button>
            <button 
              onClick={() => setCanvasViewMode('INBOX')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center space-x-1.5 ${canvasViewMode === 'INBOX' ? 'bg-emerald-650 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Recall Inbox</span>
              {vayBoardCards.filter(c => c.status === 'NEW').length > 0 && (
                <span className="bg-rose-500 text-white font-bold px-1.5 py-0.5 rounded-full text-[10px] scale-90">
                  {vayBoardCards.filter(c => c.status === 'NEW').length}
                </span>
              )}
            </button>
            <button 
              onClick={() => setCanvasViewMode('EVENTS')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center space-x-1.5 ${canvasViewMode === 'EVENTS' ? 'bg-emerald-650 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Spatial Agents Chat</span>
              {vayBoardEvents.filter(e => e.status === 'PENDING').length > 0 && (
                <span className="bg-amber-500 text-slate-950 font-bold px-1.5 py-0.5 rounded-full text-[10px] scale-90">
                  {vayBoardEvents.filter(e => e.status === 'PENDING').length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Add Board Popover */}
      {showAddBoard && (
        <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2 grow max-w-md">
            <input 
              type="text" 
              placeholder="Name des neuen Boards..."
              value={newBoardName}
              onChange={(e) => setNewBoardName(e.target.value)}
              className="bg-slate-950 border border-slate-700 px-3 py-1.5 rounded text-sm grow text-slate-200 placeholder-slate-500 outline-none focus:border-emerald-500"
            />
            <button 
              onClick={handleCreateBoard}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold rounded text-white"
            >
              Anlegen
            </button>
          </div>
          <button 
            onClick={() => setShowAddBoard(false)}
            className="text-slate-400 hover:text-slate-200 text-xs"
          >
            Abbrechen
          </button>
        </div>
      )}

      {/* Canvas Controls Header Row */}
      {canvasViewMode === 'CANVAS' && (
        <div className="px-6 py-2 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between shrink-0 text-xs text-slate-400">
          {/* Filtering */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <ListFilter className="w-3.5 h-3.5 text-slate-500" />
              <span>Tag Filter:</span>
              <select 
                value={selectedFilterTag} 
                onChange={(e) => setSelectedFilterTag(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-slate-200 rounded px-1.5 py-0.5 outline-none font-medium"
              >
                <option value="ALL">Alle Tags</option>
                {allTags.map(tag => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-1">
              <span>Agenten Filter:</span>
              <select 
                value={selectedFilterRole} 
                onChange={(e) => setSelectedFilterRole(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-slate-200 rounded px-1.5 py-0.5 outline-none font-medium"
              >
                <option value="ALL">Alle Aufgabenbereiche</option>
                <option value="STRATEGY">Strategy-Manager</option>
                <option value="CREATIVE">Kreativ-Agent</option>
                <option value="OPERATIONS">Operations-Agent</option>
              </select>
            </div>
          </div>

          {/* Quick Add Tools (Containers or Sticky notes) */}
          <div className="flex items-center space-x-3">
            {connectingFromId && (
              <span className="animate-pulse bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/30 font-mono text-[10px]">
                Klicke auf das Ziel-Element für Verbindung...
              </span>
            )}
            <button 
              onClick={() => setShowGroupBuilder(!showGroupBuilder)}
              className="px-2.5 py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 flex items-center space-x-1.5 hover:text-white"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span>Container-Gruppe hinzufügen</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Body Window */}
      <div className="grow relative overflow-hidden bg-slate-950/40">
        
        {/* GROUP CONTAINER BUILDER SIDEBAR / OVERLAY */}
        {showGroupBuilder && (
          <div className="absolute top-2 right-2 z-50 p-4 bg-slate-900 border border-slate-700 rounded-lg shadow-xl max-w-sm w-full">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-semibold text-sm text-white">Visual-Container anlegen</h4>
              <button onClick={() => setShowGroupBuilder(false)} className="text-slate-400 hover:text-slate-100">×</button>
            </div>
            <p className="text-[11px] text-slate-400 mb-3">Erstellt einen Milanote-artigen visuellen Hintergrundbereich zum Gruppieren von Cards.</p>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-slate-400 font-mono block mb-1">TITEL DER GRUPPE:</label>
                <input 
                  type="text" 
                  placeholder="z.B. Marketing Inspiration, Tech-Stack"
                  value={groupBuilderTitle}
                  onChange={(e) => setGroupBuilderTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-mono block mb-1">AKZENT-FARBE DETEKTION:</label>
                <div className="flex space-x-2">
                  {['#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#374151'].map(c => (
                    <button 
                      key={c}
                      onClick={() => setGroupBuilderColor(c)}
                      className={`w-6 h-6 rounded-full border-2 ${groupBuilderColor === c ? 'border-white scale-110 shadow-lg' : 'border-transparent'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              <button 
                onClick={handleAddGroupContainer}
                className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded text-xs font-bold text-white transition-all mt-4"
              >
                Bereich platzieren
              </button>
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          
          {/* VIEW 1: MILANOTE-STYLE 2D CANVAS */}
          {canvasViewMode === 'CANVAS' && (
            <div 
              ref={canvasContainerRef}
              className="absolute inset-0 select-none overflow-auto p-12 mesh-canvas relative"
            >
              <div
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: 'top left',
                  width: '2500px',
                  height: '1800px',
                  position: 'relative',
                  transition: 'transform 0.15s cubic-bezier(0.1, 0.9, 0.2, 1)',
                  zIndex: 1
                }}
              >
                {/* Background aesthetic grid dots */}
                <div className="absolute inset-0 bg-[radial-gradient(#334155_1.2px,transparent_1px)] [background-size:24px_24px] opacity-15 pointer-events-none" />

                {/* CONNECTION LINES DRAWER */}
                <svg className="absolute inset-0 pointer-events-none top-0 left-0 w-full h-full min-w-[2000px] min-h-[2000px] z-0">
                  {vayBoardItems.map(item => {
                    if (item.boardId !== activeBoardId || !item.connectedTo || item.connectedTo.length === 0) return null;
                    
                    return item.connectedTo.map(targetId => {
                      const targetItem = vayBoardItems.find(i => i.id === targetId);
                      if (!targetItem) return null;

                      // Calculate point locations
                      const fromX = item.x + (item.width || 250) / 2;
                      const fromY = item.y + (item.height || 220) / 2;
                      const toX = targetItem.x + (targetItem.width || 250) / 2;
                      const toY = targetItem.y + (targetItem.height || 220) / 2;

                      return (
                        <g key={`${item.id}-to-${targetId}`}>
                          <line 
                            x1={fromX} 
                            y1={fromY} 
                            x2={toX} 
                            y2={toY} 
                            stroke="#10b981" 
                            strokeWidth="2.5" 
                            strokeDasharray="6 4"
                            className="animate-[dash_60s_linear_infinite]"
                            opacity="0.6"
                          />
                          <circle cx={fromX} cy={fromY} r="4" fill="#10b981" />
                          <circle cx={toX} cy={toY} r="4" fill="#3b82f6" />
                        </g>
                      );
                    });
                  })}
                </svg>

                {/* RENDER BOARD ITEMS */}
                <div className="relative w-full h-full min-w-[2500px] min-h-[1800px] z-10">
                  {filteredItems.map(item => {
                    const isGroup = !!item.groupColor;
                    const card = isGroup ? null : vayBoardCards.find(c => c.id === item.cardId);

                    // If non-existent card, don't show
                    if (!isGroup && !card) return null;

                    return (
                      <motion.div
                        key={item.id}
                        drag
                        dragMomentum={false}
                        dragTransition={{ power: 0, bounceStiffness: 1000 }}
                        onDragEnd={(event, info) => {
                          const newX = Math.max(0, item.x + info.offset.x / zoom);
                          const newY = Math.max(0, item.y + info.offset.y / zoom);
                          updateVayBoardItemPos(item.id, newX, newY);
                        }}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: 'spring', damping: 20 }}
                        style={{ 
                          position: 'absolute', 
                          left: item.x, 
                          top: item.y, 
                          width: item.width || 250,
                          zIndex: isGroup ? 10 : 20,
                          cursor: 'grab'
                        }}
                        className="origin-center"
                      >
                        {isGroup ? (
                          /* CONTAINER SECTION BACKGROUND */
                          <div 
                            className="rounded-xl border-2 border-dashed bg-slate-900/40 p-4 transition-all relative select-none"
                            style={{ 
                              borderColor: item.groupColor, 
                              height: item.height || 420 
                            }}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span 
                                className="text-xs font-bold py-0.5 px-2 bg-slate-950 rounded-full border border-slate-700 select-none cursor-default"
                                style={{ color: item.groupColor }}
                              >
                                {item.groupTitle || "Container-Bereich"}
                              </span>
                              <div className="flex items-center space-x-1.5 opacity-50 hover:opacity-100">
                                <button 
                                  onClick={() => deleteVayBoardItem(item.id)}
                                  className="p-1 hover:bg-slate-800 rounded text-rose-400"
                                  title="Gruppe entfernen"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                            
                            {/* Inner container placeholder instruct */}
                            <div className="absolute inset-0 pt-16 flex items-start justify-center text-[10px] text-slate-500 pointer-events-none text-center px-4">
                              Ziehe intelligente Inhalts-Karten hier hinein um sie zu bündeln.
                            </div>
                          </div>
                        ) : (
                          
                          /* INTENSE INTELLEGENT KNOWLEDGE CARD */
                          <div 
                            className={`bg-slate-900 border rounded-xl shadow-xl hover:shadow-2xl hover:border-slate-600 transition-all cursor-default select-none group/item overflow-hidden`}
                            style={{ 
                              borderColor: selectedCardId === card?.id ? '#10b981' : '#334155' 
                            }}
                          >
                            {/* Top Card Ingest Header bar */}
                            <div className="px-3.5 py-2.5 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                {getSourceIcon(card!.sourceType)}
                                <span className="text-[10px] bg-slate-800 text-slate-300 font-semibold px-1.5 py-0.5 rounded font-mono uppercase">
                                  {card!.sourceType}
                                </span>
                              </div>
                              
                              {/* Actions overlay */}
                              <div className="flex items-center space-x-1">
                                <button 
                                  onClick={() => handleInitiateConnection(item.id)}
                                  className={`p-1 hover:bg-slate-800 rounded transition-all ${connectingFromId === item.id ? 'bg-amber-600 text-slate-950 font-bold' : 'text-slate-400 hover:text-emerald-400'}`}
                                  title={connectingFromId === item.id ? "Wähle Gegenstelle als Verbindung" : "Verbindungs-Linie ziehen"}
                                >
                                  <Link className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  onClick={() => {
                                    if (card) setSelectedCardId(card.id);
                                  }}
                                  className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
                                  title="Analyse-Details öffnen"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  onClick={() => deleteVayBoardItem(item.id)}
                                  className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-rose-400"
                                  title="Vom Canvas werfen"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Middle Body */}
                            <div className="p-3.5 space-y-3">
                              <div>
                                <h5 className="font-bold text-xs text-white leading-snug line-clamp-2 select-text cursor-default">
                                  {card!.title}
                                </h5>
                                <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-3 mt-1.5 select-text">
                                  {card!.summary}
                                </p>
                              </div>

                              {/* Tags display */}
                              <div className="flex flex-wrap gap-1">
                                {card!.tags.slice(0, 3).map(tag => (
                                  <span key={tag} className="text-[9px] bg-slate-950 text-slate-400 font-semibold rounded px-1.5 py-0.5 border border-slate-800 font-mono">
                                    #{tag}
                                  </span>
                                ))}
                                {card!.tags.length > 3 && (
                                  <span className="text-[9px] bg-slate-950 text-slate-500 font-semibold rounded px-1 py-0.5 border border-slate-800">
                                    +{card!.tags.length - 3}
                                  </span>
                                )}
                              </div>

                              {/* Importance badge & Role indicators */}
                              <div className="flex items-center justify-between border-t border-slate-800 pt-2.5">
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                  card!.importance === 'HIGH' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                                  card!.importance === 'MEDIUM' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                  'bg-slate-800 text-slate-400'
                                }`}>
                                  {card!.importance}
                                </span>

                                {/* Roles */}
                                <div className="flex -space-x-1.5">
                                  {card!.roles.map(role => (
                                    <div 
                                      key={role} 
                                      className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black text-slate-950 select-none shadow border border-slate-900 ${
                                        role === 'STRATEGY' ? 'bg-amber-500' :
                                        role === 'CREATIVE' ? 'bg-indigo-400' :
                                        'bg-emerald-400'
                                      }`}
                                      title={`Relevanz: ${role}`}
                                    >
                                      {role[0]}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}


                  {/* EMPTY STATE COMPONENT */}
                  {filteredItems.length === 0 && (
                    <div className="absolute top-[250px] left-[350px] max-w-sm text-center p-6 bg-slate-900/60 border border-slate-800 rounded-xl">
                      <AlertCircle className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                      <h5 className="font-semibold text-sm text-slate-300">Dein Visual Canvas ist noch leer</h5>
                      <p className="text-xs text-slate-400 mt-1">Geh zum <b>"Recall Eingang"-Tab</b> oben rechts um YouTube Links oder Textnotizen als Knowledge-Cards zu generieren und zu pinnen.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Floating Zoom Controls persistently locked to viewport corner */}
              <div className="absolute bottom-6 right-6 z-50 bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-xl p-1.5 shadow-2xl flex items-center space-x-2 select-none">
                <button 
                  onClick={() => setZoom(prev => Math.max(0.4, Number((prev - 0.05).toFixed(2))))}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
                  title="Herauszoomen (Mausrad runter)"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setZoom(1.0)}
                  className="px-2 py-1 text-[11px] font-mono font-bold text-slate-300 hover:text-emerald-400 rounded-md hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Zoom zurücksetzen auf 100%"
                >
                  {Math.round(zoom * 100)}%
                </button>
                <button 
                  onClick={() => setZoom(prev => Math.min(2.0, Number((prev + 0.05).toFixed(2))))}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
                  title="Herainzoomen (Mausrad hoch)"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}


          {/* VIEW 2: KNOWLEDGE INBOX */}
          {canvasViewMode === 'INBOX' && (
            <motion.div 
              key="inbox"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 overflow-y-auto p-8"
            >
              <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-8">
                
                {/* INGEST SIDEBAR PANEL */}
                <div className="lg:col-span-2 bg-slate-900 border border-slate-850 p-6 rounded-xl shadow-xl h-fit space-y-5">
                  <div className="border-b border-slate-800 pb-3">
                    <h3 className="font-bold text-base text-white flex items-center gap-2">
                      <Zap className="w-5 h-5 text-emerald-400" />
                      Neues Wissen abgreifen
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">Verdaue YouTube Videos, PDF Memos oder Sprachaufnahmen in Sekunden zu geerdeten Handlungsanweisungen.</p>
                  </div>

                  {/* Source Selectors */}
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1.5 font-mono">QUELLEN-TYP:</label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: 'TEXT', icon: <FileText className="w-3.5 h-3.5" />, label: 'Text/Notes' },
                          { id: 'YOUTUBE', icon: <Youtube className="w-3.5 h-3.5" />, label: 'YouTube' },
                          { id: 'PDF', icon: <FileText className="w-3.5 h-3.5" />, label: 'PDF Links' }
                        ].map(s => (
                          <button 
                            key={s.id}
                            onClick={() => setSourceType(s.id as any)}
                            className={`p-2 rounded-lg text-xs font-semibold border flex flex-col items-center gap-1.5 transition-all ${sourceType === s.id ? 'bg-emerald-600/10 border-emerald-500 text-emerald-400' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'}`}
                          >
                            {s.icon}
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {sourceType !== 'TEXT' && (
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1 font-mono">QUELLEN - EXTERNEN URL:</label>
                        <input 
                          type="url" 
                          placeholder={sourceType === 'YOUTUBE' ? "https://www.youtube.com/watch?v=..." : "https://example.com/briefing.pdf"}
                          value={sourceUrl}
                          onChange={(e) => setSourceUrl(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 px-3.5 py-2 rounded text-xs text-slate-100 placeholder-slate-600 outline-none focus:border-emerald-500"
                        />
                      </div>
                    )}

                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1 font-mono">QUELLE ENTWURF ODER TRANSSKRIPT:</label>
                      <textarea 
                        rows={8}
                        placeholder={
                          sourceType === 'YOUTUBE' 
                            ? "Kopiere das Transkript oder den groben Video-Inhalt hier hinein zur Detail-Analyse exklusiv für dein Startup-System..."
                            : "Schreibe dein Wissen, PDF-Textabschnitte oder Youtube-Notizen nieder..."
                        }
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 p-3 rounded text-xs text-slate-100 placeholder-slate-600 outline-none focus:border-emerald-500 resize-none"
                      />
                    </div>

                    {analysisError && (
                      <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded text-xs flex items-center space-x-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{analysisError}</span>
                      </div>
                    )}

                    <button 
                      onClick={handleAnalyzeAndSave}
                      disabled={isAnalyzing}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold rounded-lg text-xs transition-all flex items-center justify-center space-x-2 shadow-lg"
                    >
                      {isAnalyzing ? (
                        <>
                          <div className="w-4 h-4 border-2 border-slate-400 border-t-white rounded-full animate-spin" />
                          <span>Gemini generiert Synthese...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                          <span>AI-Analyse starten & pin</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* INBOX RESULTS FEED */}
                <div className="lg:col-span-3 space-y-6">
                  
                  {/* AI QUICK QUERY SORT & FILTER SECTION */}
                  <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
                    <div className="flex items-center space-x-2.5">
                      <div className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20 flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div>
                        <h4 className="text-[10px] font-bold font-mono tracking-wider text-emerald-400 uppercase">KI POSTEINGANGS-SPLITTER</h4>
                        <h3 className="font-extrabold text-sm text-white">Intelligente Wissens-Sortierung & Filter</h3>
                      </div>
                    </div>

                    <p className="text-xs text-slate-400 leading-snug">
                      Stelle gezielte Fragen an dein gesammeltes Wissen, um relevante Cards sofort zu filtern, zu sortieren und Zusammenhänge zu verstehen:
                    </p>

                    {/* Question Buttons List */}
                    <div className="flex flex-wrap gap-2">
                      {inboxQuestions.map((q, idx) => {
                        const isCurrent = selectedQuestion === q;
                        return (
                          <button
                            key={idx}
                            onClick={() => handleSelectQuestion(q)}
                            disabled={isQuerying && !isCurrent}
                            className={`px-3 py-1.5 rounded-lg text-xs leading-tight transition-all text-left flex items-center space-x-2 border disabled:opacity-40 disabled:pointer-events-none cursor-pointer ${
                              isCurrent 
                                ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-950/40 font-semibold' 
                                : 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 hover:bg-slate-900'
                            }`}
                          >
                            <HelpCircle className={`w-3.5 h-3.5 shrink-0 ${isCurrent ? 'text-white' : 'text-slate-500'}`} />
                            <span>{q}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* AI ANSWER AREA */}
                    <AnimatePresence mode="wait">
                      {isQuerying && (
                        <motion.div 
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="p-4 bg-slate-950/50 border border-slate-850 rounded-lg flex items-center justify-center space-x-3"
                        >
                          <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                          <span className="text-xs text-slate-400 font-mono">KI analysiert alle Ingest-Inhalte für "{selectedQuestion}"...</span>
                        </motion.div>
                      )}

                      {!isQuerying && queryAnswer && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="p-4 bg-slate-950 border border-emerald-500/20 rounded-lg space-y-2.5 relative select-text"
                        >
                          <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                            <span className="text-[10px] text-emerald-400 font-mono tracking-wider font-bold uppercase flex items-center gap-1 leading-none">
                              <Sparkles className="w-3.5 h-3.5" /> KI-ERKENNTNIS & ANALYSE
                            </span>
                            <button
                              onClick={handleClearQuestionFilter}
                              className="text-[10px] text-slate-400 hover:text-white underline cursor-pointer"
                            >
                              Filter zurücksetzen
                            </button>
                          </div>
                          
                          <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap select-text">
                            {queryAnswer}
                          </p>

                          <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                            <span>
                              {queryRelevantIds.length > 0 
                                ? `👉 Zeige ${queryRelevantIds.length} passend gefilterte Wissenskarten unten an.` 
                                : `Keine direkt verknüpften Karten gefunden, zeige alle Wissenskarten.`
                              }
                            </span>
                          </div>
                        </motion.div>
                      )}

                      {queryError && (
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="p-3 bg-rose-500/15 border border-rose-500/20 text-rose-400 rounded-lg text-xs"
                        >
                          {queryError}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* List header and cards count */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-sm text-slate-300">
                        {selectedQuestion && queryRelevantIds.length > 0 
                          ? `Gefilterte Wissensbibliothek (${vayBoardCards.filter(c => queryRelevantIds.includes(c.id)).length} von ${vayBoardCards.length} Cards)`
                          : `Wissensbibliothek (${vayBoardCards.length} Cards)`
                        }
                      </h3>
                      <div className="text-[10px] text-slate-500">Klicke eine Ingest-Karte an für die detaillierten AI-Einblicke.</div>
                    </div>

                    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                      {(() => {
                        const displayedInboxCards = selectedQuestion && queryRelevantIds.length > 0
                          ? vayBoardCards.filter(c => queryRelevantIds.includes(c.id))
                          : vayBoardCards;

                        return (
                          <>
                            {displayedInboxCards.map(card => {
                              const isPinned = vayBoardItems.some(i => i.cardId === card.id && i.boardId === activeBoardId);
                              return (
                                <div 
                                  key={card.id}
                                  onClick={() => setSelectedCardId(card.id)}
                                  className={`p-4 bg-slate-900 border rounded-xl hover:border-slate-700 transition-all cursor-pointer relative ${selectedCardId === card.id ? 'border-emerald-600/60 ring-1 ring-emerald-500/20' : 'border-slate-850'}`}
                                >
                                  <div className="flex items-center justify-between mb-2 border-b border-slate-850/40 pb-2">
                                    <div className="flex items-center space-x-2">
                                      {getSourceIcon(card.sourceType)}
                                      <span className="text-[10px] text-slate-400 font-mono italic">{new Date(card.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${card.importance === 'HIGH' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-slate-800 text-slate-400'}`}>
                                        {card.importance}
                                      </span>
                                      {isPinned && (
                                        <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold px-1.5 py-0.5 rounded">
                                          Pinned
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <h4 className="font-bold text-sm text-slate-100 select-text leading-snug">{card.title}</h4>
                                  <p className="text-xs text-slate-400 line-clamp-2 mt-1.5 leading-relaxed select-text">{card.summary}</p>

                                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-850/60 text-xs">
                                    <div className="flex space-x-1">
                                      {card.tags.slice(0, 3).map(t => (
                                        <span key={t} className="text-[9px] bg-slate-950 text-slate-500 font-semibold rounded px-1.5 py-0.5 font-mono border border-slate-850">#{t}</span>
                                      ))}
                                    </div>
                                    
                                    {!isPinned && (
                                      <button 
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          await addVayBoardItem({
                                            boardId: activeBoardId,
                                            cardId: card.id,
                                            x: 100 + Math.random() * 400,
                                            y: 100 + Math.random() * 300,
                                            width: 250,
                                            height: 220
                                          });
                                        }}
                                        className="px-2 py-1 bg-emerald-600/20 hover:bg-emerald-600 text-[10px] font-bold text-emerald-400 hover:text-white rounded flex items-center space-x-1.5 transition-all cursor-pointer"
                                      >
                                        <Plus className="w-3 h-3" />
                                        <span>Auf Canvas pinnen</span>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}

                            {displayedInboxCards.length === 0 && (
                              <div className="p-8 text-center bg-slate-900/40 border border-dashed border-slate-800 rounded-xl text-slate-500">
                                {selectedQuestion 
                                  ? "Gefundene Übereinstimmungen: Keine Wissenskarten passen zu dieser Frage." 
                                  : "Keine Wissenskarten vorhanden. Starte links die Ingestion."
                                }
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>

              </div>
            </motion.div>
          )}


          {/* VIEW 3: AGENTS CHAT LOG */}
          {canvasViewMode === 'EVENTS' && (
            <motion.div 
              key="events"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 overflow-y-auto p-8"
            >
              <div className="max-w-3xl mx-auto space-y-6">
                <div className="border-b border-slate-850 pb-3 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-base text-white flex items-center gap-2">
                      <Cpu className="w-5 h-5 text-amber-400" />
                      Spatial Agents Intelligence Feed
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">Hier reagieren der <b>Strategie-Manager</b>, der <b>Kreativ-Agent</b> und der <b>Operations-Agent</b> live auf neu erfasstes Wissen.</p>
                  </div>
                  <button 
                    onClick={() => {
                      vayBoardEvents.forEach(e => {
                        updateVayBoardEventStatus(e.id, 'PROCESSED');
                      });
                    }}
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-[10px] rounded text-slate-300 font-semibold"
                  >
                    Alle als Gelesen markieren
                  </button>
                </div>

                <div className="space-y-4">
                  {vayBoardEvents.map(event => {
                    const card = vayBoardCards.find(c => c.id === event.cardId);
                    return (
                      <div 
                        key={event.id}
                        className={`p-5 rounded-xl border flex gap-4 transition-all ${
                          event.status === 'PENDING' ? 'bg-slate-900 border-amber-500/30 shadow-lg' : 'bg-slate-900/60 border-slate-850'
                        }`}
                      >
                        {/* Avatar representation depending on the agent */}
                        <div className="shrink-0 flex flex-col items-center">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-slate-950 scale-105 shadow-inner ${
                            event.agent === 'STRATEGY' ? 'bg-amber-400' :
                            event.agent === 'CREATIVE' ? 'bg-indigo-400' :
                            'bg-emerald-400'
                          }`}>
                            {event.agent[0]}
                          </div>
                          <span className="text-[8px] font-bold text-slate-400 font-mono mt-1 w-16 text-center truncate">
                            {event.agent === 'STRATEGY' ? 'STRATEGY' : event.agent === 'CREATIVE' ? 'CREATIVE' : 'OPERATIONS'}
                          </span>
                        </div>

                        {/* Event commentary details */}
                        <div className="grow space-y-2">
                          <div className="flex items-start justify-between">
                            <div>
                              <span className="text-[10px] text-amber-400 font-mono block">AGENT TRIGGER COMMENTARY</span>
                              <h4 className="font-bold text-sm text-slate-100 mt-0.5">
                                Re: {card ? card.title : "Unbekanntes Thema"}
                              </h4>
                            </div>
                            <span className="text-[9px] text-slate-500 font-mono">{new Date(event.createdAt).toLocaleTimeString()}</span>
                          </div>

                          <p className="text-xs text-slate-300 leading-relaxed italic bg-slate-950/80 p-3 rounded-lg border border-slate-850 select-text">
                            "{event.description}"
                          </p>

                          {card && (
                            <div className="flex items-center gap-2 pt-1.5 text-xs">
                              <span className="text-slate-500">Empfohlene Rolle:</span>
                              <span className="bg-slate-950 text-slate-400 font-semibold px-2 py-0.5 rounded text-[10px] border border-slate-800">
                                {card.roles.join(', ')}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {vayBoardEvents.length === 0 && (
                    <div className="p-12 text-center bg-slate-900/40 border border-dashed border-slate-800 rounded-xl text-slate-500">
                      Derzeit keine Agentenkommentare vorhanden. Füge neue Wissenskarten hinzu um Trigger auszulösen.
                    </div>
                  )}
                </div>

              </div>
            </motion.div>
          )}

        </AnimatePresence>

      </div>

      {/* DETAILED CARD VIEW SIDEBAR (Zusammenfassung, Projektrelevanz, Next Actions) */}
      <AnimatePresence>
        {selectedCardId && (
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.25 }}
            className="absolute top-0 right-0 z-[60] w-96 h-full bg-slate-900 border-l border-slate-800 shadow-2xl p-6 overflow-y-auto flex flex-col select-text"
          >
            {(() => {
              const card = vayBoardCards.find(c => c.id === selectedCardId);
              if (!card) return null;
              return (
                <div className="grow flex flex-col h-full space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-805 pb-4 shrink-0">
                    <div className="flex items-center space-x-2">
                      {getSourceIcon(card.sourceType)}
                      <span className="text-xs font-semibold text-slate-300 tracking-wide uppercase">{card.sourceType} Details</span>
                    </div>
                    <button 
                      onClick={() => setSelectedCardId(null)}
                      className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Body Scroll area */}
                  <div className="grow space-y-4 pr-1 text-sm leading-relaxed overflow-y-auto select-text">
                    <div>
                      <h3 className="font-extrabold text-base text-white leading-tight">{card.title}</h3>
                      {card.sourceUrl && (
                        <a 
                          href={card.sourceUrl} 
                          target="_blank" 
                          rel="noreferrer" 
                          referrerPolicy="no-referrer"
                          className="text-xs text-emerald-400 hover:underline flex items-center space-x-1 mt-1 truncate"
                        >
                          <Link className="w-3.5 h-3.5" />
                          <span>Link zur Quelle sichten</span>
                        </a>
                      )}
                    </div>

                    <div className="border-t border-slate-850 pt-3">
                      <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider block mb-1">KI-Zusammenfassung:</span>
                      <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-3.5 rounded-lg border border-slate-850 whitespace-pre-wrap select-text">
                        {card.summary}
                      </p>
                    </div>

                    <div className="border-t border-slate-850 pt-3">
                      <span className="text-[10px] text-indigo-400 font-mono uppercase tracking-wider block mb-1">Konkrete Projektrelevanz:</span>
                      <p className="text-xs text-slate-300 bg-indigo-950/20 p-3 rounded-lg border border-indigo-900/25 italic select-text">
                        {card.projectRelevance || "Wird evaluiert..."}
                      </p>
                    </div>

                    <div className="border-t border-slate-850 pt-3">
                      <span className="text-[10px] text-emerald-400 font-mono uppercase tracking-wider block mb-2">Nächste Schritte für dein Team (Recall Actionables):</span>
                      <ul className="space-y-1.5">
                        {card.nextActions.map((act, i) => (
                          <li key={i} className="text-xs text-slate-300 flex items-start gap-2 select-text">
                            <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                            <span>{act}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="border-t border-slate-850 pt-3">
                      <span className="text-[10px] text-slate-400 font-mono uppercase block mb-1">Tags:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {card.tags.map(t => (
                          <span key={t} className="text-[10px] bg-slate-950 text-slate-400 px-2 py-0.5 rounded border border-slate-800">
                            #{t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-800 pt-4 flex space-x-3 shrink-0">
                    <button 
                      onClick={() => {
                        deleteVayBoardCard(card.id).then(() => setSelectedCardId(null));
                      }}
                      className="px-3 py-2 bg-rose-950 hover:bg-rose-900 duration-150 text-rose-300 hover:text-white rounded text-xs select-none flex items-center space-x-1.5"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Eintrag löschen</span>
                    </button>
                    <button 
                      onClick={() => setSelectedCardId(null)}
                      className="grow px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded text-xs text-center text-slate-200 hover:text-white select-none transition-all"
                    >
                      Schließen
                    </button>
                  </div>
                </div>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
