/* =========================================================================
   BIOPORTAL — los mundos que se ven a través del portal (js/bioportal/mundos.js)
   -------------------------------------------------------------------------
   Cinco escenas 3D hechas con three.js, sin modelos externos (todo con
   geometrías y lienzos), livianas para el celular. El portal está en el
   origen mirando hacia +z; cada mundo queda DETRÁS (z negativo) y su piso en
   y = 0 (el piso del cuarto en realidad aumentada).
   window.BioPortalMundos.crear(THREE, id) → {
     grupo,            // THREE.Group con todo el mundo
     puntos,           // { punto: THREE.Vector3 } lo que mira cada parada del tour
     color,            // color de la energía del portal
     actualizar(t, dt) // animación (t en segundos)
   }
   Ids: 'tierra-primitiva' | 'celula' | 'cuerpo' | 'ecosistema' | 'molecular'
   (los mismos de js/bioportal/reglas.js).
   ========================================================================= */
(function (g) {
  'use strict';
  let T;
  const V = (x, y, z) => new T.Vector3(x, y, z);
  const azar = (a, b) => a + Math.random() * (b - a);

  // ---------- ayudas ----------
  // Cielo: una esfera grande con un degradado (arriba → horizonte → abajo).
  function cielo(colores) {
    const c = document.createElement('canvas'); c.width = 4; c.height = 256;
    const x = c.getContext('2d'), gr = x.createLinearGradient(0, 0, 0, 256);
    colores.forEach((col, i) => gr.addColorStop(i / (colores.length - 1), col));
    x.fillStyle = gr; x.fillRect(0, 0, 4, 256);
    const tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace;
    const m = new T.Mesh(new T.SphereGeometry(70, 32, 16), new T.MeshBasicMaterial({ map: tex, side: T.BackSide, fog: false, depthWrite: false }));
    m.renderOrder = 2;
    return m;
  }
  let texPunto = null;
  function puntoSuave() {
    if (texPunto) return texPunto;
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
    texPunto = new T.CanvasTexture(c);
    return texPunto;
  }
  // Partículas: n puntos dentro de una caja; mover(p, i, t, dt) los anima.
  function particulas(n, caja, color, tam, opacidad, aditivo) {
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { pos[i * 3] = azar(caja[0], caja[1]); pos[i * 3 + 1] = azar(caja[2], caja[3]); pos[i * 3 + 2] = azar(caja[4], caja[5]); }
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3));
    const p = new T.Points(geo, new T.PointsMaterial({ color, size: tam, map: puntoSuave(), transparent: true, opacity: opacidad == null ? 0.8 : opacidad, depthWrite: false, blending: aditivo ? T.AdditiveBlending : T.NormalBlending }));
    p.userData.caja = caja;
    return p;
  }
  function emoji(e, alto) {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d'); x.font = '100px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(e, 64, 70);
    const tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace;
    const s = new T.Sprite(new T.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    s.scale.set(alto, alto, 1);
    return s;
  }
  const estandar = (o) => new T.MeshStandardMaterial(Object.assign({ roughness: 0.6, metalness: 0.05 }, o));

  // ================================================================ Tierra primitiva
  function tierraPrimitiva() {
    const grupo = new T.Group();
    grupo.add(cielo(['#2a0604', '#7f1d1d', '#c2410c', '#f97316', '#fdba74']));
    grupo.userData.niebla = new T.Fog('#7c2d12', 8, 60);
    const amb = new T.AmbientLight('#ffb38a', 0.7); grupo.add(amb);
    const sol = new T.DirectionalLight('#ffbf8a', 1.2); sol.position.set(6, 10, -10); grupo.add(sol);
    // Orilla rocosa y océano primitivo (olas)
    const orilla = new T.Mesh(new T.PlaneGeometry(16, 7, 16, 8).rotateX(-Math.PI / 2), estandar({ color: '#3b2416', roughness: 1, flatShading: true }));
    orilla.position.set(0, 0, -3.2);
    const po = orilla.geometry.attributes.position; for (let i = 0; i < po.count; i++) po.setY(i, Math.random() * 0.12); orilla.geometry.computeVertexNormals();
    grupo.add(orilla);
    const oceano = new T.Mesh(new T.PlaneGeometry(90, 70, 60, 46).rotateX(-Math.PI / 2), estandar({ color: '#28332a', roughness: 0.3, metalness: 0.25, emissive: '#9a3412', emissiveIntensity: 0.35, flatShading: true }));
    oceano.position.set(0, -0.05, -40);
    grupo.add(oceano);
    const base = Float32Array.from(oceano.geometry.attributes.position.array);
    // Charca tibia en la orilla y sus moléculas brillantes
    const charca = new T.Mesh(new T.CircleGeometry(1.1, 32).rotateX(-Math.PI / 2), estandar({ color: '#4d7c0f', emissive: '#365314', emissiveIntensity: 0.5, roughness: 0.2 }));
    charca.position.set(-2.4, 0.13, -3.4); grupo.add(charca);
    for (let i = 0; i < 9; i++) { const r = new T.Mesh(new T.DodecahedronGeometry(azar(0.15, 0.45)), estandar({ color: '#1c1917', roughness: 1, flatShading: true })); r.position.set(azar(-7, 7), 0.1, azar(-1.5, -6)); grupo.add(r); }
    const moleculas = particulas(70, [-3.3, -1.5, 0.2, 1.1, -4.2, -2.6], '#86efac', 0.09, 0.95, true); grupo.add(moleculas);
    // Burbujas que hierven y vapor
    const burbujas = particulas(260, [-8, 8, 0, 0.6, -5, -16], '#fde68a', 0.08, 0.9, true); grupo.add(burbujas);
    const vapor = particulas(90, [-12, 12, 0, 4, -5, -24], '#fed7aa', 1.6, 0.25); grupo.add(vapor);
    // Volcanes con lava y humo
    const volcanes = [];
    [[-16, -34, 1], [12, -42, 1.3], [-3, -52, 1.6]].forEach(([x, z, k]) => {
      const v = new T.Mesh(new T.ConeGeometry(6 * k, 9 * k, 20, 4, true), estandar({ color: '#1c1917', roughness: 1, flatShading: true }));
      v.position.set(x, 4.5 * k - 0.5, z); grupo.add(v);
      const lava = new T.Mesh(new T.SphereGeometry(1.1 * k, 16, 8), new T.MeshBasicMaterial({ color: '#ff5a00' }));
      lava.position.set(x, 9 * k - 1.1, z); grupo.add(lava);
      for (let j = 0; j < 3; j++) { const r = new T.Mesh(new T.BoxGeometry(0.35 * k, 0.12, 5.5 * k), new T.MeshBasicMaterial({ color: '#f97316' })); r.position.set(x + (j - 1) * 1.6 * k, 4.3 * k, z + 2.4 * k); r.rotation.set(-1.0, (j - 1) * 0.6, 0); grupo.add(r); }
      volcanes.push({ lava, x, z, k });
    });
    const humo = particulas(150, [-20, 16, 8, 22, -56, -30], '#57534e', 3.2, 0.35); grupo.add(humo);
    // Rayos: líneas quebradas que aparecen y se apagan, con un destello
    const rayos = new T.Group(); grupo.add(rayos);
    const destello = new T.PointLight('#e0f2fe', 0, 80); destello.position.set(4, 14, -22); grupo.add(destello);
    let proximo = 1.2;
    function rayo() {
      const x0 = azar(-14, 14), z0 = azar(-40, -16), pts = [V(x0, 24, z0)];
      let x = x0, z = z0;
      for (let y = 22; y > 0; y -= azar(1.5, 3)) { x += azar(-1.6, 1.6); z += azar(-1, 1); pts.push(V(x, y, z)); }
      pts.push(V(x, 0, z));
      const l = new T.Line(new T.BufferGeometry().setFromPoints(pts), new T.LineBasicMaterial({ color: '#f0f9ff', transparent: true, opacity: 1 }));
      l.userData.vida = 0.35; rayos.add(l);
      destello.position.set(x0, 14, z0); destello.intensity = 60;
      if (obj.alRayo) obj.alRayo(Math.hypot(x0, z0)); // bioportal.js: el trueno llega después del destello
    }
    const obj = {
      grupo, color: '#f97316',
      puntos: { oceano: V(0, 0.5, -14), rayos: V(3, 10, -26), volcanes: V(-14, 6, -32), atmosfera: V(0, 16, -40), charca: V(-2.4, 0.3, -3.4), moleculas: V(-2.3, 0.7, -3.5) },
      actualizar(t, dt) {
        const p = oceano.geometry.attributes.position;
        for (let i = 0; i < p.count; i++) { const bx = base[i * 3], bz = base[i * 3 + 2]; p.setY(i, Math.sin(bx * 0.35 + t * 1.6) * 0.18 + Math.cos(bz * 0.4 + t * 1.2) * 0.15); }
        p.needsUpdate = true;
        subir(burbujas, dt * 0.7, true); subir(vapor, dt * 0.35); subir(humo, dt * 1.2);
        girar(moleculas, t);
        volcanes.forEach((v, i) => { v.lava.scale.setScalar(1 + Math.sin(t * 3 + i) * 0.08); });
        proximo -= dt; if (proximo <= 0) { rayo(); proximo = azar(1.2, 3.5); }
        rayos.children.slice().forEach((l) => { l.userData.vida -= dt; l.material.opacity = Math.max(0, l.userData.vida / 0.35); if (l.userData.vida <= 0) { rayos.remove(l); l.geometry.dispose(); } });
        destello.intensity *= 0.85;
        amb.intensity = 0.7 + destello.intensity / 120;
      },
    };
    return obj;
  }

  // ================================================================ Interior de la célula
  function celula() {
    const grupo = new T.Group();
    grupo.add(cielo(['#2e1065', '#6b21a8', '#be185d', '#f9a8d4']));
    grupo.userData.niebla = new T.Fog('#701a75', 5, 38);
    grupo.add(new T.AmbientLight('#fbcfe8', 0.9));
    const luz = new T.DirectionalLight('#ffffff', 1); luz.position.set(4, 8, 4); grupo.add(luz);
    const membrana = new T.Mesh(new T.SphereGeometry(26, 48, 24), estandar({ color: '#f472b6', side: T.BackSide, transparent: true, opacity: 0.35, emissive: '#9d174d', emissiveIntensity: 0.4 }));
    membrana.position.set(0, 3, -12); grupo.add(membrana);
    // Núcleo (con poros y nucléolo)
    const nucleo = new T.Group(); nucleo.position.set(0, 2.6, -12); grupo.add(nucleo);
    nucleo.add(new T.Mesh(new T.SphereGeometry(2.3, 48, 24), estandar({ color: '#7c3aed', emissive: '#4c1d95', emissiveIntensity: 0.4, transparent: true, opacity: 0.85 })));
    nucleo.add(new T.Mesh(new T.SphereGeometry(0.85, 24, 12), estandar({ color: '#e879f9', emissive: '#a21caf', emissiveIntensity: 0.6 })));
    const poros = new T.InstancedMesh(new T.SphereGeometry(0.11, 8, 6), estandar({ color: '#2e1065' }), 60);
    const m = new T.Matrix4();
    for (let i = 0; i < 60; i++) { const v = V(azar(-1, 1), azar(-1, 1), azar(-1, 1)).normalize().multiplyScalar(2.3); m.makeTranslation(v.x, v.y, v.z); poros.setMatrixAt(i, m); }
    nucleo.add(poros);
    const reticulo = new T.Mesh(new T.TorusKnotGeometry(3.3, 0.12, 220, 8, 3, 8), estandar({ color: '#38bdf8', emissive: '#0369a1', emissiveIntensity: 0.4, transparent: true, opacity: 0.85 }));
    reticulo.position.copy(nucleo.position); grupo.add(reticulo);
    // Mitocondrias
    const mitos = [];
    [[3, 1.3, -6], [-3.6, 1.7, -7.5], [2.6, 4, -9], [-4.5, 0.8, -12], [5.4, 2.6, -14]].forEach(([x, y, z], i) => {
      const mi = new T.Group(); mi.position.set(x, y, z); mi.rotation.set(azar(0, 3), azar(0, 3), azar(0, 3));
      mi.add(new T.Mesh(new T.CapsuleGeometry(0.38, 1.1, 8, 16), estandar({ color: '#fb923c', emissive: '#c2410c', emissiveIntensity: 0.35 })));
      for (let k = -1; k <= 1; k++) { const cr = new T.Mesh(new T.TorusGeometry(0.3, 0.035, 6, 20), estandar({ color: '#fde68a' })); cr.position.y = k * 0.35; cr.rotation.x = Math.PI / 2; mi.add(cr); }
      grupo.add(mi); mitos.push(mi);
    });
    // Ribosomas
    const ribos = new T.InstancedMesh(new T.SphereGeometry(0.08, 8, 6), estandar({ color: '#60a5fa', emissive: '#1d4ed8', emissiveIntensity: 0.5 }), 280);
    for (let i = 0; i < 280; i++) { const cerca = i < 160; const v = cerca ? V(azar(-1, 1), azar(-1, 1), azar(-1, 1)).normalize().multiplyScalar(azar(3, 4)).add(nucleo.position) : V(azar(-8, 8), azar(0.3, 7), azar(-4, -18)); m.makeTranslation(v.x, v.y, v.z); ribos.setMatrixAt(i, m); }
    grupo.add(ribos);
    // Aparato de Golgi
    const golgi = new T.Group(); golgi.position.set(5.6, 2.3, -9); golgi.rotation.set(0.3, -0.8, 0.4); grupo.add(golgi);
    for (let i = 0; i < 5; i++) { const c = new T.Mesh(new T.TorusGeometry(1.25 - i * 0.13, 0.13, 8, 32, Math.PI * 1.3), estandar({ color: '#facc15', emissive: '#a16207', emissiveIntensity: 0.35 })); c.position.z = i * 0.3; golgi.add(c); }
    const citoplasma = particulas(500, [-12, 12, 0, 9, -2, -24], '#fce7f3', 0.08, 0.7, true); grupo.add(citoplasma);
    return {
      grupo, color: '#f472b6',
      puntos: { nucleo: nucleo.position.clone(), mitocondria: V(3, 1.3, -6), ribosomas: V(-1.6, 3.2, -8.4), reticulo: V(2.8, 2.6, -10.6), golgi: golgi.position.clone(), membrana: V(0, 6, -36), citoplasma: V(0, 1.2, -4) },
      actualizar(t, dt) {
        nucleo.rotation.y = t * 0.1; reticulo.rotation.y = -t * 0.06;
        mitos.forEach((mi, i) => { mi.rotation.y += dt * 0.3; mi.position.y += Math.sin(t + i) * 0.002; });
        golgi.rotation.z = 0.4 + Math.sin(t * 0.5) * 0.05;
        flotar(citoplasma, t, dt);
      },
    };
  }

  // ================================================================ Interior del cuerpo (vaso sanguíneo)
  function cuerpo() {
    const grupo = new T.Group();
    grupo.add(cielo(['#1a0505', '#450a0a', '#7f1d1d']));
    grupo.userData.niebla = new T.Fog('#3b0a0a', 3, 32);
    grupo.add(new T.AmbientLight('#fecaca', 0.8));
    const luz = new T.PointLight('#fff1f2', 40, 30); luz.position.set(0, 2.2, -4); grupo.add(luz);
    const Y = 2.2;
    const tunel = new T.Mesh(new T.CylinderGeometry(4, 4, 90, 40, 60, true).rotateX(Math.PI / 2), estandar({ color: '#b91c1c', emissive: '#7f1d1d', emissiveIntensity: 0.45, roughness: 0.85, side: T.BackSide, flatShading: true }));
    const p = tunel.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), r = 1 + Math.sin(z * 1.3) * 0.04 + Math.sin(Math.atan2(y, x) * 9 + z) * 0.03; p.setX(i, x * r); p.setY(i, y * r); }
    tunel.geometry.computeVertexNormals();
    tunel.position.set(0, Y, -45); grupo.add(tunel);
    // Glóbulos rojos (discos que fluyen hacia el portal)
    const N = 170, rojos = new T.InstancedMesh(new T.TorusGeometry(0.32, 0.17, 10, 22), estandar({ color: '#dc2626', emissive: '#7f1d1d', emissiveIntensity: 0.3, roughness: 0.5 }), N);
    const datosR = []; for (let i = 0; i < N; i++) { const a = azar(0, Math.PI * 2), r = Math.sqrt(Math.random()) * 3.1; datosR.push({ x: Math.cos(a) * r, y: Y + Math.sin(a) * r, z: azar(-70, -1), rx: azar(0, 3), ry: azar(0, 3), v: azar(1.2, 2.2) }); }
    grupo.add(rojos);
    const blancos = [];
    for (let i = 0; i < 5; i++) {
      const geo = new T.IcosahedronGeometry(0.7, 2), q = geo.attributes.position;
      for (let k = 0; k < q.count; k++) { const s = 1 + azar(-0.12, 0.12); q.setXYZ(k, q.getX(k) * s, q.getY(k) * s, q.getZ(k) * s); }
      geo.computeVertexNormals();
      const b = new T.Mesh(geo, estandar({ color: '#f8fafc', roughness: 1, emissive: '#e2e8f0', emissiveIntensity: 0.1 }));
      b.position.set(i === 0 ? -1.4 : azar(-2.5, 2.5), i === 0 ? Y - 0.6 : Y + azar(-2, 2), i === 0 ? -11 : azar(-20, -50)); grupo.add(b); blancos.push(b);
    }
    const plaquetas = particulas(80, [-3, 3, Y - 3, Y + 3, -2, -40], '#fde68a', 0.14, 0.95); grupo.add(plaquetas);
    const corriente = particulas(260, [-3.2, 3.2, Y - 3.2, Y + 3.2, -2, -60], '#fecdd3', 0.05, 0.6, true); grupo.add(corriente);
    const m = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), s = new T.Vector3(1, 1, 1), pos = new T.Vector3();
    return {
      grupo, color: '#ef4444',
      puntos: { corriente: V(0, Y, -6), 'globulos-rojos': V(0.8, Y + 0.3, -7), 'globulos-blancos': blancos[0].position.clone(), plaquetas: V(-0.6, Y + 1.2, -8), pared: V(3.6, Y + 0.4, -10), fondo: V(0, Y, -40) },
      actualizar(t, dt) {
        datosR.forEach((d, i) => { d.z += d.v * dt; if (d.z > -0.5) d.z = -70; d.rx += dt * 0.8; d.ry += dt * 0.5; e.set(d.rx, d.ry, 0); q.setFromEuler(e); pos.set(d.x, d.y + Math.sin(t + i) * 0.05, d.z); m.compose(pos, q, s); rojos.setMatrixAt(i, m); });
        rojos.instanceMatrix.needsUpdate = true;
        blancos.forEach((b, i) => { b.rotation.y += dt * 0.2; if (i) { b.position.z += dt * 0.6; if (b.position.z > -2) b.position.z = -55; } });
        fluir(plaquetas, dt * 1.3, -40, -2); fluir(corriente, dt * 2.4, -60, -2);
      },
    };
  }

  // ================================================================ Ecosistema (selva)
  function ecosistema() {
    const grupo = new T.Group();
    grupo.add(cielo(['#0369a1', '#38bdf8', '#bae6fd', '#ecfccb']));
    grupo.userData.niebla = new T.Fog('#d9f99d', 18, 70);
    grupo.add(new T.HemisphereLight('#e0f2fe', '#365314', 1.1));
    const luz = new T.DirectionalLight('#fff7d6', 1.4); luz.position.set(12, 18, -20); grupo.add(luz);
    const sol = new T.Mesh(new T.SphereGeometry(2.4, 24, 12), new T.MeshBasicMaterial({ color: '#fde047' })); sol.position.set(16, 20, -50); grupo.add(sol);
    const halo = emoji('🔆', 9); halo.position.copy(sol.position); grupo.add(halo);
    const suelo = new T.Mesh(new T.PlaneGeometry(120, 120, 40, 40).rotateX(-Math.PI / 2), estandar({ color: '#3f7d20', roughness: 1, flatShading: true }));
    const ps = suelo.geometry.attributes.position; for (let i = 0; i < ps.count; i++) ps.setY(i, Math.random() * 0.25); suelo.geometry.computeVertexNormals();
    suelo.position.set(0, -0.1, -40); grupo.add(suelo);
    const rio = new T.Mesh(new T.PlaneGeometry(5, 120).rotateX(-Math.PI / 2), estandar({ color: '#38bdf8', emissive: '#0284c7', emissiveIntensity: 0.25, roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.9 }));
    rio.position.set(6, 0.06, -40); rio.rotation.y = 0.12; grupo.add(rio);
    // Árboles (troncos y copas)
    const NA = 70, troncos = new T.InstancedMesh(new T.CylinderGeometry(0.16, 0.26, 2.2, 6), estandar({ color: '#713f12', roughness: 1 }), NA);
    const copas = new T.InstancedMesh(new T.IcosahedronGeometry(1.3, 0), estandar({ roughness: 0.9, flatShading: true }), NA);
    const m = new T.Matrix4(), c = new T.Color();
    for (let i = 0; i < NA; i++) {
      let x, z; do { x = azar(-28, 28); z = azar(-5, -55); } while (Math.abs(x - 6 - (z + 40) * -0.12) < 4 || (Math.abs(x) < 2.5 && z > -9));
      const k = azar(0.8, 1.6);
      m.makeScale(k, k, k).setPosition(x, 1.1 * k, z); troncos.setMatrixAt(i, m);
      m.makeScale(k, k * 1.1, k).setPosition(x, 2.6 * k, z); copas.setMatrixAt(i, m);
      copas.setColorAt(i, c.setHSL(azar(0.25, 0.36), 0.6, azar(0.22, 0.38)));
    }
    grupo.add(troncos); grupo.add(copas);
    const flores = new T.InstancedMesh(new T.SphereGeometry(0.05, 8, 6), estandar({ roughness: 0.6 }), 160);
    const tonos = ['#f472b6', '#facc15', '#f97316', '#a78bfa', '#ffffff'];
    for (let i = 0; i < 160; i++) { m.makeTranslation(azar(-6, 4), 0.12, azar(-2, -9)); flores.setMatrixAt(i, m); flores.setColorAt(i, c.set(tonos[i % tonos.length])); }
    grupo.add(flores);
    const hongo = emoji('🍄', 0.6); hongo.position.set(-1.6, 0.35, -4); grupo.add(hongo);
    const mono = emoji('🐒', 1.1); mono.position.set(-3.2, 2.4, -8); grupo.add(mono);
    const animales = [emoji('🦋', 0.4), emoji('🦋', 0.35), emoji('🦜', 0.7), emoji('🐦', 0.6)];
    animales.forEach((a) => grupo.add(a));
    const polen = particulas(160, [-15, 15, 0.3, 6, -3, -30], '#fef9c3', 0.07, 0.8, true); grupo.add(polen);
    return {
      grupo, color: '#22c55e',
      puntos: { arboles: V(-6, 3, -14), rio: V(6, 0.5, -16), sol: sol.position.clone(), suelo: hongo.position.clone(), flores: V(-1, 0.3, -5), animales: mono.position.clone() },
      actualizar(t, dt) {
        rio.material.emissiveIntensity = 0.25 + Math.sin(t * 2) * 0.08;
        animales[0].position.set(-1 + Math.sin(t * 1.3) * 1.2, 1 + Math.sin(t * 3) * 0.25, -5 + Math.cos(t) * 0.8);
        animales[1].position.set(1.5 + Math.cos(t * 1.1) * 1, 0.8 + Math.sin(t * 2.6) * 0.2, -6 + Math.sin(t * 0.8) * 1);
        animales[2].position.set(Math.cos(t * 0.4) * 9, 7 + Math.sin(t) * 0.5, -20 + Math.sin(t * 0.4) * 6);
        animales[3].position.set(Math.sin(t * 0.5) * 12, 9, -26 + Math.cos(t * 0.5) * 6);
        mono.position.y = 2.4 + Math.abs(Math.sin(t * 2)) * 0.15;
        flotar(polen, t, dt);
      },
    };
  }

  // ================================================================ Mundo molecular
  function molecular() {
    const grupo = new T.Group();
    grupo.add(cielo(['#020617', '#1e1b4b', '#312e81', '#1e3a8a']));
    grupo.userData.niebla = new T.Fog('#1e1b4b', 8, 45);
    grupo.add(new T.AmbientLight('#c7d2fe', 0.8));
    const luz = new T.DirectionalLight('#ffffff', 1.3); luz.position.set(5, 10, 5); grupo.add(luz);
    // Doble hélice del ADN
    const adn = new T.Group(); adn.position.set(-3.2, 0, -10); grupo.add(adn);
    const bases = ['#f472b6', '#facc15', '#34d399', '#60a5fa'];
    const esferaA = estandar({ color: '#38bdf8', emissive: '#0369a1', emissiveIntensity: 0.4 }), esferaB = estandar({ color: '#c084fc', emissive: '#7e22ce', emissiveIntensity: 0.4 });
    for (let i = 0; i < 54; i++) {
      const a = i * 0.36, y = 0.4 + i * 0.17, x = Math.cos(a) * 1.1, z = Math.sin(a) * 1.1;
      const s1 = new T.Mesh(new T.SphereGeometry(0.17, 12, 8), esferaA); s1.position.set(x, y, z); adn.add(s1);
      const s2 = new T.Mesh(new T.SphereGeometry(0.17, 12, 8), esferaB); s2.position.set(-x, y, -z); adn.add(s2);
      if (i % 2 === 0) {
        const largo = 2.2, barra = new T.Mesh(new T.CylinderGeometry(0.06, 0.06, largo, 6), estandar({ color: bases[(i / 2) % 4], emissive: bases[(i / 2) % 4], emissiveIntensity: 0.3 }));
        barra.position.set(0, y, 0); barra.rotation.z = Math.PI / 2; barra.rotation.y = -a; adn.add(barra);
      }
    }
    // Enzima (con su "bolsillo") y el sustrato que entra y sale
    const geo = new T.IcosahedronGeometry(2, 3), q = geo.attributes.position;
    for (let k = 0; k < q.count; k++) { const v = V(q.getX(k), q.getY(k), q.getZ(k)); const hoyo = v.x < -1.2 && Math.abs(v.y) < 0.8 ? 0.55 : 1; const s = (1 + Math.sin(v.x * 2) * Math.cos(v.y * 2) * 0.12) * hoyo; q.setXYZ(k, v.x * s, v.y * s, v.z * s); }
    geo.computeVertexNormals();
    const enzima = new T.Mesh(geo, estandar({ color: '#22c55e', emissive: '#166534', emissiveIntensity: 0.35, roughness: 0.7, flatShading: true }));
    enzima.position.set(4.2, 3, -12); grupo.add(enzima);
    const sustrato = new T.Mesh(new T.OctahedronGeometry(0.45), estandar({ color: '#fb923c', emissive: '#c2410c', emissiveIntensity: 0.5 }));
    grupo.add(sustrato);
    // Proteína: una cadena plegada de aminoácidos
    const proteina = new T.Group(); proteina.position.set(0.5, 6.5, -20); grupo.add(proteina);
    let p = V(0, 0, 0);
    for (let i = 0; i < 46; i++) { p = p.clone().add(V(azar(-0.5, 0.5), azar(-0.5, 0.5), azar(-0.5, 0.5)).normalize().multiplyScalar(0.42)); p.clampLength(0, 2.4); const s = new T.Mesh(new T.SphereGeometry(0.22, 10, 8), estandar({ color: new T.Color().setHSL(i / 46, 0.7, 0.6) })); s.position.copy(p); proteina.add(s); }
    // Moléculas de agua (oxígeno rojo + dos hidrógenos blancos)
    const NA = 70, ox = new T.InstancedMesh(new T.SphereGeometry(0.16, 10, 8), estandar({ color: '#ef4444' }), NA), hi = new T.InstancedMesh(new T.SphereGeometry(0.09, 8, 6), estandar({ color: '#f8fafc' }), NA * 2);
    const aguas = []; for (let i = 0; i < NA; i++) aguas.push({ p: V(azar(-8, 8), azar(0.4, 7), azar(-2, -16)), r: azar(0, 6), v: azar(0.2, 0.6) });
    grupo.add(ox); grupo.add(hi);
    const brillo = particulas(250, [-15, 15, 0, 12, -2, -30], '#a5b4fc', 0.06, 0.7, true); grupo.add(brillo);
    const m = new T.Matrix4(), e = new T.Euler(), qq = new T.Quaternion(), uno = V(1, 1, 1), h1 = V(0.18, 0.1, 0), h2 = V(-0.18, 0.1, 0);
    return {
      grupo, color: '#818cf8',
      puntos: { adn: V(-3.2, 5, -10), bases: V(-3.2, 2.6, -10), enzima: enzima.position.clone(), sustrato: V(2.2, 3, -11.4), proteina: proteina.position.clone(), agua: V(0, 1.4, -5) },
      actualizar(t, dt) {
        adn.rotation.y = t * 0.35;
        enzima.rotation.y = Math.sin(t * 0.4) * 0.3;
        const fase = (Math.sin(t * 0.9) + 1) / 2; // el sustrato entra en el sitio activo y sale
        sustrato.position.set(4.2 - 2.2 - fase * 1.2, 3 + Math.sin(t * 2) * 0.1, -12 + 0.6); sustrato.rotation.set(t, t * 0.7, 0);
        proteina.rotation.set(t * 0.15, t * 0.2, 0);
        aguas.forEach((a, i) => {
          a.r += dt * a.v; a.p.y += Math.sin(t + i) * 0.003;
          e.set(a.r, a.r * 0.7, 0); qq.setFromEuler(e);
          m.compose(a.p, qq, uno); ox.setMatrixAt(i, m);
          const o1 = h1.clone().applyQuaternion(qq).add(a.p), o2 = h2.clone().applyQuaternion(qq).add(a.p);
          m.compose(o1, qq, uno); hi.setMatrixAt(i * 2, m); m.compose(o2, qq, uno); hi.setMatrixAt(i * 2 + 1, m);
        });
        ox.instanceMatrix.needsUpdate = true; hi.instanceMatrix.needsUpdate = true;
        flotar(brillo, t, dt);
      },
    };
  }

  // ---------- animaciones de partículas ----------
  function subir(p, paso, reiniciarAbajo) {
    const a = p.geometry.attributes.position, c = p.userData.caja;
    for (let i = 0; i < a.count; i++) { let y = a.getY(i) + paso * (0.6 + (i % 5) * 0.2); if (y > c[3]) y = reiniciarAbajo ? c[2] : c[2] + Math.random(); a.setY(i, y); }
    a.needsUpdate = true;
  }
  function flotar(p, t, dt) {
    const a = p.geometry.attributes.position;
    for (let i = 0; i < a.count; i++) { a.setY(i, a.getY(i) + Math.sin(t * 0.8 + i) * dt * 0.08); a.setX(i, a.getX(i) + Math.cos(t * 0.6 + i) * dt * 0.05); }
    a.needsUpdate = true;
  }
  function girar(p, t) { p.rotation.y = Math.sin(t * 0.3) * 0.2; }
  function fluir(p, paso, desde, hasta) {
    const a = p.geometry.attributes.position;
    for (let i = 0; i < a.count; i++) { let z = a.getZ(i) + paso; if (z > hasta) z = desde; a.setZ(i, z); }
    a.needsUpdate = true;
  }

  const CREAR = { 'tierra-primitiva': tierraPrimitiva, celula, cuerpo, ecosistema, molecular };
  g.BioPortalMundos = {
    ids: Object.keys(CREAR),
    crear(THREE, id) { T = THREE; return (CREAR[id] || tierraPrimitiva)(); },
  };
})(window);
