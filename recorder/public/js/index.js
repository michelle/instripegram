var video;
var canvas;
var code;
var ctx;
var localMediaStream;

// CodeMirror
var codeM;

// Heks
var counter = 0;
var DELAY = 2;
var SERVER = 'http://' + window.location.hostname + ':8000/image';
var GIFSERVER = 'http://' + window.location.hostname + ':8000/gif';

// For compiling JS.
var testTimeout;
var passing = true;

var pixels = [];

// fn to apply to pixels.
var imageFilter;

// For giffffs
var videoShooter;

// Throttle, from UnderscoreJS.
function throttle(func, wait, options) {
  var context, args, result;
  var timeout = null;
  var previous = 0;
  options || (options = {});
  var later = function() {
    previous = options.leading === false ? 0 : new Date;
    timeout = null;
    result = func.apply(context, args);
  };
  return function() {
    var now = new Date;
    if (!previous && options.leading === false) previous = now;
    var remaining = wait - (now - previous);
    context = this;
    args = arguments;
    if (remaining <= 0) {
      clearTimeout(timeout);
      timeout = null;
      previous = now;
      result = func.apply(context, args);
    } else if (!timeout && options.trailing !== false) {
      timeout = setTimeout(later, remaining);
    }
    return result;
  };
};

function fail() {
  alert('Only Google Chrome is supported right now. Sorry!');
}

// Not showing vendor prefixes or code that works cross-browser.
navigator.webkitGetUserMedia({video: true}, function(stream) {
  video.src = window.webkitURL.createObjectURL(stream);
  videoShooter = new VideoShooter(video);
  localMediaStream = stream;
  $('#start').show();
}, fail);

$(function() {
  video = document.getElementById('v');
  canvas = document.getElementById('c');
  code = document.getElementById('code');
  ctx = canvas.getContext('2d');

  $(canvas).css('height', '400px');
  $(canvas).show();

  var saved = localStorage.getItem('c');
  var throttled = throttle(testCode, 1000);
  codeM = CodeMirror(code, {
    lineWrapping: true,
    theme: 'ambiance',
    onChange: throttled,
    value: saved || ''
  });
  codeM.setSize(451, 318);
  if (saved) {
    testCode();
  }
  $('#startbtn').click(function() {
    if (counter === 0) {
      $('#btntext').addClass('grey');
      countdown();
    }
  });
  frame();
});

function countdown() {
  counter += 1;
  if (counter === DELAY) {
    frame(true);
  }
  if (counter < DELAY + 3) {
    $('#ind').show().css('opacity', 1);
    if (counter !== DELAY - 1) {
      setTimeout(function() {
        $('#ind').css('opacity', 0);
      }, 500);
    }
    setTimeout(function() {
      countdown();
    }, 1000);
  }
  else {
    counter = 0;
    $('#btntext').removeClass('grey');
    $('#ind').hide().css('opacity', 0);
  }
}

function VideoShooter (videoElement) {
  var canvas = document.createElement('canvas');
  var context = canvas.getContext('2d');
  context.scale(-1, 1); // mirror flip preview back to the normal direction

  canvas.width = videoElement.width;
  canvas.height = videoElement.height;

  this.getShot = function (callback, numFrames, interval, progressCallback) {
    numFrames = numFrames !== undefined ? numFrames : 3;
    interval = interval !== undefined ? interval : 0.1; // In seconds

    var pendingFrames = numFrames;
    var ag = new Animated_GIF({ workerPath: 'lib/gif/quantizer.js' });
    ag.setSize(canvas.width, canvas.height);
    ag.setDelay(interval);

    captureFrame();

    function captureFrame() {
      ag.addFrame(videoElement, imageFilter || function(a){return a;});
      pendingFrames--;

      // Call back with an r value indicating how far along we are in capture
      progressCallback((numFrames - pendingFrames) / numFrames);

      if(pendingFrames > 0) {
        setTimeout(captureFrame, interval * 1000); // timeouts are in milliseconds
      } else {
        ag.getBase64GIF(function(image) {
          var img = document.createElement('img');
          img.src = image;
          callback(image);
        });
      }
    }
  };
}

function frame(send_picture) {
  if (localMediaStream) {
    ctx.drawImage(video, 0, 0, 533, 400);
    if (imageFilter) {
      filterize();
    }
    if (open && send_picture) {
      videoShooter.getShot(function(base64_gif) {
        $.post(GIFSERVER, {gif: base64_gif});
      }, 10, 0.2, $.noop);

      // The flash!
      $('#f').css('opacity', 1).animate({'opacity': 0});

      /*canvas.toBlob(
        function(blob) {
          var data = new FormData();
          data.append('image', blob);

          var req = new XMLHttpRequest();
          req.open('POST', SERVER, true);
          req.send(data);
        },
        'image/jpeg'
      );*/
    }
  }
  window.requestAnimationFrame(function() {
    // Will get args if we pass frame directly into requestAnimationFrame.
    frame();
  });
}

// Apply the filter.
function filterize() {
  var data = ctx.getImageData(0,0,533,400);
  var img = data.data;
  pixels = img;
  var w = 533;
  var h = 400;
  for (var y = 0; y < h; y += 1) {
    var row = y * w * 4;
    for(var x = 0; x < w; x += 1) {
      var loc = row + x * 4;
      var r = img[loc];
      var g = img[loc + 1];
      var b = img[loc + 2];
      var out = imageFilter({x: x, y: y, r: r, g: g, b: b});
      img[loc] = out.r;
      img[loc + 1] = out.g;
      img[loc + 2] = out.b;
    }
  }
  ctx.putImageData(data, 0, 0);
}

// AHHH.
function testCode() {
  // Reset state.
  clearTimeout(testTimeout);
  passing = false;

  var c = codeM.getValue();
  localStorage.setItem('c', c);

  $('#msg').removeClass('r g y').addClass('y').text('...');
  testTimeout = setTimeout(function() {
    testTimeout = undefined;
    c = 'function filter(pixel) {' + c + '; return pixel; }';

    try {
      eval(c);
      filter({x: 0, y: 0, r: 0, g: 0, b: 0});
      $('#msg').removeClass('y').addClass('g').text('Successfully compiled');
      imageFilter = filter;
      passing = true;
    } catch (e) {
      var e = e.stack.split('\n');
      $('#msg').removeClass('y').addClass('r').text(e[0]);
    }
  }, 500);
}

// Secret undocumented helper!!!
function getPixel(x, y) {
  var i = y * 533 * 4 + x * 4;
  if (pixels.length >= i + 3 && x >= 0 && x <= 533 && y >= 0 && y <= 400) {
    return {x: x, y: y, r: pixels[i], g: pixels[i + 1], b:pixels[i + 2]};
  } else {
    return {x: x, y: y, r: 0, g: 0, b:0};
  }
}
