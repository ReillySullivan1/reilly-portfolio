(function () {
  var list = document.getElementById('dotsA11yList');
  if (!list) return;

  var shapeMap = { friends: 'triangle', family: 'circle', work: 'square', community: 'diamond', partner: 'hexagon' };

  var state = { size: 'default', shapes: false };

  var shapeToggle = document.getElementById('dotsA11yShapeToggle');

  function render() {
    list.setAttribute('data-size', state.size);
    list.querySelectorAll('.dots-a11y-row').forEach(function (row) {
      var person = row.getAttribute('data-person');
      var cue = row.querySelector('.dots-a11y-cue');
      cue.className = 'dots-a11y-cue ' + (state.shapes ? 'dots-a11y-cue--' + shapeMap[person] : 'dots-a11y-cue--circle');
    });
    shapeToggle.textContent = state.shapes ? 'Shapes on' : 'Shapes off';
    shapeToggle.classList.toggle('is-active', state.shapes);
    shapeToggle.setAttribute('aria-pressed', String(state.shapes));
  }

  document.querySelectorAll('.dots-a11y-seg-btn[data-size]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.dots-a11y-seg-btn[data-size]').forEach(function (b) { b.classList.remove('is-active'); });
      btn.classList.add('is-active');
      state.size = btn.getAttribute('data-size');
      render();
    });
  });

  shapeToggle.addEventListener('click', function () {
    state.shapes = !state.shapes;
    render();
  });

  render();
})();
