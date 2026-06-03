import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Sparkles, 
  X, 
  Trash2, 
  Plus, 
  Loader2, 
  ChevronRight, 
  ChevronLeft, 
  BookOpen, 
  Award, 
  PenTool, 
  HelpCircle, 
  Send, 
  Check, 
  Edit3, 
  Layers, 
  Settings, 
  FileText, 
  BarChart2, 
  CheckCircle2, 
  ListChecks, 
  TrendingUp, 
  Eye, 
  Save, 
  RefreshCcw, 
  Sliders,
  Flame,
  UserCheck
} from 'lucide-react';
import { useFirebase } from './FirebaseContext';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
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
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';

export interface InfographicSlide {
  id: string;
  title: string;
  subtitle: string;
  type: 'Venn' | 'Pyramid' | 'Funnel' | 'Timeline' | 'Grid' | 'Vorschau';
  labels: string[]; // up to 4 key terms
  bullets: string[]; // key highlight points
}

export interface CreativeLiveSession {
  id: string;
  title: string;
  topic: string;
  bulletsText: string;
  exerciseTitle: string;
  exerciseText: string;
  duration: number; // minutes
  prepText: string;
  participantsCount: number;
  difficultyScore: number; // 10 to 100
  satisfactionRate: number; // 50 to 100
  avgCompletionRate: number; // 50 to 100
  slides: InfographicSlide[];
}

interface CreativeAgentViewProps {
  onBack: () => void;
}

const DEFAULT_SESSIONS: CreativeLiveSession[] = [
  {
    id: 'session_1',
    title: '1. Kick-Off & Visionär-Mindset',
    topic: 'Willkommensrunde, Grundlagen des High-Performance-Coaching & Abbau mentaler Blockaden.',
    bulletsText: '• Begrüßung der Kohorte & Tech-Setup Check\n• Die psychologischen Säulen des Coachings begründen\n• Vision Board Methode vorstellen\n• Q&A & Commitments vereinbaren',
    exerciseTitle: 'Die 24-Stunden-Zukunftsvision',
    exerciseText: 'Schreibe einen detaillierten Brief aus der Perspektive deines weisesten, erfolgreichsten Selbste in genau 12 Monaten. Beschreibe exakt deinen Tagesablauf, deine Umsätze, deinen mentalen Zustand und die Lebensqualität deiner Klienten. Keine Bescheidenheit erlaubt – male das Bild so lebendig wie möglich auf min. 1 A4 Seite.',
    duration: 60,
    prepText: 'Fülle das Arbeitsblatt "Visions-Rohling" vor dem Call aus.',
    participantsCount: 45,
    difficultyScore: 30,
    satisfactionRate: 98,
    avgCompletionRate: 92,
    slides: [
      {
        id: 's1_1',
        title: 'Die Mindset-Pyramide',
        subtitle: 'Drei fundamentale Ebenen des unternehmerischen Wachstums',
        type: 'Pyramid',
        labels: ['VISION (Umsatz & Purpose)', 'STRATEGIE (Fokus-Prozesse)', 'IDENTITÄT (Werte & Glaube)'],
        bullets: ['Werte steuern Taten', 'Prozessfokus schlägt reine Motivation', 'Umsatz folgt gelösten Problemen']
      },
      {
        id: 's1_2',
        title: 'Dein Onboarding Roadmap',
        subtitle: 'Schritt-für-Schritt in deine transformative Coaching-Woche',
        type: 'Timeline',
        labels: ['Start & Setup', 'Visions-Letter', 'Markt-Klarheit', 'Erste Angebote'],
        bullets: ['Erledige Tech-Checks am Tag 1', 'Schreibe den Brief bis Tag 3', 'Analysiere Mitbewerber bis Tag 5']
      }
    ]
  },
  {
    id: 'session_2',
    title: '2. Nischen-Findung & Marktküche',
    topic: 'Identifizierung der perfekten Coach-Nische durch Prüfung von Nachfrage, Leidenschaft und Machbarkeit.',
    bulletsText: '• Schmerzpunkte des Traumkunden analysieren\n• Wettbewerbsradar aufbauen & Nischenlöcher finden\n• Formulierung des 1-Satz-Wertversprechens\n• Validierungs-Prozess für die Nische',
    exerciseTitle: 'Der Traumkunde-Empathie-Map',
    exerciseText: 'Finde eine echte Person in deiner Zielguppe (Social Media, Bekannte) und analysiere sie: Was hört sie im Alltag? Was sagt sie wirklich? Was sind ihre schlaflosen Nächte (Ängste)? Schreibe einen fiktiven Dialog auf, wie sie ihr Problem einem guten Freund beschreibt.',
    duration: 75,
    prepText: 'Suche 3 Konkurrenzprofile auf Instagram oder LinkedIn.',
    participantsCount: 42,
    difficultyScore: 55,
    satisfactionRate: 94,
    avgCompletionRate: 85,
    slides: [
      {
        id: 's2_1',
        title: 'Die Nischen-Schnittmenge',
        subtitle: 'Finde das Zentrum deiner Markt-Kraft',
        type: 'Venn',
        labels: ['Deine Leidenschaft', 'Zahlungskräftiger Markt', 'Deine Kernkompetenz'],
        bullets: ['Schnittmenge aus Freude und Profit', 'Vergiss gesättigte Standard-Angebote', 'Fokussiere auf konkrete ROI-Probleme']
      }
    ]
  },
  {
    id: 'session_3',
    title: '3. Angebot & Preisfindung (High-Ticket)',
    topic: 'Entwicklung eines unwiderstehlichen Coaching-Programms mit Premium-Bepreisung.',
    bulletsText: '• Transformation statt Zeit verkaufen\n• Beta-Programm richtig strukturieren\n• Die 3-Säulen-Methodik für dein High-Ticket Angebot\n• Preis-Psychologie verankern',
    exerciseTitle: 'Der Transformations-Architekt',
    exerciseText: 'Erstelle den Meilensteinplan für dein 8-Wochen-Programm. Definiere für jeden Meilenstein: 1. Was ist das konkrete messbare Ergebnis nach dieser Woche? 2. Welche 3 Aufgaben muss der Teilnehmer dafür lösen? Verbanne jeglichen theoretischen Ballast und fokussiere ausschließlich auf handlungsrelevante Hebel.',
    duration: 90,
    prepText: 'Entscheide dich für ein vorläufiges Preismodell (z.B. 1.500€ oder 3.000€).',
    participantsCount: 40,
    difficultyScore: 70,
    satisfactionRate: 96,
    avgCompletionRate: 78,
    slides: [
      {
        id: 's3_1',
        title: 'Wert-vs-Preis Skalierung',
        subtitle: 'Warum High-Ticket Angebote für deine Klienten besser konvertieren',
        type: 'Funnel',
        labels: ['Hoher Preis = Hohes Commitment', 'Premium-Betreuung sichert Resultate', 'Rasche Umsetzung durch Fokus', 'Maximale Kundenzufriedenheit'],
        bullets: ['Niedrigpreis-Kunden setzen seltener um', 'Premium-Preise geben dir Luft für 1:1 Support', 'Klienten zahlen für das Endresultat, nicht Stunden']
      }
    ]
  },
  {
    id: 'session_4',
    title: '4. Content-Motor & Reichweiten-Säulen',
    topic: 'Erstellung einer organischen Content-Pipeline für stetigen Zustrom von warmen Leads.',
    bulletsText: '• Die Content-Recycling Pyramide nutzen\n• Hooks formulieren die Scrollen stoppen\n• Skripte für Short-Form Videos (Reels, TikTok)\n• Content-Kalender mit minimaler Zeitschlaufe',
    exerciseTitle: 'Der 3-Sekunden-Hook Generator',
    exerciseText: 'Schreibe für deine Nische genau 10 verschiedene Video-Aufhänger (Hooks) auf. Nutze unterschiedliche psychologische Trigger: 1. Angst vor Verlust, 2. Überraschende Wahrheit, 3. Schritt-für-Schritt Anleitung, 4. Das Geheimnis, das niemand verrät. Finde prägnante Worte.',
    duration: 75,
    prepText: 'Notiere dir die 5 nützlichsten Erkenntnisse der letzten Woche.',
    participantsCount: 38,
    difficultyScore: 45,
    satisfactionRate: 95,
    avgCompletionRate: 88,
    slides: [
      {
        id: 's4_1',
        title: 'Die Content-Bento-Matrix',
        subtitle: 'Vier Säulen deiner Content-Distribution',
        type: 'Grid',
        labels: ['REICHWEITE (Hype & Trends)', 'EXPERTENSTATUS (Fallstudien)', 'VERTRAUEN (Story & Werte)', 'KONVERSION (Direkter Call to Action)'],
        bullets: ['Mix aus Emotionalität & Information', 'Wöchentlich mindestens eine Conversion-Slide', 'Video-Hooks erzeugen Aufmerksamkeit']
      }
    ]
  },
  {
    id: 'session_5',
    title: '5. Die organische Lead-Maschine',
    topic: 'Wie du im direkten Chat-Kontakt (Instagram, LinkedIn) vertrauen aufbaust und Calls buchst.',
    bulletsText: '• Der "Nicht-Spammige" Chatleitfaden\n• Glaubwürdigen Smalltalk initiieren\n• Probleme im Chat diagnostizieren\n• Den eleganten Schwenk zum Telefonat meistern',
    exerciseTitle: 'Der Chat-Rollenspiel-Simulator',
    exerciseText: 'Nimm einen fiktiven Chatverlauf mit einem idealen Kunden. Schreibe 5 typische Antworten des Gegenübers auf (z.B. "Ich mache das meiste selbst", "Gerade keine Zeit"). Formuliere hierauf empathische, neugierige Gegenfragen, die das Interesse wecken, ohne aufdringlich zu wirken.',
    duration: 90,
    prepText: 'Finde 10 potenzielle Lead-Profile in deiner Nische im Web.',
    participantsCount: 37,
    difficultyScore: 65,
    satisfactionRate: 91,
    avgCompletionRate: 80,
    slides: [
      {
        id: 's5_1',
        title: 'Die Lead-to-Call Timeline',
        subtitle: 'Reise eines kalten Kontakts zum qualifizierten Strategiegespräch',
        type: 'Timeline',
        labels: ['Erster Kontakt', 'Werthaltige DM', 'Problem-Diagnose', 'Call-Buchung'],
        bullets: ['Fokus auf Hilfe, nicht Verkauf im Chat', 'Kein Pitch vor Qualifizierung des Interesses', 'Nutzungszeit sinnvoll begrenzen']
      }
    ]
  },
  {
    id: 'session_6',
    title: '6. Einwandbehandlung & Closing',
    topic: 'Verkaufsgespräche souverän strukturieren, Einwände entkräften und den Vertrag abschließen.',
    bulletsText: '• Das 45-Minuten-Verkaufsgespräch Skript\n• Einwand vs. Vorwand unterscheiden\n• Die "Ich habe kein Geld" Formel neutralisieren\n• Framing auf Augenhöhe statt Verkäufer-Gehabe',
    exerciseTitle: 'Der Einwand-Reframer',
    exerciseText: 'Übe das Reframing der drei härtesten Einwände: 1. "Ich muss das mit meinem Partner besprechen." 2. "Deine Lösung ist mir zu teuer." 3. "Ich bin mir nicht sicher, ob ich das schaffe." Schreibe jeweils 3 Antwortstrategien auf, die Verständnis zeigen und den Fokus zurück auf das Problem lenken.',
    duration: 90,
    prepText: 'Lies das Skript "Souveränes Closing v1" durch.',
    participantsCount: 36,
    difficultyScore: 80,
    satisfactionRate: 93,
    avgCompletionRate: 74,
    slides: [
      {
        id: 's6_1',
        title: 'Der Einwand-Kompass',
        subtitle: 'Häufige Hürden im Gespräch elegant umschiffen',
        type: 'Grid',
        labels: ['PREIS (Liegt am Wert-Verständnis)', 'ZEIT (Priorisierung problematisieren)', 'PARTNER (Gemeinsame Vision erfragen)', 'ZWEIFEL (Selbstvertrauen stärken)'],
        bullets: ['Verständnis zeigen vor Gegenfrage', 'Einwand ist Kaufsignal für Klärung', 'Klarheit im Angebot beugt Frust vor']
      }
    ]
  },
  {
    id: 'session_7',
    title: '7. Kundenerfolg & Fulfillment',
    topic: 'Herausragendes Onboarding und Begleitung deiner Coaching-Klienten für maximalen Erfolg und Testimonials.',
    bulletsText: '• Die ersten 24 Stunden Onboarding-Protokoll\n• Aufbau einer wertvollen Community-Plattform\n• Systematische Check-ins gegen Abbrüche\n• Sammeln von Case-Studies auf Autopilot',
    exerciseTitle: 'Das Kundenüberraschungs-Protokoll',
    exerciseText: 'Entwirf ein Überraschungs-Moment für deine Klienten direkt nach Buchung. Was können sie innerhalb von 15 Minuten per Mail oder WhatsApp bekommen (z.B. ein schnelles Video, Willkommensgeschenk, oder Quick-Start Guide), was ihre Erwartungen massiv übertrifft?',
    duration: 60,
    prepText: 'Erstelle eine Liste der 5 häufigsten Ängste eines Neukunden.',
    participantsCount: 35,
    difficultyScore: 40,
    satisfactionRate: 99,
    avgCompletionRate: 95,
    slides: [
      {
        id: 's7_1',
        title: 'Onboarding Customer Journey',
        subtitle: 'Die kritische Phase des neuen Kundenbeziehungs-Aufbaus',
        type: 'Timeline',
        labels: ['Vertrag & Payment', 'Willkommens-Video', 'Erstgespräch', 'Erster Quick-Win'],
        bullets: ['Verhindere Kaufreue durch schnellen Kontakt', 'Erzeuge klare Erfolgsmomente (Quick-Wins)', 'Kombiniere Automatisierung und persönliche Note']
      }
    ]
  },
  {
    id: 'session_8',
    title: '8. Ads-Grundlagen & Skalierung',
    topic: 'Einstieg in Paid Traffic (Meta, Google) um die organische Leadgenerierung zu multiplizieren.',
    bulletsText: '• Wann ist dein Business bereit für Werbebudget?\n• Die Anatomie eines wirksamen Facebook-Ad Creatives\n• Kampagnen-Struktur für Einsteiger (CBO vs ABO)\n• Retargeting-Geheimnisse',
    exerciseTitle: 'Das Ad-Creative Storyboard',
    exerciseText: 'Konzipiere das Skript für eine 60-Sekunden Handykamera-Werbeanzeige. Verwende den Aufbau: 1. Hook (Sek 0-3), 2. Story / Schmerzpunkt (Sek 4-20), 3. Lösung/Mehrwert (Sek 21-45), 4. Action-Call mit klarem Ziel (Sek 46-60). Drücke dich echt, nahbar und ungestellt aus.',
    duration: 75,
    prepText: 'Bestimme dein maximales monatliches Werbebudget (Testbudget ab 300€).',
    participantsCount: 32,
    difficultyScore: 75,
    satisfactionRate: 90,
    avgCompletionRate: 70,
    slides: [
      {
        id: 's8_1',
        title: 'Der Paid Conversion Trichter',
        subtitle: 'Vom unbekannten Betrachter zum gebuchten Systemklienten',
        type: 'Funnel',
        labels: ['TOFU (Breite Ad-Aufmerksamkeit)', 'MOFU (Hilfreicher Freebie-Magnet)', 'BOFU (Überzeugendes Webinar/VSL)', 'CALL (Biete persönliches Gespräch)'],
        bullets: ['Vermeide direktes Verkaufen auf kalten Traffic', 'Nutze emotionale Hebel im Video', 'Konsequentes Retargeting schont das Budget']
      }
    ]
  },
  {
    id: 'session_9',
    title: '9. Systeme & Tech-Automatisierung',
    topic: 'Wie du dein Coaching-Business digitalisierst, um Zeit zurückzugewinnen und stressfrei zu agieren.',
    bulletsText: '• Zapier-Workflows für Lead-Verwaltung\n• Calendly & Zoom Verknüpfung automatisieren\n• E-Mail-Marketing Automationen für Lead-Nurturing\n• Dashboardverwaltung der Klienten',
    exerciseTitle: 'Der Automatisierungs-Bauplan',
    exerciseText: 'Zeichne auf einem Blatt Papier den Datenfluss eines Kunden auf, sobald er ein Strategiegespräch bucht. Welche Systeme müssen miteinander reden? (z.B. Calendly -> Google Sheets -> E-Mail Programm -> Slack Notification). Trage für jeden Schritt den Zweck der Nachricht ein.',
    duration: 60,
    prepText: 'Schreibe alle Tools auf, für die du aktuell Geld ausgibst oder einsetzt.',
    participantsCount: 31,
    difficultyScore: 60,
    satisfactionRate: 96,
    avgCompletionRate: 84,
    slides: [
      {
        id: 's9_1',
        title: 'Die Coaching-Tech Matrix',
        subtitle: 'Effizientes Werkzeug-Netzwerk für reibungslose Abläufe',
        type: 'Grid',
        labels: ['BOOKING (Calendly/TidyCal)', 'MEETINGS (Zoom/Teams)', 'CRM (Sheets/Notion/HubSpot)', 'COMMUNICATION (ActiveCampaign)'],
        bullets: ['Minimiere manuelle Klicks', 'Fokus liegt auf der Betreuung, nicht der Technik', 'Synchronisiere Kundendaten lückenlos']
      }
    ]
  },
  {
    id: 'session_10',
    title: '10. Skalierungs-Fahrplan & Testimonials',
    topic: 'Sichern der Kohorten-Erfolge, Einsammeln von Feedback & Planung der nächsten Wachstumsstufe.',
    bulletsText: '• Video-Testimonials mit präzisen Fragen lenken\n• Das Folge-Programm (Mastermind/Retainer) pitchen\n• Kundengewinnung durch Empfehlungsmarketing\n• Dein Fahrplan für die nächsten 100.000€ Jahresumsatz',
    exerciseTitle: 'Die Testimonial-Interviewfragen',
    exerciseText: 'Verfasse eine Nachricht an deine 3 erfolgreichsten Teilnehmer. Nutze die bewährte 5-Fragen-Formel: 1. Wo standest du vor unserem Programm? 2. Was war deine größte Hürde? 3. Was hat sich durch das Programm verändert? 4. Was war dein Lieblingsmoment? 5. Wem würdest du das Programm empfehlen?',
    duration: 90,
    prepText: 'Entwerfe ein kurzes Outline für dein Folge-Angebot.',
    participantsCount: 30,
    difficultyScore: 50,
    satisfactionRate: 99,
    avgCompletionRate: 94,
    slides: [
      {
        id: 's10_1',
        title: 'Der Spiraleffekt der Skalierung',
        subtitle: 'Wie zufriedene Klienten dein organisches Wachstum multiplizieren',
        type: 'Venn',
        labels: ['Exzellentes Fulfillment', 'Herausragende Case-Studies', 'Vereinfachter Neukundenzustrom'],
        bullets: ['Ergebnisberichte ziehen Wunschkunden an', 'Empfehlungen konvertieren fast von selbst', 'Das Fundament ist immer die echte Transformation']
      }
    ]
  }
];

export const CreativeAgentView: React.FC<CreativeAgentViewProps> = ({ onBack }) => {
  const { user } = useFirebase();
  const [sessions, setSessions] = useState<CreativeLiveSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('session_1');
  const [activeTab, setActiveTab] = useState<'SLIDES' | 'EXERCISE' | 'NOTES' | 'STATS'>('SLIDES');
  
  // Interactive slide selection inside selected session
  const [activeSlideIdx, setActiveSlideIdx] = useState<number>(0);
  
  // States representing pending changes
  const [isModified, setIsModified] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAILoading, setIsAILoading] = useState(false);
  const [aiInstruction, setAiInstruction] = useState('');
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');

  // Loaded state or feedback toasts
  const [saveStatusText, setSaveStatusText] = useState<string | null>(null);

  // Load from Firestore
  useEffect(() => {
    if (!user) {
      setSessions(DEFAULT_SESSIONS);
      return;
    }

    const docRef = doc(db, 'whiteboard_config', 'creative_agent_sessions');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        try {
          const data = docSnap.data();
          const parsed = JSON.parse(data.text || '[]');
          if (Array.isArray(parsed) && parsed.length > 0) {
            setSessions(parsed);
          } else {
            setSessions(DEFAULT_SESSIONS);
          }
        } catch (e) {
          console.error("Failed to parse creative sessions", e);
          setSessions(DEFAULT_SESSIONS);
        }
      } else {
        // First-time seed into database
        setSessions(DEFAULT_SESSIONS);
        setDoc(docRef, {
          text: JSON.stringify(DEFAULT_SESSIONS),
          updatedAt: serverTimestamp(),
          lastUpdatedBy: user.email || ""
        }).catch(err => console.error("Error seeding creative sessions", err));
      }
    });

    return unsubscribe;
  }, [user]);

  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0] || DEFAULT_SESSIONS[0];

  // Handler to update values in current session
  const updateActiveSession = (update: Partial<CreativeLiveSession>) => {
    setSessions(prev => prev.map(s => {
      if (s.id === activeSession.id) {
        return { ...s, ...update };
      }
      return s;
    }));
    setIsModified(true);
  };

  // Update specific slide content in active session
  const updateActiveSlide = (slideIdx: number, slideUpdate: Partial<InfographicSlide>) => {
    const updatedSlides = [...activeSession.slides];
    updatedSlides[slideIdx] = { ...updatedSlides[slideIdx], ...slideUpdate };
    updateActiveSession({ slides: updatedSlides });
  };

  // Add a new blank slide
  const handleAddSlide = () => {
    const newSlide: InfographicSlide = {
      id: `slide_${Math.random().toString(36).substring(2, 9)}`,
      title: 'Neues Slidesheet',
      subtitle: 'Beschreibung der Infografik-Säule',
      type: 'Venn',
      labels: ['Wert 1', 'Wert 2', 'Zielgruppe'],
      bullets: ['Kernpunkt 1', 'Kernpunkt 2']
    };
    const updatedSlides = [...activeSession.slides, newSlide];
    updateActiveSession({ slides: updatedSlides });
    setActiveSlideIdx(updatedSlides.length - 1);
  };

  // Delete current slide
  const handleDeleteSlide = (idxToDelete: number) => {
    if (activeSession.slides.length <= 1) return; // keep at least 1
    const updatedSlides = activeSession.slides.filter((_, idx) => idx !== idxToDelete);
    updateActiveSession({ slides: updatedSlides });
    setActiveSlideIdx(Math.max(0, idxToDelete - 1));
  };

  // Save changes to cloud
  const handleSaveToCloud = async () => {
    if (!user) {
      alert("Bitte logge dich ein, um Änderungen permanent in der Cloud zu speichern.");
      return;
    }
    setIsSaving(true);
    setSaveStatusText("Wird gespeichert...");
    try {
      const docRef = doc(db, 'whiteboard_config', 'creative_agent_sessions');
      await setDoc(docRef, {
        text: JSON.stringify(sessions),
        updatedAt: serverTimestamp(),
        lastUpdatedBy: user.email || ""
      });
      setIsModified(false);
      setSaveStatusText("Erfolgreich in Cloud gesichert!");
      setTimeout(() => setSaveStatusText(null), 3000);
    } catch (e) {
      console.error("Error saving creative sessions", e);
      setSaveStatusText("Fehler beim Speichern.");
    } finally {
      setIsSaving(false);
    }
  };

  // Re-seed original defaults
  const handleResetDefaults = () => {
    if (confirm("Möchtest du wirklich alle Lektionen auf die Werkseinstellungen (10 Live-Calls) zurücksetzen? Manuelle Änderungen gehen verloren.")) {
      setSessions(DEFAULT_SESSIONS);
      setIsModified(true);
    }
  };

  // Create a new session card workspace
  const handleCreateNewSession = () => {
    const callNum = sessions.length + 1;
    const newSess: CreativeLiveSession = {
      id: `session_${Math.random().toString(36).substring(2, 9)}`,
      title: `${callNum}. Live-Call: Individuelle Lektion`,
      topic: 'Beschreibung deiner persönlichen Coaching-Lektion hier einfügen...',
      bulletsText: '• Thema 1\n• Thema 2\n• Praktische Lektion',
      exerciseTitle: 'Übungsaufgabe für Teilnehmer',
      exerciseText: 'Beschreibe hier im Fließtext, welche konkreten Aufgaben deine Kursteilnehmer während oder nach diesem Call ausführen müssen für beste Resultate.',
      duration: 60,
      prepText: 'Hausaufgaben überprüfen',
      participantsCount: 20,
      difficultyScore: 50,
      satisfactionRate: 95,
      avgCompletionRate: 80,
      slides: [
        {
          id: `new_slide_${Math.random().toString(36).substring(2, 9)}`,
          title: 'Konzept-Infografik',
          subtitle: 'Visuelle Struktur der Lektion',
          type: 'Pyramid',
          labels: ['Spitze', 'Mitte', 'Basis'],
          bullets: ['Ändere diese Punkte im Editor']
        }
      ]
    };
    setSessions(prev => [...prev, newSess]);
    setActiveSessionId(newSess.id);
    setActiveSlideIdx(0);
    setIsModified(true);
  };

  // Delete Whole Session card
  const handleDeleteSession = (idToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (sessions.length <= 1) {
      alert("Mindestens eine Session muss im Plan verbleiben.");
      return;
    }
    if (confirm("Möchtest du diese Live-Session unwiderruflich löschen?")) {
      const remaining = sessions.filter(s => s.id !== idToDelete);
      setSessions(remaining);
      if (activeSessionId === idToDelete) {
        setActiveSessionId(remaining[0].id);
        setActiveSlideIdx(0);
      }
      setIsModified(true);
    }
  };

  // AI-powered exercise generator using Gemini
  const handleAIGenerateExercise = async () => {
    setIsAILoading(true);
    try {
      const apiKey = process.env.GEMINI_API_KEY || (window as any).process?.env?.GEMINI_API_KEY || "";
      const ai = new GoogleGenAI({ apiKey });
      
      const contentsMsg = `Du bist ein erstklassiger, hochbezahlter Business- und E-Learning Creator für Premium-Coachingprogramme.
      Der Nutzer möchte für seine Live-Session "${activeSession.title}" eine fesselnde, praxisorientierte und transformative Übung (Live-Übung) im Fließtext anlegen.
      
      Sitzungs-Inhalt & Thema: "${activeSession.topic}"
      Aktuelle Notizpunkte:
      "${activeSession.bulletsText}"
      
      ANWEISUNG:
      Schreibe eine vollständige, packende, motivierende und extrem detaillierte deutsche Anleitung (Fließtext) für diese Übungslektion.
      Die Übung muss einen klaren Namen, einen verständlichen psychologischen Zweck, schrittweise Handlungsanleitungen für die Teilnehmer und ein Praxisbeispiel enthalten.
      Drücke dich motivierend, professionell und transformativ aus (Premium-Coach-Vibe).`;

      const response = await ai.models.generateContent({
        model: "gemini-2.1-flash",
        contents: contentsMsg,
      });

      const textResult = response.text || "KI Fehler beim Erzeugen. Bitte versuche es erneut.";
      updateActiveSession({
        exerciseText: textResult
      });
    } catch (e) {
      console.error("AI exercise generation failure: ", e);
      // Fallback generator locally if key fails
      const localFallback = `**Detaillierte Live-Übung: ${activeSession.title}**\n\n1. **Zweck:** Verständnis absichern durch sofortigen Praxistransfer.\n2. **Schritt-für-Schritt Ablauf:**\n   - Nimm dir 15 Minuten Zeit am Schreibtisch.\n   - Visualisiere die primäre Hürde bezüglich "${activeSession.topic}".\n   - Formuliere 3 Lösungs-Checkpoints für dich selbst oder deine Teilnehmer.\n3. **Praxisbeispiel:** Übersetze die Inhalte dieser Stunde direkt in ein kurzes Memo und teile es mit einem Teampartner.`;
      updateActiveSession({
        exerciseText: localFallback
      });
      alert("Lokales Fallback verwendet. (Für Gemini AI ist ein gültiger Workspace-API-Key erforderlich).");
    } finally {
      setIsAILoading(false);
    }
  };

  // AI Outline generate using Gemini
  const handleAIGenerateOutline = async () => {
    setIsAILoading(true);
    try {
      const apiKey = process.env.GEMINI_API_KEY || (window as any).process?.env?.GEMINI_API_KEY || "";
      const ai = new GoogleGenAI({ apiKey });
      
      const contentsMsg = `Erstelle einen stichpunktartigen Gesprächsleitfaden (Outline/Agenda) für den Live-Call mit meinen Kursteilnehmern:
      Call-Titel: "${activeSession.title}"
      Fokus-Bereich: "${activeSession.topic}"
      Geplante Länge: ${activeSession.duration} Minuten.
      
      Gib mir eine strukturierte Zeiteinteilung (z.B. Min 0-10, Min 10-30 etc.) und klare Gesprächspunkte in stichpunktartiger Form für meine Coaching-Präsentation. Antworte auf Deutsch.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.1-flash",
        contents: contentsMsg,
      });

      const textResult = response.text || "KI Fehler bei Outline-Erstellung.";
      updateActiveSession({
        bulletsText: textResult
      });
    } catch (e) {
      console.error("AI outline failure:", e);
      const localFallback = `• Min 0-10: Ankommen, Einstimmung & Begrüßung der Teilnehmer\n• Min 10-35: Kernvortrag über "${activeSession.topic}"\n• Min 35-60: Live-Praxisübung im Breakout-Room\n• Min 60-${activeSession.duration}: Feedback-Schleife, Q&A & Ausblick`;
      updateActiveSession({
        bulletsText: localFallback
      });
      alert("Lokales Outline-Fallback geladen.");
    } finally {
      setIsAILoading(false);
    }
  };

  // AI refine slide labels
  const handleAIRefineSlide = async () => {
    if (activeSession.slides.length === 0) return;
    setIsAILoading(true);
    try {
      const apiKey = process.env.GEMINI_API_KEY || (window as any).process?.env?.GEMINI_API_KEY || "";
      const ai = new GoogleGenAI({ apiKey });
      const currentSlide = activeSession.slides[activeSlideIdx];
      
      const contentsMsg = `Verbessere und verfeinere die Folientext-Inhalte für diese Infografik-Folie des Typs "${currentSlide.type}".
      Aktueller Folientitel: "${currentSlide.title}"
      Aktueller Subtitel: "${currentSlide.subtitle}"
      Aktuelle Diagramm-Labels: ${JSON.stringify(currentSlide.labels)}
      Aktuelle Bulletpoints: ${JSON.stringify(currentSlide.bullets)}
      
      Erstelle einen verbesserten, professionelleren Folientitel, einen packenderen Subtitel, genau 3-4 kurze, prägnante Stichwörter für das Diagramm-Label (max. 3 Worte pro Label) und 3 knackige Bulletpoints für den Begleittext.
      Antworte im JSON-Format gemäß folgendem Schema:
      {
        "title": "...",
        "subtitle": "...",
        "labels": ["Label1", "Label2", "Label3"],
        "bullets": ["Bullet1", "Bullet2", "Bullet3"]
      }`;

      const response = await ai.models.generateContent({
        model: "gemini-2.1-flash",
        contents: contentsMsg,
        config: { responseMimeType: "application/json" }
      });

      const parsed = JSON.parse(response.text || "{}");
      if (parsed.title) {
        updateActiveSlide(activeSlideIdx, {
          title: parsed.title,
          subtitle: parsed.subtitle || '',
          labels: parsed.labels || currentSlide.labels,
          bullets: parsed.bullets || currentSlide.bullets
        });
      }
    } catch (e) {
      console.error("Advisory AI refine failed, applying stylistic polish:", e);
      // local refinement
      const currentSlide = activeSession.slides[activeSlideIdx];
      updateActiveSlide(activeSlideIdx, {
        title: `✨ Fokus: ${currentSlide.title}`,
        subtitle: `${currentSlide.subtitle} (Überarbeitet für maximale Klarheit)`,
      });
    } finally {
      setIsAILoading(false);
    }
  };

  // Filtered session list
  const filteredSessions = sessions.filter(s => 
    s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.topic.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Stats graphics configuration
  // Line chart: Student attention over time
  const attentionData = [
    { name: '0 min', 'Aufmerksamkeit': 100, 'Mitarbeit': 60 },
    { name: '15 min', 'Aufmerksamkeit': 88, 'Mitarbeit': 75 },
    { name: '30 min', 'Aufmerksamkeit': 70 - activeSession.difficultyScore * 0.2, 'Mitarbeit': 80 + (activeSession.satisfactionRate - 90) * 0.5 },
    { name: '45 min', 'Aufmerksamkeit': 60, 'Mitarbeit': 95 },
    { name: '60 min', 'Aufmerksamkeit': 80 + (100 - activeSession.difficultyScore) * 0.1, 'Mitarbeit': 70 },
    { name: '75 min', 'Aufmerksamkeit': 85, 'Mitarbeit': 65 },
    { name: '90 min', 'Aufmerksamkeit': 95, 'Mitarbeit': 90 },
  ];

  // Radar chart data based on session properties
  const radarData = [
    { subject: 'Verständnis', A: activeSession.satisfactionRate, B: 100 - activeSession.difficultyScore * 0.5, fullMark: 100 },
    { subject: 'Interaktion', A: activeSession.avgCompletionRate, B: 85, fullMark: 100 },
    { subject: 'Schwierigkeit', A: activeSession.difficultyScore, B: 50, fullMark: 100 },
    { subject: 'Sinnhaftigkeit', A: Math.max(90, activeSession.satisfactionRate - 2), B: 90, fullMark: 100 },
    { subject: 'Vorbereitung', A: 96 - activeSession.difficultyScore * 0.4, B: 80, fullMark: 100 },
  ];

  // Renders the stylized infographic SVG depending on type
  const renderSVGInfographic = () => {
    if (activeSession.slides.length === 0) return null;
    const slide = activeSession.slides[activeSlideIdx] || activeSession.slides[0];
    const labels = slide.labels || [];

    switch (slide.type) {
      case 'Pyramid':
        return (
          <svg viewBox="0 0 400 320" className="w-full h-full max-h-[280px]">
            <defs>
              <linearGradient id="pyr-g1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#c084fc" />
                <stop offset="100%" stopColor="#818cf8" />
              </linearGradient>
              <linearGradient id="pyr-g2" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#a78bfa" />
                <stop offset="100%" stopColor="#6366f1" />
              </linearGradient>
              <linearGradient id="pyr-g3" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#818cf8" />
                <stop offset="100%" stopColor="#4f46e5" />
              </linearGradient>
              <linearGradient id="pyr-g4" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#3730a3" />
              </linearGradient>
              <filter id="glow" x="-10%" y="-10%" width="120%" height="120%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Layer 1 (Top) */}
            <polygon 
              points="200,20 150,90 250,90" 
              fill="url(#pyr-g1)" 
              className="transition-transform duration-300 hover:scale-[1.03] origin-center cursor-pointer"
              filter="url(#glow)"
              opacity="0.95"
            />
            <text x="200" y="70" fill="white" fontSize="10" fontWeight="bold" textAnchor="middle" className="pointer-events-none drop-shadow">
              {labels[0] || 'STUFE 1'}
            </text>

            {/* Layer 2 */}
            <polygon 
              points="145,98 255,98 275,160 125,160" 
              fill="url(#pyr-g2)" 
              className="transition-transform duration-300 hover:scale-[1.03] origin-center cursor-pointer"
              opacity="0.95"
            />
            <text x="200" y="135" fill="white" fontSize="11" fontWeight="bold" textAnchor="middle" className="pointer-events-none drop-shadow">
              {labels[1] || 'STUFE 2'}
            </text>

            {/* Layer 3 */}
            <polygon 
              points="120,168 280,168 300,230 100,230" 
              fill="url(#pyr-g3)" 
              className="transition-transform duration-300 hover:scale-[1.03] origin-center cursor-pointer"
              opacity="0.95"
            />
            <text x="200" y="205" fill="white" fontSize="11" fontWeight="bold" textAnchor="middle" className="pointer-events-none drop-shadow">
              {labels[2] || 'STUFE 3'}
            </text>

            {/* Layer 4 (Bottom - Optional) */}
            <polygon 
              points="95,238 305,238 325,300 75,300" 
              fill="url(#pyr-g4)" 
              className="transition-transform duration-300 hover:scale-[1.03] origin-center cursor-pointer"
              opacity="0.9"
            />
            <text x="200" y="275" fill="white" fontSize="11" fontWeight="bold" textAnchor="middle" className="pointer-events-none drop-shadow">
              {labels[3] || 'FUNDAMENT'}
            </text>
          </svg>
        );

      case 'Venn':
        return (
          <svg viewBox="0 0 400 320" className="w-full h-full max-h-[280px]">
            <defs>
              <filter id="glow-venn" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="8" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            {/* Circle Left */}
            <circle 
              cx="160" cy="130" r="85" 
              fill="#fb7185" fillOpacity="0.4"
              stroke="#fb2c4e" strokeWidth="2.5"
              className="transition-all duration-300 hover:fill-opacity-50 cursor-pointer"
            />
            {/* Circle Right */}
            <circle 
              cx="240" cy="130" r="85" 
              fill="#60a5fa" fillOpacity="0.4"
              stroke="#2563eb" strokeWidth="2.5"
              className="transition-all duration-300 hover:fill-opacity-50 cursor-pointer"
            />
            {/* Circle Bottom */}
            <circle 
              cx="200" cy="200" r="85" 
              fill="#34d399" fillOpacity="0.4"
              stroke="#059669" strokeWidth="2.5"
              className="transition-all duration-300 hover:fill-opacity-50 cursor-pointer"
            />

            {/* Overlap center Sweetspot indicator */}
            <circle cx="200" cy="155" r="14" fill="#fbcfe8" filter="url(#glow-venn)" opacity="0.8" />
            <text x="200" y="159" fill="#1e1b4b" fontSize="9" fontWeight="extrabold" textAnchor="middle" className="animate-pulse">
              SWEET
            </text>

            {/* Text Overlay labels */}
            <text x="110" y="100" fill="white" fontSize="10" fontWeight="black" textAnchor="middle" className="drop-shadow-md">
              {labels[0] || 'A'}
            </text>
            <text x="290" y="100" fill="white" fontSize="10" fontWeight="black" textAnchor="middle" className="drop-shadow-md">
              {labels[1] || 'B'}
            </text>
            <text x="200" y="275" fill="white" fontSize="10" fontWeight="black" textAnchor="middle" className="drop-shadow-md">
              {labels[2] || 'C'}
            </text>
          </svg>
        );

      case 'Funnel':
        return (
          <svg viewBox="0 0 400 320" className="w-full h-full max-h-[280px]">
            <defs>
              <linearGradient id="fun-g1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ec4899" />
                <stop offset="100%" stopColor="#d946ef" />
              </linearGradient>
              <linearGradient id="fun-g2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#6366f1" />
              </linearGradient>
              <linearGradient id="fun-g3" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
              <linearGradient id="fun-g4" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>
            </defs>

            {/* Stage 1 */}
            <polygon points="50,20 350,20 310,80 90,80" fill="url(#fun-g1)" opacity="0.85" className="hover:opacity-100 transition-opacity cursor-pointer" />
            <text x="200" y="52" fill="white" fontSize="11" fontWeight="bold" textAnchor="middle">
              {labels[0] || 'TRAFFIC'}
            </text>

            {/* Stage 2 */}
            <polygon points="94,88 306,88 270,150 130,150" fill="url(#fun-g2)" opacity="0.85" className="hover:opacity-100 transition-opacity cursor-pointer" />
            <text x="200" y="123" fill="white" fontSize="11" fontWeight="bold" textAnchor="middle">
              {labels[1] || 'LEAD MAGNET'}
            </text>

            {/* Stage 3 */}
            <polygon points="134,158 266,158 230,220 170,220" fill="url(#fun-g3)" opacity="0.85" className="hover:opacity-100 transition-opacity cursor-pointer" />
            <text x="200" y="193" fill="white" fontSize="10" fontWeight="bold" textAnchor="middle">
              {labels[2] || 'CONVERSION'}
            </text>

            {/* Stage 4 */}
            <polygon points="174,228 226,228 210,290 190,290" fill="url(#fun-g4)" opacity="0.85" className="hover:opacity-100 transition-opacity cursor-pointer" />
            <text x="200" y="265" fill="white" fontSize="10" fontWeight="bold" textAnchor="middle">
              {labels[3] || 'SALE'}
            </text>
          </svg>
        );

      case 'Timeline':
        return (
          <div className="flex flex-col justify-center items-center h-full w-full min-h-[220px] p-6 bg-slate-950/40 rounded-2xl border border-white/5 relative">
            <div className="absolute left-10 right-10 height-[3px] bg-indigo-500/20 top-[45%] z-0" style={{ height: '3px' }} />
            
            <div className="grid grid-cols-4 w-full z-10 gap-2">
              {labels.slice(0, 4).map((label, idx) => (
                <div key={idx} className="flex flex-col items-center text-center">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white border-2 border-slate-900 font-bold text-xs shadow-lg hover:scale-110 transition-transform cursor-pointer">
                    {idx + 1}
                  </div>
                  <span className="text-[11px] font-sans font-black text-slate-100 mt-3 block truncate max-w-[90px]" title={label}>
                    {label}
                  </span>
                  <span className="text-[9px] font-mono text-indigo-400 mt-1 uppercase">Phase 0{idx+1}</span>
                </div>
              ))}
            </div>
          </div>
        );

      case 'Grid':
        return (
          <div className="grid grid-cols-2 gap-3 p-2 h-full min-h-[230px]">
            {labels.slice(0, 4).map((label, idx) => {
              const colors = [
                'border-purple-500/30 bg-purple-500/5 hover:bg-purple-500/10 text-purple-200',
                'border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10 text-blue-200',
                'border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-200',
                'border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 text-amber-200'
              ];
              return (
                <div 
                  key={idx} 
                  className={`border p-4 rounded-xl flex flex-col justify-between transition-all duration-300 relative overflow-hidden ${colors[idx] || colors[0]}`}
                >
                  <span className="text-[8px] font-mono opacity-50 block mb-1">QUADRANT 0{idx+1}</span>
                  <span className="text-xs font-black tracking-tight leading-relaxed">{label}</span>
                  <div className="h-1 w-8 bg-current mt-3 opacity-60 rounded-full" />
                </div>
              );
            })}
          </div>
        );

      case 'Vorschau':
      default:
        return (
          <div className="h-full min-h-[230px] flex flex-col justify-center p-6 bg-gradient-to-br from-indigo-950/40 to-slate-900 border border-white/5 rounded-2xl relative overflow-hidden">
            <div className="absolute top-2 right-2 flex gap-1">
              <span className="w-2 h-2 rounded-full bg-red-400" />
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            </div>
            <span className="text-[9px] font-mono text-[#ff9b5a] uppercase tracking-widest block mb-1">
              {slide.subtitle || 'PRÄSENTATIONS-PREVIEW'}
            </span>
            <h4 className="text-xl font-extrabold text-white tracking-tight leading-tight">
              {slide.title || 'Welcome Slide'}
            </h4>
            
            <div className="border-t border-white/5 my-4" />
            
            <ul className="space-y-1.5">
              {(slide.bullets || []).map((b, i) => (
                <li key={i} className="text-xs text-slate-400 flex items-start gap-2">
                  <span className="text-indigo-400 font-bold mt-1.5 font-mono text-[8px]">•</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
        );
    }
  };

  return (
    <div id="creative-agent-root" className="flex flex-col lg:flex-row h-[76vh] gap-6 text-slate-200 font-sans select-none overflow-hidden relative">
      
      {/* 1. LEFT PANEL: Interactive list of calls & search */}
      <div className="w-full lg:w-[320px] bg-black/40 border border-[#3a3f4b]/20 rounded-2xl p-4 flex flex-col overflow-hidden">
        
        {/* Search & Meta Control */}
        <div className="mb-3">
          <span className="text-[10px] font-mono uppercase text-[#ff9b5a] tracking-widest font-bold block mb-2">
            Session Katalog ({sessions.length})
          </span>
          <input
            type="text"
            placeholder="Lektion filtern..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 bg-slate-900 text-slate-100 placeholder-slate-500 text-xs border border-white/10 rounded-lg focus:ring-1 focus:ring-purple-400 outline-none transition-all"
          />
        </div>

        {/* Action buttons inside sidebar */}
        <button
          onClick={handleCreateNewSession}
          className="w-full py-2 bg-gradient-to-r from-purple-500/20 to-indigo-500/20 hover:from-purple-500/30 hover:to-indigo-500/30 border border-purple-500/30 text-purple-200 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 mb-3"
        >
          <Plus size={13} className="text-purple-400 animate-pulse" />
          <span>Neue Session anlegen</span>
        </button>

        {/* Scrolling list */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {filteredSessions.map((sess) => {
            const isActive = sess.id === activeSession.id;
            return (
              <div
                key={sess.id}
                onClick={() => {
                  setActiveSessionId(sess.id);
                  setActiveSlideIdx(0);
                }}
                className={`group px-3.5 py-3 rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-between ${
                  isActive 
                    ? 'bg-gradient-to-r from-purple-500/10 to-indigo-500/5 border-purple-500/40 shadow-inner' 
                    : 'bg-white/[0.012] border-white/5 hover:bg-white/[0.03]'
                }`}
              >
                <div className="flex-1 min-w-0 pr-2">
                  <h4 className={`text-xs font-black truncate ${isActive ? 'text-purple-300' : 'text-slate-300'}`}>
                    {sess.title}
                  </h4>
                  <p className="text-[10px] text-slate-500 truncate mt-0.5">
                    {sess.topic || 'Keine Beschreibung vorhanden'}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[8px] font-mono bg-slate-900 px-1.5 py-0.5 rounded text-slate-400">
                      ⏱️ {sess.duration}m
                    </span>
                    <span className="text-[8px] font-mono bg-slate-900 px-1.5 py-0.5 rounded text-slate-400">
                      🔥 Lvl {Math.round(sess.difficultyScore/10)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={(e) => handleDeleteSession(sess.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 bg-red-500/10 hover:bg-red-500/30 text-slate-400 hover:text-red-400 rounded transition-all flex-shrink-0"
                  title="Session löschen"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            );
          })}
        </div>

        {/* Global actions at bottom */}
        <div className="mt-3 pt-3 border-t border-white/5 space-y-2">
          {isModified && (
            <div className="text-[10px] font-mono text-amber-400 flex items-center gap-1.5 animate-pulse bg-amber-500/5 p-1 rounded border border-amber-500/20 justify-center">
              <span>⚠️ Ungespeicherte Änderungen</span>
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleSaveToCloud}
              disabled={isSaving}
              className={`flex-1 py-1.5 bg-purple-500 hover:bg-purple-600 disabled:bg-purple-800 text-white rounded-lg text-[10px] font-black tracking-wider uppercase transition-all flex items-center justify-center gap-1 shadow-lg ${isModified ? 'shadow-purple-500/10 border border-purple-400/30' : ''}`}
            >
              {isSaving ? <Loader2 size={10} className="animate-spin" /> : <Save size={11} />}
              <span>Cloud Sichern</span>
            </button>
            <button
              onClick={handleResetDefaults}
              className="px-2 bg-slate-900 border border-white/10 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all text-xs"
              title="Auf Standard-Lektionen zurücksetzen"
            >
              <RefreshCcw size={11} />
            </button>
          </div>
          {saveStatusText && (
            <div className="text-[10px] text-center font-semibold text-emerald-400">
              {saveStatusText}
            </div>
          )}
        </div>
      </div>

      {/* 2. MIDDLE & RIGHT PANELS: Workspace with editable forms and high-end interactive visualizers */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-950/40 border border-[#3a3f4b]/20 rounded-2xl relative">
        
        {/* Workspace Top Header Bar: Display Selected Lektion Metadatas */}
        <header className="px-6 py-4 border-b border-[#3a3f4b]/20 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-950/20">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-1 px-3 bg-white/5 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-all text-xs flex items-center gap-1.5 font-bold uppercase tracking-wider border border-white/5"
            >
              <ArrowLeft size={12} /> Zurück
            </button>
            <div className="h-4 w-[1px] bg-slate-700/60" />
            <div className="flex flex-col">
              <input
                type="text"
                value={activeSession.title}
                onChange={(e) => updateActiveSession({ title: e.target.value })}
                className="bg-transparent border-b border-transparent hover:border-slate-700 focus:border-purple-400 outline-none text-base font-black text-white px-1 py-0.5 tracking-tight"
                placeholder="Session Name..."
              />
              <span className="text-[9px] font-mono text-[#ff9b5a] tracking-widest uppercase mt-0.5">
                Workspace: Kreativ-Entwurf für Live-Session
              </span>
            </div>
          </div>

          <div className="flex items-center gap-5">
            {/* Quick Stats Summary fields */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-slate-500">DAUER:</span>
              <input
                type="number"
                value={activeSession.duration}
                onChange={(e) => updateActiveSession({ duration: Math.max(10, parseInt(e.target.value) || 60) })}
                className="w-12 text-center bg-slate-900/60 border border-white/10 rounded px-1.5 py-0.5 text-xs text-slate-100 font-bold outline-none font-mono"
              />
              <span className="text-xs text-slate-400">MINUTEN</span>
            </div>
          </div>
        </header>

        {/* Dynamic Inner Subtabs */}
        <div className="px-6 py-2 border-b border-[#3a3f4b]/10 bg-slate-900/10 flex items-center justify-between">
          <nav className="flex items-center gap-1">
            {(['SLIDES', 'EXERCISE', 'NOTES', 'STATS'] as const).map(tab => {
              const isActive = activeTab === tab;
              const labels = {
                SLIDES: 'Folien & Grafiken',
                EXERCISE: 'Live-Übung (Fließtext)',
                NOTES: 'Stichworte/Outline',
                STATS: 'Teilnehmer-Stats'
              };
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${
                    isActive 
                      ? 'bg-purple-500/10 border border-purple-500/30 text-purple-200' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {labels[tab]}
                </button>
              );
            })}
          </nav>

          {isAILoading && (
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-purple-400 animate-pulse">
              <Loader2 size={12} className="animate-spin" />
              <span>Kreativ-KI arbeitet...</span>
            </div>
          )}
        </div>

        {/* Tab Workspace content */}
        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            
            {/* TAB 1: SLIDES & INFOGRAPHICS */}
            {activeTab === 'SLIDES' && (
              <motion.div
                key="slides"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
                className="grid grid-cols-1 xl:grid-cols-12 gap-6 h-full items-start"
              >
                {/* Left side: Slide list and slide config editor (xl:col-span-5) */}
                <div className="xl:col-span-5 flex flex-col gap-4 bg-slate-900/10 rounded-xl p-4 border border-white/5">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-2">
                    <span className="text-xs font-black tracking-widest text-[#ff9b5a] uppercase flex items-center gap-1.5">
                      <Layers size={13} />
                      SLIDEPAGES & DESIGNS
                    </span>
                    <button
                      onClick={handleAddSlide}
                      className="px-2.5 py-1 bg-purple-500/20 hover:bg-purple-500/35 border border-purple-500/30 rounded text-[10px] font-bold text-purple-200 uppercase tracking-wider flex items-center gap-1"
                    >
                      <Plus size={11} /> Slide +
                    </button>
                  </div>

                  {/* Horizontal Slide Selector Pills */}
                  <div className="flex gap-1.5 overflow-x-auto pb-2 border-b border-white/5">
                    {activeSession.slides.map((sl, idx) => (
                      <button
                        key={sl.id}
                        type="button"
                        onClick={() => setActiveSlideIdx(idx)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 flex-shrink-0 transition-all ${
                          activeSlideIdx === idx 
                            ? 'bg-purple-500 text-white' 
                            : 'bg-slate-900 border border-white/5 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <span>Folie {idx + 1}</span>
                        {activeSession.slides.length > 1 && (
                          <span 
                            onClick={(e) => { e.stopPropagation(); handleDeleteSlide(idx); }}
                            className="hover:text-red-300 text-[10px]"
                          >
                            ×
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  {activeSession.slides.length === 0 ? (
                    <div className="text-center py-6 text-xs text-slate-500">
                      Keine Folien vorhanden. Füge eine neue hinzu.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Diagram Layout Type */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-black">Infografik Layout-Typ</label>
                        <div className="grid grid-cols-3 gap-2">
                          {(['Venn', 'Pyramid', 'Funnel', 'Timeline', 'Grid', 'Vorschau'] as const).map((lType) => (
                            <button
                              key={lType}
                              type="button"
                              onClick={() => updateActiveSlide(activeSlideIdx, { type: lType })}
                              className={`py-1.5 px-1 bg-slate-900 border text-[10px] font-bold uppercase rounded-lg transition-all ${
                                activeSession.slides[activeSlideIdx]?.type === lType 
                                  ? 'border-purple-500 bg-purple-500/10 text-purple-200' 
                                  : 'border-white/5 text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              {lType}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Title & Subtitle */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-[9px] font-mono text-slate-400 uppercase">Folienschwerpunkt</label>
                          <input
                            type="text"
                            value={activeSession.slides[activeSlideIdx]?.title || ''}
                            onChange={(e) => updateActiveSlide(activeSlideIdx, { title: e.target.value })}
                            className="w-full px-2.5 py-1.5 bg-slate-950 border border-white/10 rounded-lg text-xs outline-none focus:ring-1 focus:ring-purple-400 text-slate-200"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[9px] font-mono text-slate-400 uppercase">Subtext</label>
                          <input
                            type="text"
                            value={activeSession.slides[activeSlideIdx]?.subtitle || ''}
                            onChange={(e) => updateActiveSlide(activeSlideIdx, { subtitle: e.target.value })}
                            className="w-full px-2.5 py-1.5 bg-slate-950 border border-white/10 rounded-lg text-xs outline-none focus:ring-1 focus:ring-purple-400 text-slate-200"
                          />
                        </div>
                      </div>

                      {/* Dynamic Diagram Labels inputs */}
                      <div className="space-y-2 border-t border-inner border-white/5 pt-2">
                        <label className="text-[9px] font-mono text-slate-400 uppercase tracking-wider block mb-1">Diagramm-Knotenbeschriftung (Labels)</label>
                        <div className="grid grid-cols-2 gap-2">
                          {[0, 1, 2, 3].map((idx) => {
                            const slideType = activeSession.slides[activeSlideIdx]?.type;
                            // Limit inputs based on layout type requirements
                            const maxLabels = (slideType === 'Venn' ? 3 : 4);
                            if (idx >= maxLabels) return null;

                            const lbls = [...(activeSession.slides[activeSlideIdx]?.labels || [])];
                            return (
                              <input
                                key={idx}
                                type="text"
                                placeholder={`Label 0${idx+1}...`}
                                value={lbls[idx] || ''}
                                onChange={(e) => {
                                  lbls[idx] = e.target.value;
                                  updateActiveSlide(activeSlideIdx, { labels: lbls });
                                }}
                                className="px-2 py-1 bg-slate-950 border border-white/5 rounded-lg text-[10px] font-mono outline-none focus:ring-1 focus:ring-purple-400 text-slate-300"
                              />
                            );
                          })}
                        </div>
                      </div>

                      {/* Bullet Description list editor */}
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-mono text-slate-400 uppercase">Begleitende Bulletpoints (Lern-Säulen)</label>
                        {[0, 1, 2].map((idx) => {
                          const blts = [...(activeSession.slides[activeSlideIdx]?.bullets || [])];
                          return (
                            <div key={idx} className="flex gap-2">
                              <span className="text-[10px] font-mono text-indigo-400 mt-1">{idx+1}.</span>
                              <input
                                type="text"
                                value={blts[idx] || ''}
                                onChange={(e) => {
                                  blts[idx] = e.target.value;
                                  updateActiveSlide(activeSlideIdx, { bullets: blts });
                                }}
                                className="flex-1 px-2.5 py-1 bg-slate-950 border border-white/5 rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-400 text-slate-300"
                                placeholder={`Schlüsselargument ${idx+1}...`}
                              />
                            </div>
                          );
                        })}
                      </div>

                      {/* Refine / Design optimizer button */}
                      <button
                        onClick={handleAIRefineSlide}
                        disabled={isAILoading}
                        className="w-full mt-2 py-2 bg-purple-500/25 hover:bg-purple-500/40 border border-purple-500/40 text-purple-200 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                      >
                        <Sparkles size={11} className="text-purple-400" />
                        <span>Folie durch Kreativ-KI polieren</span>
                      </button>

                    </div>
                  )}

                </div>

                {/* Right side: Interactive graphical frame (xl:col-span-7) */}
                <div className="xl:col-span-7 flex flex-col gap-4">
                  <span className="text-[10px] font-mono uppercase text-slate-400 tracking-widest font-bold block">
                    🔴 Live Vektorgrafik / Präsentationsfolie (Screenshot & Vorführung)
                  </span>
                  
                  {/* The visual container with glowing parameters */}
                  <div className="w-full bg-[#0a0c10] border border-slate-800 rounded-3xl p-6 relative shadow-2xl flex flex-col items-center justify-center min-h-[380px] overflow-hidden group">
                    
                    {/* Visual gradients embedded in slide background */}
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-purple-500/10 blur-[80px]" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] rounded-full bg-indigo-500/10 blur-[90px]" />

                    {activeSession.slides.length > 0 && (
                      <div className="w-full flex-1 flex flex-col justify-between">
                        
                        {/* Slide Top Details */}
                        <div className="mb-4">
                          <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest block font-bold mb-1">
                            {activeSession.slides[activeSlideIdx]?.subtitle || 'SUBTEXT DER GRAPHIK'}
                          </span>
                          <h3 className="text-xl font-extrabold text-white tracking-tight leading-snug drop-shadow-md">
                            {activeSession.slides[activeSlideIdx]?.title || 'Folientitel'}
                          </h3>
                        </div>

                        {/* Middle Render of selected Infographic diagram */}
                        <div className="flex-1 flex items-center justify-center w-full my-3">
                          {renderSVGInfographic()}
                        </div>

                        {/* Slide Bottom key takeaways */}
                        <div className="mt-4 pt-4 border-t border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs text-slate-400">
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-2 py-0.5 rounded-full">
                              LIVE-COACH SLIDEPACK
                            </span>
                            <span className="text-[10px] font-mono">
                              Folie {activeSlideIdx + 1} von {activeSession.slides.length}
                            </span>
                          </div>
                          
                          <div className="flex gap-4">
                            {(activeSession.slides[activeSlideIdx]?.bullets || []).filter(b => b.trim() !== '').map((bText, index) => (
                              <span key={index} className="text-[10px] font-semibold text-slate-300 flex items-center gap-1">
                                <span className="w-1 h-1 bg-purple-400 rounded-full" />
                                {bText}
                              </span>
                            ))}
                          </div>
                        </div>

                      </div>
                    )}

                  </div>
                  
                  {/* Export / Use guidelines context info */}
                  <div className="bg-slate-900/40 border border-white/5 p-3 rounded-xl flex items-center gap-2 text-xs text-slate-400 leading-normal">
                    <span className="text-indigo-400 animate-bounce font-bold">ℹ️</span>
                    <p>Diese **Infografiken passen sich in Echtzeit an**, wenn du links Stile oder Knotennamen änderst. Nutze sie in deinen Zoom-Meetings als geteilten Bildschirm oder lasse den Kreativ-Agenten die Layouts strukturieren.</p>
                  </div>

                </div>
              </motion.div>
            )}

            {/* TAB 2: LIVE EXERCISE - Body Text & Worksheets */}
            {activeTab === 'EXERCISE' && (
              <motion.div
                key="exercise"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
                className="flex flex-col gap-6"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                      <BookOpen size={14} className="text-purple-400" />
                      Live-Übungs Lektionsbeschreibung & Fließtext
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Entwirf den Begleittext, den deine Teilnehmer vor, während oder nach diesem Call bearbeiten müssen, um die Inhalte wirklich zu verinnerlichen.
                    </p>
                  </div>

                  <button
                    onClick={handleAIGenerateExercise}
                    disabled={isAILoading}
                    className="px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 disabled:from-purple-800 disabled:to-indigo-800 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 shrink-0 border border-white/10"
                  >
                    <Sparkles size={13} className="text-white" />
                    <span>🪄 Fließtext durch KI entwerfen / erweitern</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Exercise Title and Setup parameters */}
                  <div className="lg:col-span-1 space-y-4">
                    <div className="bg-slate-900/10 border border-white/5 p-4 rounded-xl space-y-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-mono text-slate-400 uppercase">Name der Übung</label>
                        <input
                          type="text"
                          value={activeSession.exerciseTitle}
                          onChange={(e) => updateActiveSession({ exerciseTitle: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-lg text-xs outline-none focus:ring-1 focus:ring-purple-400 font-bold"
                        />
                      </div>
                      
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-mono text-slate-400 uppercase">Erforderliche Vorbereitung (Material/Hausaufgaben)</label>
                        <textarea
                          value={activeSession.prepText}
                          onChange={(e) => updateActiveSession({ prepText: e.target.value })}
                          className="w-full h-24 px-3 py-2 bg-slate-950 border border-white/10 rounded-lg text-xs outline-none focus:ring-1 focus:ring-purple-400 resize-none"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <Flame size={14} className="text-amber-500" />
                        <span className="text-[10px] font-mono text-slate-400">SCHWIERIGKEITSGRAD PLANUNG:</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <input
                          type="range"
                          min="10"
                          max="100"
                          value={activeSession.difficultyScore}
                          onChange={(e) => updateActiveSession({ difficultyScore: parseInt(e.target.value) })}
                          className="flex-1 accent-purple-500"
                        />
                        <span className="text-xs font-mono font-bold w-8 text-center bg-slate-900 px-1.5 py-0.5 rounded border border-white/5">
                          {activeSession.difficultyScore}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Body Text Fließtext Block */}
                  <div className="lg:col-span-2 flex flex-col h-[350px]">
                    <span className="text-[11px] font-mono text-[#ff9b5a] uppercase font-black mb-1.5 block">
                      Übungsanleitung & Praxis-Leitfaden (Fließtext)
                    </span>
                    <textarea
                      value={activeSession.exerciseText}
                      onChange={(e) => updateActiveSession({ exerciseText: e.target.value })}
                      className="flex-1 w-full p-4 bg-slate-950/80 border border-white/10 rounded-xl focus:ring-1 focus:ring-purple-400 text-slate-100 text-xs outline-none resize-none font-sans leading-relaxed shadow-inner"
                      placeholder="Verfasse hier die Übungslektion für deine Teilnehmer..."
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB 3: STICHWORTE / AGENDA OUTLINE */}
            {activeTab === 'NOTES' && (
              <motion.div
                key="notes"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
                className="flex flex-col gap-6"
              >
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                      <ListChecks size={14} className="text-[#ff9b5a]" />
                      Sitzungs-Inhalt & Agenda für den Live-Call
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Definiere wichtige Besprechungspunkte, Diskussionspunkte und zeitliche Abfolgen, damit du perfekt vorbereitet in das Webinar gehst.
                    </p>
                  </div>

                  <button
                    onClick={handleAIGenerateOutline}
                    disabled={isAILoading}
                    className="px-4 py-2 bg-gradient-to-r from-purple-500/20 to-indigo-500/20 hover:from-purple-500/30 hover:to-indigo-500/30 border border-purple-500/30 text-purple-200 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0"
                  >
                    <Sparkles size={13} className="text-purple-400" />
                    <span>Generiere KI-Zeitstruktur</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Lektion Fokus Summary card */}
                  <div className="lg:col-span-1 space-y-4">
                    <div className="bg-slate-900/10 border border-white/5 p-4 rounded-xl space-y-2">
                      <span className="text-[10px] font-mono text-indigo-400 tracking-wider font-bold block uppercase">Lektionsfokus (Meta)</span>
                      <textarea
                        value={activeSession.topic}
                        onChange={(e) => updateActiveSession({ topic: e.target.value })}
                        className="w-full h-32 p-3 bg-slate-950 border border-white/10 rounded-xl text-xs outline-none focus:ring-1 focus:ring-indigo-400 resize-none text-slate-200"
                        placeholder="Zusammenfassung worüber genau gesprochen werden muss..."
                      />
                    </div>
                  </div>

                  {/* Bullet agenda points area */}
                  <div className="lg:col-span-2 flex flex-col h-[320px]">
                    <span className="text-[11px] font-mono text-slate-400 uppercase font-bold mb-2 block">Ausformulierter Gesprächsleitfaden & Zeitstempel</span>
                    <textarea
                      value={activeSession.bulletsText}
                      onChange={(e) => updateActiveSession({ bulletsText: e.target.value })}
                      className="flex-1 w-full p-4 bg-slate-950/80 border border-white/10 rounded-xl focus:ring-1 focus:ring-purple-400 text-slate-100 text-xs outline-none resize-none font-mono leading-relaxed"
                placeholder="• 00-10: Begrüßung der Kohorte
• 10-30: Theorievortrag über Nische
• ... etc"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB 4: STATS / INTERACTIVE CALCULATION */}
            {activeTab === 'STATS' && (
              <motion.div
                key="stats"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
                className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start"
              >
                {/* Configuration Parameters Sliders */}
                <div className="xl:col-span-5 flex flex-col gap-4 bg-slate-900/10 rounded-xl p-4 border border-white/5">
                  <span className="text-xs font-black tracking-widest text-indigo-400 uppercase border-b border-white/5 pb-2 mb-2 block">
                    SESSIONS-METRIKEN PLANEN
                  </span>

                  {/* Target Values range inputs */}
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400 font-bold">Erwartete Teilnehmer</span>
                        <span className="font-mono text-white text-[11px]">{activeSession.participantsCount || 40}</span>
                      </div>
                      <input
                        type="range" min="10" max="100"
                        value={activeSession.participantsCount || 40}
                        onChange={(e) => updateActiveSession({ participantsCount: parseInt(e.target.value) })}
                        className="w-full accent-purple-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400 font-bold">Zufriedenheits-Zielwert</span>
                        <span className="font-mono text-emerald-400 text-[11px]">{activeSession.satisfactionRate || 95}%</span>
                      </div>
                      <input
                        type="range" min="50" max="100"
                        value={activeSession.satisfactionRate || 95}
                        onChange={(e) => updateActiveSession({ satisfactionRate: parseInt(e.target.value) })}
                        className="w-full accent-emerald-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400 font-bold">Übungs-Abschlussquote</span>
                        <span className="font-mono text-indigo-400 text-[11px]">{activeSession.avgCompletionRate || 80}%</span>
                      </div>
                      <input
                        type="range" min="40" max="100"
                        value={activeSession.avgCompletionRate || 80}
                        onChange={(e) => updateActiveSession({ avgCompletionRate: parseInt(e.target.value) })}
                        className="w-full accent-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="border-t border-white/5 pt-3 my-1" />

                  {/* Calculated KPI scores summary panels */}
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="bg-slate-950 p-2.5 rounded-lg border border-white/5">
                      <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest">
                        Interaktionsrate
                      </span>
                      <span className="text-xl font-black text-rose-400 block mt-1">
                        {Math.round(activeSession.avgCompletionRate * 1.1) > 100 ? 100 : Math.round(activeSession.avgCompletionRate * 1.1)}%
                      </span>
                    </div>

                    <div className="bg-slate-950 p-2.5 rounded-lg border border-white/5">
                      <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest">
                        Onboardingscore
                      </span>
                      <span className="text-xl font-black text-indigo-400 block mt-1">
                        {Math.floor(activeSession.satisfactionRate * 0.95)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Graphical charts visualization area */}
                <div className="xl:col-span-7 flex flex-col gap-5">
                  <header>
                    <span className="text-[10px] font-mono uppercase text-slate-400 tracking-widest block font-bold">
                      📊 KPI-Auswertungen & Aufmerksamkeitsverlauf
                    </span>
                  </header>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Panel 1: Area Chart of Attention */}
                    <div className="bg-[#0b0d12]/60 border border-white/5 p-4 rounded-xl flex flex-col h-[230px]">
                      <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest block font-bold mb-3">
                        Call-Aufmerksamkeit über Zeit
                      </span>
                      
                      <div className="flex-1 w-full min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={attentionData}>
                            <defs>
                              <linearGradient id="attentionGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#818cf8" stopOpacity={0.25}/>
                                <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#2a2d39" />
                            <XAxis dataKey="name" stroke="#6b7280" fontSize={8} />
                            <YAxis stroke="#6b7280" fontSize={8} />
                            <Tooltip contentStyle={{ backgroundColor: '#07080a', border: '1px solid #3a3f4b' }} />
                            <Area type="monotone" dataKey="Aufmerksamkeit" stroke="#818cf8" strokeWidth={2} fillOpacity={1} fill="url(#attentionGrad)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Panel 2: Radar plot of metric focus */}
                    <div className="bg-[#0b0d12]/60 border border-white/5 p-4 rounded-xl flex flex-col h-[230px]">
                      <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest block font-bold mb-3">
                        Lernziel-Schnittstelle
                      </span>

                      <div className="flex-1 w-full min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                            <PolarGrid stroke="#2a2d39" />
                            <PolarAngleAxis dataKey="subject" stroke="#9ca3af" fontSize={9} />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#4b5563" fontSize={6} />
                            <Radar name="Ziel" dataKey="A" stroke="#10b981" fill="#10b981" fillOpacity={0.15} />
                            <Radar name="Normal" dataKey="B" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.05} />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

      </div>

    </div>
  );
};
