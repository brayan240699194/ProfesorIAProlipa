var cont = 1,
  ejer = 1,
  itemsT = 10,
  cor = 0,
  inc = 0,
  calificacion = 10;

///// NUMERO DE ACTIVIDAD Y AYUDAS Y PAGINA
// Actividad de Ciencia del movimiento (simulación del desgaste muscular): no
// trae puntaje autocalificable, todas sus respuestas son abiertas (R. A.) y
// la simulación y el afiche los revisa el docente directamente sobre el
// trabajo del estudiante. Las "R. M." del PDF son del docente y no se
// muestran.
var ayudasActividad = [
  '<b>En Sumérgete en el mundo,</b> lean sobre el sedentarismo en Ecuador.    <br>',
  '<b>En Entraña el problema,</b> piensen en su rutina diaria.    <br>',
  '<b>En Imaginación sin límites,</b> recuerden: simular es imitar lo real.    <br>',
  '<b>En Da forma a tus ideas,</b> reúnan todos los recursos antes de empezar.    <br>',
  '<b>En Paso a paso,</b> comparen el modelo activo con el sedentario.    <br>',
  '<b>En Prueba y evoluciona,</b> marquen Sí, No o DM en cada criterio.    <br>',
];
var unidad = '5';
document.getElementById('numTema').textContent = unidad;
document.getElementById('temaActividad').innerHTML = `
<span class="tema-inclusion">
  <span class="txt-creando-juntos">Creando</span>
  <img src="img/ico_creando_juntos.png" alt="" class="tema-logo-inclusion">
  <span class="txt-creando-juntos">juntos</span>
</span>`;
document.querySelector('.panel-heading').classList.add('panel-heading-creando-juntos');
document.getElementById('n_pagina').textContent = '20';
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

// Lectura: "El sedentarismo postpandemia pone en jaque la salud ósea y muscular en Ecuador"
folletoLectura(
  {
    // En el PDF este título va en morado (#542e91), no en el azul por
    // defecto de folletoLectura — el título admite HTML, se colorea aquí.
    titulo:
      '<span style="color:#542e91">El sedentarismo postpandemia pone en jaque la salud ósea y muscular en Ecuador</span>',
    imagen: {
      src: 'img/img2_p20_act1.jpg',
      alt: 'Joven sentada en un sofá comiendo comida rápida frente a una pantalla.',
      // print:[.panel-body_&]:!max-h-none: misEstilos.css limita toda img a 90px de alto al
      // imprimir sin tocar el ancho, y la imagen salía aplastada en el PDF.
      clase: 'float-right w-40 sm:w-[280px] h-auto rounded-[2rem] ml-3 mb-2 print:[.panel-body_&]:!max-h-none',
    },
    parrafos: [
      'Un reciente informe de la Organización Mundial de la Salud (OMS) revela una alarmante tendencia global que ya resuena en Ecuador: el aumento de enfermedades osteomusculares debido a los cambios en los estilos de vida postpandemia. Largas horas frente a pantallas, la drástica reducción de la actividad física y la proliferación del teletrabajo han consolidado al sedentarismo como una amenaza silenciosa que debilita progresivamente nuestros huesos, músculos y articulaciones. Médicos ecuatorianos están observando un preocupante incremento en consultas por dolores crónicos de espalda, cuello y hombros, además de casos de osteoporosis en edades cada vez más tempranas. La población debe retomar hábitos saludables, como la actividad física regular, una dieta balanceada rica en calcio y vitamina D, y mantener una postura consciente, para proteger el futuro de nuestro sistema osteomuscular.',
    ],
    cita: 'OMS, 2024.',
    clase: 'bg-white',
  },
  'p1lectura',
);

// Prueba y evoluciona: autoevaluación Sí / No / Debo mejorar
var criteriosEvaluacion = [
  'Todos los pasos del procedimiento se desarrollaron correctamente, con autonomía y cuidado.',
  'Se registraron observaciones completas y detalladas, utilizando un lenguaje adecuado y ordenado.',
  'La conclusión científica fue bien elaborada, basada en la simulación del experimento.',
  'La experimentación práctica me permitió tomar decisiones conscientes sobre los hábitos necesarios para mantener el cuerpo fuerte y saludable.',
];
folletoEvaluarTabla(criteriosEvaluacion, 'p2evaltabla');

function total() {
  const nota = document.querySelector('.nota');
  if (nota) nota.classList.add('alertanotafinal');
  EndActivity();
}
