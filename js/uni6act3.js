var cont = 1,
  ejer = 1,
  itemsT = 10,
  cor = 0,
  inc = 0,
  calificacion = 10;

///// NUMERO DE ACTIVIDAD Y AYUDAS Y PAGINA
// Actividad "Aprendo y me divierto" (El manuscrito perdido del origen +
// Diseño de dietas): no trae puntaje autocalificable; los espacios del
// manuscrito y el informe nutricional son respuestas abiertas que revisa
// el docente. Las respuestas del PDF (texto en color oliva y "R. M.") son
// del docente y no se muestran.
var ayudasActividad = [
  '<b>En El manuscrito perdido del origen,</b> recuerden las teorías de la panspermia y de Oparin-Haldane.    <br>',
  '<b>En Diseño de dietas,</b> lean con atención el caso de Sofía.    <br>',
  '<b>En el Informe,</b> justifiquen cada comida con sus biomoléculas.    <br>',
];
var unidad = '6';
document.getElementById('numTema').textContent = unidad;
document.getElementById('temaActividad').innerHTML =
  '<img src="img/ico_aprendo_y_me_divierto.png" alt="" class="inline-block h-14 w-auto align-middle mr-1" onerror="this.style.display=\'none\'">' +
  '<span style="font-family:\'Caveat\',\'Segoe Script\',cursive; font-weight:700; font-size:2rem">' +
  '<span style="color:#3fa535">Aprendo</span> <span style="color:#273583">y me</span> <span style="color:#e94e0e">divierto</span>' +
  '</span>';
document.querySelector('.panel-heading').classList.add('panel-heading-aprendo-divierto');
document.getElementById('n_pagina').textContent = '28';
document.querySelectorAll('.numeroTemaColor').forEach(el => el.classList.add(`unidad${unidad}numeroTema`));
document.querySelectorAll('.temaColor').forEach(el => el.classList.add(`unidad${unidad}tema`));
document.querySelector('.temaColor').remove();
document.querySelector('.numeroTemaColor').remove();
/// FIN NUMERO DE ACTIVIDAD Y AYUDAS Y PAGINA

// El manuscrito perdido del origen: texto corrido con espacios en blanco
// (raya libre, sin `correcta` = R. A., lo revisa el docente). Tarjetas sin
// fondo propio (transparent) para que se vea el pergamino del PDF detrás;
// el color oliva de la raya calca el del folleto.
var coloresManuscrito = [{ bg: 'transparent', border: '#8f822b' }];
folletoOracionesConEspacio(
  [
    {
      segmentos: [
        'Entre las muchas conjeturas sobre el origen de la vida en nuestro orbe, una de las más audaces postula que no surgió aquí, en la propia Tierra, sino que llegó desde las vastas y frías extensiones del ',
        {},
        '. Esta idea, conocida como ',
        {},
        ', sugiere que las "semillas" de la vida, en forma de microorganismos o sus precursores, viajaron a través del espacio.',
      ],
    },
    {
      segmentos: [
        'Uno de sus primeros defensores modernos fue el químico sueco ',
        {},
        ' a principios del siglo XX. Él imaginó que esporas microscópicas, impulsadas por la ',
        {},
        ', podían viajar de un sistema estelar a otro, colonizando nuevos mundos. La evidencia de este concepto se ha fortalecido con el descubrimiento de ',
        {},
        ' en meteoritos, sugiriendo que los bloques constructores de la vida pueden formarse y sobrevivir fuera de la Tierra.',
      ],
    },
  ],
  'p1manuscrito1',
  coloresManuscrito,
);
folletoOracionesConEspacio(
  [
    {
      segmentos: [
        'En los albores de lo que hoy llamamos la Tierra, miles de millones de años antes de que el hombre la pisara, nuestro planeta era un lugar ',
        {},
        '. No había oxígeno libre en su atmósfera, un gas que hoy consideramos esencial para la vida compleja. En cambio, los cielos estaban cargados de gases como el ',
        {},
        ', el ',
        {},
        ' y el vapor de agua.',
      ],
    },
    {
      segmentos: [
        'La superficie, aún caliente de su formación, era azotada por constantes ',
        {},
        ' y una intensa radiación ultravioleta proveniente de un sol joven. Fue en este ambiente inhóspito, pero energético, donde un pensador ruso llamado ',
        {},
        ' y un británico, ',
        {},
        ', propusieron que la vida surgió de un proceso gradual de reacciones químicas.',
      ],
    },
  ],
  'p1manuscrito2',
  coloresManuscrito,
);

// Diseño de dietas: el caso de Sofía (texto dentro de la mancha verde del PDF)
folletoLectura(
  {
    parrafos: [
      'Sofía es una estudiante universitaria de 20 años que vive en Ecuador. Tiene un horario muy apretado entre clases, estudios y un trabajo a tiempo parcial. Frecuentemente se siente cansada y con poca energía, especialmente a media tarde. Suele saltarse el desayuno y come muchos <i>snacks</i> procesados y comida rápida por conveniencia. Le preocupa su salud a largo plazo y quiere mejorar su alimentación para tener más energía y concentración. No tiene alergias alimentarias conocidas, pero le gustaría incorporar más vegetales.',
    ],
    clase: 'bg-green-100 !rounded-[3rem] !p-6',
  },
  'p2caso',
);

function total() {
  const nota = document.querySelector('.nota');
  if (nota) nota.classList.add('alertanotafinal');
  EndActivity();
}
