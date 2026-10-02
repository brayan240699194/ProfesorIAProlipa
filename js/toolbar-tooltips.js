/* =========================================================================
   Tooltips de la barra flotante (#navbar): comportamiento adicional que
   el simple CSS :hover no puede resolver por sí solo:
   1) Al hacer clic en un icono, el tooltip debe desaparecer al instante
      (no esperar a que el mouse se retire).
   2) Mientras el panel que ese icono abre siga desplegado (la ayuda
      "#nota-informativa", el recorrido guiado ".infoAyuda", o el modal
      "#myModal"), el tooltip de ese icono no debe volver a aparecer.
   Reescrito a JS nativo (sin jQuery). No modifica funciones.js/builder.js —
   solo agrega/quita la clase "no-tip" (estilada en no-bootstrap.css) sobre
   los botones ya existentes.
   ========================================================================= */
(function () {
  function setAttrAll(sel, attr, val) {
    document.querySelectorAll(sel).forEach(function (el) {
      el.setAttribute(attr, val);
    });
  }
  function setTextAll(sel, text) {
    document.querySelectorAll(sel).forEach(function (el) {
      el.textContent = text;
    });
  }

  // builder.js trae "Mostrar ayuda de la actividad" en el botón ❓ y
  // "Ayudas" en el botón ℹ️ — casi lo mismo, y al revés de cómo se leen
  // los iconos. Se renombra el data-info (el propio texto del tooltip)
  // sin tocar builder.js: ❓ = Ayudas (las pistas de cada pregunta),
  // ℹ️ = Info (el recorrido que explica qué hace cada botón).
  setAttrAll('.btnHelp', 'data-info', 'Ayudas');
  setAttrAll('.btn_Ayudas', 'data-info', 'Info');
  setAttrAll('.btnGuardar', 'data-info', 'Guardar');
  setAttrAll('.btnRepetir', 'data-info', 'Reiniciar');
  setAttrAll('.btnCalificar', 'data-info', 'Calificar');

  // Modal "Guardar la actividad en su máquina local" (builder.js): título
  // más corto para que no se encime con la "x", etiqueta más cercana y el
  // botón "Close" traducido — sin tocar builder.js, solo el texto ya
  // puesto en el DOM.
  setTextAll('.modal-title', 'Guarda tu actividad');
  setTextAll('#lbl_nombre', '¿Cómo te llamas?');
  var txtAlumno = document.getElementById('txtAlumno');
  if (txtAlumno) txtAlumno.setAttribute('placeholder', 'Escribe tu nombre aquí');
  setTextAll('.modal-footer [data-dismiss="modal"]', 'Cerrar');

  // La insignia "Unidad N" (Postlectura) y su remoción (STEAMission/Para
  // grandes problemas) ahora se ponen directo en cada uniNactM.js, igual
  // que el ícono de sección — ya no se detectan por sniffing aquí.

  function algoDesplegado() {
    var nota = document.getElementById('nota-informativa');
    var modal = document.getElementById('myModal');
    var infoVisible = Array.prototype.some.call(document.querySelectorAll('.infoAyuda'), function (el) {
      return el.offsetParent !== null;
    });
    return (nota && nota.classList.contains('nota-visible')) || infoVisible || (modal && modal.classList.contains('show'));
  }

  // mouseenter/mouseleave no burbujean, así que se enganchan directo en
  // cada botón (son estáticos: builder.js ya los creó antes de que este
  // script corra).
  document.querySelectorAll('#navbar .mytooltip').forEach(function (el) {
    el.addEventListener('mouseenter', function () {
      if (algoDesplegado()) el.classList.add('no-tip');
    });
    el.addEventListener('click', function () {
      el.classList.add('no-tip');
    });
    el.addEventListener('mouseleave', function () {
      setTimeout(function () {
        if (!algoDesplegado()) el.classList.remove('no-tip');
      }, 60);
    });
  });
})();

/* =========================================================================
   Clase con un personaje de la ciencia (js/entrevista/): recreación con IA
   (Charles Darwin o Rosalind Franklin) abajo a la derecha de TODAS las
   actividades que cargan este archivo, sin agregar nada en cada HTML. Da la
   clase junto a una pizarra y el estudiante le pregunta por voz o
   escribiendo. Solo en páginas de actividad (#activity con la barra de
   builder.js); entrevista.js evita cargarse dos veces. Personajes e IA:
   js/entrevista/config.js.
   Al cambiar archivos de js/entrevista/ (menos config.js), subir el ?v= de
   abajo y el de toolbar-tooltips.js en los HTML.
   ========================================================================= */
(function () {
  if (!document.getElementById('activity') || !document.getElementById('navbar')) return;
  var yo = document.currentScript && document.currentScript.src;
  if (!yo) return;
  var s = document.createElement('script');
  s.src = yo.split('?')[0].replace(/[^/]*$/, '') + 'entrevista/entrevista.js?v=14';
  s.defer = true;
  document.body.appendChild(s);
})();
