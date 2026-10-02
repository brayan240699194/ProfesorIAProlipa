var cont = 1,
  ejer = 1,
  itemsT = 10,
  cor = 0,
  inc = 0,
  calificacion = 10;

///// NUMERO DE ACTIVIDAD Y AYUDAS Y PAGINA
// Actividad "Aprendo y me divierto" (La ruta del bocado + Sistema urinario):
// Las dos preguntas se autocalifican (5 pts c/u): La ruta del bocado con
// folletoValidarExactas (orden correcto de las fases) y la tabla del
// Sistema urinario con folletoTablaMarcar. Las respuestas del PDF (números
// y X) no se muestran al estudiante.
var ayudasActividad = [
  '<b>En La ruta del bocado,</b> elijan el número 1 para lo que ocurre en la boca.    <br>',
  '<b>En Sistema urinario,</b> una función puede tener varias estructuras.    <br>',
];
var unidad = '6';
document.getElementById('numTema').textContent = unidad;
document.getElementById('temaActividad').innerHTML =
  '<img src="img/ico_aprendo_y_me_divierto.png" alt="" class="inline-block h-14 w-auto align-middle mr-1" onerror="this.style.display=\'none\'">' +
  '<span style="font-family:\'Caveat\',\'Segoe Script\',cursive; font-weight:700; font-size:2rem">' +
  '<span style="color:#3fa535">Aprendo</span> <span style="color:#273583">y me</span> <span style="color:#e94e0e">divierto</span>' +
  '</span>';
document.querySelector('.panel-heading').classList.add('panel-heading-aprendo-divierto');
document.getElementById('n_pagina').textContent = '31';
document.querySelectorAll('.numeroTemaColor').forEach(el => el.classList.add(`unidad${unidad}numeroTema`));
document.querySelectorAll('.temaColor').forEach(el => el.classList.add(`unidad${unidad}tema`));
document.querySelector('.temaColor').remove();
document.querySelector('.numeroTemaColor').remove();
/// FIN NUMERO DE ACTIVIDAD Y AYUDAS Y PAGINA

// La ruta del bocado: las 8 fases en el MISMO orden y lugar que en el PDF
// (no en el orden correcto), cada una con el color de su franja.

var fases = [
  { color: '#243f8e', texto: 'El alimento llega al estómago, donde es mezclado vigorosamente y comienza la digestión de proteínas.' },
  { color: '#f36f20', texto: 'La mayor parte de los nutrientes digeridos son absorbidos a la sangre a través de las vellosidades.' },
  { color: '#40ad48', texto: 'La comida es masticada y mezclada con saliva, iniciando la digestión de carbohidratos.' },
  { color: '#00a9aa', texto: 'El quimo es neutralizado y recibe enzimas digestivas del páncreas y bilis del hígado.' },
  { color: '#532e91', texto: 'El bolo alimenticio es transportado desde la boca hasta el estómago por movimientos musculares.' },
  { color: '#00adef', texto: 'Los restos no digeridos se almacenan temporalmente antes de ser eliminados.' },
  { color: '#0066b2', texto: 'El material de desecho final es expulsado del cuerpo.' },
  { color: '#b41d8d', texto: 'Las heces, compuestas por material no digerido y agua, se forman y compactan.' },
];
function tarjetaFase(f, i) {
  return `
    <div class="relative bg-white rounded-b-2xl border border-t-0 shadow-sm pt-7 pb-4 px-4 text-sm leading-relaxed" style="border-color:${f.color}">
      <div class="absolute top-0 left-0 right-0 h-4 rounded-t-md" style="background:${f.color}"></div>
      <select id="p1num${i}" aria-label="Número de la fase"
        class="p1select absolute -top-4 left-3 w-12 h-10 rounded-full bg-white border-2 font-bold text-base cursor-pointer appearance-none focus:outline-none"
        style="border-color:${f.color}; color:${f.color}; text-align:center; text-align-last:center"></select>
      <p>${f.texto}</p>
    </div>`;
}
// El índice global (i) da el id de cada círculo: p1num0 ... p1num7, en el
// mismo orden del arreglo `fases` (y de p1respuestas, abajo).
document.getElementById('p1fases').innerHTML = fases.slice(0, 6).map((f, i) => tarjetaFase(f, i)).join('');
document.getElementById('p1fases2').innerHTML = fases.slice(6).map((f, i) => tarjetaFase(f, i + 6)).join('');
// Cada círculo es un <select> con los números 1 a 8 (en orden, más fácil
// de ubicar que mezclados) y "?" como opción inicial, que cabe en el círculo.
folletoAsignarOpcionesSelect(['1', '2', '3', '4', '5', '6', '7', '8'], '.p1select', { placeholder: '?', mezclar: true });

// Orden correcto de cada tarjeta (según el PDF), en el mismo orden de `fases`.
var p1respuestas = ['3', '5', '1', '4', '2', '7', '8', '6'];
function pregunta1() {
  let core = folletoValidarExactas(p1respuestas, '#p1num');
  let puntos = core * 5;
  document.getElementById('pre1a').value = puntos.toFixed(2);
  return puntos;
}


// tablamarcar

var celdaFuncion = texto => ({ texto: texto, bg: '#d4eefc', color: '#231f20' });
folletoTablaMarcar(
  {
    columnas: [
      { titulo: 'Función / Estructura', color: '#d4eefc', textColor: '#00aeef' },
      { titulo: 'Riñón', color: '#e3f0dd', textColor: '#40ad49', fondo: '#f4f9f2' },
      { titulo: 'Uréter', color: '#fee6d3', textColor: '#f27921', fondo: '#fef6ee' },
      { titulo: 'Vejiga', color: '#d3d3e7', textColor: '#24408f', fondo: '#eeeef6' },
      { titulo: 'Uretra', color: '#ead8ca', textColor: '#762414', fondo: '#f7f1eb' },
      { titulo: 'Nefrona', color: '#f6dace', textColor: '#f27921', fondo: '#fcf1ec' },
      { titulo: 'Glomérulo', color: '#d5eded', textColor: '#00accd', fondo: '#eff8f9' },
      { titulo: 'Túbulo contorneado proximal', color: '#fee5d2', textColor: '#f37346', fondo: '#fef5ee' },
    ],
    filas: [
      { celda: celdaFuncion('Filtración de la sangre'), resp: ['Riñón', 'Nefrona', 'Glomérulo'] },
      { celda: celdaFuncion('Almacenamiento de orina'), resp: ['Vejiga'] },
      { celda: celdaFuncion('Transporte de orina a la vejiga'), resp: ['Uréter'] },
      { celda: celdaFuncion('Reabsorción de glucosa'), resp: ['Nefrona', 'Túbulo contorneado proximal'] },
      { celda: celdaFuncion('Expulsión de orina del cuerpo'), resp: ['Uretra'] },
    ],
    marca: 'X',
    ajustarAncho: false,
    anchosCol: ['20%', '10%', '10%', '10%', '10%', '10%', '12%', '18%'],
  },
  'p2tabla',
);

// Puntajes: pregunta 1 (La ruta del bocado) = 5 pts y pregunta 2 (tabla
// del Sistema urinario) = 5 pts, ambas autocalificadas.
function pregunta2() {
  let core = folletoValidarTablaMarcar('p2tabla');
  let puntos = core * 5;
  document.getElementById('pre2a').value = puntos.toFixed(2);
  return puntos;
}

function total() {
  // cor = puntos autocalificados; Calculo_nota() (Utilitario.js) los
  // escribe en #txtNota del encabezado (con itemsT = calificacion = 10,
  // la nota mostrada es igual a cor).
  cor = pregunta1() + pregunta2();
  Calculo_nota();
  EndActivity();
}
