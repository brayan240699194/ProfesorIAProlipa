var cont = 1,
  ejer = 1,
  itemsT = 10,
  cor = 0,
  inc = 0,
  calificacion = 10;

///// NUMERO DE ACTIVIDAD Y AYUDAS Y PAGINA
// Actividad de El origen de la vida: ciencia, ideas y debate: no trae
// puntaje autocalificable, todas sus respuestas son abiertas (R. A.) y el
// debate/póster final lo revisa el docente directamente sobre el trabajo
// del estudiante. Las "R. M." del PDF son del docente y no se muestran.
var ayudasActividad = [
  '<b>En la primera pregunta,</b> comparen la energía que aportan los microrrayos con la de los rayos de gran intensidad y sus ondas de choque.    <br>',
  '<b>En la segunda pregunta,</b> piensen en qué condiciones de un planeta (volcanes, tipo de atmósfera) harían posibles los microrrayos.    <br>',
  '<b>En la tercera pregunta,</b> relacionen la idea del caldo primordial con los lugares donde las moléculas pueden concentrarse y reaccionar.    <br>',
  '<b>En Da forma a tus ideas,</b> sigan el paso a paso para preparar el debate y el póster comparativo con su equipo.    <br>',
  '<b>En Prueba y evoluciona,</b> marquen Sí, No o Debo mejorar en cada criterio y escriban lo que deben mejorar.    <br>',
];
var unidad = '1';
document.getElementById('numTema').textContent = unidad;
document.getElementById('temaActividad').innerHTML = `
<span class="tema-inclusion">
  <span class="txt-creando-juntos">Creando</span>
  <img src="img/ico_creando_juntos.png" alt="" class="tema-logo-inclusion">
  <span class="txt-creando-juntos">juntos</span>
</span>`;
document.querySelector('.panel-heading').classList.add('panel-heading-creando-juntos');
document.getElementById('n_pagina').textContent = '4';
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

// Lectura: "Microrrayos pudieron haber desatado la vida en la Tierra primitiva"
folletoLectura(
  {
    titulo: 'Microrrayos pudieron haber desatado la vida en la Tierra primitiva',
    imagen: {
      src: 'img/img5_p4_act1.jpg',
      alt: 'Ilustración de la Tierra primitiva con volcanes, rayos y un océano.',
      // print:[.panel-body_&]:!max-h-none: misEstilos.css limita toda img a 90px de alto al
      // imprimir sin tocar el ancho, y la imagen salía aplastada en el PDF.
      clase: 'float-right w-40 sm:w-[250px] h-auto rounded-full ml-3 mb-2 print:[.panel-body_&]:!max-h-none',
    },
    parrafos: [
      'Nuevas investigaciones sugieren que los "microrrayos", pequeñas descargas eléctricas presentes en las nubes volcánicas, pudieron haber sido clave en el origen de la vida. Un estudio revela que estos fenómenos habrían sido más frecuentes y eficientes que los rayos convencionales. En la Tierra primitiva, caracterizada por una intensa actividad volcánica y bajos niveles de oxígeno, las columnas de ceniza habrían generado millones de estas descargas diariamente. Estos microrrayos podrían haber facilitado la fijación del nitrógeno, dando lugar a compuestos esenciales para la vida, como el nitrito, sin las destructivas ondas de choque asociadas a los rayos de gran intensidad. Esto habría proporcionado un suministro constante de nutrientes, favoreciendo los procesos de abiogénesis. El estudio destaca la importancia de la electricidad volcánica como una fuente de energía crucial para las reacciones químicas que dieron origen a la vida.',
    ],
    cita: 'Sample, 2025.',
    clase: 'bg-white',
  },
  'p1lectura',
);

// Prueba y evoluciona: autoevaluación Sí / No / Debo mejorar
var criteriosEvaluacion = [
  'La presentación fue clara, bien estructurada y lógica.',
  'Los argumentos fueron sólidos y estuvieron respaldados con evidencia científica.',
  'El póster o resumen fue claro, visualmente atractivo y científicamente preciso.',
  'El debate me permitió aprender a escuchar y a respetar las opiniones de mis compañeros.',
];
folletoEvaluarTabla(criteriosEvaluacion, 'p2evaltabla');

function total() {
  const nota = document.querySelector('.nota');
  if (nota) nota.classList.add('alertanotafinal');
  EndActivity();
}
