
import { GoogleGenAI, Type, Modality, LiveServerMessage } from "@google/genai";
import { PodcastScript, PersonaType } from "../types";

export const generatePodcastScript = async (topic: string, attachments: { name: string, content: string }[]): Promise<PodcastScript> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.API_KEY });
  
  const attachmentContext = attachments.length > 0 
    ? `DOKUMENTE ALS BASIS (D.T. Beschreibung):\n${attachments.map(a => `--- ${a.name} ---\n${a.content}`).join('\n\n')}`
    : "Keine Dokumente bereitgestellt.";

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: `Erstelle ein professionelles Podcast-Skript über: "${topic}".
    
    ${attachmentContext}
    
    Teilnehmer:
    1. "${PersonaType.CHIEF_OF_STAFF}": Ein autoritärer Militäroberoffizier (Chief of Staff). Seine Sprache ist präzise, männlich, direkt und diszipliniert. Er hat keine Zeit für Smalltalk. Er forderst den Spieler heraus.
    2. "${PersonaType.PLAYER}": Du bist der aktive Teilnehmer, der Ideen einbringt und verteidigt.
    
    Erstelle 10-15 Dialogschritte zwischen dem Chief of Staff und dem Player. Der Chief of Staff spricht wie ein kommandierender Offizier, bleibt aber ein strategischer Berater.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          topic: { type: Type.STRING },
          dialogue: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                speaker: { type: Type.STRING, enum: Object.values(PersonaType) },
                text: { type: Type.STRING }
              },
              required: ["speaker", "text"]
            }
          }
        },
        required: ["topic", "dialogue"]
      },
    },
  });

  return JSON.parse(response.text) as PodcastScript;
};

export const formatCustomTextToScript = async (customText: string): Promise<PodcastScript> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Wandle diesen Text in eine Podcast-Diskussion um zwischen:
    - ${PersonaType.CHIEF_OF_STAFF} (Experte und Moderator)
    - ${PersonaType.PLAYER} (Aktiver Gestalter)
    
    TEXT:
    "${customText}"`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          topic: { type: Type.STRING },
          dialogue: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                speaker: { type: Type.STRING, enum: Object.values(PersonaType) },
                text: { type: Type.STRING }
              },
              required: ["speaker", "text"]
            }
          }
        },
        required: ["topic", "dialogue"]
      },
    },
  });
  return JSON.parse(response.text) as PodcastScript;
};

export const generateSpeech = async (text: string, speaker: PersonaType): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.API_KEY });
  const voiceMap = {
    [PersonaType.CHIEF_OF_STAFF]: 'Fenrir',
    [PersonaType.PLAYER]: 'Charon'
  };

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: voiceMap[speaker] },
        },
      },
    },
  });

  return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || '';
};

export const askIntervention = async (userInput: string, context: string, targetPersona: PersonaType): Promise<{ text: string, speaker: PersonaType }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Nutzer sagt: "${userInput}".
    
    PODCAST KONTEXT:
    "${context}"
    
    DEINE ROLLE: Du bist "${targetPersona}".
    - CHIEF OF STAFF: Ein autoritärer Militäroberoffizier. Präzise, männlich, direkt und diszipliniert.
    - PLAYER: Der aktive Nutzer.
    
    ANWEISUNG: Antworte kurz und prägnant (max 2-3 Sätze) in militärischem Ton. Als Chief of Staff forderst du den Spieler heraus.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          text: { type: Type.STRING },
          speaker: { type: Type.STRING, enum: Object.values(PersonaType) }
        },
        required: ["text", "speaker"]
      }
    }
  });
  return JSON.parse(response.text);
};

export const connectToLiveSession = (
  targetPersona: PersonaType, 
  context: string,
  callbacks: {
    onAudio: (base64: string) => void,
    onTranscription: (text: string, isModel: boolean) => void,
    onInterrupted: () => void,
    onerror: (err: any) => void,
    onclose: () => void
  }
) => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.API_KEY });
  const voiceMap = {
    [PersonaType.CHIEF_OF_STAFF]: 'Fenrir',
    [PersonaType.PLAYER]: 'Zephyr'
  };

  const session = ai.live.connect({
    model: "gemini-3.1-flash-live-preview",
    callbacks: {
      onopen: () => {
        console.log("Live session opened");
      },
      onmessage: async (message: LiveServerMessage) => {
        // Audio output
        const audioPart = message.serverContent?.modelTurn?.parts.find(p => p.inlineData);
        if (audioPart?.inlineData?.data) {
          callbacks.onAudio(audioPart.inlineData.data);
        }

        // Transcriptions
        if (message.serverContent?.modelTurn?.parts.some(p => p.text)) {
           const text = message.serverContent.modelTurn.parts.map(p => p.text).join(' ');
           callbacks.onTranscription(text, true);
        }

        // Interruption
        if (message.serverContent?.interrupted) {
          callbacks.onInterrupted();
        }
      },
      onerror: callbacks.onerror,
      onclose: callbacks.onclose
    },
      config: {
    responseModalities: [Modality.AUDIO],
    speechConfig: {
      voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceMap[targetPersona] } },
    },
    systemInstruction: `STRENG VERTRAULICH / MILITÄRISCHES PROTOKOLL.
    Du bist der CHIEF OF STAFF – ein hochrangiger Militäroberoffizier. 
    Deine Persona: Männlich, autoritär, präzise, diszipliniert, keine Emotionen außer Professionalität.
    Deine Sprache: Kurze Sätze, militärischer Jargon (z.B. "Verstanden", "Bestätigt", "Negativ", "Rühren"), direkte Befehle oder strategische Rückfragen.
    KONTEXT der Operation: "${context}"
    
    ANWEISUNG:
    Antworte EXTREM KURZ (max. 10-15 Wörter). Keine Höflichkeitsfloskeln. Du hast das Kommando über diese Besprechung. Fordere den Spieler ('Player') heraus, seine Strategie zu rechtfertigen.`,
    outputAudioTranscription: {},
    inputAudioTranscription: {},
  },
  });

  return session;
};

export interface VayBoardCardAnalysis {
  title: string;
  summary: string;
  tags: string[];
  roles: ('STRATEGY' | 'CREATIVE' | 'OPERATIONS')[];
  projectRelevance: string;
  nextActions: string[];
  importance: 'LOW' | 'MEDIUM' | 'HIGH';
}

export const analyzeKnowledgeInput = async (
  rawText: string,
  sourceType: 'YOUTUBE' | 'PDF' | 'TEXT' | 'VOICE' | 'TEAM',
  sourceUrl?: string
): Promise<VayBoardCardAnalysis> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.API_KEY });
  
  const contents = `Analysiere sorgfältig die folgende Wissens-Eingabe (Source Type: ${sourceType}, Source URL: ${sourceUrl || 'keine'}):
  
  INGESTED CONTENT:
  "${rawText}"
  
  Extrahiere die folgenden Informationen präzise auf DEUTSCH:
  1. Title (Ein prägnanter, inspirierender Titel)
  2. Summary (Eine strukturierte, tiefgehende Zusammenfassung auf Deutsch)
  3. Tags (3-5 relevante Fachbegriffe oder Keywords als Array von Strings)
  4. Roles (Weise diese Information mindestens einer oder mehreren strategischen Rollen zu:
     - "STRATEGY": Für langfristige Visionen, Marktanalysen oder strategische Weichenstellungen.
     - "CREATIVE": Für Marketing-Kampagnen, Content-Ideen, Design-Input, Storytelling oder Sales.
     - "OPERATIONS": Für technische Implementierungen, Code, Struktur, Sicherheit, Tools oder Prozess-Optimierung.)
  5. Project Relevance (Was bedeutet das konkret für das aktuelle digitale Büro/Startup/Projekt des Nutzers?)
  6. Next Actions (3 konkrete, umsetzbare nächste Schritte für das Team)
  7. Importance ("LOW", "MEDIUM", "HIGH" basierend auf der strategischen Hebelwirkung)
  
  Bitte generiere die strukturierte JSON-Antwort exakt nach Schema.`;

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          summary: { type: Type.STRING },
          tags: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          roles: {
            type: Type.ARRAY,
            items: { type: Type.STRING, enum: ["STRATEGY", "CREATIVE", "OPERATIONS"] }
          },
          projectRelevance: { type: Type.STRING },
          nextActions: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          importance: { type: Type.STRING, enum: ["LOW", "MEDIUM", "HIGH"] }
        },
        required: ["title", "summary", "tags", "roles", "projectRelevance", "nextActions", "importance"]
      }
    }
  });

  return JSON.parse(response.text) as VayBoardCardAnalysis;
};

export const generateAgentCommentary = async (
  cardTitle: string,
  cardSummary: string,
  projectRelevance: string,
  agent: 'STRATEGY' | 'CREATIVE' | 'OPERATIONS'
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.API_KEY });
  
  let agentPersonaInstruction = "";
  if (agent === "STRATEGY") {
    agentPersonaInstruction = "Du bist der Strategie-Manager. Dein Ton ist visionär, zukunftsorientiert, geschäftsorientiert und hoch professionell. Analysiere kurz, wie wir dieses Wissen nutzen können, um unser Unternehmen strategisch zu skalieren.";
  } else if (agent === "CREATIVE") {
    agentPersonaInstruction = "Du bist der Kreativ-Agent. Dein Ton ist enthusiastisch, ideenreich, ästhetisch orientiert und voller Tatendrang für Marketing, Storytelling und Markenbildung. Schlage eine kreative Idee oder einen Marketing-Winkel basierend auf diesem Wissen vor.";
  } else {
    agentPersonaInstruction = "Du bist der Operations-Agent (Sicherungs-Bot/Techniker). Dein Ton ist extrem pragmatisch, prozessorientiert, fokussiert auf Effizienz, Infrastruktur, Code, Sicherheit und Tooling. Schlage ein Tool vor oder warne vor operativen Engpässen bezüglich dieser Infos.";
  }

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: `${agentPersonaInstruction}
    
    WISSENSKARTE:
    Titel: ${cardTitle}
    Zusammenfassung: ${cardSummary}
    Projektrelevanz: ${projectRelevance}
    
    Verfasse einen prägnanten Kommentar (maximal 2-3 Sätze) auf Deutsch, die den Mehrwert aus deiner fachlichen Perspektive hervorhebt. Antworte nur als deine Persona.`,
  });

  return response.text?.trim() || "";
};

export interface InboxQueryResponse {
  answer: string;
  relevantCardIds: string[];
}

export const queryInboxWithQuestion = async (
  question: string,
  cards: any[]
): Promise<InboxQueryResponse> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.API_KEY });
  
  const cardsSummaryText = cards.map(c => 
    `ID: ${c.id}\nTitel: ${c.title}\nTyp: ${c.sourceType}\nZusammenfassung: ${c.summary}\nProjektrelevanz: ${c.projectRelevance || ''}\nNächste Schritte: ${(c.nextActions || []).join(', ')}\nTags: ${(c.tags || []).join(', ')}\n`
  ).join("\n---\n");

  const prompt = `Du bist der künstliche Intelligenz-Analyst für unser Startup. Wir haben ein Set von erfassten Wissenskarten (Recall Cards) in unserem Posteingang.
  Der Nutzer stellt folgende Frage zu den gesammelten Wissenskarten:
  "${question}"
  
  Hier ist der gesamte Inhalt aller Wissenskarten in der Datenbank:
  ${cardsSummaryText || "Derzeit sind keine Karten in der Wissensdatenbank erfasst."}
  
  Aufgabe:
  1. Beantworte die Frage "${question}" präzise, professionell, klar strukturiert und auf Deutsch basierend auf den vorhandenen Karten oder weise darauf hin, welche Karten thematisch passen. Wenn keine passenden Karten da sind, erkläre das kurz auf freundliche Weise.
  2. Identifiziere die IDs (aus der Liste oben) derjenigen Karten, die am stärksten zu dem Thema oder der Frage beitragen. Gib ein Array dieser relevanten Karten-IDs zurück (relevantCardIds).
  
  Bitte generiere die Antwort im exakten JSON-Format gemäss Schema.`;

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          answer: { type: Type.STRING },
          relevantCardIds: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["answer", "relevantCardIds"]
      }
    }
  });

  return JSON.parse(response.text) as InboxQueryResponse;
};

