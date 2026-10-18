import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Sparkles, FastForward } from 'lucide-react';
import { getRandomQuote, RomanticQuote } from '../lib/romanticQuotes';

interface RomanticLoadingScreenProps {
  onComplete: () => void;
}

export const RomanticLoadingScreen: React.FC<RomanticLoadingScreenProps> = ({ onComplete }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [quote, setQuote] = useState<RomanticQuote>(getRandomQuote());
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState<number>(1); // 1: stars/gradient, 2: hearts floating, 3: merge, 4: title & quote
  const [isMerged, setIsMerged] = useState(false);

  useEffect(() => {
    setQuote(getRandomQuote());

    // Three.js 3D Canvas setup
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.z = 8;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Ambient and Point lights for translucent glowing 3D look
    const ambientLight = new THREE.AmbientLight(0xffd6e7, 1.2);
    scene.add(ambientLight);

    const pinkLight = new THREE.PointLight(0xf5a9c8, 3, 20);
    pinkLight.position.set(2, 3, 4);
    scene.add(pinkLight);

    const lavenderLight = new THREE.PointLight(0xe9ddfb, 2, 20);
    lavenderLight.position.set(-2, -3, 3);
    scene.add(lavenderLight);

    // Particle Stars and Dust
    const particleCount = 200;
    const particlesGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 16;
      positions[i + 1] = (Math.random() - 0.5) * 16;
      positions[i + 2] = (Math.random() - 0.5) * 10;
    }
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const particlesMaterial = new THREE.PointsMaterial({
      color: 0xffd6e7,
      size: 0.08,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
    });
    const starField = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(starField);

    // Create 3D Heart Shape Geometry
    const shape = new THREE.Shape();
    const x = 0, y = 0;
    shape.moveTo(x + 0.25, y + 0.25);
    shape.bezierCurveTo(x + 0.25, y + 0.25, x + 0.2, y, x, y);
    shape.bezierCurveTo(x - 0.3, y, x - 0.3, y + 0.35, x - 0.3, y + 0.35);
    shape.bezierCurveTo(x - 0.3, y + 0.55, x - 0.1, y + 0.77, x + 0.25, y + 1.0);
    shape.bezierCurveTo(x + 0.6, y + 0.77, x + 0.8, y + 0.55, x + 0.8, y + 0.35);
    shape.bezierCurveTo(x + 0.8, y + 0.35, x + 0.8, y, x + 0.5, y);
    shape.bezierCurveTo(x + 0.35, y, x + 0.25, y + 0.25, x + 0.25, y + 0.25);

    const extrudeSettings = {
      depth: 0.25,
      bevelEnabled: true,
      bevelSegments: 4,
      steps: 2,
      bevelSize: 0.08,
      bevelThickness: 0.08,
    };

    const heartGeometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    heartGeometry.center();

    // Translucent glowing glass-like materials
    const heartMat1 = new THREE.MeshPhysicalMaterial({
      color: 0xf5a9c8,
      roughness: 0.15,
      metalness: 0.1,
      transmission: 0.6,
      transparent: true,
      opacity: 0.9,
      emissive: 0xff8fa3,
      emissiveIntensity: 0.4,
    });

    const heartMat2 = new THREE.MeshPhysicalMaterial({
      color: 0xe9ddfb,
      roughness: 0.15,
      metalness: 0.1,
      transmission: 0.6,
      transparent: true,
      opacity: 0.9,
      emissive: 0x9b5de5,
      emissiveIntensity: 0.35,
    });

    // Heart 1 (left) and Heart 2 (right)
    const heartMesh1 = new THREE.Mesh(heartGeometry, heartMat1);
    heartMesh1.scale.set(1.4, -1.4, 1.4); // Inverted on Y so heart points downwards
    heartMesh1.position.set(-2.5, 0, 0);
    scene.add(heartMesh1);

    const heartMesh2 = new THREE.Mesh(heartGeometry, heartMat2);
    heartMesh2.scale.set(1.4, -1.4, 1.4);
    heartMesh2.position.set(2.5, 0, 0);
    scene.add(heartMesh2);

    let animationFrameId: number;
    let startTime = Date.now();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsed = (Date.now() - startTime) / 1000;

      // Slow particle field drift
      starField.rotation.y = elapsed * 0.05;
      starField.rotation.x = elapsed * 0.02;

      // Move hearts toward center: from t=0.5 to t=2.5s
      if (elapsed < 2.5) {
        const factor = Math.min(1, Math.max(0, (elapsed - 0.5) / 1.8));
        // ease in out
        const ease = factor < 0.5 ? 2 * factor * factor : -1 + (4 - 2 * factor) * factor;
        heartMesh1.position.x = -2.5 + ease * 2.5;
        heartMesh2.position.x = 2.5 - ease * 2.5;

        heartMesh1.rotation.y = elapsed * 1.5;
        heartMesh2.rotation.y = -elapsed * 1.5;
      } else {
        // Merged single glowing heart
        if (!isMerged) {
          setIsMerged(true);
        }
        heartMesh1.position.set(0, 0, 0);
        heartMesh2.position.set(0, 0, 0);
        // Pulse animation
        const pulse = 1.4 + Math.sin(elapsed * 4) * 0.12;
        heartMesh1.scale.set(pulse, -pulse, pulse);
        heartMesh2.scale.set(pulse, -pulse, pulse);
        heartMesh1.rotation.y = elapsed * 0.8;
        heartMesh2.rotation.y = elapsed * 0.8;

        // Boost emissive glow
        heartMat1.emissiveIntensity = 0.8 + Math.sin(elapsed * 4) * 0.3;
      }

      renderer.render(scene, camera);
    };

    animate();

    // Timeline stages
    const timer1 = setTimeout(() => setStep(2), 600);
    const timer2 = setTimeout(() => setStep(3), 2000);
    const timer3 = setTimeout(() => setStep(4), 3000);

    // Progress bar ticker
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 2.5;
      });
    }, 80);

    // Complete loading after ~4 seconds
    const completeTimer = setTimeout(() => {
      onComplete();
    }, 4200);

    const handleResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      clearInterval(progressInterval);
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(completeTimer);
      window.removeEventListener('resize', handleResize);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      heartGeometry.dispose();
      heartMat1.dispose();
      heartMat2.dispose();
      particlesGeometry.dispose();
      particlesMaterial.dispose();
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between overflow-hidden bg-gradient-to-b from-[#FFF0F5] via-[#FFF8F4] to-[#E9DDFB] p-6 select-none">
      {/* Background Floating Hearts */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-heart-float opacity-30 text-[#F5A9C8]"
            style={{
              left: `${(i * 9 + 4) % 94}%`,
              bottom: `-20px`,
              animationDelay: `${i * 0.4}s`,
              animationDuration: `${3.5 + (i % 3)}s`,
              fontSize: `${16 + (i % 4) * 8}px`,
            }}
          >
            💗
          </div>
        ))}
      </div>

      {/* Top Header / Skip Button */}
      <div className="w-full max-w-4xl flex items-center justify-between z-20 pt-2">
        <div className="flex items-center gap-2 text-xs tracking-wider uppercase text-[#7A5374]/70">
          <Sparkles className="w-3.5 h-3.5 text-[#F5A9C8]" />
          <span>Our Private Sanctuary</span>
        </div>
        <button
          onClick={onComplete}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-[#7A5374] hover:text-[#54334F] bg-white/60 hover:bg-white/90 backdrop-blur-sm transition-all border border-[#FFD6E7]/50 shadow-xs cursor-pointer"
        >
          <span>Skip to Vault</span>
          <FastForward className="w-3 h-3" />
        </button>
      </div>

      {/* 3D Scene Viewport */}
      <div className="relative w-full flex-1 flex items-center justify-center">
        <div ref={mountRef} className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none" />

        {/* Center Title & Romantic Glow */}
        <div className="z-20 text-center pointer-events-none mt-40">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: step >= 3 ? 1 : 0, scale: step >= 3 ? 1 : 0.9 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <h1 className="text-4xl md:text-5xl font-serif font-bold tracking-tight text-[#54334F] drop-shadow-xs">
              Forever Us
            </h1>
            <p className="text-sm font-handwriting text-2xl text-[#E07A9C] mt-1">
              Every little moment, saved forever.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Bottom Quote & Glowing Progress Bar */}
      <div className="w-full max-w-xl z-20 flex flex-col items-center pb-8 px-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={quote.quote}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.7 }}
            className="text-center mb-6"
          >
            <p className="text-base md:text-lg font-serif italic text-[#54334F]/90 leading-relaxed px-4">
              "{quote.quote}"
            </p>
            <span className="text-xs uppercase tracking-widest text-[#7A5374]/60 mt-1 block">
              — {quote.author}
            </span>
          </motion.div>
        </AnimatePresence>

        {/* Glowing Thin Progress Bar */}
        <div className="w-full max-w-xs h-1.5 bg-white/60 rounded-full overflow-hidden p-0.5 border border-[#FFD6E7]">
          <motion.div
            className="h-full bg-gradient-to-r from-[#F5A9C8] via-[#E07A9C] to-[#E9DDFB] rounded-full shadow-[0_0_12px_rgba(245,169,200,0.8)]"
            style={{ width: `${progress}%` }}
            transition={{ ease: "linear" }}
          />
        </div>

        <div className="flex items-center gap-1.5 text-xs text-[#7A5374]/70 mt-3 font-medium">
          <Heart className="w-3 h-3 text-[#F5A9C8] fill-[#F5A9C8] animate-pulse" />
          <span>Opening our little universe... {Math.round(progress)}%</span>
        </div>
      </div>
    </div>
  );
};
