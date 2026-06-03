import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations, Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';
import { useFirebase } from './FirebaseContext';

// Fun, high-vibe German military/soldier quotes with personality
const SOLDIER_QUOTES = [
  "Sir! Jawohl, Sir! Podcast-Studio ist absolut gesichert! Keine Bugs in Sicht! 🫡",
  "Prompt-Artillerie steht bereit zum Feuern! 🎯",
  "Sicherungsperimeter um den Besprechungstisch steht felsenfest!",
  "Ich bewache diese KI-Pipelines im 3D-Raum mit meinem Leben!",
  "Achtung! Kreativ-Agenten auf Posten. Ruhe im Glied... Spaß, mach weiter! 😉",
  "Melde: Keine Störsignale auf den Audio-Kanälen gefunden!",
  "Immer wachsam! Der Cowboy und ich haben die Lage voll im Griff.",
  "Muss... Kaffee... sichern! Kaffee-Ration ist überlebenswichtig! ☕"
];

export const Soldier: React.FC<{ isDayMode: boolean }> = ({ isDayMode }) => {
  const groupRef = useRef<THREE.Group>(null);
  
  // 1) Load the GLB model from /public/Soldat.glb
  // Wrapped in Suspense at parent level
  const { scene, animations } = useGLTF('/Soldat.glb');
  
  // 2) Parse animations safely with the group context
  const { actions, names } = useAnimations(animations, groupRef);
  
  // State for AI-Movement, speech and special action (salute/attack/pose)
  const [isPatrolling, setIsPatrolling] = useState(false);
  const [isPlayingSalute, setIsPlayingSalute] = useState(false);
  const [speech, setSpeech] = useState<string | null>(null);
  const [hovered, setHovered] = useState(false);

  const { vayBoardEvents } = useFirebase();

  // Watch for newly processed OPERATIONS knowledge events from Firestore
  useEffect(() => {
    const latestOpsEvent = vayBoardEvents.find(e => e.agent === 'OPERATIONS' && e.status === 'PENDING');
    if (latestOpsEvent) {
      setSpeech(`Sicherungs-Alarm! 🫡\n"${latestOpsEvent.description.slice(0, 60)}..."`);
      
      // Trigger salute movement animation feedback dynamically
      setIsPlayingSalute(true);
      const timer = setTimeout(() => {
        setIsPlayingSalute(false);
        setSpeech(null); // Clear speech bubble after 6s
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [vayBoardEvents]);
  
  // High fidelity coordinate state tracked over time
  // Initialize him safely in a visible area near the table [-5.5, 0, -2]
  const positionRef = useRef<THREE.Vector3>(new THREE.Vector3(-5.5, 0, -2));
  const targetRef = useRef<THREE.Vector3>(new THREE.Vector3(-5.5, 0, -2));
  const stateTimerRef = useRef<number>(0);

  // Set the initial physical coordinates of the group securely on mounting
  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.position.set(-5.5, 0, -2);
    }
  }, []);

  // Identify best matches for animations dynamically from the model
  const idleAnimName = useMemo(() => {
    if (!names || names.length === 0) return null;
    const match = names.find(n => 
      n.toLowerCase().includes('idle') || 
      n.toLowerCase().includes('stand') || 
      n.toLowerCase().includes('pose') || 
      n.toLowerCase().includes('stop') ||
      n.toLowerCase().includes('guard')
    );
    return match || names[0];
  }, [names]);

  const walkAnimName = useMemo(() => {
    if (!names || names.length === 0) return null;
    const match = names.find(n => 
      n.toLowerCase().includes('walk') || 
      n.toLowerCase().includes('run') || 
      n.toLowerCase().includes('move') || 
      n.toLowerCase().includes('march') || 
      n.toLowerCase().includes('step') ||
      n.toLowerCase().includes('patrol')
    );
    return match || names[1] || names[0];
  }, [names]);

  const specialAnimName = useMemo(() => {
    if (!names || names.length === 0) return null;
    // Look for Salute, Attack, Wave, Shout, Cheer, Pose, Fire, Punch
    const match = names.find(n => 
      n.toLowerCase().includes('salute') || 
      n.toLowerCase().includes('wave') || 
      n.toLowerCase().includes('cheer') || 
      n.toLowerCase().includes('pose') || 
      n.toLowerCase().includes('shout') ||
      n.toLowerCase().includes('act') ||
      n.toLowerCase().includes('attack') ||
      n.toLowerCase().includes('punch') ||
      n.toLowerCase().includes('shoot') ||
      n.toLowerCase().includes('fire')
    );
    if (match) return match;
    // Fallback: choose an animation that is not walk or idle
    const other = names.find(n => 
      !n.toLowerCase().includes('walk') && 
      !n.toLowerCase().includes('run') && 
      !n.toLowerCase().includes('idle') && 
      !n.toLowerCase().includes('stand')
    );
    return other || null;
  }, [names]);

  // Log successfully parsed animations for developmental review
  useEffect(() => {
    console.log("💂 Soldier loaded with animations:", names, "Selected Idle:", idleAnimName, "Selected Walk:", walkAnimName, "Special:", specialAnimName);
  }, [names, idleAnimName, walkAnimName, specialAnimName]);

  // Handle special action duration auto-stop
  useEffect(() => {
    if (isPlayingSalute && specialAnimName && actions) {
      const action = actions[specialAnimName];
      const duration = action ? action.getClip().duration : 2.5;
      
      const timer = setTimeout(() => {
        setIsPlayingSalute(false);
      }, duration * 1000);
      return () => clearTimeout(timer);
    }
  }, [isPlayingSalute, specialAnimName, actions]);

  // 3) Animation state crossfader
  const currentActionRef = useRef<string | null>(null);
  useEffect(() => {
    if (!actions) return;
    
    let nextActionName = idleAnimName;
    if (isPlayingSalute && specialAnimName) {
      nextActionName = specialAnimName;
    } else if (isPatrolling) {
      nextActionName = walkAnimName;
    }
    
    if (!nextActionName) return;

    const nextAction = actions[nextActionName];
    if (nextAction) {
      nextAction.reset().fadeIn(0.25).play();
    }

    if (currentActionRef.current && currentActionRef.current !== nextActionName) {
      const prevAction = actions[currentActionRef.current];
      if (prevAction) {
        prevAction.fadeOut(0.25);
      }
    }

    currentActionRef.current = nextActionName;
  }, [isPatrolling, isPlayingSalute, walkAnimName, idleAnimName, specialAnimName, actions]);

  // Auto-hide the conversational speech bubble
  useEffect(() => {
    if (speech) {
      const timer = setTimeout(() => {
        setSpeech(null);
      }, 5500);
      return () => clearTimeout(timer);
    }
  }, [speech]);

  // 4) Physics patrol-navigation & boundary checks inside useFrame
  useFrame((state, delta) => {
    if (!groupRef.current) return;

    const currentPos = positionRef.current;
    const target = targetRef.current;

    // Advance general state timer (in seconds)
    stateTimerRef.current += delta;

    if (isPlayingSalute) {
      // Stand straight and present arms/salute without moving!
      return;
    }

    if (isPatrolling) {
      const toTarget = target.clone().sub(currentPos);
      const distance = toTarget.length();

      if (distance < 0.25) {
        setIsPatrolling(false);
        stateTimerRef.current = 0;
      } else {
        toTarget.normalize();
        const speed = 0.95; // Steady strategic marching pace
        currentPos.add(toTarget.multiplyScalar(speed * delta));
        groupRef.current.position.copy(currentPos);

        // Smooth rotation interpolation
        const angle = Math.atan2(toTarget.x, toTarget.z);
        const currentRotationY = groupRef.current.rotation.y;
        
        let diff = angle - currentRotationY;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        groupRef.current.rotation.y += diff * 0.1;
      }
    } else {
      // Standing on post guard duty: Pick a new coordinate after guard duty (6 to 12 seconds)
      const waitTime = speech ? 10.0 : 6.0;
      if (stateTimerRef.current > waitTime) {
        
        // Rejection sampling for safe coordinates completely outside the podcast tables and studio equipment!
        let nextX = 0;
        let nextZ = 0;
        let isSafe = false;
        let attempts = 0;

        while (!isSafe && attempts < 30) {
          attempts++;
          const rngAngle = Math.random() * Math.PI * 2;
          // Solider patrols in a wide arc (between 6 and 14 meters from center)
          const rngRadius = 6.0 + Math.random() * 8.0; 
          
          nextX = Math.cos(rngAngle) * rngRadius;
          const calculatedZ = Math.sin(rngAngle) * rngRadius;
          
          // Guard boundary box exclusions: Table 1 (Center): 8x5 | Table 2 (Left): 8x5 | Table 3 (Right): 8x5
          const padding = 2.0; // Safe distance padding
          const insideCenterTable = nextX > -4 - padding && nextX < 4 + padding && 
                                    calculatedZ > -2.5 - padding && calculatedZ < 2.5 + padding;
          
          const insideLeftTable = nextX > -20 - 4 - padding && nextX < -20 + 4 + padding && 
                                  calculatedZ > -16 - 2.5 - padding && calculatedZ < -16 + 2.5 + padding;

          const insideRightTable = nextX > 20 - 4 - padding && nextX < 20 + 4 + padding && 
                                   calculatedZ > -16 - 2.5 - padding && calculatedZ < -16 + 2.5 + padding;
          
          const tooFarAway = nextX < -22 || nextX > 22 || calculatedZ < -22 || calculatedZ > 15;

          // Don't patrol too close to Cowboy starting area [8, 0, 5] if possible
          const nearCowboyStart = Math.hypot(nextX - 8, calculatedZ - 5) < 3.0;

          if (!insideCenterTable && !insideLeftTable && !insideRightTable && !tooFarAway && !nearCowboyStart) {
            nextZ = calculatedZ;
            isSafe = true;
          }
        }
        
        if (!isSafe) {
          // Absolute safe guard post on the left grass plane
          nextX = -8;
          nextZ = -5;
        }

        targetRef.current.set(nextX, 0, nextZ);
        setIsPatrolling(true);
        stateTimerRef.current = 0;
      }
    }

    if (hovered) {
      document.body.style.cursor = 'help';
    }
  });

  // Handle interactive clicks on the Soldier mesh!
  const handleInteraction = (e: any) => {
    e.stopPropagation();
    
    // Choose a random soldier quote
    const nextQuote = SOLDIER_QUOTES[Math.floor(Math.random() * SOLDIER_QUOTES.length)];
    setSpeech(nextQuote);
    
    // Play special action animation
    if (specialAnimName) {
      setIsPlayingSalute(true);
      setIsPatrolling(false);
      stateTimerRef.current = 0;
    }
    
    // Soldier stands at strict attention / salute bounce effect
    if (groupRef.current) {
      let tick = 0;
      const interval = setInterval(() => {
        if (groupRef.current) {
          tick += 0.1;
          groupRef.current.position.y = Math.sin(tick * Math.PI) * 0.35;
          if (tick >= 1.0) {
            groupRef.current.position.y = 0;
            clearInterval(interval);
          }
        } else {
          clearInterval(interval);
        }
      }, 20);
    }
  };

  return (
    <group 
      ref={groupRef}
      onClick={handleInteraction}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = 'auto';
      }}
    >
      {/* 3D Model: scale is tuned for correct human size. Casts beautiful shadows */}
      <primitive 
        object={scene} 
        scale={0.9} 
        castShadow 
        receiveShadow 
      />

      {/* Billboarding Label / Conversation Speech Box */}
      <Billboard position={[0, 1.85, 0]}>
        {speech ? (
          <group>
            {/* Elegant glassmorphism speaking block bubble */}
            <mesh position={[0, 0.45, 0]}>
              <planeGeometry args={[2.7, 0.8]} />
              <meshBasicMaterial 
                color={isDayMode ? "#ffffff" : "#0d0e15"} 
                transparent 
                opacity={0.96} 
                depthWrite={false}
              />
            </mesh>
            
            {/* Highlighted bounding frontier line (Navy blue for tactical theme) */}
            <mesh position={[0, 0.45, -0.01]}>
              <planeGeometry args={[2.74, 0.84]} />
              <meshBasicMaterial 
                color="#3b82f6" 
                transparent 
                depthWrite={false}
              />
            </mesh>

            {/* Speaking character prompt */}
            <Text 
              position={[0, 0.45, 0.01]} 
              fontSize={0.092} 
              maxWidth={2.52} 
              lineHeight={1.3}
              textAlign="center"
              color={isDayMode ? "#0f172a" : "#f1f5f9"}
              font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf"
            >
              {speech}
            </Text>
          </group>
        ) : (
          /* Tactical non-intrusive metadata tag */
          <group>
            <mesh position={[0, 0, 0]}>
              <planeGeometry args={[1.5, 0.28]} />
              <meshBasicMaterial 
                color="#3b82f6" 
                transparent 
                opacity={hovered ? 0.95 : 0.7} 
                depthWrite={false}
              />
            </mesh>
            <Text 
              position={[0, 0, 0.01]} 
              fontSize={0.082} 
              fontWeight="bold"
              color={isDayMode ? "#ffffff" : "#f8fafc"}
              font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf"
            >
              {hovered ? "🫡 Soldat (Klick!)" : "🫡 Soldat-Bot"}
            </Text>
          </group>
        )}
      </Billboard>
    </group>
  );
};

// Preload resources for speed
useGLTF.preload('/Soldat.glb');
