// Reescrito a JS nativo (sin jQuery). Se conservan solo las funciones que
// realmente se disparan: mostrar_ayuda/cerrar_ayuda (botón "?" del navbar),
// save_open_activity_to_local_no_name (botón Guardar del navbar) y
// save_open_activity_to_local (botón Guardar del modal que abre
// EndActivity al calificar). full_screen_change y
// demoFromHTML/getPdf/save_to_pdf(comentado) no se usan: el botón de
// pantalla completa siempre está oculto (style="display: none
// !important;") en las 12 actividades, así que se eliminó junto con
// screenfull.js.

document.querySelectorAll('.nota-abierta').forEach(function (el) {
  el.setAttribute('readonly', 'true');
  el.value = 0;
});

function mostrar_ayuda() {
  var panel = document.getElementById('nota-informativa');
  if (panel) panel.classList.add('nota-visible');
}

function cerrar_ayuda() {
  var panel = document.getElementById('nota-informativa');
  if (panel) panel.classList.remove('nota-visible');
}

// Genera el PDF de la actividad: oculta la navegación/UI y llama a
// window.print() (el envío de la nota a la API de Prolipa se mantiene tal
// cual estaba, es un POST informativo, no bloquea el flujo si falla).
function save_to_pdf(htmlElementId) {
  var nota = parseInt(document.getElementById('txtNota').textContent);
  var libro = '236';
  var pagina = document.getElementById('n_pagina').textContent;
  var html = self.location.href.match(/\/([^/]+)$/)[1];

  fetch('https://prolipadigital.com.ec/software/PlataformaProlipa/public/api/notaEstudiante', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ nota: nota, libro: libro, pagina: pagina, html: html }),
  })
    .then(function (result) {
      console.log(result);
    })
    .catch(function () { });

  modalHide(document.getElementById('myModal'));

  window.print();
}

// coloca el nombre del alumno en el div nombre_alumno y genera el PDF con
// la actividad (botón "Guardar" del modal que abre EndActivity al calificar)
function save_open_activity_to_local(alumno) {
  var nom = document.getElementById(alumno);
  var nombreAlumno = document.getElementById('nombre_alumno');
  if (nombreAlumno) nombreAlumno.classList.add('no-valid');
  if (valida_existe(alumno)) {
    if (nombreAlumno) {
      nombreAlumno.classList.remove('no-valid');
      nombreAlumno.append('   ' + nom.value);
      nombreAlumno.removeAttribute('hidden');
    }
    var botonera = document.getElementById('botonera');
    if (botonera) botonera.style.display = 'none';
    ocultar_by_class('ocultable');
    ocultar_by_class('f-banner-nota');
    mostrar_by_class('txtAlumno');
    save_to_pdf('activity');
    nom.value = '';
    modalHide(document.getElementById('myModal'));
  }
  mostrar_by_class('ocultable');
}

//// guardar actividad sin nombre
function save_open_activity_to_local_no_name() {
  var toggleOcultar = document.getElementById('toggle-btn-navbar-Ocultar');
  if (toggleOcultar) toggleOcultar.click();

  var nombreAlumno = document.getElementById('nombre_alumno');
  if (nombreAlumno) {
    nombreAlumno.classList.remove('no-valid');
    nombreAlumno.append('');
    nombreAlumno.removeAttribute('hidden');
  }
  var botonera = document.getElementById('botonera');
  if (botonera) botonera.style.display = 'none';

  ocultar_by_class('ocultable');
  mostrar_by_class('txtAlumno');
  save_to_pdf('activity');
  modalHide(document.getElementById('myModal'));
  mostrar_by_class('ocultable');
}
