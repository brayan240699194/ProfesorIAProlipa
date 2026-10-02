var cont = 1,
  ejer = 1,
  itemsT = 10,
  cor = 0,
  inc = 0,
  calificacion = 10;

///// NUMERO DE ACTIVIDAD Y AYUDAS Y PAGINA
// Actividad de Taxonomía activa (tarjetas didácticas de los seis reinos): no
// trae puntaje autocalificable, todas sus respuestas son abiertas (R. A.) y
// las tarjetas y la presentación oral las revisa el docente directamente
// sobre el trabajo del estudiante. Las "R. M." del PDF son del docente y no
// se muestran.
var ayudasActividad = [
  '<b>En Sumérgete en el mundo,</b> observen los seis reinos de la vida.    <br>',
  '<b>En Entraña el problema,</b> piensen en las células y la nutrición.    <br>',
  '<b>En Imaginación sin límites,</b> recuerden: concepto adelante, respuesta atrás.    <br>',
  '<b>En Da forma a tus ideas,</b> reúnan todos los recursos antes de empezar.    <br>',
  '<b>En Paso a paso,</b> sigan el ejemplo de la tarjeta del gorrión.    <br>',
  '<b>En Prueba y evoluciona,</b> marquen Sí, No o DM en cada criterio.    <br>',
];
var unidad = '3';
document.getElementById('numTema').textContent = unidad;
document.getElementById('temaActividad').innerHTML = `
<span class="tema-inclusion">
  <span class="txt-creando-juntos">Creando</span>
  <img src="img/ico_creando_juntos.png" alt="" class="tema-logo-inclusion">
  <span class="txt-creando-juntos">juntos</span>
</span>`;
document.querySelector('.panel-heading').classList.add('panel-heading-creando-juntos');
document.getElementById('n_pagina').textContent = '12';
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

// Lectura: "Importancia de la clasificación taxonómica" (sin imagen propia:
// la figura "Los seis reinos de la vida" va al lado, en el HTML)
folletoLectura(
  {
    // En el PDF este título va en azul oscuro (#24408f), no en el azul por
    // defecto de folletoLectura — el título admite HTML, se colorea aquí.
    titulo: '<span style="color:#24408f">Importancia de la clasificación taxonómica</span>',
    parrafos: [
      'La clasificación taxonómica es un sistema universal que utilizan los científicos para organizar y categorizar la inmensa diversidad de seres vivos en la Tierra. Funciona como un árbol jerárquico que agrupa a los organismos según características comunes, desde categorías amplias hasta niveles muy específicos. En su nivel más general, esta clasificación comienza con los reinos, que agrupan a los seres vivos en función de diferencias fundamentales como la estructura celular, el tipo de nutrición y la organización corporal. Este sistema proporciona un marco esencial para comprender las relaciones evolutivas entre todas las formas de vida.',
    ],
    clase: 'bg-white',
  },
  'p1lectura',
);

// Prueba y evoluciona: autoevaluación Sí / No / Debo mejorar
var criteriosEvaluacion = [
  'Las tarjetas presentan imágenes nítidas, información completa y precisa.',
  'La tarjeta muestra cada especie justificada con criterios taxonómicos claros (morfológicos/genéticos) bien explicados.',
  'La presentación oral tiene un estructura lógica, fluida y bien comunicada.',
  'Las tarjetas me permitieron comprender cómo se clasifican y nombran los seres vivos y a tomar decisiones informadas sobre el mundo que me rodea.',
];
folletoEvaluarTabla(criteriosEvaluacion, 'p2evaltabla');

function total() {
  const nota = document.querySelector('.nota');
  if (nota) nota.classList.add('alertanotafinal');
  EndActivity();
}
