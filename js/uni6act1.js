var cont = 1,
  ejer = 1,
  itemsT = 10,
  cor = 0,
  inc = 0,
  calificacion = 10;

///// NUMERO DE ACTIVIDAD Y AYUDAS Y PAGINA
// Actividad de Enzimas: el poder de la transformación (práctica con piña y
// gelatina): no trae puntaje autocalificable, todas sus respuestas son
// abiertas (R. A.) y la práctica y su informe los revisa el docente
// directamente sobre el trabajo del estudiante. Las "R. M." del PDF son del
// docente y no se muestran.
var ayudasActividad = [
  '<b>En Sumérgete en el mundo,</b> lean sobre la bromelina de la piña.    <br>',
  '<b>En Entraña el problema,</b> piensen en lo que comen cada día.    <br>',
  '<b>En Imaginación sin límites,</b> recuerden: se controlan las variables.    <br>',
  '<b>En Da forma a tus ideas,</b> reúnan todos los recursos antes de empezar.    <br>',
  '<b>En Paso a paso,</b> etiqueten bien cada placa Petri.    <br>',
  '<b>En Prueba y evoluciona,</b> marquen Sí, No o DM en cada criterio.    <br>',
];
var unidad = '6';
document.getElementById('numTema').textContent = unidad;
document.getElementById('temaActividad').innerHTML = `
<span class="tema-inclusion">
  <span class="txt-creando-juntos">Creando</span>
  <img src="img/ico_creando_juntos.png" alt="" class="tema-logo-inclusion">
  <span class="txt-creando-juntos">juntos</span>
</span>`;
document.querySelector('.panel-heading').classList.add('panel-heading-creando-juntos');
document.getElementById('n_pagina').textContent = '24';
document.querySelectorAll('.numeroTemaColor').forEach(el => el.classList.add(`unidad${unidad}numeroTema`));
document.querySelectorAll('.temaColor').forEach(el => el.classList.add(`unidad${unidad}tema`));
var wrapUnidad = document.createElement('div');
wrapUnidad.className = 'unidad-tag';
document.querySelector('.temaColor').replaceWith(wrapUnidad);
document.querySelector('.numeroTemaColor').remove();
wrapUnidad.innerHTML = '<img src="img/ico_unidad' + unidad + '.png" alt="Unidad ' + unidad + '" class="unidad-img">';
/// FIN NUMERO DE ACTIVIDAD Y AYUDAS Y PAGINA

// Títulos de sección con su ícono y píldora de color, como en el PDF
// (folletoTituloSeccion, folleto-widgets.js).
folletoTituloSeccion('sumergete', 'tSumergete');
folletoTituloSeccion('entrana', 'tEntrana');
folletoTituloSeccion('imaginacion', 'tImaginacion');
folletoTituloSeccion('daforma', 'tDaforma');
folletoTituloSeccion('recursos', 'tRecursos');
folletoTituloSeccion('pasoapaso', 'tPasoapaso');
folletoTituloSeccion('prueba', 'tPrueba');

// Lectura: "La piña: una aliada para la digestión y el refuerzo humano"
folletoLectura(
  {
    // En el PDF este título va en morado (#542e91), no en el azul por
    // defecto de folletoLectura — el título admite HTML, se colorea aquí.
    titulo: '<span style="color:#542e91">La piña: una aliada para la digestión y el refuerzo humano</span>',
    imagen: {
      src: 'img/img1_p24_act1.png',
      alt: 'Piña partida por la mitad con dos trozos cortados.',
      // print:[.panel-body_&]:!max-h-none: misEstilos.css limita toda img a 90px de alto al
      // imprimir sin tocar el ancho, y la imagen salía aplastada en el PDF.
      clase: 'float-right w-40 sm:w-[240px] h-auto ml-3 mb-2 print:[.panel-body_&]:!max-h-none',
    },
    parrafos: [
      'Noticias recientes de <i>Infobae</i> (2025) han resaltado la importancia crucial de la salud intestinal y el papel de las enzimas digestivas en este proceso. Se destaca que, para mantener un intestino sano y un sistema inmunológico fuerte, es fundamental reponer lo que falta: enzimas y nutrientes esenciales.',
      'Un ejemplo notable es la piña, que contiene una enzima potente llamada bromelina. Esta enzima es proteolítica, lo que significa que tiene la capacidad de descomponer las proteínas en componentes más pequeños, cumpliendo una función similar a la de enzimas presentes en nuestro estómago, como la pepsina, que inicia la digestión de las proteínas.',
      'Además de facilitar la digestión en el tracto gastrointestinal, la bromelina ha sido estudiada por sus propiedades antiinflamatorias y su potencial para apoyar la salud general.',
    ],
    clase: 'bg-violet-50',
  },
  'p1lectura',
);

// Prueba y evoluciona: autoevaluación Sí / No / Debo mejorar
var criteriosEvaluacion = [
  'Los pasos se ejecutaron con precisión, siguiendo instrucciones detalladas y demostrando cuidado y organización.',
  'Se realizaron observaciones sistemáticas y detalladas a lo largo del tiempo, registrando cambios precisos y relevantes.',
  'Los resultados se relacionan con principios científicos, como la acción de la bromelina y la desnaturalización de proteínas y se vinculan claramente con el proceso de digestión humana.',
  'El experimento me permitió reflexionar sobre mis hábitos alimenticios diarios y su influencia en mi energía y capacidad de concentración para estudiar y realizar otras actividades.',
];
folletoEvaluarTabla(criteriosEvaluacion, 'p2evaltabla');

function total() {
  const nota = document.querySelector('.nota');
  if (nota) nota.classList.add('alertanotafinal');
  EndActivity();
}
