o3djs.require('o3djs.shader');

var context;
var source = 0;
var jsProcessor = 0;
var analyser;
var analyserView1;
var noise = false;

var MAX_POLES = 12;

function complex(r, i) {
  return {
    r: r,
    i: i,
    inv: function() {
      var den = r * r + i * i;
      return complex(r / den, -i / den);
    },
    neg: function() {
      return complex(-r, -i);
    },
    add: function(other) {
      return complex(r + other.r, i + other.i);
    },
    mult: function(other) {
      return complex(r * other.r - i * other.i, r * other.i + i * other.r);
    },
  };
}

function filter() {
  var ins = [];
  var outs = []
  var in_coefs = [];
  var out_coefs = [];

  for (var i = 0; i < MAX_POLES; i++) {
    ins[i] = 0;
    outs[i] = 0;
    in_coefs[i] = 0;
    out_coefs[i] = 0;
  }
  in_coefs[0] = 1;

  var setOutCoefficients = function(out_coefficients) {
    for (var i = 0; i < MAX_POLES; i++) {
      if (i < out_coefficients.length)
        out_coefs[i] = out_coefficients[i];
      else
        out_coefs[i] = 0.0;
    }
  };

  var setInCoefficients = function(in_coefficients) {
    for (var i = 0; i < MAX_POLES; i++) {
      if (i < in_coefficients.length)
        in_coefs[i] = in_coefficients[i];
      else
        in_coefs[i] = 0.0;
    }
  };

  function round(num) {
    return Math.round(num * 100) / 100;
  }

  var toFunctionString = function() {
    var total = "y(n) = " + in_coefs[0] + "x(n)";
    for (var i = 1; i < MAX_POLES; i++) {
      if (in_coefs[i] != 0)
        total += " + " + round(in_coefs[i]) + "x(n - " + i + ")";
    }
    for (var i = 1; i < MAX_POLES; i++) {
      if (out_coefs[i] != 0)
        total += " + " + round(out_coefs[i]) + "y(n - " + i + ")";
    }
    return total;
  }


  var next = function(sample) {
    var total = 0;
    var output = 0;
    for (var i = 0; i < MAX_POLES - 1; i++) {
      ins[MAX_POLES - i - 1] = ins[MAX_POLES - i - 2];
      outs[MAX_POLES - i - 1] = outs[MAX_POLES - i - 2];
    }
    ins[0] = sample;
    outs[0] = 0;

    for (var i = 0; i < MAX_POLES; i++) {
      output += ins[i] * in_coefs[i] + outs[i] * out_coefs[i];
    }
    outs[0] = clip(output / 1000000) * 1000000;
    outs[0] = output;
    return output;
  }

  return {
    next: next,
    toFunctionString: toFunctionString,
    setInCoefficients: setInCoefficients,
    setOutCoefficients: setOutCoefficients,
  };
}

function polynomial(coefficients) {
  var coefs = coefficients;

  return {
    coefs: coefs,
    add: function(other) {
      var c = [];
      var i = 0;
      for (; i < coefs.length && i < other.coefs.length; i++) {
        c[i] = coefs[i].add(other.coefs[i]);
      }
      for (; i < coefs.length; i++) {
        c[i] = coefs[i];
      }
      for (; i < other.coefs.length; i++) {
        c[i] = other.coefs[i];
      }
      return polynomial(c);
    },
    mult: function(other) {
      var c = [];
      for (var i = 0; i < coefs.length + other.coefs.length; i++) {
        c[i] = complex(0, 0);
      }
      for (var i = 0; i < coefs.length; i++) {
        for (var j = 0; j < other.coefs.length; j++) {
          c[i + j] = c[i + j].add(coefs[i].mult(other.coefs[j]));
        }
      }
      return polynomial(c);
    },
    sub: function(other) {
      var c = [];
      var i = 0;
      for (; i < coefs.length && i < other.coefs.length; i++) {
        c[i] = coefs[i].add(other.coefs[i].neg());
      }
      for (; i < coefs.length; i++) {
        c[i] = coefs[i];
      }
      for (; i < other.coefs.length; i++) {
        c[i] = other.coefs[i].neg();
      }
      return polynomial(c);
    },
  }
}

function transformPoints(sPoles) {
  var zPoles = [];
  var half = complex(0.5, 0);
  var one = complex(1, 0);

  for (var i = 0; i < sPoles.length; i++) {
    var numerator = one.add(half.mult(sPoles[i]));
    var denominator = one.add(half.mult(sPoles[i]).neg());
    zPoles[i] = numerator.mult(denominator.inv());
  }
  return zPoles;
}

var leftFilter = filter();
var rightFilter = filter();

function getFunctionForZPoles(zPoles, mags) {
  var numerator = polynomial([complex(mags[0], 0)]);
  var denominator = polynomial([complex(1, 0), zPoles[0].neg()]);

  for (var i = 1; i < zPoles.length; i++) {
    var localNumerator = polynomial([complex(mags[i], 0)]);
    var localDenominator = polynomial([complex(1, 0), zPoles[i].neg()]);
    numerator = numerator.mult(localDenominator);
    numerator = numerator.add(denominator.mult(localNumerator));
    denominator = denominator.mult(localDenominator);
  }
  var scale_value = $('#scale-slider').slider('option', 'value') / 100;
  var scale = polynomial([complex(scale_value, 0)]);
  return [scale.mult(numerator), denominator];
}

function getFunctionForZPolesAndZeros(zPoles, zZeros) {
  var numerator = polynomial([complex(1, 0)]);
  var denominator = polynomial([complex(1, 0)]);

  for (var i = 1; i < zZeros.length; i++) {
    numerator = numerator.mult(polynomial([complex(1, 0), zZeros[i].neg()]));
  }
  for (var i = 1; i < zPoles.length; i++) {
    denominator = denominator.mult(polynomial([complex(1, 0), zPoles[i].neg()]));
  }
  var scale_value = $('#scale-slider').slider('option', 'value') / 100;
  var scale = polynomial([complex(scale_value, 0)]);
  return [scale.mult(numerator), denominator];
}

function updateFilterWithPoles(sPoles, mags) {
  var in_coefs = [];
  var out_coefs = [];
  for (var i = 0; i < MAX_POLES; i++) {
    in_coefs[i] = 0;
    out_coefs[i] = 0;
  }
  var zPoles = transformPoints(sPoles);
  var funct = getFunctionForZPoles(zPoles, mags);
  for (var i = 0; i < funct[0].coefs.length && i < MAX_POLES; i++)
    in_coefs[i] = funct[0].coefs[i].r;
  for (var i = 1; i < funct[1].coefs.length && i < MAX_POLES; i++)
    out_coefs[i] = -funct[1].coefs[i].r;

  leftFilter.setInCoefficients(in_coefs);
  rightFilter.setInCoefficients(in_coefs);
  leftFilter.setOutCoefficients(out_coefs);
  rightFilter.setOutCoefficients(out_coefs);

  $('#recursion-function').html(leftFilter.toFunctionString());
}

function updateFilterWithPolesAndZeros(sPoles, sZeros) {
  var in_coefs = [];
  var out_coefs = [];
  for (var i = 0; i < MAX_POLES; i++) {
    in_coefs[i] = 0;
    out_coefs[i] = 0;
  }
  var zPoles = transformPoints(sPoles);
  var zZeros = transformPoints(sZeros);
  var funct = getFunctionForZPolesAndZeros(zPoles, zZeros);
  for (var i = 0; i < funct[0].coefs.length && i < MAX_POLES; i++)
    in_coefs[i] = funct[0].coefs[i].r;
  for (var i = 1; i < funct[1].coefs.length && i < MAX_POLES; i++)
    out_coefs[i] = -funct[1].coefs[i].r;

  leftFilter.setInCoefficients(in_coefs);
  rightFilter.setInCoefficients(in_coefs);
  leftFilter.setOutCoefficients(out_coefs);
  rightFilter.setOutCoefficients(out_coefs);

  $('#recursion-function').html(leftFilter.toFunctionString());
}

function clip(s) {
  if (s >= 1)
    return 1;
  if (s <= -1)
    return -1;
  return s;
}

function process(event) {
  // Get left/right input and output arrays
  var inputArrayL = event.inputBuffer.getChannelData(0);
  var inputArrayR = event.inputBuffer.getChannelData(1);
  var outputArrayL = event.outputBuffer.getChannelData(0);
  var outputArrayR = event.outputBuffer.getChannelData(1);
  var n = inputArrayL.length;

  for (var i = 0; i < n; ++i) {
    var l = inputArrayL[i];
    var r = inputArrayR[i];
    if (noise) {
      l = Math.random() - 0.5;
      r = Math.random() - 0.5;
    }
    outputArrayL[i] = clip(leftFilter.next(l));
    outputArrayR[i] = clip(rightFilter.next(r));
  }
}

function loadSample(url) {
  var request = new XMLHttpRequest();
  request.open("GET", url, true);
  request.responseType = "arraybuffer";

  request.onload = function() {
    source.buffer = context.createBuffer(request.response, false);
    source.looping = true;
    source.noteOn(0);

    draw();
  }

  request.send();
}

function switchToNoise() {
  noise = true;
}

function switchToFile() {
  noise = false;
}

if ( !window.requestAnimationFrame ) {

  window.requestAnimationFrame = (
    function() {
      return window.webkitRequestAnimationFrame ||
      window.mozRequestAnimationFrame || // comment out if FF4 is slow (it caps framerate at ~30fps: https://bugzilla.mozilla.org/show_bug.cgi?id=630127)
      window.oRequestAnimationFrame ||
      window.msRequestAnimationFrame ||
      function( /* function FrameRequestCallback */ callback, /* DOMElement Element */ element ) {
        window.setTimeout( callback, 1000 / 60 );
      };
    }
  )();
}

function draw() {
  analyserView1.doFrequencyAnalysis();
  // setTimeout(draw, 0);
  window.requestAnimationFrame(draw);
}

function initAudio() {
  context = new webkitAudioContext();
  source = context.createBufferSource();

  // This AudioNode will do the amplitude modulation effect directly in JavaScript
  jsProcessor = context.createJavaScriptNode(4096);
  jsProcessor.onaudioprocess = process;

  analyser = context.createAnalyser();
  analyser.fftSize = 2048;

  // Connect the processing graph: source -> jsProcessor -> analyser -> destination
  source.connect(jsProcessor);
  jsProcessor.connect(analyser);
  analyser.connect(context.destination);

  loadSample("sounds/amen.wav");
}

