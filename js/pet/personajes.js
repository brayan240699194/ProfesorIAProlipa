/* =========================================================================
   MASCOTA VIRTUAL — personajes y accesorios en SVG (js/pet/personajes.js)
   -------------------------------------------------------------------------
   10 personajes ORIGINALES: 5 para jóvenes de bachillerato y 5 para niños (sin parecido a personajes con derechos de
   autor), todos en el mismo lienzo 0 0 120 120 y con las mismas partes
   (data-parte), para que mascota.js los anime sin saber cuál es:
     cuerpo · extra (cola, alas, orejas…) · ojos · ojos-cerrados ·
     boca-feliz · boca-o · zzz
   Cada personaje define "anclas" (dónde están los ojos, la cabeza, el
   cuello…) y así los accesorios le quedan bien a todos.
   Accesorios: varios a la vez, uno por zona (cabeza, orejas, cara, cuello,
   cuerpo). La lista con nombres y zonas está en config.js.
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
    // Nova: orbe de IA que flota, con anillo orbital y pantalla.
    nova: {
      torso: [62, 58, 28],
      brazos: { hombros: [[31, 63], [89, 63]], largo: 7, grosor: 5, color: 'cl', mano: 'cl' },
      a: { cx: 60, ojos: [51, 69], ojosY: 55, bocaY: 63, cabezaY: 28, ancho: 48, cuelloY: 86, mejillasY: 0, lados: [30, 90], ladosY: 57 },
      mov: 'orbitar',
      pantalla: '#a5f3fc',
      dibujo: function (c, o, cl) {
        return '<path d="M54 90L60 100L66 90Z" fill="#7dd3fc" opacity=".7"/>' +
          el('circle', { cx: 60, cy: 57, r: 30, fill: c }) +
          '<path d="M40 40Q50 30 64 30" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none" opacity=".35"/>' +
          el('rect', { x: 39, y: 45, width: 42, height: 26, rx: 13, fill: '#0f172a' }) +
          el('circle', { cx: 60, cy: 83, r: 3, fill: cl }) +
          '<g data-parte="extra" ' + ORIGEN('50% 50%') + '><ellipse cx="60" cy="60" rx="44" ry="10" fill="none" stroke="' + cl + '" stroke-width="2.5" opacity=".85" transform="rotate(-12 60 60)"/>' + el('circle', { cx: 101, cy: 51, r: 3, fill: '#fde047' }) + '</g>';
      },
    },
    // Fénix: ave de fuego con cresta y alas en llamas (el color es el plumaje).
    fenix: {
      pies: { pos: [[54, 106], [66, 106]], forma: 'garra', color: '#f59e0b' },
      torso: [70, 40, 27],
      giroBrazos: 0.25, // las alas se abren poco (si giran mucho tapan el cuerpo)
      brazosSvg: function (c, o) {
        return {
          origenes: [[42, 62], [78, 62]],
          izq: '<path d="M41 72C22 66 11 52 13 38C21 49 29 55 42 59Z" fill="' + o + '"/><path d="M30 60C22 56 18 50 18 44C24 50 30 53 36 55Z" fill="#f59e0b"/>',
          der: '<path d="M79 72C98 66 109 52 107 38C99 49 91 55 78 59Z" fill="' + o + '"/><path d="M90 60C98 56 102 50 102 44C96 50 90 53 84 55Z" fill="#f59e0b"/>',
        };
      },
      a: { cx: 60, ojos: [52, 68], ojosY: 50, bocaY: 67, cabezaY: 29, ancho: 40, cuelloY: 76, mejillasY: 0, lados: [37, 83], ladosY: 52 },
      mov: 'erizar',
      sinMejillas: true,
      dibujo: function (c, o, cl) {
        var fuego = '#f59e0b', brasa = '#fde047';
        return '<path d="M52 98C46 108 40 112 33 113C41 107 45 101 47 95Z" fill="' + fuego + '"/><path d="M68 98C74 108 80 112 87 113C79 107 75 101 73 95Z" fill="' + fuego + '"/><path d="M56 100C56 108 60 114 60 118C62 112 66 106 64 100Z" fill="' + brasa + '"/>' +
          el('ellipse', { cx: 60, cy: 85, rx: 20, ry: 19, fill: c }) + el('ellipse', { cx: 60, cy: 89, rx: 12, ry: 12, fill: cl }) +
          '<g data-parte="extra" ' + ORIGEN('50% 100%') + '><path d="M50 33C45 22 50 13 55 7C55 17 59 22 57 33Z" fill="' + fuego + '"/><path d="M58 31C58 17 66 10 71 6C69 16 69 23 65 33Z" fill="' + brasa + '"/><path d="M45 36C39 29 40 21 44 16C46 24 50 28 51 34Z" fill="' + fuego + '"/></g>' +
          el('circle', { cx: 60, cy: 51, r: 22, fill: c }) + el('ellipse', { cx: 60, cy: 53, rx: 15, ry: 12, fill: cl }) +
          '<path d="M55 58H65L60 65Z" fill="' + fuego + '"/>';
      },
    },
    // Mapache urbano: antifaz, cola a rayas y hoodie del color elegido.
    mapache: {
      pies: { pos: [[48, 111], [72, 111]], rx: 9, ry: 3.5, color: '#f8fafc', suela: '#334155' }, // zapatillas
      torso: [78, 54, 31],
      brazos: { hombros: [[38, 87], [82, 87]], largo: 15, grosor: 9, color: 'c', mano: '#6b7280' },
      a: { cx: 60, ojos: [50, 70], ojosY: 49, bocaY: 64, cabezaY: 27, ancho: 44, cuelloY: 77, mejillasY: 0, lados: [34, 86], ladosY: 52 },
      mov: 'rotar',
      sinMejillas: true,
      dibujo: function (c, o, cl) {
        var pelo = '#9ca3af', claro = '#f1f5f9', antifaz = '#1f2937', anillo = '#374151';
        return '<g data-parte="extra" ' + ORIGEN('0% 100%') + '><path d="M80 100C102 100 110 82 102 64" fill="none" stroke="' + pelo + '" stroke-width="11" stroke-linecap="round"/>' +
          '<path d="M96 93L104 87M102 82L109 79M104 71L111 70" stroke="' + anillo + '" stroke-width="5" stroke-linecap="round"/></g>' +
          '<path d="M34 110C34 88 43 77 60 77C77 77 86 88 86 110Z" fill="' + c + '"/>' +
          el('rect', { x: 47, y: 94, width: 26, height: 11, rx: 5, fill: o }) +
          '<path d="M55 79L54 90M65 79L66 90" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>' + el('circle', { cx: 54, cy: 91, r: 1.6, fill: '#fff' }) + el('circle', { cx: 66, cy: 91, r: 1.6, fill: '#fff' }) +
          el('ellipse', { cx: 40, cy: 31, rx: 8, ry: 9, fill: pelo }) + el('ellipse', { cx: 40, cy: 32, rx: 4, ry: 5, fill: antifaz }) +
          el('ellipse', { cx: 80, cy: 31, rx: 8, ry: 9, fill: pelo }) + el('ellipse', { cx: 80, cy: 32, rx: 4, ry: 5, fill: antifaz }) +
          '<path d="M33 54C33 38 45 28 60 28C75 28 87 38 87 54C87 68 76 76 60 76C44 76 33 68 33 54Z" fill="' + pelo + '"/>' +
          '<path d="M36 50C40 42 48 42 55 47Q60 50 65 47C72 42 80 42 84 50C82 56 76 58 70 56Q60 54 50 56C44 58 38 56 36 50Z" fill="' + antifaz + '"/>' +
          el('circle', { cx: 50, cy: 49, r: 5.2, fill: claro }) + el('circle', { cx: 70, cy: 49, r: 5.2, fill: claro }) +
          '<path d="M43 40Q50 37 56 41M77 40Q70 37 64 41" stroke="' + claro + '" stroke-width="2.4" stroke-linecap="round" fill="none"/>' +
          el('ellipse', { cx: 60, cy: 64, rx: 12, ry: 8, fill: claro }) + el('ellipse', { cx: 60, cy: 58.5, rx: 3.8, ry: 2.8, fill: antifaz });
      },
    },
    // ---------- Para niños ----------
    zorro: {
      pies: { pos: [[46, 108], [70, 108]], rx: 7, ry: 4, color: 'o' },
      torso: [77, 50, 27],
      brazos: { hombros: [[37, 82], [79, 82]], largo: 13, grosor: 8, color: 'c', mano: 'o' },
      a: { cx: 58, ojos: [46, 70], ojosY: 50, bocaY: 66, cabezaY: 30, ancho: 42, cuelloY: 77, mejillasY: 60, lados: [28, 88], ladosY: 54 },
      mov: 'rotar',
      dibujo: function (c, o) {
        return '<g data-parte="extra" ' + ORIGEN('0% 90%') + '><path d="M76 90C100 88 112 66 101 46C97 64 88 74 72 79Z" fill="' + c + '"/><path d="M101 46C106 55 106 62 102 68C98 62 97 54 101 46Z" fill="#fff"/></g>' +
          el('ellipse', { cx: 58, cy: 89, rx: 26, ry: 21, fill: c }) + el('ellipse', { cx: 58, cy: 95, rx: 15, ry: 12, fill: '#fff7ed' }) +
          '<path d="M35 42L30 12L54 32Z" fill="' + c + '"/><path d="M38 36L35 21L47 32Z" fill="' + o + '"/><path d="M81 42L86 12L62 32Z" fill="' + c + '"/><path d="M78 36L81 21L69 32Z" fill="' + o + '"/>' +
          el('ellipse', { cx: 58, cy: 54, rx: 30, ry: 25, fill: c }) + el('ellipse', { cx: 58, cy: 64, rx: 17, ry: 11, fill: '#fff' }) + el('ellipse', { cx: 58, cy: 59, rx: 4.2, ry: 3.2, fill: TINTA });
      },
    },
    gato: {
      pies: { pos: [[48, 108], [72, 108]], rx: 7, ry: 4, color: 'o' },
      torso: [78, 46, 27],
      brazos: { hombros: [[39, 83], [81, 83]], largo: 13, grosor: 7, color: 'c', mano: 'cl' },
      a: { cx: 60, ojos: [48, 72], ojosY: 51, bocaY: 65, cabezaY: 31, ancho: 44, cuelloY: 76, mejillasY: 60, lados: [31, 89], ladosY: 54 },
      mov: 'rotar',
      dibujo: function (c, o, cl) {
        return '<g data-parte="extra" ' + ORIGEN('0% 100%') + '><path d="M80 98C104 98 108 74 96 62" fill="none" stroke="' + c + '" stroke-width="8" stroke-linecap="round"/></g>' +
          el('ellipse', { cx: 60, cy: 90, rx: 24, ry: 20, fill: c }) + el('ellipse', { cx: 60, cy: 95, rx: 13, ry: 11, fill: cl }) +
          '<path d="M36 42L38 14L56 32Z" fill="' + c + '"/><path d="M40 36L41 22L51 32Z" fill="#fda4af"/><path d="M84 42L82 14L64 32Z" fill="' + c + '"/><path d="M80 36L79 22L69 32Z" fill="#fda4af"/>' +
          el('ellipse', { cx: 60, cy: 54, rx: 29, ry: 24, fill: c }) +
          '<path d="M56 58h8l-4 4.5Z" fill="#f472b6"/><path d="M43 61L29 58M43 65L29 67M77 61L91 58M77 65L91 67" stroke="' + o + '" stroke-width="1.4" stroke-linecap="round"/>';
      },
    },
    dragon: {
      pies: { pos: [[48, 108], [72, 108]], rx: 7, ry: 4, color: 'o' },
      torso: [78, 46, 27],
      brazos: { hombros: [[39, 83], [81, 83]], largo: 12, grosor: 7, color: 'c', mano: 'o' },
      a: { cx: 60, ojos: [48, 72], ojosY: 50, bocaY: 68, cabezaY: 32, ancho: 42, cuelloY: 77, mejillasY: 60, lados: [32, 88], ladosY: 53 },
      mov: 'aletear',
      dibujo: function (c, o, cl) {
        return '<g data-parte="extra" ' + ORIGEN('50% 60%') + '><path d="M38 80C19 69 14 54 22 46C26 58 32 63 42 67Z" fill="' + o + '"/><path d="M82 80C101 69 106 54 98 46C94 58 88 63 78 67Z" fill="' + o + '"/></g>' +
          '<path d="M78 97C96 101 104 91 107 80C99 86 91 88 80 88Z" fill="' + c + '"/><path d="M107 80L112 74L109 86Z" fill="' + o + '"/>' +
          el('ellipse', { cx: 60, cy: 89, rx: 24, ry: 21, fill: c }) + el('ellipse', { cx: 60, cy: 93, rx: 14, ry: 13, fill: cl }) +
          '<path d="M50 88H70M49 94H71M51 100H69" stroke="' + mezclar(cl, '#000000', 0.12) + '" stroke-width="1.5"/>' +
          '<path d="M45 35L40 17L53 30Z" fill="#fde68a"/><path d="M75 35L80 17L67 30Z" fill="#fde68a"/>' +
          el('ellipse', { cx: 60, cy: 53, rx: 28, ry: 24, fill: c }) + el('ellipse', { cx: 60, cy: 65, rx: 14, ry: 9, fill: cl }) +
          el('circle', { cx: 55.5, cy: 62.5, r: 1.5, fill: o }) + el('circle', { cx: 64.5, cy: 62.5, r: 1.5, fill: o });
      },
    },
    pinguino: {
      pies: { pos: [[50, 110], [70, 110]], rx: 8, ry: 4, color: '#f59e0b' },
      torso: [72, 52, 30],
      giroBrazos: 0.5,
      brazosSvg: function (c, o) {
        return {
          origenes: [[35, 72], [85, 72]],
          izq: '<path d="M32 70C22 80 22 92 28 96C32 88 34 80 37 74Z" fill="' + o + '"/>',
          der: '<path d="M88 70C98 80 98 92 92 96C88 88 86 80 83 74Z" fill="' + o + '"/>',
        };
      },
      a: { cx: 60, ojos: [51, 69], ojosY: 51, bocaY: 67, cabezaY: 38, ancho: 40, cuelloY: 73, mejillasY: 60, lados: [31, 89], ladosY: 54 },
      mov: 'rotar',
      dibujo: function (c, o) {
        return el('ellipse', { cx: 60, cy: 74, rx: 30, ry: 37, fill: c }) + el('ellipse', { cx: 60, cy: 84, rx: 20, ry: 25, fill: '#fff' }) + el('ellipse', { cx: 60, cy: 55, rx: 19, ry: 15, fill: '#fff' }) +
          '<path d="M55 59h10l-5 6Z" fill="#f59e0b"/>';
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

  // ---------- Accesorios (uno por zona) ----------
  // Todos se dibujan encima del cuerpo (la chompa, antes de los brazos).
  var ACC = {
    gorra: function (a) {
      var x = a.cx, y = a.cabezaY, w = a.ancho;
      return '<path d="M' + (x - w / 2) + ' ' + (y + 7) + 'Q' + x + ' ' + (y - 16) + ' ' + (x + w / 2) + ' ' + (y + 7) + 'Z" fill="#2563eb"/><path d="M' + (x - 2) + ' ' + (y + 5) + 'Q' + (x + w * 0.45) + ' ' + (y + 1) + ' ' + (x + w * 0.62) + ' ' + (y + 8) + 'L' + (x - 2) + ' ' + (y + 9) + 'Z" fill="#1e3a8a"/>' + el('circle', { cx: x, cy: y - 5, r: 2.4, fill: '#1e3a8a' });
    },
    birrete: function (a) {
      var x = a.cx, y = a.cabezaY, w = a.ancho;
      return el('rect', { x: x - w * 0.32, y: y - 2, width: w * 0.64, height: 9, rx: 2, fill: '#1f2937' }) +
        '<path d="M' + (x - w * 0.62) + ' ' + (y - 2) + 'L' + x + ' ' + (y - 13) + 'L' + (x + w * 0.62) + ' ' + (y - 2) + 'L' + x + ' ' + (y + 8) + 'Z" fill="#111827"/>' +
        '<path d="M' + x + ' ' + (y - 3) + 'L' + (x + w * 0.5) + ' ' + (y + 1) + 'V' + (y + 13) + '" stroke="#facc15" stroke-width="1.6" fill="none"/>' + el('circle', { cx: x + w * 0.5, cy: y + 14, r: 2.4, fill: '#facc15' });
    },
    corona: function (a) {
      var x = a.cx, y = a.cabezaY;
      return '<path d="M' + (x - 14) + ' ' + (y + 4) + 'L' + (x - 16) + ' ' + (y - 12) + 'L' + (x - 7) + ' ' + (y - 4) + 'L' + x + ' ' + (y - 15) + 'L' + (x + 7) + ' ' + (y - 4) + 'L' + (x + 16) + ' ' + (y - 12) + 'L' + (x + 14) + ' ' + (y + 4) + 'Z" fill="#facc15" stroke="#ca8a04" stroke-width="1.2"/>' + el('circle', { cx: x, cy: y - 3, r: 2.2, fill: '#ef4444' });
    },
    gorroFiesta: function (a) {
      var x = a.cx + a.ancho * 0.12, y = a.cabezaY + 4;
      return '<path d="M' + (x - 11) + ' ' + y + 'L' + x + ' ' + (y - 27) + 'L' + (x + 11) + ' ' + y + 'Z" fill="#a855f7"/><path d="M' + (x - 7) + ' ' + (y - 9) + 'L' + (x + 7) + ' ' + (y - 9) + 'M' + (x - 4) + ' ' + (y - 17) + 'L' + (x + 4) + ' ' + (y - 17) + '" stroke="#fde047" stroke-width="2.5"/>' + el('circle', { cx: x, cy: y - 28, r: 3.4, fill: '#f472b6' });
    },
    mono: function (a) {
      var x = a.cx + a.ancho * 0.32, y = a.cabezaY + 3;
      return '<path d="M' + x + ' ' + y + 'L' + (x - 11) + ' ' + (y - 8) + 'V' + (y + 8) + 'ZM' + x + ' ' + y + 'L' + (x + 11) + ' ' + (y - 8) + 'V' + (y + 8) + 'Z" fill="#db2777"/>' + el('circle', { cx: x, cy: y, r: 3.6, fill: '#9d174d' });
    },
    audifonos: function (a) {
      var x1 = a.lados[0], x2 = a.lados[1], y = a.ladosY;
      return '<path d="M' + (x1 + 2) + ' ' + y + 'Q' + (x1 + 2) + ' ' + (a.cabezaY - 12) + ' ' + a.cx + ' ' + (a.cabezaY - 12) + 'Q' + (x2 - 2) + ' ' + (a.cabezaY - 12) + ' ' + (x2 - 2) + ' ' + y + '" fill="none" stroke="#334155" stroke-width="4"/>' +
        el('rect', { x: x1 - 5, y: y - 8, width: 10, height: 16, rx: 4, fill: '#0ea5e9' }) + el('rect', { x: x2 - 5, y: y - 8, width: 10, height: 16, rx: 4, fill: '#0ea5e9' });
    },
    lentes: function (a) {
      var e1 = a.ojos[0], e2 = a.ojos[1], y = a.ojosY;
      return '<g fill="rgba(255,255,255,.18)" stroke="#111827" stroke-width="2.4">' + el('circle', { cx: e1, cy: y, r: 8.5 }) + el('circle', { cx: e2, cy: y, r: 8.5 }) + '<path d="M' + (e1 + 8.5) + ' ' + y + 'Q' + a.cx + ' ' + (y - 4) + ' ' + (e2 - 8.5) + ' ' + y + '" fill="none"/></g>';
    },
    gafasSol: function (a) {
      var e1 = a.ojos[0], e2 = a.ojos[1], y = a.ojosY;
      return '<g fill="#111827">' + el('rect', { x: e1 - 9, y: y - 6, width: 18, height: 12, rx: 5 }) + el('rect', { x: e2 - 9, y: y - 6, width: 18, height: 12, rx: 5 }) + '</g>' +
        '<path d="M' + (e1 + 9) + ' ' + (y - 2) + 'H' + (e2 - 9) + '" stroke="#111827" stroke-width="2.4"/><path d="M' + (e1 - 5) + ' ' + (y - 3) + 'l4 -2" stroke="#fff" stroke-width="1.6" opacity=".7"/>';
    },
    bufanda: function (a) {
      var x = a.cx, y = a.cuelloY;
      return '<path d="M' + (x - 25) + ' ' + (y - 4) + 'Q' + x + ' ' + (y + 6) + ' ' + (x + 25) + ' ' + (y - 4) + 'L' + (x + 25) + ' ' + (y + 4) + 'Q' + x + ' ' + (y + 14) + ' ' + (x - 25) + ' ' + (y + 4) + 'Z" fill="#dc2626"/>' +
        '<path d="M' + (x + 9) + ' ' + (y + 7) + 'l4 17 8-2-3-17Z" fill="#b91c1c"/>';
    },
    corbatin: function (a) {
      var x = a.cx, y = a.cuelloY + 1;
      return '<path d="M' + x + ' ' + y + 'L' + (x - 10) + ' ' + (y - 6) + 'V' + (y + 6) + 'ZM' + x + ' ' + y + 'L' + (x + 10) + ' ' + (y - 6) + 'V' + (y + 6) + 'Z" fill="#0f172a"/>' + el('rect', { x: x - 2.5, y: y - 3, width: 5, height: 6, rx: 1.5, fill: '#334155' });
    },
    medalla: function (a) {
      var x = a.cx, y = a.cuelloY;
      return '<path d="M' + (x - 9) + ' ' + (y - 3) + 'L' + x + ' ' + (y + 11) + 'L' + (x + 9) + ' ' + (y - 3) + '" fill="none" stroke="#2563eb" stroke-width="4"/>' + el('circle', { cx: x, cy: y + 15, r: 6.5, fill: '#facc15', stroke: '#ca8a04', 'stroke-width': 1.2 }) +
        '<path d="M' + x + ' ' + (y + 11) + 'l1.3 2.7 3 .4-2.2 2 .5 3-2.6-1.4-2.6 1.4.5-3-2.2-2 3-.4Z" fill="#fff"/>';
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

  // Ajustes que dependen del estudiante (los pone mascota.js): inicial del
  // colegio y color de la chompa.
  var AJUSTES = { inicial: '', chompa: '#1e3a8a' };

  // Chompa del colegio con la inicial en el pecho (se dibuja antes de los brazos:
  // así las mangas quedan encima, del mismo color).
  function chompa(p, color) {
    var a = p.a, t = p.torso || [a.cuelloY, 48, 28];
    var cx = a.cx, y = t[0], w = t[1] / 2, h = t[2];
    var borde = mezclar(color, '#000000', 0.3);
    return '<g data-parte="chompa"><path d="M' + (cx - w) + ' ' + (y + 4) + 'Q' + cx + ' ' + (y + 11) + ' ' + (cx + w) + ' ' + (y + 4) + 'L' + (cx + w + 2) + ' ' + (y + h - 4) + 'Q' + cx + ' ' + (y + h + 3) + ' ' + (cx - w - 2) + ' ' + (y + h - 4) + 'Z" fill="' + color + '"/>' +
      '<path d="M' + (cx - w + 4) + ' ' + (y + 4) + 'Q' + cx + ' ' + (y + 12) + ' ' + (cx + w - 4) + ' ' + (y + 4) + '" fill="none" stroke="' + borde + '" stroke-width="3" stroke-linecap="round"/>' +
      '<path d="M' + (cx - w) + ' ' + (y + h - 3) + 'Q' + cx + ' ' + (y + h + 4) + ' ' + (cx + w) + ' ' + (y + h - 3) + '" fill="none" stroke="' + borde + '" stroke-width="2.5"/>' +
      (AJUSTES.inicial ? '<text x="' + cx + '" y="' + (y + h * 0.66) + '" text-anchor="middle" font-family="system-ui,Segoe UI,Arial,sans-serif" font-weight="900" font-size="' + Math.round(h * 0.5) + '" fill="#fff" stroke="' + borde + '" stroke-width=".6">' + AJUSTES.inicial + '</text>' : '') +
      '</g>';
  }

  // <svg> completo. accesorios: array de ids (se ignoran los desconocidos).
  function dibujar(tipo, hex, accesorios, titulo) {
    var p = P[tipo] || P.zorro;
    var a = p.a;
    var lista = accesorios || [];
    var tiene = function (id) { return lista.indexOf(id) >= 0 && ACC[id]; };
    var encima = lista.filter(function (id) { return ACC[id]; }).map(function (id) { return ACC[id](a); }).join('');
    var conChompa = lista.indexOf('chompa') >= 0;
    var oscuro = mezclar(hex, '#000000', 0.28);
    return '<svg viewBox="0 0 120 120" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" ' + (titulo ? 'role="img" aria-label="' + titulo + '"' : 'aria-hidden="true"') + ' style="overflow:visible">' +
      el('ellipse', { cx: 60, cy: 113, rx: 30, ry: 4, fill: '#000', opacity: 0.12 }) +
      '<g data-parte="cuerpo" ' + ORIGEN('50% 100%') + '>' +
      p.dibujo(hex, oscuro, mezclar(hex, '#ffffff', 0.72)) +
      pies(p, oscuro) +
      (conChompa ? chompa(p, AJUSTES.chompa) : '') +
      brazos(p, hex, oscuro, mezclar(hex, '#ffffff', 0.72), conChompa ? AJUSTES.chompa : null) +
      cara(a, p.pantalla, p.sinMejillas) + encima +
      '</g></svg>';
  }

  window.MascotaPersonajes = {
    dibujar: dibujar,
    // inicial: letra(s) del colegio · chompa: color (#hex) de la chompa
    ajustar: function (o) {
      if (o.inicial != null) AJUSTES.inicial = String(o.inicial).replace(/[^A-Za-zÁÉÍÓÚÑÜáéíóúñü]/g, '').slice(0, 2).toUpperCase();
      if (o.chompa) AJUSTES.chompa = o.chompa;
    },
    tipos: Object.keys(P),
    movimiento: function (tipo) { return MOVIMIENTOS[(P[tipo] || P.zorro).mov]; },
    // Puntos de anclaje (ojos, cabeza, cuello…): sirven para enfocar una zona.
    anclas: function (tipo) { return (P[tipo] || P.zorro).a; },
    // Cuánto giran los brazos (1 = normal; alas y aletas, menos).
    giroBrazos: function (tipo) { return (P[tipo] || {}).giroBrazos || 1; },
  };
})();
