// Reescrito a JS nativo (sin jQuery). Se conserva todo lo que las 12
// actividades de este proyecto usan de verdad: la barra flotante, el panel
// de ayudas, el modal "Guardar actividad", el encabezado con Tema/Página
// (solo la rama bg-aplicacion, que es la única clase que usan estas
// actividades), addText() para los campos p{N}campoTexto y el lector de
// voz (Escuchar/Detener). Se eliminó todo lo que ninguna de las 12
// actividades dispara: coevaluación, autorregulación, "Reflexiono sobre mi
// aprendizaje", vocabulario, ficha diagnóstica, AniJS (no hay ningún
// data-anijs en estos archivos) y los manejadores de clases de widgets
// legado (literalEncerrar, marcarX, pintarMultiple, etc.) que ya
// reemplazaron los widgets folletoX de folleto-widgets.js.

document.body.insertAdjacentHTML(
  'afterbegin',
  `
    <div id="nota-informativa" class="nota-ayuda info">
        <button class="btnAudiotext" id="btnEscuchar">Escuchar</button>
        <button class="btnAudiotext" id="btnPausarleer">Detener</button>
        <button type="button" class="close" onclick="cerrar_ayuda()" aria-label="Close">
            <span class="glyphicon glyphicon-remove-sign" aria-hidden="true"></span>
        </button>
        <div id="mensaje"></div>
    </div>

    <nav class="navbar" id="navbar">
      <ul class="nav" style="position:relative">
            <li>
                <button class="btn button btnHelp mytooltip" data-info="Mostrar ayuda de la actividad"
                    onclick="mostrar_ayuda()">
                    <span class="glyphicon glyphicon-question-sign" aria-hidden="true"></span>
                </button>
            </li>
            <li>
                <button class="btn button button_1 btnGuardar mytooltip" data-info="Guardar en local"
                    onclick="save_open_activity_to_local_no_name()">
                    <span class="glyphicon glyphicon-floppy-save" aria-hidden="true"></span>
                </button>
            </li>
            <li>
                <button class="btn button button_2 btnRepetir mytooltip" data-info="Repetir"
                    onclick="location.reload()">
                    <span class="glyphicon glyphicon-refresh" aria-hidden="true"></span>
                </button>
            </li>
            <li>
                <button class="btn button button_3 btnCalificar mytooltip" data-info="Calificar / Comprobar"
                    id="bt_comprobar" onclick="total();">
                    <span class="glyphicon glyphicon-check" aria-hidden="true"></span>
                </button>
            </li>
            <li>
                <button class="btn button btn_Ayudas hvr-icon-pop mytooltip" onclick="mostrarAyudaSecuencial()"
                    data-info="Ayudas">
                    <span class="glyphicon glyphicon-info-sign" aria-hidden="true"></span>
                </button>
            </li>
            <button id="toggle-btn-navbar-Ocultar" class="btn btn-danger"><i>X</i></button>
        </ul>
    </nav>

     <button id="toggle-btn-navbar">☰</button>`,
);

document.querySelector('.container').insertAdjacentHTML(
  'beforeend',
  `<div class="modal fade animated pulse" id="myModal" role="dialog">
          <div class="modal-dialog">
              <div class="modal-content">
                  <div class="modal-header">
                      <button type="button" class="close" onclick="modalHide(document.getElementById('myModal'))">&times;</button>
                      <h4 class="modal-title">Guardar la actividad en su máquina local</h4>
                  </div>
                  <div class="modal-body">
                      <form id="modal_form" class="form-horizontal">
                          <div class="form-group ">
                              <div class="col-sm-2">
                                  <label id="lbl_nombre" for="txtAlumno">Alumno: </label>
                              </div>
                              <div class="col-sm-10">
                                  <input type="text" class="form-control nombre " id="txtAlumno"
                                      placeholder="Ingrese el nombre del alumno">
                                  <div class="alert alert-danger display-none" id="txtAlumnoAlert" role="alert">
                                      <button type="button" class="close" onclick="modalHide(document.getElementById('myModal'))"
                                          aria-label="Close"><span aria-hidden="true">&times;</span></button>
                                      <span class="glyphicon glyphicon-info-sign error-color" aria-hidden="true"></span>
                                      Por favor ingrese el nombre. Es obligatorio
                                  </div>
                              </div>
                          </div>
                      </form>
                  </div>
                  <div class="modal-footer">
                      <button type="button" class="btn btn-success" id="gnr-pdf"
                          onclick="save_open_activity_to_local('txtAlumno')">Guardar</button>
                      <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>
                  </div>
              </div>
          </div>
      </div>`,
);

// Definir encabezado para la actividad (solo la rama bg-aplicacion: es la
// única clase de .panel-heading que usan las 12 actividades de este kit).
var encabezado = '';
var panelHeading = document.querySelector('.panel-heading');
if (panelHeading.classList.contains('bg-diagnostica')) {
  encabezado = `
  <tr>
      <td>
        <center>
          <span class="tituloActividad" id="temaActividad"></span>
        </center>
      </td>
      <td style="width:100px;margin:1px 5px;text-align: right;">
          <span class="notificacion pagina">
              Pág <i id="n_pagina" class="pagina"></i>
          </span>
      </td>
  </tr>`;
} else if (panelHeading.classList.contains('bg-aplicacion')) {
  encabezado = `
  <tr>
      <td>
          <span class="titulotema temaColor">Tema</span><span class="titulotema numeroTemaColor" id="numTema"></span>
          <span class="tituloActividad" id="temaActividad"></span>
      </td>
      <td style="width:100px;margin:1px 5px;text-align: right;">
          <span class="notificacion pagina">
              Pág <i id="n_pagina" class="pagina"></i>
          </span>
      </td>
  </tr>`;
} else if (panelHeading.classList.contains('bg-sumativa')) {
  encabezado = `
  <tr>
      <td rowspan="2">
        <img src="img/ico_sumativa.png" alt="">
      </td>
      <td>
          <span class="tituloActividad" id="temaActividad"></span>
      </td>
      <td style="width:100px;margin:1px 5px;text-align: right;">
          <span class="notificacion pagina">
              Pág <i id="n_pagina" class="pagina"></i>
          </span>
      </td>
  </tr>`;
} else if (panelHeading.classList.contains('bg-mentes')) {
  encabezado = `
  <tr>
      <td rowspan="2">
        <img src="img/ico_mentes.png" alt="" style="width: 250px">
      </td>
      <td>
          <span class="tituloActividad" id="temaActividad"></span>
      </td>
      <td style="width:100px;margin:1px 5px;text-align: right;">
          <span class="notificacion pagina">
              Pág <i id="n_pagina" class="pagina"></i>
          </span>
      </td>
  </tr>`;
}

panelHeading.innerHTML = `
  <table style="width: 100%" class="encabezadoInfo">
    ${encabezado}
    <tr>
      <td>
      </td>
      <td style="width:100px;margin:1px 5px;text-align: right;">
        <span class="notificacion nota">
          Nota <span id="txtNota" class="nota">__ / 10</span>
        </span>
      </td>
    </tr>
    <tr>
      <td>
        <div class="nombreEstudiante txtAlumno display-none" id="nombre_alumno">Alumno: </div>
      </td>
    </tr>
  </table>
`;

//////MOSTRAR AYUDAS DE LOS ICONOS

var iconosAyuda = [
  {
    boton: 'btnHelp',
    icono: '<span class="glyphicon glyphicon-question-sign" aria-hidden="true"></span>',
    texto:
      'Proporciona las ayudas para resolver cada actividad.<div class="glyphicon glyphicon-remove-circle cerrarAyudas" style="color:red;font-size:2.5rem;float:right"></div>',
  },
  {
    boton: 'btnGuardar',
    icono: '<span class="glyphicon glyphicon-floppy-save" aria-hidden="true"></span>',
    texto:
      'Descarga en un archivo PDF las actividades sin calificar.<div class="glyphicon glyphicon-remove-circle cerrarAyudas" style="color:red;font-size:2.5rem;float:right"></div>',
  },
  {
    boton: 'btnRepetir',
    icono: '<span class="glyphicon glyphicon-refresh" aria-hidden="true"></span>',
    texto:
      'Refresca las actividades; se eliminará el progreso de cada una.<div class="glyphicon glyphicon-remove-circle cerrarAyudas" style="color:red;font-size:2.5rem;float:right"></div>',
  },
  {
    boton: 'btnCalificar',
    icono: '<span class="glyphicon glyphicon-check" aria-hidden="true"></span>',
    texto:
      'Realiza la calificación de las actividades y guarda el documento como un archivo PDF.<div class="glyphicon glyphicon-remove-circle cerrarAyudas" style="color:red;font-size:2.5rem;float:right"></div>',
  },
];

document.addEventListener('DOMContentLoaded', function () {
  iconosAyuda.forEach(function (element, index) {
    var boton = document.querySelector('.' + element.boton);
    if (!boton) return;
    boton.parentElement.insertAdjacentHTML(
      'beforeend',
      `<div class="infoAyuda infoAyuda${index}" style="position:absolute;left:60px;border:solid 1px silver;width:250px;text-align:left;top:0px;background-color:#E5E5E5;border-radius:5px;padding:5px">${element.icono} ${element.texto}</div>`,
    );
  });
});

var controlAyudas = true;
var timeouts = []; // Arreglo para almacenar los IDs de los temporizadores

document.addEventListener('click', function (e) {
  if (!e.target.closest('.cerrarAyudas')) return;
  document.querySelectorAll('.infoAyuda').forEach(el => (el.style.display = 'none'));
  document.querySelectorAll('.btn_Ayudas').forEach(el => (el.disabled = false));
  controlAyudas = false;
  timeouts.forEach(timeout => clearTimeout(timeout));
});

function mostrarAyudaSecuencial() {
  controlAyudas = true; // Reinicia el control al iniciar
  document.querySelectorAll('.btn_Ayudas').forEach(el => (el.disabled = true));
  for (let i = 0; i < iconosAyuda.length; i++) {
    const timeoutId = setTimeout(() => {
      if (!controlAyudas) return; // Interrumpe la función si controlAyudas es false
      document.querySelectorAll('.infoAyuda' + i).forEach(el => (el.style.display = 'block'));

      setTimeout(() => {
        if (controlAyudas) {
          document.querySelectorAll('.infoAyuda' + i).forEach(el => (el.style.display = 'none'));
        }
      }, 3000);
    }, i * 3500);
    timeouts.push(timeoutId);
    localStorage.setItem('ayudasVisto', true);
  }

  setTimeout(
    () => {
      if (controlAyudas) {
        document.querySelectorAll('.btn_Ayudas').forEach(el => (el.disabled = false));
      }
    },
    iconosAyuda.length * 3500 + 3000,
  );
}

const ayudasVisto = localStorage.getItem('ayudasVisto');
if (ayudasVisto != 'true') {
  document.addEventListener('DOMContentLoaded', function () {
    var toggle = document.getElementById('toggle-btn-navbar');
    if (toggle) toggle.addEventListener('click', () => mostrarAyudaSecuencial());
  });
}

document.addEventListener('DOMContentLoaded', function () {
  const navbar = document.getElementById('navbar');
  const toggleBtn = document.getElementById('toggle-btn-navbar');
  const activity = document.getElementById('toggle-btn-navbar-Ocultar');

  function toggleNavbar() {
    navbar.classList.toggle('visible');
  }

  toggleBtn.addEventListener('click', event => {
    toggleNavbar();
    event.preventDefault();
  });

  toggleBtn.addEventListener('click', () => {
    toggleBtn.classList.toggle('hidden');
  });

  activity.addEventListener('click', event => {
    toggleNavbar();
    cerrar_ayuda();
    toggleBtn.classList.toggle('hidden');
    event.preventDefault();

    document.querySelectorAll('.infoAyuda').forEach(el => (el.style.display = 'none'));
    document.querySelectorAll('.btn_Ayudas').forEach(el => (el.disabled = false));
    controlAyudas = false;
    timeouts.forEach(timeout => clearTimeout(timeout));
  });

  document.querySelectorAll('.numPregunta').forEach(el => {
    if (el.parentElement) el.parentElement.style.margin = '10px 0px';
  });

  addText('1', 'p1campoTexto');
  addText('2', 'p2campoTexto');
  addText('3', 'p3campoTexto');
  addText('4', 'p4campoTexto');
  addText('5', 'p5campoTexto');
  addText('6', 'p6campoTexto');
  addText('7', 'p7campoTexto');
  addText('8', 'p8campoTexto');
  addText('10', 'p10campoTexto');
  addText('11', 'p11campoTexto');
  addText('12', 'p12campoTexto');

  var mensaje = document.getElementById('mensaje');
  ayudasActividad.forEach(element => {
    mensaje.insertAdjacentHTML('beforeend', element);
  });
  mensaje.insertAdjacentHTML(
    'beforeend',
    `Para evaluar y guardar el ejercicio <span class='hidden'> pulsa sobre el botón Calificar</span> <span class='glyphicon glyphicon-check' aria-hidden='true'></span>. <br>` +
      `Para repetir el ejercicio pulsa sobre <span class='hidden'> El botón Repetir</span> <span class='glyphicon glyphicon-refresh' aria-hidden='true'></span>. <br>` +
      `Para guardar la actividad pulsa sobre <span class='hidden'> El botón Guardar</span> <span class='glyphicon glyphicon-floppy-save' aria-hidden='true'></span>`,
  );

  var botoncancelar = document.querySelector('#btnPausarleer');
  var botonIniciar = document.querySelector('#btnEscuchar');
  var synthesis = window.speechSynthesis;
  var utterance;
  var texto = document.getElementById('mensaje').textContent.trim();
  if ('speechSynthesis' in window) {
    botonIniciar.addEventListener('click', () => {
      utterance = new SpeechSynthesisUtterance(texto);
      synthesis.speak(utterance);
    });
    botoncancelar.addEventListener('click', () => {
      synthesis.cancel();
    });
  } else {
    console.log('Lo siento, la síntesis de voz no está soportada en este navegador.');
  }
  window.addEventListener('load', function () {
    synthesis.cancel();
  });

  botoncancelar.style.display = 'none';

  botonIniciar.addEventListener('click', () => {
    botoncancelar.style.display = '';
    botonIniciar.style.display = 'none';
  });

  botoncancelar.addEventListener('click', () => {
    botoncancelar.style.display = 'none';
    botonIniciar.style.display = '';
  });

  document.querySelectorAll('.close').forEach(el => {
    el.addEventListener('click', () => {
      synthesis.cancel();
      botoncancelar.style.display = 'none';
      botonIniciar.style.display = '';
    });
  });
  document.querySelector('.container').addEventListener('click', () => {
    cerrar_ayuda();
    synthesis.cancel();
    botoncancelar.style.display = 'none';
    botonIniciar.style.display = '';
  });

  document.querySelectorAll('.textBox').forEach(el => {
    el.innerHTML = `<textarea class="form-control no-redimensionar  hvr-grow-shadow" rows="2" placeholder="Escribir"></textarea>`;
  });

  document.addEventListener('input', function (e) {
    if (e.target.tagName !== 'TEXTAREA') return;
    e.target.style.height = 'auto';
    e.target.style.height = e.target.scrollHeight + 2 + 'px';
  });
});
