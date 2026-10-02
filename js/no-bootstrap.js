/* =========================================================================
   NO-BOOTSTRAP SHIM (JS nativo, sin jQuery)
   funciones.js/builder.js/helper.js llaman conceptualmente a
   $(...).modal('show'|'hide'); aquí se reimplementan como dos funciones
   globales (modalShow/modalHide) y la delegación de clics de
   data-dismiss="modal" / data-toggle="modal" que Bootstrap resolvía solo.
   ========================================================================= */
function modalShow(el) {
  if (el) el.classList.add('in', 'show');
}

function modalHide(el) {
  if (el) el.classList.remove('in', 'show');
}

document.addEventListener('click', function (e) {
  var dismiss = e.target.closest('[data-dismiss="modal"]');
  if (dismiss) {
    modalHide(dismiss.closest('.modal'));
    return;
  }

  var toggle = e.target.closest('[data-toggle="modal"]');
  if (toggle) {
    var targetSel = toggle.getAttribute('data-target');
    if (targetSel) modalShow(document.querySelector(targetSel));
    return;
  }

  // Cerrar el modal al hacer clic en el fondo oscuro (fuera del cuadro).
  if (e.target.classList && e.target.classList.contains('modal')) {
    modalHide(e.target);
  }
});
