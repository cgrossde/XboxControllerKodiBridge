//
// INIT XBMC RPC
//
setTimeout(function() {

var xbmc = require('xbmc-ws');
var connection = null;
// Keep track of some states
volume = 20; // Start quiet
subtitleDisabled = false;
playerId = 1;
moveFast = false;
moveFastSeconds = 60 * 10;
moveSlowSeconds = 30;

// Connect to xbmc
connection = xbmc('127.0.0.1', 9090);

// Register error handler
connection.on('error', function xbmc_error(error) {
  console.error("XBMC error:", error);
});
// Keep track of volume
connection.on('Application.OnVolumeChanged', function(data) {
  // Update volume
  volume = data.data.volume;
});

connection.on('JSONRPC.GetConfiguration', function(err, res) {
  console.log(err, res);
});





function checkAndUpdateVolume() {
  if(volume > 100) {
    volume = 100;
  } else if(volume < 0) {
    volume = 0;
  }
  console.log('Volume: ' + volume);
  if(isNaN(parseInt(volume))) {
    console.log('Could not partse number: ' + volume);
  }
  connection.run('Application.SetVolume')(parseInt(volume));
}

//
// INIT GAMEPAD
//

var gamepad = require("gamepad");

// Initialize the library
gamepad.init()

// List the state of all currently attached devices
for (var i = 0, l = gamepad.numDevices(); i < l; i++) {
  console.log(i, gamepad.deviceAtIndex().description);
}

// Create a game loop and poll for events
setInterval(gamepad.processEvents, 16);
// Scan for new gamepads as a slower rate
setInterval(gamepad.detectDevices, 500);


// Only react to button down events
gamepad.on("down", function (id, num) {
  console.log("down", {
    id: id,
    num: num,
  });
  parseButton(num);
});

function parseButton(num) {
  switch(num) {
    case 0:   // Button A
      connection.run('Input.Select')();
      break;
    case 1:   // Button B
      connection.run('Input.Back')();
      break;
    case 2:   // Button X
      connection.run('Input.ContextMenu')();
      break;
    case 3:   // Button Y
      connection.run('Input.Info')();
      break;
    case 4:   // L-oben
      cmdCycleSubtitle();
      break;
    case 5:   // R-oben
      cmdCycleAudio();
      break;
    case 6:   // L-unten
      connection.run('Player.PlayPause')(playerId);
      break;
    case 7:   // R-unten
      if(moveFast) {
        moveFast = false;
        connection.run('GUI.ShowNotification')('Scrollspeed','Slow: 30s');
      } else {
        moveFast = true;
        connection.run('GUI.ShowNotification')('Scrollspeed','Fast: 10m');
      }
      break;
    case 8:
      connection.run('Player.Stop')(playerId);
      break;

    case 13:   // Links
      connection.run('Input.Left')();
      break;
    case 14:   // Rechts
      connection.run('Input.Right')();
      break;
    case 15:   // Oben
      connection.run('Input.Up')();
      break;
    case 16:   // Unten
      connection.run('Input.Down')();
      break;

    case 11:   // Left analog click
      connection.run('Input.ExecuteAction')('select');
      break;

    case 12:   // Right analog click
      //connection.run('Player.PlayPause')(playerId);
      
      connection.run('Input.ShowOSD')();
      break;

  }
}

function cmdCycleSubtitle() {
  connection.run('Player.GetProperties')(playerId,['subtitles', 'subtitleenabled', 'currentsubtitle'], function(err, res) {
    // Return on error
    if(err) return;

    // Can we activate subtitles?
    if(res.subtitles.length === 0) return;

    // If disabled => activate
    if(! res.subtitleenabled) {
      connection.run('Player.SetSubtitle')(playerId, 0, true);
      connection.run('GUI.ShowNotification')('Subtitles','Language: ' + res.subtitles[0].language);
    }
    // Check if last subtitle in list => Disable
    else if(res.subtitles.length === res.currentsubtitle.index +1) {
      connection.run('Player.SetSubtitle')(playerId, 'off');
      connection.run('GUI.ShowNotification')('Subtitles','Disabled');
    }
    // Cycle through subtitles
    else {
      connection.run('Player.SetSubtitle')(playerId, 'next');
      connection.run('GUI.ShowNotification')('Subtitles','Language: ' + res.subtitles[res.currentsubtitle.index +1].language);
    }

  });
}

function cmdCycleAudio() {
  connection.run('Player.GetProperties')(playerId, ['audiostreams', 'currentaudiostream'], function(err, res) {
    // Return on error
    if(err) return;

    // Can we cycle audio?
    if(res.audiostreams.length <= 1) return;

    // Cycle
    var nextPos = (res.audiostreams.length -1 === res.currentaudiostream.index ) ? 0 : res.currentaudiostream.index +1;
    connection.run('Player.SetAudioStream')(playerId, nextPos);
    connection.run('GUI.ShowNotification')('Audio', res.audiostreams[nextPos].name + '(' + res.audiostreams[nextPos].language + ')');

  });
}

// Listen for move events on all gamepads
gamepad.on("move", function (id, axis, value) {
  // console.log("move", {
  //   id: id,
  //   axis: axis,
  //   value: value,
  // });
  parseAxis(axis,value);
});


// Axis 0: left (-1) <-> right (1)
// Axis 1: up (-1) <-> down (1)
var leftAnalog = {
  up: 0,
  down: 0,
  left: 0,
  right: 0
}

var thresholdLeft = 0.5;
var repeatRateLeft = 150;
// Check state of axis and act accordingly
setInterval(function() {
  if(leftAnalog.up === 1) {
    connection.run('Input.Up')();
  }
  if(leftAnalog.down === 1) {
    connection.run('Input.Down')();
  }
  if(leftAnalog.left === 1) {
    connection.run('Input.Left')();
  }
  if(leftAnalog.right === 1) {
    connection.run('Input.Right')();
  }
}, repeatRateLeft);

// Axis 2: left (-1) <-> right (1)
// Axis 3: up (-1) <-> down (1)
var rightAnalog = {
  up: 0,
  down: 0,
  left: 0,
  right: 0
}

var thresholdRight = 0.8;
var repeatRateRight = 200;
var volSteps = 2;
// Check state of axis and act accordingly
setInterval(function() {
  if(rightAnalog.up === 1) {
    volume += volSteps;
    checkAndUpdateVolume();
  }
  if(rightAnalog.down === 1) {
    volume -= volSteps;
    checkAndUpdateVolume();
  }
  if(rightAnalog.left === 1) {
    cmdMoveBackwards();
  }
  if(rightAnalog.right === 1) {
    cmdMoveForwards();
  }
}, repeatRateLeft);




function parseAxis(axis, value) {
  if(axis === 0) {
    leftAnalog.right = (value > thresholdLeft) ? 1 : 0;
    leftAnalog.left = (value < -1*thresholdLeft) ? 1 : 0;
  }
  if(axis === 1) {
    leftAnalog.down = (value > thresholdLeft) ? 1 : 0;
    leftAnalog.up = (value < -1*thresholdLeft) ? 1 : 0;
  }
  if(axis === 2) {
    rightAnalog.right = (value > thresholdRight) ? 1 : 0;
    rightAnalog.left = (value < -1*thresholdRight) ? 1 : 0;
  }
  if(axis === 3) {
    rightAnalog.down = (value > thresholdRight) ? 1 : 0;
    rightAnalog.up = (value < -1*thresholdRight) ? 1 : 0;
  }
}

connection.run('Player.GetProperties')(playerId, ['time', 'totaltime'], function(err,res) {
  if(err) return;
  console.log(res);

  console.log('MS total: ', convertObjToMilliseconds(res.totaltime));
  console.log('MS: ', convertObjToMilliseconds(res.time));

  console.log('Obj total: ', convertMillisecondsToObj(convertObjToMilliseconds(res.totaltime)));
  console.log('Obj: ', convertMillisecondsToObj(convertObjToMilliseconds(res.time)));
});


function cmdMoveForwards() {
  if(moveFast) {
    connection.run('Player.Seek')(playerId, 'bigforward');
  } else {
    connection.run('Player.Seek')(playerId, 'smallforward');
  }
}

function cmdMoveBackwards() {
  if(moveFast) {
    connection.run('Player.Seek')(playerId, 'bigbackward');
  } else {
    connection.run('Player.Seek')(playerId, 'smallbackward');
  }
}


function calcDuration(res) {
  var result = {};
  result.total = convertObjToMilliseconds(res.totaltime);
  result.current = convertObjToMilliseconds(res.time);
  result.remaining = result.total - result.current;
  return result;
}

function changeTimeWithinBounds(res, msToMove) {
  var time = calcDuration(res);
  var newCurrent = time.current + msToMove;
  if(newCurrent < 0) {
    newCurrent = 0;
  }
  if(newCurrent >= time.total) {
    if(time.total > 1000 * 10) {
      newCurrent = time.total - (1000 * 10);
    } else {
      newCurrent = time.total;
    }
  }
  return convertMillisecondsToObj(newCurrent);
}


function convertObjToMilliseconds(timeObj) {
  var total = 0;
  total += timeObj.hours * 60 * 60 * 1000;
  total += timeObj.minutes * 60 * 1000;
  total += timeObj.seconds * 1000;
  total += timeObj.milliseconds;
  return total;
}

function convertMillisecondsToObj(ms) {
  var obj = {
    hours: 0,
    minutes: 0,
    seconds: 0,
    milliseconds: 0
  };
  if(ms === 0) return obj;
  // Convert
  var remainingMin = ms % (1000 * 60 * 60);
  console.log(ms,remainingMin);
  obj.hours = (ms - remainingMin) / (1000 * 60 * 60);
  var remainingSec = remainingMin % (1000 * 60);
  obj.minutes = (remainingMin - remainingSec) / (1000 * 60);
  var remainingMs = remainingSec % 1000;
  obj.seconds = (remainingSec - remainingMs) / 1000;
  obj.milliseconds = remainingMs;
  return obj;
}
}, 5000);





    // connection.run('Input.Select')();
    // connection.run('Input.Back')();
    // connection.run('Input.Up')();
    // connection.run('Input.Down')();
    // connection.run('Application.SetVolume')(parseInt(volume));
