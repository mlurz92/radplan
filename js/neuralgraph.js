import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';

export class NeuralGraph {
  constructor(container) {
    this.container = container;
    this.width = container.clientWidth;
    this.height = container.clientHeight;
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x040914, 0.015);
    this.camera = new THREE.PerspectiveCamera(55, this.width / this.height, 0.1, 1000);
    this.camera.position.set(0, 10, 80);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.container.appendChild(this.renderer.domElement);
    this.mainGroup = new THREE.Group();
    this.scene.add(this.mainGroup);
    this.nodes = new Map();
    this.activeEdges = new Map();
    this.clock = new THREE.Clock();
    this.isActive = true;
    this.createTextures();
    this.setupResizeListener();
    this.render = this.render.bind(this);
    requestAnimationFrame(this.render);
    gsap.to(this.mainGroup.position, { y: 2, duration: 4, yoyo: true, repeat: -1, ease: "sine.inOut" });
  }

  createTextures() {
    const pCanvas = document.createElement('canvas');
    pCanvas.width = 32; pCanvas.height = 32;
    const pCtx = pCanvas.getContext('2d');
    const pGrad = pCtx.createRadialGradient(16, 16, 0, 16, 16, 16);
    pGrad.addColorStop(0, 'rgba(255,255,255,1)');
    pGrad.addColorStop(0.3, 'rgba(255,255,255,0.8)');
    pGrad.addColorStop(1, 'rgba(0,0,0,0)');
    pCtx.fillStyle = pGrad;
    pCtx.fillRect(0, 0, 32, 32);
    this.particleTexture = new THREE.CanvasTexture(pCanvas);
  }

  createLabelSprite(text, isEmp) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = isEmp ? 'rgba(251, 191, 36, 0.15)' : 'rgba(56, 189, 248, 0.15)';
    ctx.beginPath();
    ctx.roundRect(10, 10, 236, 44, 22);
    ctx.fill();
    
    ctx.strokeStyle = isEmp ? 'rgba(251, 191, 36, 0.5)' : 'rgba(56, 189, 248, 0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = isEmp ? '#FDE68A' : '#E0F2FE';
    ctx.font = isEmp ? "bold 22px 'IBM Plex Mono', monospace" : "bold 26px 'IBM Plex Mono', monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    
    const displayText = isEmp ? text.split(' ').pop() : `${text}.`;
    ctx.fillText(displayText, 128, 32);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    
    const material = new THREE.SpriteMaterial({ 
      map: texture, 
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(isEmp ? 12 : 10, isEmp ? 3 : 2.5, 1);
    return sprite;
  }

  getCurve(p1, p2) {
    const mid = p1.clone().lerp(p2, 0.5);
    const distance = p1.distanceTo(p2);
    mid.y += distance * 0.25;
    mid.z -= distance * 0.15;
    return new THREE.QuadraticBezierCurve3(p1, mid, p2);
  }

  setupResizeListener() {
    this.resizeObserver = new ResizeObserver(entries => {
      if (!this.isActive) return;
      for (let entry of entries) {
        this.width = entry.contentRect.width;
        this.height = entry.contentRect.height;
        this.camera.aspect = this.width / this.height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.width, this.height);
      }
    });
    this.resizeObserver.observe(this.container);
  }

  initData(daysCount, employees) {
    while(this.mainGroup.children.length > 0) {
      const child = this.mainGroup.children[0];
      this.mainGroup.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    }
    this.nodes.clear();
    this.activeEdges.forEach(edge => {
      if (edge.line.geometry) edge.line.geometry.dispose();
      if (edge.material) edge.material.dispose();
    });
    this.activeEdges.clear();

    const dayRadius = 35;
    for (let i = 0; i < daysCount; i++) {
      const angle = (i / (daysCount - 1)) * Math.PI - Math.PI / 2;
      const x = Math.sin(angle) * dayRadius;
      const z = Math.cos(angle) * dayRadius * 0.4;
      const y = -12;
      
      const sprite = this.createLabelSprite((i + 1).toString(), false);
      sprite.position.set(x, y, z - 10);
      this.mainGroup.add(sprite);
      this.nodes.set(`d_${i + 1}`, sprite.position.clone());
      
      gsap.from(sprite.position, { y: y - 20, opacity: 0, duration: 1.5, delay: i * 0.02, ease: "back.out" });
    }

    const empCount = employees.length;
    const empRadius = 45;
    for (let i = 0; i < empCount; i++) {
      const angle = (i / (empCount - 1)) * Math.PI - Math.PI / 2;
      const x = Math.sin(angle) * empRadius;
      const z = Math.cos(angle) * empRadius * 0.5;
      const y = 18;
      
      const sprite = this.createLabelSprite(employees[i], true);
      sprite.position.set(x, y, z - 25);
      this.mainGroup.add(sprite);
      this.nodes.set(`e_${employees[i]}`, sprite.position.clone());
      
      gsap.from(sprite.position, { y: y + 20, opacity: 0, duration: 1.5, delay: i * 0.05, ease: "back.out" });
    }

    gsap.from(this.camera.position, { y: 40, z: 120, duration: 3, ease: "power3.out" });
  }

  createEdge(dayIdx, empId) {
    const dPos = this.nodes.get(`d_${dayIdx}`);
    const ePos = this.nodes.get(`e_${empId}`);
    if (!dPos || !ePos) return;

    const key = `${dayIdx}_${empId}`;
    if (this.activeEdges.has(key)) return;

    const curve = this.getCurve(ePos, dPos);
    const points = curve.getPoints(24);
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    
    const mat = new THREE.LineBasicMaterial({
      color: 0x0EA5E9,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      linewidth: 1
    });
    
    const line = new THREE.Line(geo, mat);
    this.mainGroup.add(line);
    this.activeEdges.set(key, { line, material: mat, curve });

    gsap.to(mat, { opacity: 0.25, duration: 0.5, ease: "power2.out" });
  }

  removeEdge(dayIdx, empId) {
    const key = `${dayIdx}_${empId}`;
    const edge = this.activeEdges.get(key);
    if (!edge) return;

    this.activeEdges.delete(key);
    gsap.to(edge.material.color, { r: 0.937, g: 0.266, b: 0.266, duration: 0.2 });
    gsap.to(edge.material, {
      opacity: 0,
      duration: 0.4,
      ease: "power2.in",
      onComplete: () => {
        this.mainGroup.remove(edge.line);
        edge.line.geometry.dispose();
        edge.material.dispose();
      }
    });
  }

  triggerAssignment(dayIdx, empId) {
    this.createEdge(dayIdx, empId);
    this.spawnTracer(dayIdx, empId, 0x38BDF8);
  }

  triggerSwap(dayIdx, oldEmpId, newEmpId) {
    if (oldEmpId) {
      this.removeEdge(dayIdx, oldEmpId);
      const dPos = this.nodes.get(`d_${dayIdx}`);
      if (dPos) this.spawnExplosion(dPos, 0xEF4444, 5);
    }
    if (newEmpId) {
      this.createEdge(dayIdx, newEmpId);
      this.spawnTracer(dayIdx, newEmpId, 0xA855F7);
    }
  }

  triggerError(dayIdx, empId) {
    const dPos = this.nodes.get(`d_${dayIdx}`);
    if (dPos) {
      this.spawnExplosion(dPos, 0xF59E0B, 10);
      const flash = new THREE.PointLight(0xF59E0B, 0, 35);
      flash.position.copy(dPos);
      this.mainGroup.add(flash);
      gsap.to(flash, {
        intensity: 2.5,
        duration: 0.2,
        yoyo: true,
        repeat: 1,
        onComplete: () => this.mainGroup.remove(flash)
      });
    }

    if (empId) {
      const key = `${dayIdx}_${empId}`;
      const edge = this.activeEdges.get(key);
      if (edge) {
        const origColor = edge.material.color.clone();
        const origOpacity = edge.material.opacity;
        gsap.to(edge.material.color, { r: 0.96, g: 0.62, b: 0.04, duration: 0.1, yoyo: true, repeat: 3 });
        gsap.to(edge.material, { opacity: 0.8, duration: 0.1, yoyo: true, repeat: 3, onComplete: () => {
          edge.material.color.copy(origColor);
          edge.material.opacity = origOpacity;
        }});
      }
    }
  }

  spawnTracer(dayIdx, empId, colorHex) {
    const dPos = this.nodes.get(`d_${dayIdx}`);
    const ePos = this.nodes.get(`e_${empId}`);
    if (!dPos || !ePos) return;

    const curve = this.getCurve(ePos, dPos);
    
    const pMat = new THREE.PointsMaterial({
      size: 6,
      map: this.particleTexture,
      color: new THREE.Color(colorHex),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    
    const pGeo = new THREE.BufferGeometry().setFromPoints([curve.getPoint(0)]);
    const tracer = new THREE.Points(pGeo, pMat);
    this.mainGroup.add(tracer);
    
    const animObj = { progress: 0 };
    gsap.to(animObj, {
      progress: 1,
      duration: 0.45,
      ease: "power1.inOut",
      onUpdate: () => {
        const pt = curve.getPoint(animObj.progress);
        const positions = tracer.geometry.attributes.position.array;
        positions[0] = pt.x;
        positions[1] = pt.y;
        positions[2] = pt.z;
        tracer.geometry.attributes.position.needsUpdate = true;
      },
      onComplete: () => {
        this.mainGroup.remove(tracer);
        pGeo.dispose();
        pMat.dispose();
        this.spawnExplosion(dPos, colorHex, 4);
      }
    });
  }

  triggerSuccess() {
    this.activeEdges.forEach(edge => {
      gsap.to(edge.material.color, { r: 0.13, g: 0.77, b: 0.36, duration: 1.5 });
      gsap.to(edge.material, { opacity: 0.4, duration: 1.5 });
    });
    
    for(let [id, pos] of this.nodes) {
      if(Math.random() > 0.3) this.spawnExplosion(pos, 0x22C55E, 5);
    }
    gsap.to(this.camera.position, { y: 15, z: 65, duration: 4, ease: "power2.inOut" });
    gsap.to(this.mainGroup.rotation, { y: 0, duration: 4, ease: "power2.inOut" });
  }

  spawnExplosion(pos, colorHex, count) {
    const color = new THREE.Color(colorHex);
    for (let i = 0; i < count; i++) {
      const pGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0)]);
      const pMat = new THREE.PointsMaterial({
        size: Math.random() * 3 + 2,
        map: this.particleTexture,
        color: color,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const particle = new THREE.Points(pGeo, pMat);
      particle.position.copy(pos);
      this.mainGroup.add(particle);

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      const speed = Math.random() * 8 + 2;
      const target = new THREE.Vector3(
        pos.x + Math.sin(phi) * Math.cos(theta) * speed,
        pos.y + Math.sin(phi) * Math.sin(theta) * speed,
        pos.z + Math.cos(phi) * speed
      );

      gsap.to(particle.position, {
        x: target.x, y: target.y, z: target.z,
        duration: Math.random() * 0.5 + 0.3,
        ease: "power2.out"
      });
      gsap.to(pMat, {
        opacity: 0,
        duration: Math.random() * 0.5 + 0.3,
        ease: "power2.in",
        onComplete: () => {
          this.mainGroup.remove(particle);
          pGeo.dispose();
          pMat.dispose();
        }
      });
    }
  }

  setPhase(phase) {
    if (phase === 'init') {
      gsap.to(this.camera.position, { y: 10, z: 80, duration: 2, ease: "power2.inOut" });
    } else if (phase === 'deep') {
      gsap.to(this.camera.position, { y: 25, z: 70, duration: 3, ease: "power2.inOut" });
    }
  }

  render() {
    if (!this.isActive) return;
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this.render);
  }

  dispose() {
    this.isActive = false;
    this.resizeObserver.disconnect();
    this.activeEdges.forEach(edge => {
      if (edge.line.geometry) edge.line.geometry.dispose();
      if (edge.material) edge.material.dispose();
    });
    this.activeEdges.clear();
    this.scene.traverse(object => {
      if (object.geometry) object.geometry.dispose();
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach(m => {
            if (m.map) m.map.dispose();
            m.dispose();
          });
        } else {
          if (object.material.map) object.material.map.dispose();
          object.material.dispose();
        }
      }
    });
    this.renderer.dispose();
    if(this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }
    this.particleTexture.dispose();
  }
}
