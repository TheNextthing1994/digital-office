
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { StudioScene } from './components/StudioScene';
import { Recorder } from './components/Recorder';
import { useFirebase } from './components/FirebaseContext';
import { generatePodcastScript, generateSpeech, formatCustomTextToScript, connectToLiveSession } from './services/geminiService';
import { PodcastScript, PersonaType, DialogueEntry } from './types';
import { Sparkles, MessageSquare, Mic2, Play, Pause, RotateCcw, Send, Paperclip, X, FileText, ChevronRight, AlignLeft, Maximize2, Minimize2, Video, Square, Download, Trash2, Monitor, GripHorizontal } from 'lucide-react';

const App: React.FC = () => {
  const { user, loading, signInWithGoogle, logout } = useFirebase();
  const [topic, setTopic] = useState('');
  const [customText, setCustomText] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [attachments, setAttachments] = useState<{name: string, content: string}[]>([]);
  const [script, setScript] = useState<PodcastScript | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeSpeaker, setActiveSpeaker] = useState<PersonaType | null>(null);
  const [isInteracting, setIsInteracting] = useState(false);
  const [interactionTarget, setInteractionTarget] = useState<PersonaType | null>(null);
  const [transcription, setTranscription] = useState('');
  const [isTheaterMode, setIsTheaterMode] = useState(false);

  // --- Screen Sharing and Recording states ---
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenShareStream, setScreenShareStream] = useState<MediaStream | null>(null);
  const [isScreenRecording, setIsScreenRecording] = useState(false);
  const [screenRecordingStream, setScreenRecordingStream] = useState<MediaStream | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordingHistory, setRecordingHistory] = useState<{ id: string, url: string, date: string, duration: number }[]>([]);
  const [activePlaybackUrl, setActivePlaybackUrl] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);

  // --- Draggable Studio-Zentrale widget state ---
  const [panelPos, setPanelPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const panelStart = useRef({ x: 0, y: 0 });

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    panelStart.current = { x: panelPos.x, y: panelPos.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setPanelPos({
      x: panelStart.current.x + dx,
      y: panelStart.current.y + dy
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const screenShareVideoRef = useRef<HTMLVideoElement | null>(null);
  const screenShareIntervalIdRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingDurationIntervalRef = useRef<any>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const liveSessionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  useEffect(() => {
    // Initialize AudioContext with 24kHz (Gemini TTS/Live sample rate)
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    return () => { audioContextRef.current?.close(); };
  }, []);

  const isPlayingRef = useRef(false);
  const isInteractingRef = useRef(false);
  const audioQueueRef = useRef<Float32Array[]>([]);
  const isPlayingQueue = useRef(false);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    isInteractingRef.current = isInteracting;
  }, [isInteracting]);

  // --- Screen Sharing and Recording Functions ---
  const stopScreenShare = useCallback(() => {
    if (screenShareIntervalIdRef.current) {
      clearInterval(screenShareIntervalIdRef.current);
      screenShareIntervalIdRef.current = null;
    }
    if (screenShareStream) {
      screenShareStream.getTracks().forEach(track => track.stop());
    }
    setScreenShareStream(null);
    setIsScreenSharing(false);
  }, [screenShareStream]);

  const startScreenShare = async () => {
    setShareError(null);
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { max: 1024 },
          height: { max: 768 },
          frameRate: { max: 10 }
        },
        audio: false
      });

      stream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };

      setScreenShareStream(stream);
      setIsScreenSharing(true);
      
      const videoEl = document.createElement('video');
      videoEl.autoplay = true;
      videoEl.muted = true;
      videoEl.playsInline = true;
      videoEl.srcObject = stream;
      videoEl.onloadedmetadata = () => {
        videoEl.play().catch(e => console.error(e));
      };
      
      screenShareVideoRef.current = videoEl;
    } catch (err: any) {
      console.error(err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setShareError("Zugriff auf Bildschirmfreigabe verweigert.");
      } else {
        setShareError(`Fehler: ${err.message}. Für Bildschirmfreigabe muss die Anwendung im neuen Tab geöffnet sein.`);
      }
    }
  };

  const stopScreenRecording = useCallback(() => {
    if (recordingDurationIntervalRef.current) {
      clearInterval(recordingDurationIntervalRef.current);
      recordingDurationIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
    }
    setIsScreenRecording(false);
    setScreenRecordingStream(null);
  }, []);

  const startScreenRecording = async () => {
    try {
      setShareError(null);
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30 },
        audio: true
      });

      let micStream: MediaStream | null = null;
      try {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (err) {
        console.warn("Could not capture microphone:", err);
      }

      const combinedStream = new MediaStream();
      screenStream.getVideoTracks().forEach(t => combinedStream.addTrack(t));

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const dest = audioCtx.createMediaStreamDestination();

      if (screenStream.getAudioTracks().length > 0) {
        const source1 = audioCtx.createMediaStreamSource(screenStream);
        source1.connect(dest);
      }
      if (micStream && micStream.getAudioTracks().length > 0) {
        const source2 = audioCtx.createMediaStreamSource(micStream);
        source2.connect(dest);
      }

      if (screenStream.getAudioTracks().length > 0 || (micStream && micStream.getAudioTracks().length > 0)) {
        dest.stream.getAudioTracks().forEach(t => combinedStream.addTrack(t));
      }

      screenStream.getVideoTracks()[0].onended = () => {
        stopScreenRecording();
      };

      let mimeType = 'video/webm;codecs=vp9,opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm;codecs=vp8,opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm';

      const recorder = new MediaRecorder(combinedStream, { mimeType });
      mediaRecorderRef.current = recorder;
      recordingChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordingChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(recordingChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const date = new Date().toLocaleString('de-DE');
        
        setRecordingHistory(prev => [
          {
            id: `rec-${Date.now()}`,
            url,
            date,
            duration: recordingDuration
          },
          ...prev
        ]);
        setActivePlaybackUrl(url);

        screenStream.getTracks().forEach(track => track.stop());
        if (micStream) micStream.getTracks().forEach(track => track.stop());
        audioCtx.close().catch(e => console.error(e));
      };

      setScreenRecordingStream(screenStream);
      setRecordingDuration(0);
      setIsScreenRecording(true);

      recordingDurationIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

      recorder.start();
    } catch (err: any) {
      console.error(err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setShareError("Zugriff auf Bildschirmaufnahme verweigert.");
      } else {
        setShareError(`Fehler bei Aufnahme: ${err.message}. Für Aufnahme muss die Anwendung im neuen Tab geöffnet sein.`);
      }
    }
  };

  // Keyboard shortcut listener for Ctrl+Shift+R
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        if (isScreenRecording) {
          stopScreenRecording();
        } else {
          startScreenRecording();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isScreenRecording, stopScreenRecording]);

  // Clean-up on unmount
  useEffect(() => {
    return () => {
      if (screenShareIntervalIdRef.current) clearInterval(screenShareIntervalIdRef.current);
      if (recordingDurationIntervalRef.current) clearInterval(recordingDurationIntervalRef.current);
    };
  }, []);


  // Checkpoint for loading & authentication follows unconditionally at the end of hooks setup


  // Frame sender to Live API WebSocket
  useEffect(() => {
    if (isScreenSharing && isInteracting && screenShareStream && liveSessionRef.current) {
      const videoEl = screenShareVideoRef.current;
      if (!videoEl) return;

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      const captureAndSend = () => {
        if (!videoEl || videoEl.paused || videoEl.ended) return;
        if (!ctx) return;

        canvas.width = 640;
        canvas.height = (videoEl.videoHeight / videoEl.videoWidth) * 640 || 480;
        
        try {
          ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
          const base64Image = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];
          
          if (liveSessionRef.current) {
            liveSessionRef.current.then((session: any) => {
              if (session && typeof session.sendRealtimeInput === 'function') {
                session.sendRealtimeInput({
                  video: { data: base64Image, mimeType: 'image/jpeg' }
                });
              }
            }).catch((err: any) => console.error("Error sending screen frame to Live API:", err));
          }
        } catch (e) {
          console.warn(e);
        }
      };

      captureAndSend();
      const intervalId = setInterval(captureAndSend, 1800);

      return () => {
        clearInterval(intervalId);
      };
    }
  }, [isScreenSharing, isInteracting, screenShareStream]);

  const stopAudio = useCallback(() => {
    if (sourceRef.current) {
      try {
        sourceRef.current.stop();
        sourceRef.current.disconnect();
      } catch (e) {}
      sourceRef.current = null;
    }
    setActiveSpeaker(null);
    audioQueueRef.current = [];
    isPlayingQueue.current = false;
  }, []);

  const processAudioQueue = async () => {
    if (isPlayingQueue.current || audioQueueRef.current.length === 0 || !audioContextRef.current) return;
    
    isPlayingQueue.current = true;
    while (audioQueueRef.current.length > 0 && (isInteractingRef.current || isPlayingRef.current)) {
      const data = audioQueueRef.current.shift()!;
      const buffer = audioContextRef.current.createBuffer(1, data.length, 24000);
      buffer.getChannelData(0).set(data);
      
      const source = audioContextRef.current.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContextRef.current.destination);
      
      await new Promise<void>((resolve) => {
        source.onended = () => resolve();
        source.start();
        sourceRef.current = source;
      });
    }
    isPlayingQueue.current = false;
  };

  const decodeAndPlay = async (base64: string, isStreaming = false) => {
    if (!audioContextRef.current || !base64) return;
    
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
    const dataInt16 = new Int16Array(bytes.buffer);
    const floatData = new Float32Array(dataInt16.length);
    for (let i = 0; i < dataInt16.length; i++) floatData[i] = dataInt16[i] / 32768.0;

    if (isStreaming) {
      audioQueueRef.current.push(floatData);
      processAudioQueue();
      return;
    }

    // Standard non-streaming playback (for script)
    if (sourceRef.current) stopAudio();
    
    const buffer = audioContextRef.current.createBuffer(1, floatData.length, 24000);
    buffer.getChannelData(0).set(floatData);
    
    const source = audioContextRef.current.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContextRef.current.destination);
    
    return new Promise<void>((resolve) => {
      source.onended = () => {
        sourceRef.current = null;
        resolve();
      };
      source.start();
      sourceRef.current = source;
    });
  };

  const handleInteract = async (target: PersonaType) => {
    if (audioContextRef.current?.state === 'suspended') {
      await audioContextRef.current.resume();
    }

    if (isInteracting) {
      // Stop session
      if (liveSessionRef.current) {
        const session = await liveSessionRef.current;
        session.close();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      if (processorRef.current) {
        processorRef.current.disconnect();
      }
      setIsInteracting(false);
      stopAudio();
      return;
    }

    // CRITICAL: Stop any ongoing script playback
    setIsPlaying(false);
    isPlayingRef.current = false;
    stopAudio();

    setInteractionTarget(target);
    setIsInteracting(true);
    setTranscription('');

    try {
      const context = script?.dialogue.slice(-5).map(d => `${d.speaker}: ${d.text}`).join('\n') || '';
      
      const sessionPromise = connectToLiveSession(target, context, {
        onAudio: (base64) => {
          setActiveSpeaker(target);
          decodeAndPlay(base64, true);
        },
        onTranscription: (text, isModel) => {
          if (isModel) {
            setTranscription(prev => text);
          } else {
            console.log("User said:", text);
            // Optional: show user transcription too
            setTranscription(prev => `Du: ${text}`);
          }
        },
        onInterrupted: () => {
          stopAudio();
        },
        onerror: (err) => console.error("Live API Error:", err),
        onclose: () => {
          console.log("Live session closed");
          setIsInteracting(false);
          setActiveSpeaker(null);
        }
      });

      liveSessionRef.current = sessionPromise;

      // Setup microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const source = audioContextRef.current!.createMediaStreamSource(stream);
      // Use 16kHz for input as recommended for Live API
      const processor = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        // Convert Float32 to Int16 PCM
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
        }
        
        const binaryString = String.fromCharCode(...new Uint8Array(pcmData.buffer));
        const base64 = btoa(binaryString);
        
        sessionPromise.then(session => {
          session.sendRealtimeInput({
            audio: { data: base64, mimeType: 'audio/pcm;rate=24000' }
          });
        });
      };

      source.connect(processor);
      processor.connect(audioContextRef.current!.destination);

    } catch (e) {
      console.error(e);
      setIsInteracting(false);
    }
  };

  const playStep = async (index: number) => {
    if (!script || index >= script.dialogue.length) {
      setIsPlaying(false);
      setActiveSpeaker(null);
      return;
    }
    const step = script.dialogue[index];
    setCurrentIndex(index);
    setActiveSpeaker(step.speaker);
    try {
      const audioData = await generateSpeech(step.text, step.speaker);
      await decodeAndPlay(audioData);
      if (isPlayingRef.current) {
        playStep(index + 1);
      }
    } catch (e) {
      console.error(e);
      setIsPlaying(false);
    }
  };

  const handleStartPodcast = async () => {
    setIsLoading(true);
    try {
      let newScript;
      if (showCustomInput && customText) {
        newScript = await formatCustomTextToScript(customText);
      } else {
        newScript = await generatePodcastScript(topic || "Analyse", attachments);
      }
      setScript(newScript);
      setIsPlaying(true);
      setCurrentIndex(0);
      playStep(0);
    } catch (err) {
      alert("Fehler.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => setAttachments(prev => [...prev, { name: file.name, content: event.target?.result as string }]);
      reader.readAsText(file);
    });
  };

  const updateRecording = (index: number, url: string) => {
    if (!script) return;
    const newDialogue = [...script.dialogue];
    newDialogue[index] = { ...newDialogue[index], userRecordingUrl: url };
    setScript({ ...script, dialogue: newDialogue });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070b08] text-emerald-100 flex flex-col items-center justify-center p-4">
        <div className="relative flex items-center justify-center mb-6">
          <div className="w-16 h-16 rounded-full border-4 border-emerald-500/20 border-t-emerald-400 animate-spin" />
        </div>
        <p className="text-xs font-black tracking-[0.2em] uppercase text-emerald-400 animate-pulse">Konferenzhub wird geladen...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#070d08] flex items-center justify-center p-4 relative overflow-hidden font-sans">
        {/* Cyberpunk background accents */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293708,transparent_1px),linear-gradient(to_bottom,#1f293708,transparent_1px)] bg-[size:24px_24px]" />
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="w-full max-w-md bg-black/60 backdrop-blur-2xl border border-white/10 rounded-[32px] p-8 md:p-10 shadow-[0_0_50px_rgba(16,185,129,0.05)] text-center relative z-10">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-2xl mx-auto flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.2)] mb-8">
            <Sparkles className="text-black" size={32} />
          </div>

          <h1 className="text-2xl md:text-3xl font-black tracking-tight mb-2 uppercase text-white">
            Konferenzhub Studio
          </h1>
          <p className="text-slate-400 text-sm mb-10 leading-relaxed max-w-sm mx-auto">
            Willkommen im interaktiven 3D Workspace der Zukunft. Melde dich an, um mit deinem Team zusammenzuarbeiten.
          </p>

          <button
            onClick={signInWithGoogle}
            className="w-full py-4 px-6 bg-white text-black hover:bg-neutral-100 font-bold text-sm tracking-wide rounded-full flex items-center justify-center gap-3 transition-all duration-300 shadow-xl group border border-white font-sans"
          >
            <svg className="w-5 h-5 group-hover:scale-105 transition-transform" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Mit Google anmelden</span>
          </button>

          <div className="mt-10 pt-6 border-t border-white/5 flex items-center justify-center gap-1.5 text-[10px] uppercase font-black tracking-widest text-emerald-500/40">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
            <span>Verbindung verschlüsselt</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-slate-100 flex flex-col overflow-hidden">
      {/* Profil-Status Panel */}
      <div className="fixed top-6 right-6 z-[9999] flex items-center gap-3 bg-black/40 backdrop-blur-xl border border-white/10 px-4 py-2.5 rounded-full shadow-2xl animate-in slide-in-from-top-3 duration-300">
        {user.photoURL ? (
          <img src={user.photoURL} alt={user.displayName || "Avatar"} referrerPolicy="no-referrer" className="w-7 h-7 rounded-full border border-white/10 shadow-md" />
        ) : (
          <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center text-xs font-black text-white border border-white/10 uppercase shadow-md">
            {user.displayName?.charAt(0) || user.email?.charAt(0) || "U"}
          </div>
        )}
        <div className="flex flex-col">
          <span className="text-[11px] font-bold text-white max-w-[125px] truncate">{user.displayName || user.email?.split('@')[0]}</span>
          <span className="text-[9px] font-black uppercase text-emerald-400 tracking-wider">Online</span>
        </div>
        <div className="h-4 w-[1px] bg-white/10 mx-1" />
        <button 
          onClick={logout} 
          className="text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-red-400 transition-colors px-1"
          title="Sign Out"
        >
          LOGOUT
        </button>
      </div>

      <main className="w-full flex-1 relative">
        <div className="absolute inset-0 z-0">
          <StudioScene 
            activeSpeaker={activeSpeaker} 
            onInteract={handleInteract} 
            isTheaterMode={true}
          />
        </div>
        
        {isInteracting && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-md z-50 flex flex-col items-center justify-end pb-32 p-8 text-center animate-in fade-in duration-500 pointer-events-none">
            <div className="absolute top-12 flex items-center gap-3 bg-red-600 px-6 py-2 rounded-full animate-pulse shadow-2xl border border-white/20">
              <div className="w-3 h-3 rounded-full bg-white"></div>
              <span className="text-xs font-black text-white uppercase tracking-widest">LIVE DEBATTE</span>
            </div>

            <div className="w-24 h-24 bg-indigo-600/30 backdrop-blur-2xl rounded-full flex items-center justify-center mb-8 border border-white/20 shadow-[0_0_50px_rgba(79,70,229,0.3)] relative">
              <Mic2 size={40} className="text-white z-10" />
              <div className="absolute inset-0 bg-indigo-400 rounded-full animate-ping opacity-20"></div>
            </div>

            <h2 className="text-3xl font-black mb-6 tracking-tight">Sprich jetzt mit {interactionTarget}</h2>
            
            <div className="bg-black/40 backdrop-blur-3xl px-12 py-10 rounded-[40px] max-w-2xl min-h-[160px] border border-white/10 shadow-2xl relative overflow-hidden pointer-events-auto">
              <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 opacity-50"></div>
              {transcription ? (
                <p className="text-indigo-100 text-2xl italic font-semibold leading-relaxed">"{transcription}"</p>
              ) : (
                <p className="text-slate-400 text-xl">Ich höre dir zu. Deine Meinung?</p>
              )}
              {isLoading && <div className="mt-8 flex justify-center gap-2"><div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce delay-0"></div><div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce delay-150"></div><div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce delay-300"></div></div>}
            </div>

            <div className="mt-12 flex gap-8 pointer-events-auto">
              <button 
                onClick={() => handleInteract(interactionTarget!)}
                className="px-12 py-5 bg-white/5 hover:bg-white/10 rounded-full font-black text-lg backdrop-blur-xl border border-white/10 transition-all hover:scale-105 active:scale-95"
              >
                MODUS VERLASSEN
              </button>
            </div>
            <p className="mt-10 text-slate-400 text-sm font-medium tracking-wide">Die KI hört zu und reagiert in Echtzeit auf deine Argumente.</p>
          </div>
        )}

        {/* Floating Recording & Screen Share Controller */}
        <div className="fixed top-20 right-5 z-[60] flex flex-col gap-3 items-end pointer-events-none">
          <div 
            style={{ transform: `translate(${panelPos.x}px, ${panelPos.y}px)` }}
            className={`bg-slate-950/90 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-4 shadow-xl shadow-black/40 flex flex-col gap-3 min-w-[280px] pointer-events-auto transition-all ${isDragging ? 'shadow-indigo-500/20 ring-1 ring-indigo-500/30 ring-offset-0 scale-[1.01]' : ''}`}
          >
            <div 
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              className="flex items-center justify-between border-b border-white/5 pb-2 cursor-grab active:cursor-grabbing select-none"
              title="Gedrückt halten zum Verschieben"
            >
              <span className="text-[10px] font-bold text-indigo-400 tracking-wider uppercase flex items-center gap-1.5">
                <GripHorizontal size={12} className="text-indigo-400/70" />
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span> Studio-Zentrale
              </span>
              {isScreenRecording && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-red-500/15 rounded-full border border-red-500/20 text-[9px] text-red-400 font-bold animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
                  REC {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
                </div>
              )}
            </div>

            {/* Micro / Shared preview miniature inside widget */}
            {isScreenSharing && screenShareStream && (
              <div className="w-full h-24 rounded-lg bg-black border border-white/10 relative overflow-hidden flex items-center justify-center">
                <video
                  ref={(el) => {
                    if (el && screenShareStream) {
                      el.srcObject = screenShareStream;
                      el.play().catch(e => {});
                    }
                  }}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 bg-black/75 rounded text-[8px] text-emerald-400 font-bold uppercase tracking-widest border border-emerald-500/20">
                  LIVE BILD
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 text-xs">
              {/* Screen Share Button */}
              <button
                onClick={isScreenSharing ? stopScreenShare : startScreenShare}
                className={`py-2 px-3 rounded-lg font-bold flex items-center justify-center gap-2 border transition-all pointer-events-auto ${
                  isScreenSharing
                    ? 'bg-emerald-600/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/20 cursor-pointer'
                    : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 cursor-pointer'
                }`}
              >
                {isScreenSharing ? (
                  <>
                    <X size={14} /> Stop
                  </>
                ) : (
                  <>
                    <Monitor size={14} /> Teilen
                  </>
                )}
              </button>

              {/* Screen Recorder Button */}
              <button
                onClick={isScreenRecording ? stopScreenRecording : startScreenRecording}
                className={`py-2 px-3 rounded-lg font-bold flex items-center justify-center gap-2 border transition-all pointer-events-auto ${
                  isScreenRecording
                    ? 'bg-red-600 hover:bg-red-700 border-red-500 text-white animate-pulse cursor-pointer'
                    : 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20 cursor-pointer'
                }`}
              >
                {isScreenRecording ? (
                  <>
                    <Square size={14} /> Stop
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div> Aufnehmen
                  </>
                )}
              </button>
            </div>

            {/* Keyboard Shortcuts Hint */}
            <p className="text-[9px] text-slate-500 text-center font-medium">
              Shortcut: <kbd className="px-1 py-0.5 bg-white/5 rounded border border-white/10">Ctrl+Shift+R</kbd>
            </p>

            {/* Share Error Indicator if any */}
            {shareError && (
              <div className="p-2 rounded bg-red-500/10 border border-red-500/20 text-[9px] text-red-400 leading-normal flex gap-1.5 items-start">
                <span>⚠️</span>
                <span>{shareError}</span>
              </div>
            )}

            {/* Recording History list if any exists */}
            {recordingHistory.length > 0 && (
              <div className="border-t border-white/5 pt-2 flex flex-col gap-1.5 max-h-[140px] overflow-y-auto pointer-events-auto">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1 select-none">
                  🎥 Aufnahmen ({recordingHistory.length})
                </span>
                {recordingHistory.map((rec) => (
                  <div key={rec.id} className="flex items-center justify-between p-1.5 rounded bg-white/5 border border-white/5 hover:bg-white/10 transition-colors text-[10px]">
                    <div className="flex flex-col gap-0.5 truncate pr-2 select-none">
                      <span className="text-slate-300 truncate font-semibold">{rec.date}</span>
                      <span className="text-slate-500 text-[8px]">
                        Dauer: {Math.floor(rec.duration / 60)}:{(rec.duration % 60).toString().padStart(2, '0')}
                      </span>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button
                        onClick={() => setActivePlaybackUrl(rec.url)}
                        className="text-indigo-400 hover:text-indigo-300 font-bold cursor-pointer"
                        title="Vorschau"
                      >
                        Ansehen
                      </button>
                      <button
                        onClick={() => {
                          const a = document.createElement('a');
                          a.href = rec.url;
                          a.download = `Studioaufnahme-${rec.id}.webm`;
                          a.click();
                        }}
                        className="text-emerald-400 hover:text-emerald-300 font-bold cursor-pointer"
                        title="Herunterladen"
                      >
                        Laden
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 2D Video Playback / Preview Modal */}
        {activePlaybackUrl && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/75 backdrop-blur-md animate-in fade-in duration-200 pointer-events-auto">
            <div className="bg-slate-900 border border-white/10 rounded-2xl max-w-[800px] w-full mx-4 shadow-2xl relative overflow-hidden flex flex-col gap-4 p-6 animate-in zoom-in duration-200">
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <h3 className="text-white text-base font-bold flex items-center gap-2">
                  🎥 Studioaufnahme Vorschau
                </h3>
                <button
                  onClick={() => setActivePlaybackUrl(null)}
                  className="p-1 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black border border-white/5 flex items-center justify-center shadow-inner">
                <video
                  src={activePlaybackUrl}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="flex gap-3 mt-2">
                <button
                  onClick={() => setActivePlaybackUrl(null)}
                  className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-sm font-semibold transition-all cursor-pointer"
                >
                  Schließen
                </button>
                <button
                  onClick={() => {
                    const a = document.createElement('a');
                    a.href = activePlaybackUrl;
                    a.download = `Studioaufnahme-${Date.now()}.webm`;
                    a.click();
                  }}
                  className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/20 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
                >
                  Speichern (Download)
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
