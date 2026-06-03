import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut, 
  User 
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp,
  updateDoc
} from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from './firebase';
import { PinnwandEintrag } from './Pinnwand';
import { WhiteboardNote } from './Whiteboard';
import { getISOWeek, getDateLabel } from './pinnwandUtils';
import { VayBoardCard, VayBoardBoard, VayBoardBoardItem, VayBoardAgentEvent } from '../types';

interface FirebaseContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  pinnwandNotes: PinnwandEintrag[];
  whiteboardNotes: WhiteboardNote[];
  whiteboardMainText: string;
  addPinnwandNote: (text: string, category: string, overrideDate?: Date) => Promise<void>;
  deletePinnwandNote: (id: string) => Promise<void>;
  addWhiteboardNote: (text: string, color: string, x: number, z: number, rotationZ: number) => Promise<void>;
  updateWhiteboardNotePos: (id: string, x: number, z: number, rotationZ: number) => Promise<void>;
  deleteWhiteboardNote: (id: string) => Promise<void>;
  updateWhiteboardMainText: (text: string) => Promise<void>;
  
  // VayBoard Fields & Handlers
  vayBoardCards: VayBoardCard[];
  vayBoardBoards: VayBoardBoard[];
  vayBoardItems: VayBoardBoardItem[];
  vayBoardEvents: VayBoardAgentEvent[];
  addVayBoardCard: (card: Omit<VayBoardCard, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateVayBoardCard: (id: string, updates: Partial<VayBoardCard>) => Promise<void>;
  deleteVayBoardCard: (id: string) => Promise<void>;
  addVayBoardBoard: (name: string) => Promise<string>;
  deleteVayBoardBoard: (id: string) => Promise<void>;
  addVayBoardItem: (item: Omit<VayBoardBoardItem, 'id'>) => Promise<string>;
  updateVayBoardItemPos: (id: string, x: number, y: number) => Promise<void>;
  updateVayBoardItemConfig: (id: string, updates: Partial<VayBoardBoardItem>) => Promise<void>;
  deleteVayBoardItem: (id: string) => Promise<void>;
  addVayBoardEvent: (event: Omit<VayBoardAgentEvent, 'id' | 'createdAt'>) => Promise<string>;
  updateVayBoardEventStatus: (id: string, status: 'PENDING' | 'PROCESSED') => Promise<void>;
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [pinnwandNotes, setPinnwandNotes] = useState<PinnwandEintrag[]>([]);
  const [whiteboardNotes, setWhiteboardNotes] = useState<WhiteboardNote[]>([]);
  const [whiteboardMainText, setWhiteboardMainText] = useState("");

  const [vayBoardCards, setVayBoardCards] = useState<VayBoardCard[]>([]);
  const [vayBoardBoards, setVayBoardBoards] = useState<VayBoardBoard[]>([]);
  const [vayBoardItems, setVayBoardItems] = useState<VayBoardBoardItem[]>([]);
  const [vayBoardEvents, setVayBoardEvents] = useState<VayBoardAgentEvent[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (usr) => {
      setUser(usr);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Sync pinnwand notes from Firestore in real-time
  useEffect(() => {
    if (!user) {
      setPinnwandNotes([]);
      return;
    }

    const q = query(collection(db, "pinnwand_notes"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notes: PinnwandEintrag[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        notes.push({
          id: data.id,
          text: data.text,
          category: data.category,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          dateLabel: data.dateLabel,
          weekNumber: data.weekNumber,
          tags: data.tags || []
        });
      });
      setPinnwandNotes(notes);
      
      // Sync to local storage for Three.js scene
      localStorage.setItem('konferenzhub.pinnwand.v2', JSON.stringify(notes));
      window.dispatchEvent(new Event('pinnwand-notes-updated'));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "pinnwand_notes");
    });

    return unsubscribe;
  }, [user]);

  // Sync whiteboard notes from Firestore
  useEffect(() => {
    if (!user) {
      setWhiteboardNotes([]);
      return;
    }

    const q = query(collection(db, "whiteboard_notes"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const wNotes: WhiteboardNote[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        wNotes.push({
          id: data.id,
          text: data.text,
          color: data.color,
          x: data.x,
          z: data.z,
          rotationZ: data.rotationZ,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
        });
      });
      setWhiteboardNotes(wNotes);
      
      // Sync to local storage for Three.js
      localStorage.setItem('konferenzhub.whiteboard.v1', JSON.stringify(wNotes));
      window.dispatchEvent(new Event('whiteboard-notes-updated'));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "whiteboard_notes");
    });

    return unsubscribe;
  }, [user]);

  // Sync whiteboard config (mainText) from Firestore
  useEffect(() => {
    if (!user) {
      setWhiteboardMainText("");
      return;
    }

    const unsubscribe = onSnapshot(doc(db, "whiteboard_config", "main"), (docSnap) => {
      if (docSnap.exists()) {
        const txt = docSnap.data().text || "";
        setWhiteboardMainText(txt);
        localStorage.setItem('konferenzhub.whiteboard.mainText', txt);
        window.dispatchEvent(new Event('whiteboard-notes-updated'));
      } else {
        setWhiteboardMainText("");
        localStorage.setItem('konferenzhub.whiteboard.mainText', "");
        window.dispatchEvent(new Event('whiteboard-notes-updated'));
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "whiteboard_config/main");
    });

    return unsubscribe;
  }, [user]);

  // Sync VayBoard Cards
  useEffect(() => {
    if (!user) {
      setVayBoardCards([]);
      return;
    }

    const q = query(collection(db, "cards"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: VayBoardCard[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        list.push({
          id: data.id,
          title: data.title || "",
          sourceType: data.sourceType || "TEXT",
          sourceUrl: data.sourceUrl || "",
          rawText: data.rawText || "",
          summary: data.summary || "",
          tags: data.tags || [],
          roles: data.roles || [],
          projectRelevance: data.projectRelevance || "",
          nextActions: data.nextActions || [],
          status: data.status || "NEW",
          importance: data.importance || "MEDIUM",
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
        });
      });
      setVayBoardCards(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "cards");
    });

    return unsubscribe;
  }, [user]);

  // Sync VayBoard Boards
  useEffect(() => {
    if (!user) {
      setVayBoardBoards([]);
      return;
    }

    const q = query(collection(db, "boards"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: VayBoardBoard[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        list.push({
          id: doc.id,
          name: data.name || "",
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
        });
      });
      setVayBoardBoards(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "boards");
    });

    return unsubscribe;
  }, [user]);

  // Sync VayBoard Board Items
  useEffect(() => {
    if (!user) {
      setVayBoardItems([]);
      return;
    }

    const q = collection(db, "boardItems");
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: VayBoardBoardItem[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        list.push({
          id: doc.id,
          boardId: data.boardId || "",
          cardId: data.cardId || "",
          x: data.x || 0,
          y: data.y || 0,
          width: data.width || 220,
          height: data.height || 180,
          groupId: data.groupId || "",
          groupColor: data.groupColor || "",
          groupTitle: data.groupTitle || "",
          connectedTo: data.connectedTo || []
        });
      });
      setVayBoardItems(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "boardItems");
    });

    return unsubscribe;
  }, [user]);

  // Sync VayBoard Agent Events
  useEffect(() => {
    if (!user) {
      setVayBoardEvents([]);
      return;
    }

    const q = query(collection(db, "agentEvents"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: VayBoardAgentEvent[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        list.push({
          id: doc.id,
          agent: data.agent || "STRATEGY",
          triggerType: data.triggerType || "",
          cardId: data.cardId || "",
          description: data.description || "",
          status: data.status || "PENDING",
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
        });
      });
      setVayBoardEvents(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "agentEvents");
    });

    return unsubscribe;
  }, [user]);

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      console.error("Sign in failed:", e);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error("Sign out failed:", e);
    }
  };

  const addPinnwandNote = async (text: string, category: string, overrideDate?: Date) => {
    if (!user) return;
    const cleanId = 'note_' + Math.random().toString(36).substring(2, 11);
    const dateToUse = overrideDate || new Date();
    try {
      await setDoc(doc(db, "pinnwand_notes", cleanId), {
        id: cleanId,
        text,
        category,
        createdAt: serverTimestamp(),
        dateLabel: getDateLabel(dateToUse),
        weekNumber: getISOWeek(dateToUse),
        userId: user.uid,
        userEmail: user.email || ""
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `pinnwand_notes/${cleanId}`);
    }
  };

  const deletePinnwandNote = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, "pinnwand_notes", id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `pinnwand_notes/${id}`);
    }
  };

  const addWhiteboardNote = async (text: string, color: string, x: number, z: number, rotationZ: number) => {
    if (!user) return;
    const cleanId = 'board_' + Math.random().toString(36).substring(2, 11);
    try {
      await setDoc(doc(db, "whiteboard_notes", cleanId), {
        id: cleanId,
        text,
        color,
        x,
        z,
        rotationZ,
        createdAt: serverTimestamp(),
        userId: user.uid,
        userEmail: user.email || ""
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `whiteboard_notes/${cleanId}`);
    }
  };

  const updateWhiteboardNotePos = async (id: string, x: number, z: number, rotationZ: number) => {
    if (!user) return;
    try {
      const noteRef = doc(db, "whiteboard_notes", id);
      await updateDoc(noteRef, {
        x,
        z,
        rotationZ
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `whiteboard_notes/${id}`);
    }
  };

  const deleteWhiteboardNote = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, "whiteboard_notes", id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `whiteboard_notes/${id}`);
    }
  };

  const updateWhiteboardMainText = async (text: string) => {
    if (!user) return;
    const configId = "main";
    try {
      await setDoc(doc(db, "whiteboard_config", configId), {
        text,
        updatedAt: serverTimestamp(),
        lastUpdatedBy: user.email || ""
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `whiteboard_config/${configId}`);
    }
  };

  const addVayBoardCard = async (card: Omit<VayBoardCard, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    if (!user) throw new Error("Unauthenticated user");
    const cleanId = 'card_' + Math.random().toString(36).substring(2, 11);
    try {
      await setDoc(doc(db, "cards", cleanId), {
        ...card,
        id: cleanId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return cleanId;
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `cards/${cleanId}`);
      throw e;
    }
  };

  const updateVayBoardCard = async (id: string, updates: Partial<VayBoardCard>): Promise<void> => {
    if (!user) return;
    try {
      await updateDoc(doc(db, "cards", id), {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `cards/${id}`);
    }
  };

  const deleteVayBoardCard = async (id: string): Promise<void> => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, "cards", id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `cards/${id}`);
    }
  };

  const addVayBoardBoard = async (name: string): Promise<string> => {
    if (!user) throw new Error("Unauthenticated user");
    const cleanId = 'board_' + Math.random().toString(36).substring(2, 11);
    try {
      await setDoc(doc(db, "boards", cleanId), {
        id: cleanId,
        name,
        createdAt: serverTimestamp()
      });
      return cleanId;
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `boards/${cleanId}`);
      throw e;
    }
  };

  const deleteVayBoardBoard = async (id: string): Promise<void> => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, "boards", id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `boards/${id}`);
    }
  };

  const addVayBoardItem = async (item: Omit<VayBoardBoardItem, 'id'>): Promise<string> => {
    if (!user) throw new Error("Unauthenticated user");
    const cleanId = item.cardId || 'item_' + Math.random().toString(36).substring(2, 11);
    try {
      await setDoc(doc(db, "boardItems", cleanId), {
        ...item,
        id: cleanId
      });
      return cleanId;
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `boardItems/${cleanId}`);
      throw e;
    }
  };

  const updateVayBoardItemPos = async (id: string, x: number, y: number): Promise<void> => {
    if (!user) return;
    try {
      await updateDoc(doc(db, "boardItems", id), {
        x,
        y
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `boardItems/${id}`);
    }
  };

  const updateVayBoardItemConfig = async (id: string, updates: Partial<VayBoardBoardItem>): Promise<void> => {
    if (!user) return;
    try {
      await updateDoc(doc(db, "boardItems", id), updates);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `boardItems/${id}`);
    }
  };

  const deleteVayBoardItem = async (id: string): Promise<void> => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, "boardItems", id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `boardItems/${id}`);
    }
  };

  const addVayBoardEvent = async (event: Omit<VayBoardAgentEvent, 'id' | 'createdAt'>): Promise<string> => {
    if (!user) throw new Error("Unauthenticated user");
    const cleanId = 'event_' + Math.random().toString(36).substring(2, 11);
    try {
      await setDoc(doc(db, "agentEvents", cleanId), {
        ...event,
        id: cleanId,
        createdAt: serverTimestamp()
      });
      return cleanId;
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `agentEvents/${cleanId}`);
      throw e;
    }
  };

  const updateVayBoardEventStatus = async (id: string, status: 'PENDING' | 'PROCESSED'): Promise<void> => {
    if (!user) return;
    try {
      await updateDoc(doc(db, "agentEvents", id), {
        status
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `agentEvents/${id}`);
    }
  };

  return (
    <FirebaseContext.Provider value={{
      user,
      loading,
      signInWithGoogle,
      logout,
      pinnwandNotes,
      whiteboardNotes,
      whiteboardMainText,
      addPinnwandNote,
      deletePinnwandNote,
      addWhiteboardNote,
      updateWhiteboardNotePos,
      deleteWhiteboardNote,
      updateWhiteboardMainText,
      
      // VayBoard Values
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
    }}>
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = () => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
};
