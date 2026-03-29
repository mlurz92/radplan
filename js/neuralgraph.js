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
    
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    this.renderer.setSize(this.width, this.height, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.container.appendChild(this.renderer.domElement);
    
    this.mainGroup = new THREE.Group();
    this.scene.add(this.mainGroup);
    
    this.nodes = new Map();
    this.activeNodes = new Map(); 
    this.dataStreams = [];
    this.voxelMap = new Map();
    this.voxelMeta = [];
    this.voxelCount = 0;
    
    this.employees = [];
    this.daysCount = 0;
    
    this.clock = new THREE.Clock();
    this.isActive = true;
    this.isComputing = true;
    this.resizeTimeout = null;
    
    this.colors = {
      gridBase: { r: 0.04, g: 0.18, b: 0.21 },
      stream: 0x0DF0D0,
      node: 0x00FF41,
      probe: 0xFF003C, 
      eval: 0xF59E0B, 
      swap: { r: 0.69, g: 0.15, b: 1.00 },
      error: { r: 1.00, g: 0.00, b: 0.23 },
      success: { r: 0.13, g: 0.77, b: 0.36 }
    };

    this.createTextures();
    this.setupBaseMaterials();
    this.setupResizeListener();
    this.createScannerPlanes();
    
    this.render = this.render.bind(this);
    requestAnimationFrame(this.render);
    
    gsap.to(this.mainGroup.rotation, { y: Math.PI * 2, duration: 240, repeat: -1, ease: "none" });
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
    hctx.strokeStyle = 'rgba(13,240,208,0.4)';
    hctx.lineWidth = 4;
    hctx.beginPath();
    hctx.arc(128, 128, 120, 0, Math.PI * 2);
    hctx.stroke();
    for(let i=0; i<12; i++) {
      const a = (i/12) * Math.PI * 2;
      hctx.moveTo(128 + Math.cos(a)*110, 128 + Math.sin(a)*110);
      hctx.lineTo(128 + Math.cos(a)*130, 128 + Math.sin(a)*130);
    }
    hctx.stroke();
    this.ringTex = new THREE.CanvasTexture(hc);
    this.ringTex.magFilter = THREE.LinearFilter;
    this.ringTex.minFilter = THREE.LinearFilter;
  }

  setupBaseMaterials() {
    this.nodeGeo = new THREE.OctahedronGeometry(1.2, 0);
    this.nodeMatBase = new THREE.MeshBasicMaterial({
      color: this.colors.eval,
      wireframe: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });
  }

  createScannerPlanes() {
    this.scannerGroup = new THREE.Group();
    const geo = new THREE.PlaneGeometry(150, 150);
    const mat = new THREE.MeshBasicMaterial({
      color: this.colors.stream,
      transparent: true,
      opacity: 0.05,
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
        duration: 3 + i,
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
      depthWrite: false
    });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(16, 4, 1);
    
    let iterations = 0;
    const maxIter = 15 + Math.floor(Math.random() * 10); 
    
    const updateCanvas = (textStr, isFinal, isError) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = isFinal ? '#0DF0D0' : (isError ? '#FF003C' : '#F59E0B');
      ctx.font = "bold 32px 'IBM Plex Mono', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = isFinal ? '#0DF0D0' : (isError ? '#FF003C' : '#F59E0B');
      ctx.shadowBlur = 12;
      ctx.fillText(textStr, 128, 32);
      texture.needsUpdate = true;
    };

    const interval = setInterval(() => {
      if (!this.isActive) { clearInterval(interval); return; }
      if (iterations >= maxIter) {
        clearInterval(interval);
        updateCanvas(finalText, true, false);
      } else {
        let fakeName = "SYS_ERR";
        if (this.employees && this.employees.length > 0) {
          fakeName = this.employees[Math.floor(Math.random() * this.employees.length)].split(' ').pop();
        }
        updateCanvas(fakeName, false, true); 
      }
      iterations++;
    }, 45);
    
    sprite.userData = { canvas, texture, material: mat, interval };
    return sprite;
  }

  setupResizeListener() {
    this.resizeObserver = new ResizeObserver(entries => {
      if (!this.isActive) return;
      if (this.resizeTimeout) clearTimeout(this.resizeTimeout);
      
      this.resizeTimeout = setTimeout(() => {
        for (let entry of entries) {
          this.width = entry.contentRect.width;
          this.height = entry.contentRect.height;
          if (this.camera) {
            this.camera.aspect = this.width / this.height;
            this.camera.updateProjectionMatrix();
          }
          if (this.renderer) {
            this.renderer.setSize(this.width, this.height, false);
          }
        }
      }, 150);
    });
    this.resizeObserver.observe(this.container);
  }

  initData(daysCount, employees) {
    this.clearScene();
    
    this.employees = employees;
    this.daysCount = daysCount;
    this.isComputing = true;
    
    const radius = 40;
    const heightSpan = 50;
    this.voxelCount = daysCount * employees.length;
    
    const posArray = new Float32Array(this.voxelCount * 3);
    const colArray = new Float32Array(this.voxelCount * 3);
    
    let idx = 0;
    for (let d = 0; d < daysCount; d++) {
      const theta = (d / daysCount) * Math.PI * 1.5 - (Math.PI * 0.75); 
      for (let e = 0; e < employees.length; e++) {
        const logicalY = (e / Math.max(1, employees.length - 1)) * heightSpan - (heightSpan / 2);
        const chaoticY = logicalY + Math.sin(d * 0.5 + e) * 8;
        const x = Math.sin(theta) * radius;
        const z = Math.cos(theta) * radius;
        
        posArray[idx * 3] = x;
        posArray[idx * 3 + 1] = chaoticY;
        posArray[idx * 3 + 2] = z;
        
        colArray[idx * 3] = this.colors.gridBase.r;
        colArray[idx * 3 + 1] = this.colors.gridBase.g;
        colArray[idx * 3 + 2] = this.colors.gridBase.b;
        
        this.voxelMeta.push({
          targetY: chaoticY,
          sortedY: logicalY,
          r: this.colors.gridBase.r, g: this.colors.gridBase.g, b: this.colors.gridBase.b,
          tr: this.colors.gridBase.r, tg: this.colors.gridBase.g, tb: this.colors.gridBase.b,
          phase: Math.random() * Math.PI * 2
        });
        
        const posVec = new THREE.Vector3(x, logicalY, z);
        const key = `${d+1}_${employees[e]}`;
        this.nodes.set(key, posVec);
        this.voxelMap.set(key, idx);
        
        idx++;
      }
    }
    
    const voxelGeo = new THREE.BufferGeometry();
    voxelGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    voxelGeo.setAttribute('color', new THREE.BufferAttribute(colArray, 3));
    
    const voxelMat = new THREE.PointsMaterial({
      size: 1.8,
      vertexColors: true,
      map: this.glowTex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    
    this.voxelMesh = new THREE.Points(voxelGeo, voxelMat);
    this.mainGroup.add(this.voxelMesh);

    this.createDataStreams(daysCount, radius, heightSpan);

    gsap.from(this.camera.position, { y: 60, z: -50, duration: 3.5, ease: "expo.out" });
    gsap.from(this.mainGroup.rotation, { y: -Math.PI/2, duration: 3, ease: "power3.out" });
  }

  createDataStreams(daysCount, radius, heightSpan) {
    const streamGeo = new THREE.BufferGeometry();
    const streamPts = new Float32Array(200 * 3);
    for(let i=0; i<600; i++) streamPts[i] = 0;
    streamGeo.setAttribute('position', new THREE.BufferAttribute(streamPts, 3));
    
    const streamMat = new THREE.PointsMaterial({
      size: 1.5,
      color: this.colors.stream,
      map: this.glowTex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    
    const streamMesh = new THREE.Points(streamGeo, streamMat);
    this.mainGroup.add(streamMesh);
    
    for(let i=0; i<200; i++) {
      const d = Math.floor(Math.random() * daysCount);
      const theta = (d / daysCount) * Math.PI * 1.5 - (Math.PI * 0.75);
      this.dataStreams.push({
        idx: i,
        x: Math.sin(theta) * radius,
        z: Math.cos(theta) * radius,
        y: Math.random() * heightSpan - (heightSpan/2),
        speed: Math.random() * 15 + 10,
        height: heightSpan
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
    if (this.voxelMap) this.voxelMap.clear();
    this.voxelMeta = [];
    this.dataStreams = [];
    this.voxelMesh = null;
    this.streamMesh = null;
  }

  pulseVoxel(key, targetColorObj) {
    if (!this.voxelMap || !this.voxelMeta) return;
    const vIdx = this.voxelMap.get(key);
    if (vIdx !== undefined && this.voxelMeta[vIdx]) {
      this.voxelMeta[vIdx].tr = targetColorObj.r;
      this.voxelMeta[vIdx].tg = targetColorObj.g;
      this.voxelMeta[vIdx].tb = targetColorObj.b;
    }
  }

  fireProbeBeam(dayIdx, empId) {
    const key = `${dayIdx}_${empId}`;
    const ePos = this.nodes.get(key);
    if (!ePos) return;

    const angle = ((dayIdx - 1) / this.daysCount) * Math.PI * 1.5 - (Math.PI * 0.75);
    const origin = new THREE.Vector3(Math.sin(angle) * 10, -25, Math.cos(angle) * 10);

    const geo = new THREE.BufferGeometry().setFromPoints([origin, ePos]);
    const mat = new THREE.LineBasicMaterial({
      color: this.colors.probe,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const line = new THREE.Line(geo, mat);
    this.mainGroup.add(line);

    gsap.to(mat, {
      opacity: 0,
      duration: 0.15 + Math.random() * 0.2,
      ease: "power2.out",
      onComplete: () => {
        if (this.mainGroup && line) this.mainGroup.remove(line);
        if (geo) geo.dispose();
        if (mat) mat.dispose();
      }
    });
  }

  triggerAssignment(dayIdx, empId) {
    const key = `${dayIdx}_${empId}`;
    const pos = this.nodes.get(key);
    if (!pos) return;

    if (this.activeNodes.has(key)) {
      this.removeAssignment(key);
    }

    this.pulseVoxel(key, { r: 0.05, g: 0.94, b: 0.81 });

    const group = new THREE.Group();
    group.position.copy(pos);
    
    const mesh = new THREE.Mesh(this.nodeGeo, this.nodeMatBase.clone());
    group.add(mesh);
    
    const ringMat = new THREE.MeshBasicMaterial({
      map: this.ringTex, color: this.colors.eval, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(new THREE.PlaneGeometry(5, 5), ringMat);
    ring.rotation.x = Math.PI / 2;
    group.add(ring);

    const sprite = this.generateHexDecryptionSprite(empId.split(' ').pop());
    sprite.position.y = 2.5;
    group.add(sprite);

    this.mainGroup.add(group);
    this.activeNodes.set(key, { group, mesh, ring, sprite });

    gsap.from(group.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.6, ease: "back.out(1.5)" });
    gsap.to(ring.rotation, { z: Math.PI * 2, duration: 4, repeat: -1, ease: "none" });
    gsap.to(mesh.rotation, { x: Math.PI, y: Math.PI, duration: 6, repeat: -1, ease: "none" });
    
    gsap.to(ring.material.color, { setHex: this.colors.stream, duration: 0.5, delay: 0.8 });
    gsap.to(mesh.material.color, { setHex: this.colors.stream, duration: 0.5, delay: 0.8 });

    this.spawnPulse(pos, this.colors.eval);
  }

  removeAssignment(key) {
    const nodeObj = this.activeNodes.get(key);
    if (!nodeObj) return;
    this.activeNodes.delete(key);
    
    if (nodeObj.sprite && nodeObj.sprite.userData && nodeObj.sprite.userData.interval) {
      clearInterval(nodeObj.sprite.userData.interval);
    }
    
    gsap.to(nodeObj.group.scale, {
      x: 0.01, y: 0.01, z: 0.01, duration: 0.3, ease: "power2.in",
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
      this.pulseVoxel(oldKey, this.colors.error);
      const oldNode = this.activeNodes.get(oldKey);
      if (oldNode && oldNode.mesh && oldNode.mesh.material) {
        gsap.to(oldNode.mesh.material.color, { setHex: 0xFF003C, duration: 0.1 });
        this.glitchEffect(oldNode.group);
      }
      this.spawnPulse(p1, 0xFF003C);
      setTimeout(() => this.removeAssignment(oldKey), 200);
    }

    if (p1 && p2) {
      this.fireDataBeam(p1, p2, 0xB026FF);
    }

    if (newEmpId && p2) {
      setTimeout(() => this.triggerAssignment(dayIdx, newEmpId), 250);
    }
  }

  triggerError(dayIdx, empId) {
    const key = `${dayIdx}_${empId}`;
    const p = this.nodes.get(key);
    if (!p) return;

    this.pulseVoxel(key, this.colors.error);
    this.spawnPulse(p, 0xFF003C, 3);
    
    const nodeObj = this.activeNodes.get(key);
    if (nodeObj && nodeObj.mesh && nodeObj.mesh.material && nodeObj.group) {
      const origColor = nodeObj.mesh.material.color.getHex();
      nodeObj.mesh.material.color.setHex(0xFF003C);
      this.glitchEffect(nodeObj.group, 5);
      setTimeout(() => {
        if (nodeObj.mesh && nodeObj.mesh.material) {
          nodeObj.mesh.material.color.setHex(origColor);
        }
      }, 600);
    }
  }

  glitchEffect(target, intensity = 2) {
    if (!target || !target.position) return;
    const origX = target.position.x;
    const origZ = target.position.z;
    const tl = gsap.timeline();
    for(let i=0; i<6; i++) {
      tl.to(target.position, {
        x: origX + (Math.random()-0.5)*intensity,
        z: origZ + (Math.random()-0.5)*intensity,
        duration: 0.04,
        ease: "none"
      });
    }
    tl.to(target.position, { x: origX, z: origZ, duration: 0.04 });
  }

  fireDataBeam(p1, p2, colorHex) {
    const geo = new THREE.BufferGeometry().setFromPoints([p1, p1]);
    const mat = new THREE.LineBasicMaterial({
      color: colorHex, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false, linewidth: 3
    });
    const line = new THREE.Line(geo, mat);
    this.mainGroup.add(line);
    
    const anim = { p: 0 };
    gsap.to(anim, {
      p: 1, duration: 0.25, ease: "power4.inOut",
      onUpdate: () => {
        if (line && line.geometry) {
          const head = p1.clone().lerp(p2, anim.p);
          const tail = p1.clone().lerp(p2, Math.max(0, anim.p - 0.5));
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

  spawnPulse(pos, colorHex, scale = 1) {
    const geo = new THREE.PlaneGeometry(4*scale, 4*scale);
    const mat = new THREE.MeshBasicMaterial({
      map: this.glowTex, color: colorHex, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
    });
    const pulse = new THREE.Mesh(geo, mat);
    pulse.position.copy(pos);
    pulse.lookAt(this.camera.position);
    this.mainGroup.add(pulse);

    gsap.to(pulse.scale, { x: 4, y: 4, duration: 0.5, ease: "power2.out" });
    gsap.to(mat, { opacity: 0, duration: 0.5, ease: "power2.out", onComplete: () => {
      if (this.mainGroup && pulse) this.mainGroup.remove(pulse);
      if (geo) geo.dispose(); 
      if (mat) mat.dispose();
    }});
  }

  triggerSuccess() {
    this.isComputing = false;
    this.activeNodes.forEach(nodeObj => {
      if (nodeObj.mesh && nodeObj.mesh.material) {
        gsap.to(nodeObj.mesh.material.color, { setHex: 0x22C55E, duration: 1 });
      }
      if (nodeObj.ring && nodeObj.ring.material) {
        gsap.to(nodeObj.ring.material.color, { setHex: 0x22C55E, duration: 1 });
      }
      if (nodeObj.sprite && nodeObj.sprite.material) {
        gsap.to(nodeObj.sprite.material.color, { setHex: 0x22C55E, duration: 1 });
      }
    });
    for(let i=0; i<this.voxelCount; i++) {
      this.voxelMeta[i].tr = this.colors.success.r;
      this.voxelMeta[i].tg = this.colors.success.g;
      this.voxelMeta[i].tb = this.colors.success.b;
      this.voxelMeta[i].baseR = this.colors.success.r;
      this.voxelMeta[i].baseG = this.colors.success.g;
      this.voxelMeta[i].baseB = this.colors.success.b;
    }
    if (this.camera) {
      gsap.to(this.camera.position, { y: 20, z: 90, duration: 4, ease: "power3.inOut" });
    }
    if (this.mainGroup) {
      gsap.to(this.mainGroup.rotation, { y: 0, duration: 4, ease: "power3.inOut" });
    }
  }

  setPhase(phase) {
    if (!this.camera) return;
    if (phase === 'init') {
      gsap.to(this.camera.position, { y: 0, z: 110, duration: 2.5, ease: "power2.inOut" });
    } else if (phase === 'deep') {
      gsap.to(this.camera.position, { y: 35, z: 60, duration: 3, ease: "power2.inOut" });
      for(let i=0; i<this.voxelCount; i++) {
        gsap.to(this.voxelMeta[i], { targetY: this.voxelMeta[i].sortedY, duration: 2.5, ease: "power2.inOut" });
      }
    }
  }

  render() {
    if (!this.isActive) return;
    const t = performance.now() * 0.001;
    const dt = this.clock.getDelta();
    
    if (this.isComputing && this.employees && this.employees.length > 0 && Math.random() > 0.4) {
      const randD = Math.floor(Math.random() * this.daysCount) + 1;
      const randE = this.employees[Math.floor(Math.random() * this.employees.length)];
      this.fireProbeBeam(randD, randE);
    }
    
    if (this.streamMesh && this.streamMesh.geometry) {
      const positions = this.streamMesh.geometry.attributes.position.array;
      for(let i=0; i<this.dataStreams.length; i++) {
        const stream = this.dataStreams[i];
        stream.y += stream.speed * dt;
        if (stream.y > stream.height / 2) stream.y = -stream.height / 2;
        positions[i*3] = stream.x;
        positions[i*3+1] = stream.y;
        positions[i*3+2] = stream.z;
      }
      this.streamMesh.geometry.attributes.position.needsUpdate = true;
    }

    if (this.voxelMesh && this.voxelMesh.geometry) {
      const p = this.voxelMesh.geometry.attributes.position.array;
      const c = this.voxelMesh.geometry.attributes.color.array;
      for(let i=0; i<this.voxelCount; i++) {
        const m = this.voxelMeta[i];
        
        p[i*3+1] = m.targetY + Math.sin(t + m.phase) * 0.5;
        
        m.r += (m.tr - m.r) * 0.15;
        m.g += (m.tg - m.g) * 0.15;
        m.b += (m.tb - m.b) * 0.15;
        
        c[i*3] = m.r;
        c[i*3+1] = m.g;
        c[i*3+2] = m.b;
        
        if (Math.abs(m.tr - m.baseR) > 0.01 || Math.abs(m.tg - m.baseG) > 0.01) {
          m.tr += (m.baseR - m.tr) * 0.04;
          m.tg += (m.baseG - m.tg) * 0.04;
          m.tb += (m.baseB - m.tb) * 0.04;
        }
      }
      this.voxelMesh.geometry.attributes.position.needsUpdate = true;
      this.voxelMesh.geometry.attributes.color.needsUpdate = true;
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
    this.isComputing = false;
    
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
    }
    
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
    if (this.particleTexture) this.particleTexture.dispose();
  }
}
