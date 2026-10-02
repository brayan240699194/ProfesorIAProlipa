// Reescrito a JS nativo (sin jQuery). Solo se conservan las 3 funciones que
// helper.js usa realmente en el flujo de "Guardar actividad"
// (save_open_activity_to_local / save_open_activity_to_local_no_name):
// valida_existe, ocultar_by_class y mostrar_by_class. El resto del archivo
// original (carga de selects aleatorios, calificación de textos, títulos por
// tipo de actividad "reflexiono/aplico/exploro/...", etc.) no lo usa ninguna
// de las 12 actividades de este proyecto — se eliminó para no migrar código
// muerto a JS nativo.

//valida si existe algun valor ingresado
function valida_existe(htmlElementId) {
  var element = document.getElementById(htmlElementId);
  var alert = document.getElementById(htmlElementId + 'Alert');
  if (element.value == '') {
    element.classList.add('no-valid');
    alert.classList.remove('display-none');
    return false;
  } else {
    element.classList.remove('no-valid');
    alert.classList.add('display-none');
    return true;
  }
}

//oculta elementos de la misma clase
function ocultar_by_class(className) {
  var elements = document.getElementsByClassName(className);
  for (var i = 0; i < elements.length; i++) {
    elements[i].classList.add('display-none');
  }
}

function mostrar_by_class(className) {
  var elements = document.getElementsByClassName(className);
  for (var i = 0; i < elements.length; i++) {
    elements[i].classList.remove('display-none');
  }
}
