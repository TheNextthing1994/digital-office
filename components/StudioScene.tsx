
/// <reference types="react" />
import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame, ThreeElements } from '@react-three/fiber';
import { OrbitControls, Text, RoundedBox, ContactShadows, Float, MeshReflectorMaterial, useCursor, PointerLockControls, Stars, Sky, Cloud, Billboard } from '@react-three/drei';
import { XR, createXRStore, useXR, useXRInputSourceState, XROrigin } from '@react-three/xr';
import * as THREE from 'three';
import { PersonaType } from '../types';
import { Cowboy } from './Cowboy';
import { Soldier } from './Soldier';

// Typ-Erweiterung für JSX-Intrinsics
declare global {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}

// Shared materials for avatars to stay within WebGL budget
const SHARED_MATERIALS = {
  PLAYER: new THREE.MeshStandardMaterial({ color: "#2563eb", roughness: 0.3, metalness: 0.2 }),
  CHIEF_OF_STAFF: new THREE.MeshStandardMaterial({ color: "#222222", roughness: 0.1, metalness: 0.1 }),
  HEAD: new THREE.MeshStandardMaterial({ color: "white", roughness: 0.2 }),
  ACCENT: new THREE.MeshStandardMaterial({ color: "#888", metalness: 1, roughness: 0.1 }),
  DARK: new THREE.MeshStandardMaterial({ color: "#111" }),
  METAL: new THREE.MeshStandardMaterial({ color: "#222", metalness: 0.5 }),
  HIGHLIGHT: new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: "#ffffff", emissiveIntensity: 2, transparent: true, opacity: 0.3 })
};

const Avatar = React.forwardRef<THREE.Group, { 
  type: PersonaType, 
  position: [number, number, number], 
  rotation?: [number, number, number],
  isSpeaking: boolean,
  isSelected: boolean,
  isMoving: boolean,
  onSelect: () => void,
  isDayMode?: boolean,
  isPunching?: boolean,
  visible?: boolean
}>(({ 
  type, 
  position, 
  rotation = [0, 0, 0],
  isSpeaking,
  isSelected,
  isMoving,
  onSelect,
  isDayMode = false,
  isPunching = false,
  visible = true
}, ref) => {
  const headRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Mesh>(null);
  const bodyGroupRef = useRef<THREE.Group>(null);
  const punchAnim = useRef(0);
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);
  
  useFrame((state, delta) => {
    if (isSpeaking && headRef.current) {
      headRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 10) * 0.1;
    }

    // Walking animation (Wobble)
    if (isMoving && bodyGroupRef.current) {
      bodyGroupRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 10) * 0.05;
      bodyGroupRef.current.position.y = Math.abs(Math.sin(state.clock.elapsedTime * 10)) * 0.05;
    } else if (bodyGroupRef.current) {
      bodyGroupRef.current.rotation.z = THREE.MathUtils.lerp(bodyGroupRef.current.rotation.z, 0, 0.1);
      bodyGroupRef.current.position.y = THREE.MathUtils.lerp(bodyGroupRef.current.position.y, 0, 0.1);
    }

    // Punch animation logic: Fast forward, slow back
    if (isPunching) {
      punchAnim.current = Math.min(punchAnim.current + delta * 12, 1); // Punch speed (fast)
    } else {
      punchAnim.current = Math.max(punchAnim.current - delta * 3, 0); // Return speed (slow)
    }

    if (rightArmRef.current) {
      // Rotate right arm forward and slightly inward
      rightArmRef.current.rotation.x = -punchAnim.current * Math.PI * 0.6;
      rightArmRef.current.rotation.z = -0.2 - punchAnim.current * 0.2;
      // Also shift position slightly forward during punch
      rightArmRef.current.position.z = punchAnim.current * 0.15;
    }
  });

  const material = useMemo(() => {
    switch(type) {
      case PersonaType.PLAYER: return SHARED_MATERIALS.PLAYER;
      case PersonaType.CHIEF_OF_STAFF: return SHARED_MATERIALS.CHIEF_OF_STAFF;
      default: return SHARED_MATERIALS.PLAYER;
    }
  }, [type]);

  return (
    <group 
      ref={ref}
      position={position} 
      rotation={rotation} 
      scale={1.4}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      visible={visible}
    >
      <group ref={bodyGroupRef}>
        {/* Body - Main Torso */}
        <mesh position={[0, 0.5, 0]} castShadow material={material}>
          <capsuleGeometry args={[0.2, 0.4, 4, 16]} />
        </mesh>
        
        {/* Head */}
        <group ref={headRef} position={[0, 1.05, 0]}>
          <mesh castShadow material={SHARED_MATERIALS.HEAD}>
            <sphereGeometry args={[0.18, 32, 32]} />
          </mesh>
          {/* Eyes */}
          <mesh position={[-0.06, 0.04, -0.15]}>
            <sphereGeometry args={[0.02, 16, 16]} />
            <meshBasicMaterial color="black" />
          </mesh>
          <mesh position={[0.06, 0.04, -0.15]}>
            <sphereGeometry args={[0.02, 16, 16]} />
            <meshBasicMaterial color="black" />
          </mesh>
          {/* Mouth */}
          <mesh position={[0, -0.04, -0.15]} rotation={[-0.2, 0, 0]}>
            <torusGeometry args={[0.04, 0.005, 8, 16, Math.PI]} />
            <meshBasicMaterial color="black" />
          </mesh>
        </group>

        {/* Arms */}
        <mesh position={[-0.28, 0.6, 0]} castShadow rotation={[0, 0, 0.2]} material={material}>
          <capsuleGeometry args={[0.06, 0.3, 4, 8]} />
        </mesh>
        <mesh ref={rightArmRef} position={[0.28, 0.6, 0]} castShadow rotation={[0, 0, -0.2]} material={material}>
          <capsuleGeometry args={[0.06, 0.3, 4, 8]} />
        </mesh>

        {/* Legs */}
        <mesh position={[-0.1, 0.15, 0]} castShadow material={material}>
          <capsuleGeometry args={[0.07, 0.25, 4, 8]} />
        </mesh>
        <mesh position={[0.1, 0.15, 0]} castShadow material={material}>
          <capsuleGeometry args={[0.07, 0.25, 4, 8]} />
        </mesh>

        {/* Hands */}
        <mesh position={[-0.32, 0.45, 0.05]} castShadow material={SHARED_MATERIALS.ACCENT}>
          <sphereGeometry args={[0.05, 16, 16]} />
        </mesh>
        <mesh position={[0.32, 0.45, 0.05]} castShadow material={SHARED_MATERIALS.ACCENT}>
          <sphereGeometry args={[0.05, 16, 16]} />
        </mesh>
      </group>

      {/* Selection Ground Ring */}
      {isSelected && (
        <group position={[0, -0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <mesh>
            <ringGeometry args={[0.7, 0.75, 64]} />
            <meshBasicMaterial color={type === PersonaType.PLAYER ? "#2563eb" : "#ffffff"} transparent opacity={0.6} />
          </mesh>
        </group>
      )}

      {/* Floating Indicator for Selected */}
      {isSelected && (
        <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
          <mesh position={[0, 1.8, 0]} rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[0.1, 0.2, 3]} />
            <meshBasicMaterial color={type === PersonaType.PLAYER ? "#2563eb" : "#ffffff"} />
          </mesh>
        </Float>
      )}

      <Billboard
        follow={true}
        lockX={false}
        lockY={false}
        lockZ={false}
        position={[0, 1.6, 0]}
      >
        <Text 
          fontSize={0.12} 
          color="white" 
          anchorX="center" 
          outlineWidth={0.005} 
          outlineColor="#000"
        >
          {type === PersonaType.PLAYER ? "DU (PLAYER)" : "CHIEF OF STAFF"}
        </Text>
      </Billboard>

      {isSpeaking && !isDayMode && <pointLight color={material.color} intensity={5} distance={3} position={[0, 1, 0.5]} />}
    </group>
  );
});

const CeilingLights = () => {
  const lightCount = 15;
  const cols = 5;
  const rows = 3;
  const spacingX = 4;
  const spacingZ = 4;

  const lights = useMemo(() => {
    const arr = [];
    for (let i = 0; i < lightCount; i++) {
      const x = (i % cols - (cols - 1) / 2) * spacingX;
      const z = (Math.floor(i / cols) - (rows - 1) / 2) * spacingZ;
      arr.push([x, 11, z]);
    }
    return arr;
  }, []);

  return (
    <group>
      {/* Lights stay, but roof plate is removed */}
      {lights.map((pos, idx) => (
        <group key={idx} position={pos as [number, number, number]}>
          <mesh>
            <cylinderGeometry args={[0.15, 0.2, 0.4, 16]} />
            <meshStandardMaterial color="#111" />
          </mesh>
          <mesh position={[0, -0.2, 0]} rotation={[Math.PI, 0, 0]}>
            <sphereGeometry args={[0.12, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="white" emissive="white" emissiveIntensity={10} />
          </mesh>
          <spotLight
            position={[0, -0.1, 0]}
            angle={0.6}
            penumbra={0.5}
            intensity={180}
            distance={25}
            castShadow={[1, 13].includes(idx)} // Reduced to 2 shadow-casting lights for budget
            shadow-mapSize={[512, 512]}
            color="#ffffff"
            target-position={[pos[0] * 0.5, 0, pos[2] * 0.5]}
          />
        </group>
      ))}
    </group>
  );
};
const PodcastTable = ({ isDayMode, position = [0, 0, 0] }: { isDayMode: boolean; position?: [number, number, number] }) => {
  return (
    <group position={position}>
      {/* Table Top - High quality glass (milky) */}
      <RoundedBox args={[8, 0.2, 5]} radius={0.1} smoothness={4} position={[0, 1.2, 0]} castShadow={false} receiveShadow={false}>
        <meshPhysicalMaterial 
          color="#dfe4e8"
          transmission={0.78}
          thickness={1.2}
          roughness={0.18}
          ior={1.5}
          transparent={true}
          opacity={1}
          metalness={0}
          clearcoat={1}
          clearcoatRoughness={0.1}
          reflectivity={0.5}
          attenuationDistance={0.5}
          attenuationColor="#ffffff"
          envMapIntensity={1}
        />
      </RoundedBox>
      
      {/* Neon Underlight - Only in Night Mode */}
      {!isDayMode && (
        <mesh position={[0, 1.15, 0]} castShadow={false}>
          <boxGeometry args={[7.8, 0.05, 4.8]} />
          <meshStandardMaterial color="#4f46e5" emissive="#4f46e5" emissiveIntensity={3} transparent opacity={0.4} />
        </mesh>
      )}

      {/* Modern Center Pillar */}
      <mesh position={[0, 0.6, 0]} castShadow>
        <cylinderGeometry args={[0.6, 1, 1.2, 32]} />
        <meshStandardMaterial 
          color="#2a2a2a" 
          transparent={true}
          opacity={0.7}
          metalness={0.1} 
          roughness={0.7} 
        />
      </mesh>
      
      {/* Chrome support ring */}
      <mesh position={[0, 1.1, 0]} rotation={[Math.PI/2, 0, 0]} castShadow={false}>
        <torusGeometry args={[0.7, 0.05, 16, 48]} />
        <meshStandardMaterial color="#888" metalness={1} roughness={0.1} />
      </mesh>
    </group>
  );
};

const ProceduralGrass = ({ isDayMode }: { isDayMode: boolean }) => {
  const tufts = useMemo(() => {
    if (!isDayMode) return [];
    const count = 300; // Increased density
    const items = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 6 + Math.random() * 40;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      
      const height = 0.2 + Math.random() * 0.5;
      const scale = 0.6 + Math.random() * 1.2;
      const rotation = Math.random() * Math.PI;
      
      items.push({ position: [x, 0, z] as [number, number, number], height, scale, rotation });
    }
    return items;
  }, [isDayMode]);

  if (!isDayMode) return null;

  return (
    <group>
      {tufts.map((tuft, i) => (
        <group key={i} position={tuft.position} rotation={[0, tuft.rotation, 0]} scale={tuft.scale}>
          {/* Tapered grass blades using cylinders for organic feel */}
          <mesh position={[0, tuft.height / 2, 0]} rotation={[0.1, 0, 0.05]}>
            <cylinderGeometry args={[0.005, 0.04, tuft.height, 8]} />
            <meshStandardMaterial color="#2d5a27" roughness={1} />
          </mesh>
          <mesh position={[0.03, tuft.height * 0.4, 0.03]} rotation={[-0.15, 0.5, -0.1]}>
            <cylinderGeometry args={[0.002, 0.03, tuft.height * 0.8, 8]} />
            <meshStandardMaterial color="#3e8e2d" roughness={1} />
          </mesh>
          <mesh position={[-0.04, tuft.height * 0.35, -0.02]} rotation={[0.2, -0.8, 0.15]}>
            <cylinderGeometry args={[0.003, 0.035, tuft.height * 0.7, 8]} />
            <meshStandardMaterial color="#4caf50" roughness={1} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

const StudioEnvironment = ({ isDayMode }: { isDayMode: boolean }) => {
  return (
    <group>
      {isDayMode ? (
        <>
          <Sky distance={450000} sunPosition={[10, 20, 10]} inclination={0} azimuth={0.25} />
          <Cloud 
            opacity={0.8}
            speed={0.2} 
            segments={40} 
            position={[-20, 25, -20]} 
            color="#ffffff"
          />
          <Cloud 
            opacity={0.6}
            speed={0.3} 
            segments={40} 
            position={[25, 20, 25]} 
            color="#f0f0f0"
          />
          <Cloud 
            opacity={0.7}
            speed={0.1} 
            segments={50} 
            position={[0, 30, -50]} 
            color="#ffffff"
          />
          <Cloud 
            opacity={0.5}
            speed={0.5} 
            segments={30} 
            position={[-30, 18, 40]} 
            color="#eef2ff"
          />
          <directionalLight
            position={[10, 20, 10]}
            intensity={3}
            castShadow
            shadow-mapSize={[2048, 2048]}
          />
          <hemisphereLight intensity={0.8} groundColor="#a1a1a1" color="#ffffff" />
          <ProceduralGrass isDayMode={isDayMode} />
        </>
      ) : (
        <>
          <CeilingLights />
          <Stars radius={150} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        </>
      )}
      
      <PodcastTable isDayMode={isDayMode} position={[0, 0, 0]} />
      <PodcastTable isDayMode={isDayMode} position={[-20, 0, -16]} />
      <PodcastTable isDayMode={isDayMode} position={[20, 0, -16]} />
      
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        {isDayMode ? (
          <meshStandardMaterial color="#2d5a27" roughness={1} metalness={0} />
        ) : (
          <MeshReflectorMaterial
            resolution={512}
            mixBlur={0}
            mixStrength={40}
            roughness={0.8}
            depthScale={1.2}
            minDepthThreshold={0.4}
            maxDepthThreshold={1.4}
            color="#1a1a1a"
            metalness={0.6}
          />
        )}
      </mesh>
      {!isDayMode && <gridHelper args={[100, 50, "#222", "#111"]} position={[0, 0, 0]} />}
    </group>
  );
};

// ... (Existing CeilingLights and StudioEnvironment components remain same)
import { Pinnwand, EntryCategory } from './Pinnwand';
import { Kalender } from './Kalender';
import { Whiteboard } from './Whiteboard';
import { AgentenTisch } from './AgentenTisch';
import { DesktopDashboard } from './DesktopDashboard';

type BoardMode = 'PINNWAND' | 'KALENDER' | 'WHITEBOARD' | 'AGENTEN' | 'ROADMAP' | 'VAYBOARD';

const SceneContent = ({ 
  controlledType, 
  cameraMode, 
  setControlledType, 
  nearbyTarget, 
  activeSpeaker, 
  onInteract, 
  setNearbyTarget, 
  mobileInput, 
  isTheaterMode, 
  isDayMode, 
  isBoardOpen, 
  setIsBoardOpen,
  isNearTable,
  setIsNearTable, 
  boardMode,
  isVRActive
}: {
  controlledType: PersonaType | null,
  cameraMode: 'orbit' | 'tps' | 'topdown',
  setControlledType: (t: PersonaType | null) => void,
  nearbyTarget: PersonaType | null,
  activeSpeaker: PersonaType | null,
  onInteract?: (target: PersonaType) => void,
  setNearbyTarget: (t: PersonaType | null) => void,
  mobileInput: { w: boolean, s: boolean, a: boolean, d: boolean },
  isTheaterMode?: boolean,
  isDayMode: boolean,
  isBoardOpen: boolean,
  setIsBoardOpen: (open: boolean) => void,
  isNearTable: boolean,
  setIsNearTable: (near: boolean) => void,
  boardMode: BoardMode,
  isVRActive: boolean
}) => {
  const avatarRefs = useRef<Record<string, THREE.Group | null>>({});
  const moveSpeed = 0.12;
  const rotationSpeed = 0.15;
  const keys = useRef<Record<string, boolean>>({});
  const zoom = useRef(6);
  const selectionTime = useRef(0);
  
  // VR Teleportation state
  const lastTriggerPressed = useRef<Record<string, boolean>>({});

  const handleVRTeleport = (point: THREE.Vector3) => {
    const avatar = avatarRefs.current[PersonaType.PLAYER];
    if (avatar) {
      avatar.position.x = point.x;
      avatar.position.z = point.z;
      // Also update the position ref so it survives
      currentPositions.current[PersonaType.PLAYER] = [point.x, groundY, point.z];
      setXrOriginPos([point.x, 0, point.z]);
    }
  };
  const isJumping = useRef(false);
  const jumpVelocity = useRef(0);
  const [isPunching, setIsPunching] = useState(false);
  const [canLock, setCanLock] = useState(true);
  const lockTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const gravity = -0.015;
  const jumpForce = 0.35;
  const groundY = 0.06;

  // Store current positions to survive re-renders from parent
  const currentPositions = useRef<Record<string, [number, number, number]>>({
    [PersonaType.PLAYER]: [0, 0.06, -4.2],
    [PersonaType.CHIEF_OF_STAFF]: [0, 0.06, 4.2]
  });

  // Handle selection zoom transition
  useEffect(() => {
    if (controlledType) {
      selectionTime.current = Date.now();
    }
  }, [controlledType]);

  useEffect(() => {
    if (isBoardOpen) {
      // Pinnwand wurde geöffnet — PointerLock sofort freigeben
      if (document.pointerLockElement) {
        document.exitPointerLock();
      }
      setCanLock(false); // Verhindert dass PointerLockControls wieder gemountet wird
    }
  }, [isBoardOpen]);

  // No obstacles as per user request for free movement
  const OBSTACLES: any[] = [];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { 
      // Block controls when typing in inputs or textareas
      const isInput = e.target instanceof HTMLInputElement || 
                      e.target instanceof HTMLTextAreaElement || 
                      (e.target as HTMLElement)?.isContentEditable;
      if (isInput) return;

      keys.current[e.key.toLowerCase()] = true; 
      
      // Interaction key 'e' - only for opening when board is closed
      if (e.key.toLowerCase() === 'e' && !isBoardOpen && nearbyTarget && onInteract) {
        onInteract(nearbyTarget);
      }
      
      // Jumping
      if (e.key === ' ' && !isJumping.current && controlledType && !isBoardOpen) {
        isJumping.current = true;
        jumpVelocity.current = jumpForce;
      }

      // Escape key to close the board if it's open
      if (e.key === 'Escape' && isBoardOpen) {
        // Find the toggle logic - usually we'd need access to setIsBoardOpen here if we wanted to close it via this listener
        // But the user said: "Board wird nur ueber den 'Board schliessen'-Button oder Escape geschlossen."
        // There is another listener for 'e' in StudioScene that toggles.
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = false; };
    const handleBlur = () => { keys.current = {}; };
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0 && controlledType && !isBoardOpen) {
        setIsPunching(true);
      }
    };
    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0) {
        setIsPunching(false);
      }
    };
    const handleWheel = (e: WheelEvent) => {
      if (cameraMode === 'tps') {
        zoom.current = Math.min(Math.max(zoom.current + e.deltaY * 0.01, 2), 25);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('wheel', handleWheel);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('wheel', handleWheel);
    };
  }, [nearbyTarget, onInteract, cameraMode, controlledType]);

  const [movingTypes, setMovingTypes] = useState<Record<string, boolean>>({});
  const [xrOriginPos, setXrOriginPos] = useState<[number, number, number]>([0, 0, 0]);

  useFrame((state) => {
    // Top-Down Camera for Board (only when in VR/simulated VR is active and we want to look down at the 3D tabletop)
    if (isBoardOpen && isVRActive) {
      state.camera.position.lerp(new THREE.Vector3(0, 9, 3), 0.12);
      state.camera.lookAt(0, 0.8, 0);
      return;
    }

    if (!controlledType) return;
    
    const avatar = avatarRefs.current[controlledType];
    if (!avatar) return;

    // Update ref storage with actual current position
    currentPositions.current[controlledType] = [avatar.position.x, avatar.position.y, avatar.position.z];

    // Interaction Range Detection
    const interactionRange = 4.5;
    
    // Check Distance to Table for Board
    const distToTable = avatar.position.distanceTo(new THREE.Vector3(0, groundY, 0));
    setIsNearTable(distToTable < interactionRange);
    
    let closest: PersonaType | null = null;
    let minDist = interactionRange; 

    Object.entries(avatarRefs.current).forEach(([type, ref]) => {
      if (type === controlledType || !ref) return;
      const dist = avatar.position.distanceTo(ref.position);
      if (dist < (nearbyTarget === type ? interactionRange + 0.5 : interactionRange)) {
        if (dist < minDist) {
          minDist = dist;
          closest = type as PersonaType;
        }
      }
    });
    if (closest !== nearbyTarget) setNearbyTarget(closest);

    // Rotation and Movement
    if (isBoardOpen) return; // Freeze movement when board is open

    const moveVec = new THREE.Vector3(0, 0, 0);;
    
    // Merge mobile input with keyboard
    const currentKeys = {
      w: keys.current['w'] || mobileInput.w,
      s: keys.current['s'] || mobileInput.s,
      a: keys.current['a'] || mobileInput.a,
      d: keys.current['d'] || mobileInput.d
    };

    if (cameraMode === 'tps' && document.pointerLockElement) {
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(state.camera.quaternion);
      forward.y = 0;
      forward.normalize();
      
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(state.camera.quaternion);
      right.y = 0;
      right.normalize();

      if (currentKeys.w) moveVec.add(forward);
      if (currentKeys.s) moveVec.sub(forward);
      if (currentKeys.a) moveVec.sub(right);
      if (currentKeys.d) moveVec.add(right);

      if (moveVec.length() > 0) {
        // More direct rotation in TPS mode
        const targetRot = Math.atan2(moveVec.x, moveVec.z) + Math.PI;
        let diff = targetRot - avatar.rotation.y;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        avatar.rotation.y += diff * 0.1;
      }
    } else {
      if (currentKeys.a) avatar.rotation.y += rotationSpeed;
      if (currentKeys.d) avatar.rotation.y -= rotationSpeed;

      if (currentKeys.w) moveVec.z -= 1;
      if (currentKeys.s) moveVec.z += 1;
      moveVec.applyQuaternion(avatar.quaternion);
    }

    const isCurrentlyMoving = moveVec.length() > 0;
    if (movingTypes[controlledType] !== isCurrentlyMoving) {
      setMovingTypes(prev => ({ ...prev, [controlledType]: isCurrentlyMoving }));
    }

    if (isCurrentlyMoving) {
      moveVec.normalize().multiplyScalar(moveSpeed);
      
      const nextX = avatar.position.x + moveVec.x;
      const nextZ = avatar.position.z + moveVec.z;

      const inBounds = nextX > -49 && nextX < 49 && nextZ > -49 && nextZ < 49;
      
      // Table Collision for Center, Left, and Right tables (each is 8x5)
      const tablePadding = 0.8; // Increased padding for tighter collision
      const hitsCenterTable = nextX > -4 - tablePadding && nextX < 4 + tablePadding && 
                              nextZ > -2.5 - tablePadding && nextZ < 2.5 + tablePadding;
      const hitsLeftTable = nextX > -20 - 4 - tablePadding && nextX < -20 + 4 + tablePadding && 
                            nextZ > -16 - 2.5 - tablePadding && nextZ < -16 + 2.5 + tablePadding;
      const hitsRightTable = nextX > 20 - 4 - tablePadding && nextX < 20 + 4 + tablePadding && 
                             nextZ > -16 - 2.5 - tablePadding && nextZ < -16 + 2.5 + tablePadding;
      const hitsTable = hitsCenterTable || hitsLeftTable || hitsRightTable;

      const hitsObstacle = hitsTable || OBSTACLES.some(obs => 
        nextX > obs.minX && nextX < obs.maxX && nextZ > obs.minZ && nextZ < obs.maxZ
      );

      if (inBounds && !hitsObstacle) {
        avatar.position.x = nextX;
        avatar.position.z = nextZ;
      }
    }

    // Physics update (Jumping)
    if (isJumping.current) {
      avatar.position.y += jumpVelocity.current;
      jumpVelocity.current += gravity;

      if (avatar.position.y <= groundY) {
        avatar.position.y = groundY;
        isJumping.current = false;
        jumpVelocity.current = 0;
      }
    }

    // Camera follow logic (Third Person)
    if (controlledType && cameraMode === 'tps') {
      const avatarPos = avatar.position.clone().add(new THREE.Vector3(0, 1.2, 0));
      
      // Selection "Zoom Out" override
      const timeSinceSelection = (Date.now() - selectionTime.current) / 1000;
      let effectiveZoom = zoom.current;
      if (timeSinceSelection < 2.5) {
        // Start wide (15-20 units) and zoom in to effectiveZoom
        const progress = Math.min(timeSinceSelection / 2.5, 1);
        effectiveZoom = THREE.MathUtils.lerp(18, zoom.current, progress);
      }

      if (document.pointerLockElement) {
        const dir = new THREE.Vector3(0, 0, 1).applyQuaternion(state.camera.quaternion);
        const camPos = avatarPos.clone().add(dir.multiplyScalar(effectiveZoom));
        
        // GTA Style: head height is roughly 1.6. avatarPos is at 1.2
        // We want the camera around head height (0.4 above avatarPos) or slightly above
        camPos.y += effectiveZoom * 0.1; // Lowered height multiplier
        state.camera.position.lerp(camPos, 0.2);
      } else {
        const camOffset = new THREE.Vector3(0, 0.3, effectiveZoom).applyQuaternion(avatar.quaternion);
        const lookOffset = new THREE.Vector3(0, 0.4, -10).applyQuaternion(avatar.quaternion);
        const targetCamPos = avatarPos.clone().add(camOffset);
        const targetLookAt = avatarPos.clone().add(lookOffset);
        state.camera.position.lerp(targetCamPos, 0.08);
        state.camera.lookAt(targetLookAt);
      }
    }
  });

  return (
    <>
      {cameraMode === 'tps' && canLock && (
        <PointerLockControls 
          onUnlock={() => {
            setCanLock(false);
            if (lockTimeoutRef.current) clearTimeout(lockTimeoutRef.current);
            lockTimeoutRef.current = setTimeout(() => setCanLock(true), 1200);
          }}
        />
      )}
      <XROrigin position={xrOriginPos} />
    <StudioEnvironment isDayMode={isDayMode} />

      <group position={[0, 1.2, 0]}>
        {/* Placeholder for center logic if needed, but table moved to environment */}
      </group>

      <Avatar 
        ref={(el) => { avatarRefs.current[PersonaType.PLAYER] = el; }}
        type={PersonaType.PLAYER} 
        position={currentPositions.current[PersonaType.PLAYER]} 
        rotation={[0, 0, 0]}
        isSpeaking={activeSpeaker === PersonaType.PLAYER}
        isSelected={controlledType === PersonaType.PLAYER}
        isMoving={!!movingTypes[PersonaType.PLAYER]}
        onSelect={() => setControlledType(PersonaType.PLAYER)}
        isDayMode={isDayMode}
        isPunching={controlledType === PersonaType.PLAYER && isPunching}
        visible={!isBoardOpen}
      />
      
      <Avatar 
        ref={(el) => { avatarRefs.current[PersonaType.CHIEF_OF_STAFF] = el; }}
        type={PersonaType.CHIEF_OF_STAFF} 
        position={isBoardOpen ? [0, 0.06, -4.4] : currentPositions.current[PersonaType.CHIEF_OF_STAFF]} 
        rotation={isBoardOpen ? [0, 0, 0] : [0, Math.PI, 0]}
        isSpeaking={activeSpeaker === PersonaType.CHIEF_OF_STAFF} 
        isSelected={controlledType === PersonaType.CHIEF_OF_STAFF}
        isMoving={!!movingTypes[PersonaType.CHIEF_OF_STAFF]}
        onSelect={() => {}} // Statischer NPC
        isDayMode={isDayMode}
        isPunching={false}
        visible={true}
      />

      <React.Suspense fallback={null}>
        <Cowboy isDayMode={isDayMode} />
      </React.Suspense>

      <React.Suspense fallback={null}>
        <Soldier isDayMode={isDayMode} />
      </React.Suspense>

      {/* 3D Open Board Prompt */}
      {isNearTable && !isBoardOpen && isVRActive && (
        <Billboard
          follow={true}
          lockX={false}
          lockY={false}
          lockZ={false}
          position={[0, 1.85, 2.2]} 
        >
          <group 
            onClick={() => setIsBoardOpen(true)}
            onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
            onPointerOut={() => { document.body.style.cursor = 'auto'; }}
          >
            <mesh>
              <planeGeometry args={[2.2, 0.45]} />
              <meshStandardMaterial 
                color="#6366f1" 
                emissive="#6366f1" 
                emissiveIntensity={1.2} 
                transparent 
                opacity={0.8}
                side={THREE.DoubleSide}
              />
            </mesh>
            <Text position={[0, 0, 0.01]} fontSize={0.12} color="white" font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf">
              PINNWAND ÖFFNEN [E]
            </Text>
          </group>
        </Billboard>
      )}

      {nearbyTarget && !isBoardOpen && isVRActive && (
        <Billboard
          follow={true}
          lockX={false}
          lockY={false}
          lockZ={false}
          position={
            nearbyTarget === PersonaType.CHIEF_OF_STAFF 
              ? [currentPositions.current[PersonaType.CHIEF_OF_STAFF][0], 2.4, currentPositions.current[PersonaType.CHIEF_OF_STAFF][2]]
              : [0, 2, 0]
          } 
        >
          <group 
            onClick={() => onInteract?.(nearbyTarget)}
            onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
            onPointerOut={() => { document.body.style.cursor = 'auto'; }}
          >
            <mesh>
              <planeGeometry args={[1.8, 0.4]} />
              <meshStandardMaterial 
                color="#10b981" 
                emissive="#10b981" 
                emissiveIntensity={1.2} 
                transparent 
                opacity={0.8}
                side={THREE.DoubleSide}
              />
            </mesh>
            <Text position={[0, 0, 0.01]} fontSize={0.1} color="white" font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf">
              MIT {nearbyTarget} REDEN [E]
            </Text>
          </group>
        </Billboard>
      )}

      <TeleportHandler onTeleport={handleVRTeleport} />

      {isBoardOpen && isVRActive && (
        <group>
          {boardMode === 'PINNWAND' && <Pinnwand isActive={isBoardOpen} />}
          {boardMode === 'KALENDER' && <Kalender isActive={isBoardOpen} />}
          {boardMode === 'WHITEBOARD' && <Whiteboard isActive={isBoardOpen} />}
          {boardMode === 'AGENTEN' && <AgentenTisch isActive={isBoardOpen} />}
        </group>
      )}
    </>
  );
};

import nipplejs from 'nipplejs';

const xrStore = createXRStore();

const TeleportHandler = ({ onTeleport }: { onTeleport: (point: THREE.Vector3) => void }) => {
  const leftController = useXRInputSourceState('left' as any);
  const rightController = useXRInputSourceState('right' as any);
  const lastState = useRef<Record<string, boolean>>({});

  useFrame(() => {
    [
      { id: 'left', state: leftController },
      { id: 'right', state: rightController }
    ].forEach(({ id, state }) => {
      const controllerState = state as any;
      const isPressed = controllerState?.gamepad?.['xr-standard-trigger']?.state === 'pressed';
      const wasPressed = lastState.current[id];

      if (isPressed && !wasPressed && controllerState?.pointer) {
        const raycaster = new THREE.Raycaster();
        const matrix = new THREE.Matrix4().fromArray(controllerState.pointer.matrix);
        const position = new THREE.Vector3().setFromMatrixPosition(matrix);
        const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(new THREE.Quaternion().setFromRotationMatrix(matrix));
        
        raycaster.set(position, direction);
        
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const target = new THREE.Vector3();
        if (raycaster.ray.intersectPlane(plane, target)) {
          if (target.length() < 50) {
            onTeleport(target);
          }
        }
      }
      lastState.current[id] = !!isPressed;
    });
  });

  return null;
};

import { useFirebase } from './FirebaseContext';
import { ModeSwitcher3D, WorldSpaceInput, WorldSpaceDeleteConfirm } from './WorldSpaceUI';

export const StudioScene: React.FC<{ 
  activeSpeaker: PersonaType | null,
  onInteract?: (target: PersonaType) => void,
  isTheaterMode?: boolean
}> = ({ activeSpeaker, onInteract, isTheaterMode }) => {
  const {
    pinnwandNotes,
    whiteboardNotes: FirebaseWhiteboardNotes,
    whiteboardMainText,
    addPinnwandNote: addPinnwandNoteDb,
    deletePinnwandNote: deletePinnwandNoteDb,
    addWhiteboardNote: addWhiteboardNoteDb,
    deleteWhiteboardNote: deleteWhiteboardNoteDb,
    updateWhiteboardMainText: updateWhiteboardMainTextDb
  } = useFirebase();

  const whiteboardNotes = FirebaseWhiteboardNotes;
  const boardMainText = whiteboardMainText;

  const [isVRActive, setIsVRActive] = useState(false);
  const [isSimulatedVR, setIsSimulatedVR] = useState(false);

  useEffect(() => {
    setIsVRActive(!!xrStore.getState().session);
    return xrStore.subscribe((state) => {
      setIsVRActive(!!state.session);
    });
  }, []);

  const finalVRActive = isVRActive || isSimulatedVR;

  const [controlledType, setControlledType] = useState<PersonaType | null>(PersonaType.PLAYER);
  const [cameraMode, setCameraMode] = useState<'orbit' | 'tps' | 'topdown'>('orbit');
  const [nearbyTarget, setNearbyTarget] = useState<PersonaType | null>(null);
  const [mobileInput, setMobileInput] = useState({ w: false, s: false, a: false, d: false });
  const [showMobileControls, setShowMobileControls] = useState(false);
  const [isDayMode, setIsDayMode] = useState(true);
  const [boardMode, setBoardMode] = useState<BoardMode>('PINNWAND');
  const [isBoardOpen, setIsBoardOpen] = useState(false);
  const [isNearTable, setIsNearTable] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [noteCategory, setNoteCategory] = useState<'PROCESS' | 'TASK' | 'NOTE' | 'FOKUS'>('NOTE');
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [newNoteText, setNewNoteText] = useState("");
  const [newNoteColor, setNewNoteColor] = useState("#fef08a");
  const [pendingWhiteboardDelete, setPendingWhiteboardDelete] = useState<{id: string} | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{id: string; category: string} | null>(null);
  const joystickRef = useRef<HTMLDivElement>(null);
  const managerRef = useRef<any>(null);

  useEffect(() => {
    const savedMode = localStorage.getItem('konferenzhub.boardMode.v1');
    if (savedMode && ['PINNWAND', 'KALENDER', 'WHITEBOARD', 'AGENTEN', 'ROADMAP'].includes(savedMode)) {
      setBoardMode(savedMode as BoardMode);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('konferenzhub.boardMode.v1', boardMode);
  }, [boardMode]);

  const addWhiteboardNote = () => {
    if (!newNoteText.trim()) return;
    const x = (Math.random() - 0.5) * 6;
    const z = (Math.random() - 0.5) * 3.6;
    const rotationZ = (Math.random() - 0.5) * 0.2;
    addWhiteboardNoteDb(newNoteText.trim(), newNoteColor, x, z, rotationZ);
    setNewNoteText("");
    setShowNoteForm(false);
  };

  const handleMainTextChange = (text: string) => {
    updateWhiteboardMainTextDb(text);
  };

  const confirmWhiteboardDelete = () => {
    if (pendingWhiteboardDelete) {
      deleteWhiteboardNoteDb(pendingWhiteboardDelete.id);
      setPendingWhiteboardDelete(null);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput = e.target instanceof HTMLInputElement || 
                      e.target instanceof HTMLTextAreaElement || 
                      (e.target as HTMLElement)?.isContentEditable;
      if (isInput) return;

      if (e.key.toLowerCase() === 'e' && isNearTable && !isBoardOpen) {
        setIsBoardOpen(true);
      }
      
      if (e.key === 'Escape' && isBoardOpen) {
        setIsBoardOpen(false);
      }

      if (isBoardOpen && !isInput) {
        if (e.key === '1') setBoardMode('PINNWAND');
        if (e.key === '2') setBoardMode('KALENDER');
        if (e.key === '3') setBoardMode('WHITEBOARD');
        if (e.key === '4') setBoardMode('AGENTEN');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isNearTable, isBoardOpen]);

  useEffect(() => {
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    setShowMobileControls(isTouch);
  }, []);

  useEffect(() => {
    if (showMobileControls && controlledType && joystickRef.current) {
      const options = {
        zone: joystickRef.current,
        mode: 'static' as const,
        position: { left: '80px', bottom: '80px' },
        color: 'white',
        size: 100
      };
      
      const manager = nipplejs.create(options);
      (manager as any).on('move', (evt: any, data: any) => {
        if (!data || !data.angle || isBoardOpen) return;
        const force = data.force || 0;
        const angle = data.angle.degree;
        const w = (angle > 45 && angle < 135) && force > 0.1;
        const s = (angle > 225 && angle < 315) && force > 0.1;
        const a = (angle > 135 && angle < 225) && force > 0.1;
        const d = (angle < 45 || angle > 315) && force > 0.1;
        setMobileInput({ w, s, a, d });
      });
      (manager as any).on('end', () => setMobileInput({ w: false, s: false, a: false, d: false }));
      managerRef.current = manager;
      return () => { manager.destroy(); };
    }
  }, [showMobileControls, controlledType, isBoardOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { 
      const isInput = e.target instanceof HTMLInputElement || 
                      e.target instanceof HTMLTextAreaElement || 
                      (e.target as HTMLElement)?.isContentEditable;
      if (isInput) return;

      if (e.key.toLowerCase() === 'v' && !isBoardOpen) setCameraMode(prev => prev === 'orbit' ? 'tps' : 'orbit');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isBoardOpen]);

  const handleAddNote = () => {
    if (!noteText.trim()) return;
    addPinnwandNoteDb(noteText.trim(), noteCategory);
    setNoteText("");
  };

  useEffect(() => {
    const handleDeleteRequest = (e: any) => {
      setPendingDelete(e.detail);
    };
    const handleWhiteboardDeleteRequest = (e: any) => {
      setPendingWhiteboardDelete(e.detail);
    };
    window.addEventListener('pinnwand-delete-request', handleDeleteRequest);
    window.addEventListener('whiteboard-delete-request', handleWhiteboardDeleteRequest);
    return () => {
      window.removeEventListener('pinnwand-delete-request', handleDeleteRequest);
      window.removeEventListener('whiteboard-delete-request', handleWhiteboardDeleteRequest);
    };
  }, []);

  const confirmDelete = () => {
    if (pendingDelete) {
      deletePinnwandNoteDb(pendingDelete.id);
      setPendingDelete(null);
    }
  };

  return (
    <div className={`w-full h-full shadow-2xl relative transition-all duration-300 bg-transparent ${isTheaterMode ? 'rounded-none border-0 min-h-0' : 'rounded-3xl border border-white/5 min-h-[500px]'}`}>
      <div className="absolute inset-0 z-0">
        <Canvas shadows camera={{ position: [18, 12, 18], fov: 65 }}>
          <XR store={xrStore}>
            <fog attach="fog" args={[isDayMode ? '#87ceeb' : '#050505', 10, 100]} />
            {!isDayMode && <color attach="background" args={['#050505']} />}
            <ambientLight intensity={isDayMode ? 1.0 : 0.6} />
            <SceneContent 
              controlledType={controlledType}
              cameraMode={cameraMode}
              setControlledType={setControlledType}
              nearbyTarget={nearbyTarget}
              activeSpeaker={activeSpeaker}
              onInteract={onInteract}
              setNearbyTarget={setNearbyTarget}
              mobileInput={mobileInput}
              isTheaterMode={isTheaterMode}
              isDayMode={isDayMode}
              isBoardOpen={isBoardOpen}
              setIsBoardOpen={setIsBoardOpen}
              isNearTable={isNearTable}
              setIsNearTable={setIsNearTable}
              boardMode={boardMode}
              isVRActive={finalVRActive}
            />

            {isBoardOpen && finalVRActive && (
              <group>
                <ModeSwitcher3D 
                  currentMode={boardMode} 
                  onModeChange={(m) => setBoardMode(m)} 
                  position={[0, 4.2, -4]} 
                />

                <Billboard
                  follow={true}
                  lockX={false}
                  lockY={false}
                  lockZ={false}
                  position={[0, 0.4, 4.5]}
                >
                  <group 
                    onClick={() => setIsBoardOpen(false)}
                    onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
                    onPointerOut={() => { document.body.style.cursor = 'auto'; }}
                  >
                    <RoundedBox args={[2.5, 0.5, 0.05]} radius={0.25} smoothness={4}>
                      <meshStandardMaterial color="#4f46e5" emissive="#4f46e5" emissiveIntensity={0.2} />
                    </RoundedBox>
                    <Text position={[0, 0, 0.04]} fontSize={0.12} color="white" font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf">
                      BOARD SCHLIESSEN
                    </Text>
                  </group>
                </Billboard>

                {boardMode === 'PINNWAND' && (
                  <WorldSpaceInput 
                    title="NEUE NOTIZ / AUFGABE"
                    value={noteText}
                    onAdd={handleAddNote}
                    onCancel={() => setNoteText("")}
                    position={[5.5, 1.8, 1]}
                  />
                )}

                {boardMode === 'WHITEBOARD' && showNoteForm && (
                   <WorldSpaceInput 
                      title="WHITEBOARD NOTIZ"
                      value={newNoteText}
                      onAdd={addWhiteboardNote}
                      onCancel={() => setShowNoteForm(false)}
                      position={[5.5, 1.8, 1]}
                   />
                )}

                {pendingDelete && (
                  <WorldSpaceDeleteConfirm 
                    message={pendingDelete.category === 'PROCESS' ? 'Laufenden Prozess wirklich stoppen?' : 'Eintrag wirklich von der Pinnwand entfernen?'}
                    onConfirm={confirmDelete}
                    onCancel={() => setPendingDelete(null)}
                  />
                )}

                {pendingWhiteboardDelete && (
                  <WorldSpaceDeleteConfirm 
                    message="Notiz vom Board entfernen?"
                    onConfirm={confirmWhiteboardDelete}
                    onCancel={() => setPendingWhiteboardDelete(null)}
                  />
                )}
              </group>
            )}
            {cameraMode === 'orbit' && !isBoardOpen && (
              <OrbitControls 
                enablePan={false} 
                maxPolarAngle={Math.PI / 2.1} 
                minDistance={10} 
                maxDistance={35} 
                makeDefault 
                target={[0, 1, 0]}
              />
            )}
          </XR>
        </Canvas>
      </div>
      
      {/* 2D Mode Switcher Tabs */}
      {isBoardOpen && finalVRActive && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 flex items-center gap-2 p-3 bg-[#0a1a11]/90 backdrop-blur-xl border border-white/10 rounded-[32px] z-[9998] shadow-2xl animate-in slide-in-from-top-4 duration-500">
          {(['PINNWAND', 'KALENDER', 'WHITEBOARD', 'AGENTEN', 'ROADMAP', 'VAYBOARD'] as BoardMode[]).map((mode) => {
            const isActive = boardMode === mode;
            return (
              <button
                key={mode}
                onClick={() => setBoardMode(mode)}
                className={`relative px-6 py-3 text-[11px] font-black tracking-[0.2em] uppercase transition-all duration-300 rounded-full flex items-center gap-2 ${
                  isActive 
                  ? 'text-white' 
                  : 'text-white/40 hover:text-white/70'
                }`}
              >
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 rounded-full border border-white/20 shadow-[0_0_20px_rgba(16,185,129,0.2)] animate-pulse" />
                )}
                <span className="relative z-10">{mode}</span>
                {isActive && (
                  <div className="relative z-10 w-4 h-4 bg-emerald-400 rounded-full flex items-center justify-center shadow-[0_0_10px_#10b981]">
                    <div className="w-1.5 h-1.5 bg-white rounded-full" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* 2D Whiteboard Overlay UI */}
      {isBoardOpen && finalVRActive && boardMode === 'WHITEBOARD' && (
        <>
          <div className="fixed top-20 right-6 w-full max-w-[400px] flex flex-col gap-3 p-5 bg-black/40 backdrop-blur-xl border border-white/5 rounded-2xl shadow-2xl animate-in slide-in-from-right-5 duration-300 z-[9997]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-[#ff9b5a] font-black uppercase tracking-widest">Board Text</span>
            </div>
            <textarea
              placeholder="Schreib etwas auf das Whiteboard..."
              value={boardMainText}
              onChange={(e) => handleMainTextChange(e.target.value)}
              className="w-full h-40 p-4 bg-white/5 text-white text-base border border-white/10 rounded-xl focus:ring-2 focus:ring-[#ff9b5a]/40 outline-none resize-none placeholder-white/20"
            />
          </div>

          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 z-[9997]">
            {!showNoteForm ? (
              <button
                onClick={() => setShowNoteForm(true)}
                className="px-6 py-3 bg-[#ff9b5a] text-white font-bold rounded-full shadow-2xl hover:bg-[#ff8a3d] transition-all active:scale-95 flex items-center gap-2"
              >
                <span className="text-xl">+</span> NEUE NOTIZ
              </button>
            ) : (
              <div className="bg-black/40 backdrop-blur-xl border border-white/5 p-5 rounded-2xl shadow-2xl w-full max-w-[320px] animate-in slide-in-from-bottom-5 duration-300">
                <div className="flex gap-2 mb-4 p-1 bg-white/5 rounded-xl border border-white/5 shadow-inner">
                  {['#fef08a', '#fed7aa', '#bfdbfe', '#bbf7d0', '#fbcfe8'].map(color => (
                    <button
                      key={color}
                      onClick={() => setNewNoteColor(color)}
                      className={`w-8 h-8 rounded-lg transition-transform ${newNoteColor === color ? 'scale-110 border-2 border-white/50 shadow-lg' : 'opacity-60 hover:opacity-100 hover:scale-105'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <textarea
                  autoFocus
                  placeholder="Inhalt..."
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addWhiteboardNote(); } }}
                  className="w-full h-24 p-3 bg-white/5 text-white text-sm border border-white/10 rounded-xl focus:ring-2 focus:ring-[#ff9b5a]/40 outline-none resize-none placeholder-white/20 mb-3"
                />
                <div className="flex gap-2">
                  <button onClick={() => setShowNoteForm(false)} className="flex-1 py-2 text-white/50 text-[11px] font-bold hover:text-white/80 transition-colors">ABBRECHEN</button>
                  <button onClick={addWhiteboardNote} className="flex-1 py-2 bg-white text-black text-[11px] font-bold rounded-xl hover:bg-white/90 transition-all">HINZUFUEGEN</button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* 2D Delete Confirmation for Whiteboard */}
      {isBoardOpen && finalVRActive && pendingWhiteboardDelete && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-black/40 backdrop-blur-xl rounded-2xl p-6 shadow-2xl max-w-[320px] w-full mx-4 flex flex-col gap-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-white text-base font-semibold leading-relaxed">Notiz vom Board entfernen?</h3>
            <div className="flex gap-3">
              <button onClick={() => setPendingWhiteboardDelete(null)} className="flex-1 px-4 py-2 bg-transparent hover:bg-white/5 border border-white/20 text-white rounded-xl text-sm font-medium transition-all">Abbrechen</button>
              <button onClick={confirmWhiteboardDelete} className="flex-1 px-4 py-2 bg-red-500/90 hover:bg-red-500 text-white rounded-xl text-sm font-semibold transition-all">Löschen</button>
            </div>
          </div>
        </div>
      )}

      {/* 2D Note Addition Overlay (Pinnwand) */}
      {isBoardOpen && finalVRActive && boardMode === 'PINNWAND' && (
        <div className="fixed bottom-6 right-6 w-full max-w-[320px] flex flex-col gap-3 p-5 bg-black/40 backdrop-blur-xl rounded-2xl shadow-2xl animate-in slide-in-from-bottom-5 duration-300 z-[9997]">
          <div className="flex gap-2 p-1 bg-white/5 rounded-xl">
            {(['NOTE', 'TASK', 'PROCESS', 'FOKUS'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setNoteCategory(cat)}
                className={`flex-1 px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                  noteCategory === cat ? 'bg-white/10 text-white border border-white/10 shadow-lg' : 'text-white/40 hover:text-white/60'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <textarea
            placeholder="Notiz verfassen..."
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            className="w-full h-24 p-3 bg-white/5 text-white text-sm border border-white/10 rounded-xl focus:ring-2 focus:ring-white/20 outline-none resize-none placeholder-white/30"
          />
          <button 
            onClick={handleAddNote}
            className="w-full py-2.5 bg-white text-black font-bold rounded-xl text-xs hover:bg-white/90 transition-all active:scale-[0.98]"
          >
            HINZUFUEGEN
          </button>
        </div>
      )}

      {/* 2D Custom Delete Confirmation Popup */}
      {isBoardOpen && finalVRActive && pendingDelete && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-black/40 backdrop-blur-xl rounded-2xl p-6 shadow-2xl max-w-[320px] w-full mx-4 flex flex-col gap-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-white text-base font-semibold leading-relaxed">
              {pendingDelete.category === 'PROCESS' 
                ? 'Laufenden Prozess wirklich stoppen?' 
                : 'Eintrag wirklich loeschen?'}
            </h3>
            
            <div className="flex gap-3">
              <button
                onClick={() => setPendingDelete(null)}
                className="flex-1 px-4 py-2 bg-transparent hover:bg-white/5 border border-white/20 text-white rounded-xl text-sm font-medium transition-all"
              >
                Abbrechen
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-2 bg-red-500/90 hover:bg-red-500 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-red-500/20"
              >
                Ja, loeschen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2D Interaction Buttons */}
      {isNearTable && (
        <div className={`fixed left-1/2 -translate-x-1/2 flex flex-col gap-4 items-center transition-all duration-300 ${isBoardOpen ? 'bottom-10 z-[9999]' : 'bottom-10 z-30'}`}>
          <button 
            onClick={() => setIsBoardOpen(prev => !prev)}
            className="h-[46px] px-5 rounded-full flex items-center gap-2.5 bg-[rgba(20,20,30,0.55)] backdrop-blur-[16px] border border-white/12 shadow-[0_8px_24px_rgba(0,0,0,0.25)] hover:bg-[rgba(30,30,45,0.65)] hover:border-white/20 hover:shadow-[0_0_15px_rgba(255,255,255,0.08),_0_8px_24px_rgba(0,0,0,0.3)] active:scale-[0.97] transition-all duration-150 ease-out text-white text-sm font-medium tracking-wider group"
          >
            <div className="w-[22px] h-[22px] rounded border border-white/20 flex items-center justify-center text-[10px] font-mono select-none text-white/70 group-hover:text-white group-hover:border-white/30 transition-colors">
              E
            </div>
            <span>{isBoardOpen ? "Board schließen" : "Pinnwand öffnen"}</span>
          </button>
        </div>
      )}

      {/* 2D Flat Desktop Dashboard Overlay */}
      {isBoardOpen && !finalVRActive && (
        <DesktopDashboard 
          isOpen={isBoardOpen}
          onClose={() => setIsBoardOpen(false)}
          activeTab={boardMode as any}
          setActiveTab={setBoardMode as any}
        />
      )}

      {nearbyTarget && !isBoardOpen && !showMobileControls && (
        <button 
          onClick={() => onInteract?.(nearbyTarget)}
          className="absolute bottom-28 left-1/2 -translate-x-1/2 bg-white/10 hover:bg-white/20 backdrop-blur-md px-8 py-4 rounded-full font-bold shadow-xl border border-white/20 transition-all z-20 text-white"
        >
          {nearbyTarget} ansprechen [E]
        </button>
      )}

      <div className="absolute top-6 left-6 flex items-center gap-3 z-30">
        <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full animate-pulse ${isDayMode ? 'bg-amber-400' : 'bg-red-500'}`}></div>
            <span className="text-[10px] text-white font-bold uppercase tracking-wider">
              {controlledType ? `Control: ${controlledType}` : "Studio Cam"}
            </span>
          </div>
          <p className="text-[8px] text-slate-400">
            {isBoardOpen ? "Pinnwand aktiv | Nutze Pfeiltasten zum Scrollen" : "Click to Lock Mouse | WASD: Walk | V: Cam Mode"}
          </p>
        </div>
        
        <button
          onClick={() => setIsDayMode(prev => !prev)}
          className="bg-black/60 backdrop-blur-md p-2.5 rounded-xl border border-white/10 text-white hover:bg-white/20 transition-all flex items-center gap-2 group"
          title={isDayMode ? "Nachtmodus" : "Tagmodus"}
        >
          {isDayMode ? (
             <>
               <div className="w-4 h-4 rounded-full bg-amber-400 group-hover:scale-110 transition-transform"></div>
               <span className="text-[10px] font-bold">TAG</span>
             </>
          ) : (
            <>
               <div className="w-4 h-4 rounded-full bg-slate-100 group-hover:scale-110 transition-transform"></div>
               <span className="text-[10px] font-bold">NACHT</span>
            </>
          )}
        </button>

        <button
          onClick={async () => {
            try {
              await xrStore.enterVR();
            } catch (e) {
              console.error("VR Error:", e);
              alert("VR-Modus konnte nicht gestartet werden. Bitte stelle sicher, dass eine VR-Brille angeschlossen ist und dein Browser WebXR unterstützt.");
            }
          }}
          className="bg-black/60 backdrop-blur-md px-4 py-2.5 rounded-xl border border-emerald-500/30 text-white hover:bg-emerald-500/20 hover:border-emerald-500/50 transition-all flex items-center gap-2 group"
        >
          <div className="w-2 h-2 rounded-full bg-emerald-400 group-hover:scale-110 transition-transform shadow-[0_0_8px_#10b981]"></div>
          <span className="text-[10px] font-black tracking-widest uppercase">VR</span>
        </button>

        <button
          onClick={() => setIsSimulatedVR(prev => !prev)}
          className={`bg-black/60 backdrop-blur-md px-4 py-2.5 rounded-xl border text-white transition-all flex items-center gap-2 group ${
            isSimulatedVR 
              ? 'border-indigo-500/75 bg-indigo-500/20 shadow-[0_0_12px_rgba(99,102,241,0.3)]' 
              : 'border-white/10 hover:bg-white/10'
          }`}
          title="VR-Ansicht simulieren (für PC-Tests)"
        >
          <div className={`w-2 h-2 rounded-full group-hover:scale-110 transition-transform ${
            isSimulatedVR ? 'bg-indigo-400 shadow-[0_0_8px_#818cf8]' : 'bg-slate-500'
          }`}></div>
          <span className="text-[10px] font-black tracking-widest uppercase">VR-TEST</span>
        </button>
      </div>

      {showMobileControls && controlledType && (
        <div className="absolute inset-0 pointer-events-none z-20">
          <div className="absolute bottom-10 right-10 pointer-events-auto flex flex-col gap-6 items-center">
             {nearbyTarget && (
                <button 
                  onClick={() => onInteract?.(nearbyTarget)}
                  className="w-24 h-24 bg-indigo-600/90 rounded-full flex flex-col items-center justify-center border-4 border-white/30 shadow-[0_0_30px_rgba(79,70,229,0.5)] active:scale-90 transition-transform"
                >
                  <span className="text-white font-black text-xs tracking-widest">REDE</span>
                </button>
              )}
              <button 
                onClick={() => setCameraMode(prev => prev === 'orbit' ? 'tps' : 'orbit')}
                className="w-14 h-14 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 shadow-lg active:bg-white/30 text-white font-bold text-[10px]"
              >
                CAM
              </button>
          </div>
          <div ref={joystickRef} className="absolute bottom-0 left-0 w-64 h-64 pointer-events-auto opacity-70" />
        </div>
      )}
    </div>
  );
};
