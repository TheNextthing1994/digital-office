import React, { useState } from 'react';
import { Text, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

type BoardMode = 'PINNWAND' | 'KALENDER' | 'WHITEBOARD' | 'AGENTEN' | 'ROADMAP' | 'VAYBOARD';

interface ModeSwitcher3DProps {
  currentMode: BoardMode;
  onModeChange: (mode: BoardMode) => void;
  position?: [number, number, number];
}

export const ModeSwitcher3D: React.FC<ModeSwitcher3DProps> = ({ currentMode, onModeChange, position = [0, 2.5, -3] }) => {
  const modes: BoardMode[] = ['PINNWAND', 'KALENDER', 'WHITEBOARD', 'AGENTEN', 'ROADMAP', 'VAYBOARD'];
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <group position={position}>
      {/* Background Plate */}
      <RoundedBox args={[modes.length * 1.5 + 0.5, 0.6, 0.05]} radius={0.3} smoothness={4}>
        <meshStandardMaterial color="#0a1a11" transparent opacity={0.9} metalness={0.2} roughness={0.3} />
      </RoundedBox>

      {modes.map((mode, i) => {
        const isActive = currentMode === mode;
        const isHovered = hovered === mode;
        const xPos = (i - (modes.length - 1) / 2) * 1.5;

        return (
          <group 
            key={mode} 
            position={[xPos, 0, 0.04]}
            onClick={(e) => {
              e.stopPropagation();
              onModeChange(mode);
            }}
            onPointerOver={() => {
                setHovered(mode);
                document.body.style.cursor = 'pointer';
            }}
            onPointerOut={() => {
                setHovered(null);
                document.body.style.cursor = 'auto';
            }}
          >
            {/* Button Background */}
            <RoundedBox 
               args={[1.3, 0.45, 0.02]} 
               radius={isActive ? 0.22 : 0.15} 
               smoothness={4}
            >
               <meshStandardMaterial 
                 color={isActive ? "#10b981" : (isHovered ? "#ffffff1a" : "transparent")} 
                 transparent={!isActive}
                 opacity={isActive ? 1 : (isHovered ? 0.2 : 0)}
                 emissive={isActive ? "#10b981" : "#000000"}
                 emissiveIntensity={isActive ? 0.5 : 0}
               />
            </RoundedBox>

            {isActive && (
              <mesh position={[0, 0, -0.01]}>
                <planeGeometry args={[1.4, 0.55]} />
                <meshBasicMaterial color="#10b981" transparent opacity={0.3} />
              </mesh>
            )}

            <Text
              fontSize={0.12}
              color={isActive ? "white" : (isHovered ? "#ffffff" : "#ffffff66")}
              font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf"
              anchorX="center"
              anchorY="middle"
              position={[0, 0, 0.02]}
            >
              {mode}
            </Text>
          </group>
        );
      })}
    </group>
  );
};

interface WorldSpaceInputProps {
    value: string;
    onAdd: () => void;
    onCancel: () => void;
    position?: [number, number, number];
    title: string;
}

export const WorldSpaceInput: React.FC<WorldSpaceInputProps> = ({ value, onAdd, onCancel, position = [4, 1.5, 0], title }) => {
    const [hoveredBtn, setHoveredBtn] = useState<string | null>(null);

    return (
        <group position={position} rotation={[0, -Math.PI / 4, 0]}>
            {/* Panel Background */}
            <RoundedBox args={[3, 1.8, 0.05]} radius={0.2} smoothness={4}>
                <meshStandardMaterial color="#141419" transparent opacity={0.95} metalness={0.2} roughness={0.4} />
            </RoundedBox>

            <Text
                position={[0, 0.6, 0.06]}
                fontSize={0.15}
                color="#10b981"
                anchorX="center"
                font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf"
            >
                {title}
            </Text>

            {/* Simulated Input Box */}
            <RoundedBox args={[2.6, 0.4, 0.02]} radius={0.05} smoothness={2} position={[0, 0.1, 0.04]}>
                <meshStandardMaterial color="#00000033" />
            </RoundedBox>
            
            <Text
                position={[-1.2, 0.1, 0.07]}
                fontSize={0.12}
                color={value ? "#ffffff" : "#666666"}
                anchorX="left"
                maxWidth={2.4}
                font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf"
            >
                {value || "Text hier eingeben..."}
            </Text>

            {/* Buttons */}
            <group position={[0, -0.4, 0.04]}>
                <group 
                    position={[-0.7, 0, 0]}
                    onClick={onCancel}
                    onPointerOver={() => setHoveredBtn('no')}
                    onPointerOut={() => setHoveredBtn(null)}
                >
                    <RoundedBox args={[1.2, 0.4, 0.02]} radius={0.1} smoothness={2}>
                        <meshStandardMaterial color={hoveredBtn === 'no' ? "#ffffff22" : "#ffffff11"} />
                    </RoundedBox>
                    <Text fontSize={0.1} color="white" position={[0, 0, 0.02]}>ABBRECHEN</Text>
                </group>

                <group 
                    position={[0.7, 0, 0]}
                    onClick={onAdd}
                    onPointerOver={() => setHoveredBtn('yes')}
                    onPointerOut={() => setHoveredBtn(null)}
                >
                    <RoundedBox args={[1.2, 0.4, 0.02]} radius={0.1} smoothness={2}>
                        <meshStandardMaterial color={hoveredBtn === 'yes' ? "#10b981" : "#064e3b"} />
                    </RoundedBox>
                    <Text fontSize={0.1} color="white" position={[0, 0, 0.02]}>HINZUFUEGEN</Text>
                </group>
            </group>

            <Text
                position={[0, -0.75, 0.06]}
                fontSize={0.08}
                color="#888"
                maxWidth={2.6}
                textAlign="center"
                font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf"
            >
                Nutze die Tastatur deines PCs zum Tippen
            </Text>
        </group>
    );
};

export const WorldSpaceDeleteConfirm: React.FC<{
    onConfirm: () => void,
    onCancel: () => void,
    message: string
}> = ({ onConfirm, onCancel, message }) => {
    const [hoveredBtn, setHoveredBtn] = useState<string | null>(null);

    return (
        <group position={[0, 2, 0]} rotation={[Math.PI / 6, 0, 0]}>
             <RoundedBox args={[3.2, 1.4, 0.05]} radius={0.2} smoothness={4}>
                <meshStandardMaterial color="#141419" transparent opacity={0.98} metalness={0.2} roughness={0.4} />
            </RoundedBox>

            <Text
                position={[0, 0.2, 0.06]}
                fontSize={0.13}
                color="#ffffff"
                anchorX="center"
                maxWidth={2.8}
                textAlign="center"
                font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf"
            >
                {message}
            </Text>

             <group position={[0, -0.35, 0.04]}>
                <group 
                    position={[-0.7, 0, 0]}
                    onClick={onCancel}
                    onPointerOver={() => setHoveredBtn('no')}
                    onPointerOut={() => setHoveredBtn(null)}
                >
                    <RoundedBox args={[1.2, 0.35, 0.02]} radius={0.1} smoothness={2}>
                        <meshStandardMaterial color={hoveredBtn === 'no' ? "#ffffff22" : "#ffffff11"} />
                    </RoundedBox>
                    <Text fontSize={0.1} color="white" position={[0, 0, 0.02]}>NEIN</Text>
                </group>

                <group 
                    position={[0.7, 0, 0]}
                    onClick={onConfirm}
                    onPointerOver={() => setHoveredBtn('yes')}
                    onPointerOut={() => setHoveredBtn(null)}
                >
                    <RoundedBox args={[1.2, 0.35, 0.02]} radius={0.1} smoothness={2}>
                        <meshStandardMaterial color={hoveredBtn === 'yes' ? "#ef4444" : "#991b1b"} />
                    </RoundedBox>
                    <Text fontSize={0.1} color="white" position={[0, 0, 0.02]}>JA, LOESCHEN</Text>
                </group>
            </group>
        </group>
    );
};
