function init() {
  $('#scale-slider').slider({ min: 0, max: 1000, animate: true, value: 400 });
  make_s_plane_canvas();
  analyserView1 = new AnalyserView("view1");
  initAudio();
  analyserView1.initByteBuffer();
}

window.onload = init;
