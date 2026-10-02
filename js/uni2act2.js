var cont = 1,
  ejer = 1,
  itemsT = 10,
  cor = 0,
  inc = 0,
  calificacion = 10;

///// NUMERO DE ACTIVIDAD Y AYUDAS Y PAGINA
// Actividad de STEAMission (proyecto "Nuevas energías", Fase 1): no trae
// puntaje autocalificable, las respuestas de Indagar son abiertas (R. A.) y
// el diagrama de flujo y el mapa interactivo los revisa el docente. Las
// "R. M." del PDF son del docente y no se muestran.
var ayudasActividad = [
  '<b>En Identificar,</b> lean sobre el uso de la biomasa.    <br>',
  '<b>En Indagar,</b> busquen datos del Ecuador en fuentes confiables.    <br>',
  '<b>En Diseñar,</b> unan cada causa con su consecuencia.    <br>',
  '<b>En Implementar,</b> creen cada dato en una capa distinta.    <br>',
  '<b>En Evaluar,</b> marquen Sí, No o DM en cada criterio.    <br>',
  '<b>En Difundir,</b> usen mensajes cortos y claros.    <br>',
];
var unidad = '2';
document.getElementById('numTema').textContent = unidad;
document.getElementById('temaActividad').innerHTML =
  '<img src="img/ico_steam_mission.png" alt="" class="inline-block h-14 w-auto align-middle mr-1" onerror="this.style.display=\'none\'">';
document.getElementById('n_pagina').textContent = '10';
document.querySelectorAll('.numeroTemaColor').forEach(el => el.classList.add(`unidad${unidad}numeroTema`));
document.querySelectorAll('.temaColor').forEach(el => el.classList.add(`unidad${unidad}tema`));
document.querySelector('.temaColor').remove();
document.querySelector('.numeroTemaColor').remove();
/// FIN NUMERO DE ACTIVIDAD Y AYUDAS Y PAGINA

// Identificar: lectura "Uso de la biomasa para cocinar en las zonas rurales"
folletoLectura(
  {
    // En el PDF este título va en marrón rojizo (#762414), no en el azul
    // por defecto de folletoLectura — el título admite HTML, se colorea aquí.
    titulo: '<span style="color:#762414">Uso de la biomasa para cocinar en las zonas rurales</span>',
    imagen: {
      src: 'img/img3_p10_act1.jpg',
      alt: 'Olla con papas y choclos cocinándose sobre un fogón de leña.',
      // print:[.panel-body_&]:!max-h-none: misEstilos.css limita toda img a 90px de alto al
      // imprimir sin tocar el ancho, y la imagen salía aplastada en el PDF.
      clase: 'float-right w-40 sm:w-[280px] h-auto rounded-[2rem] ml-3 mb-2 print:[.panel-body_&]:!max-h-none',
    },
    parrafos: [
      'En las zonas rurales, la biomasa, como la leña, los residuos agrícolas y el estiércol, se utiliza con frecuencia como combustible para cocinar, especialmente en hogares que no tienen acceso a fuentes de energía más limpias, como el gas o la electricidad. Aunque la biomasa es una fuente de energía renovable y puede ser una opción viable en áreas remotas, su uso plantea importantes desafíos, como la contaminación del aire en interiores, riesgos para la salud y la contribución a la deforestación. En el Ecuador, el uso de biomasa, especialmente leña y carbón, sigue siendo una práctica común en las zonas rurales. Esta costumbre está profundamente ligada a tradiciones culturales y gastronómicas, pero también refleja la falta de acceso a alternativas energéticas más limpias y eficientes. Sin embargo, su uso sostenido representa un problema tanto para la salud pública como para el medio ambiente.',
    ],
    clase: 'bg-orange-50 border-2 border-dashed border-orange-200',
  },
  'p1lectura',
);

// Evaluar: autoevaluación Sí/No/Debo mejorar (R. A.), no se autocalifica.
var p2criterios = [
  'El mapa presenta entre cuatro y cinco capas de datos relevantes, de forma precisa y completa.',
  'La información es sumamente clara, fácil de interpretar y permite visualizar de manera evidente los patrones de desigualdad.',
  'El diseño del mapa es visualmente atractivo, organizado y profesional, con una paleta de colores coherente y una estructura intuitiva.',
  'La elaboración del mapa transformó mi perspectiva personal sobre el consumo de energía en mi vida cotidiana.',
];
folletoEvaluarTabla(p2criterios, 'p2evaltabla');

function total() {
  const nota = document.querySelector('.nota');
  if (nota) nota.classList.add('alertanotafinal');
  EndActivity();
}
