// Reescrito a JS nativo (sin jQuery). El funciones.js original de la
// editorial tiene ~5700 líneas con widgets de muchos tipos de actividad
// (crucigramas, sopas de letras, arrastrar imágenes, etc.) que ninguna de
// las 12 actividades de este proyecto usa — todas están construidas con los
// widgets propios de folleto-widgets.js. De ese archivo solo quedan, ya
// verificados por grep contra los 12 uniNactM.js/html, los que sí se usan:
// el llenado de las etiquetas .puntoN / .c-d, EndActivity() (la llaman
// todos los total()), addText() (la llama builder.js) y
// validarNumerosExactos() (la usa uni6act1.js, pregunta 1).

document.querySelectorAll('.punto10').forEach(el => (el.innerHTML = '&emsp;&emsp;( 10 pts. ) '));
document.querySelectorAll('.punto9').forEach(el => (el.innerHTML = '&emsp;&emsp;( 9 pts. ) '));
document.querySelectorAll('.punto8').forEach(el => (el.innerHTML = '&emsp;&emsp;( 8 pts. ) '));
document.querySelectorAll('.punto7').forEach(el => (el.innerHTML = '&emsp;&emsp;( 7 pts. ) '));
document.querySelectorAll('.punto6').forEach(el => (el.innerHTML = '&emsp;&emsp;( 6 pts. ) '));
document.querySelectorAll('.punto5').forEach(el => (el.innerHTML = '&emsp;&emsp;( 5 pts. ) '));
document.querySelectorAll('.punto4').forEach(el => (el.innerHTML = '&emsp;&emsp;( 4 pts. ) '));
document.querySelectorAll('.punto35').forEach(el => (el.innerHTML = '&emsp;&emsp;( 3,5 pts. ) '));
document.querySelectorAll('.punto3').forEach(el => (el.innerHTML = '&emsp;&emsp;( 3 pts. ) '));
document.querySelectorAll('.punto25').forEach(el => (el.innerHTML = '&emsp;&emsp;( 2,5 pts. ) '));
document.querySelectorAll('.punto2').forEach(el => (el.innerHTML = '&emsp;&emsp;( 2 pts. ) '));
document.querySelectorAll('.punto15').forEach(el => (el.innerHTML = '&emsp;&emsp;( 1,5 pts. ) '));
document.querySelectorAll('.punto125').forEach(el => (el.innerHTML = '&emsp;&emsp;( 1,25 pts. ) '));
document.querySelectorAll('.punto025').forEach(el => (el.innerHTML = '&emsp;&emsp;( 0,25 pts. ) '));
document.querySelectorAll('.punto05').forEach(el => (el.innerHTML = '&emsp;&emsp;( 0,5 pts. ) '));
document.querySelectorAll('.punto075').forEach(el => (el.innerHTML = '&emsp;&emsp;( 0,75 pts. ) '));
document.querySelectorAll('.punto1').forEach(el => (el.innerHTML = '&emsp;&emsp;( 1 pt. ) '));
document.querySelectorAll('.c-d').forEach(el => (el.innerHTML = 'Actividad calificada por tu docente'));

function EndActivity() {
  var toggleOcultar = document.getElementById('toggle-btn-navbar-Ocultar');
  if (toggleOcultar) toggleOcultar.click();
  var btComprobar = document.getElementById('bt_comprobar');
  if (btComprobar) btComprobar.disabled = true;
  var txtAlumno = document.getElementById('txtAlumno');
  if (txtAlumno) txtAlumno.disabled = false;
  document.getElementsByClassName('btnCalificar')[0]?.parentElement?.classList.add('display-none');
  document.querySelectorAll('.panel-body').forEach(el => el.classList.add('fin-actividad'));
  document.querySelectorAll('.info').forEach(el => (el.style.display = 'none'));
  document.querySelectorAll('.nota-abierta').forEach(el => el.classList.add('backnoabierta'));
  document.querySelectorAll('.selectbox1').forEach(el => (el.style.border = 'none'));
  document.querySelectorAll('textarea.no-redimensionar').forEach(el => el.classList.add('textarea-blanco'));
  document.querySelectorAll('textarea.form-control').forEach(el => el.classList.add('textarea-blanco'));

  document.querySelectorAll('.nota-abierta').forEach(element => {
    if (element.value == '0') element.value = '';
  });
  // Confeti + banner de nota (folleto-widgets.js) justo al abrir el modal
  // de "Guardar actividad" — el festejo visual de haber calificado.
  if (typeof folletoCelebrarCalificacion === 'function') folletoCelebrarCalificacion();
  modalShow(document.getElementById('myModal'));
}

// llama addText('N','p{N}campoTexto') para N=1-8,10-12 desde builder.js. OJO:
// "inputClass" (p{N}campoTexto) NO debe ir directo en un <textarea> — el
// contenedor tiene que ser un <div> vacío, esta función le mete el
// <textarea> real después (ver la misma nota en folleto-widgets.js,
// folletoRutinaBurbujas).
function addText(row = '1', divClass) {
  var data = `<textarea class="form-control no-redimensionar" rows="${row}" placeholder="Escribir"></textarea>`;
  document.querySelectorAll('.' + divClass).forEach(el => (el.innerHTML = data));
}

/////VALIDAR SOLO NÚMEROS
//let core = validarNumerosExactos(["6", "9"], "#p1num");
function validarNumerosExactos(respuestas, id) {
  let core = 0;
  for (let i = 0; i < respuestas.length; i++) {
    const el = document.querySelector(`${id}${i}`);
    if (!el || el.value === '') {
      if (el) el.classList.add('mal');
    } else {
      if (el.value == respuestas[i]) {
        core++;
        el.classList.add('bien');
      } else {
        el.classList.add('mal');
      }
    }
  }
  return core / respuestas.length;
}
