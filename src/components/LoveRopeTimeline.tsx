import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { MemoryItem, AlbumItem, LoveLetterItem, TimelineEventItem, LoveRopeMilestoneNode } from '../types';
import { User } from 'firebase/auth';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  Heart,
  Sparkles,
  Calendar,
  Clock,
  Camera,
  Video,
  Mail,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Plus,
  Filter,
  Eye,
  Download,
  X,
  Compass,
  ArrowRight,
  List,
  Box,
  FolderHeart,
  Edit2,
  Trash2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';

interface LoveRopeTimelineProps {
  memories: MemoryItem[];
  albums: AlbumItem[];
  letters: LoveLetterItem[];
  timelineEvents: TimelineEventItem[];
  user: User;
  onSelectMemory: (index: number) => void;
  onOpenLetter: (letter: LoveLetterItem) => void;
  onOpenUpload: () => void;
}

export const LoveRopeTimeline: React.FC<LoveRopeTimelineProps> = ({
  memories,
  albums,
  letters,
  timelineEvents,
  user,
  onSelectMemory,
  onOpenLetter,
  onOpenUpload,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [selectedNode, setSelectedNode] = useState<LoveRopeMilestoneNode | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'image' | 'video' | 'letter' | 'milestone'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'3d' | 'list'>('3d');

  // Add / Edit memory on Love Rope modal
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedMemoryToAssign, setSelectedMemoryToAssign] = useState<MemoryItem | null>(null);
  const [assignDate, setAssignDate] = useState('2026-07-10');
  const [assignFrame, setAssignFrame] = useState<'polaroid' | 'charm' | 'heart' | 'ribbon'>('polaroid');
  const [assignCaption, setAssignCaption] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const STARTING_DATE = '2026-07-10'; // 10 July 2026

  // 1. Compile all milestones and memories chronologically along the Love Rope
  const milestoneNodes: LoveRopeMilestoneNode[] = useMemo(() => {
    const map = new Map<string, LoveRopeMilestoneNode>();

    // Always include the fixed starting milestone (10 July 2026)
    map.set(STARTING_DATE, {
      nodeId: 'start_milestone_10july2026',
      date: STARTING_DATE,
      displayDate: '10 JULY 2026',
      label: 'Where Our Journey Begins 💗',
      isStartingPoint: true,
      memories: [],
      letters: [],
      timelineEvents: [],
      isMilestone: true,
      icon: '💍',
    });

    // Attach real memories (from captureDate or timelineDate or uploadedAt)
    memories.filter((m) => !m.isDeleted).forEach((m) => {
      const d = m.timelineDate || (m.captureDate ? m.captureDate.split('T')[0] : (m.uploadedAt || '').split('T')[0]);
      if (!d) return;

      let node = map.get(d);
      if (!node) {
        const dObj = new Date(d + 'T12:00:00');
        const displayDate = dObj.toLocaleDateString(undefined, {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        }).toUpperCase();

        node = {
          nodeId: `node_${d}`,
          date: d,
          displayDate,
          label: m.caption || 'A Beautiful Moment 💗',
          isStartingPoint: false,
          memories: [],
          letters: [],
          timelineEvents: [],
          isMilestone: false,
          icon: '💗',
        };
        map.set(d, node);
      }
      node.memories.push(m);
    });

    // Attach love letters
    letters.forEach((l) => {
      const d = (l.createdAt || '').split('T')[0];
      if (!d) return;
      let node = map.get(d);
      if (!node) {
        const dObj = new Date(d + 'T12:00:00');
        node = {
          nodeId: `node_${d}`,
          date: d,
          displayDate: dObj.toLocaleDateString(undefined, { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase(),
          label: l.title,
          isStartingPoint: false,
          memories: [],
          letters: [],
          timelineEvents: [],
          isMilestone: false,
          icon: '💌',
        };
        map.set(d, node);
      }
      node.letters?.push(l);
    });

    // Attach relationship timeline events
    timelineEvents.forEach((ev) => {
      const d = ev.date;
      if (!d) return;
      let node = map.get(d);
      if (!node) {
        const dObj = new Date(d + 'T12:00:00');
        node = {
          nodeId: `node_${d}`,
          date: d,
          displayDate: dObj.toLocaleDateString(undefined, { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase(),
          label: ev.title,
          isStartingPoint: false,
          memories: [],
          letters: [],
          timelineEvents: [],
          isMilestone: true,
          icon: ev.icon || '🌷',
        };
        map.set(d, node);
      } else {
        node.isMilestone = true;
        if (ev.icon) node.icon = ev.icon;
      }
      node.timelineEvents?.push(ev);
    });

    // Sort chronologically ascending
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [memories, letters, timelineEvents]);

  // Filtered nodes
  const filteredNodes = useMemo(() => {
    return milestoneNodes.filter((node) => {
      if (node.isStartingPoint) return true; // Always show starting point

      // Filter by type
      if (filterType === 'image' && node.memories.every((m) => m.mediaType !== 'image')) return false;
      if (filterType === 'video' && node.memories.every((m) => m.mediaType !== 'video')) return false;
      if (filterType === 'letter' && (!node.letters || node.letters.length === 0)) return false;
      if (filterType === 'milestone' && !node.isMilestone) return false;

      // Filter by year
      if (selectedYear !== 'all' && !node.date.startsWith(selectedYear)) return false;

      // Filter by month
      if (selectedMonth !== 'all') {
        const mStr = selectedMonth.padStart(2, '0');
        if (node.date.split('-')[1] !== mStr) return false;
      }

      // Filter by search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchLabel = node.label.toLowerCase().includes(q);
        const matchMemories = node.memories.some((m) => (m.caption || m.filename).toLowerCase().includes(q));
        return matchLabel || matchMemories;
      }

      return true;
    });
  }, [milestoneNodes, filterType, selectedYear, selectedMonth, searchQuery]);

  // Current selected node index
  const currentIndex = selectedNode
    ? filteredNodes.findIndex((n) => n.nodeId === selectedNode.nodeId)
    : 0;

  // THREE.JS 3D LOVE ROPE SCENE
  const threeState = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    ropeMesh?: THREE.Mesh;
    nodesGroup: THREE.Group;
    starField: THREE.Points;
    targetCameraX: number;
    currentCameraX: number;
    animId: number;
  } | null>(null);

  useEffect(() => {
    if (viewMode !== '3d' || !mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || 550;

    // Scene & Camera
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0xfff8f4, 0.035);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 1.5, 9);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Warm Romantic Lighting
    const ambientLight = new THREE.AmbientLight(0xfff0f5, 1.8);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffe4e6, 2.5);
    mainLight.position.set(5, 10, 7);
    scene.add(mainLight);

    const pinkPointLight = new THREE.PointLight(0xf5a9c8, 3, 20);
    pinkPointLight.position.set(0, 2, 4);
    scene.add(pinkPointLight);

    // Floating Starlight & Rose Dust Particles
    const particleCount = 240;
    const particleGeo = new THREE.BufferGeometry();
    const particlePos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePos[i] = (Math.random() - 0.5) * 50;
      particlePos[i + 1] = (Math.random() - 0.5) * 16;
      particlePos[i + 2] = (Math.random() - 0.5) * 16;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0xf5a9c8,
      size: 0.1,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
    });
    const starField = new THREE.Points(particleGeo, particleMat);
    scene.add(starField);

    // 3D ROPE GEOMETRY (Braided curved ribbon through 3D space)
    const nodeSpacing = 4.2; // Distance between each milestone node along X axis
    const totalPoints = Math.max(5, filteredNodes.length);
    const curvePoints: THREE.Vector3[] = [];

    // Pre-calculate curve control points
    for (let i = 0; i < totalPoints; i++) {
      const x = i * nodeSpacing;
      // Soft gentle sine wave dip between milestones
      const y = Math.sin(i * 0.8) * 0.6 + (i % 2 === 0 ? 0.2 : -0.2);
      const z = Math.cos(i * 0.8) * 0.4;
      curvePoints.push(new THREE.Vector3(x, y, z));
    }

    const curve = new THREE.CatmullRomCurve3(curvePoints);
    const ropeGeometry = new THREE.TubeGeometry(curve, totalPoints * 24, 0.14, 12, false);

    // Braided Rose-Gold / Blush Velvet Rope Material
    const ropeMaterial = new THREE.MeshStandardMaterial({
      color: 0xf5a9c8,
      roughness: 0.45,
      metalness: 0.35,
      emissive: 0x54334f,
      emissiveIntensity: 0.12,
    });
    const ropeMesh = new THREE.Mesh(ropeGeometry, ropeMaterial);
    scene.add(ropeMesh);

    // Group for 3D milestone charms (3D glowing hearts, ribbon knots)
    const nodesGroup = new THREE.Group();
    scene.add(nodesGroup);

    // Create 3D Heart geometry for nodes
    const heartShape = new THREE.Shape();
    heartShape.moveTo(0.25, 0.25);
    heartShape.bezierCurveTo(0.25, 0.25, 0.2, 0, 0, 0);
    heartShape.bezierCurveTo(-0.3, 0, -0.3, 0.35, -0.3, 0.35);
    heartShape.bezierCurveTo(-0.3, 0.55, -0.1, 0.77, 0.25, 1.0);
    heartShape.bezierCurveTo(0.6, 0.77, 0.8, 0.55, 0.8, 0.35);
    heartShape.bezierCurveTo(0.8, 0.35, 0.8, 0, 0.5, 0);
    heartShape.bezierCurveTo(0.35, 0.25, 0.25, 0.25, 0.25, 0.25);
    const heartExtrude = new THREE.ExtrudeGeometry(heartShape, {
      depth: 0.12,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 1,
      bevelSize: 0.04,
      bevelThickness: 0.04,
    });
    heartExtrude.center();

    // Add 3D charms at each milestone
    filteredNodes.forEach((node, i) => {
      const pt = curvePoints[i];
      if (!pt) return;

      const heartMat = new THREE.MeshPhysicalMaterial({
        color: node.isStartingPoint ? 0xff8fa3 : node.isMilestone ? 0xe07a9c : 0xf5a9c8,
        emissive: node.isStartingPoint ? 0xff4d6d : 0x7a5374,
        emissiveIntensity: node.isStartingPoint ? 0.6 : 0.2,
        roughness: 0.2,
        metalness: 0.2,
        transparent: true,
        opacity: 0.95,
      });

      const heartMesh = new THREE.Mesh(heartExtrude, heartMat);
      heartMesh.scale.set(node.isStartingPoint ? 1.0 : 0.6, node.isStartingPoint ? -1.0 : -0.6, 0.6);
      heartMesh.position.set(pt.x, pt.y + 0.1, pt.z);
      nodesGroup.add(heartMesh);

      // Ribbon ring connector
      const ringGeo = new THREE.TorusGeometry(0.22, 0.04, 8, 24);
      const ringMat = new THREE.MeshStandardMaterial({ color: 0xe6c875, metalness: 0.8, roughness: 0.3 });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.set(pt.x, pt.y, pt.z);
      ringMesh.rotation.x = Math.PI / 2;
      nodesGroup.add(ringMesh);
    });

    threeState.current = {
      scene,
      camera,
      renderer,
      ropeMesh,
      nodesGroup,
      starField,
      targetCameraX: 0,
      currentCameraX: 0,
      animId: 0,
    };

    let startTime = Date.now();
    const animate = () => {
      threeState.current!.animId = requestAnimationFrame(animate);
      const elapsed = (Date.now() - startTime) / 1000;

      // Smooth camera interpolation towards target node
      threeState.current!.currentCameraX +=
        (threeState.current!.targetCameraX - threeState.current!.currentCameraX) * 0.08;
      camera.position.x = threeState.current!.currentCameraX;
      pinkPointLight.position.x = threeState.current!.currentCameraX;

      // Gentle rope swaying simulation
      starField.rotation.y = elapsed * 0.03;
      nodesGroup.children.forEach((child, idx) => {
        child.position.y += Math.sin(elapsed * 2 + idx) * 0.0015;
      });

      renderer.render(scene, camera);
    };

    animate();

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
      cancelAnimationFrame(threeState.current?.animId || 0);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      ropeGeometry.dispose();
      ropeMaterial.dispose();
      heartExtrude.dispose();
      particleGeo.dispose();
      particleMat.dispose();
    };
  }, [filteredNodes, viewMode]);

  // Navigate camera to a specific milestone node
  const handleJumpToNode = (node: LoveRopeMilestoneNode, idx: number) => {
    setSelectedNode(node);
    const targetX = idx * 4.2;
    if (threeState.current) {
      threeState.current.targetCameraX = targetX;
    }
  };

  const handleNextNode = () => {
    if (currentIndex < filteredNodes.length - 1) {
      const nextIdx = currentIndex + 1;
      handleJumpToNode(filteredNodes[nextIdx], nextIdx);
    }
  };

  const handlePrevNode = () => {
    if (currentIndex > 0) {
      const prevIdx = currentIndex - 1;
      handleJumpToNode(filteredNodes[prevIdx], prevIdx);
    }
  };

  const handleReturnToBeginning = () => {
    if (filteredNodes.length > 0) {
      handleJumpToNode(filteredNodes[0], 0);
    }
  };

  const handleJumpToLatest = () => {
    if (filteredNodes.length > 0) {
      const lastIdx = filteredNodes.length - 1;
      handleJumpToNode(filteredNodes[lastIdx], lastIdx);
    }
  };

  // Assign Memory to Love Rope Date
  const handleOpenAssignModal = (m?: MemoryItem) => {
    setSelectedMemoryToAssign(m || null);
    setAssignDate(m?.captureDate || m?.timelineDate || STARTING_DATE);
    setAssignCaption(m?.caption || '');
    setAssignFrame(m?.frameStyle || 'polaroid');
    setIsAssignModalOpen(true);
  };

  const handleSaveMemoryToRope = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemoryToAssign) return;

    setIsSubmitting(true);
    try {
      const memoryRef = doc(db, 'memories', selectedMemoryToAssign.memoryId);
      await updateDoc(memoryRef, {
        timelineDate: assignDate,
        caption: assignCaption.trim(),
        frameStyle: assignFrame,
        onLoveRope: true,
      });

      setIsAssignModalOpen(false);
      confetti({ particleCount: 25, spread: 60, colors: ['#FFD6E7', '#F5A9C8', '#E07A9C'] });
    } catch (err) {
      console.error("Failed assigning memory to Love Rope:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 select-none">
      {/* TOP HEADER & TITLE */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-[#FFD6E7] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-[11px] font-semibold text-[#E07A9C] border border-[#FFD6E7] shadow-2xs mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Begins 10 July 2026 · Where Our Journey Begins 💗</span>
          </span>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#54334F] tracking-tight">
            3D Love Rope Timeline
          </h2>
          <p className="text-xs sm:text-sm text-[#7A5374] mt-1">
            Every meaningful day, photo, and sweet note physically connected along our love story's braided rope.
          </p>
        </div>

        {/* View mode toggle & Action */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1 p-1 bg-white rounded-xl border border-[#FFD6E7]">
            <button
              onClick={() => setViewMode('3d')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === '3d'
                  ? 'bg-gradient-to-r from-[#F5A9C8] to-[#FFD6E7] text-[#54334F] shadow-xs'
                  : 'text-[#7A5374] hover:text-[#54334F]'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>3D Rope</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-gradient-to-r from-[#F5A9C8] to-[#FFD6E7] text-[#54334F] shadow-xs'
                  : 'text-[#7A5374] hover:text-[#54334F]'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Scrapbook View</span>
            </button>
          </div>

          <button
            onClick={() => handleOpenAssignModal()}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#F5A9C8] via-[#E07A9C] to-[#54334F] text-white text-xs font-semibold shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add to Love Rope</span>
          </button>
        </div>
      </div>

      {/* FILTER & DATE CONTROLS TOOLBAR */}
      <div className="glass-panel rounded-2xl p-4 border border-[#FFD6E7] flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Category Filters */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {(['all', 'image', 'video', 'letter', 'milestone'] as const).map((ft) => (
            <button
              key={ft}
              onClick={() => setFilterType(ft)}
              className={`px-3 py-1.5 rounded-xl capitalize font-medium transition-all cursor-pointer shrink-0 ${
                filterType === ft
                  ? 'bg-[#54334F] text-white shadow-xs'
                  : 'bg-white/80 hover:bg-white text-[#7A5374] border border-[#FFD6E7]'
              }`}
            >
              {ft === 'all' && 'All Memories'}
              {ft === 'image' && 'Photos 📸'}
              {ft === 'video' && 'Videos 🎥'}
              {ft === 'letter' && 'Letters 💌'}
              {ft === 'milestone' && 'Milestones 🌷'}
            </button>
          ))}
        </div>

        {/* Camera Quick Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleReturnToBeginning}
            className="px-3 py-1.5 rounded-xl bg-white border border-[#FFD6E7] hover:bg-[#FFF0F5] text-[11px] font-semibold text-[#54334F] flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3 text-[#E07A9C]" />
            <span>10 July 2026 Start</span>
          </button>
          <button
            onClick={handleJumpToLatest}
            className="px-3 py-1.5 rounded-xl bg-white border border-[#FFD6E7] hover:bg-[#FFF0F5] text-[11px] font-semibold text-[#54334F] flex items-center gap-1 cursor-pointer"
          >
            <span>Latest Memory</span>
            <ArrowRight className="w-3 h-3 text-[#E07A9C]" />
          </button>
        </div>
      </div>

      {/* 3D VIEWPORT CONTAINER */}
      {viewMode === '3d' ? (
        <div className="relative w-full h-[540px] sm:h-[600px] rounded-3xl overflow-hidden glass-panel border border-[#FFD6E7] shadow-lg flex flex-col justify-between">
          {/* Three.js Canvas Element */}
          <div ref={mountRef} className="absolute inset-0 z-10 cursor-grab active:cursor-grabbing" />

          {/* Top Controls Overlay */}
          <div className="relative z-20 p-4 sm:p-6 flex items-center justify-between pointer-events-none">
            <div className="bg-white/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-[#FFD6E7] shadow-2xs pointer-events-auto flex items-center gap-2 text-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-[#E07A9C] animate-pulse" />
              <span className="font-semibold text-[#54334F]">
                Milestone {currentIndex + 1} of {filteredNodes.length}
              </span>
            </div>

            <div className="flex items-center gap-2 pointer-events-auto">
              <button
                onClick={handlePrevNode}
                disabled={currentIndex === 0}
                className="p-2 rounded-full bg-white/80 hover:bg-white border border-[#FFD6E7] text-[#54334F] shadow-xs cursor-pointer disabled:opacity-40"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={handleNextNode}
                disabled={currentIndex === filteredNodes.length - 1}
                className="p-2 rounded-full bg-white/80 hover:bg-white border border-[#FFD6E7] text-[#54334F] shadow-xs cursor-pointer disabled:opacity-40"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Bottom Floating Interactive Date Milestones Cards Strip */}
          <div className="relative z-20 p-4 sm:p-6 overflow-x-auto flex gap-3 pointer-events-auto pb-4">
            {filteredNodes.map((node, idx) => {
              const isSelected = selectedNode?.nodeId === node.nodeId || (!selectedNode && idx === 0);

              return (
                <motion.div
                  key={node.nodeId}
                  whileHover={{ y: -4 }}
                  onClick={() => handleJumpToNode(node, idx)}
                  className={`min-w-[190px] sm:min-w-[210px] p-3 rounded-2xl border transition-all cursor-pointer backdrop-blur-md flex flex-col justify-between ${
                    isSelected
                      ? 'bg-gradient-to-tr from-[#FFF0F5] to-white border-2 border-[#E07A9C] shadow-lg ring-2 ring-[#F5A9C8]/40 scale-105'
                      : 'bg-white/85 hover:bg-white border-[#FFD6E7] shadow-xs'
                  }`}
                >
                  <div>
                    {/* Node Header */}
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-base">{node.icon || '💗'}</span>
                      {node.isStartingPoint && (
                        <span className="px-2 py-0.5 rounded-full bg-rose-100 text-[10px] font-bold text-rose-700">
                          Journey Start
                        </span>
                      )}
                    </div>

                    <h4 className="font-serif font-bold text-xs text-[#54334F] truncate">
                      {node.displayDate}
                    </h4>
                    <p className="text-[11px] text-[#7A5374] truncate mt-0.5">
                      {node.label}
                    </p>
                  </div>

                  {/* Thumbnail Preview if photos attached */}
                  {node.memories.length > 0 && (
                    <div className="flex gap-1.5 mt-2">
                      {node.memories.slice(0, 3).map((m) => (
                        <div key={m.id} className="w-8 h-8 rounded-lg overflow-hidden bg-[#FFF0F5] border border-[#FFD6E7] shrink-0">
                          <img src={m.downloadUrl} alt="" className="w-full h-full object-cover" />
                        </div>
                      ))}
                      {node.memories.length > 3 && (
                        <div className="w-8 h-8 rounded-lg bg-[#FFF0F5] border border-[#FFD6E7] flex items-center justify-center text-[10px] font-bold text-[#E07A9C]">
                          +{node.memories.length - 3}
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      ) : (
        /* SCRAPBOOK LIST VIEW (Accessible Alternative) */
        <div className="space-y-4">
          {filteredNodes.map((node, idx) => (
            <div
              key={node.nodeId}
              onClick={() => setSelectedNode(node)}
              className="glass-panel p-5 rounded-3xl border border-[#FFD6E7] hover:border-[#F5A9C8] transition-all cursor-pointer shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#FFF0F5] border border-[#FFD6E7] flex items-center justify-center text-2xl shrink-0">
                  {node.icon || '💗'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-serif font-bold text-lg text-[#54334F]">
                      {node.displayDate}
                    </span>
                    {node.isStartingPoint && (
                      <span className="px-2 py-0.5 rounded-full bg-rose-100 text-[10px] font-bold text-rose-700">
                        Where Our Journey Begins 💗
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#7A5374] mt-0.5 font-medium">{node.label}</p>
                </div>
              </div>

              {/* Photos attached */}
              <div className="flex items-center gap-2">
                {node.memories.slice(0, 4).map((m) => (
                  <div key={m.id} className="w-12 h-12 rounded-xl overflow-hidden bg-[#FFF0F5] border border-[#FFD6E7]">
                    <img src={m.downloadUrl} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
                <div className="text-xs font-semibold text-[#E07A9C] flex items-center gap-1 ml-2">
                  <span>Explore</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SELECTED DATE MILESTONE DRAWER / MODAL */}
      <AnimatePresence>
        {selectedNode && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:justify-end p-0 sm:p-6 bg-black/45 backdrop-blur-xs">
            <motion.div
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 280 }}
              className="w-full sm:max-w-md bg-[#FFF8F4] h-[85vh] sm:h-full rounded-t-3xl sm:rounded-3xl shadow-2xl border-l border-[#FFD6E7] p-6 flex flex-col justify-between overflow-hidden text-[#54334F]"
            >
              {/* Header */}
              <div className="pb-4 border-b border-[#FFD6E7]/80 flex items-center justify-between">
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-[#E07A9C] font-semibold">
                    A little piece of our story 💗
                  </span>
                  <h3 className="font-serif font-bold text-2xl text-[#54334F] mt-0.5">
                    {selectedNode.displayDate}
                  </h3>
                  <p className="text-xs text-[#7A5374]">{selectedNode.label}</p>
                </div>

                <button
                  onClick={() => setSelectedNode(null)}
                  className="p-2 rounded-full hover:bg-white text-[#7A5374] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Node Memories Content */}
              <div className="flex-1 overflow-y-auto py-4 space-y-4">
                {selectedNode.memories.length === 0 &&
                (!selectedNode.letters || selectedNode.letters.length === 0) ? (
                  <div className="p-8 text-center bg-white/70 rounded-2xl border border-[#FFD6E7] space-y-3">
                    <Heart className="w-8 h-8 text-[#E07A9C] mx-auto animate-gentle-pulse" />
                    <h5 className="font-serif font-bold text-base text-[#54334F]">
                      {selectedNode.isStartingPoint
                        ? '10 July 2026 — Where Our Journey Begins'
                        : 'No photos attached to this date yet.'}
                    </h5>
                    <p className="text-xs text-[#7A5374] leading-relaxed">
                      {selectedNode.isStartingPoint
                        ? 'Every memory added on or after this date will hang beautifully along our Love Rope.'
                        : 'Attach photos, videos, or love letters from this day to see them hang from the rope.'}
                    </p>
                    <button
                      onClick={() => {
                        setSelectedNode(null);
                        handleOpenAssignModal();
                      }}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#F5A9C8] to-[#54334F] text-white text-xs font-semibold shadow-xs"
                    >
                      Attach a Memory to This Date
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Photos on this rope node */}
                    <div className="grid grid-cols-2 gap-3">
                      {selectedNode.memories.map((m) => {
                        const fullIdx = memories.findIndex((item) => item.id === m.id);
                        return (
                          <div
                            key={m.id}
                            onClick={() => {
                              if (fullIdx !== -1) onSelectMemory(fullIdx);
                            }}
                            className="polaroid-card rounded-2xl cursor-pointer"
                          >
                            <div className="aspect-square rounded-xl overflow-hidden bg-[#FFF0F5] mb-1.5">
                              {m.mediaType === 'video' ? (
                                <video src={m.downloadUrl} className="w-full h-full object-cover" />
                              ) : (
                                <img src={m.downloadUrl} alt="" className="w-full h-full object-cover" />
                              )}
                            </div>
                            <p className="font-serif font-semibold text-xs text-[#54334F] truncate">
                              {m.caption || m.filename}
                            </p>
                            <span className="text-[10px] text-[#7A5374]">
                              Uploaded {new Date(m.uploadedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Letters on this rope node */}
                    {selectedNode.letters && selectedNode.letters.length > 0 && (
                      <div className="space-y-2 pt-2">
                        <span className="text-xs font-semibold uppercase text-[#7A5374]">Letters from this date</span>
                        {selectedNode.letters.map((l) => (
                          <div
                            key={l.letterId}
                            onClick={() => onOpenLetter(l)}
                            className="p-3 bg-white rounded-xl border border-[#FFD6E7] hover:border-[#F5A9C8] cursor-pointer"
                          >
                            <span className="font-serif font-bold text-sm text-[#54334F]">{l.title}</span>
                            <p className="text-xs text-[#7A5374] line-clamp-1 mt-0.5">{l.content}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-[#FFD6E7]/80 flex items-center justify-between">
                <button
                  onClick={() => {
                    setSelectedNode(null);
                    handleOpenAssignModal();
                  }}
                  className="text-xs font-semibold text-[#E07A9C] hover:underline cursor-pointer"
                >
                  + Attach Another Memory
                </button>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="px-4 py-2 rounded-xl bg-white border border-[#FFD6E7] text-xs font-semibold text-[#54334F]"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ASSIGN MEMORY TO LOVE ROPE MODAL */}
      <AnimatePresence>
        {isAssignModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-[#FFF8F4] rounded-3xl p-6 sm:p-7 shadow-2xl border border-[#FFD6E7] max-h-[90vh] flex flex-col"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#FFD6E7]">
                <h3 className="font-serif font-bold text-xl text-[#54334F] flex items-center gap-2">
                  <Heart className="w-5 h-5 text-[#E07A9C]" />
                  <span>Attach to 3D Love Rope</span>
                </h3>
                <button
                  onClick={() => setIsAssignModalOpen(false)}
                  className="p-1 rounded-full hover:bg-white text-[#7A5374]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveMemoryToRope} className="space-y-4 py-4 overflow-y-auto">
                {/* Pick Memory from Gallery if none selected */}
                <div>
                  <label className="text-xs font-semibold text-[#54334F] block mb-1.5">
                    Select Memory from Vault *
                  </label>
                  {memories.length === 0 ? (
                    <div className="p-4 text-center bg-white rounded-xl border border-[#FFD6E7] text-xs text-[#7A5374]">
                      No memories uploaded yet. Please upload a photo or video first.
                    </div>
                  ) : (
                    <div className="flex gap-2.5 overflow-x-auto py-2">
                      {memories.filter((m) => !m.isDeleted).map((m) => {
                        const isChosen = selectedMemoryToAssign?.id === m.id;
                        return (
                          <div
                            key={m.id}
                            onClick={() => {
                              setSelectedMemoryToAssign(m);
                              setAssignDate(m.captureDate || m.timelineDate || STARTING_DATE);
                              setAssignCaption(m.caption || '');
                            }}
                            className={`w-20 h-20 rounded-2xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer relative ${
                              isChosen ? 'border-[#E07A9C] scale-105 shadow-md' : 'border-transparent opacity-70 hover:opacity-100'
                            }`}
                          >
                            <img src={m.downloadUrl} alt="" className="w-full h-full object-cover" />
                            {isChosen && (
                              <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#E07A9C] text-white flex items-center justify-center text-[10px]">
                                ✓
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Timeline Date Picker */}
                <div>
                  <label className="text-xs font-semibold text-[#54334F] block mb-1">
                    Timeline Date on Rope *
                  </label>
                  <input
                    type="date"
                    required
                    value={assignDate}
                    onChange={(e) => setAssignDate(e.target.value)}
                    className="w-full text-xs rounded-xl bg-white border border-[#FFD6E7] p-2.5 text-[#54334F] focus:outline-none"
                  />
                  <span className="text-[10px] text-[#7A5374] mt-0.5 block">
                    Rope begins on 10 July 2026. This date determines where the memory hangs along the timeline.
                  </span>
                </div>

                {/* Optional Caption */}
                <div>
                  <label className="text-xs font-semibold text-[#54334F] block mb-1">
                    Romantic Caption
                  </label>
                  <input
                    type="text"
                    value={assignCaption}
                    onChange={(e) => setAssignCaption(e.target.value)}
                    placeholder="e.g. When you surprised me with lilies 🌷"
                    className="w-full text-xs rounded-xl bg-white border border-[#FFD6E7] p-2.5 text-[#54334F] focus:outline-none"
                  />
                </div>

                {/* Frame Style */}
                <div>
                  <label className="text-xs font-semibold text-[#54334F] block mb-1">
                    Hanging Frame Style
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: 'polaroid', name: 'Polaroid 📸' },
                      { id: 'charm', name: 'Charm 🧸' },
                      { id: 'heart', name: 'Heart 💖' },
                      { id: 'ribbon', name: 'Ribbon 🎀' },
                    ].map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setAssignFrame(f.id as any)}
                        className={`p-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                          assignFrame === f.id
                            ? 'bg-[#E07A9C] text-white shadow-xs'
                            : 'bg-white border border-[#FFD6E7] text-[#7A5374]'
                        }`}
                      >
                        {f.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Submit */}
                <div className="pt-3 border-t border-[#FFD6E7] flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAssignModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-[#7A5374] hover:bg-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !selectedMemoryToAssign}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#F5A9C8] via-[#E07A9C] to-[#54334F] text-white text-xs font-semibold shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? 'Attaching...' : 'Attach to Rope 💗'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
