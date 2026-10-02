var cont = 1,
  ejer = 1,
  itemsT = 10,
  cor = 0,
  inc = 0,
  calificacion = 10;

///// NUMERO DE ACTIVIDAD Y AYUDAS Y PAGINA
// Actividad de STEAMission (proyecto "Nuevas energías", Fase 3: Conectar,
// construir, cambiar): no trae puntaje autocalificable; las respuestas de
// Indagar son abiertas (R. A.) y el boceto y el horno solar los revisa el
// docente. Las "R. M." del PDF son del docente y no se muestran.
var ayudasActividad = [
  '<b>En Identificar,</b> lean sobre los hornos solares.    <br>',
  '<b>En Indagar,</b> piensen en cómo se aprovecha el calor del Sol.    <br>',
  '<b>En Diseñar,</b> dibujen su horno antes de construirlo.    <br>',
  '<b>En Implementar,</b> sellen bien el horno para no perder calor.    <br>',
  '<b>En Evaluar,</b> marquen Sí, No o DM en cada criterio.    <br>',
  '<b>En Difundir,</b> muestren cómo funciona el horno.    <br>',
];
var unidad = '6';
document.getElementById('numTema').textContent = unidad;
document.getElementById('temaActividad').innerHTML =
  '<img src="img/ico_steam_mission.png" alt="" class="inline-block h-14 w-auto align-middle mr-1" onerror="this.style.display=\'none\'">';
document.getElementById('n_pagina').textContent = '26';
document.querySelectorAll('.numeroTemaColor').forEach(el => el.classList.add(`unidad${unidad}numeroTema`));
document.querySelectorAll('.temaColor').forEach(el => el.classList.add(`unidad${unidad}tema`));
document.querySelector('.temaColor').remove();
document.querySelector('.numeroTemaColor').remove();
/// FIN NUMERO DE ACTIVIDAD Y AYUDAS Y PAGINA

// Identificar: lectura "Hornos solares: una alternativa gratuita y sostenible"
folletoLectura(
  {
    // En el PDF este título va en morado (#8f499c) y en dos líneas, no en el
    // azul por defecto de folletoLectura — el título admite HTML.
    titulo: '<span style="color:#8f499c">Hornos solares:<br>una alternativa gratuita y sostenible</span>',
    imagen: {
      src: 'img/img2_p26_act1.jpg',
      alt: 'Horno solar parabólico hecho con espejos, con una olla en el centro.',
      // print:[.panel-body_&]:!max-h-none: misEstilos.css limita toda img a 90px de alto al
      // imprimir sin tocar el ancho, y la imagen salía aplastada en el PDF.
      clase: 'float-right w-40 sm:w-[240px] h-auto rounded-full ml-3 mb-2 print:[.panel-body_&]:!max-h-none',
    },
    parrafos: [
      'Los hornos solares, también conocidos como hornos biosolares, son una alternativa gratuita y sostenible para cocinar alimentos, ya que utilizan la energía del Sol en lugar de gas, leña o electricidad.',
      'Entre sus principales beneficios se destacan: el uso de una fuente de energía limpia y renovable, el ahorro económico por la reducción en el consumo de energía convencional, una cocción más saludable que conserva mejor los nutrientes de los alimentos, una mayor seguridad al no requerir fuego ni generar humo, y su fácil construcción y transporte, gracias al uso de materiales accesibles y un diseño liviano.',
      '¿Cómo se relaciona el uso de hornos solares con el cuidado del medio ambiente?',
    ],
    clase: 'bg-cyan-50',
  },
  'p1lectura',
);

// Evaluar: autoevaluación Sí/No/Debo mejorar (R. A.), no se autocalifica.
var p2criterios = [
  'La construcción del horno solar es impecable, utilizando materiales adecuados que maximizan la captación y conservación del calor.',
  'El horno funciona de manera eficiente, con una estructura bien sellada que permite una temperatura interna estable y adecuada para la cocción.',
  'El diseño del horno es creativo, funcional y relevante para el uso de energías limpias, comunicando con claridad la importancia de la sostenibilidad.',
  'La elaboración del horno solar transformó la percepción del grupo sobre el uso práctico de la energía solar y su impacto en el cuidado del ambiente.',
];
folletoEvaluarTabla(p2criterios, 'p2evaltabla');

function total() {
  const nota = document.querySelector('.nota');
  if (nota) nota.classList.add('alertanotafinal');
  EndActivity();
}
