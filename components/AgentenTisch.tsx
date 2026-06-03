import React from 'react';
import { Text, RoundedBox } from '@react-three/drei';

interface AgentCardProps {
  name: string;
  role: string;
  color: string;
  position: [number, number, number];
}

const AgentCard: React.FC<AgentCardProps> = ({ name, role, color, position }) => {
  return (
    <group position={position}>
      <RoundedBox args={[2.6, 1.7, 0.02]} radius={0.15} smoothness={4}>
        <meshStandardMaterial color="#141419" metalness={0.2} roughness={0.5} />
      </RoundedBox>
      <RoundedBox args={[2.6, 0.1, 0.01]} radius={0.05} smoothness={2} position={[0, 0.8, 0.02]}>
        <meshBasicMaterial color={color} />
      </RoundedBox>
      <Text position={[0, 0.1, 0.05]} fontSize={0.22} color="white" anchorX="center" font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf">
        {name}
      </Text>
      <Text position={[0, -0.2, 0.05]} fontSize={0.12} color="#10b981" font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf">
        {role}
      </Text>
      <Text position={[0, -0.6, 0.05]} fontSize={0.10} color="#888" font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf">
        BALD VERFUEGBAR
      </Text>
    </group>
  );
};

export const AgentenTisch: React.FC<{ isActive: boolean }> = ({ isActive }) => {
  if (!isActive) return null;
  return (
    <group rotation={[-Math.PI / 2, 0, 0]} position={[0, 1.32, 0]}>

      <AgentCard name="OPS" role="Betrieb" color="#3b82f6" position={[-2.2, 0.9, 0.05]} />
      <AgentCard name="STRATEGIE" role="Planung" color="#f59e0b" position={[2.2, 0.9, 0.05]} />
      <AgentCard name="SCOUT" role="Recherche" color="#10b981" position={[-2.2, -0.9, 0.05]} />
      <AgentCard name="CREATIVE" role="Design" color="#8b5cf6" position={[2.2, -0.9, 0.05]} />
    </group>
  );
};
