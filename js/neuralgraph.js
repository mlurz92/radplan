export class NeuralGraph {
  constructor(container) {
    this.container = container;
    this.width = container.clientWidth;
    this.height = container.clientHeight;
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x040914, 0.015);
    this.camera = new THREE.PerspectiveCamera(60, this.width / this.height, 0.1, 1000);
    this.camera.position.set(0, 15, 60);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.container.appendChild(this.renderer.domElement);
    this.mainGroup = new THREE.Group();
    this.scene.add(this.mainGroup);
    this.nodes = new Map();
    this.edges = [];
    this.tracers = [];
    this.particles = [];
    this.clock = new THREE.Clock();
    this.isActive = true;
    this.baseHue = 195;
    this.createTextures();
    this.setupBaseMaterials();
    this.setupResizeListener();
    this.render = this.render.bind(this);
    requestAnimationFrame(this.render);
    gsap.to(this.mainGroup.rotation, { y: Math.PI * 2, duration: 120, repeat: -1, ease: "none" });
  }

  createTextures() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.1, 'rgba(255, 255, 255, 0.8)');
    grad.addColorStop(0.3, 'rgba(14, 165, 233, 0.5)');
    grad.addColorStop(0.7, 'rgba(14, 165, 233, 0.1)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
    this.glowTexture = new THREE.CanvasTexture(canvas);
    
    const pCanvas = document.createElement('canvas');
    pCanvas.width = 32; pCanvas.height = 32;
    const pCtx = pCanvas.getContext('2d');
    const pGrad = pCtx.createRadialGradient(16, 16, 0, 16, 16, 16);
    pGrad.addColorStop(0, 'rgba(255,255,255,1)');
    pGrad.addColorStop(0.4, 'rgba(255,255,255,0.6)');
    pGrad.addColorStop(1, 'rgba(0,0,0,0)');
    pCtx.fillStyle = pGrad;
    pCtx.fillRect(0, 0, 32, 32);
    this.particleTexture = new THREE.CanvasTexture(pCanvas);
  }

  setupBaseMaterials() {
    this.nodeMaterial = new THREE.PointsMaterial({
      size: 4.5,
      map: this.glowTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      color: 0x38BDF8,
      opacity: 0.8
    });
    this.empMaterial = new THREE.PointsMaterial({
      size: 6,
      map: this.glowTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      color: 0xFBBF24,
      opacity: 0.9
    });
    this.edgeMaterial = new THREE.LineBasicMaterial({
      color: 0x0EA5E9,
      transparent: true,
      opacity: 0.08,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
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
      this.mainGroup.remove(this.mainGroup.children[0]);
    }
    this.nodes.clear();

    const dayGeo = new THREE.BufferGeometry();
    const dayPos = new Float32Array(daysCount * 3);
    const radius = 28;
    for (let i = 0; i < daysCount; i++) {
      const theta = (i / daysCount) * Math.PI * 2;
      const x = Math.cos(theta) * radius;
      const z = Math.sin(theta) * radius;
      const y = Math.sin(i * 0.8) * 3;
      dayPos[i * 3] = x;
      dayPos[i * 3 + 1] = y;
      dayPos[i * 3 + 2] = z;
      this.nodes.set(`d_${i}`, new THREE.Vector3(x, y, z));
    }
    dayGeo.setAttribute('position', new THREE.BufferAttribute(dayPos, 3));
    this.daysMesh = new THREE.Points(dayGeo, this.nodeMaterial);
    this.mainGroup.add(this.daysMesh);

    const empCount = employees.length;
    const empGeo = new THREE.BufferGeometry();
    const empPos = new Float32Array(empCount * 3);
    const phi = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < empCount; i++) {
      const y = 1 - (i / (empCount - 1)) * 2;
      const r = Math.sqrt(1 - y * y) * 12;
      const theta = phi * i;
      const x = Math.cos(theta) * r;
      const z = Math.sin(theta) * r;
      empPos[i * 3] = x;
      empPos[i * 3 + 1] = y * 12 + 10;
      empPos[i * 3 + 2] = z;
      this.nodes.set(`e_${employees[i].id}`, new THREE.Vector3(x, y * 12 + 10, z));
    }
    empGeo.setAttribute('position', new THREE.BufferAttribute(empPos, 3));
    this.empsMesh = new THREE.Points(empGeo, this.empMaterial);
    this.mainGroup.add(this.empsMesh);

    const edgeGeo = new THREE.BufferGeometry();
    const edgePos = [];
    for (let i = 0; i < daysCount; i++) {
      for (let j = 0; j < empCount; j++) {
        if (Math.random() > 0.8) {
          const dPos = this.nodes.get(`d_${i}`);
          const ePos = this.nodes.get(`e_${employees[j].id}`);
          edgePos.push(dPos.x, dPos.y, dPos.z, ePos.x, ePos.y, ePos.z);
        }
      }
    }
    edgeGeo.setAttribute('position', new THREE.Float32BufferAttribute(edgePos, 3));
    this.edgesMesh = new THREE.LineSegments(edgeGeo, this.edgeMaterial);
    this.mainGroup.add(this.edgesMesh);

    gsap.from(this.mainGroup.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 2, ease: "expo.out" });
    gsap.from(this.camera.position, { y: -20, z: 20, duration: 2.5, ease: "power3.out" });
  }

  triggerSwap(dayIndex, employeeId) {
    const dPos = this.nodes.get(`d_${dayIndex}`);
    const ePos = this.nodes.get(`e_${employeeId}`);
    if (!dPos || !ePos) return;

    const geo = new THREE.BufferGeometry().setFromPoints([ePos, ePos]);
    const mat = new THREE.LineBasicMaterial({
      color: 0x38BDF8,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      linewidth: 2
    });
    const line = new THREE.Line(geo, mat);
    this.mainGroup.add(line);
    
    const tracer = {
      line: line,
      start: ePos.clone(),
      end: dPos.clone(),
      progress: 0,
      color: new THREE.Color(0x38BDF8)
    };
    this.tracers.push(tracer);

    gsap.to(tracer, {
      progress: 1,
      duration: 0.4,
      ease: "power2.inOut",
      onUpdate: () => {
        const currentEnd = tracer.start.clone().lerp(tracer.end, tracer.progress);
        const currentStart = tracer.start.clone().lerp(tracer.end, Math.max(0, tracer.progress - 0.3));
        line.geometry.setFromPoints([currentStart, currentEnd]);
        line.material.opacity = 1 - tracer.progress;
      },
      onComplete: () => {
        this.mainGroup.remove(line);
        geo.dispose();
        mat.dispose();
        this.tracers = this.tracers.filter(t => t !== tracer);
        this.spawnExplosion(dPos, 0x38BDF8, 8);
      }
    });
  }

  triggerError(dayIndex) {
    const pos = this.nodes.get(`d_${dayIndex}`);
    if (!pos) return;
    this.spawnExplosion(pos, 0xEF4444, 15);
    
    const flash = new THREE.PointLight(0xEF4444, 0, 30);
    flash.position.copy(pos);
    this.mainGroup.add(flash);
    gsap.to(flash, {
      intensity: 2,
      duration: 0.1,
      yoyo: true,
      repeat: 1,
      onComplete: () => this.mainGroup.remove(flash)
    });
  }

  triggerSuccess() {
    gsap.to(this.nodeMaterial.color, { r: 0.13, g: 0.77, b: 0.36, duration: 1 });
    gsap.to(this.empMaterial.color, { r: 0.13, g: 0.77, b: 0.36, duration: 1 });
    gsap.to(this.edgeMaterial.color, { r: 0.13, g: 0.77, b: 0.36, duration: 1 });
    gsap.to(this.edgeMaterial, { opacity: 0.15, duration: 1 });
    
    for(let [id, pos] of this.nodes) {
      if(Math.random() > 0.5) this.spawnExplosion(pos, 0x22C55E, 5);
    }
    gsap.to(this.camera.position, { y: 25, z: 45, duration: 4, ease: "power2.inOut" });
  }

  spawnExplosion(pos, colorHex, count) {
    const color = new THREE.Color(colorHex);
    for (let i = 0; i < count; i++) {
      const pGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0)]);
      const pMat = new THREE.PointsMaterial({
        size: Math.random() * 2 + 1,
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
      const speed = Math.random() * 6 + 2;
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
      gsap.to(this.camera.position, { y: 5, z: 70, duration: 2, ease: "power2.inOut" });
      gsap.to(this.mainGroup.rotation, { x: 0.2, duration: 2 });
    } else if (phase === 'deep') {
      gsap.to(this.camera.position, { y: 20, z: 50, duration: 3, ease: "power2.inOut" });
      gsap.to(this.mainGroup.rotation, { x: 0.4, duration: 3 });
    }
  }

  render() {
    if (!this.isActive) return;
    const delta = this.clock.getDelta();
    if(this.daysMesh) {
      const positions = this.daysMesh.geometry.attributes.position.array;
      for(let i=0; i<positions.length; i+=3) {
        positions[i+1] += Math.sin(Date.now() * 0.002 + i) * 0.02;
      }
      this.daysMesh.geometry.attributes.position.needsUpdate = true;
    }
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this.render);
  }

  dispose() {
    this.isActive = false;
    this.resizeObserver.disconnect();
    this.scene.traverse(object => {
      if (object.geometry) object.geometry.dispose();
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach(m => m.dispose());
        } else {
          object.material.dispose();
        }
      }
    });
    this.renderer.dispose();
    if(this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }
    this.glowTexture.dispose();
    this.particleTexture.dispose();
  }
}