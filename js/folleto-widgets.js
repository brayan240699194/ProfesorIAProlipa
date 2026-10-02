/* =========================================================================
   FOLLETO — widgets reutilizables para Postlectura, Para grandes problemas
   soluciones brillantes y STEAMission. Se apoyan en clases de Tailwind
   (cargado por CDN en cada HTML) para el detalle visual. Todo este archivo
   es JS nativo, sin jQuery: folletoOrdenarSecuencia usa Pointer Events para
   el arrastre (en vez de jQuery UI Sortable + touch-punch).
   ========================================================================= */

// Función para reorganizar aleatoriamente un array (Fisher-Yates). La usan
// folletoMarcarVisto/folletoEncerrarSimple/folletoMarcarImagenes (mezclar
// las opciones) y mezclarSinPosicion más abajo (mezclar sin dejar ningún
// elemento en su posición original). Antes vivía en funciones.js
// (framework compartido); se trae aquí porque ya no se carga ese archivo
// completo, solo lo que estas 12 actividades usan.
function mezclar(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Genera `n` colores distintos y legibles, para que ningún widget dependa
// de una paleta fija "quemada" en el código: reparte los tonos (hue) en
// `n` franjas iguales del círculo de color y elige uno al azar dentro de
// cada franja (con un poco de jitter) — así nunca caen dos tonos parecidos
// uno al lado del otro, pero el resultado cambia en cada llamada.
//
// opciones.soloBorde (default false): false devuelve pares
// [{bg, border}, ...] (fondo pastel + acento más saturado, para tarjetas/
// franjas de color — folletoMarcarVisto, folletoVerdaderoFalso,
// folletoOracionesConEspacio, folletoEncerrarSimple con ovalos); true
// devuelve solo el acento como un array plano de strings
// (['hsl(...)', ...], para widgets de un solo color por ítem —
// folletoRespuestasNumeradas, folletoUnirLineas, folletoLienzo).
// opciones.saturacion/luzFondo/luzBorde (todos opcionales): ajustan el
// look sin tocar la lógica de reparto de tonos.
//
// Todo widget que use esta función también acepta un parámetro `colores`
// propio — si se pasa, se usa tal cual (mismo formato de arriba) y NO se
// genera nada al azar; solo se generan colores cuando no se pasa ninguno.
function folletoGenerarColores(n, opciones = {}) {
  const { soloBorde = false, saturacion = 70, luzFondo = 93, luzBorde = 45 } = opciones;
  const paso = 360 / Math.max(1, n);
  const colores = [];
  for (let i = 0; i < n; i++) {
    const jitter = (Math.random() - 0.5) * paso * 0.7;
    const hue = Math.round((i * paso + paso / 2 + jitter + 360) % 360);
    if (soloBorde) {
      colores.push(`hsl(${hue}, ${saturacion}%, ${luzBorde}%)`);
    } else {
      colores.push({
        bg: `hsl(${hue}, ${Math.round(saturacion * 0.55)}%, ${luzFondo}%)`,
        border: `hsl(${hue}, ${saturacion}%, ${luzBorde}%)`,
      });
    }
  }
  return colores;
}

// ---------------------------------------------------------------------
// 0) Insignia "Lectura literal / inferencial / crítico-valorativa"
//    (círculo de color + letra + texto). En vez de repetir el mismo
//    bloque de 4 líneas en cada pregunta, se llama:
//      <div id="badgeL"></div>   (el contenedor, donde se necesite)
//      folletoBadgeLectura('literal', 'badgeL');   (en el JS de la página)
//    tipo: 'literal' | 'inferencial' | 'critica'
//    Colores en inline-style (no clases dinámicas de Tailwind) para que
//    no dependan de que el CDN las detecte en el DOM.
// ---------------------------------------------------------------------
function folletoBadgeLectura(tipo, containerId) {
  const map = {
    literal: { letra: 'L', color: '#16a34a', texto: 'Lectura literal' },
    inferencial: { letra: 'I', color: '#2563eb', texto: 'Lectura inferencial' },
    critica: { letra: 'C', color: '#e11d48', texto: 'Lectura crítico-valorativa' },
  };
  const cfg = map[tipo];
  if (!cfg) return;
  const cont = document.getElementById(containerId);
  if (!cont) return;
  cont.innerHTML = `
    <div class="inline-flex items-center gap-2.5 font-extrabold" style="color:${cfg.color}">
      <span class="w-8 h-8 rounded-full text-white flex items-center justify-center flex-none" style="background:${cfg.color};font-size:1.05rem">${cfg.letra}</span>
      <span style="font-size:1.15rem">${cfg.texto}</span>
    </div>`;
}

// ---------------------------------------------------------------------
// 0.1) Títulos de sección del folleto (Creando juntos), calcados del PDF:
//    círculo con ícono (img/ico_sec_*.png, recortados del PDF) montado
//    sobre una píldora de color con borde punteado blanco y texto blanco
//    — o, para "Paso a paso" y "Recursos", el ícono suelto con el texto
//    de color (sin píldora). La píldora y el texto son HTML/CSS (no una
//    imagen): se ven nítidos a cualquier tamaño, se adaptan al celular y
//    se imprimen igual. Estilos en folleto2.css (.f-titulo-sec…).
//    tipo: 'sumergete' | 'entrana' | 'imaginacion' | 'daforma' |
//          'prueba' | 'pasoapaso' | 'recursos'
//    opciones (opcional): { texto } para cambiar el rótulo por defecto.
//    containerId: id del contenedor vacío (o el propio elemento).
//
//    Ejemplo de uso:
//      <div id="tSumergete" class="mb-3"></div>   (en el HTML)
//      folletoTituloSeccion('sumergete', 'tSumergete');
//      folletoTituloSeccion('prueba', 'tPrueba', { texto: 'Prueba y evoluciona' });
// ---------------------------------------------------------------------
const FOLLETO_TITULOS_SECCION = {
  sumergete: { texto: 'Sumérgete en el mundo', color: '#0066b2', icono: 'img/ico_sec_sumergete.png' },
  entrana: { texto: 'Entraña el problema', color: '#f36f20', icono: 'img/ico_sec_entrana.png' },
  imaginacion: { texto: 'Imaginación sin límites', color: '#00abcc', icono: 'img/ico_sec_imaginacion.png' },
  daforma: { texto: 'Da forma a tus ideas', color: '#fdb812', icono: 'img/ico_sec_daforma.png' },
  prueba: { texto: 'Prueba y evoluciona', color: '#fdb812', icono: 'img/ico_sec_daforma.png' },
  pasoapaso: { texto: 'Paso a paso', color: '#00aeef', icono: 'img/ico_paso_a_paso.png', suelto: true },
  recursos: { texto: 'Recursos', color: '#0066b3', icono: 'img/ico_recursos.png', suelto: true },
};

function folletoTituloSeccion(tipo, containerId, opciones = {}) {
  const cfg = FOLLETO_TITULOS_SECCION[tipo];
  const cont = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
  if (!cfg || !cont) return;
  const texto = opciones.texto || cfg.texto;
  cont.classList.add('f-titulo-sec-wrap', 'break-inside-avoid', 'break-after-avoid');
  cont.innerHTML = cfg.suelto
    ? `<div class="f-titulo-sec-suelto">
         <img src="${cfg.icono}" alt="" class="f-titulo-sec-suelto-ico" onerror="this.style.display='none'">
         <span class="f-titulo-sec-suelto-txt" style="color:${cfg.color}">${texto}</span>
       </div>`
    : `<div class="f-titulo-sec">
         <img src="${cfg.icono}" alt="" class="f-titulo-sec-ico" onerror="this.style.display='none'">
         <span class="f-titulo-sec-pildora" style="background:${cfg.color}">${texto}</span>
       </div>`;
}

// ---------------------------------------------------------------------
// 0.5) "Encierra" la opción correcta (o correctas) entre varias tarjetas
//    de texto. items: [{title, resp}] con resp '1' si esa tarjeta debe
//    quedar encerrada y '0' si no. Reemplaza a EncerrarSimple (de
//    funciones.js) cuando su estilo por defecto (cajitas peladas) no
//    encaja — misma idea pero con tarjetas iguales a las de
//    folletoMarcarImagenes/folletoChecklistAbierto.
//    Al marcar una tarjeta se le dibuja un óvalo (como un lápiz
//    encerrándola) en color neutro — nunca verde, porque eso se vería
//    como "ya está bien" antes de calificar. El verde/rojo solo
//    aparecen al llamar folletoValidarEncerrarSimple (correcto/incorrecto).
//    multiple (default true): si es false, solo se puede encerrar UNA
//    tarjeta a la vez (como un radio button) — al marcar una se
//    desmarcan las demás, para preguntas de respuesta única.
//    ovalos (default false): en vez de tarjetas rectangulares blancas,
//    dibuja cada opción como un óvalo de color (uno distinto por opción)
//    — para calcar preguntas del folleto donde "encierra la palabra" se
//    ve como una fila de óvalos de colores, no cajitas. El color es solo
//    decorativo por posición, nunca indica cuál es la correcta (eso se
//    sigue viendo neutro hasta calificar).
//    colores (opcional, solo aplica con ovalos:true): array [{bg, border}]
//    para fijar los colores a mano; si no se pasa, se generan al azar con
//    folletoGenerarColores() (uno por opción).
// ---------------------------------------------------------------------

// ---------------------------------------------------------------------
// Motor de calificación + pintado compartido por TODOS los widgets de
// "marca opción(es)" (folletoEncerrarSimple, folletoMarcarVisto,
// folletoMarcarImagenes, folletoSubrayarOpciones), sea de respuesta
// única o múltiple. Reglas:
//   - No marcar nada -> TODAS quedan mal (rojo), nota 0. Aplica siempre,
//     en única y en múltiple.
//   - Marcar TODO -> TODAS quedan mal, nota 0. Solo tiene sentido (y solo
//     se evalúa) cuando `multiple` es true: en respuesta única nunca se
//     puede tener más de una marcada a la vez, así que este caso no
//     aplica ahí.
//   - Única: la opción marcada se pinta bien/mal según corresponda;
//     nota 1 o 0.
//   - Múltiple: cada opción marcada se pinta bien/mal; las que quedaron
//     sin marcar no se pintan. Cada acierto suma 1/totalCorrectas (la
//     nota máxima repartida entre las opciones que sí debían marcarse) y
//     cada error resta 1/totalOpciones (nota nunca negativa).
//     Ej.: 4 opciones, 2 correctas — marcar 1 buena da 0.5; marcar
//     además 1 mala resta 0.25 -> nota final 0.25.
// opts: NodeList/array de elementos con data-[respAttr] ('1'=correcta) y
// la clase `marcadaClass` cuando el estudiante los marcó.
// ---------------------------------------------------------------------
function folletoCalificarOpciones(opts, { multiple, marcadaClass, respAttr = 'resp', claseBien = 'bien', claseMal = 'mal' }) {
  const lista = Array.from(opts);
  const marcadas = lista.filter(o => o.classList.contains(marcadaClass));
  const totalCorrectas = lista.filter(o => o.dataset[respAttr] == 1).length;

  if (marcadas.length === 0 || (multiple && marcadas.length === lista.length)) {
    lista.forEach(o => o.classList.add(claseMal));
    return 0;
  }

  if (!multiple) {
    const marcada = marcadas[0];
    const esperado = marcada.dataset[respAttr] == 1;
    marcada.classList.add(esperado ? claseBien : claseMal);
    return esperado ? 1 : 0;
  }

  if (!totalCorrectas) return 0;
  let aciertos = 0;
  let errores = 0;
  marcadas.forEach(o => {
    const esperado = o.dataset[respAttr] == 1;
    o.classList.add(esperado ? claseBien : claseMal);
    if (esperado) aciertos++;
    else errores++;
  });
  return Math.max(0, aciertos / totalCorrectas - errores / lista.length);
}

function folletoEncerrarSimple(items, containerId, multiple = true, ovalos = false, colores = null) {
  const cont = document.getElementById(containerId);
  cont.dataset.multiple = multiple ? '1' : '0';
  cont.classList.add('flex', 'flex-wrap', 'gap-x-8', 'gap-y-5', 'justify-center', 'my-2');
  const barajado = mezclar([...items]);
  const paleta = ovalos ? colores || folletoGenerarColores(barajado.length) : null;
  cont.innerHTML = barajado
    .map((item, i) => {
      const clase = ovalos ? 'f-encerrar-opt f-encerrar-ovalo f-pop' : 'f-encerrar-opt f-pop bg-white rounded-xl border-2 border-stone-200 shadow-sm px-4 py-2.5 font-semibold text-stone-700';
      const c = ovalos ? paleta[i % paleta.length] : null;
      const style = ovalos ? ` style="--f-ovalo:${c.border}; background:${c.bg}"` : '';
      return `
      <button type="button" class="${clase}" data-idx="${i}" data-resp="${item.resp}"${style}>
        <span class="f-encerrar-ring"></span>
        <span class="f-encerrar-badge"></span>
        ${item.title}
      </button>`;
    })
    .join('');
  cont.querySelectorAll('.f-encerrar-opt').forEach(opt => {
    opt.addEventListener('click', function () {
      // Al volver a tocar cualquier tarjeta se limpia el bien/mal de TODAS
      // (no solo la tocada): si ya se había calificado antes, un nuevo
      // intento debe verse neutro otra vez, no arrastrar el color viejo.
      cont.querySelectorAll('.f-encerrar-opt').forEach(o => o.classList.remove('bien', 'mal'));
      if (!multiple) {
        siblings(this, '.f-encerrar-opt').forEach(sib => sib.classList.remove('marcada'));
      }
      this.classList.toggle('marcada');
    });
  });
}

function folletoValidarEncerrarSimple(containerId) {
  // Calificación y pintado: ver folletoCalificarOpciones.
  const cont = document.getElementById(containerId);
  const opts = cont.querySelectorAll('.f-encerrar-opt');
  return folletoCalificarOpciones(opts, {
    multiple: cont.dataset.multiple === '1',
    marcadaClass: 'marcada',
  });
}

// ---------------------------------------------------------------------
// 0.6) "Coloca un ✓/X" en la(s) opción(es) correcta(s) — casilla cuadrada
//    a la izquierda + texto en una píldora de color a la derecha, como
//    en el PDF (Poslectura). Reemplaza a SelSimple/validarSelSimple y a
//    marcarVIsto/validarMarcarVisto (jQuery, funciones.js) cuando el
//    enunciado dice "coloca un ✓" / "marca" en vez de "selecciona"/
//    "encierra". items: [{title, resp}], resp '1' = correcta, '0' = no.
//
//    opciones (todas opcionales):
//      multiple: false (default) = respuesta única, como un radio: marcar
//        una desmarca las demás. true = se pueden marcar varias a la vez
//        (para "marca las 2 frases que..." con más de una correcta).
//      marca: '✓' (default) = símbolo o texto que aparece en la casilla
//        al marcarla (puede ser 'X', 'Visto', un emoji, etc.).
//
//    Ejemplo de uso (única, con ✓):
//      folletoMarcarVisto(p2opciones, 'p2act');
//      function pregunta2() {
//        let core = folletoValidarMarcarVisto('p2act');
//        document.getElementById('pre2a').value = (core * 2).toFixed(2);
//      }
//    Ejemplo (múltiple, con X, como "marca 2 de 6 frases"):
//      folletoMarcarVisto(p1opciones, 'p1act', { multiple: true, marca: 'X' });
//    HTML: solo necesita el contenedor vacío, ej. <div id="p2act"></div>
// ---------------------------------------------------------------------
function folletoMarcarVisto(items, containerId, opciones = {}) {
  const { multiple = false, marca = '✓', colores = null } = opciones;
  const cont = document.getElementById(containerId);
  cont.dataset.multiple = multiple ? '1' : '0';
  cont.classList.add('grid', 'sm:grid-cols-2', 'gap-3', 'my-2');
  // mezclarSinPosicion asegura que ningún ítem quede en el mismo lugar
  // del arreglo original (a diferencia de mezclar(), que es un shuffle
  // normal y puede dejar alguno "sin mover" por azar).
  const orden = mezclarSinPosicion(items.map((_, i) => i));
  const barajado = orden.map(i => items[i]);
  // Cada PAR de opciones (fila del PDF: 2 columnas) comparte un color
  // pastel — no importa cuáles ítems cayeron ahí tras mezclar, solo la
  // posición visual, para que se vea igual de colorido que el folleto sin
  // importar el orden al azar. colores (opcional): array [{bg, border}]
  // para fijarlos a mano; si no se pasa, se generan al azar.
  const paleta = colores || folletoGenerarColores(Math.max(1, Math.ceil(barajado.length / 2)));
  cont.innerHTML = barajado
    .map((item, i) => {
      const c = paleta[Math.floor(i / 2) % paleta.length];
      return `
      <div class="f-visto-opt f-pop" data-idx="${i}" data-resp="${item.resp}" style="background:${c.bg}">
        <span class="f-visto-box"><span class="f-visto-check">${marca}</span></span>
        <span class="f-visto-text">${item.title}</span>
      </div>`;
    })
    .join('');
  cont.querySelectorAll('.f-visto-opt').forEach(opt => {
    opt.addEventListener('click', function () {
      // Limpia bien/mal de todas al elegir de nuevo, para que un segundo
      // intento después de calificar se vea neutro, no con el color viejo.
      cont.querySelectorAll('.f-visto-opt').forEach(o => o.classList.remove('bien', 'mal'));
      if (!multiple) {
        siblings(this, '.f-visto-opt').forEach(sib => sib.classList.remove('marcada'));
      }
      this.classList.toggle('marcada');
    });
  });
}

function folletoValidarMarcarVisto(containerId) {
  // Calificación y pintado: ver folletoCalificarOpciones.
  const cont = document.getElementById(containerId);
  const opts = cont.querySelectorAll('.f-visto-opt');
  return folletoCalificarOpciones(opts, {
    multiple: cont.dataset.multiple === '1',
    marcadaClass: 'marcada',
    claseBien: 'correcto',
    claseMal: 'incorrecto',
  });
}

// ---------------------------------------------------------------------
// 1) Marcar tarjetas con un check. items: [{ico, label, ok}]
// ---------------------------------------------------------------------
function folletoMarcarImagenes(items, containerId) {
  const cont = document.getElementById(containerId);
  cont.classList.add('flex', 'flex-wrap', 'gap-4', 'justify-center', 'my-4');
  const barajado = mezclar([...items]);
  cont.innerHTML = barajado
    .map(
      (item, i) => `
      <div class="f-img-card f-pop relative w-40 rounded-2xl border-4 border-stone-200 bg-white overflow-hidden shadow-sm" data-idx="${i}" data-ok="${item.ok ? 1 : 0}">
        <div class="f-check absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-indigo-500 text-white flex items-center justify-center font-black text-sm shadow">✓</div>
        <div class="h-28 flex items-center justify-center text-5xl bg-gradient-to-br from-stone-100 to-white">${item.ico}</div>
        <div class="text-center font-bold py-2 px-1 text-sm border-t border-stone-100">${item.label || ''}</div>
      </div>`,
    )
    .join('');
  cont.querySelectorAll('.f-img-card').forEach(card => {
    card.addEventListener('click', function () {
      // Igual que en folletoEncerrarSimple: limpiar bien/mal de TODAS al
      // volver a tocar cualquier tarjeta, para que un reintento después de
      // calificar no arrastre el contorno verde/rojo de antes.
      cont.querySelectorAll('.f-img-card').forEach(c => c.classList.remove('bien', 'mal'));
      this.classList.toggle('marcada');
    });
  });
}

function folletoValidarMarcarImagenes(containerId) {
  // Siempre es de selección múltiple (se pueden/deben marcar varias
  // imágenes). Calificación y pintado: ver folletoCalificarOpciones.
  const tarjetas = document.querySelectorAll('#' + containerId + ' .f-img-card');
  return folletoCalificarOpciones(tarjetas, {
    multiple: true,
    marcadaClass: 'marcada',
    respAttr: 'ok',
  });
}

// ---------------------------------------------------------------------
// 1.5) Verdadero o Falso: cada enunciado en su propia franja de color y,
//    a la derecha, una píldora V/F para elegir (como el recuadro del
//    folleto, pero vacío — el folleto trae la respuesta del docente
//    escrita ahí y esa nunca se muestra al estudiante).
//    items: [{enunciado, correcta: 'V'|'F'}]
//    colores (opcional): array [{bg, border}] para fijarlos a mano; si no
//    se pasa, se generan al azar con folletoGenerarColores() (uno por
//    enunciado).
// ---------------------------------------------------------------------
// opciones.justificacion (default false, no cambia el comportamiento previo):
//   false        → nunca muestra el campo de justificación (comportamiento original).
//   true         → todas las afirmaciones llevan un campo de justificación debajo.
//   'soloFalsos' → solo las afirmaciones con correcta:'F' llevan justificación
//                  (el caso típico: "si es falso, explica brevemente la razón").
// Cualquier ítem puede además fijar su propio `item.justificacion` (true/false)
// para forzar el campo con independencia de `opciones.justificacion`.
// opciones.etiquetas (opcional, default ['V','F']): las dos palabras que
// van en la píldora y en data-val — para adaptar el mismo widget a
// preguntas que en el PDF dicen "Sí/No" en vez de "Verdadero/Falso" (los
// `item.correcta` deben usar exactamente esas mismas dos palabras).
function folletoVerdaderoFalso(items, containerId, colores = null, opciones = {}) {
  const { justificacion = false, etiquetas = ['V', 'F'] } = opciones;
  const [etiquetaV, etiquetaF] = etiquetas;
  const cont = document.getElementById(containerId);
  cont.classList.add('flex', 'flex-col', 'gap-2.5', 'my-2');
  const barajado = mezclar([...items]);
  const paleta = colores || folletoGenerarColores(barajado.length);
  cont.innerHTML = barajado
    .map((item, i) => {
      const c = paleta[i % paleta.length];
      const llevaJustificacion =
        item.justificacion !== undefined
          ? item.justificacion
          : justificacion === true || (justificacion === 'soloFalsos' && item.correcta === 'F');
      const justificacionHtml = llevaJustificacion
        ? `<div class="f-vf-justificacion bookText mt-1.5"><textarea class="form-control no-redimensionar" rows="2" placeholder="Justifica tu respuesta..."></textarea></div>`
        : '';
      return `
      <div class="f-vf-item">
        <div class="f-vf-row flex items-center justify-between gap-3 rounded-xl px-4 py-3" style="background:${c.bg}">
          <span class="f-vf-badge"></span>
          <div class="flex-1 text-sm sm:text-base">${item.enunciado}</div>
          <div class="f-vf-toggle inline-flex rounded-full border-2 overflow-hidden flex-none" style="--f-vf: ${c.border}; border-color:${c.border}" data-correcta="${item.correcta}">
            <button type="button" class="f-vf-btn px-3 py-1 font-black text-sm" data-val="${etiquetaV}" style="color:${c.border}">${etiquetaV}</button>
            <button type="button" class="f-vf-btn px-3 py-1 font-black text-sm" data-val="${etiquetaF}" style="color:${c.border}">${etiquetaF}</button>
          </div>
        </div>
        ${justificacionHtml}
      </div>`;
    })
    .join('');
  cont.querySelectorAll('.f-vf-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      const toggle = this.closest('.f-vf-toggle');
      // Cambiar de V a F (o viceversa) después de calificar debe verse
      // neutro otra vez, no arrastrar el verde/rojo del intento anterior
      // (tanto en la píldora como en toda la franja y su insignia).
      toggle.classList.remove('bien', 'mal');
      toggle.closest('.f-vf-row').classList.remove('bien', 'mal');
      siblings(this, '.f-vf-btn').forEach(sib => sib.classList.remove('activo'));
      this.classList.add('activo');
    });
  });
}

function folletoValidarVerdaderoFalso(containerId) {
  // Se pinta la píldora Y toda la franja del enunciado (con insignia
  // ✓/✕) — verde si acertó, roja si no. Un enunciado sin responder
  // también se pinta de rojo (cuenta como incorrecto, no se deja neutro).
  const toggles = document.querySelectorAll('#' + containerId + ' .f-vf-toggle');
  let correctas = 0;
  toggles.forEach(toggle => {
    const esperada = toggle.dataset.correcta;
    const activo = toggle.querySelector('.f-vf-btn.activo');
    const acierto = !!activo && activo.dataset.val === esperada;
    const clase = acierto ? 'bien' : 'mal';
    toggle.classList.add(clase);
    toggle.closest('.f-vf-row').classList.add(clase);
    if (acierto) correctas++;
  });
  return toggles.length ? correctas / toggles.length : 0;
}

// ---------------------------------------------------------------------
// 1.6) Respuestas abiertas numeradas (1, 2, 3...) con número grande de
//    color, como en el folleto — el campo de texto en sí se deja neutro
//    (blanco/líneas de cuaderno, igual que cualquier otro .bookText), sin
//    fondos de color: solo el número lleva el color. n: cuántas filas.
//    campoClass: la clase p{N}campoTexto que ya usa builder.js/funciones.js
//    para crear el <textarea> ahí dentro (misma clase en las 3, para que
//    midan lo mismo — ver convención "el número es la ALTURA, no la
//    secuencia").
// ---------------------------------------------------------------------
// colores (opcional): array de strings (hex/hsl) para fijarlos a mano; si
// no se pasa, se generan al azar con folletoGenerarColores(n, {soloBorde:true}).
// opciones.input (default false): true reemplaza el .bookText (textarea de
// varias líneas) por un <input type="text"> de una sola línea con raya
// punteada — para respuestas cortas tipo "una acción", "un nombre", donde
// una caja de cuaderno completa se ve desproporcionada. No cambia el
// comportamiento por defecto (bookText) ya usado en las actividades
// existentes.
function folletoRespuestasNumeradas(n, containerId, campoClass, colores = null, opciones = {}) {
  const { input = false } = opciones;
  const cont = document.getElementById(containerId);
  cont.classList.add('flex', 'flex-col', 'gap-3', 'my-3');
  const paleta = colores || folletoGenerarColores(n, { soloBorde: true });
  let html = '';
  for (let i = 1; i <= n; i++) {
    const color = paleta[(i - 1) % paleta.length];
    const campo = input
      ? `<input type="text" class="flex-1 border-0 border-b-2 border-dashed border-stone-400 bg-transparent focus:outline-none focus:border-solid py-1" />`
      : `<div class="${campoClass} bookText flex-1"></div>`;
    html += `
      <div class="flex items-center gap-4">
        <div class="flex-none font-black text-4xl leading-none" style="color:${color}">${i}</div>
        ${campo}
      </div>`;
  }
  cont.innerHTML = html;
}

// ---------------------------------------------------------------------
// 1.7) Respuestas abiertas con título de color (franja con rótulo en
//    negrita + campo de texto), para preguntas de varias respuestas
//    cortas donde cada una lleva su propio título resaltado — p.ej.
//    "Recomendación 1:", "Recomendación 2:"... Respuesta abierta,
//    calificada por el docente (no se autocalifica).
//    items: [{titulo, color, campoClass, bg}]. campoClass es la clase
//    p{N}campoTexto que ya usa builder.js/funciones.js — el NÚMERO ahí
//    fija la ALTURA del campo (filas), no la secuencia (ver convención en
//    folletoRespuestasNumeradas), así que se puede repetir la misma
//    clase entre varios títulos o usar una distinta por título si cada
//    uno necesita otro tamaño. bg (opcional): color de fondo de la
//    tarjeta — si no se manda, queda blanca.
//
//    Ejemplo de uso:
//      var p4items = [
//        { titulo: 'Recomendación 1:', color: '#7c3aed', campoClass: 'p4campoTexto', bg: '#fefce8' },
//        { titulo: 'Recomendación 2:', color: '#f97316', campoClass: 'p4campoTexto' }, // sin bg = blanco
//        { titulo: 'Recomendación 3:', color: '#0d9488', campoClass: 'p4campoTexto' },
//      ];
//      folletoRespuestasTituladas(p4items, 'p4act');
//    HTML: solo necesita el contenedor vacío, ej. <div id="p4act"></div>
// ---------------------------------------------------------------------
function folletoRespuestasTituladas(items, containerId) {
  const cont = document.getElementById(containerId);
  cont.innerHTML = items
    .map(
      item => `
      <div class="rounded-xl shadow-sm px-4 py-3 my-2 border-l-4" style="background:${item.bg || '#fff'}; border-color:${item.color}">
        <b style="color:${item.color}">${item.titulo}</b>
        <div class="${item.campoClass} bookText"></div>
      </div>`,
    )
    .join('');
}

// ---------------------------------------------------------------------
// 1.7.45) Oraciones con un espacio en blanco EMBEBIDO en medio del texto
//    (equivalente vanilla al generateTextwithselects2 de otros libros de
//    la editorial): cada ítem trae la oración partida en "antes"/
//    "después" del hueco. El hueco es un <select> con opciones fijas si
//    se pasa `opciones`, o —por defecto— una simple RAYA subrayada para
//    escribir encima (como el folleto: nunca un campo con caja/fondo,
//    que se ve pesado en medio de una oración). Cada tarjeta lleva un
//    color de acento distinto (cíclico) para que no se vean todas iguales
//    — al azar por defecto, o fijo si se pasa `colores` ([{bg, border}]).
//    items: [{ antes, despues, opciones?: [string] }] — UN hueco por
//    ítem/tarjeta (comportamiento original).
//
//    También admite VARIOS huecos en una sola tarjeta/texto: en vez de
//    `antes`/`despues`, ese ítem trae `segmentos`, un array que alterna
//    texto fijo (string) y huecos (objeto `{ opciones?: [string] }`,
//    mismo formato de siempre — con opciones es un select, sin opciones
//    es la raya libre). Útil para una cita/oración con varios espacios
//    en blanco que deben verse como un solo texto corrido, no como
//    tarjetas separadas.
//
//    Ejemplo (con select, un hueco):
//      folletoOracionesConEspacio(
//        [{ antes: 'El agua se convierte en ', despues: ' al hervir.', opciones: ['vapor', 'hielo', 'piedra'] }],
//        'p2act',
//      );
//    Ejemplo (raya libre, como "completa con tu propia idea"):
//      folletoOracionesConEspacio(
//        [{ antes: 'Si aprovecháramos la energía de ', despues: ', generaríamos electricidad limpia.' }],
//        'p2act',
//      );
//    Ejemplo (varios huecos en un solo texto, con autocalificación):
//      folletoOracionesConEspacio(
//        [{
//          segmentos: [
//            'Mi ', { opciones: ['ideal', 'sueño'], correcta: 'ideal' }, ' más querido es el de una sociedad ',
//            { opciones: ['democrático', 'autoritario'], correcta: 'democrático' }, ' y libre.',
//          ],
//        }],
//        'p2act',
//      );
//      function pregunta2() {
//        let core = folletoValidarOracionesConEspacio('p2act');
//        document.getElementById('pre2a').value = (core * 1.5).toFixed(2);
//      }
//    `correcta` es opcional en cualquiera de las dos formas (antes/despues
//    o segmentos) — un hueco sin `correcta` nunca se autocalifica (sigue
//    siendo respuesta abierta que revisa el docente, comportamiento
//    original sin cambios).
//    HTML: solo necesita el contenedor vacío, ej. <div id="p2act"></div>
// ---------------------------------------------------------------------
function folletoOracionesConEspacio(items, containerId, colores = null) {
  const cont = document.getElementById(containerId);
  cont.classList.add('flex', 'flex-col', 'gap-2.5', 'my-2');
  const paleta = colores || folletoGenerarColores(items.length);
  // max-width + text-overflow: en pantallas angostas, una opción larga
  // (ej. "vibraciones y movimientos cotidianos") no debe partir el
  // select en dos líneas ni empujar el punto final a su propia línea —
  // se recorta con "…" en vez de envolver.
  const renderHueco = (opciones, huecoEstilo, correcta) => {
    const dataCorrecta = correcta ? ` data-correcta="${correcta}"` : '';
    return opciones
      ? `<select class="f-oracion-select align-middle border-0 border-b-2 rounded-none bg-transparent font-semibold px-1 mx-1 focus:outline-none"${dataCorrecta} style="${huecoEstilo} display:inline-block; width:auto;">
           <option value="">Selecciona...</option>
           ${opciones.map(op => `<option value="${op}">${op}</option>`).join('')}
         </select>`
      : `<input type="text" class="f-oracion-input align-middle border-0 border-b-2 border-dashed bg-transparent font-semibold text-center focus:outline-none focus:border-solid"${dataCorrecta} style="${huecoEstilo} display:inline-block; width:11em;" />`;
  };
  cont.innerHTML = items
    .map((item, i) => {
      const c = paleta[i % paleta.length];
      const huecoEstilo = `border-color:${c.border}; color:${c.border}; max-width:100%; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;`;
      const contenido = item.segmentos
        ? item.segmentos.map(seg => (typeof seg === 'string' ? seg : renderHueco(seg.opciones, huecoEstilo, seg.correcta))).join('')
        : `${item.antes}${renderHueco(item.opciones, huecoEstilo, item.correcta)}${item.despues}`;
      return `
      <div class="f-pop rounded-xl px-4 py-3 leading-relaxed" style="background:${c.bg}">
        ${contenido}
      </div>`;
    })
    .join('');
  cont.querySelectorAll('[data-correcta]').forEach(el => {
    el.addEventListener('change', () => el.classList.remove('f-oracion-bien', 'f-oracion-mal'));
    el.addEventListener('input', () => el.classList.remove('f-oracion-bien', 'f-oracion-mal'));
  });
}

// Autocalifica folletoOracionesConEspacio: solo cuenta los huecos que se
// crearon CON `correcta` (data-correcta) — los que no la tienen quedan
// fuera del cálculo, así una misma tarjeta puede mezclar huecos
// autocalificados con huecos de respuesta libre sin romper nada.
function folletoValidarOracionesConEspacio(containerId) {
  const huecos = document.querySelectorAll(`#${containerId} [data-correcta]`);
  let correctas = 0;
  huecos.forEach(el => {
    const valor = (el.value || '').trim();
    const bien = valor !== '' && valor.toLowerCase() === el.dataset.correcta.toLowerCase();
    el.classList.remove('f-oracion-bien', 'f-oracion-mal');
    el.classList.add(bien ? 'f-oracion-bien' : 'f-oracion-mal');
    if (bien) correctas++;
  });
  return huecos.length ? correctas / huecos.length : 0;
}

// ---------------------------------------------------------------------
// 1.7.5) Recuadro de un texto para leer (título + párrafos + cita +
//    imágenes opcionales) — la cajita color hueso/naranja con un
//    fragmento a leer que se repite en varias actividades. titulo/cita y
//    el texto de cada párrafo admiten HTML simple (<i>, <b>...) porque
//    se insertan tal cual, sin escapar. El enunciado ("a) Lee el
//    siguiente texto:") va AFUERA de este recuadro, no adentro — solo el
//    fragmento en sí va aquí dentro.
//    config: { titulo, imagen: {src, alt, clase}, parrafos: [...], cita }
//    - imagen (opcional): UNA imagen junto al título/arriba de todo.
//    - parrafos: cada ítem puede ser un string simple, O un objeto
//      { texto, imagen: {src, alt, clase} } cuando ESE párrafo en
//      particular lleva su propia imagen flotante (para calcar folios
//      con más de una imagen, cada una junto a un párrafo distinto — ver
//      el ejemplo, que trae carbón flotando a la derecha del primer
//      párrafo y barriles de petróleo a la izquierda del segundo).
//    - clase (en cualquiera de las dos formas, opcional): clases
//      Tailwind para posicionarla; por defecto flota a la derecha.
//
//    Ejemplo de uso:
//      folletoLectura({
//        titulo: 'E. P. Thompson y la revolución inconclusa',
//        parrafos: [
//          { texto: 'Durante la Revolución Industrial...', imagen: { src: 'img/img1_p14_act1.png', alt: 'Carbón' } },
//          { texto: 'El historiador E. P. Thompson investigó...', imagen: { src: 'img/img2_p14_act1.png', alt: 'Barriles de petróleo', clase: 'float-left w-28 sm:w-40 h-auto mr-3 mb-2' } },
//        ],
//        cita: 'Blanca Codero y Francisco Gómez, 2014 (adaptación).',
//      }, 'p1lectura');
//    HTML: solo necesita el contenedor vacío, ej. <div id="p1lectura"></div>
// ---------------------------------------------------------------------
// subrayable / encerrable (opcionales, default false): cuando el enunciado
// dice "subraya" o "encierra" sobre el propio texto de lectura (en vez de
// sobre una lista aparte, ver folletoSubrayarOpciones / folletoEncerrarSimple),
// cada palabra del párrafo se envuelve en un span clicable que dibuja una
// raya debajo o un círculo alrededor al tocarla — como si el estudiante
// marcara a mano directamente sobre el texto. Sin validación (R. A.): no
// hay "resp" correcta que calificar, es elección libre de qué palabras
// marcar. Solo uno de los dos puede estar activo a la vez.
function folletoLectura(config, containerId) {
  const cont = document.getElementById(containerId);
  const claseCaja = config.clase || 'bg-orange-50 border-2 border-orange-200';
  // overflow-auto: crea un nuevo contexto de bloque para que la caja
  // "abrace" la altura de la imagen flotante (float-right/left) en vez de
  // recortarse por la altura del texto y dejarla asomando por debajo.
  cont.classList.add(...claseCaja.split(' '), 'rounded-2xl', 'p-4', 'text-sm', 'leading-relaxed', 'overflow-auto');
  const imgTag = img => `<img src="${img.src}" alt="${img.alt || ''}" class="${img.clase || 'float-right w-24 sm:w-32 h-auto ml-3 mb-2'}">`;
  const imgHtml = config.imagen ? imgTag(config.imagen) : '';
  // #009fe3: azul calcado del recorte del PDF (más claro/brillante que
  // text-sky-700, que se veía más oscuro/apagado de lo que trae el folleto).
  const tituloHtml = config.titulo ? `<p class="font-bold text-center text-xl" style="color:#009fe3">${config.titulo}</p>` : '';
  const marcaClase = config.encerrable ? 'f-encerrar-word' : 'f-subray-word';
  const marcarTexto = texto =>
    texto
      .split(/(\s+)/)
      .map(tok => (/^\s*$/.test(tok) ? tok : `<span class="${marcaClase}">${tok}</span>`))
      .join('');
  const esMarcable = config.subrayable || config.encerrable;
  const parrafosHtml = (config.parrafos || [])
    .map(p => {
      if (typeof p === 'string') return `<p class="mt-2">${esMarcable ? marcarTexto(p) : p}</p>`;
      return `<p class="mt-2">${p.imagen ? imgTag(p.imagen) : ''}${esMarcable ? marcarTexto(p.texto) : p.texto}</p>`;
    })
    .join('');
  const citaHtml = config.cita ? `<p class="text-right text-xs text-stone-500 mt-1">${config.cita}</p>` : '';
  cont.innerHTML = imgHtml + tituloHtml + parrafosHtml + citaHtml;
  if (esMarcable) {
    cont.querySelectorAll(`.${marcaClase}`).forEach(w => {
      w.addEventListener('click', () => w.classList.toggle('marcado'));
    });
  }
}

// ---------------------------------------------------------------------
// 1.7.6) Tabla para completar — columnas de color + filas con celdas
//    fijas o editables. Pensada para reemplazar al createFillingTable
//    del framework (funciones.js) cuando se necesita algo más simple:
//      - createFillingTable exige un objeto `styles` con 6 llaves de CSS
//        a mano (tableContainerStyle, colTitleStyle, cellStyle...) para
//        verse bien; folletoTabla ya sale con el lenguaje visual del
//        folleto (colores por columna, cabecera redondeada) sin CSS
//        aparte.
//      - createFillingTable asume que TODA la tabla se autocalifica
//        (cada columna trae su lista de "answs"); folletoTabla permite
//        mezclar en la misma tabla celdas fijas (texto), libres (R.A.,
//        sin calificar — el caso más común en STEAMission/Para grandes
//        problemas) y autocalificadas, celda por celda.
//      - cualquier número de columnas, cada una con su propio color (no
//        un solo `tableColor` gris para toda la tabla).
//      - JS puro — el de funciones.js usa jQuery por dentro.
//    config: { columnas: [{titulo, color}], filas: [[celda, ...], ...], campoClass }
//    celda de cada fila, una por columna, puede ser:
//      - string/number: valor FIJO (no editable, ej. el nombre de la fila)
//      - null/undefined: campo de texto libre (respuesta abierta, sin
//        calificar). Por defecto es un <input> de una línea; si la tabla
//        trae `campoClass` (o la celda su propio { campo: 'pNcampoTexto' }),
//        en vez de <input> se usa un .bookText — el mismo cuaderno-con-
//        líneas de builder.js que usan folletoRespuestasNumeradas,
//        folletoRutinaBurbujas, etc. — para respuestas más largas que no
//        caben cómodas en una sola línea (como en "Indagar").
//      - { resp: 'valor esperado' }: campo de texto (una línea) que SÍ se
//        autocalifica con folletoValidarTabla (útil si en otra pregunta
//        se necesita una tabla de llenar-el-espacio con respuesta única).
//      - { campo: 'pNcampoTexto' }: fuerza un .bookText con ESA clase en
//        particular para esta celda (para cuando distintas columnas de
//        la misma tabla necesitan distinto tamaño de campo).
//
//    Ejemplo de uso (tabla abierta, campos tipo cuaderno — "Indagar"):
//      folletoTabla({
//        columnas: [
//          { titulo: 'Lugar', color: '#ec4899' },
//          { titulo: 'Costo aproximado mensual de la planilla de luz', color: '#84cc16' },
//          { titulo: '¿Qué consecuencias tendría si este lugar se queda sin energía?', color: '#38bdf8' },
//        ],
//        filas: [
//          ['Vivienda (familiar o vecina)', null, null],
//          ['Local comercial (tienda, farmacia, etc.)', null, null],
//        ],
//        campoClass: 'p2campoTexto',
//      }, 'p2indagar');
//
//    Ejemplo con una columna autocalificada:
//      folletoTabla({
//        columnas: [{ titulo: 'País', color: '#6366f1' }, { titulo: 'Capital', color: '#16a34a' }],
//        filas: [['Ecuador', { resp: 'Quito' }], ['Perú', { resp: 'Lima' }]],
//      }, 'p3act');
//      function pregunta3() {
//        let core = folletoValidarTabla('p3act');
//        $('#pre3a').val((core * 2).toFixed(2));
//      }
//    HTML: solo necesita el contenedor vacío, ej. <div id="p2indagar"></div>
//
//    ajustarAncho (opcional, default false): en vez de forzar un
//    min-width y dejar que aparezca scroll horizontal cuando no cabe (el
//    comportamiento de siempre, pensado para tablas con muchas columnas
//    de texto largo), la tabla se reparte SIEMPRE al 100% del contenedor
//    — las columnas se angostan (table-fixed) y el texto/los campos
//    envuelven en vez de desbordar. Útil para tablas de pocas columnas
//    donde el scroll se siente innecesario en pantallas angostas.
// ---------------------------------------------------------------------
function folletoTabla(config, containerId) {
  const cont = document.getElementById(containerId);
  if (!config.ajustarAncho) cont.classList.add('overflow-x-auto');
  const nCols = config.columnas.length;
  // sinEncabezado (opcional): omite el <thead> por completo, para tablas
  // donde la PRIMERA fila ya hace de "título" (una celda de etiqueta que
  // ocupa toda la fila, ver rowspan/colSpan de esa misma fila) en vez de
  // tener un encabezado aparte arriba — como el cuadro "Nombre del
  // aparato..." del PDF, sin fila de columnas separada.
  const headHtml = config.sinEncabezado
    ? ''
    : config.columnas
      .map((c, i) => {
        const rounding = i === 0 ? 'rounded-tl-xl' : i === nCols - 1 ? 'rounded-tr-xl' : '';
        // textColor (opcional): por defecto blanco, como hasta ahora — solo
        // hace falta cambiarlo cuando el encabezado usa un color claro
        // (calcando el PDF) donde el texto blanco no contrastaría.
        return `<th class="font-bold p-2 text-left ${rounding}" style="background:${c.color}; color:${c.textColor || '#fff'}">${c.titulo}</th>`;
      })
      .join('');
  const bodyHtml = config.filas
    .map((fila, ri) => {
      const cellsHtml = fila
        .map(celda => {
          // rowspan (opcional, solo en celdas-objeto): fusiona esta celda
          // con las N-1 filas siguientes EN ESA MISMA COLUMNA — como la
          // columna "Comparación" del PDF, que trae una sola respuesta
          // para varias filas de "Palabra"/"Explicación". La(s) fila(s)
          // siguientes simplemente omiten esa columna (igual que un
          // <table> nativo con rowspan).
          const rowspanAttr = celda && typeof celda === 'object' && celda.rowspan ? ` rowspan="${celda.rowspan}"` : '';
          // colSpan (opcional, solo en celdas-objeto): la celda ocupa el
          // ancho de varias columnas — para una fila-título como "Nombre
          // del aparato o sistema" del PDF, que abarca toda la tabla en
          // vez de tener una celda por columna.
          const colSpanAttr = celda && typeof celda === 'object' && celda.colSpan ? ` colspan="${celda.colSpan}"` : '';
          if (celda === null || celda === undefined) {
            return config.campoClass
              ? `<td class="p-2 border border-stone-200"><div class="${config.campoClass} bookText"></div></td>`
              : `<td class="p-2 border border-stone-200"><input type="text" class="w-full border border-stone-300 rounded px-2 py-1" /></td>`;
          }
          if (typeof celda === 'object') {
            if ('resp' in celda) {
              return `<td class="p-2 border border-stone-200"${rowspanAttr}${colSpanAttr}><input type="text" class="f-tabla-input w-full border border-stone-300 rounded px-2 py-1" data-resp="${celda.resp}" /></td>`;
            }
            if (celda.campo) {
              return `<td class="p-2 border border-stone-200"${rowspanAttr}${colSpanAttr}><div class="${celda.campo} bookText"></div></td>`;
            }
            if ('texto' in celda) {
              // Celda de etiqueta con su propio color (para calcar, ej., la
              // columna de la izquierda con fondo de color del PDF, en vez
              // del texto plano por defecto).
              const style = `${celda.bg ? `background:${celda.bg};` : ''}${celda.color ? `color:${celda.color};` : ''}`;
              return `<td class="p-2 font-bold border border-stone-200" style="${style}"${rowspanAttr}${colSpanAttr}>${celda.texto}</td>`;
            }
            // Celda-objeto solo con { rowspan/colSpan }: campo de texto
            // normal (como la celda null de siempre) pero fusionado.
            return config.campoClass
              ? `<td class="p-2 border border-stone-200"${rowspanAttr}${colSpanAttr}><div class="${config.campoClass} bookText"></div></td>`
              : `<td class="p-2 border border-stone-200"${rowspanAttr}${colSpanAttr}><input type="text" class="w-full border border-stone-300 rounded px-2 py-1" /></td>`;
          }
          return `<td class="p-2 font-semibold text-stone-700 border border-stone-200">${celda}</td>`;
        })
        .join('');
      return `<tr class="${ri % 2 ? 'bg-white' : 'bg-stone-50'}">${cellsHtml}</tr>`;
    })
    .join('');
  // min-width fuerza el scroll horizontal en vez de achicar columnas
  // hasta que el texto/campos queden apretados — sin esto, w-full solo
  // encoge la tabla para que quepa (overflow-x-auto nunca se activaba).
  // Con ajustarAncho se salta este forzado a propósito (ver comentario
  // arriba de la función): la tabla se queda en 100% sin min-width.
  const minWidth = config.ajustarAncho ? 0 : Math.max(480, nCols * 170);
  // anchosCol (opcional): ancho fijo por columna (ej. ['30%', '70%']) para
  // que una columna de etiquetas cortas no quede tan ancha como la de
  // los campos de texto — sin esto, todas las columnas se reparten el
  // espacio por igual sin importar cuánto contenido tengan.
  const colgroupHtml = config.anchosCol ? `<colgroup>${config.anchosCol.map(w => `<col style="width:${w}">`).join('')}</colgroup>` : '';
  const anchoStyle = minWidth ? `width:100%; min-width:${minWidth}px` : 'width:100%; table-layout:fixed';
  cont.innerHTML = `
    <table class="text-sm border-collapse" style="${anchoStyle}">
      ${colgroupHtml}
      <thead><tr>${headHtml}</tr></thead>
      <tbody>${bodyHtml}</tbody>
    </table>`;
}

function folletoValidarTabla(containerId) {
  // Solo las celdas creadas con {resp} se autocalifican — las libres
  // (null/undefined) nunca cuentan para el puntaje, son R.A.
  const inputs = document.querySelectorAll('#' + containerId + ' .f-tabla-input');
  if (!inputs.length) return 0;
  let correctas = 0;
  inputs.forEach(input => {
    const esperado = (input.dataset.resp || '').trim().toLowerCase();
    const dado = input.value.trim().toLowerCase();
    const acierto = dado.length > 0 && dado === esperado;
    input.classList.add(acierto ? 'f-tabla-bien' : 'f-tabla-mal');
    if (acierto) correctas++;
  });
  return correctas / inputs.length;
}

// ---------------------------------------------------------------------
// 1.7.7) Tabla para MARCAR con X o ✓ (hermana de folletoTabla) — para
//    preguntas tipo "Marca con una X las estructuras que realizan la
//    función descrita": la primera columna es la etiqueta de cada fila y
//    en el resto de columnas cada celda es una casilla que se marca y
//    desmarca con un clic (en vez de un campo donde escribir la X).
//    Mismo lenguaje visual que folletoTabla (encabezados de color con
//    textColor, anchosCol, ajustarAncho), más un fondo pastel opcional
//    por columna (`fondo`) para calcar las columnas teñidas del PDF.
//
//    config: {
//      columnas: [{ titulo, color, textColor?, fondo? }, ...]  — la 1.ª
//        es la de etiquetas; las demás son las columnas marcables.
//      filas: [{ texto | celda, resp?: [...] }, ...]
//        - texto: etiqueta de la fila (o `celda`: {texto, bg, color}
//          igual que en folletoTabla, para darle color propio).
//        - resp (opcional): columnas que DEBEN quedar marcadas en esa
//          fila, por su título ('Riñón') o por su número (1 = primera
//          columna marcable). Sin `resp` la fila es R. A. (se puede
//          marcar, pero no se autocalifica).
//      marca: 'X' (default) | '✓' — símbolo que aparece al marcar.
//      ajustarAncho, anchosCol, sinEncabezado — igual que folletoTabla.
//    }
//
//    Ejemplo de uso:
//      folletoTablaMarcar({
//        columnas: [
//          { titulo: 'Función / Estructura', color: '#d4eefc', textColor: '#00aeef' },
//          { titulo: 'Riñón', color: '#e3f0dd', textColor: '#40ad49', fondo: '#f4f9f2' },
//          { titulo: 'Vejiga', color: '#d3d3e7', textColor: '#24408f', fondo: '#eeeef6' },
//        ],
//        filas: [
//          { texto: 'Filtración de la sangre', resp: ['Riñón'] },
//          { texto: 'Almacenamiento de orina', resp: ['Vejiga'] },
//        ],
//        marca: 'X',
//      }, 'p2tabla');
//      function pregunta2() {
//        let core = folletoValidarTablaMarcar('p2tabla');
//        document.getElementById('pre2a').value = (core * 2).toFixed(2);
//      }
//    HTML: solo necesita el contenedor vacío, ej. <div id="p2tabla"></div>
// ---------------------------------------------------------------------
function folletoTablaMarcar(config, containerId) {
  const cont = document.getElementById(containerId);
  const marca = config.marca || 'X';
  const nCols = config.columnas.length;
  const marcables = config.columnas.slice(1);
  if (!config.ajustarAncho) cont.classList.add('overflow-x-auto');
  // resp por título o por número (1 = primera columna marcable) -> índice 0-based
  const indiceDe = r => {
    if (typeof r === 'number') return r - 1;
    const t = String(r).trim().toLowerCase();
    return marcables.findIndex(c => String(c.titulo).replace(/<[^>]*>/g, '').trim().toLowerCase() === t);
  };
  const headHtml = config.sinEncabezado
    ? ''
    : `<thead><tr>${config.columnas
      .map((c, i) => {
        const rounding = i === 0 ? 'rounded-tl-xl' : i === nCols - 1 ? 'rounded-tr-xl' : '';
        return `<th class="font-bold p-2 ${i ? 'text-center' : 'text-left'} ${rounding}" style="background:${c.color}; color:${c.textColor || '#fff'}">${c.titulo}</th>`;
      })
      .join('')}</tr></thead>`;
  const bodyHtml = config.filas
    .map((fila, ri) => {
      const etiqueta = fila.celda || { texto: fila.texto || '' };
      const estilo = `${etiqueta.bg ? `background:${etiqueta.bg};` : ''}${etiqueta.color ? `color:${etiqueta.color};` : ''}`;
      const correctas = Array.isArray(fila.resp) ? fila.resp.map(indiceDe) : null;
      const celdas = marcables
        .map((c, ci) => {
          const resp = correctas ? (correctas.includes(ci) ? '1' : '0') : '';
          return `<td class="p-1.5 border border-stone-200 text-center"${c.fondo ? ` style="background:${c.fondo}"` : ''}>
            <button type="button" class="f-marcar-celda" data-fila="${ri}" data-resp="${resp}" aria-label="Marcar ${String(c.titulo).replace(/<[^>]*>/g, '')}">
              <span class="f-marcar-signo">${marca}</span>
            </button>
          </td>`;
        })
        .join('');
      return `<tr><td class="p-2 border border-stone-200" style="${estilo}">${etiqueta.texto}</td>${celdas}</tr>`;
    })
    .join('');
  const colgroupHtml = config.anchosCol ? `<colgroup>${config.anchosCol.map(w => `<col style="width:${w}">`).join('')}</colgroup>` : '';
  const minWidth = config.ajustarAncho ? 0 : Math.max(480, nCols * 110);
  const anchoStyle = minWidth ? `width:100%; min-width:${minWidth}px` : 'width:100%; table-layout:fixed';
  cont.innerHTML = `
    <table class="f-marcar-tabla text-sm border-collapse" style="${anchoStyle}">
      ${colgroupHtml}
      ${headHtml}
      <tbody>${bodyHtml}</tbody>
    </table>`;
  cont.querySelectorAll('.f-marcar-celda').forEach(btn => {
    btn.addEventListener('click', function () {
      // Igual que el resto de widgets: al volver a marcar después de
      // calificar, se limpia el verde/rojo de TODA la tabla.
      cont.querySelectorAll('.f-marcar-celda').forEach(b => b.classList.remove('bien', 'mal'));
      this.classList.toggle('marcada');
    });
  });
}

// Califica folletoTablaMarcar fila por fila con el mismo motor de los
// widgets de marcar opciones (folletoCalificarOpciones, en modo múltiple):
// fila sin marcar o con TODO marcado = 0 y todo en rojo; cada acierto
// suma 1/correctas de la fila y cada error resta 1/columnas. La nota es
// el promedio de las filas que tienen `resp` (las R. A. no cuentan).
function folletoValidarTablaMarcar(containerId) {
  const cont = document.getElementById(containerId);
  const filas = {};
  cont.querySelectorAll('.f-marcar-celda').forEach(b => {
    if (b.dataset.resp === '') return;
    (filas[b.dataset.fila] = filas[b.dataset.fila] || []).push(b);
  });
  const claves = Object.keys(filas);
  if (!claves.length) return 0;
  const suma = claves.reduce((acc, k) => acc + folletoCalificarOpciones(filas[k], { multiple: true, marcadaClass: 'marcada' }), 0);
  return suma / claves.length;
}

// ---------------------------------------------------------------------
// 1.7.8) Validar valores EXACTOS por id (versión nativa de validarExactas
//    del framework viejo, que era jQuery): recorre los elementos
//    `${id}0`, `${id}1`, ... y compara cada uno con respuestas[i]. Sirve
//    para cualquier campo que el autor haya puesto a mano en el HTML
//    (input, textarea, select) o para un div/span con texto.
//    - respuestas: [valor, ...] en el MISMO orden de los ids. Cada valor
//      puede ser un string/número o un array de alternativas aceptadas
//      (ej. ['Golgi', 'aparato de Golgi']).
//    - id: prefijo de los ids, con o sin '#' ('#p1num' o 'p1num').
//    - esDiv (default false): true lee el texto (textContent) en vez del
//      value — el "isDiv" de la función original. Si el elemento no es un
//      campo de formulario, se lee su texto aunque no se pase.
//    - permitirVacio (default false): true acepta el vacío como respuesta
//      válida si así está en respuestas (el "isValidEmpyVal" original);
//      con false, un campo vacío siempre queda mal.
//    La comparación ignora mayúsculas, tildes y espacios de más (lo que
//    hacía procesarTexto). Pinta cada campo con las clases globales
//    .bien / .mal (misEstilos.css) y las limpia en cuanto el estudiante
//    vuelve a escribir. Devuelve de 0 a 1 (aciertos / total).
//
//    Ejemplo de uso (campos <input id="p1num0">...<input id="p1num7">):
//      function pregunta1() {
//        let core = folletoValidarExactas(['3', '5', '1', '4', '2', '7', '8', '6'], '#p1num');
//        document.getElementById('pre1a').value = (core * 5).toFixed(2);
//      }
// ---------------------------------------------------------------------
function folletoNormalizarTexto(valor) {
  return String(valor === null || valor === undefined ? '' : valor)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function folletoValidarExactas(respuestas, id, esDiv = false, permitirVacio = false) {
  const prefijo = String(id).replace(/^#/, '');
  let correctas = 0;
  respuestas.forEach((resp, i) => {
    const el = document.getElementById(prefijo + i);
    if (!el) return;
    const esCampo = ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName);
    const valor = esDiv || !esCampo ? el.textContent : el.value;
    const dado = folletoNormalizarTexto(valor);
    const aceptadas = (Array.isArray(resp) ? resp : [resp]).map(folletoNormalizarTexto);
    const acierto = (dado !== '' || permitirVacio) && aceptadas.includes(dado);
    el.classList.remove('bien', 'mal');
    el.classList.add(acierto ? 'bien' : 'mal');
    if (acierto) correctas++;
    // Al volver a escribir después de calificar, el campo vuelve a verse
    // neutro (se engancha una sola vez por elemento).
    if (esCampo && !el.dataset.fExactasLimpia) {
      el.dataset.fExactasLimpia = '1';
      ['input', 'change'].forEach(evt => el.addEventListener(evt, () => el.classList.remove('bien', 'mal')));
    }
  });
  return respuestas.length ? correctas / respuestas.length : 0;
}

// ---------------------------------------------------------------------
// 1.7.9) Llenar <select> con opciones mezcladas (versión nativa de
//    asignarOpcionesAselect del framework viejo, que era jQuery): pone en
//    TODOS los <select> que coincidan con `selector` una primera opción
//    deshabilitada ("selecciona⮟") y luego las opciones del array en
//    orden aleatorio. Cada <option> lleva su value = el texto, así que se
//    valida directo con folletoValidarExactas (la opción inicial tiene
//    value "" y cuenta como vacío -> mal).
//    - array: [string|number, ...] — no se modifica (se mezcla una copia).
//    - selector: cualquier selector CSS ('.p1select', '#p2sel0', 'select.x').
//    - opciones (todas opcionales):
//        placeholder: texto de la opción inicial (default 'selecciona⮟').
//        mezclar: true (default) = orden aleatorio, distinto en cada select;
//          false = respeta el orden del array (ej. números 1, 2, 3...).
//
//    Ejemplo de uso:
//      <select class="p1select" id="p1sel0"></select> ... (en el HTML)
//      folletoAsignarOpcionesSelect(['núcleo', 'mitocondria', 'ribosomas'], '.p1select');
//      function pregunta1() {
//        let core = folletoValidarExactas(['mitocondria', 'núcleo'], '#p1sel');
//        document.getElementById('pre1a').value = (core * 2).toFixed(2);
//      }
// ---------------------------------------------------------------------
function folletoAsignarOpcionesSelect(array, selector, opciones = {}) {
  const { placeholder = 'selecciona⮟', mezclar: mezclarOpcion = true } = opciones;
  const escapar = t => String(t).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  document.querySelectorAll(selector).forEach(sel => {
    const lista = mezclarOpcion ? mezclar([...array]) : [...array];
    sel.innerHTML =
      `<option value="" selected disabled>${placeholder}</option>` +
      lista.map(op => `<option value="${escapar(op)}">${op}</option>`).join('');
  });
}

// Lee el archivo elegido en #file{eve} y llena #img{eve}.src con su
// vista previa (dataURL). Antes vivía en funciones.js (framework
// compartido, con los mensajes de error vía jQuery); se trae aquí en
// vanilla porque folletoSubirImagen es el único widget que la necesita.
function mostrar(eve) {
  var archivo = document.getElementById('file' + eve).files[0];
  var tiposPermitidos = ['image/jpeg', 'image/png'];
  if (!archivo || !tiposPermitidos.includes(archivo.type)) {
    mostrarErrorImg('Por favor, selecciona un archivo de tipo JPEG o PNG.');
    return;
  }
  var tamañoMaximo = 3 * 1024 * 1024;
  if (archivo.size > tamañoMaximo) {
    mostrarErrorImg('El archivo es demasiado grande. Por favor, selecciona un archivo de máximo 3 megabytes.');
    return;
  }
  var reader = new FileReader();
  reader.readAsDataURL(archivo);
  reader.onloadend = function () {
    document.getElementById('img' + eve).src = reader.result;
  };
}

function mostrarErrorImg(texto) {
  document.querySelectorAll('.imgCargar').forEach(img => {
    img.insertAdjacentHTML(
      'afterend',
      `<p class="mensajeErrorImg" style="color:white;background-color:red;display:table;border-radius:5px;padding:5px">${texto}</p>`,
    );
  });
  setTimeout(() => {
    document.querySelectorAll('.mensajeErrorImg').forEach(el => el.remove());
  }, 4000);
}

// ---------------------------------------------------------------------
// 1.8) Subir una imagen (para preguntas tipo "¿Cómo se ve?", "Dibújalo y
//    súbelo", etc.). Usa la función mostrar(N) de arriba para leer el
//    archivo y mostrar la vista previa — aquí solo se rediseña el
//    HTML/CSS alrededor de ese mismo mecanismo (input#file{n},
//    img#img{n}.imgCargar, ambos exigidos por mostrar()).
//    fileNum: número único en la página — si hay más de un subir-imagen,
//    cada uno necesita su propio número (file1/img1, file2/img2...).
//    label (opcional): texto de la etiqueta en forma de píldora debajo
//    del recuadro (p.ej. "¿Cómo se ve?", como en el folleto).
//
//    Ejemplo de uso:
//      folletoSubirImagen(1, 'p5img', '¿Cómo se ve?');
//    HTML: solo necesita el contenedor vacío, ej. <div id="p5img"></div>
// ---------------------------------------------------------------------
function folletoSubirImagen(fileNum, containerId, label) {
  const cont = document.getElementById(containerId);
  cont.innerHTML = `
    <label for="file${fileNum}" class="f-subir-img" title="Haz clic para subir una imagen">
      <input type="file" accept="image/png, image/jpeg" id="file${fileNum}" onchange="mostrar(${fileNum})" />
      <span class="f-subir-img-empty">
        <span class="f-subir-img-icon">📷</span>
        <span class="f-subir-img-hint">Sube una imagen</span>
      </span>
      <img id="img${fileNum}" class="imgCargar f-subir-img-preview" alt="" />
    </label>
    ${label ? `<div class="f-subir-img-label">${label}</div>` : ''}
  `;
  // mostrar() (funciones.js) solo llena el src de la imagen — este
  // listener aparte (no toca el onchange inline de arriba) es lo que
  // oculta el ícono/indicación y revela la vista previa.
  document.getElementById('file' + fileNum).addEventListener('change', function () {
    if (this.files && this.files[0]) {
      cont.querySelector('.f-subir-img').classList.add('f-subir-img-tiene-imagen');
    }
  });
}

// ---------------------------------------------------------------------
// 2) Ordenar secuencia arrastrando (jQuery UI sortable + touch-punch).
//    items: [{id:'A', texto:'...'}] — se muestran SIEMPRE en ese mismo
//    orden (A, B, C, D...), sin mezclar, cada una con su propia letra
//    fija: la letra "viaja" con su oración cuando el estudiante la
//    arrastra a otra posición, nunca cambia. El "reto" de ordenar está en
//    que ese orden A-B-C... casi nunca es el de lectura correcto (ver
//    correctOrderIds en folletoValidarOrdenarSecuencia) — el estudiante
//    debe arrastrar las oraciones hasta dejarlas en el orden correcto,
//    sin importar qué letra les haya tocado.
//    Única función de este archivo que todavía toca jQuery: el plugin
//    Sortable no tiene equivalente nativo cargado en el proyecto y exige
//    un objeto jQuery para invocarse — ver nota al inicio del archivo.
// ---------------------------------------------------------------------
//    opciones.modoRango (default false): true convierte la insignia en un
//    RANGO por posición (1, 2, 3...) que se recalcula al soltar cada
//    arrastre, para preguntas tipo "coloca el 1 en el más preocupante,
//    el 3 en el menos" (sin respuesta única, R.A.) — lo opuesto al modo
//    por defecto, donde la insignia queda fija al contenido de cada
//    oración sin importar su posición (para "ordena para que tenga
//    sentido", con folletoValidarOrdenarSecuencia). No cambia el
//    comportamiento por defecto ya usado en otras actividades.
//    opciones.mezclar (default false): true revuelve el orden de `items`
//    antes de dibujarlos (con mezclarSinPosicion, así ningún ítem queda
//    en su posición original de la lista). Para cuando el autor de la
//    actividad ya escribió los items en su orden correcto y prefiere que
//    el desorden inicial lo resuelva la función, en vez de mezclarlos a
//    mano en el array (como se sigue haciendo en las actividades ya
//    construidas) — no cambia el comportamiento por defecto.
function folletoOrdenarSecuencia(items, containerId, opciones = {}) {
  const { modoRango = false, mezclar: mezclarOpcion = false } = opciones;
  // mezclarSinPosicion trabaja sobre INDICES (no sobre los items
  // directamente, ver su uso en folletoMarcarVisto) — así garantiza que
  // ningún ítem quede en su posición original, no solo un shuffle simple.
  const orden = mezclarOpcion ? mezclarSinPosicion(items.map((_, i) => i)) : items.map((_, i) => i);
  const listaItems = orden.map(i => items[i]);
  const ol = document.getElementById(containerId);
  ol.classList.add('f-secuencia', 'flex', 'flex-col', 'gap-2.5', 'my-4');
  ol.innerHTML = listaItems
    .map(
      (item, i) => `
      <li data-id="${item.id}" class="flex items-center gap-3 py-2.5 px-4 rounded-xl bg-amber-50 border border-amber-200">
        <span class="f-secuencia-badge flex-none w-7 h-7 rounded-full bg-orange-400 text-white font-black flex items-center justify-center text-sm">${modoRango ? i + 1 : item.id}</span>
        <div class="flex-1 text-sm sm:text-base">${item.texto}</div>
        <span class="f-secuencia-handle flex-none opacity-40 text-lg">⠿⠿</span>
      </li>`,
    )
    .join('');

  function actualizarBadges() {
    if (!modoRango) return;
    ol.querySelectorAll('li').forEach((li, i) => {
      li.querySelector('.f-secuencia-badge').textContent = i + 1;
    });
  }

  // Reordenar arrastrando (equivalente vanilla a jQuery UI Sortable axis:'y'
  // + touch-punch): Pointer Events cubre mouse/touch/lápiz con la misma API.
  // El elemento arrastrado SIGUE al cursor en vivo (transform:translateY,
  // sin transición, 1:1 con el puntero) y los demás se corren con una
  // animación suave para abrir el espacio — el DOM real solo se reordena
  // al soltar, momento en el que se limpian los transforms (como cada
  // elemento ya quedó visualmente en la posición donde cae, no se nota el
  // salto). Antes el reordenamiento saltaba de golpe al cruzar la mitad de
  // un vecino, sin ningún desplazamiento visible mientras se arrastraba.
  ol.querySelectorAll('li').forEach(li => {
    let dragging = false;
    let startY = 0;
    let initialIndex = 0;
    let currentIndex = 0;
    let snapshot = [];
    let gap = 0;

    function aplicarOrdenTentativo(nuevoIndex) {
      const otros = snapshot.filter(el => el !== li);
      otros.forEach((el, idx) => {
        let offset = 0;
        if (idx >= nuevoIndex && idx < initialIndex) offset = 1;
        else if (idx <= nuevoIndex - 1 && idx >= initialIndex) offset = -1;
        el.style.transform = offset ? `translateY(${offset * gap}px)` : '';
      });
      if (modoRango) {
        const tentativo = otros.slice();
        tentativo.splice(nuevoIndex, 0, li);
        tentativo.forEach((el, i) => {
          el.querySelector('.f-secuencia-badge').textContent = i + 1;
        });
      }
    }

    function onMove(ev) {
      if (!dragging) return;
      const dy = ev.clientY - startY;
      li.style.transform = `translateY(${dy}px)`;
      const desplazadas = Math.round(dy / gap);
      const nuevoIndex = Math.min(snapshot.length - 1, Math.max(0, initialIndex + desplazadas));
      if (nuevoIndex !== currentIndex) {
        currentIndex = nuevoIndex;
        aplicarOrdenTentativo(currentIndex);
      }
    }
    function onUp(ev) {
      dragging = false;
      li.classList.remove('f-secuencia-dragging');
      li.style.transform = '';
      li.releasePointerCapture(ev.pointerId);
      li.removeEventListener('pointermove', onMove);
      li.removeEventListener('pointerup', onUp);
      li.removeEventListener('pointercancel', onUp);

      // Aplicar en el DOM real el orden al que ya se llegó visualmente, y
      // limpiar los transforms de los demás (vuelven al flujo normal en su
      // nueva posición, ya sin salto porque coincide con donde quedaron).
      const otros = snapshot.filter(el => el !== li);
      otros.splice(currentIndex, 0, li);
      otros.forEach(el => {
        el.style.transform = '';
        ol.appendChild(el);
      });
      actualizarBadges();
    }
    // El arrastre se puede iniciar tocando/clicando CUALQUIER parte de la
    // tarjeta (no solo el ícono ⠿⠿) — ese ícono queda solo como pista visual
    // de que la fila es arrastrable.
    li.addEventListener('pointerdown', e => {
      e.preventDefault();
      li.setPointerCapture(e.pointerId);
      dragging = true;
      startY = e.clientY;
      snapshot = Array.from(ol.querySelectorAll('li'));
      initialIndex = snapshot.indexOf(li);
      currentIndex = initialIndex;
      gap = li.getBoundingClientRect().height + parseFloat(getComputedStyle(ol).rowGap || 10);
      li.classList.add('f-secuencia-dragging');
      li.addEventListener('pointermove', onMove);
      li.addEventListener('pointerup', onUp);
      li.addEventListener('pointercancel', onUp);
    });
  });
}

function folletoValidarOrdenarSecuencia(correctOrderIds, containerId) {
  // String(): el data-id siempre se lee como string desde el DOM
  // (li.dataset.id), así que si correctOrderIds llega con números (ej.
  // [1, 2, 3, 4] en vez de ['A','B','C','D']) la comparación estricta
  // fallaba siempre por diferencia de tipo. Convertir ambos lados a
  // string permite usar ids numéricos sin afectar los folletos que ya
  // usan letras (uni1act1, uni3act1, uni5act1...), donde la comparación
  // sigue siendo string-contra-string igual que antes.
  const actual = Array.from(document.querySelectorAll('#' + containerId + ' li')).map(li => li.dataset.id);
  let correctas = 0;
  actual.forEach((id, i) => {
    const bien = String(id) === String(correctOrderIds[i]);
    document.querySelector(`#${containerId} li[data-id="${id}"]`).classList.add(bien ? 'bien4' : 'mal4');
    if (bien) correctas++;
  });
  return correctas / correctOrderIds.length;
}

// ---------------------------------------------------------------------
// 3) Rutina de pensamiento en burbujas (siempre respuesta abierta).
//    items: [{titulo, pregunta, color}]
// ---------------------------------------------------------------------
function folletoRutinaBurbujas(items, containerId, inputClass, columnas = null, iconSize = 'h-10') {
  // OJO: "inputClass" (p{N}campoTexto) NO debe ir en un <textarea>. builder.js
  // llama addText('N','p{N}campoTexto') para N=1-8,10-12 en $(document).ready,
  // y esa función hace $('.p{N}campoTexto').html('<textarea>...') — si la
  // clase ya está puesta sobre un <textarea>, ese .html() le mete el nuevo
  // <textarea> como TEXTO LITERAL (un textarea no parsea hijos), y se ve el
  // código crudo en pantalla. El contenedor tiene que ser un <div> vacío;
  // builder.js le agrega el textarea real después.
  // item.icon (opcional): ruta al ícono real del folleto (ej.
  // 'img/ico_positivo.png') para calcar el diseño del PDF en vez de un
  // pill de color genérico.
  // columnas (opcional, default null = flex-wrap libre de siempre): un
  // número fuerza una cuadrícula fija de esa cantidad de columnas, para
  // calcar rutinas del PDF que van en 2 columnas (ej. Veo/Siento arriba,
  // Pienso/Me pregunto abajo) en vez de acomodarse al ancho disponible.
  const cont = document.getElementById(containerId);
  if (columnas) {
    cont.classList.add('grid', 'gap-4', 'my-4');
    cont.style.gridTemplateColumns = `repeat(${columnas}, minmax(0, 1fr))`;
  } else {
    cont.classList.add('flex', 'flex-wrap', 'gap-4', 'justify-center', 'my-4');
  }
  cont.innerHTML = items
    .map(item => {
      const icon = item.icon
        ? `<img src="${item.icon}" alt="${item.titulo}" class="${iconSize} w-auto flex-none">
           <span class="font-extrabold text-lg" style="color:${item.color}">${item.titulo}</span>`
        : `<span class="font-extrabold text-lg" style="color:${item.color}">${item.titulo}</span>`;
      return `
      <div class="f-pop ${columnas ? 'w-full' : 'w-64'} rounded-2xl bg-white shadow-sm p-4 border-2 border-dotted" style="border-color:${item.color}">
        <div class="flex items-center gap-2 mb-2">
          ${icon}
        </div>
        ${item.pregunta ? `<div class="text-sm font-semibold text-center text-stone-800 mb-2">${item.pregunta}</div>` : ''}
        <div class="${inputClass} bookText"></div>
      </div>`;
    })
    .join('');
}

// ---------------------------------------------------------------------
// 4) Checklist de opciones libres, sin corrección automática (para
//    "Lluvia de ideas" y similares de Para grandes problemas /
//    STEAMission, que en el libro no marcan una única respuesta
//    correcta). items: [string].
// ---------------------------------------------------------------------
function folletoChecklistAbierto(items, containerId, cols = 1) {
  const cont = document.getElementById(containerId);
  cont.classList.add('grid', 'gap-2', 'my-3');
  if (cols === 2) cont.classList.add('sm:grid-cols-2');
  cont.innerHTML = items
    .map(
      (texto, i) => `
      <label class="f-pop flex items-start gap-2 bg-white rounded-xl border border-stone-200 px-3 py-2 text-sm cursor-pointer hover:border-indigo-300">
        <input type="checkbox" class="mt-1 accent-indigo-500" data-idx="${i}" />
        <span>${texto}</span>
      </label>`,
    )
    .join('');
}

// ---------------------------------------------------------------------
// 4.2) Checklist de opciones libres AGRUPADO por tarjetas de color, cada
//    una con su propia pregunta/encabezado (con emoji) dentro de la
//    misma tarjeta (para "Lluvia de ideas" con varias preguntas lado a
//    lado, como en Para grandes problemas). Las opciones entran con
//    animación escalonada (.f-pop) y usan un check circular animado en
//    vez del checkbox nativo, para un look más de libro infantil/juvenil.
//    grupos: [{ titulo, icono, claseCaja, claseTitulo, opciones: [string] }].
//    claseCaja/claseTitulo son clases Tailwind opcionales (por defecto
//    tonos neutros); icono es un emoji opcional (por defecto 💡).
// ---------------------------------------------------------------------
function folletoListaChecklist(grupos, containerId) {
  const cont = document.getElementById(containerId);
  cont.classList.add('grid', 'sm:grid-cols-2', 'gap-4');
  cont.innerHTML = grupos
    .map(
      g => `
      <div class="rounded-2xl p-4 ${g.claseCaja || 'bg-stone-50 border-2 border-stone-200'}">
        <div class="font-bold text-sm mb-3 ${g.claseTitulo || 'text-stone-700'}">${g.titulo}</div>
        <div class="flex flex-col gap-2">
          ${g.opciones
          .map(
            (texto, i) => `
            <label class="f-check-opt f-pop flex items-center gap-3 bg-white/80 rounded-xl px-3 py-2 text-sm cursor-pointer">
              <input type="checkbox" class="hidden" data-idx="${i}" />
              <span class="f-check-box"></span>
              <span>${texto}</span>
            </label>`,
          )
          .join('')}
        </div>
      </div>`,
    )
    .join('');
  cont.querySelectorAll('.f-check-opt').forEach(opt => {
    const input = opt.querySelector('input');
    opt.addEventListener('click', e => {
      e.preventDefault();
      input.checked = !input.checked;
      opt.classList.toggle('marcado', input.checked);
    });
  });
}

// ---------------------------------------------------------------------
// 4.5) "Subraya" una opción de una lista (literal: se ve una línea que
//    se dibuja bajo el texto al hacer clic, como si el estudiante la
//    subrayara a mano) — en vez de un checkbox, para preguntas cuyo
//    enunciado dice "subraya" en vez de "marca"/"elige".
//    items: [string] para preguntas de respuesta abierta (R.A., no se
//    autocalifica) o [{title, resp}] para que sí tenga una (o varias)
//    respuesta(s) correcta(s) y se pueda calificar con
//    folletoValidarSubrayarOpciones (resp '1' = correcta).
//    multiple (default true): si es false, solo se puede subrayar UNA
//    opción a la vez — al marcar una se desmarcan las demás.
//    marcador (default 'punto'): qué va antes de cada opción —
//      'punto'  → viñeta (•), como la lista del PDF
//      'letra'  → a), b), c)...
//      'numero' → 1., 2., 3....
//      'ninguno' → sin marcador (comportamiento previo)
// ---------------------------------------------------------------------
function folletoSubrayarOpciones(items, containerId, multiple = true, marcador = 'punto') {
  const cont = document.getElementById(containerId);
  cont.dataset.multiple = multiple ? '1' : '0';
  cont.classList.add('flex', 'flex-col', 'gap-1', 'my-2');
  const letras = 'abcdefghij';
  const marcadorHtml = i => {
    if (marcador === 'letra') return `<b class="f-subraya-marcador txt-azul">${letras[i] || i + 1}) </b>`;
    if (marcador === 'numero') return `<span class="f-subraya-marcador">${i + 1}. </span>`;
    if (marcador === 'ninguno') return '';
    return `<span class="f-subraya-marcador">•</span> `;
  };
  // mezclarSinPosicion: que ningún ítem quede en el mismo lugar del
  // arreglo original (ver la misma nota en folletoMarcarVisto).
  const orden = mezclarSinPosicion(items.map((_, i) => i));
  const barajado = orden.map(i => items[i]);
  cont.innerHTML = barajado
    .map((item, i) => {
      const texto = typeof item === 'string' ? item : item.title;
      const resp = typeof item === 'string' ? '' : item.resp;
      return `
      <div class="f-subraya-opt f-pop" data-idx="${i}" data-resp="${resp}">
        ${marcadorHtml(i)}<span class="f-subraya-text">${texto}</span>
      </div>`;
    })
    .join('');
  cont.querySelectorAll('.f-subraya-opt').forEach(opt => {
    opt.addEventListener('click', function () {
      cont.querySelectorAll('.f-subraya-opt').forEach(o => o.classList.remove('correcto', 'incorrecto'));
      if (!multiple) {
        siblings(this, '.f-subraya-opt').forEach(sib => sib.classList.remove('marcado'));
      }
      this.classList.toggle('marcado');
    });
  });
}

// Calificación para folletoSubrayarOpciones cuando items trae {title, resp}
// (misma lógica de folletoValidarMarcarVisto: única o múltiple según se
// haya llamado folletoSubrayarOpciones con multiple true/false).
function folletoValidarSubrayarOpciones(containerId) {
  // Calificación y pintado: ver folletoCalificarOpciones.
  const cont = document.getElementById(containerId);
  const opts = cont.querySelectorAll('.f-subraya-opt');
  return folletoCalificarOpciones(opts, {
    multiple: cont.dataset.multiple === '1',
    marcadaClass: 'marcado',
    claseBien: 'correcto',
    claseMal: 'incorrecto',
  });
}

// ---------------------------------------------------------------------
// 5) Tabla de autoevaluación Sí / No / Debo mejorar (STEAMission
//    "Evaluar"). No se autocalifica: es una reflexión del estudiante.
//    items: [string]
// ---------------------------------------------------------------------
function folletoEvaluarTabla(items, containerId) {
  const cols = [
    { label: 'Sí', color: '#16a34a' },
    { label: 'No', color: '#dc2626' },
    { label: 'Debo mejorar', color: '#f59e0b' },
  ];
  const cont = document.getElementById(containerId);
  cont.classList.add('my-4', 'overflow-x-auto');
  const rows = items
    .map(
      (texto, i) => `
      <tr class="f-eval-row ${i % 2 ? 'bg-white' : 'bg-stone-50'}">
        <td class="p-3 text-sm">${texto}</td>
        ${cols
          .map(
            (c, j) => `
          <td class="text-center p-2">
            <span class="f-eval-cell inline-block w-8 h-8 rounded-full border-[3px]" style="border-color:${c.color};color:${c.color}" data-row="${i}" data-col="${j}"></span>
          </td>`,
          )
          .join('')}
      </tr>`,
    )
    .join('');
  cont.innerHTML = `
    <table class="w-full bg-white rounded-2xl overflow-hidden shadow-md border-2 border-stone-100">
      <thead>
        <tr>
          <th class="p-3 text-left text-sm bg-stone-100">Criterio</th>
          ${cols.map(c => `<th class="p-2 text-center bg-stone-100"><span class="inline-block px-3 py-1 rounded-full text-white text-xs font-bold" style="background:${c.color}">${c.label}</span></th>`).join('')}
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;

  cont.querySelectorAll('.f-eval-cell').forEach(cell => {
    cell.addEventListener('click', function () {
      const row = this.dataset.row;
      cont.querySelectorAll(`.f-eval-cell[data-row="${row}"]`).forEach(c => c.classList.remove('f-eval-selected'));
      this.classList.add('f-eval-selected');
    });
  });
}

// ---------------------------------------------------------------------
// 6) "Unir con líneas": dos columnas — el estudiante hace clic en un
//    ítem de la izquierda y luego en el de la derecha que le corresponde,
//    y se dibuja una línea real (SVG) entre ambos. Doble clic sobre un
//    ítem ya unido deshace esa unión. Reemplaza al "Relacionarliterales"
//    del framework (que muestra un <select> con letras, no líneas). La
//    columna derecha se mezcla; la izquierda queda en el orden dado. El
//    PAR CORRECTO es items[i].literal con items[i].enunciado (mismo
//    índice), igual que Relacionarliterales.
//
//    Ejemplo de uso:
//      var p1array = [
//        { literal: 'Hildegarda de Bingen', enunciado: 'Visiones místicas...' },
//        { literal: 'Literatura medieval', enunciado: 'Fue un reflejo...' },
//        { literal: 'Christine de Pizan', enunciado: 'Reconstruyó...' },
//      ];
//      folletoUnirLineas(p1array, 'p1act');
//      function pregunta1() {
//        let core = folletoValidarUnirLineas('p1act');
//        $('#pre1a').val((core * 2).toFixed(2)); // 2 = puntaje de la pregunta
//      }
//
//      // con títulos de columna, como "Causa"/"Efecto" en el PDF:
//      folletoUnirLineas(p1array, 'p1act', null, { tituloIzquierda: 'Causa', tituloDerecha: 'Efecto' });
//    HTML: solo necesita el contenedor vacío, ej. <div id="p1act"></div>
// ---------------------------------------------------------------------
// colores (opcional): array de strings (hex/hsl), uno por línea, para
// fijarlos a mano; si no se pasa, se generan al azar con
// folletoGenerarColores(n, {soloBorde:true}).
// opciones.tituloIzquierda / opciones.tituloDerecha (opcionales, default
// ninguno): rótulo encima de cada columna, como "Causa"/"Efecto" en el PDF.
// Si no se pasa ninguno de los dos, no se agrega la fila de títulos — el
// widget se ve exactamente igual que antes de este parámetro.
// opciones.colorTituloIzquierda / opciones.colorTituloDerecha (opcionales):
// color de fondo de cada píldora de título, para calcar el color exacto del
// PDF (ej. Causa naranja, Efecto celeste); sin esto, ambas usan el mismo
// índigo por defecto.
function folletoUnirLineas(items, containerId, colores = null, opciones = {}) {
  const {
    tituloIzquierda = null,
    tituloDerecha = null,
    colorTituloIzquierda = null,
    colorTituloDerecha = null,
  } = opciones;
  const cont = document.getElementById(containerId);
  cont.classList.add('f-unir-wrap', 'flex', 'flex-col', 'gap-2', 'my-4', 'py-2');
  const rightOrder = mezclarSinPosicion(items.map((_, i) => i));
  const colors = colores || folletoGenerarColores(items.length, { soloBorde: true });

  const leftHtml = items
    .map(
      (item, i) => `
      <div class="f-unir-item f-unir-left" id="${containerId}-L${i}" data-idx="${i}">
        <span class="f-unir-text">${item.literal}</span>
        <span class="f-unir-dot"></span>
      </div>`,
    )
    .join('');
  const rightHtml = rightOrder
    .map(
      origIdx => `
      <div class="f-unir-item f-unir-right" id="${containerId}-R${origIdx}" data-idx="${origIdx}">
        <span class="f-unir-dot"></span>
        <span class="f-unir-text">${items[origIdx].enunciado}</span>
      </div>`,
    )
    .join('');

  const titulosHtml =
    tituloIzquierda || tituloDerecha
      ? `<div class="f-unir-titulos flex gap-6 sm:gap-14 justify-between">
          <span class="f-unir-titulo" style="flex: 0 1 44%; visibility:${tituloIzquierda ? 'visible' : 'hidden'}${colorTituloIzquierda ? `; background:${colorTituloIzquierda}` : ''}">${tituloIzquierda || ''}</span>
          <span class="f-unir-titulo" style="flex: 0 1 44%; visibility:${tituloDerecha ? 'visible' : 'hidden'}${colorTituloDerecha ? `; background:${colorTituloDerecha}` : ''}">${tituloDerecha || ''}</span>
        </div>`
      : '';

  // El título (si se pide) va FUERA de .f-unir-cols: ese es el único
  // elemento con position:relative, para que el SVG (inset:0 dentro de él)
  // y dotCenter() sigan midiendo únicamente el alto de las dos columnas,
  // sin desplazarse por el alto de la fila de títulos.
  cont.innerHTML = `
    ${titulosHtml}
    <div class="f-unir-cols relative flex gap-6 sm:gap-14 justify-between">
      <svg class="f-unir-svg"></svg>
      <div class="flex flex-col gap-3 justify-center" style="flex: 0 1 44%">${leftHtml}</div>
      <div class="flex flex-col gap-3 justify-center" style="flex: 0 1 44%">${rightHtml}</div>
    </div>
  `;
  const colsEl = cont.querySelector('.f-unir-cols');

  const matches = {}; // { leftIdx: rightIdx }
  let pendingLeft = null;

  function dotCenter(dot) {
    const r = dot.getBoundingClientRect();
    const wrapR = colsEl.getBoundingClientRect();
    return { x: r.left + r.width / 2 - wrapR.left, y: r.top + r.height / 2 - wrapR.top };
  }

  function pathD(li, ri, sagOverride) {
    const l = document.querySelector('#' + containerId + '-L' + li + ' .f-unir-dot');
    const r = document.querySelector('#' + containerId + '-R' + ri + ' .f-unir-dot');
    if (!l || !r) return null;
    const p1 = dotCenter(l);
    const p2 = dotCenter(r);
    const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const baseSag = Math.min(18, dist * 0.1);
    const sag = sagOverride === undefined ? baseSag : sagOverride;
    const mx = (p1.x + p2.x) / 2;
    const my = (p1.y + p2.y) / 2 + sag;
    return { d: `M ${p1.x} ${p1.y} Q ${mx} ${my} ${p2.x} ${p2.y}`, p1, p2, baseSag };
  }

  // Rebote de cuerda: después de tensarse, oscila (como una cuerda que se
  // sacude) con amplitud decayendo hasta quedar quieta en su curvatura
  // normal. Solo cambia el "pandeo" (control point), no los extremos —
  // los círculos no se mueven.
  function bounceRope(li, ri) {
    const start = performance.now();
    const duration = 650;
    function frame(now) {
      const path = cont.querySelector('.f-unir-svg .f-unir-line[data-left="' + li + '"]');
      if (!path) return; // se borró (desunido) a mitad de la animación
      const info = pathD(li, ri);
      if (!info) return;
      const t = Math.min(1, (now - start) / duration);
      const decay = Math.exp(-4.5 * t);
      const osc = Math.sin(t * Math.PI * 3.2);
      const sag = info.baseSag + info.baseSag * 2.4 * decay * osc;
      const bounced = pathD(li, ri, sag);
      path.setAttribute('d', bounced.d);
      if (t < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function lineColor(li) {
    const left = document.getElementById(containerId + '-L' + li);
    const bien = left.classList.contains('f-unir-bien');
    const mal = left.classList.contains('f-unir-mal');
    return bien ? '#16a34a' : mal ? '#dc2626' : colors[li % colors.length];
  }

  // Dibuja/actualiza SOLO la línea del par "li". Cada línea es un nodo
  // SVG independiente: crearla no toca ni reinicia la animación de las
  // demás (antes se hacía svg.innerHTML='' + reconstruir todas, y por
  // eso las líneas ya dibujadas "repetían" la animación al agregar una
  // nueva). createElementNS (no .innerHTML) porque un <path> insertado
  // como texto HTML no se crea en el namespace SVG y queda invisible.
  // animate=true solo la primera vez que se crea.
  function drawLine(li, ri) {
    const info = pathD(li, ri);
    if (!info) return;
    const svg = cont.querySelector('.f-unir-svg');
    let path = svg.querySelector('.f-unir-line[data-left="' + li + '"]');
    const isNew = !path;
    if (isNew) {
      path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke-width', '3');
      path.setAttribute('stroke-linecap', 'round');
      path.setAttribute('class', 'f-unir-line');
      path.setAttribute('data-left', li);
      svg.appendChild(path);
    }
    path.setAttribute('d', info.d);
    const color = lineColor(li);
    path.setAttribute('stroke', color);
    // El círculo de cada extremo toma el color de SU cuerda (en vez de
    // un índigo fijo), y solo mientras esté unida.
    document.querySelector('#' + containerId + '-L' + li + ' .f-unir-dot').style.backgroundColor = color;
    document.querySelector('#' + containerId + '-R' + ri + ' .f-unir-dot').style.backgroundColor = color;
    if (isNew) {
      // "Cuerda": se dibuja como si se jalara hasta quedar tensa
      // (stroke-dashoffset), solo al crearse por primera vez, y al
      // terminar de tensarse se sacude (bounceRope) antes de quedar
      // quieta — como una cuerda real.
      const len = path.getTotalLength();
      path.style.transition = 'none';
      path.style.strokeDasharray = len;
      path.style.strokeDashoffset = len;
      path.getBoundingClientRect(); // forzar reflow antes de animar
      path.style.transition = 'stroke-dashoffset 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)';
      path.style.strokeDashoffset = '0';
      path.addEventListener('transitionend', () => bounceRope(li, ri), { once: true });
    }
  }

  function removeLine(li, ri) {
    const svg = cont.querySelector('.f-unir-svg');
    const path = svg.querySelector('.f-unir-line[data-left="' + li + '"]');
    if (path) path.remove();
    document.querySelector('#' + containerId + '-L' + li + ' .f-unir-dot').style.backgroundColor = '';
    if (ri !== undefined) {
      const rDot = document.querySelector('#' + containerId + '-R' + ri + ' .f-unir-dot');
      if (rDot) rDot.style.backgroundColor = '';
    }
  }

  function redraw() {
    // Reposiciona TODAS las líneas existentes sin re-animarlas (usado en
    // resize) y agrega/actualiza las que falten.
    Object.keys(matches).forEach(li => drawLine(li, matches[li]));
  }

  function updateStates() {
    cont.querySelectorAll('.f-unir-item').forEach(el => el.classList.remove('f-unir-matched'));
    Object.keys(matches).forEach(li => {
      document.getElementById(containerId + '-L' + li).classList.add('f-unir-matched');
      document.getElementById(containerId + '-R' + matches[li]).classList.add('f-unir-matched');
    });
  }

  function setMatch(li, ri) {
    // cada ítem (izq. o der.) solo puede tener UNA línea a la vez: si el
    // ítem derecho ya estaba tomado por otro izquierdo, a ese otro se le
    // quita su línea (no solo el dato).
    Object.keys(matches).forEach(k => {
      if (matches[k] == ri && k != li) {
        removeLine(k);
        delete matches[k];
      }
    });
    if (matches[li] !== undefined && matches[li] != ri) {
      // reasignar el mismo izquierdo a otro derecho: se quita la línea
      // vieja (y se limpia el color del derecho que quedó huérfano) para
      // que la nueva conexión también dibuje su animación.
      removeLine(li, matches[li]);
    }
    matches[li] = ri;
    // Una nueva conexión debe verse neutra otra vez si ya se había
    // calificado antes: sin esto, el color bien/mal viejo se quedaba
    // pegado (lineColor() lo lee) aunque el par ya no fuera el mismo.
    document.getElementById(containerId + '-L' + li).classList.remove('f-unir-bien', 'f-unir-mal');
    document.getElementById(containerId + '-R' + ri).classList.remove('f-unir-bien', 'f-unir-mal');
    updateStates();
    drawLine(li, ri);
  }

  cont.addEventListener('click', event => {
    const leftEl = event.target.closest('.f-unir-left');
    if (leftEl && cont.contains(leftEl)) {
      const idx = Number(leftEl.dataset.idx);
      if (pendingLeft === idx) {
        pendingLeft = null;
        leftEl.classList.remove('f-unir-selected');
        return;
      }
      cont.querySelectorAll('.f-unir-left').forEach(el => el.classList.remove('f-unir-selected'));
      pendingLeft = idx;
      leftEl.classList.add('f-unir-selected');
      return;
    }
    const rightEl = event.target.closest('.f-unir-right');
    if (rightEl && cont.contains(rightEl)) {
      if (pendingLeft === null) return;
      setMatch(pendingLeft, Number(rightEl.dataset.idx));
      cont.querySelectorAll('.f-unir-left').forEach(el => el.classList.remove('f-unir-selected'));
      pendingLeft = null;
    }
  });

  // Doble clic sobre un ítem ya unido: deshace esa unión (quita la línea).
  cont.addEventListener('dblclick', event => {
    const item = event.target.closest('.f-unir-item.f-unir-matched');
    if (!item || !cont.contains(item)) return;
    const idx = Number(item.dataset.idx);
    const isLeft = item.classList.contains('f-unir-left');
    const li = isLeft ? idx : Object.keys(matches).find(k => matches[k] == idx);
    if (li === undefined || matches[li] === undefined) return;
    const ri = matches[li];
    delete matches[li];
    removeLine(li, ri);
    document.getElementById(containerId + '-L' + li).classList.remove('f-unir-bien', 'f-unir-mal');
    document.getElementById(containerId + '-R' + ri).classList.remove('f-unir-bien', 'f-unir-mal');
    updateStates();
  });

  window.addEventListener('resize', redraw);
  cont._folletoUnirMatches = matches;
  cont._folletoUnirRedraw = redraw;
}

function folletoValidarUnirLineas(containerId) {
  const cont = document.getElementById(containerId);
  const matches = cont._folletoUnirMatches || {};
  const total = cont.querySelectorAll('.f-unir-left').length;

  // No trazó ninguna línea: todo queda en rojo (rojo, no neutro), nota 0
  // — igual que "no marcar nada" en el resto de widgets de emparejar/
  // seleccionar.
  if (!Object.keys(matches).length) {
    cont.querySelectorAll('.f-unir-left, .f-unir-right').forEach(el => el.classList.add('f-unir-mal'));
    if (cont._folletoUnirRedraw) cont._folletoUnirRedraw();
    return 0;
  }

  let correctas = 0;
  Object.keys(matches).forEach(li => {
    const ri = matches[li];
    const acierto = String(li) === String(ri);
    document.getElementById(containerId + '-L' + li).classList.add(acierto ? 'f-unir-bien' : 'f-unir-mal');
    document.getElementById(containerId + '-R' + ri).classList.add(acierto ? 'f-unir-bien' : 'f-unir-mal');
    if (acierto) correctas++;
  });
  if (cont._folletoUnirRedraw) cont._folletoUnirRedraw();
  return total ? correctas / total : 0;
}

// ---------------------------------------------------------------------
// 1.8) Asignar literal — para preguntas tipo "Lee los siguientes X y
//    coloca el literal que corresponda a su Y", donde el PDF trae una
//    columna de ítems marcados a), b), c)... y, junto a cada elemento de
//    la columna derecha, un cuadradito de color con la letra ya escrita
//    a mano (no líneas trazadas como en folletoUnirLineas). Aquí el
//    estudiante ELIGE la letra en un <select> en vez de arrastrar una
//    línea — más fiel al diseño del PDF para este tipo de pregunta.
//    izquierda: [{ literal, texto }] — literal SIN paréntesis, ej. 'a'.
//    derecha: [{ texto, correcta }] — correcta es el literal esperado
//    ('a', 'b'...), debe coincidir con algún literal de `izquierda`.
//    colores (opcional): array de colores para las casillas de la
//    derecha (uno por fila, cíclico); por defecto los genera
//    folletoGenerarColores.
//
//    Ejemplo de uso:
//      var izquierda = [
//        { literal: 'a', texto: 'Una iniciativa que distribuye lámparas solares...' },
//        { literal: 'b', texto: 'Masilla moldeable que se convierte en goma al secarse.' },
//        { literal: 'c', texto: 'Jeringas autodescartables...' },
//      ];
//      var derecha = [
//        { texto: 'Aprovechar la energía solar en comunidades sin electricidad.', correcta: 'a' },
//        { texto: 'Reutilizar objetos dañados sin necesidad de descartarlos.', correcta: 'b' },
//        { texto: 'Más saneamiento en procesos médicos y mayor movilidad.', correcta: 'c' },
//      ];
//      folletoAsignarLiteral(izquierda, derecha, 'p4act');
//      function pregunta4() {
//        let core = folletoValidarAsignarLiteral('p4act');
//        document.getElementById('pre4a').value = (core * 1.5).toFixed(2);
//      }
//    HTML: solo necesita el contenedor vacío, ej. <div id="p4act"></div>
// ---------------------------------------------------------------------
function folletoAsignarLiteral(izquierda, derecha, containerId, colores = null) {
  const cont = document.getElementById(containerId);
  cont.classList.add('grid', 'sm:grid-cols-2', 'gap-3', 'my-3');
  // Un color por LITERAL (no por fila de la derecha): así la casilla que
  // el estudiante llena con, ej., "a" luce del mismo color que la
  // tarjeta a) de la izquierda, reforzando visualmente la asociación —
  // en vez de un color aleatorio sin relación con el literal elegido.
  const paletaLiteral = colores || folletoGenerarColores(izquierda.length);
  const colorDeLiteral = {};
  izquierda.forEach((it, i) => (colorDeLiteral[it.literal] = paletaLiteral[i % paletaLiteral.length]));
  const opcionesHtml = izquierda.map(it => `<option value="${it.literal}">${it.literal}</option>`).join('');
  const izqHtml = izquierda
    .map(it => {
      const c = colorDeLiteral[it.literal];
      return `
      <div class="f-pop rounded-2xl p-3 text-sm flex items-start gap-3 shadow-sm" style="background:${c.bg}; border:2px solid ${c.border}">
        <span class="flex-none w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-lg shadow" style="background:${c.border}">${it.literal}</span>
        <span class="flex-1 pt-1.5">${it.texto}</span>
      </div>`;
    })
    .join('');
  // La casilla de la derecha usa un gris neutro IGUAL para todas — un
  // color ligado al literal correcto (como se intentó antes) delataba la
  // respuesta con solo mirar el color, sin necesidad de razonarla.
  // Se mezcla el orden de la derecha (mezclar() normal alcanza: no
  // importa la POSICIÓN de cada tarjeta para calificar, cada <select>
  // guarda su propia respuesta correcta en data-correcta) para que no
  // coincida con el orden de la izquierda ni delate la respuesta.
  const derHtml = mezclar([...derecha])
    .map(it => `
      <div class="f-pop f-asignar-row flex items-center gap-3 bg-white rounded-2xl p-3 text-sm shadow-sm border-2 border-stone-100">
        <select class="f-asignar-select flex-none w-12 h-12 text-center text-xl font-black rounded-xl border-2 border-stone-300 text-stone-500 bg-stone-50 shadow-sm cursor-pointer" data-correcta="${it.correcta}">
          <option value="">?</option>
          ${opcionesHtml}
        </select>
        <span class="flex-1">${it.texto}</span>
        <span class="f-asignar-icono flex-none"></span>
      </div>`)
    .join('');
  // justify-center: si una columna termina siendo más corta que la otra
  // (izquierda/derecha con textos de distinto largo), sus tarjetas quedan
  // centradas verticalmente respecto a la columna más alta, en vez de
  // pegadas arriba dejando un hueco desbalanceado abajo.
  cont.innerHTML = `<div class="flex flex-col justify-center gap-2">${izqHtml}</div><div class="flex flex-col justify-center gap-2">${derHtml}</div>`;
  cont.querySelectorAll('.f-asignar-select').forEach(sel => {
    sel.addEventListener('change', () => {
      sel.classList.remove('f-asignar-bien', 'f-asignar-mal');
      sel.closest('.f-asignar-row').classList.remove('f-asignar-bien', 'f-asignar-mal');
    });
  });
}

function folletoValidarAsignarLiteral(containerId) {
  const selects = document.querySelectorAll('#' + containerId + ' .f-asignar-select');
  let correctas = 0;
  selects.forEach(sel => {
    const bien = sel.value !== '' && sel.value === sel.dataset.correcta;
    const fila = sel.closest('.f-asignar-row');
    // Se pinta la CASILLA y toda la FILA (no solo el select) — un solo
    // borde de color se perdía en el ojo; la franja completa + el ícono
    // ✓/✕ hacen mucho más notorio el acierto o el error.
    [sel, fila].forEach(el => el.classList.remove('f-asignar-bien', 'f-asignar-mal'));
    [sel, fila].forEach(el => el.classList.add(bien ? 'f-asignar-bien' : 'f-asignar-mal'));
    if (bien) correctas++;
  });
  return selects.length ? correctas / selects.length : 0;
}

// ---------------------------------------------------------------------
// Utilidad interna: mezcla un array de índices [0,1,2,...] garantizando
// que NINGUNO quede en su posición original (un "derangement"), no solo
// "revuelto en general". mezclar() sola no alcanza para folletoUnirLineas:
// con pocos ítems (3-4, lo normal en el folleto) hay bastante probabilidad
// de que el azar deje uno o más pares en la MISMA fila por pura
// coincidencia, y entonces se ve "como si no se hubiera mezclado" aunque
// sí se ejecutó mezclar(). Reintenta el mezclado hasta que ningún índice
// coincida con su posición; con 1 solo ítem no hay derangement posible
// (se deja tal cual, no hay nada que mezclar).
function mezclarSinPosicion(array) {
  if (array.length < 2) return array;
  let intento = mezclar([...array]);
  let vueltas = 0;
  while (intento.some((v, i) => v === i) && vueltas < 200) {
    intento = mezclar([...array]);
    vueltas++;
  }
  if (intento.some((v, i) => v === i)) {
    // Respaldo determinístico (siempre válido para n>=2): rotar todo un
    // lugar, así ningún índice queda en su posición original.
    intento = array.map((_, i) => array[(i + 1) % array.length]);
  }
  return intento;
}

// ---------------------------------------------------------------------
// Lienzo para dibujar (mini "Paint"): lápiz libre, línea, rectángulo,
// círculo y borrador, con colores y grosor configurables — para
// preguntas tipo "Diseña/dibuja un plano/esquema" donde un campo de
// texto no alcanza. Funciona con Pointer Events (mouse, touch y lápiz).
// config (todo opcional): { alto, colores: [hex,...] }
// ---------------------------------------------------------------------
// ---------------------------------------------------------------------
// folletoLienzo — pizarra de dibujo libre (lápiz/formas/borrador) MÁS
// texto editable. El trazo a mano y las formas se "queman" en un canvas
// base (bitmap) apenas se sueltan, como siempre; el texto en cambio se
// guarda como objeto {x, y, texto, color, fontSize} en `textos` y se
// vuelve a dibujar encima en cada render() — así se puede reabrir para
// editarlo o arrastrarlo sin dejar rastro del texto anterior. Todo eso
// (trazo terminado, forma terminada, texto creado/editado/movido/
// borrado, limpiar) empuja una foto del estado a `historial` para poder
// deshacer/rehacer.
// ---------------------------------------------------------------------
function folletoLienzo(containerId, config = {}) {
  const cont = document.getElementById(containerId);
  const alto = config.alto || 320;
  // config.colores (opcional): array de strings para fijar la paleta de
  // colores del lienzo a mano; si no se pasa, se generan 5 al azar y se
  // deja fijo el primero en negro/gris oscuro (siempre útil para trazo a
  // lápiz, no tendría sentido que saliera al azar).
  const colores = config.colores || ['#1e293b', ...folletoGenerarColores(5, { soloBorde: true })];
  cont.classList.add('f-lienzo');
  cont.innerHTML = `
    <div class="f-lienzo-toolbar">
      <div class="f-lienzo-group">
        <button type="button" class="f-lienzo-tool activo" data-tool="lapiz" title="Lápiz">✏️</button>
        <button type="button" class="f-lienzo-tool" data-tool="linea" title="Línea">📏</button>
        <button type="button" class="f-lienzo-tool" data-tool="rect" title="Rectángulo">▭</button>
        <button type="button" class="f-lienzo-tool" data-tool="circulo" title="Círculo">◯</button>
        <button type="button" class="f-lienzo-tool" data-tool="texto" title="Texto: clic en vacío para escribir, clic sobre un texto para editarlo">🔤</button>
        <button type="button" class="f-lienzo-tool" data-tool="mover" title="Mover un texto ya escrito">✋</button>
        <button type="button" class="f-lienzo-tool" data-tool="borrador" title="Borrador">🧽</button>
      </div>
      <div class="f-lienzo-group f-lienzo-colores">
        ${colores.map((c, i) => `<button type="button" class="f-lienzo-color${i === 0 ? ' activo' : ''}" data-color="${c}" style="background:${c}"></button>`).join('')}
      </div>
      <button type="button" class="f-lienzo-relleno" title="Pintar el rectángulo/círculo relleno en vez de solo el borde — para pintar recuadros de un solo trazo">🪣 Relleno</button>
      <input type="range" class="f-lienzo-grosor" min="1" max="14" value="3" title="Grosor del trazo / tamaño del texto" />
      <div class="f-lienzo-group">
        <button type="button" class="f-lienzo-deshacer" title="Deshacer" disabled>↩️</button>
        <button type="button" class="f-lienzo-rehacer" title="Rehacer" disabled>↪️</button>
      </div>
      <button type="button" class="f-lienzo-limpiar">Limpiar</button>
    </div>
    <div class="f-lienzo-canvas-wrap">
      <canvas class="f-lienzo-canvas" style="height:${alto}px"></canvas>
    </div>`;

  const canvasWrap = cont.querySelector('.f-lienzo-canvas-wrap');
  const canvas = cont.querySelector('.f-lienzo-canvas');
  const ctx = canvas.getContext('2d');
  // baseCanvas: igual tamaño que canvas, nunca se muestra — solo guarda
  // los trazos/formas ya terminados. render() lo vuelca sobre `canvas` y
  // encima dibuja `textos`, así el texto queda siempre editable/movible
  // en vez de fundirse con el resto del dibujo.
  const baseCanvas = document.createElement('canvas');
  const baseCtx = baseCanvas.getContext('2d');
  let tool = 'lapiz';
  let color = colores[0];
  let grosor = 3;
  let relleno = false;
  let dibujando = false;
  let inicioX = 0;
  let inicioY = 0;
  let foto = null;
  let textos = [];
  let arrastrando = null; // {texto, dx, dy} mientras se mueve un texto
  let historial = [];
  let historialIndex = -1;

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(baseCanvas, 0, 0);
    textos.forEach(t => {
      if (t._editando) return;
      const caja = cajaDeTexto(t);
      ctx.font = `${t.fontSize}px sans-serif`;
      ctx.fillStyle = t.color;
      ctx.textBaseline = 'middle';
      caja.lineas.forEach((linea, i) => ctx.fillText(linea, t.x, caja.top + t.fontSize / 2 + i * caja.lineHeight));
      if (t === arrastrando?.texto) {
        ctx.save();
        ctx.setLineDash([4, 3]);
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 1;
        ctx.strokeRect(t.x - 4, caja.top - 4, caja.ancho + 8, caja.alto + 8);
        ctx.restore();
      }
    });
  }

  // Mide el bloque de un texto que puede traer varias líneas (\n): ancho
  // = la línea más larga, alto = todas las líneas apiladas. `top` es
  // donde empieza a dibujarse verticalmente para que `t.y` quede en el
  // CENTRO del bloque completo (igual que un texto de una sola línea
  // quedaba centrado en t.y antes de admitir saltos de línea).
  function cajaDeTexto(t) {
    ctx.font = `${t.fontSize}px sans-serif`;
    const lineas = t.texto.split('\n');
    const lineHeight = t.fontSize * 1.25;
    const alto = lineas.length * lineHeight;
    const ancho = Math.max(...lineas.map(l => ctx.measureText(l).width), 1);
    return { lineas, lineHeight, ancho, alto, top: t.y - alto / 2 };
  }

  const deshacerBtn = cont.querySelector('.f-lienzo-deshacer');
  const rehacerBtn = cont.querySelector('.f-lienzo-rehacer');
  function actualizarBotonesHistorial() {
    deshacerBtn.disabled = historialIndex <= 0;
    rehacerBtn.disabled = historialIndex >= historial.length - 1;
  }
  function guardarHistorial() {
    historial = historial.slice(0, historialIndex + 1);
    historial.push({ base: baseCanvas.toDataURL(), textos: JSON.parse(JSON.stringify(textos)) });
    historialIndex = historial.length - 1;
    actualizarBotonesHistorial();
  }
  function restaurar(snapshot) {
    textos = JSON.parse(JSON.stringify(snapshot.textos));
    const img = new Image();
    img.onload = () => {
      baseCtx.clearRect(0, 0, baseCanvas.width, baseCanvas.height);
      baseCtx.drawImage(img, 0, 0);
      render();
    };
    img.src = snapshot.base;
  }
  function deshacer() {
    if (historialIndex <= 0) return;
    historialIndex--;
    restaurar(historial[historialIndex]);
    actualizarBotonesHistorial();
  }
  function rehacer() {
    if (historialIndex >= historial.length - 1) return;
    historialIndex++;
    restaurar(historial[historialIndex]);
    actualizarBotonesHistorial();
  }
  deshacerBtn.addEventListener('click', deshacer);
  rehacerBtn.addEventListener('click', rehacer);

  // inicializado (no basta con mirar baseCanvas.width): un <canvas> recién
  // creado con document.createElement ya trae ancho 300 por defecto, así
  // que esa comprobación nunca detectaba la "primera vez" y el historial
  // inicial jamás se guardaba.
  let inicializado = false;
  function ajustarTamano() {
    const anteriorUrl = inicializado ? baseCanvas.toDataURL() : null;
    canvas.width = cont.clientWidth;
    canvas.height = alto;
    baseCanvas.width = canvas.width;
    baseCanvas.height = canvas.height;
    inicializado = true;
    if (anteriorUrl) {
      const img = new Image();
      img.onload = () => {
        baseCtx.drawImage(img, 0, 0);
        render();
      };
      img.src = anteriorUrl;
    } else {
      render();
      guardarHistorial();
    }
  }
  ajustarTamano();
  window.addEventListener('resize', ajustarTamano);

  cont.querySelectorAll('.f-lienzo-tool').forEach(btn => {
    btn.addEventListener('click', () => {
      cont.querySelectorAll('.f-lienzo-tool').forEach(b => b.classList.remove('activo'));
      btn.classList.add('activo');
      tool = btn.dataset.tool;
      // El cursor da una pista de qué hará el próximo clic con cada
      // herramienta: I-beam para escribir, manito para mover un texto.
      canvas.style.cursor = tool === 'texto' ? 'text' : tool === 'mover' ? 'grab' : 'crosshair';
    });
  });
  cont.querySelectorAll('.f-lienzo-color').forEach(btn => {
    btn.addEventListener('click', () => {
      cont.querySelectorAll('.f-lienzo-color').forEach(b => b.classList.remove('activo'));
      btn.classList.add('activo');
      color = btn.dataset.color;
    });
  });
  cont.querySelector('.f-lienzo-relleno').addEventListener('click', function () {
    relleno = !relleno;
    this.classList.toggle('activo', relleno);
  });
  cont.querySelector('.f-lienzo-grosor').addEventListener('input', e => {
    grosor = +e.target.value;
  });
  cont.querySelector('.f-lienzo-limpiar').addEventListener('click', () => {
    baseCtx.clearRect(0, 0, baseCanvas.width, baseCanvas.height);
    textos = [];
    render();
    guardarHistorial();
  });

  const posicion = e => {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  // Hit-test: ¿el punto (x,y) cae dentro del recuadro de algún texto ya
  // colocado? Se recorre de atrás hacia adelante para que, si dos textos
  // se superponen, se agarre el que está "encima" (el último dibujado).
  function textoEnPunto(x, y) {
    for (let i = textos.length - 1; i >= 0; i--) {
      const t = textos[i];
      const caja = cajaDeTexto(t);
      if (x >= t.x - 4 && x <= t.x + caja.ancho + 4 && y >= caja.top - 4 && y <= caja.top + caja.alto + 4) return t;
    }
    return null;
  }

  // Abre un <textarea> flotante para crear un texto nuevo (existente=null)
  // o editar uno ya colocado (existente=objeto de `textos`). Admite
  // saltos de línea reales: Enter solo escribe una línea nueva (como en
  // cualquier textarea); para terminar hay que hacer clic afuera (blur) o
  // Ctrl+Enter / Cmd+Enter. Al confirmar con contenido se crea/actualiza
  // y se guarda en el historial; al confirmar vacío sobre uno existente,
  // se borra; Escape cancela sin tocar nada.
  function editarTexto(x, y, existente) {
    const fontSize = existente ? existente.fontSize : 10 + grosor * 3;
    const colorTexto = existente ? existente.color : color;
    if (existente) existente._editando = true;
    render();

    const lineHeight = fontSize * 1.25;
    const input = document.createElement('textarea');
    input.className = 'f-lienzo-text-input';
    input.rows = 1;
    input.placeholder = 'Escribe… (clic afuera para terminar)';
    input.value = existente ? existente.texto : '';
    input.style.left = x + 'px';
    input.style.top = y - lineHeight / 2 + 'px';
    input.style.color = colorTexto;
    input.style.fontSize = fontSize + 'px';
    input.style.lineHeight = lineHeight + 'px';
    // El campo crece solo mientras se escribe, en ancho (línea más larga)
    // y en alto (número de líneas) — measureText con la MISMA fuente que
    // se usará al sellar el texto, para que el tamaño calce con lo que se
    // ve. Así nunca queda encerrado en un cuadro chico ni hace falta un
    // control aparte para "elegir" el tamaño.
    const anchoMaximo = () => canvas.width - x - 8;
    const medirAncho = texto => {
      ctx.font = `${fontSize}px sans-serif`;
      const lineas = (texto || input.placeholder).split('\n');
      return Math.max(...lineas.map(l => ctx.measureText(l).width));
    };
    const ajustarTamano = () => {
      const numLineas = Math.max(1, input.value.split('\n').length);
      input.style.width = Math.min(anchoMaximo(), Math.max(70, medirAncho(input.value) + 24)) + 'px';
      input.style.height = numLineas * lineHeight + 10 + 'px';
    };
    ajustarTamano();
    input.addEventListener('input', ajustarTamano);
    canvasWrap.appendChild(input);
    // setTimeout: además del preventDefault() en pointerdown, se retrasa el
    // focus() un tick para que gane siempre a cualquier reasignación de
    // foco que el navegador intente hacer como parte del propio clic.
    setTimeout(() => input.focus(), 0);
    if (existente) input.select();
    let resuelto = false;
    const confirmar = () => {
      if (resuelto) return;
      resuelto = true;
      const texto = input.value.replace(/\n+$/, '').trim();
      if (existente) {
        delete existente._editando;
        if (texto) {
          existente.texto = texto;
        } else {
          textos = textos.filter(t => t !== existente);
        }
      } else if (texto) {
        textos.push({ x, y, texto, color: colorTexto, fontSize });
      }
      input.remove();
      render();
      guardarHistorial();
    };
    const cancelar = () => {
      resuelto = true;
      if (existente) delete existente._editando;
      input.remove();
      render();
    };
    input.addEventListener('keydown', ev => {
      if (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)) {
        ev.preventDefault();
        confirmar();
      } else if (ev.key === 'Escape') {
        cancelar();
      }
    });
    input.addEventListener('blur', confirmar);
  }

  canvas.addEventListener('pointerdown', e => {
    const p = posicion(e);
    if (tool === 'texto') {
      // preventDefault: sin esto, el navegador le quita el foco al <input>
      // recién creado justo después de nuestro focus() (el foco "por
      // defecto" del mousedown termina asentándose fuera del input al
      // soltar el clic) y el blur lo cierra antes de poder escribir nada.
      e.preventDefault();
      editarTexto(p.x, p.y, textoEnPunto(p.x, p.y));
      return;
    }
    if (tool === 'mover') {
      const t = textoEnPunto(p.x, p.y);
      if (t) {
        arrastrando = { texto: t, dx: p.x - t.x, dy: p.y - t.y };
        canvas.style.cursor = 'grabbing';
        canvas.setPointerCapture(e.pointerId);
      }
      return;
    }
    dibujando = true;
    inicioX = p.x;
    inicioY = p.y;
    if (tool === 'lapiz' || tool === 'borrador') {
      baseCtx.beginPath();
      baseCtx.moveTo(p.x, p.y);
    } else {
      foto = baseCtx.getImageData(0, 0, baseCanvas.width, baseCanvas.height);
    }
    canvas.setPointerCapture(e.pointerId);
  });

  canvas.addEventListener('pointermove', e => {
    if (arrastrando) {
      const p = posicion(e);
      arrastrando.texto.x = p.x - arrastrando.dx;
      arrastrando.texto.y = p.y - arrastrando.dy;
      render();
      return;
    }
    if (!dibujando) return;
    const p = posicion(e);
    baseCtx.lineWidth = grosor;
    baseCtx.lineCap = 'round';
    baseCtx.strokeStyle = tool === 'borrador' ? '#ffffff' : color;
    if (tool === 'lapiz' || tool === 'borrador') {
      baseCtx.lineTo(p.x, p.y);
      baseCtx.stroke();
      render();
      return;
    }
    // Formas (línea/rect/círculo): restaura la foto de antes del trazo y
    // dibuja la vista previa, así se puede ajustar arrastrando sin dejar
    // rastro de los intentos anteriores.
    baseCtx.putImageData(foto, 0, 0);
    baseCtx.beginPath();
    if (tool === 'linea') {
      baseCtx.moveTo(inicioX, inicioY);
      baseCtx.lineTo(p.x, p.y);
      baseCtx.stroke();
      render();
      return;
    }
    if (tool === 'rect') {
      baseCtx.rect(inicioX, inicioY, p.x - inicioX, p.y - inicioY);
    } else if (tool === 'circulo') {
      const radio = Math.hypot(p.x - inicioX, p.y - inicioY);
      baseCtx.arc(inicioX, inicioY, radio, 0, Math.PI * 2);
    }
    if (relleno) {
      baseCtx.fillStyle = color;
      baseCtx.fill();
    } else {
      baseCtx.stroke();
    }
    render();
  });

  ['pointerup', 'pointerleave'].forEach(evt =>
    canvas.addEventListener(evt, () => {
      if (arrastrando) {
        canvas.style.cursor = 'grab';
        arrastrando = null;
        render();
        guardarHistorial();
        return;
      }
      if (dibujando) {
        dibujando = false;
        foto = null;
        guardarHistorial();
      }
    }),
  );
}

// ---------------------------------------------------------------------
// Utilidad interna: hermanos de un elemento que calzan con un selector
// (equivalente vanilla a $(el).siblings(selector)).
// ---------------------------------------------------------------------
function siblings(el, selector) {
  return Array.from(el.parentElement.children).filter(c => c !== el && c.matches(selector));
}

// ---------------------------------------------------------------------
// Festejo al calificar: confeti cayendo + banner "¡Actividad completada!",
// justo cuando se abre el modal de "Guardar actividad" (llamado desde
// EndActivity() en funciones.js). Ambas piezas se quitan solas a los pocos
// segundos. Sin puntaje ni mensajes distintos por nota — solo el aviso.
// ---------------------------------------------------------------------
function folletoConfeti(cantidad = 60) {
  const colores = ['#f97316', '#22c55e', '#3b82f6', '#eab308', '#ec4899', '#a855f7'];
  const contenedor = document.createElement('div');
  contenedor.className = 'f-confeti-contenedor';
  for (let i = 0; i < cantidad; i++) {
    const pieza = document.createElement('span');
    pieza.className = 'f-confeti-pieza';
    pieza.style.left = Math.random() * 100 + 'vw';
    pieza.style.background = colores[i % colores.length];
    pieza.style.animationDelay = Math.random() * 0.4 + 's';
    pieza.style.animationDuration = 2.2 + Math.random() * 1.3 + 's';
    pieza.style.transform = `rotate(${Math.round(Math.random() * 360)}deg)`;
    if (Math.random() < 0.5) pieza.style.borderRadius = '50%';
    contenedor.appendChild(pieza);
  }
  document.body.appendChild(contenedor);
  setTimeout(() => contenedor.remove(), 3800);
}

function folletoBannerNota() {
  const banner = document.createElement('div');
  banner.className = 'f-banner-nota';
  banner.innerHTML = `
    <span class="f-banner-emoji">🎉</span>
    <div class="f-banner-texto"><b>¡Actividad completada!</b></div>
    <button type="button" class="f-banner-cerrar" aria-label="Cerrar">&times;</button>
  `;
  banner.querySelector('.f-banner-cerrar').addEventListener('click', () => banner.remove());
  document.body.appendChild(banner);
  requestAnimationFrame(() => banner.classList.add('f-banner-nota-visible'));
  setTimeout(() => banner.remove(), 2500);
}

// Dispara el confeti + el banner "¡Actividad completada!" al calificar
// (sin mostrar puntaje ni mensajes distintos por nota).
function folletoCelebrarCalificacion() {
  folletoConfeti();
  folletoBannerNota();
}
