import React, { useState, useEffect, useRef } from 'react';
import { Text, RoundedBox } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export interface WhiteboardNote {
  id: string;
  text: string;
  x: number;
  z: number;
  color: string;
  rotationZ: number;
  createdAt: string;
}

const StickyNote = ({ note, onDelete }: { note: WhiteboardNote, onDelete: (id: string) => void }) => {
  const [isHovered, setIsHovered] = useState(false);
  const groupRef = useRef<THREE.Group>(null);
  const mountTimer = useRef(0);
  const baselineY = 1.32; // Just above table

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    if (mountTimer.current < 1) {
      mountTimer.current += delta * 2.5;
      const progress = Math.min(mountTimer.current, 1);
      groupRef.current.position.y = THREE.MathUtils.lerp(baselineY - 0.05, baselineY, progress);
      groupRef.current.scale.setScalar(THREE.MathUtils.lerp(0.8, 1, progress));
    }
  });

  return (
    <group 
      ref={groupRef}
      position={[note.x, baselineY, note.z]} 
      rotation={[-Math.PI / 2, 0, note.rotationZ]}
    >
      <mesh receiveShadow>
        <planeGeometry args={[0.7, 0.7]} />
        <meshBasicMaterial color={note.color} transparent opacity={0.9} />
      </mesh>
      
      <Text
        position={[0, 0, 0.01]}
        fontSize={0.06}
        color="#333"
        maxWidth={0.6}
        textAlign="center"
        anchorX="center"
        anchorY="middle"
        font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf"
      >
        {note.text}
      </Text>

      <group 
        position={[0.28, 0.28, 0.02]}
        onClick={(e) => { e.stopPropagation(); onDelete(note.id); }}
        onPointerOver={() => { setIsHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { setIsHovered(false); document.body.style.cursor = 'auto'; }}
      >
        <Text fontSize={0.08} color={isHovered ? "#ff0000" : "#333"} fillOpacity={isHovered ? 1 : 0.4}>×</Text>
        <mesh><planeGeometry args={[0.2, 0.2]} /><meshBasicMaterial transparent opacity={0} /></mesh>
      </group>
    </group>
  );
};

export const Whiteboard: React.FC<{ isActive: boolean }> = ({ isActive }) => {
  const [notes, setNotes] = useState<WhiteboardNote[]>([]);
  const [mainText, setMainText] = useState("");

  useEffect(() => {
    if (!isActive) return;
    const stored = localStorage.getItem('konferenzhub.whiteboard.v1');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setNotes(parsed);
        }
      } catch (e) {}
    }
    
    setMainText(localStorage.getItem('konferenzhub.whiteboard.mainText') || "");

    const handleSync = () => {
      const updated = localStorage.getItem('konferenzhub.whiteboard.v1');
      if (updated) setNotes(JSON.parse(updated));
      setMainText(localStorage.getItem('konferenzhub.whiteboard.mainText') || "");
    };
    window.addEventListener('whiteboard-notes-updated', handleSync);
    return () => window.removeEventListener('whiteboard-notes-updated', handleSync);
  }, [isActive]);

  const handleDelete = (id: string) => {
    window.dispatchEvent(new CustomEvent('whiteboard-delete-request', { detail: { id } }));
  };

  if (!isActive) return null;

  return (
    <group>

      {/* Main Persistent Text */}
      <Text
        position={[0, 1.35, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.2}
        color="#ffffff"
        maxWidth={7}
        textAlign="center"
        anchorX="center"
        anchorY="middle"
        font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf"
      >
        {mainText || "Hier tippen (UI unten)..."}
      </Text>

      {notes.map(note => (
        <StickyNote key={note.id} note={note} onDelete={handleDelete} />
      ))}
    </group>
  );
};
