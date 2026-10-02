var cont = 1,
  ejer = 1,
  itemsT = 10,
  cor = 0,
  inc = 0,
  calificacion = 10;

///// NUMERO DE ACTIVIDAD Y AYUDAS Y PAGINA
// Actividad de Metabolismo visible (práctica experimental con levadura): no
// trae puntaje autocalificable, todas sus respuestas son abiertas (R. A.) y
// la práctica y su informe los revisa el docente directamente sobre el
// trabajo del estudiante. Las "R. M." del PDF son del docente y no se
// muestran.
var ayudasActividad = [
  '<b>En Sumérgete en el mundo,</b> lean sobre la levadura y su importancia.    <br>',
  '<b>En Entraña el problema,</b> piensen en la fermentación de la levadura.    <br>',
  '<b>En Imaginación sin límites,</b> recuerden: se prueba una hipótesis.    <br>',
  '<b>En Da forma a tus ideas,</b> usen el equipo de protección personal.    <br>',
  '<b>En Paso a paso,</b> midan los globos cada cierto tiempo.    <br>',
  '<b>En Prueba y evoluciona,</b> marquen Sí, No o DM en cada criterio.    <br>',
];
var unidad = '4';
document.getElementById('numTema').textContent = unidad;
document.getElementById('temaActividad').innerHTML = `
<span class="tema-inclusion">
  <span class="txt-creando-juntos">Creando</span>
  <img src="img/ico_creando_juntos.png" alt="" class="tema-logo-inclusion">
  <span class="txt-creando-juntos">juntos</span>
</span>`;
document.querySelector('.panel-heading').classList.add('panel-heading-creando-juntos');
document.getElementById('n_pagina').textContent = '16';
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

// Lectura: "La levadura en el vasto mundo de la Biología"
folletoLectura(
  {
    // En el PDF este título va en morado (#542e91), no en el azul por
    // defecto de folletoLectura — el título admite HTML, se colorea aquí.
    titulo: '<span style="color:#542e91">La levadura en el vasto mundo de la Biología</span>',
    imagen: {
      src: 'img/img1_p16_act1.jpg',
      alt: 'Células de levadura vistas de cerca, como esferas verdes y grises.',
      // print:[.panel-body_&]:!max-h-none: misEstilos.css limita toda img a 90px de alto al
      // imprimir sin tocar el ancho, y la imagen salía aplastada en el PDF.
      clase: 'float-right w-36 sm:w-[200px] h-auto rounded-full ml-3 mb-2 print:[.panel-body_&]:!max-h-none',
    },
    parrafos: [
      'La levadura se presenta como un microorganismo fascinante y sorprendentemente relevante para la vida tal como la conocemos. A menudo subestimada por su tamaño microscópico, esta criatura unicelular, perteneciente al reino Fungi, ha desempeñado y continúa cumpliendo roles fundamentales en los ecosistemas, en diversas industrias y, especialmente, en la comprensión de los procesos biológicos esenciales que sustentan toda forma de vida.',
      'Desde la elaboración de pan y bebidas fermentadas que han acompañado a la humanidad durante milenios, hasta su uso como modelo biológico invaluable en la investigación científica moderna, la levadura ofrece una ventana única a la complejidad y adaptabilidad de la vida a nivel celular. Su estudio no solo permite entender su propio metabolismo y reproducción, sino que también proporciona claves sobre mecanismos esenciales compartidos con organismos mucho más complejos, incluidos los seres humanos.',
    ],
    clase: 'bg-white',
  },
  'p1lectura',
);

// Prueba y evoluciona: autoevaluación Sí / No / Debo mejorar
var criteriosEvaluacion = [
  'Todos los pasos del procedimiento se llevaron a cabo con precisión y autonomía, manejando las sustancias y equipos de forma segura y eficaz.',
  'Las mediciones del diámetro se realizaron con alta exactitud y fueron registradas de manera sistemática y clara.',
  'El análisis de los resultados fue claro y profundo, evidenciando una comprensión sólida del papel de la levadura en el metabolismo de la glucosa.',
  'La experimentación práctica me permitió comprender los procesos biológicos, preparándome para futuros desafíos o innovaciones en áreas como la medicina, la biotecnología o la alimentación sostenible.',
];
folletoEvaluarTabla(criteriosEvaluacion, 'p2evaltabla');

function total() {
  const nota = document.querySelector('.nota');
  if (nota) nota.classList.add('alertanotafinal');
  EndActivity();
}
