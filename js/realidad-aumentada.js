/* =========================================================================
   REALIDAD AUMENTADA ESTABLE (js/realidad-aumentada.js)
   -------------------------------------------------------------------------
   Lo usa BioPortal (y puede usarlo cualquier recurso en realidad aumentada).
   Abre la sesión WebXR (Chrome en Android),
   busca el piso o la mesa (hit-test), coloca el objeto donde el estudiante
   toca y lo deja FIJO en el cuarto aunque camine o gire 360° a su alrededor:
   - Ancla (WebXR Anchors): el celular sigue corrigiendo la posición real del
     objeto mientras aprende el cuarto, así no "se va" ni se desliza.
   - Si se pierde el seguimiento (se movió muy rápido, poca luz, una pared
     lisa), el objeto NO desaparece: queda donde estaba, se avisa y, al
     recuperarse, el ancla lo vuelve a poner en su sitio.
   - Toques sobre la pantalla (fuera de los botones) llegan como rayos 3D,
     para tocar o arrastrar cosas del mundo.
   Uso:
     const ar = ProlipaAR.crear({ THREE, renderer, camara, objeto, reticula, raiz,
       alColocar(), alTocar(rayo, tipo), alSeguimiento(bien), alTerminar() });
     await ar.iniciar();      // pide la sesión (debe llamarse desde un clic)
     ar.cuadro(frame);        // en cada cuadro de renderer.setAnimationLoop
     ar.rayo                  // rayo del dedo mientras está apoyado (o null)
     ar.recolocar();          // volver a elegir dónde ponerlo
     ar.terminar();
   rayo = THREE.Ray en coordenadas del mundo. tipo = 'inicio' | 'fin' | 'toque'.
   ========================================================================= */
(function (g) {
  'use strict';
  g.ProlipaAR = {
    async disponible() {
      try { return !!(navigator.xr && window.isSecureContext && await navigator.xr.isSessionSupported('immersive-ar')); } catch (e) { return false; }
    },
    crear(o) {
      const T = o.THREE, renderer = o.renderer;
      const yo = {
        sesion: null, colocado: false, rayo: null, seguimiento: true,
        iniciar, cuadro, recolocar, terminar,
      };
      let espacio = null, fuente = null, ultimoHit = null, ancla = null, yaw = 0;
      let perdidoDesde = 0, dedo = null;
      const m = new T.Matrix4(), p = new T.Vector3(), q = new T.Quaternion(), s = new T.Vector3();

      async function iniciar() {
        const sesion = await navigator.xr.requestSession('immersive-ar', {
          requiredFeatures: ['hit-test'],
          optionalFeatures: ['dom-overlay', 'anchors'],
          domOverlay: o.raiz ? { root: o.raiz } : undefined,
        });
        yo.sesion = sesion;
        renderer.xr.setReferenceSpaceType('local'); // fijo al cuarto: no se mueve con el celular
        await renderer.xr.setSession(sesion);
        espacio = renderer.xr.getReferenceSpace();
        fuente = await sesion.requestHitTestSource({ space: await sesion.requestReferenceSpace('viewer') });
        sesion.addEventListener('select', alSeleccionar);
        sesion.addEventListener('selectstart', (e) => { if (yo.colocado) { dedo = e.inputSource; yo.rayo = rayoDe(e.frame, dedo); if (yo.rayo && o.alTocar) o.alTocar(yo.rayo, 'inicio'); } });
        sesion.addEventListener('selectend', (e) => { if (dedo && e.inputSource === dedo) { const r = rayoDe(e.frame, dedo) || yo.rayo; dedo = null; yo.rayo = null; if (r && o.alTocar) o.alTocar(r, 'fin'); } });
        sesion.addEventListener('end', fin);
        o.objeto.visible = false;
        yo.colocado = false;
        return sesion;
      }
      function rayoDe(frame, fuenteEntrada) {
        try {
          const pose = frame && frame.getPose(fuenteEntrada.targetRaySpace, espacio);
          if (!pose) return null;
          m.fromArray(pose.transform.matrix);
          const origen = new T.Vector3().setFromMatrixPosition(m);
          const dir = new T.Vector3(0, 0, -1).applyMatrix4(new T.Matrix4().extractRotation(m)).normalize();
          return new T.Ray(origen, dir);
        } catch (e) { return null; }
      }
      function alSeleccionar(e) {
        if (!yo.colocado) { colocar(); return; }
        const r = rayoDe(e.frame, e.inputSource);
        if (r && o.alTocar) o.alTocar(r, 'toque');
      }
      function colocar() {
        if (!ultimoHit) return;
        const pose = ultimoHit.getPose(espacio);
        if (!pose) return;
        m.fromArray(pose.transform.matrix);
        p.setFromMatrixPosition(m);
        const c = o.camara.getWorldPosition(new T.Vector3());
        yaw = Math.atan2(c.x - p.x, c.z - p.z); // de frente al estudiante
        o.objeto.position.copy(p);
        o.objeto.rotation.set(0, yaw, 0);
        o.objeto.visible = true;
        if (o.reticula) o.reticula.visible = false;
        yo.colocado = true;
        // Ancla: el celular mantiene el objeto en ese punto real del cuarto.
        if (ancla && ancla.delete) try { ancla.delete(); } catch (e) {}
        ancla = null;
        if (ultimoHit.createAnchor) ultimoHit.createAnchor().then((a) => { if (yo.colocado) ancla = a; else if (a.delete) a.delete(); }).catch(() => {});
        if (o.alColocar) o.alColocar();
      }
      function cuadro(frame) {
        if (!frame || !espacio) return;
        // ¿El celular sabe dónde está? Si no, se avisa (sin quitar nada de la vista).
        const vista = frame.getViewerPose(espacio);
        const perdido = !vista || vista.emulatedPosition;
        const ahora = performance.now();
        if (perdido) { if (!perdidoDesde) perdidoDesde = ahora; } else perdidoDesde = 0;
        const bien = !perdidoDesde || ahora - perdidoDesde < 700;
        if (bien !== yo.seguimiento) { yo.seguimiento = bien; if (o.alSeguimiento) o.alSeguimiento(bien); }
        if (!yo.colocado) {
          const r = fuente ? frame.getHitTestResults(fuente) : [];
          ultimoHit = r.length ? r[0] : null;
          const pose = ultimoHit && ultimoHit.getPose(espacio);
          if (o.reticula) {
            o.reticula.visible = !!pose;
            if (pose) { o.reticula.matrix.fromArray(pose.transform.matrix); o.reticula.matrixWorldNeedsUpdate = true; }
          }
          return;
        }
        // Colocado: el ancla corrige la posición mientras el celular aprende el cuarto.
        if (ancla && frame.trackedAnchors && frame.trackedAnchors.has(ancla)) {
          const pa = frame.getPose(ancla.anchorSpace, espacio);
          if (pa) { m.fromArray(pa.transform.matrix); m.decompose(p, q, s); o.objeto.position.lerp(p, 0.5); }
        }
        if (dedo) { const r = rayoDe(frame, dedo); if (r) yo.rayo = r; }
      }
      function recolocar() {
        yo.colocado = false;
        o.objeto.visible = false;
        if (ancla && ancla.delete) try { ancla.delete(); } catch (e) {}
        ancla = null;
      }
      function terminar() { if (yo.sesion) yo.sesion.end().catch(() => {}); }
      function fin() {
        if (fuente) try { fuente.cancel(); } catch (e) {}
        fuente = espacio = ultimoHit = ancla = dedo = null;
        yo.sesion = null; yo.colocado = false; yo.rayo = null; yo.seguimiento = true; perdidoDesde = 0;
        if (o.reticula) o.reticula.visible = false;
        o.objeto.position.set(0, 0, 0); o.objeto.rotation.set(0, 0, 0); o.objeto.visible = true;
        if (o.alTerminar) o.alTerminar();
      }
      return yo;
    },
  };
})(window);
