/* =========================================================================
   BIOPORTAL — prompts y validación (js/bioportal/reglas.js)
   -------------------------------------------------------------------------
   1) Tour: la IA elige, según el tema de la actividad, el MUNDO que se ve a
      través del portal (Tierra primitiva, célula, cuerpo, ecosistema o mundo
      molecular) y arma las paradas del tour: en cada una se mira un punto del
      mundo y la guía narra, emocionada, cómo se relaciona con el tema.
   2) Pregunta: la guía responde lo que el estudiante le pregunta durante el
      tour, solo sobre el tema.
   Lo comparten el navegador (bioportal.js, con clave local) y el servidor
   intermedio (js/entrevista/servidor/nucleo.mjs → /api/bioportal/…).
   Define globalThis.BioPortalReglas.
   ========================================================================= */
(function (g) {
  'use strict';
  var texto = function (v, max) { return String(v == null ? '' : v).replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max); };
  var entre = function (v, min, max, def) { return Math.min(max, Math.max(min, Math.round(Number(v)) || def)); };
  function tieneDatosPersonales(t) { return /\S+@\S+\.\S+/.test(t) || /\d{7,}/.test(String(t).replace(/[\s.-]/g, '')); }
  function json(r) {
    if (typeof r !== 'string') return r;
    var m = /\{[\s\S]*\}/.exec(r);
    try { return JSON.parse(m ? m[0] : r); } catch (e) { return null; }
  }

  // Los mundos que se dibujan (js/bioportal/mundos.js) y sus puntos para mirar.
  var MUNDOS = {
    'tierra-primitiva': { nombre: 'La Tierra primitiva', describe: 'océano primitivo hirviente, tormentas eléctricas, volcanes activos y cielo naranja rojizo, hace unos 4000 millones de años', puntos: { oceano: 'el océano primitivo hirviente', rayos: 'los rayos de las tormentas eléctricas', volcanes: 'los volcanes y su lava', atmosfera: 'el cielo y la atmósfera sin oxígeno', charca: 'una charca tibia en la orilla', moleculas: 'moléculas que brillan en el agua' } },
    celula: { nombre: 'El interior de la célula', describe: 'dentro de una célula eucariota, flotando en el citoplasma entre sus organelos', puntos: { nucleo: 'el núcleo', mitocondria: 'las mitocondrias', ribosomas: 'los ribosomas', reticulo: 'el retículo endoplasmático', golgi: 'el aparato de Golgi', membrana: 'la membrana celular', citoplasma: 'el citoplasma' } },
    cuerpo: { nombre: 'El interior del cuerpo', describe: 'dentro de un vaso sanguíneo del cuerpo humano, con la sangre fluyendo', puntos: { corriente: 'la corriente de la sangre', 'globulos-rojos': 'los glóbulos rojos', 'globulos-blancos': 'los glóbulos blancos', plaquetas: 'las plaquetas', pared: 'la pared del vaso', fondo: 'el túnel que sigue hacia los órganos' } },
    ecosistema: { nombre: 'Un ecosistema de selva', describe: 'una selva tropical con árboles, un río, el sol, flores y animales', puntos: { arboles: 'los árboles', rio: 'el río', sol: 'el sol', suelo: 'el suelo', flores: 'las flores', animales: 'los animales' } },
    molecular: { nombre: 'El mundo molecular', describe: 'un mundo de moléculas gigantes: la doble hélice del ADN, una enzima, proteínas y agua', puntos: { adn: 'la doble hélice del ADN', bases: 'las bases nitrogenadas', enzima: 'una enzima', sustrato: 'el sustrato junto a la enzima', proteina: 'una proteína', agua: 'las moléculas de agua' } },
  };

  // ---------------------------------------------------------------- tour
  function datos(e) {
    e = e && typeof e === 'object' ? e : {};
    return {
      tema: texto(e.tema, 80) || 'El origen de la vida',
      paradas: entre(e.paradas, 4, 8, 6),
      libro: texto(e.libro, 80) || 'la materia de la actividad (dedúcela del tema)',
      publico: texto(e.publico, 100) || 'estudiantes de bachillerato',
      contexto: texto(e.contexto, 2500),
    };
  }
  function sistema(d) {
    var lista = Object.keys(MUNDOS).map(function (id) {
      var m = MUNDOS[id];
      return '- "' + id + '": ' + m.describe + '. Puntos: ' + Object.keys(m.puntos).map(function (p) { return '"' + p + '" (' + m.puntos[p] + ')'; }).join(', ') + '.';
    }).join('\n');
    return [
      'Eres la GUÍA de un portal en realidad aumentada para ' + d.publico + ' (' + d.libro + ', Ecuador). El estudiante abre un portal brillante en su cuarto y, a través de él, mira un mundo en 3D.',
      'Primero elige el MUNDO que mejor muestre el tema de la actividad:',
      lista,
      'Después arma el tour: cada parada mira un "punto" del mundo elegido (usa solo esos puntos, en un orden que cuente una historia).',
      'Reglas:',
      '- "narracion": hablas mientras el estudiante mira ese punto. De 2 a 3 frases, máximo 45 palabras, emocionada y cercana, relacionando lo que se ve con el tema de la actividad. Datos verdaderos, sin inventar cifras.',
      '  Ejemplo de tono: «¡Impresionante, verdad? Esos rayos que ves atravesando el metano y el amoníaco fueron la chispa perfecta para unir moléculas simples y crear los primeros aminoácidos, los ladrillos de la vida.»',
      '- "titulo": de 2 a 4 palabras. "emoji": uno.',
      '- "bienvenida": una frase al abrir el portal (máximo 25 palabras). "despedida": una frase para cerrar el tour con la idea principal (máximo 30 palabras).',
      '- Español de Ecuador; trata al estudiante de "tú". Nada violento, sexual, de drogas ni de política.',
      'Responde SOLO con JSON: {"mundo":"…","titulo":"…","bienvenida":"…","paradas":[{"punto":"…","titulo":"…","emoji":"…","narracion":"…"}],"despedida":"…"}',
    ].join('\n');
  }
  function usuario(d) {
    var t = 'Tema: «' + d.tema + '». Crea ' + d.paradas + ' paradas.';
    if (d.contexto) {
      t += '\nEl tour es SOLO del tema de esta actividad del libro: cada narración explica conceptos que la actividad enseña o menciona (si faltan, lo básico imprescindible de ese mismo tema, nunca de otro).' +
        ' No hables de las tareas, los materiales ni la forma de trabajar de la actividad.' +
        '\nTexto de la actividad: «' + d.contexto + '»';
    }
    return t;
  }
  // → { mundo, titulo, bienvenida, paradas, despedida } o null
  function normalizarTour(r, cantidad) {
    r = json(r);
    if (!r || !Array.isArray(r.paradas)) return null;
    var mundo = MUNDOS[r.mundo] ? r.mundo : 'tierra-primitiva';
    var puntos = Object.keys(MUNDOS[mundo].puntos), usados = 0;
    var paradas = [];
    r.paradas.forEach(function (p) {
      if (!p) return;
      var narracion = texto(p.narracion, 360);
      if (!narracion) return;
      var punto = puntos.indexOf(p.punto) >= 0 ? p.punto : puntos[usados % puntos.length];
      usados += 1;
      paradas.push({ punto: punto, titulo: texto(p.titulo, 40) || MUNDOS[mundo].puntos[punto], emoji: texto(p.emoji, 8) || '✨', narracion: narracion });
    });
    if (paradas.length < 3) return null;
    return { mundo: mundo, titulo: texto(r.titulo, 60) || MUNDOS[mundo].nombre, bienvenida: texto(r.bienvenida, 200), paradas: paradas.slice(0, cantidad || 8), despedida: texto(r.despedida, 240) };
  }

  // ---------------------------------------------------------------- preguntas a la guía
  function datosPregunta(e) {
    e = e && typeof e === 'object' ? e : {};
    return {
      libro: texto(e.libro, 80) || 'la materia de la actividad',
      publico: texto(e.publico, 100) || 'estudiantes de bachillerato',
      tema: texto(e.tema, 80),
      mundo: MUNDOS[e.mundo] ? e.mundo : 'tierra-primitiva',
      parada: texto(e.parada, 400),
      pregunta: texto(e.pregunta, 200),
    };
  }
  function sistemaPregunta(d) {
    return 'Eres la GUÍA del portal de ' + d.libro + ' para ' + d.publico + '. El estudiante mira «' + MUNDOS[d.mundo].nombre + '» y el tour trata de «' + d.tema + '». ' +
      'Parada actual: «' + d.parada + '». Responde su pregunta en máximo 45 palabras, emocionada y clara, con datos verdaderos y relacionándolo con lo que ve. ' +
      'Si pregunta algo ajeno al tema, llévalo amablemente de vuelta al tour. Si cuenta que está triste o que alguien le hace daño, responde con empatía y sugiere hablar con un adulto de confianza. ' +
      'Español de Ecuador, de "tú", sin markdown. Responde SOLO con JSON: {"respuesta":"…"}';
  }
  function normalizarPregunta(r) {
    r = json(r);
    var t = r && texto(r.respuesta, 360);
    return t ? { respuesta: t } : null;
  }

  g.BioPortalReglas = {
    MUNDOS: MUNDOS, texto: texto, tieneDatosPersonales: tieneDatosPersonales,
    datos: datos, sistema: sistema, usuario: usuario, normalizarTour: normalizarTour,
    datosPregunta: datosPregunta, sistemaPregunta: sistemaPregunta, normalizarPregunta: normalizarPregunta,
  };
})(typeof window !== 'undefined' ? window : globalThis);
