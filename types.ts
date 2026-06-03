
export enum PersonaType {
  PLAYER = 'Player',
  CHIEF_OF_STAFF = 'Chief of Staff'
}

export interface DialogueEntry {
  speaker: PersonaType;
  text: string;
  userRecordingUrl?: string; // Für die Voice-Actor Funktion
}

export interface PodcastScript {
  topic: string;
  dialogue: DialogueEntry[];
}

export interface VayBoardCard {
  id: string;
  title: string;
  sourceType: 'YOUTUBE' | 'PDF' | 'TEXT' | 'VOICE' | 'TEAM';
  sourceUrl?: string;
  rawText?: string;
  summary: string;
  tags: string[];
  roles: ('STRATEGY' | 'CREATIVE' | 'OPERATIONS')[];
  projectRelevance?: string;
  nextActions: string[];
  status: 'NEW' | 'PROCESSED' | 'ARCHIVED';
  importance: 'LOW' | 'MEDIUM' | 'HIGH';
  createdAt: string;
  updatedAt: string;
}

export interface VayBoardBoard {
  id: string;
  name: string;
  createdAt: string;
}

export interface VayBoardBoardItem {
  id: string; // matches Card ID, or visual element ID
  boardId: string;
  cardId?: string; // optional if item is just a text block / group container
  x: number;
  y: number;
  width?: number;
  height?: number;
  groupId?: string; // if grouped under a Milanote column or section
  groupColor?: string; // if groupId belongs to this item (means it is a group/section container)
  groupTitle?: string; // if it is a section container
  connectedTo?: string[]; // IDs of other items connected with a visual node line
}

export interface VayBoardAgentEvent {
  id: string;
  agent: 'STRATEGY' | 'CREATIVE' | 'OPERATIONS';
  triggerType: string;
  cardId: string;
  description: string;
  status: 'PENDING' | 'PROCESSED';
  createdAt: string;
}
