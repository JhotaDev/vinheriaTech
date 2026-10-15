import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface WineBottle3DProps {
  temperature: number;
  humidity: number;
  isAlarmActive: boolean;
  isAlarmExtreme: boolean;
  isAlarmCritical: boolean;
  isAcknowledged: boolean;
}

export const WineBottle3D: React.FC<WineBottle3DProps> = ({
  temperature,
  isAlarmActive,
  isAlarmExtreme,
  isAlarmCritical,
  isAcknowledged
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 1.5, 5.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    // Group for rotation
    const wineGroup = new THREE.Group();
    scene.add(wineGroup);

    // 1. Pedestal Base
    const pedestalGeo = new THREE.CylinderGeometry(1.6, 1.8, 0.25, 48);
    const pedestalMat = new THREE.MeshStandardMaterial({
      color: 0x1a0d16,
      roughness: 0.3,
      metalness: 0.8,
    });
    const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
    pedestal.position.y = -1.6;
    wineGroup.add(pedestal);

    // Glowing Pedestal Ring
    const ringGeo = new THREE.TorusGeometry(1.58, 0.04, 16, 64);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xe11d48 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -1.48;
    wineGroup.add(ring);

    // 2. Wine Bottle Geometry
    // Bottle Body
    const bodyGeo = new THREE.CylinderGeometry(0.55, 0.55, 1.8, 32);
    // Dark green/ruby glass
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x220512,
      roughness: 0.1,
      metalness: 0.1,
      transmission: 0.7,
      transparent: true,
      opacity: 0.9,
      ior: 1.5,
      reflectivity: 0.9,
    });
    const bottleBody = new THREE.Mesh(bodyGeo, glassMat);
    bottleBody.position.y = -0.5;
    wineGroup.add(bottleBody);

    // Bottle Shoulder (Cone)
    const shoulderGeo = new THREE.ConeGeometry(0.55, 0.7, 32, 1, true);
    const bottleShoulder = new THREE.Mesh(shoulderGeo, glassMat);
    bottleShoulder.position.y = 0.55;
    wineGroup.add(bottleShoulder);

    // Bottle Neck
    const neckGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.9, 32);
    const bottleNeck = new THREE.Mesh(neckGeo, glassMat);
    bottleNeck.position.y = 1.1;
    wineGroup.add(bottleNeck);

    // Bottle Lip / Ring
    const lipGeo = new THREE.TorusGeometry(0.2, 0.035, 16, 32);
    const bottleLip = new THREE.Mesh(lipGeo, glassMat);
    bottleLip.rotation.x = Math.PI / 2;
    bottleLip.position.y = 1.55;
    wineGroup.add(bottleLip);

    // Wine Bottle Label (Front Texture plane)
    const labelGeo = new THREE.CylinderGeometry(0.56, 0.56, 0.95, 32, 1, true, -Math.PI / 3, (2 * Math.PI) / 3);
    const labelCanvas = document.createElement('canvas');
    labelCanvas.width = 512;
    labelCanvas.height = 512;
    const ctx = labelCanvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, 512, 512);
      ctx.strokeStyle = '#991b1b';
      ctx.lineWidth = 14;
      ctx.strokeRect(20, 20, 472, 472);
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 4;
      ctx.strokeRect(36, 36, 440, 440);

      ctx.fillStyle = '#881337';
      ctx.font = 'bold 36px serif';
      ctx.textAlign = 'center';
      ctx.fillText('EQUIPE PRISMA', 256, 120);

      ctx.fillStyle = '#0f172a';
      ctx.font = 'italic 24px sans-serif';
      ctx.fillText('Reserva Gran Cuvee', 256, 170);

      ctx.fillStyle = '#b45309';
      ctx.font = 'bold 72px serif';
      ctx.fillText('VT', 256, 260);

      ctx.fillStyle = '#475569';
      ctx.font = '18px sans-serif';
      ctx.fillText('VINHERIA TECH - 2026', 256, 330);
      ctx.fillText('Controle Termico Inteligente', 256, 370);
      ctx.fillText('Safra Exclusiva', 256, 410);
    }
    const labelTex = new THREE.CanvasTexture(labelCanvas);
    const labelMat = new THREE.MeshStandardMaterial({
      map: labelTex,
      roughness: 0.6,
      metalness: 0.1,
    });
    const label = new THREE.Mesh(labelGeo, labelMat);
    label.position.y = -0.55;
    wineGroup.add(label);

    // Gold Foil / Capsule on top
    const foilGeo = new THREE.CylinderGeometry(0.185, 0.185, 0.5, 32);
    const foilMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.25,
      metalness: 0.9,
    });
    const foil = new THREE.Mesh(foilGeo, foilMat);
    foil.position.y = 1.35;
    wineGroup.add(foil);

    // 3. Floating Ambient Particles (Sparks / Frost / Ember)
    const particleCount = 75;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 3.5;
      positions[i + 1] = (Math.random() - 0.5) * 4.0;
      positions[i + 2] = (Math.random() - 0.5) * 3.5;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({
      size: 0.055,
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffeedd, 2.0);
    mainLight.position.set(4, 6, 5);
    scene.add(mainLight);

    const rimLight = new THREE.DirectionalLight(0xe11d48, 2.5);
    rimLight.position.set(-4, -1, -3);
    scene.add(rimLight);

    const statusBeacon = new THREE.PointLight(0x10b981, 3, 7);
    statusBeacon.position.set(0, 0, 1.2);
    wineGroup.add(statusBeacon);

    // Mouse interactive drag rotation
    let isDragging = false;
    let previousMouseX = 0;
    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      previousMouseX = e.clientX;
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - previousMouseX;
      wineGroup.rotation.y += deltaX * 0.01;
      previousMouseX = e.clientX;
    };
    const onMouseUp = () => { isDragging = false; };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    // Resize handler
    const handleResize = () => {
      if (!mountRef.current) return;
      const newW = mountRef.current.clientWidth;
      const newH = mountRef.current.clientHeight;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };
    window.addEventListener('resize', handleResize);

    // Animation Loop
    let animationId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Slow auto-rotation when not dragging
      if (!isDragging) {
        wineGroup.rotation.y += 0.007;
      }

      // Gentle floating bob
      wineGroup.position.y = Math.sin(elapsedTime * 1.5) * 0.08;

      // Particle subtle swirl
      particles.rotation.y = elapsedTime * 0.05;

      // Dynamic Color Adjustment based on System State
      if (isAlarmExtreme) {
        // Alerta Extremo: Luz pulsante vermelha violenta
        const pulse = (Math.sin(elapsedTime * 12) + 1) / 2;
        statusBeacon.color.setHex(0xff0033);
        statusBeacon.intensity = 4 + pulse * 6;
        ringMat.color.setHex(pulse > 0.5 ? 0xff0000 : 0x550000);
        particleMat.color.setHex(0xff2200);
      } else if (isAlarmCritical) {
        // Alerta Crítico: Luz pulsante amarela/laranja
        const pulse = (Math.sin(elapsedTime * 6) + 1) / 2;
        statusBeacon.color.setHex(0xf59e0b);
        statusBeacon.intensity = 3 + pulse * 3;
        ringMat.color.setHex(0xf59e0b);
        particleMat.color.setHex(0xfbbf24);
      } else if (isAcknowledged) {
        // Reconhecido por RFID: Luz azul ciano suave
        statusBeacon.color.setHex(0x06b6d4);
        statusBeacon.intensity = 2.5;
        ringMat.color.setHex(0x06b6d4);
        particleMat.color.setHex(0x38bdf8);
      } else {
        // Normal: Esmeralda de segurança
        statusBeacon.color.setHex(0x10b981);
        statusBeacon.intensity = 1.8;
        ringMat.color.setHex(0x10b981);
        particleMat.color.setHex(0x34d399);
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('resize', handleResize);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [temperature, isAlarmActive, isAlarmExtreme, isAlarmCritical, isAcknowledged]);

  return (
    <div className="relative w-full h-[360px] md:h-[420px] rounded-2xl overflow-hidden glass-panel flex items-center justify-center">
      {/* 3D Canvas */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Overlay Badge */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2 pointer-events-none">
        <span className="relative flex h-3 w-3">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
            isAlarmExtreme ? 'bg-red-500' : isAlarmCritical ? 'bg-amber-400' : isAcknowledged ? 'bg-cyan-400' : 'bg-emerald-400'
          }`} />
          <span className={`relative inline-flex rounded-full h-3 w-3 ${
            isAlarmExtreme ? 'bg-red-600' : isAlarmCritical ? 'bg-amber-500' : isAcknowledged ? 'bg-cyan-500' : 'bg-emerald-500'
          }`} />
        </span>
        <span className="text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-black/60 border border-white/10 text-white backdrop-blur-md">
          {isAlarmExtreme ? '🚨 ALARME EXTREMO 3D' : isAlarmCritical ? '⚠️ ALARME CRÍTICO 3D' : isAcknowledged ? '🛡️ MANUTENÇÃO TÉCNICA' : '✨ ADÉGA CLIMATIZADA 3D'}
        </span>
      </div>

      {/* Floating Instructions */}
      <div className="absolute bottom-3 right-3 text-[11px] text-zinc-400 bg-black/50 px-2.5 py-1 rounded-md backdrop-blur border border-white/5 pointer-events-none">
        🖱️ Arraste para inspecionar em 360°
      </div>
    </div>
  );
};

