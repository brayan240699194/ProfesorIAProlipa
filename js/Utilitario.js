// Reescrito a JS nativo (sin jQuery). Del archivo original solo se usa
// Calculo_nota() (la llaman todos los uniNactM.js en su función total()) y
// su cadena interna f_tiempo -> ComprobacionFinal. El resto (Calculo_notaQ,
// Calculo_notaCI, CalificacionAbierta, ImprimirActividad, randomico, el
// bloque de animaciones .anim/.btnIniciar, etc.) no lo usa ninguna de las
// 12 actividades — btnIniciar siempre está oculto y deshabilitado en
// builder.js, así que ese código nunca se ejecutaba de todas formas.

function Calculo_nota() {
  var total = (cor * (calificacion / itemsT)).toFixed(2);
  var txtNota = document.getElementById('txtNota');
  if (txtNota) {
    txtNota.innerHTML = total == '0.00' ? '___ / 10' : total + ' / 10';
  }
  document.querySelectorAll('.nota').forEach(function (el) {
    el.classList.add('alertanotafinal');
  });
  f_tiempo();
}

function f_tiempo() {
  setTimeout(function () {
    ComprobacionFinal();
  }, 3000);
}

// cont/ejer valen siempre 1 en las 12 actividades (una sola ronda), así que
// esta función solo llega a la rama del "else": deshabilita el botón
// Calificar y muestra el resumen de aciertos/errores si existe #trace.
function ComprobacionFinal() {
  if (cont < ejer) {
    return;
  }
  var btComprobar = document.getElementById('bt_comprobar');
  if (btComprobar) btComprobar.disabled = true;
  var trace = document.getElementById('trace');
  if (trace) {
    trace.style.display = '';
    trace.innerHTML =
      'Respuestas Correctas: <b>' + parseInt(cor) + '</b><br> Respuestas incorrectos: <b>' + parseInt(inc) + '</b>';
  }
}
