import React, { useState, useEffect } from 'react';
import { Text, RoundedBox } from '@react-three/drei';
import { PinnwandEintrag, NoteCard, EntryCategory } from './Pinnwand';
import { getISOWeek } from './pinnwandUtils';

const CATEGORY_COLORS: Record<string, string> = {
  NOTE: '#9ca3af',
  TASK: '#fbbf24',
  PROCESS: '#60a5fa',
  KPI: '#34d399',
  FOKUS: '#ff9b5a'
};

export const Kalender: React.FC<{ isActive: boolean }> = ({ isActive }) => {
  const [notes, setNotes] = useState<PinnwandEintrag[]>([]);
  const currentWeek = getISOWeek(new Date());

  useEffect(() => {
    const stored = localStorage.getItem('konferenzhub.pinnwand.v2');
    if (stored) {
      try {
        setNotes(JSON.parse(stored));
      } catch (err) {
        console.error("Failed to load notes", err);
      }
    }
  }, [isActive]);

  const handleDelete = (id: string, category: EntryCategory) => {
    window.dispatchEvent(new CustomEvent('pinnwand-delete-request', { 
      detail: { id, category } 
    }));
  };

  const days = ['MO', 'DI', 'MI', 'DO', 'FR', 'SA', 'SO'];
  const todayIndex = (new Date().getDay() + 6) % 7; // Convert 0-6 (Sun-Sat) to 0-6 (Mon-Sun)

  return (
    <group position={[0, 1.32, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      
      <group position={[0, 2.3, 0.01]}>
        <Text fontSize={0.16} color="#ffffff" anchorX="center" font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf">
          KALENDERWOCHE {currentWeek}
        </Text>
      </group>

      {days.map((day, dIdx) => {
        const x = -3.3 + dIdx * 1.1;
        const isToday = dIdx === todayIndex;
        const dayNotes = notes.filter(n => {
          const d = new Date(n.createdAt);
          const nWeek = getISOWeek(d);
          const nDay = (d.getDay() + 6) % 7;
          return nWeek === currentWeek && nDay === dIdx;
        });

        return (
          <group key={day} position={[x, 1.9, 0]}>
            <Text position={[0, 0.2, 0.01]} fontSize={0.14} color={isToday ? "#10b981" : "#ffffff"} anchorX="center" font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf">
              {day}
            </Text>
            {isToday && (
              <RoundedBox args={[1.0, 4.0, 0.005]} radius={0.1} smoothness={2} position={[0, -1.5, -0.01]}>
                <meshBasicMaterial color="#10b981" transparent opacity={0.05} />
              </RoundedBox>
            )}
            <group position={[0, -0.1, 0.01]}>
              {dayNotes.slice(0, 5).map((note, i) => (
                <NoteCard 
                  key={note.id} 
                  note={note} 
                  index={i} 
                  colWidth={1.0} 
                  showRemove={true}
                  onDelete={handleDelete}
                  categoryColors={CATEGORY_COLORS}
                />
              ))}
            </group>
          </group>
        );
      })}
    </group>
  );
};
