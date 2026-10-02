/* =========================================================================
   ENTREVISTA A UN PERSONAJE CON IA — dibujos (js/entrevista/personajes.js)
   -------------------------------------------------------------------------
   Personajes de cuerpo entero, con proporciones humanas, sombreado y
   ARTICULACIONES (hombro, codo, cadera) para moverse como un profesor junto
   a la pizarra: gesticular, señalar, cambiar el peso de pie y caminar.
   Cada uno es una función que devuelve un SVG (viewBox 0 0 140 300). Si un
   libro tiene una ilustración profesional, config.js puede usarla en su
   lugar (personaje.ilustracion).
   Partes animables (data-parte):
     cuerpo › pierna-izq, pierna-der, superior › cabeza › ojos, boca-cerrada,
     boca-abierta · brazo › antebrazo (señala la pizarra, con tiza) ·
     brazo-libre › antebrazo-libre (gestos).
   Expone window.EntrevistaPersonajes = { dibujar, mezclar }.
   ========================================================================= */
(function () {
  'use strict';
  var n = 0;

  function mezclar(a, b, t) {
    function rgb(h) {
      h = String(h || '#000').replace('#', '');
      if (h.length === 3) h = h.replace(/(.)/g, '$1$1');
      var v = parseInt(h, 16) || 0;
      return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
    }
    var x = rgb(a), y = rgb(b);
    return '#' + [0, 1, 2].map(function (i) { return ('0' + Math.round(x[i] + (y[i] - x[i]) * t).toString(16)).slice(-2); }).join('');
  }
  // Degradado lineal de izquierda (claro) a derecha (oscuro): da volumen.
  function lineal(id, claro, oscuro, vertical) {
    return '<linearGradient id="' + id + '" x1="0" y1="0" x2="' + (vertical ? 0 : 1) + '" y2="' + (vertical ? 1 : 0) + '">' +
      '<stop offset="0" stop-color="' + claro + '"/><stop offset="1" stop-color="' + oscuro + '"/></linearGradient>';
  }
  function radial(id, centro, borde) {
    return '<radialGradient id="' + id + '" cx=".45" cy=".4" r=".65"><stop offset="0" stop-color="' + centro + '"/><stop offset="1" stop-color="' + borde + '"/></radialGradient>';
  }

  // Cara común: orejas, cabeza, ojos, nariz y boca (las piezas que se animan).
  function cara(u, piel, o) {
    o = o || {};
    var sombra = mezclar(piel, '#000', 0.18);
    var iris = o.iris || '#4b3621';
    return '<ellipse cx="55.6" cy="36" rx="3" ry="5" fill="' + sombra + '"/><ellipse cx="84.4" cy="36" rx="3" ry="5" fill="' + sombra + '"/>' +
      '<ellipse cx="70" cy="34" rx="14.5" ry="18" fill="url(#piel' + u + ')"/>' +
      '<path d="' + (o.cejas || 'M60.5 29.6 Q64.5 27.6 68 29.2 M72 29.2 Q75.5 27.6 79.5 29.6') + '" fill="none" stroke="' + (o.colorCejas || '#3b2a1a') + '" stroke-width="' + (o.grosorCejas || 1.3) + '" stroke-linecap="round"/>' +
      '<g data-parte="ojos">' +
      '<ellipse cx="64.6" cy="33.6" rx="2.7" ry="1.7" fill="#fff"/><ellipse cx="75.4" cy="33.6" rx="2.7" ry="1.7" fill="#fff"/>' +
      '<circle cx="64.9" cy="33.7" r="1.35" fill="' + iris + '"/><circle cx="75.7" cy="33.7" r="1.35" fill="' + iris + '"/>' +
      '<circle cx="65.3" cy="33.2" r=".45" fill="#fff"/><circle cx="76.1" cy="33.2" r=".45" fill="#fff"/>' +
      '</g>' +
      '<path d="M61.6 32.2 Q64.6 30.9 67.6 32.2 M72.4 32.2 Q75.4 30.9 78.4 32.2" fill="none" stroke="' + mezclar(piel, '#000', 0.45) + '" stroke-width=".7"/>' +
      (o.arrugas || '') +
      '<path d="M70.4 35 Q71.2 39.5 72 40.6 Q70.6 41.8 68.6 41" fill="none" stroke="' + mezclar(piel, '#000', 0.3) + '" stroke-width=".8" stroke-linecap="round"/>' +
      (o.despuesDeNariz || '') +
      '<path data-parte="boca-cerrada" d="' + (o.boca || 'M66.3 45.4 Q70 47 73.7 45.4') + '" fill="none" stroke="' + (o.labios || '#8a3b3b') + '" stroke-width="1.1" stroke-linecap="round"/>' +
      '<g data-parte="boca-abierta" opacity="0"><path d="M66.6 45 Q70 50.4 73.4 45 Q70 46.2 66.6 45 Z" fill="#5b1d1d"/><path d="M67.8 45.5 Q70 46.1 72.2 45.5 L72 46 Q70 46.5 68 46 Z" fill="#fff"/></g>';
  }

  // Brazos articulados (hombro → codo → mano). relleno/trazo: la manga.
  //   senala: brazo izquierdo del dibujo (hacia la pizarra), con tiza.
  //   libre: brazo derecho del dibujo, para los gestos.
  function brazos(relleno, trazo, piel, puno) {
    var t = trazo ? ' stroke="' + trazo + '" stroke-width=".6"' : '';
    var pielOsc = mezclar(piel, '#000', 0.12);
    function mano(cx) { return '<ellipse cx="' + cx + '" cy="152.6" rx="4.5" ry="6.1" fill="' + piel + '" stroke="' + pielOsc + '" stroke-width=".5"/>'; }
    var cuff = function (x) { return puno ? '<rect x="' + x + '" y="143.6" width="10" height="4" rx="1.5" fill="' + puno + '"/>' : ''; };
    return {
      senala: '<g data-parte="brazo">' +
        '<path d="M45.5 73 C40 85 38.5 98 38.5 112 L47.5 112 C47.5 100 48.5 89 52 80 Z" fill="' + relleno + '"' + t + '/>' +
        '<g data-parte="antebrazo">' +
        '<circle cx="43" cy="111" r="4.7" fill="' + relleno + '"/>' +
        '<path d="M38.3 109 C37.6 122 37 134 37 146 L46 147 C46.3 135 46.8 122 47.7 109 Z" fill="' + relleno + '"' + t + '/>' +
        cuff(36.5) +
        '<rect x="38.3" y="155" width="2.4" height="8" rx="1" fill="#fff" stroke="#e5e7eb" stroke-width=".4" transform="rotate(12 39.5 159)"/>' +
        mano(41.4) + '</g></g>',
      libre: '<g data-parte="brazo-libre">' +
        '<path d="M94.5 73 C100 85 101.5 98 101.5 112 L92.5 112 C92.5 100 91.5 89 88 80 Z" fill="' + relleno + '"' + t + '/>' +
        '<g data-parte="antebrazo-libre">' +
        '<circle cx="97" cy="111" r="4.7" fill="' + relleno + '"/>' +
        '<path d="M101.7 109 C102.4 122 103 134 103 146 L94 147 C93.7 135 93.2 122 92.3 109 Z" fill="' + relleno + '"' + t + '/>' +
        cuff(93.5) + mano(98.6) + '</g></g>',
    };
  }

  // ---------- Charles Darwin (hacia 1870): levita, chaleco, barba blanca ----------
  function darwin(u) {
    var piel = '#eac0a0';
    var b = brazos('url(#levita' + u + ')', '', piel, '#f1f5f9');
    return '<defs>' + radial('piel' + u, '#f6d6bd', '#d9a481') + lineal('levita' + u, '#3a4250', '#151a22') +
      lineal('pant' + u, '#4a4f58', '#262a31') + lineal('barba' + u, '#ffffff', '#d4d4d8', true) + '</defs>' +
      '<g data-parte="cuerpo">' +
      '<ellipse cx="70" cy="293" rx="38" ry="4" fill="#000" opacity=".12"/>' +
      // piernas (cada una gira desde la cadera)
      '<g data-parte="pierna-izq"><path d="M56 138 L70.6 138 L68 284 L55.5 284 Z" fill="url(#pant' + u + ')"/>' +
      '<path d="M53 282 Q53 289 60 290 L70 290 Q71 284 68 282 Z" fill="#111"/></g>' +
      '<g data-parte="pierna-der"><path d="M69.4 138 L84 138 L84.5 284 L72 284 Z" fill="url(#pant' + u + ')"/>' +
      '<path d="M72 282 Q69 284 70 290 L80 290 Q87 289 87 282 Z" fill="#111"/></g>' +
      '<g data-parte="superior">' +
      // levita hasta las rodillas
      '<path d="M41 72 C48 64 60 62 70 63 C80 62 92 64 99 72 L103 150 L104 214 Q90 219 80 214 L72 150 L70 148 L68 150 L60 214 Q50 219 36 214 L37 150 Z" fill="url(#levita' + u + ')"/>' +
      // chaleco, botones y cadena del reloj
      '<path d="M62 63 L78 63 L80 136 Q75 141 70 142 Q65 141 60 136 Z" fill="#4b5262"/>' +
      '<circle cx="70" cy="100" r="1" fill="#1f2430"/><circle cx="70" cy="110" r="1" fill="#1f2430"/><circle cx="70" cy="120" r="1" fill="#1f2430"/><circle cx="70" cy="130" r="1" fill="#1f2430"/>' +
      '<path d="M73 112 Q80 116 79 122" fill="none" stroke="#c9a227" stroke-width=".8"/>' +
      '<path d="M62 63 L67 92 L58 82 L55 66 Z M78 63 L73 92 L82 82 L85 66 Z" fill="#232a35"/>' +
      '<path d="M64 48 L76 48 L77 63 L63 63 Z" fill="' + mezclar(piel, '#000', 0.18) + '"/>' +
      b.libre +
      '<g data-parte="cabeza">' +
      '<path d="M55 40 C53 31 55 24 59.5 20.5 C58.5 27 58.2 33 58.4 41 Z M85 40 C87 31 85 24 80.5 20.5 C81.5 27 81.8 33 81.6 41 Z" fill="#e8e8ea"/>' +
      cara(u, piel, {
        iris: '#5a6b7d',
        colorCejas: '#e5e5e5', grosorCejas: 2.4,
        cejas: 'M60 29.4 Q64.5 26.8 68.2 29 M71.8 29 Q75.5 26.8 80 29.4',
        arrugas: '<path d="M62 23 Q70 21 78 23 M63.5 25.6 Q70 24 76.5 25.6" fill="none" stroke="#c99a7c" stroke-width=".5"/>' +
          '<path d="M64 18 Q70 16.6 76 18" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".55"/>',
        despuesDeNariz: '<path d="M56.2 37 C55 53 58 71 70 84 C82 71 85 53 83.8 37 C82 46 77 50.5 70 50.5 C63 50.5 58 46 56.2 37 Z" fill="url(#barba' + u + ')"/>' +
          '<path d="M61 55 Q62 66 66 74 M70 54 L70 80 M79 55 Q78 66 74 74 M65 52 Q65 60 67.5 66 M75 52 Q75 60 72.5 66" fill="none" stroke="#c7c7cc" stroke-width=".6"/>',
        boca: 'M67.6 46.8 Q70 47.6 72.4 46.8',
        labios: '#6b3a3a',
      }) +
      '<path d="M63.4 43.6 Q70 40.4 76.6 43.6 Q73.5 46.4 70 45.2 Q66.5 46.4 63.4 43.6 Z" fill="#f4f4f5" stroke="#d4d4d8" stroke-width=".4"/>' +
      '</g>' +
      b.senala +
      '</g></g>';
  }

  // ---------- Rosalind Franklin (hacia 1955): bata de laboratorio, falda ----------
  function franklin(u) {
    var piel = '#efc7a8';
    var media = mezclar(piel, '#7a5a4a', 0.35);
    var b = brazos('url(#bata' + u + ')', '#cbd5e1', piel, '');
    return '<defs>' + radial('piel' + u, '#fadcc6', '#dfaa8a') + lineal('bata' + u, '#ffffff', '#d7dde5') +
      lineal('pelo' + u, '#4a2f1d', '#24160d', true) + lineal('falda' + u, '#3d4a63', '#232b3b') + '</defs>' +
      '<g data-parte="cuerpo">' +
      '<ellipse cx="70" cy="293" rx="34" ry="4" fill="#000" opacity=".12"/>' +
      '<g data-parte="pierna-izq"><path d="M59 196 L67.5 196 L66.5 284 L60 284 Z" fill="' + media + '"/>' +
      '<path d="M57.5 282 Q57 289 62 290 L69 290 Q69.5 285 66.5 282 Z" fill="#2b1d16"/></g>' +
      '<g data-parte="pierna-der"><path d="M72.5 196 L81 196 L80 284 L73.5 284 Z" fill="' + media + '"/>' +
      '<path d="M73.5 282 Q70.5 285 71 290 L78 290 Q83 289 82.5 282 Z" fill="#2b1d16"/></g>' +
      '<g data-parte="superior">' +
      // bata abierta, blusa metida en la falda
      '<path d="M42 72 C49 64 60 62 70 63 C80 62 91 64 98 72 L101 150 L102 212 Q92 216 82 212 L76 120 L70 112 L64 120 L58 212 Q48 216 38 212 L39 150 Z" fill="url(#bata' + u + ')" stroke="#cbd5e1" stroke-width=".6"/>' +
      '<path d="M63 63 L77 63 L79 190 L61 190 Z" fill="#9cc3e6"/>' +
      '<path d="M70 76 L70 186" stroke="#7aa6cf" stroke-width=".6"/><circle cx="70" cy="92" r=".9" fill="#5f8fbf"/><circle cx="70" cy="108" r=".9" fill="#5f8fbf"/><circle cx="70" cy="124" r=".9" fill="#5f8fbf"/><circle cx="70" cy="140" r=".9" fill="#5f8fbf"/>' +
      '<path d="M65 63 L70 72 L75 63" fill="none" stroke="#7aa6cf" stroke-width="1"/>' +
      '<path d="M57 180 L83 180 L90 228 Q70 233 50 228 Z" fill="url(#falda' + u + ')"/>' +
      '<path d="M63 63 L67 96 L58 86 L56 66 Z M77 63 L73 96 L82 86 L84 66 Z" fill="#eef2f6" stroke="#cbd5e1" stroke-width=".5"/>' +
      '<path d="M84 150 L96 150 L96 162 Q90 164 84 162 Z" fill="none" stroke="#cbd5e1" stroke-width=".8"/>' +
      '<path d="M87 148 L87 155" stroke="#2563eb" stroke-width="1.4" stroke-linecap="round"/>' +
      '<path d="M64.5 48 L75.5 48 L76 63 L64 63 Z" fill="' + mezclar(piel, '#000', 0.15) + '"/>' +
      b.libre +
      '<g data-parte="cabeza">' +
      '<path d="M54.5 38 C51 22 59 12.5 70 12.5 C81 12.5 89 22 85.5 38 C87 46 85 52 81 54.5 L80.5 42 C78 34 62 34 59.5 42 L59 54.5 C55 52 53 46 54.5 38 Z" fill="url(#pelo' + u + ')"/>' +
      cara(u, piel, {
        iris: '#3b2a1e',
        colorCejas: '#3a2416', grosorCejas: 1.2,
        labios: '#b4535a',
        boca: 'M66.6 45.4 Q70 47.2 73.4 45.4',
        despuesDeNariz: '<circle cx="62" cy="40" r="2.6" fill="#f08a8a" opacity=".18"/><circle cx="78" cy="40" r="2.6" fill="#f08a8a" opacity=".18"/>',
      }) +
      '<path d="M56 30 C57 19 64 15.5 71 15.5 C79 15.5 84 20 84.5 29 C81 23.5 77 22.5 73 24 C70 21 64 21.5 61 25 C59 26 57.5 27.5 56 30 Z" fill="url(#pelo' + u + ')"/>' +
      '<path d="M62 21 Q66 19 70 20.5 M73 20 Q77 19.5 80 22" fill="none" stroke="#6b4a33" stroke-width=".6"/>' +
      '</g>' +
      b.senala +
      '</g></g>';
  }

  var DIBUJOS = { darwin: darwin, franklin: franklin };

  // p: personaje de config.js · op: { cara: true } = retrato (botón, avatar)
  function dibujar(p, op) {
    op = op || {};
    var u = 'p' + ++n; // ids únicos: puede haber varios dibujos en la página
    var fn = DIBUJOS[p && p.dibujo] || darwin;
    var vista = op.cara ? '47 9 46 46' : '0 0 140 300';
    return '<svg viewBox="' + vista + '" xmlns="http://www.w3.org/2000/svg" class="block w-full h-full" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMax meet" overflow="visible">' +
      fn(u) + '</svg>';
  }
  window.EntrevistaPersonajes = { dibujar: dibujar, mezclar: mezclar };
})();
