var cont = 1,
  ejer = 1,
  itemsT = 10,
  cor = 0,
  inc = 0,
  calificacion = 10;

///// NUMERO DE ACTIVIDAD Y AYUDAS Y PAGINA
// Actividad de STEAMission (proyecto "Nuevas energías", Fase 2: Prototipos
// del futuro): no trae puntaje autocalificable; el organizador gráfico, el
// boceto, la maqueta y el video los revisa el docente directamente sobre el
// trabajo del estudiante.
var ayudasActividad = [
  '<b>En Identificar,</b> lean la historieta viñeta por viñeta.    <br>',
  '<b>En Indagar,</b> busquen datos de su provincia.    <br>',
  '<b>En Diseñar,</b> elijan una sola energía renovable.    <br>',
  '<b>En Implementar,</b> usen materiales reciclados y seguros.    <br>',
  '<b>En Evaluar,</b> marquen Sí, No o DM en cada criterio.    <br>',
  '<b>En Difundir,</b> dejen que los asistentes toquen la maqueta.    <br>',
];
var unidad = '4';
document.getElementById('numTema').textContent = unidad;
document.getElementById('temaActividad').innerHTML =
  '<img src="img/ico_steam_mission.png" alt="" class="inline-block h-14 w-auto align-middle mr-1" onerror="this.style.display=\'none\'">';
document.getElementById('n_pagina').textContent = '18';
document.querySelectorAll('.numeroTemaColor').forEach(el => el.classList.add(`unidad${unidad}numeroTema`));
document.querySelectorAll('.temaColor').forEach(el => el.classList.add(`unidad${unidad}tema`));
document.querySelector('.temaColor').remove();
document.querySelector('.numeroTemaColor').remove();
/// FIN NUMERO DE ACTIVIDAD Y AYUDAS Y PAGINA

// Evaluar: autoevaluación Sí/No/Debo mejorar (R. A.), no se autocalifica.
var p2criterios = [
  'La solución elegida es altamente pertinente al contexto de Ecuador.',
  'Demuestra una comprensión profunda del funcionamiento técnico de la solución energética elegida.',
  'La producción del contenido (video) es de alta calidad y comunica de manera sobresaliente los beneficios ambientales.',
  'La construcción de la maqueta permitió tomar decisiones para contribuir a un futuro más sostenible.',
];
folletoEvaluarTabla(p2criterios, 'p2evaltabla');

function total() {
  const nota = document.querySelector('.nota');
  if (nota) nota.classList.add('alertanotafinal');
  EndActivity();
}
