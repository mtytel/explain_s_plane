function init() {
  analyserView1 = new AnalyserView("view1");
  initAudio();
  analyserView1.initByteBuffer();
}

window.onload = init;
