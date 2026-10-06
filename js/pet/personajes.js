/* =========================================================================
   MASCOTA VIRTUAL — personajes y accesorios en SVG (js/pet/personajes.js)
   -------------------------------------------------------------------------
   6 personajes ORIGINALES (sin parecido a personajes con derechos de autor):
   astronauta, lobo urbano, perrito, ajolote y dos robots (Bit y Nexo), todos
   en el mismo lienzo 0 0 120 120 y con las mismas partes (data-parte), para
   que mascota.js los anime sin saber cuál es:
     cuerpo · extra (cola, antena, branquias…) · ojos · ojos-cerrados ·
     boca-feliz · boca-o · zzz · atuendo
   Cada personaje define "anclas" (dónde están los ojos, la cabeza, el
   cuello…) y así los atuendos le quedan bien a todos.
   Atuendos (no los elige el estudiante: los pone la mascota sola según lo que
   pasa): audífonos (micrófono), lentes (leyendo), gafas de sol (descanso) y,
   de vez en cuando, una bufanda.
   ========================================================================= */
(function () {
  'use strict';

  var TINTA = '#1f2937';

  // Mezcla un color con otro (t = 0..1): sombras y panzas del mismo tono.
  function mezclar(hex, con, t) {
    var a = parseInt(hex.slice(1), 16);
    var b = parseInt(con.slice(1), 16);
    var r = [16, 8, 0].map(function (d) {
      var x = (a >> d) & 255;
      return Math.round(x + (((b >> d) & 255) - x) * t);
    });
    return '#' + ((1 << 24) + (r[0] << 16) + (r[1] << 8) + r[2]).toString(16).slice(1);
  }
  function el(tag, attrs) {
    var s = '<' + tag;
    for (var k in attrs) s += ' ' + k + '="' + attrs[k] + '"';
    return s + '/>';
  }
  var ORIGEN = function (o) {
    return 'style="transform-box:fill-box;transform-origin:' + o + '"';
  };

  // ---------- Personajes ----------
  // dibujo(c, o, cl): c = color, o = oscuro, cl = claro.
  // mov: cómo se mueve su parte "extra" en reposo.
  var P = {
    // ---------- Para jóvenes (bachillerato): trazos más limpios, sin mejillas ----------
    // Astronauta: traje blanco con detalles del color elegido y visor luminoso.
    astronauta: {
      pies: { pos: [[47, 107], [73, 107]], rx: 7.5, ry: 3.5, forma: 'caja', color: '#475569' },
      torso: [74, 48, 30],
      brazos: { hombros: [[38, 80], [82, 80]], largo: 17, grosor: 9, color: '#e2e8f0', mano: 'c' },
      a: { cx: 60, ojos: [51, 69], ojosY: 47, bocaY: 55, cabezaY: 20, ancho: 52, cuelloY: 75, mejillasY: 0, lados: [32, 88], ladosY: 48 },
      mov: 'antena',
      pantalla: '#7dd3fc',
      dibujo: function (c, o, cl) {
        return '<g data-parte="extra" ' + ORIGEN('50% 100%') + '><path d="M80 26L88 12" stroke="#94a3b8" stroke-width="2.5" stroke-linecap="round"/>' + el('circle', { cx: 89, cy: 11, r: 3.5, fill: c }) + '</g>' +
          el('rect', { x: 36, y: 73, width: 48, height: 34, rx: 14, fill: '#f8fafc', stroke: '#cbd5e1', 'stroke-width': 1.5 }) +
          el('rect', { x: 50, y: 82, width: 20, height: 13, rx: 3, fill: c }) + el('circle', { cx: 55, cy: 88.5, r: 2, fill: '#fff' }) + el('rect', { x: 59, y: 86.5, width: 8, height: 4, rx: 2, fill: '#fff', opacity: 0.8 }) +
          el('circle', { cx: 60, cy: 47, r: 28, fill: '#f8fafc', stroke: '#cbd5e1', 'stroke-width': 2 }) +
          el('rect', { x: 39, y: 34, width: 42, height: 27, rx: 13.5, fill: '#0f172a' }) +
          '<path d="M44 40Q50 36 58 37" stroke="#fff" stroke-width="2.5" stroke-linecap="round" fill="none" opacity=".35"/>' +
          el('rect', { x: 34, y: 43, width: 5, height: 9, rx: 2, fill: c }) + el('rect', { x: 81, y: 43, width: 5, height: 9, rx: 2, fill: c });
      },
    },
    // Lobo urbano: pelaje gris, con hoodie del color elegido.
    lobo: {
      pies: { pos: [[48, 111], [72, 111]], rx: 9, ry: 3.5, color: '#334155', suela: '#e5e7eb' }, // zapatillas
      torso: [78, 54, 31],
      brazos: { hombros: [[39, 87], [81, 87]], largo: 15, grosor: 9, color: 'c', mano: '#9ca3af' },
      a: { cx: 60, ojos: [50, 70], ojosY: 47, bocaY: 63, cabezaY: 25, ancho: 44, cuelloY: 77, mejillasY: 0, lados: [33, 87], ladosY: 50 },
      mov: 'rotar',
      sinMejillas: true,
      dibujo: function (c, o, cl) {
        var pelo = '#9ca3af', claroPelo = '#e5e7eb', oscPelo = '#475569';
        return '<g data-parte="extra" ' + ORIGEN('0% 100%') + '><path d="M78 98C102 94 108 72 99 58C96 74 90 84 76 88Z" fill="' + pelo + '"/><path d="M99 58C103 64 103 70 100 75C97 70 97 64 99 58Z" fill="' + claroPelo + '"/></g>' +
          '<path d="M33 110C33 88 42 76 60 76C78 76 87 88 87 110Z" fill="' + c + '"/>' +
          el('rect', { x: 47, y: 94, width: 26, height: 11, rx: 5, fill: o }) +
          '<path d="M55 78L54 90M65 78L66 90" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>' + el('circle', { cx: 54, cy: 91, r: 1.6, fill: '#fff' }) + el('circle', { cx: 66, cy: 91, r: 1.6, fill: '#fff' }) +
          '<path d="M29 64C27 36 43 21 60 21C77 21 93 36 91 64C85 73 76 78 60 78C44 78 35 73 29 64Z" fill="' + o + '"/>' +
          '<path d="M38 38L34 10L53 29Z" fill="' + pelo + '"/><path d="M40 33L38 18L48 29Z" fill="' + oscPelo + '"/><path d="M82 38L86 10L67 29Z" fill="' + pelo + '"/><path d="M80 33L82 18L72 29Z" fill="' + oscPelo + '"/>' +
          el('ellipse', { cx: 60, cy: 50, rx: 25, ry: 23, fill: pelo }) +
          '<path d="M44 40L55 43M76 40L65 43" stroke="' + oscPelo + '" stroke-width="2.4" stroke-linecap="round"/>' +
          el('ellipse', { cx: 60, cy: 61, rx: 13, ry: 9, fill: claroPelo }) + el('ellipse', { cx: 60, cy: 55.5, rx: 4.2, ry: 3, fill: TINTA });
      },
    },
    // Robot Bit: robot clásico con cabeza de pantalla, antena y panel de luces.
    bit: {
      pies: { pos: [[48, 108], [72, 108]], rx: 8, ry: 4, forma: 'caja', color: '#475569' },
      torso: [76, 44, 28],
      brazos: { hombros: [[38, 82], [82, 82]], largo: 15, grosor: 7, color: '#94a3b8', mano: 'c' },
      a: { cx: 60, ojos: [50, 70], ojosY: 46, bocaY: 56, cabezaY: 22, ancho: 52, cuelloY: 73, mejillasY: 0, lados: [32, 88], ladosY: 46 },
      mov: 'antena',
      pantalla: '#67e8f9',
      dibujo: function (c, o) {
        return '<g data-parte="extra" ' + ORIGEN('50% 100%') + '><path d="M60 24V11" stroke="#94a3b8" stroke-width="3" stroke-linecap="round"/>' + el('circle', { cx: 60, cy: 9, r: 4, fill: c }) + el('circle', { cx: 58.6, cy: 7.6, r: 1.3, fill: '#fff', opacity: 0.8 }) + '</g>' +
          el('rect', { x: 54, y: 68, width: 12, height: 8, rx: 2, fill: '#94a3b8' }) +
          el('rect', { x: 37, y: 74, width: 46, height: 33, rx: 9, fill: c }) +
          el('rect', { x: 47, y: 81, width: 26, height: 15, rx: 4, fill: '#0f172a' }) +
          el('circle', { cx: 53, cy: 88.5, r: 2.4, fill: '#22c55e' }) + el('circle', { cx: 60, cy: 88.5, r: 2.4, fill: '#facc15' }) + el('circle', { cx: 67, cy: 88.5, r: 2.4, fill: '#ef4444' }) +
          el('rect', { x: 49, y: 99, width: 22, height: 3, rx: 1.5, fill: o }) +
          el('rect', { x: 28, y: 39, width: 6, height: 15, rx: 2.5, fill: c }) + el('rect', { x: 86, y: 39, width: 6, height: 15, rx: 2.5, fill: c }) +
          el('rect', { x: 32, y: 23, width: 56, height: 46, rx: 14, fill: '#f1f5f9', stroke: c, 'stroke-width': 3 }) +
          el('rect', { x: 38, y: 31, width: 44, height: 31, rx: 9, fill: '#0f172a' }) +
          '<path d="M42 35Q48 33 55 34" stroke="#fff" stroke-width="2" stroke-linecap="round" fill="none" opacity=".3"/>';
      },
    },
    // Robot Nexo: androide avanzado. Casco con visor, hombreras del color elegido,
    // núcleo de energía en el pecho y propulsores: flota en lugar de caminar.
    nexo: {
      torso: [74, 46, 28],
      brazos: { hombros: [[37, 80], [83, 80]], largo: 15, grosor: 6, color: '#cbd5e1', mano: 'c' },
      a: { cx: 60, ojos: [51, 69], ojosY: 45, bocaY: 54, cabezaY: 21, ancho: 48, cuelloY: 72, mejillasY: 0, lados: [33, 87], ladosY: 44 },
      mov: 'aletear', // los propulsores laten
      pantalla: '#22d3ee',
      dibujo: function (c, o, cl) {
        return '<g data-parte="extra" ' + ORIGEN('50% 0%') + '>' +
            '<path d="M49 103L54 119L59 103Z" fill="#38bdf8" opacity=".75"/><path d="M61 103L66 119L71 103Z" fill="#38bdf8" opacity=".75"/>' +
            '<path d="M51.5 103L54 112L56.5 103Z" fill="#e0f2fe"/><path d="M63.5 103L66 112L68.5 103Z" fill="#e0f2fe"/></g>' +
          '<path d="M45 97Q60 106 75 97L72 104H48Z" fill="#94a3b8"/>' +
          el('rect', { x: 55, y: 66, width: 10, height: 9, rx: 2, fill: '#94a3b8' }) +
          '<path d="M40 76Q60 69 80 76L77 98Q60 105 43 98Z" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5"/>' +
          '<path d="M46 95Q60 100 74 95M48 90Q60 94 72 90" stroke="#cbd5e1" stroke-width="1.4" fill="none"/>' +
          el('circle', { cx: 60, cy: 84, r: 6.5, fill: cl, stroke: c, 'stroke-width': 2.5 }) + el('circle', { cx: 60, cy: 84, r: 2.6, fill: '#fff' }) +
          el('ellipse', { cx: 38, cy: 79, rx: 8, ry: 6, fill: c }) + el('ellipse', { cx: 82, cy: 79, rx: 8, ry: 6, fill: c }) +
          '<path d="M78 25L85 15" stroke="#94a3b8" stroke-width="2" stroke-linecap="round"/>' + el('circle', { cx: 85.5, cy: 14, r: 2.6, fill: cl, stroke: c, 'stroke-width': 1.2 }) +
          el('rect', { x: 30.5, y: 37, width: 6, height: 15, rx: 3, fill: c }) + el('rect', { x: 83.5, y: 37, width: 6, height: 15, rx: 3, fill: c }) +
          '<path d="M36 45C36 28 46 19 60 19C74 19 84 28 84 45C84 60 74 70 60 70C46 70 36 60 36 45Z" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2"/>' +
          '<path d="M60 19V28" stroke="' + c + '" stroke-width="4" stroke-linecap="round"/>' +
          '<path d="M41 41C41 33 49 30 60 30C71 30 79 33 79 41L77 55C74 60 67 62 60 62C53 62 46 60 43 55Z" fill="#0f172a"/>' +
          '<path d="M45 36Q51 33 57 33.5" stroke="#fff" stroke-width="2" stroke-linecap="round" fill="none" opacity=".3"/>';
      },
    },
    // ---------- Para niños ----------    // ---------- Para niños ----------
    // Perrito: pelaje dorado, orejas caídas, mancha en un ojo, pañoleta del color
    // elegido con su plaquita y cola que se menea.
    perro: {
      pies: { pos: [[47, 108], [73, 108]], rx: 8, ry: 4, color: '#9a5b2e' },
      torso: [78, 46, 27],
      brazos: { hombros: [[39, 84], [81, 84]], largo: 13, grosor: 8, color: '#d9a066', mano: '#fff7ed' },
      a: { cx: 60, ojos: [49, 71], ojosY: 49, bocaY: 64, cabezaY: 28, ancho: 48, cuelloY: 76, mejillasY: 58, lados: [30, 90], ladosY: 51 },
      mov: 'rotar', // la cola se menea
      dibujo: function (c, o) {
        var pelo = '#d9a066', oscuro = '#9a5b2e', crema = '#fff7ed';
        return '<g data-parte="extra" ' + ORIGEN('0% 100%') + '><path d="M78 97C93 95 99 85 97 73" fill="none" stroke="' + pelo + '" stroke-width="7" stroke-linecap="round"/>' +
            el('circle', { cx: 97, cy: 72, r: 3.6, fill: crema }) + '</g>' +
          el('ellipse', { cx: 60, cy: 91, rx: 23, ry: 19, fill: pelo }) + el('ellipse', { cx: 60, cy: 95, rx: 13, ry: 11, fill: crema }) +
          // pañoleta y collar con plaquita
          '<path d="M43 76Q60 85 77 76L60 95Z" fill="' + c + '"/>' +
          '<path d="M43 76Q60 84 77 76" fill="none" stroke="' + o + '" stroke-width="3" stroke-linecap="round"/>' +
          el('circle', { cx: 60, cy: 84, r: 3, fill: '#facc15', stroke: '#ca8a04', 'stroke-width': 0.8 }) +
          // cabeza, mancha en el ojo, hocico y nariz
          el('ellipse', { cx: 60, cy: 50, rx: 26, ry: 23, fill: pelo }) +
          el('ellipse', { cx: 72, cy: 48, rx: 9, ry: 8.5, fill: '#b87942' }) +
          '<path d="M55 30Q60 25 65 30" fill="none" stroke="' + oscuro + '" stroke-width="2" stroke-linecap="round" opacity=".5"/>' +
          el('ellipse', { cx: 60, cy: 61, rx: 13, ry: 9, fill: crema }) +
          el('ellipse', { cx: 60, cy: 56, rx: 4.6, ry: 3.3, fill: '#1f2937' }) + el('ellipse', { cx: 58.6, cy: 55, rx: 1.4, ry: 0.9, fill: '#fff', opacity: 0.8 }) +
          // orejas caídas (encima del borde de la cabeza)
          '<path d="M38 32C27 34 21 51 27 63C33 62 38 52 41 41Z" fill="' + oscuro + '"/>' +
          '<path d="M82 32C93 34 99 51 93 63C87 62 82 52 79 41Z" fill="' + oscuro + '"/>';
      },
    },
    ajolote: {
      pies: { pos: [[44, 106], [76, 106]], rx: 6, ry: 4, color: 'o' },
      torso: [80, 46, 21],
      brazos: { hombros: [[40, 86], [80, 86]], largo: 11, grosor: 6, color: 'c', mano: 'o' },
      a: { cx: 60, ojos: [46, 74], ojosY: 52, bocaY: 63, cabezaY: 33, ancho: 46, cuelloY: 77, mejillasY: 60, lados: [29, 91], ladosY: 56 },
      mov: 'ondear',
      dibujo: function (c, o, cl) {
        var b = function (d) {
          return '<path d="' + d + '" fill="none" stroke="' + mezclar(c, '#be185d', 0.45) + '" stroke-width="5" stroke-linecap="round"/>';
        };
        return '<g data-parte="extra" ' + ORIGEN('50% 50%') + '>' + b('M32 46L16 34') + b('M30 54L13 50') + b('M32 62L17 68') + b('M88 46L104 34') + b('M90 54L107 50') + b('M88 62L103 68') + '</g>' +
          '<path d="M80 96C100 98 108 88 110 78C100 84 92 88 82 88Z" fill="' + c + '"/>' +
          el('ellipse', { cx: 60, cy: 90, rx: 24, ry: 18, fill: c }) + el('ellipse', { cx: 60, cy: 94, rx: 13, ry: 10, fill: cl }) +
          el('ellipse', { cx: 60, cy: 56, rx: 32, ry: 24, fill: c });
      },
    },
  };

  // Movimiento en reposo de la parte "extra" (Web Animations).
  var MOVIMIENTOS = {
    rotar: [{ transform: 'rotate(-7deg)' }, { transform: 'rotate(7deg)' }],
    antena: [{ transform: 'rotate(-14deg)' }, { transform: 'rotate(14deg)' }],
    aletear: [{ transform: 'scaleY(1)' }, { transform: 'scaleY(0.78)' }],
    ondear: [{ transform: 'rotate(-3deg) scale(1)' }, { transform: 'rotate(3deg) scale(1.04)' }],
    erizar: [{ transform: 'scaleY(1)' }, { transform: 'scaleY(1.18)' }],
    orbitar: [{ transform: 'rotate(-10deg)' }, { transform: 'rotate(10deg)' }],
  };

  // ---------- Atuendos (los pone mascota.js según lo que pasa) ----------
  var ACC = {
    audifonos: function (a) {
      var x1 = a.lados[0], x2 = a.lados[1], y = a.ladosY;
      return '<path d="M' + (x1 + 2) + ' ' + y + 'Q' + (x1 + 2) + ' ' + (a.cabezaY - 12) + ' ' + a.cx + ' ' + (a.cabezaY - 12) + 'Q' + (x2 - 2) + ' ' + (a.cabezaY - 12) + ' ' + (x2 - 2) + ' ' + y + '" fill="none" stroke="#334155" stroke-width="4"/>' +
        el('rect', { x: x1 - 5, y: y - 8, width: 10, height: 16, rx: 4, fill: '#0ea5e9' }) + el('rect', { x: x2 - 5, y: y - 8, width: 10, height: 16, rx: 4, fill: '#0ea5e9' });
    },
    // Marco de color (ámbar) para que se vea también sobre las caras-pantalla oscuras de los robots.
    lentes: function (a) {
      var e1 = a.ojos[0], e2 = a.ojos[1], y = a.ojosY;
      return '<g fill="rgba(255,255,255,.22)" stroke="#f59e0b" stroke-width="2.6">' + el('circle', { cx: e1, cy: y, r: 8.5 }) + el('circle', { cx: e2, cy: y, r: 8.5 }) + '<path d="M' + (e1 + 8.5) + ' ' + y + 'Q' + a.cx + ' ' + (y - 4) + ' ' + (e2 - 8.5) + ' ' + y + '" fill="none"/></g>';
    },
    gafasSol: function (a) {
      var e1 = a.ojos[0], e2 = a.ojos[1], y = a.ojosY;
      return '<g fill="#1e293b" stroke="#f472b6" stroke-width="1.8">' + el('rect', { x: e1 - 9, y: y - 6, width: 18, height: 12, rx: 5 }) + el('rect', { x: e2 - 9, y: y - 6, width: 18, height: 12, rx: 5 }) + '</g>' +
        '<path d="M' + (e1 + 9) + ' ' + (y - 2) + 'H' + (e2 - 9) + '" stroke="#f472b6" stroke-width="2.2"/><path d="M' + (e1 - 5) + ' ' + (y - 3) + 'l4 -2M' + (e2 - 5) + ' ' + (y - 3) + 'l4 -2" stroke="#fff" stroke-width="1.6" opacity=".8"/>';
    },
    bufanda: function (a) {
      var x = a.cx, y = a.cuelloY;
      return '<path d="M' + (x - 25) + ' ' + (y - 4) + 'Q' + x + ' ' + (y + 6) + ' ' + (x + 25) + ' ' + (y - 4) + 'L' + (x + 25) + ' ' + (y + 4) + 'Q' + x + ' ' + (y + 14) + ' ' + (x - 25) + ' ' + (y + 4) + 'Z" fill="#dc2626"/>' +
        '<path d="M' + (x + 9) + ' ' + (y + 7) + 'l4 17 8-2-3-17Z" fill="#b91c1c"/>';
    },
  };

  function cara(a, pantalla, sinMejillas) {
    var o = pantalla || TINTA, e1 = a.ojos[0], e2 = a.ojos[1], y = a.ojosY, b = a.bocaY, x = a.cx;
    var mej = pantalla || sinMejillas ? '' : el('circle', { cx: e1 - 7, cy: a.mejillasY, r: 4, fill: '#fb7185', opacity: 0.45 }) + el('circle', { cx: e2 + 7, cy: a.mejillasY, r: 4, fill: '#fb7185', opacity: 0.45 });
    return mej +
      '<g data-parte="ojos" ' + ORIGEN('50% 50%') + '>' + el('circle', { cx: e1, cy: y, r: 5, fill: o }) + el('circle', { cx: e2, cy: y, r: 5, fill: o }) + el('circle', { cx: e1 + 1.6, cy: y - 1.8, r: 1.7, fill: '#fff' }) + el('circle', { cx: e2 + 1.6, cy: y - 1.8, r: 1.7, fill: '#fff' }) + '</g>' +
      '<g data-parte="ojos-cerrados" style="display:none" fill="none" stroke="' + o + '" stroke-width="2.6" stroke-linecap="round"><path d="M' + (e1 - 5) + ' ' + y + 'Q' + e1 + ' ' + (y + 4) + ' ' + (e1 + 5) + ' ' + y + 'M' + (e2 - 5) + ' ' + y + 'Q' + e2 + ' ' + (y + 4) + ' ' + (e2 + 5) + ' ' + y + '"/></g>' +
      '<path data-parte="boca-feliz" d="M' + (x - 6) + ' ' + b + 'Q' + x + ' ' + (b + 6) + ' ' + (x + 6) + ' ' + b + '" fill="none" stroke="' + o + '" stroke-width="2.4" stroke-linecap="round"/>' +
      '<ellipse data-parte="boca-o" style="display:none" cx="' + x + '" cy="' + (b + 2) + '" rx="3.2" ry="3.8" fill="' + (pantalla || '#9f1239') + '"/>' +
      '<g data-parte="zzz" style="display:none" font-family="system-ui,sans-serif" font-weight="800" fill="#6366f1"><text x="92" y="30" font-size="14">Z</text><text x="104" y="18" font-size="10">z</text></g>';
  }

  // Brazos: dos grupos data-parte="brazo-izq" / "brazo-der" que giran desde el
  // hombro (mascota.js los anima: saludar, levantar, aplaudir, bailar…).
  function brazos(p, c, o, cl, manga) {
    var giro = function (x, y) { return 'style="transform-box:view-box;transform-origin:' + x + 'px ' + y + 'px"'; };
    if (p.brazosSvg) {
      var f = p.brazosSvg(c, o, cl);
      return '<g data-parte="brazo-izq" ' + giro(f.origenes[0][0], f.origenes[0][1]) + '>' + f.izq + '</g>' +
        '<g data-parte="brazo-der" ' + giro(f.origenes[1][0], f.origenes[1][1]) + '>' + f.der + '</g>';
    }
    var b = p.brazos;
    if (!b) return '';
    var tono = function (v) { return v === 'c' ? c : v === 'o' ? o : v === 'cl' ? cl : v; };
    var uno = function (lado, h) {
      var dx = lado === 'izq' ? -5 : 5;
      var x2 = h[0] + dx, y2 = h[1] + b.largo;
      return '<g data-parte="brazo-' + lado + '" ' + giro(h[0], h[1]) + '><path d="M' + h[0] + ' ' + h[1] + 'L' + x2 + ' ' + y2 + '" stroke="' + (manga || tono(b.color)) + '" stroke-width="' + b.grosor + '" stroke-linecap="round"/>' +
        el('circle', { cx: x2, cy: y2, r: b.grosor * 0.6, fill: tono(b.mano) }) + '</g>';
    };
    return uno('izq', b.hombros[0]) + uno('der', b.hombros[1]);
  }

  // Pies: dos grupos data-parte="pie-izq" / "pie-der" (mascota.js los mueve:
  // zapatean un poco en reposo y más al bailar o saludar).
  function pies(p, o) {
    var d = p.pies;
    if (!d) return '';
    var tono = d.color === 'o' ? o : d.color;
    return d.pos.map(function (q, i) {
      var x = q[0], y = q[1], forma;
      if (d.forma === 'caja') forma = el('rect', { x: x - d.rx, y: y - d.ry, width: d.rx * 2, height: d.ry * 2, rx: 3, fill: tono });
      else if (d.forma === 'garra') forma = '<path d="M' + x + ' ' + (y - 4) + 'V' + (y + 2) + 'M' + (x - 2.5) + ' ' + (y + 3) + 'L' + x + ' ' + (y + 1) + 'L' + (x + 2.5) + ' ' + (y + 3) + '" stroke="' + tono + '" stroke-width="2.2" stroke-linecap="round" fill="none"/>';
      else forma = el('ellipse', { cx: x, cy: y, rx: d.rx, ry: d.ry, fill: tono }) + (d.suela ? '<path d="M' + (x - d.rx + 1) + ' ' + (y + 1.5) + 'H' + (x + d.rx - 1) + '" stroke="' + d.suela + '" stroke-width="2" stroke-linecap="round"/>' : '');
      return '<g data-parte="pie-' + (i ? 'der' : 'izq') + '" style="transform-box:view-box;transform-origin:' + x + 'px ' + (y + 3) + 'px">' + forma + '</g>';
    }).join('');
  }

  // Atuendo puesto (audífonos, lentes, gafas, bufanda): SVG para el grupo data-parte="atuendo".
  function atuendo(tipo, ids) {
    var a = (P[tipo] || P.astronauta).a;
    return (ids || []).filter(function (id) { return ACC[id]; }).map(function (id) { return ACC[id](a); }).join('');
  }
  // <svg> completo. ids: atuendo puesto (opcional).
  function dibujar(tipo, hex, ids, titulo) {
    var p = P[tipo] || P.astronauta;
    var a = p.a;
    var oscuro = mezclar(hex, '#000000', 0.28);
    return '<svg viewBox="0 0 120 120" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" ' + (titulo ? 'role="img" aria-label="' + titulo + '"' : 'aria-hidden="true"') + ' style="overflow:visible">' +
      el('ellipse', { cx: 60, cy: 113, rx: 30, ry: 4, fill: '#000', opacity: 0.12 }) +
      '<g data-parte="cuerpo" ' + ORIGEN('50% 100%') + '>' +
      p.dibujo(hex, oscuro, mezclar(hex, '#ffffff', 0.72)) +
      pies(p, oscuro) +
      brazos(p, hex, oscuro, mezclar(hex, '#ffffff', 0.72), null) +
      cara(a, p.pantalla, p.sinMejillas) +
      '<g data-parte="atuendo">' + atuendo(tipo, ids) + '</g>' +
      '</g></svg>';
  }

  window.MascotaPersonajes = {
    dibujar: dibujar,
    atuendo: atuendo,
    tipos: Object.keys(P),
    movimiento: function (tipo) { return MOVIMIENTOS[(P[tipo] || P.astronauta).mov]; },
    // Puntos de anclaje (ojos, cabeza, cuello…): sirven para enfocar una zona.
    anclas: function (tipo) { return (P[tipo] || P.astronauta).a; },
    // Cuánto giran los brazos (1 = normal; alas y aletas, menos).
    giroBrazos: function (tipo) { return (P[tipo] || {}).giroBrazos || 1; },
  };
})();
