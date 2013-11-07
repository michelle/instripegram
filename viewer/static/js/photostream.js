var numImages = 0;

var client = new BinaryClient('ws://localhost:9001');
var stream;

client.on('close', function(){
  init();
});

client.on('error', function(){
  init();
});

client.on('open', function() {
  stream = client.createStream();
  stream.on('data', function(data) {
    console.log(data);
    numImages += 1;
    var $image = $('<img id="' + numImages + '" height="' + $(window).height() + '" src="' + data + '">');
    $image.css({ 'position': 'absolute', 'left': 0, 'display': 'none' })
    var $wrapper = $('#wrapper');//numImages % 2 == 0 ? '#evenwrapper' : '#oddwrapper';
    if (numImages > 2) {
      $('#' + (numImages - 2)).animate({ 'left': $(window).height() * (8/3)}, function() {
        $(this).remove();
      });
    }
    if (numImages > 1) {
      $('#' + (numImages - 1)).animate({ 'left': $(window).height() * (4/3)}, function() {
        $wrapper.append($image);
        $image.fadeIn('fast');
      });
      return;
    }
    $wrapper.append($image);
    $image.fadeIn('fast');
  });
});
