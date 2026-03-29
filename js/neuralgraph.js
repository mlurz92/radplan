import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';

export class NeuralGraph {
  constructor(container) {
    this.container = container;
    this.width = container.clientWidth;
    this.height = container.clientHeight;
    
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x020610, 0.012);
    
    this.camera = new THREE.PerspectiveCamera(45, this.width / this.height, 0.1, 1000);
    this.camera.position.set(0, -10, 100);
    
    this.baseCameraPos = new THREE.Vector3(0, -10, 100);
    this.cameraShakeOffset = new THREE.Vector3(0, 0, 0);
    
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.container.appendChild(this.renderer.domElement);
    
    this.mainGroup = new THREE.Group();
    this.scene.add(this.mainGroup);
    
    this.nodes = new Map();
    this.activeNodes = new Map(); 
    this.dataStreams = [];
    
    this.clock = new THREE.Clock();
    this.isActive = true;
    
    this.colors = {
      grid: 0x0A2E36,
      stream: 0x0DF0D0,
      node: 0x00FF41,
      swap: 0xB026FF,
      error: 0xFF003C,
      text: 0xE0F8FF
    };

    this.createTextures();
    this.setupBaseMaterials();
    this.setupResizeListener();
    this.createScannerPlanes();
    
    this.render = this.render.bind(this);
    requestAnimationFrame(this.render);
    
    gsap.to(this.mainGroup.rotation, { y: Math.PI * 2, duration: 200, repeat: -1, ease: "none" });
  }

  createTextures() {
    const c = document.createElement('canvas');
    c.width = 64; c.height = 64;
    const ctx = c.getContext('2d');
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.2, 'rgba(255,255,255,0.8)');
    grad.addColorStop(0.6, 'rgba(13,240,208,0.2)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    this.glowTex = new THREE.CanvasTexture(c);
    this.glowTex.magFilter = THREE.LinearFilter;
    this.glowTex.minFilter = THREE.LinearFilter;
    this.glowTex.generateMipmaps = false;

    const hc = document.createElement('canvas');
    hc.width = 256; hc.height = 256;
    const hctx = hc.getContext('2d');
    hctx.strokeStyle = 'rgba(13,240,208,0.6)';
    hctx.lineWidth = 6;
    hctx.beginPath();
    hctx.arc(128, 128, 116, 0, Math.PI * 2);
    hctx.stroke();
    
    hctx.strokeStyle = 'rgba(13,240,208,0.8)';
    hctx.lineWidth = 3;
    for(let i=0; i<16; i++) {
      const a = (i/16) * Math.PI * 2;
      hctx.beginPath();
      hctx.moveTo(128 + Math.cos(a)*100, 128 + Math.sin(a)*100);
      hctx.lineTo(128 + Math.cos(a)*132, 128 + Math.sin(a)*132);
      hctx.stroke();
    }
    this.ringTex = new THREE.CanvasTexture(hc);
    this.ringTex.magFilter = THREE.LinearFilter;
    this.ringTex.minFilter = THREE.LinearFilter;

    const swCanvas = document.createElement('canvas');
    swCanvas.width = 128; swCanvas.height = 128;
    const swCtx = swCanvas.getContext('2d');
    const swGrad = swCtx.createRadialGradient(64, 64, 50, 64, 64, 64);
    swGrad.addColorStop(0, 'rgba(255,255,255,0)');
    swGrad.addColorStop(0.8, 'rgba(255,255,255,0.8)');
    swGrad.addColorStop(1, 'rgba(255,255,255,0)');
    swCtx.fillStyle = swGrad;
    swCtx.fillRect(0, 0, 128, 128);
    this.shockwaveTex = new THREE.CanvasTexture(swCanvas);
  }

  setupBaseMaterials() {
    this.gridMat = new THREE.LineBasicMaterial({
      color: this.colors.grid,
      transparent: true,
      opacity: 0, 
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    
    this.nodeGeo = new THREE.OctahedronGeometry(1.4, 0);
    this.nodeMatBase = new THREE.MeshBasicMaterial({
      color: this.colors.node,
      wireframe: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });
  }

  createScannerPlanes() {
    this.scannerGroup = new THREE.Group();
    const geo = new THREE.PlaneGeometry(180, 180);
    const mat = new THREE.MeshBasicMaterial({
      color: this.colors.stream,
      transparent: true,
      opacity: 0.08,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    
    for(let i=0; i<3; i++) {
      const plane = new THREE.Mesh(geo, mat);
      plane.rotation.x = Math.PI / 2;
      plane.position.y = -40 + (i * 30);
      this.scannerGroup.add(plane);
      
      gsap.to(plane.position, {
        y: "+=40",
        duration: 2.5 + (i * 0.5),
        repeat: -1,
        ease: "none",
        modifiers: {
          y: gsap.utils.unitize(y => parseFloat(y) > 40 ? -40 : y)
        }
      });
    }
    this.scene.add(this.scannerGroup);
  }

  generateHexDecryptionSprite(finalText) {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    
    const mat = new THREE.SpriteMaterial({ 
      map: texture, 
      transparent: true, 
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 1
    });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(18, 4.5, 1);
    
    const chars = "0123456789ABCDEF!@#$%^&*";
    let iterations = 0;
    const maxIter = 12;
    
    const updateCanvas = (textStr, isFinal) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = isFinal ? '#00FF41' : '#0DF0D0';
      ctx.font = "bold 36px 'Courier New', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = isFinal ? '#00FF41' : '#0DF0D0';
      ctx.shadowBlur = 12;
      ctx.fillText(textStr, 128, 32);
      texture.needsUpdate = true;
    };

    const interval = setInterval(() => {
      if (!this.isActive) { clearInterval(interval); return; }
      if (iterations >= maxIter) {
        clearInterval(interval);
        updateCanvas(finalText, true);
      } else {
        let randStr = "";
        for(let i=0; i<finalText.length; i++) randStr += chars[Math.floor(Math.random() * chars.length)];
        updateCanvas(randStr, false);
      }
      iterations++;
    }, 35);
    
    sprite.userData = { canvas, texture, material: mat, interval };
    return sprite;
  }

  setupResizeListener() {
    this.resizeObserver = new ResizeObserver(entries => {
      if (!this.isActive) return;
      for (let entry of entries) {
        this.width = entry.contentRect.width;
        this.height = entry.contentRect.height;
        this.camera.aspect = this.width / this.height;
        this.camera.updateProjectionMatrix();
        if (this.renderer) {
          this.renderer.setSize(this.width, this.height);
        }
      }
    });
    this.resizeObserver.observe(this.container);
  }

  initData(daysCount, employees) {
    this.clearScene();
    
    const radius = 42;
    const heightSpan = 55;
    
    const gridGeo = new THREE.BufferGeometry();
    const gridPts = [];
    
    for (let d = 0; d < daysCount; d++) {
      const theta = (d / daysCount) * Math.PI * 1.5 - (Math.PI * 0.75); 
      for (let e = 0; e < employees.length; e++) {
        const y = (e / Math.max(1, employees.length - 1)) * heightSpan - (heightSpan / 2);
        const x = Math.sin(theta) * radius;
        const z = Math.cos(theta) * radius;
        
        const pos = new THREE.Vector3(x, y, z);
        this.nodes.set(`${d+1}_${employees[e]}`, pos);
        
        if (e > 0) {
          const prevY = ((e - 1) / Math.max(1, employees.length - 1)) * heightSpan - (heightSpan / 2);
          gridPts.push(x, prevY, z, x, y, z);
        }
        if (d > 0) {
          const prevTheta = ((d - 1) / daysCount) * Math.PI * 1.5 - (Math.PI * 0.75);
          gridPts.push(Math.sin(prevTheta) * radius, y, Math.cos(prevTheta) * radius, x, y, z);
        }
      }
    }
    
    gridGeo.setAttribute('position', new THREE.Float32BufferAttribute(gridPts, 3));
    const gridMesh = new THREE.LineSegments(gridGeo, this.gridMat);
    this.mainGroup.add(gridMesh);

    gsap.to(this.gridMat, { opacity: 0.4, duration: 2, ease: "power2.out" });

    this.createDataStreams(daysCount, employees.length, radius, heightSpan);

    this.baseCameraPos.set(0, 60, -50);
    this.camera.position.copy(this.baseCameraPos);
    gsap.to(this.baseCameraPos, { y: 0, z: 110, duration: 3.5, ease: "expo.out" });
    
    this.mainGroup.rotation.y = -Math.PI/2;
    gsap.to(this.mainGroup.rotation, { y: 0, duration: 3.5, ease: "expo.out" });
  }

  createDataStreams(daysCount, empCount, radius, heightSpan) {
    const streamGeo = new THREE.BufferGeometry();
    const particleCount = 400;
    const streamPts = new Float32Array(particleCount * 3);
    for(let i=0; i<particleCount*3; i++) streamPts[i] = 0;
    streamGeo.setAttribute('position', new THREE.BufferAttribute(streamPts, 3));
    
    const streamMat = new THREE.PointsMaterial({
      size: 1.8,
      color: this.colors.stream,
      map: this.glowTex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    
    const streamMesh = new THREE.Points(streamGeo, streamMat);
    this.mainGroup.add(streamMesh);
    
    for(let i=0; i<particleCount; i++) {
      const d = Math.floor(Math.random() * daysCount);
      const theta = (d / daysCount) * Math.PI * 1.5 - (Math.PI * 0.75);
      this.dataStreams.push({
        idx: i,
        x: Math.sin(theta) * radius,
        z: Math.cos(theta) * radius,
        y: Math.random() * heightSpan - (heightSpan/2),
        speed: Math.random() * 25 + 15,
        height: heightSpan,
        thetaOffset: Math.random() * Math.PI * 2
      });
    }
    this.streamMesh = streamMesh;
  }

  clearScene() {
    if (!this.mainGroup) return;
    const toRemove = [...this.mainGroup.children];
    toRemove.forEach(child => {
      this.mainGroup.remove(child);
      if (child.geometry && typeof child.geometry.dispose === 'function') {
        child.geometry.dispose();
      }
      if (child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach(m => {
          if (m.map && typeof m.map.dispose === 'function') m.map.dispose();
          if (typeof m.dispose === 'function') m.dispose();
        });
      }
      if (child.userData && child.userData.interval) {
        clearInterval(child.userData.interval);
      }
    });
    if (this.nodes) this.nodes.clear();
    if (this.activeNodes) this.activeNodes.clear();
    this.dataStreams = [];
  }

  triggerAssignment(dayIdx, empId) {
    const key = `${dayIdx}_${empId}`;
    const pos = this.nodes.get(key);
    if (!pos) return;

    if (this.activeNodes.has(key)) {
      this.removeAssignment(key);
    }

    const group = new THREE.Group();
    group.position.copy(pos);
    
    const mesh = new THREE.Mesh(this.nodeGeo, this.nodeMatBase.clone());
    group.add(mesh);
    
    const ringMat = new THREE.MeshBasicMaterial({
      map: this.ringTex, color: this.colors.stream, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), ringMat);
    ring.rotation.x = Math.PI / 2;
    group.add(ring);

    const sprite = this.generateHexDecryptionSprite(empId.split(' ').pop());
    sprite.position.y = 3;
    group.add(sprite);

    this.mainGroup.add(group);
    this.activeNodes.set(key, { group, mesh, ring, sprite });

    group.scale.set(0.2, 0.2, 0.2);
    mesh.material.opacity = 0;
    ring.material.opacity = 0;
    sprite.material.opacity = 0;

    gsap.to(group.scale, { x: 1, y: 1, z: 1, duration: 0.3, ease: "power2.out" });
    gsap.to(mesh.material, { opacity: 0.9, duration: 0.2, ease: "none" });
    gsap.to(ring.material, { opacity: 1, duration: 0.2, ease: "none" });
    gsap.to(sprite.material, { opacity: 1, duration: 0.2, ease: "none" });

    gsap.to(ring.rotation, { z: Math.PI * 2, duration: 2.5, repeat: -1, ease: "none" });
    gsap.to(mesh.rotation, { x: Math.PI, y: Math.PI, duration: 4, repeat: -1, ease: "none" });
    
    this.spawnPulse(pos, this.colors.node, 1.2);
  }

  removeAssignment(key) {
    const nodeObj = this.activeNodes.get(key);
    if (!nodeObj) return;
    this.activeNodes.delete(key);
    
    if (nodeObj.sprite && nodeObj.sprite.userData && nodeObj.sprite.userData.interval) {
      clearInterval(nodeObj.sprite.userData.interval);
    }
    
    gsap.to(nodeObj.group.scale, {
      x: 0.1, y: 0.1, z: 0.1, duration: 0.2, ease: "power2.in",
      onComplete: () => {
        if (this.mainGroup && nodeObj.group) {
          this.mainGroup.remove(nodeObj.group);
        }
        if (nodeObj.mesh) {
          if (nodeObj.mesh.geometry) nodeObj.mesh.geometry.dispose();
          if (nodeObj.mesh.material) nodeObj.mesh.material.dispose();
        }
        if (nodeObj.ring) {
          if (nodeObj.ring.geometry) nodeObj.ring.geometry.dispose();
          if (nodeObj.ring.material) nodeObj.ring.material.dispose();
        }
        if (nodeObj.sprite && nodeObj.sprite.material) {
          if (nodeObj.sprite.material.map) nodeObj.sprite.material.map.dispose();
          nodeObj.sprite.material.dispose();
        }
      }
    });
  }

  triggerSwap(dayIdx, oldEmpId, newEmpId) {
    const oldKey = `${dayIdx}_${oldEmpId}`;
    const newKey = `${dayIdx}_${newEmpId}`;
    const p1 = this.nodes.get(oldKey);
    const p2 = this.nodes.get(newKey);

    if (oldEmpId && p1) {
      const oldNode = this.activeNodes.get(oldKey);
      if (oldNode && oldNode.mesh && oldNode.mesh.material) {
        gsap.to(oldNode.mesh.material.color, { setHex: this.colors.error, duration: 0.1 });
        this.glitchEffect(oldNode.group, 3);
      }
      this.spawnPulse(p1, this.colors.error, 1.5);
      setTimeout(() => this.removeAssignment(oldKey), 150);
    }

    if (p1 && p2) {
      this.fireDataBeam(p1, p2, this.colors.swap);
      this.spawnShockwave(p1, this.colors.swap);
    }

    if (newEmpId && p2) {
      setTimeout(() => this.triggerAssignment(dayIdx, newEmpId), 200);
    }
  }

  triggerError(dayIdx, empId) {
    const key = `${dayIdx}_${empId}`;
    const p = this.nodes.get(key);
    if (!p) return;

    this.spawnPulse(p, this.colors.error, 2.5);
    this.spawnShockwave(p, this.colors.error);
    this.shakeCamera(2.5);
    
    const nodeObj = this.activeNodes.get(key);
    if (nodeObj && nodeObj.mesh && nodeObj.mesh.material && nodeObj.group) {
      const origColor = nodeObj.mesh.material.color.getHex();
      nodeObj.mesh.material.color.setHex(this.colors.error);
      this.glitchEffect(nodeObj.group, 6);
      setTimeout(() => {
        if (nodeObj.mesh && nodeObj.mesh.material) {
          nodeObj.mesh.material.color.setHex(origColor);
        }
      }, 400);
    }
  }

  shakeCamera(intensity) {
    const tl = gsap.timeline();
    for (let i = 0; i < 6; i++) {
      tl.to(this.cameraShakeOffset, {
        x: (Math.random() - 0.5) * intensity,
        y: (Math.random() - 0.5) * intensity,
        z: (Math.random() - 0.5) * intensity,
        duration: 0.03,
        ease: "none"
      });
    }
    tl.to(this.cameraShakeOffset, { x: 0, y: 0, z: 0, duration: 0.05 });
  }

  glitchEffect(target, intensity = 2) {
    if (!target || !target.position) return;
    const origX = target.position.x;
    const origZ = target.position.z;
    const tl = gsap.timeline();
    for(let i=0; i<5; i++) {
      tl.to(target.position, {
        x: origX + (Math.random()-0.5)*intensity,
        z: origZ + (Math.random()-0.5)*intensity,
        duration: 0.03,
        ease: "none"
      });
      tl.to(target.scale, {
        x: 1 + Math.random()*0.5,
        y: 1 + Math.random()*0.5,
        z: 1 + Math.random()*0.5,
        duration: 0.03,
        ease: "none"
      }, "<");
    }
    tl.to(target.position, { x: origX, z: origZ, duration: 0.03 });
    tl.to(target.scale, { x: 1, y: 1, z: 1, duration: 0.03 }, "<");
  }

  fireDataBeam(p1, p2, colorHex) {
    const geo = new THREE.BufferGeometry().setFromPoints([p1, p1]);
    const mat = new THREE.LineBasicMaterial({
      color: colorHex, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false, linewidth: 5
    });
    const line = new THREE.Line(geo, mat);
    this.mainGroup.add(line);
    
    const anim = { p: 0 };
    gsap.to(anim, {
      p: 1, duration: 0.2, ease: "power2.inOut",
      onUpdate: () => {
        if (line && line.geometry) {
          const head = p1.clone().lerp(p2, anim.p);
          const tail = p1.clone().lerp(p2, Math.max(0, anim.p - 0.6));
          line.geometry.setFromPoints([tail, head]);
        }
      },
      onComplete: () => {
        if (this.mainGroup && line) this.mainGroup.remove(line);
        if (geo) geo.dispose(); 
        if (mat) mat.dispose();
      }
    });
  }

  spawnShockwave(pos, colorHex) {
    const geo = new THREE.PlaneGeometry(1, 1);
    const mat = new THREE.MeshBasicMaterial({
      map: this.shockwaveTex, color: colorHex, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
    });
    const wave = new THREE.Mesh(geo, mat);
    wave.position.copy(pos);
    wave.lookAt(this.camera.position);
    this.mainGroup.add(wave);

    gsap.to(wave.scale, { x: 45, y: 45, duration: 0.6, ease: "power2.out" });
    gsap.to(mat, { opacity: 0, duration: 0.6, ease: "power2.in", onComplete: () => {
      if (this.mainGroup && wave) this.mainGroup.remove(wave);
      if (geo) geo.dispose(); 
      if (mat) mat.dispose();
    }});
  }

  spawnPulse(pos, colorHex, scale = 1) {
    const geo = new THREE.PlaneGeometry(5*scale, 5*scale);
    const mat = new THREE.MeshBasicMaterial({
      map: this.glowTex, color: colorHex, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
    });
    const pulse = new THREE.Mesh(geo, mat);
    pulse.position.copy(pos);
    pulse.lookAt(this.camera.position);
    this.mainGroup.add(pulse);

    gsap.to(pulse.scale, { x: 5, y: 5, duration: 0.4, ease: "power2.out" });
    gsap.to(mat, { opacity: 0, duration: 0.4, ease: "power2.out", onComplete: () => {
      if (this.mainGroup && pulse) this.mainGroup.remove(pulse);
      if (geo) geo.dispose(); 
      if (mat) mat.dispose();
    }});
  }

  triggerSuccess() {
    this.activeNodes.forEach(nodeObj => {
      if (nodeObj.mesh && nodeObj.mesh.material) {
        gsap.to(nodeObj.mesh.material.color, { setHex: 0x22C55E, duration: 1 });
      }
      if (nodeObj.ring && nodeObj.ring.material) {
        gsap.to(nodeObj.ring.material.color, { setHex: 0x22C55E, duration: 1 });
      }
    });
    if (this.gridMat) {
      gsap.to(this.gridMat.color, { setHex: 0x064E3B, duration: 2 });
    }
    
    gsap.to(this.baseCameraPos, { y: 20, z: 90, duration: 4, ease: "power3.inOut" });
    
    if (this.mainGroup) {
      gsap.to(this.mainGroup.rotation, { y: 0, duration: 4, ease: "power3.inOut" });
    }
  }

  setPhase(phase) {
    if (phase === 'init') {
      gsap.to(this.baseCameraPos, { y: 5, z: 110, duration: 2.5, ease: "power2.inOut" });
    } else if (phase === 'deep') {
      gsap.to(this.baseCameraPos, { y: 35, z: 70, duration: 3, ease: "power2.inOut" });
      gsap.to(this.gridMat, { opacity: 0.7, duration: 2, yoyo: true, repeat: -1 });
    }
  }

  render() {
    if (!this.isActive) return;
    const dt = this.clock.getDelta();
    
    if (this.streamMesh && this.streamMesh.geometry) {
      const positions = this.streamMesh.geometry.attributes.position.array;
      for(let i=0; i<this.dataStreams.length; i++) {
        const stream = this.dataStreams[i];
        stream.y += stream.speed * dt;
        if (stream.y > stream.height / 2) stream.y = -stream.height / 2;
        
        const w = Math.sin(Date.now() * 0.005 + stream.thetaOffset) * 2;
        positions[i*3] = stream.x + (stream.x > 0 ? w : -w);
        positions[i*3+1] = stream.y;
        positions[i*3+2] = stream.z + (stream.z > 0 ? w : -w);
      }
      this.streamMesh.geometry.attributes.position.needsUpdate = true;
    }

    if (this.camera) {
      this.camera.position.x = this.baseCameraPos.x + this.cameraShakeOffset.x;
      this.camera.position.y = this.baseCameraPos.y + this.cameraShakeOffset.y;
      this.camera.position.z = this.baseCameraPos.z + this.cameraShakeOffset.z;
    }

    this.activeNodes.forEach(n => {
      if (n.group) n.group.lookAt(this.camera.position);
    });
    
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
    requestAnimationFrame(this.render);
  }

  dispose() {
    this.isActive = false;
    
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    
    this.clearScene();
    
    if (this.scene && this.scannerGroup) {
      this.scene.remove(this.scannerGroup);
    }
    
    if (this.renderer) {
      this.renderer.dispose();
      if (this.container && this.renderer.domElement && this.container.contains(this.renderer.domElement)) {
        this.container.removeChild(this.renderer.domElement);
      }
    }
    
    if (this.glowTex) this.glowTex.dispose();
    if (this.ringTex) this.ringTex.dispose();
    if (this.shockwaveTex) this.shockwaveTex.dispose();
    if (this.particleTexture) this.particleTexture.dispose();
    if (this.gridMat) this.gridMat.dispose();
    if (this.nodeGeo) this.nodeGeo.dispose();
    if (this.nodeMatBase) this.nodeMatBase.dispose();
  }
}
