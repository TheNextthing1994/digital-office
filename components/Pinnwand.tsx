import React, { useState, useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Text, RoundedBox } from '@react-three/drei';

import { getDateLabel, getISOWeek } from './pinnwandUtils';

export type EntryCategory = 'NOTE' | 'TASK' | 'PROCESS' | 'KPI' | 'FOKUS';

export interface PinnwandEintrag {
  id: string;
  text: string;
  category: EntryCategory;
  createdAt: string;
  dateLabel: string;
  weekNumber: number;
  tags?: string[];
}

type ColumnType = 'LEFT' | 'CENTER' | 'RIGHT';

export const NoteCard = ({ 
  note, 
  index, 
  colWidth, 
  showRemove = false, 
  onDelete,
  categoryColors,
  isFirstInFocusedColumn = false
}: { 
  note: PinnwandEintrag, 
  index: number, 
  colWidth: number, 
  showRemove?: boolean,
  onDelete: (id: string, category: EntryCategory) => void,
  categoryColors: Record<string, string>,
  isFirstInFocusedColumn?: boolean
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const groupRef = useRef<THREE.Group>(null);
  const bodyMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const stripeMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const mountTimer = useRef(0);
  const baselineY = -index * 0.55;

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    // A) Fade-in and Slide-up on mount
    if (mountTimer.current < 1) {
      mountTimer.current += delta * 2.5; // Roughly 0.4s
      const progress = Math.min(mountTimer.current, 1);
      if (bodyMatRef.current) bodyMatRef.current.opacity = progress * 0.6;
      if (stripeMatRef.current) stripeMatRef.current.opacity = progress;
      groupRef.current.position.y = THREE.MathUtils.lerp(baselineY - 0.15, baselineY, progress);
    }

    // B) Focus Hover Effect (Float)
    const targetYOffset = isFirstInFocusedColumn ? 0.08 : 0;
    const currentYRel = groupRef.current.position.y - baselineY;
    groupRef.current.position.y = baselineY + THREE.MathUtils.lerp(currentYRel, targetYOffset, 0.1);

    // C) Emissive-like effect for stripe on focus
    if (stripeMatRef.current) {
      const targetOpacity = isFirstInFocusedColumn ? 1.0 : 0.8;
      stripeMatRef.current.opacity = THREE.MathUtils.lerp(stripeMatRef.current.opacity, targetOpacity, 0.1);
    }
  });

  return (
    <group ref={groupRef} position={[0, baselineY - 0.15, 0]}>
      <RoundedBox args={[colWidth, 0.45, 0.02]} radius={0.05} smoothness={4} position={[0, 0, 0.06]}>
        <meshStandardMaterial ref={bodyMatRef} color="#141419" transparent opacity={0} metalness={0.1} roughness={0.5} />
      </RoundedBox>
      
      <RoundedBox args={[0.04, 0.38, 0.01]} radius={0.02} smoothness={2} position={[-colWidth/2 + 0.03, 0, 0.075]}>
        <meshBasicMaterial ref={stripeMatRef} color={categoryColors[note.category] || '#ffffff'} transparent opacity={0} />
      </RoundedBox>

      <Text
        position={[-colWidth/2 + 0.15, 0.05, 0.08]}
        fontSize={0.13}
        color="#f0f0f0"
        anchorX="left"
        maxWidth={colWidth - 0.4}
        font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf"
      >
        {note.text}
      </Text>

      <Text
        position={[-colWidth/2 + 0.15, -0.15, 0.062]}
        fontSize={0.08}
        color="#888"
        anchorX="left"
        font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf"
      >
        {note.dateLabel}
      </Text>

      {showRemove && (
        <group 
          position={[colWidth/2 - 0.15, 0.12, 0.08]} 
          onClick={(e) => { 
            e.stopPropagation(); 
            onDelete(note.id, note.category); 
          }}
          onPointerOver={(e) => { 
            e.stopPropagation(); 
            setIsHovered(true); 
            document.body.style.cursor = 'pointer'; 
          }}
          onPointerOut={(e) => { 
            e.stopPropagation(); 
            setIsHovered(false); 
            document.body.style.cursor = 'auto'; 
          }}
          scale={isHovered ? 1.1 : 1}
        >
          {/* Circular Button Background */}
          <RoundedBox args={[0.2, 0.2, 0.01]} radius={0.1} smoothness={4} position={[0, 0, 0]}>
             <meshStandardMaterial color={isHovered ? "#ef4444" : "#2a2a30"} metalness={0.2} roughness={0.4} />
          </RoundedBox>

          <Text 
            fontSize={0.12} 
            color="white" 
            anchorX="center"
            anchorY="middle"
            position={[0, 0, 0.01]}
          >
            ×
          </Text>
        </group>
      )}
    </group>
  );
};

interface KPICardProps {
  x: number;
  y: number;
  value: string;
  label: string;
  color: string;
}

const KPICard: React.FC<KPICardProps> = ({ x, y, value, label, color }) => {
  return (
    <group position={[x, y, 0]}>
      {/* Outer Border Bezel */}
      <RoundedBox args={[1.04, 0.38, 0.02]} radius={0.04} smoothness={4} position={[0, 0, 0.04]}>
        <meshStandardMaterial color="#3a3f4b" metalness={0.2} roughness={0.3} />
      </RoundedBox>
      {/* Innermost glossy glass plate */}
      <RoundedBox args={[1.02, 0.36, 0.025]} radius={0.035} smoothness={4} position={[0, 0, 0.041]}>
        <meshStandardMaterial 
          color="#0b0d12" 
          transparent 
          opacity={0.85} 
          roughness={0.1}
          metalness={0.9}
        />
      </RoundedBox>
      {/* Accent strip at the bottom */}
      <RoundedBox args={[0.9, 0.015, 0.01]} radius={0.005} smoothness={2} position={[0, -0.15, 0.055]}>
        <meshBasicMaterial color={color} />
      </RoundedBox>
      {/* Large Value */}
      <Text
        position={[0, 0.05, 0.06]}
        fontSize={0.13}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf"
      >
        {value}
      </Text>
      {/* Label */}
      <Text
        position={[0, -0.07, 0.06]}
        fontSize={0.045}
        color="#9aa3b2"
        anchorX="center"
        anchorY="middle"
        maxWidth={0.98}
        font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf"
      >
        {label}
      </Text>
    </group>
  );
};

export const Pinnwand: React.FC<{ isActive: boolean }> = ({ isActive }) => {
  const [notes, setNotes] = useState<PinnwandEintrag[]>([]);
  const [focusedColumn, setFocusedColumn] = useState<ColumnType>('CENTER');
  const [scrollOffsets, setScrollOffsets] = useState<Record<ColumnType, number>>({
    LEFT: 0,
    CENTER: 0,
    RIGHT: 0
  });

  useEffect(() => {
    const V2_KEY = 'konferenzhub.pinnwand.v2';
    const saved = localStorage.getItem(V2_KEY);
    if (saved) {
      setNotes(JSON.parse(saved));
    }

    const handleSync = () => {
      const updated = localStorage.getItem(V2_KEY);
      if (updated) {
        setNotes(JSON.parse(updated));
      }
    };
    window.addEventListener('pinnwand-notes-updated', handleSync);
    return () => {
      window.removeEventListener('pinnwand-notes-updated', handleSync);
    };
  }, []);

  const saveNotes = (updated: PinnwandEintrag[]) => {
    setNotes(updated);
    localStorage.setItem('konferenzhub.pinnwand.v2', JSON.stringify(updated));
  };

  const addNote = (text: string, category: EntryCategory = 'NOTE') => {
    const now = new Date();
    const newNote: PinnwandEintrag = {
      id: (crypto as any).randomUUID?.() || Math.random().toString(36).substr(2, 9),
      text,
      category,
      createdAt: now.toISOString(),
      dateLabel: getDateLabel(now),
      weekNumber: getISOWeek(now),
      tags: []
    };
    saveNotes([newNote, ...notes]);
  };

  const handleDelete = (id: string, category: EntryCategory) => {
    window.dispatchEvent(new CustomEvent('pinnwand-delete-request', { 
      detail: { id, category } 
    }));
  };

  useEffect(() => {
    const handleAddNote = (e: any) => {
      if (e.detail?.text) addNote(e.detail.text, e.detail.category || 'NOTE');
    };
    window.addEventListener('add-pinnwand-note', handleAddNote);

    const handleDeleteConfirm = (e: any) => {
      if (e.detail?.id) {
        saveNotes(notes.filter(n => n.id !== e.detail.id));
      }
    };
    window.addEventListener('pinnwand-delete-confirm', handleDeleteConfirm);

    return () => {
      window.removeEventListener('add-pinnwand-note', handleAddNote);
      window.removeEventListener('pinnwand-delete-confirm', handleDeleteConfirm);
    };
  }, [addNote, notes]);

  const getColumnList = (col: ColumnType): PinnwandEintrag[] => {
    if (col === 'LEFT') return notes.filter(n => n.category === 'PROCESS');
    if (col === 'CENTER') return notes.filter(n => n.category === 'TASK');
    if (col === 'RIGHT') return notes.filter(n => n.category === 'NOTE' || n.category === 'KPI');
    return notes;
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isActive) return;

      if (e.key === 'ArrowLeft') {
        setFocusedColumn(prev => prev === 'CENTER' ? 'LEFT' : (prev === 'RIGHT' ? 'CENTER' : 'LEFT'));
      } else if (e.key === 'ArrowRight') {
        setFocusedColumn(prev => prev === 'CENTER' ? 'RIGHT' : (prev === 'LEFT' ? 'CENTER' : 'RIGHT'));
      } else if (e.key === 'ArrowUp') {
        setScrollOffsets(prev => ({
          ...prev,
          [focusedColumn]: Math.max(0, prev[focusedColumn] - 1)
        }));
      } else if (e.key === 'ArrowDown') {
        const list = getColumnList(focusedColumn);
        const limit = focusedColumn === 'RIGHT' ? 3 : 5;
        setScrollOffsets(prev => ({
          ...prev,
          [focusedColumn]: Math.min(Math.max(0, list.length - limit), prev[focusedColumn] + 1)
        }));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, focusedColumn, notes]);

  if (!isActive) return null;

  const CATEGORY_COLORS: Record<string, string> = {
    'PROCESS': '#3b82f6',
    'TASK': '#d97706',
    'NOTE': '#10b981',
    'KPI': '#ec4899',
    'FOKUS': '#ff9b5a'
  };

  const COL_CONFIG = {
    LEFT: { x: -2.6, width: 2.3, label: 'PROZESSE' },
    CENTER: { x: 0, width: 2.6, label: 'AUFGABEN' },
    RIGHT: { x: 2.6, width: 2.3, label: 'NOTIZEN & KPIS' }
  };

  const Column = ({ type }: { type: ColumnType }) => {
    const config = COL_CONFIG[type];
    const list = getColumnList(type);
    const offset = scrollOffsets[type];
    const limit = type === 'RIGHT' ? 3 : 5;
    const visible = list.slice(offset, offset + limit);
    const isFocused = focusedColumn === type;
    const hasMore = list.length > limit;

    const hasFokusNote = notes.filter(n => n.category === 'FOKUS').length > 0;

    return (
      <group position={[config.x, 0, 0.015]}>
        {/* LEFT Spalte: PROZESSE */}
        {type === 'LEFT' && (
          <>
            <Text 
              position={[0, 2.02, 0]} 
              fontSize={0.17} 
              color={isFocused ? "#ffffff" : "#a0a0a0"} 
              anchorX="center" 
              font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf"
            >
              {`PROZESSE · ${list.length}`}
            </Text>
            {/* Header Underline (Blau) */}
            <mesh position={[0, 1.92, 0.012]}>
              <planeGeometry args={[config.width, 0.01]} />
              <meshBasicMaterial color="#4a9eff" transparent opacity={0.85} />
            </mesh>
            {/* Cards Stack */}
            <group position={[0, 1.54, 0]}>
              {visible.map((n, i) => (
                 <NoteCard 
                   key={n.id} 
                   note={n} 
                   index={i} 
                   colWidth={config.width} 
                   showRemove={true} 
                   onDelete={handleDelete}
                   categoryColors={CATEGORY_COLORS}
                   isFirstInFocusedColumn={isFocused && i === 0}
                 />
              ))}
            </group>
          </>
        )}

        {/* CENTER Spalte: HEUTIGER FOKUS & AUFGABEN */}
        {type === 'CENTER' && (
          <>
            {/* HEUTIGER FOKUS Header */}
            <Text 
              position={[0, 2.02, 0]} 
              fontSize={0.17} 
              color="#ff9b5a" 
              anchorX="center" 
              font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf"
            >
              HEUTIGER FOKUS
            </Text>
            {/* Fokus Underline (Warm-Orange) */}
            <mesh position={[0, 1.92, 0.012]}>
              <planeGeometry args={[config.width, 0.01]} />
              <meshBasicMaterial color="#ff9b5a" transparent opacity={0.85} />
            </mesh>
            
            {/* Fokus Card / Placeholder Slot */}
            {hasFokusNote ? (
              <group position={[0, 1.54, 0]}>
                {notes.filter(n => n.category === 'FOKUS').slice(0, 1).map((n) => (
                  <NoteCard 
                    key={n.id} 
                    note={n} 
                    index={0} 
                    colWidth={config.width} 
                    showRemove={true} 
                    onDelete={handleDelete}
                    categoryColors={CATEGORY_COLORS}
                    isFirstInFocusedColumn={false}
                  />
                ))}
              </group>
            ) : (
              <group position={[0, 1.54, 0.05]}>
                <RoundedBox args={[config.width, 0.45, 0.01]} radius={0.05} smoothness={4}>
                  <meshStandardMaterial 
                    color="#141419" 
                    transparent 
                    opacity={0.4} 
                    roughness={0.8}
                  />
                </RoundedBox>
                {/* Visual dotted border outline */}
                <RoundedBox args={[config.width + 0.02, 0.47, 0.005]} radius={0.05} smoothness={4} position={[0, 0, -0.002]}>
                  <meshStandardMaterial color="#3a3f4b" transparent opacity={0.3} />
                </RoundedBox>
                <Text
                  position={[0, 0, 0.01]}
                  fontSize={0.09}
                  color="#6e7686"
                  anchorX="center"
                  anchorY="middle"
                  font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf"
                >
                  Heutigen Fokus hier ablegen
                </Text>
              </group>
            )}

            {/* AUFGABEN Header */}
            <Text 
              position={[0, 0.82, 0]} 
              fontSize={0.17} 
              color={isFocused ? "#ffffff" : "#a0a0a0"} 
              anchorX="center" 
              font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf"
            >
              {`AUFGABEN · ${list.length}`}
            </Text>
            {/* Aufgaben Underline (Orange) */}
            <mesh position={[0, 0.72, 0.012]}>
              <planeGeometry args={[config.width, 0.01]} />
              <meshBasicMaterial color="#ff9f4a" transparent opacity={0.85} />
            </mesh>
            {/* Aufgaben Cards Stack */}
            <group position={[0, 0.35, 0]}>
              {visible.map((n, i) => (
                 <NoteCard 
                   key={n.id} 
                   note={n} 
                   index={i} 
                   colWidth={config.width} 
                   showRemove={true} 
                   onDelete={handleDelete}
                   categoryColors={CATEGORY_COLORS}
                   isFirstInFocusedColumn={isFocused && i === 0}
                 />
              ))}
            </group>
          </>
        )}

        {/* RIGHT Spalte: NOTIZEN & KPIS */}
        {type === 'RIGHT' && (
          <>
            <Text 
              position={[0, 2.02, 0]} 
              fontSize={0.17} 
              color={isFocused ? "#ffffff" : "#a0a0a0"} 
              anchorX="center" 
              font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf"
            >
              {`NOTIZEN & KPIS · ${list.length}`}
            </Text>
            {/* Header Underline (Grün) */}
            <mesh position={[0, 1.92, 0.017]}>
              <planeGeometry args={[config.width, 0.01]} />
              <meshBasicMaterial color="#5af09a" transparent opacity={0.85} />
            </mesh>

            {/* KPI Grid Section */}
            <group position={[0, 0, 0]}>
              <KPICard x={-0.55} y={1.54} value="12" label="OFFENE TASKS" color="#d97706" />
              <KPICard x={0.55} y={1.54} value="3" label="AKTIVE PROZESSE" color="#3b82f6" />
              <KPICard x={-0.55} y={1.04} value="85%" label="AGENT-AUSLASTUNG" color="#10b981" />
              <KPICard x={0.55} y={1.04} value="€2.4k" label="WOCHENBUDGET" color="#ec4899" />
            </group>

            {/* Cards Stack */}
            <group position={[0, 0.35, 0]}>
              {visible.map((n, i) => (
                 <NoteCard 
                   key={n.id} 
                   note={n} 
                   index={i} 
                   colWidth={config.width} 
                   showRemove={true} 
                   onDelete={handleDelete}
                   categoryColors={CATEGORY_COLORS}
                   isFirstInFocusedColumn={isFocused && i === 0}
                 />
              ))}
            </group>
          </>
        )}

        {/* Scroll Indicators */}
        {isFocused && hasMore && (
          <group position={[config.width/2 - 0.1, -2.1, 0.05]}>
             <Text fontSize={0.1} color="#888" anchorX="right">↑↓</Text>
             <Text position={[0, -0.12, 0]} fontSize={0.08} color="#666" anchorX="right">
                {`${offset + visible.length}/${list.length}`}
             </Text>
          </group>
        )}
      </group>
    );
  };

  return (
    <group position={[0, 1.305, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      {/* 1) Pinnwand-Material: Smart-Display-Glas Backing covering the table entirely */}
      <group position={[0, 0, 0]}>
        {/* Fine border outline with rounded corners to match the table shape exactly */}
        <RoundedBox args={[8.05, 5.05, 0.005]} radius={0.1} smoothness={4} position={[0, 0, -0.003]}>
          <meshBasicMaterial color="#3a3f4b" transparent opacity={0.5} />
        </RoundedBox>
        
        {/* Semi-transparent glossy glass sheet conforming perfectly to the 8.0 x 5.0 tabletop */}
        <RoundedBox args={[8.02, 5.02, 0.01]} radius={0.1} smoothness={4}>
          <meshPhysicalMaterial
            color="#0b0d12"
            transparent
            opacity={0.88}
            roughness={0.25}
            metalness={0.15}
            clearcoat={0.6}
            clearcoatRoughness={0.2}
            envMapIntensity={1.0}
          />
        </RoundedBox>
      </group>

      {/* 2) Spalten-Divider: dünne, hochwertige vertikale Linien, neu positioniert für die breitere Fläche */}
      <mesh position={[-1.375, -0.225, 0.015]}>
        <planeGeometry args={[0.015, 4.05]} />
        <meshBasicMaterial color="#3a3f4b" transparent opacity={0.35} />
      </mesh>
      <mesh position={[1.375, -0.225, 0.015]}>
        <planeGeometry args={[0.015, 4.05]} />
        <meshBasicMaterial color="#3a3f4b" transparent opacity={0.35} />
      </mesh>

      {/* Subtiler horizontaler Teiler unter dem Datum */}
      <mesh position={[0, 2.18, 0.015]}>
        <planeGeometry args={[7.5, 0.01]} />
        <meshBasicMaterial color="#3a3f4b" transparent opacity={0.35} />
      </mesh>

      {/* Datum / Title */}
      <group position={[0, 2.34, 0.01]}>
        <Text fontSize={0.16} color="#ffffff" anchorX="center" font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf">
          {getDateLabel(new Date())}
        </Text>
      </group>

      <Column type="LEFT" />
      <Column type="CENTER" />
      <Column type="RIGHT" />
    </group>
  );
};
