var cont = 1,
  ejer = 1,
  itemsT = 10,
  cor = 0,
  inc = 0,
  calificacion = 10;

///// NUMERO DE ACTIVIDAD Y AYUDAS Y PAGINA
// Actividad "Aprendo y me divierto" (Detectives celulares: leer la pista y
// escribir el organelo): no trae puntaje autocalificable, las respuestas son
// abiertas y las revisa el docente. Las "R. M." del PDF son del docente y
// no se muestran.
var ayudasActividad = [
  '<b>En Detectives celulares,</b> lean cada pista y busquen el organelo en la célula.    <br>',
];
var unidad = '6';
document.getElementById('numTema').textContent = unidad;
document.getElementById('temaActividad').innerHTML =
  '<img src="img/ico_aprendo_y_me_divierto.png" alt="" class="inline-block h-14 w-auto align-middle mr-1" onerror="this.style.display=\'none\'">' +
  '<span style="font-family:\'Caveat\',\'Segoe Script\',cursive; font-weight:700; font-size:2rem">' +
  '<span style="color:#3fa535">Aprendo</span> <span style="color:#273583">y me</span> <span style="color:#e94e0e">divierto</span>' +
  '</span>';
document.querySelector('.panel-heading').classList.add('panel-heading-aprendo-divierto');
document.getElementById('n_pagina').textContent = '30';
document.querySelectorAll('.numeroTemaColor').forEach(el => el.classList.add(`unidad${unidad}numeroTema`));
document.querySelectorAll('.temaColor').forEach(el => el.classList.add(`unidad${unidad}tema`));
document.querySelector('.temaColor').remove();
document.querySelector('.numeroTemaColor').remove();
/// FIN NUMERO DE ACTIVIDAD Y AYUDAS Y PAGINA

function total() {
  const nota = document.querySelector('.nota');
  if (nota) nota.classList.add('alertanotafinal');
  EndActivity();
}
