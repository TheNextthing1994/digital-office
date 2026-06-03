
import React, { useState, useRef } from 'react';
import { Mic, Square, Play, Trash2 } from 'lucide-react';

interface RecorderProps {
  onRecordingComplete: (url: string) => void;
}

export const Recorder: React.FC<RecorderProps> = ({ onRecordingComplete }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        onRecordingComplete(url);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setIsRecording(true);
    } catch (err: any) {
      console.error("Recording error:", err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        alert('Mikrofon-Zugriff verweigert. Bitte prüfe deine Browser-Einstellungen.');
      } else {
        alert('Fehler bei der Aufnahme: ' + err.message);
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="flex items-center gap-3 p-4 glass-panel rounded-xl mt-4">
      {!isRecording ? (
        <button
          onClick={startRecording}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-all"
        >
          <Mic size={18} /> Aufnahme starten
        </button>
      ) : (
        <button
          onClick={stopRecording}
          className="flex items-center gap-2 bg-slate-100 text-slate-900 px-4 py-2 rounded-lg transition-all"
        >
          <Square size={18} /> Stoppen
        </button>
      )}

      {audioUrl && (
        <div className="flex items-center gap-3 ml-auto">
          <audio src={audioUrl} controls className="h-8 max-w-[200px]" />
          <button
            onClick={() => {
              setAudioUrl(null);
              onRecordingComplete('');
            }}
            className="text-slate-400 hover:text-red-500 transition-colors"
          >
            <Trash2 size={18} />
          </button>
        </div>
      )}
    </div>
  );
};
