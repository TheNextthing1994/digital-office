import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations, Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';
import { useFirebase } from './FirebaseContext';

// Selection of fun, high-vibe German cowboy quotes with personality
const COWBOY_QUOTES = [
  "Howdy, Partner! 🤠 Bist du bereit für den KI-Goldrausch?",
  "Diese 3D-Bühne ist ja mal richtig scharf geritten!",
  "Yee-haw! 🌵 Keine Zeit für faule Kojoten, wir reiten weiter!",
  "Arbeitest du an den neuesten AI-Tools? Genial! Ich nenne mich den Prompt-Wrangler!",
  "Dieses schicke Podcast-Studio könnte glatt mehr Lasso-Werfer vertragen!",
  "Immer geradeaus in den Sonnenuntergang hinein, Kumpel!",
  "Der Kaffee hier schmeckt wie verrostetes Hufeisenwasser... hervorragend! ☕",
  "Ich hab gerade einen KI-Agenten mit dem Lasso eingefangen. Ziemlich wilder Bursche!",
  "Wer braucht schon Pferde, wenn man hier ein fabelhaftes 3D-Studio erforschen kann?"
];

export const Cowboy: React.FC<{ isDayMode: boolean }> = ({ isDayMode }) => {
  const groupRef = useRef<THREE.Group>(null);
  
  // 1) Load the GLB model from /public/Meshy_AI_Meshy_Merged_Animations.glb
  // We use the loaded 'scene' directly (no clone) to preserve the rigged skeleton bones connection mapping perfectly!
  const { scene, animations } = useGLTF('/Meshy_AI_Meshy_Merged_Animations.glb');
  
  // 2) Parse animations safely with the group context
  const { actions, names } = useAnimations(animations, groupRef);
  
  // State for AI-Movement, speech and punching
  const [isWalking, setIsWalking] = useState(false);
  const [isPlayingPunch, setIsPlayingPunch] = useState(false);
  const [speech, setSpeech] = useState<string | null>(null);
  const [hovered, setHovered] = useState(false);

  const { vayBoardEvents } = useFirebase();

  // Watch for newly processed STRATEGY knowledge events from Firestore
  useEffect(() => {
    const latestStrategyEvent = vayBoardEvents.find(e => e.agent === 'STRATEGY' && e.status === 'PENDING');
    if (latestStrategyEvent) {
      setSpeech(`Strategie-Memo! 🤠\n"${latestStrategyEvent.description.slice(0, 60)}..."`);
      
      // Physically trigger dynamic animation feedback
      setIsPlayingPunch(true);
      const timer = setTimeout(() => {
        setIsPlayingPunch(false);
        setSpeech(null); // Clear speech bubble after 6s
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [vayBoardEvents]);
  
  // High fidelity coordinate state tracked over time
  // Initialize him safely on the grass far away from the table [8, 0, 5]
  const positionRef = useRef<THREE.Vector3>(new THREE.Vector3(8, 0, 5));
  const targetRef = useRef<THREE.Vector3>(new THREE.Vector3(8, 0, 5));
  const stateTimerRef = useRef<number>(0);

  // Set the initial physical coordinates of the group securely on mounting
  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.position.set(8, 0, 5);
    }
  }, []);

  // Identify best matches for animations dynamically from the model
  const idleAnimName = useMemo(() => {
    if (!names || names.length === 0) return null;
    const match = names.find(n => 
      n.toLowerCase().includes('idle') || 
      n.toLowerCase().includes('stand') || 
      n.toLowerCase().includes('pose') || 
      n.toLowerCase().includes('stop')
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
      n.toLowerCase().includes('step')
    );
    return match || names[1] || names[0];
  }, [names]);

  const punchAnimName = useMemo(() => {
    if (!names || names.length === 0) return null;
    const match = names.find(n => 
      n.toLowerCase().includes('punch') || 
      n.toLowerCase().includes('fight') || 
      n.toLowerCase().includes('box') || 
      n.toLowerCase().includes('attack') || 
      n.toLowerCase().includes('hit') ||
      n.toLowerCase().includes('fist') ||
      n.toLowerCase().includes('strike') ||
      n.toLowerCase().includes('combat')
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

  // Handle punch duration auto-stop
  useEffect(() => {
    if (isPlayingPunch && punchAnimName && actions) {
      const action = actions[punchAnimName];
      const duration = action ? action.getClip().duration : 2.0;
      
      const timer = setTimeout(() => {
        setIsPlayingPunch(false);
      }, duration * 1000);
      return () => clearTimeout(timer);
    }
  }, [isPlayingPunch, punchAnimName, actions]);

  // 3) Animation state crossfader
  const currentActionRef = useRef<string | null>(null);
  useEffect(() => {
    if (!actions) return;
    
    let nextActionName = idleAnimName;
    if (isPlayingPunch && punchAnimName) {
      nextActionName = punchAnimName;
    } else if (isWalking) {
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
  }, [isWalking, isPlayingPunch, walkAnimName, idleAnimName, punchAnimName, actions]);

  // Auto-hide the conversational speech bubble
  useEffect(() => {
    if (speech) {
      const timer = setTimeout(() => {
        setSpeech(null);
      }, 5500);
      return () => clearTimeout(timer);
    }
  }, [speech]);

  // 4) Physics navigation & boundary checks inside useFrame
  useFrame((state, delta) => {
    if (!groupRef.current) return;

    const currentPos = positionRef.current;
    const target = targetRef.current;

    // Advance general state timer (in seconds)
    stateTimerRef.current += delta;

    if (isPlayingPunch) {
      // Do not move while performing fist-fights or reactions!
      return;
    }

    if (isWalking) {
      const toTarget = target.clone().sub(currentPos);
      const distance = toTarget.length();

      if (distance < 0.25) {
        setIsWalking(false);
        stateTimerRef.current = 0;
      } else {
        toTarget.normalize();
        const speed = 1.1; // Comfortable walking pace
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
      // Resting on the grass: Pick a new coordinate after resting phase (5 to 9 seconds)
      const waitTime = speech ? 9.0 : 5.0;
      if (stateTimerRef.current > waitTime) {
        
        // Rejection sampling for safe coordinates completely outside the podcast tables and studio equipment!
        let nextX = 0;
        let nextZ = 0;
        let isSafe = false;
        let attempts = 0;

        while (!isSafe && attempts < 30) {
          attempts++;
          const rngAngle = Math.random() * Math.PI * 2;
          // Keep him at a safe distance from center (between 5 and 13 meters)
          const rngRadius = 5.0 + Math.random() * 8.0; 
          
          nextX = Math.cos(rngAngle) * rngRadius;
          const calculatedZ = Math.sin(rngAngle) * rngRadius;
          
          // Custom boundary boxes bounds: Table 1 (Center): 8x5 | Table 2 (Left): 8x5 | Table 3 (Right): 8x5
          const padding = 1.8; // Safe padding so he doesn't stand right against the corners
          const insideCenterTable = nextX > -4 - padding && nextX < 4 + padding && 
                                    calculatedZ > -2.5 - padding && calculatedZ < 2.5 + padding;
          
          // Left Table is at [-20, 0, -16]
          const insideLeftTable = nextX > -20 - 4 - padding && nextX < -20 + 4 + padding && 
                                  calculatedZ > -16 - 2.5 - padding && calculatedZ < -16 + 2.5 + padding;

          // Right Table is at [20, 0, -16]
          const insideRightTable = nextX > 20 - 4 - padding && nextX < 20 + 4 + padding && 
                                   calculatedZ > -16 - 2.5 - padding && calculatedZ < -16 + 2.5 + padding;
          
          // Ensure we don't go too far back into the darkness/clipping points
          const tooFarAway = nextX < -22 || nextX > 22 || calculatedZ < -22 || calculatedZ > 15;

          if (!insideCenterTable && !insideLeftTable && !insideRightTable && !tooFarAway) {
            nextZ = calculatedZ;
            isSafe = true;
          }
        }
        
        if (!isSafe) {
          // Absolute safe standby spot on the right grass plane
          nextX = 8;
          nextZ = 5;
        }

        targetRef.current.set(nextX, 0, nextZ);
        setIsWalking(true);
        stateTimerRef.current = 0;
      }
    }

    if (hovered) {
      document.body.style.cursor = 'help';
    }
  });

  // Handle interactive clicks on the Cowboy mesh!
  const handleInteraction = (e: any) => {
    e.stopPropagation();
    
    // Choose a random quote
    const nextQuote = COWBOY_QUOTES[Math.floor(Math.random() * COWBOY_QUOTES.length)];
    setSpeech(nextQuote);
    
    // Play fist-fight/boxing animation!
    if (punchAnimName) {
      setIsPlayingPunch(true);
      setIsWalking(false);
      stateTimerRef.current = 0;
    }
    
    // Make Cowboy physically bound/bounce up slightly as tactile feedback
    if (groupRef.current) {
      let tick = 0;
      const interval = setInterval(() => {
        if (groupRef.current) {
          tick += 0.1;
          groupRef.current.position.y = Math.sin(tick * Math.PI) * 0.45;
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
      {/* 3D Model: scale is tuned. Casts beautiful studio shadows */}
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
            
            {/* Highlighted bounding frontier line */}
            <mesh position={[0, 0.45, -0.01]}>
              <planeGeometry args={[2.74, 0.84]} />
              <meshBasicMaterial 
                color="#f59e0b" 
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
          /* Subtle non-intrusive metadata tag */
          <group>
            <mesh position={[0, 0, 0]}>
              <planeGeometry args={[1.5, 0.28]} />
              <meshBasicMaterial 
                color="#f59e0b" 
                transparent 
                opacity={hovered ? 0.95 : 0.7} 
                depthWrite={false}
              />
            </mesh>
            <Text 
              position={[0, 0, 0.01]} 
              fontSize={0.082} 
              fontWeight="bold"
              color="#0f172a"
              font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf"
            >
              {hovered ? "🤠 Wrangler (Klick!)" : "🤠 Cowboy-Bot"}
            </Text>
          </group>
        )}
      </Billboard>
    </group>
  );
};

// Preload resources to keep frame compilation instant and fluid
useGLTF.preload('/Meshy_AI_Meshy_Merged_Animations.glb');
