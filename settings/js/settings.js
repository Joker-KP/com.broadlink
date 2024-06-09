function saveDebugSettings(Homey) {
  var compatmode = document.getElementById('compatmode') ? document.getElementById('compatmode').checked : false;
  var debuglog = document.getElementById('debuglog') ? document.getElementById('debuglog').checked : false;
  // var errorreport = false;
  // try {
  //    errorreport = document.getElementById('errorreport').checked;
  // }
  // catch( err ){;}

  var currentSettings = {
    'compat': compatmode,
    'logging': debuglog,
    // 'errorreport': errorreport
  }
  Homey.set('DebugSettings', currentSettings);
}

function onHomeyReady(Homey) {
  var compatmodeElement = document.getElementById('compatmode');
  var debuglogElement = document.getElementById('debuglog');
  // var errorreportElement = document.getElementById('errorreport');

  if (compatmodeElement) {
    compatmodeElement.addEventListener('change', function(e) { saveDebugSettings(Homey); })
  }
  if (debuglogElement) {
    debuglogElement.addEventListener('change', function(e) { saveDebugSettings(Homey); })
  }
  
  // if (errorreportElement) {
  //    errorreportElement.addEventListener('change', function(e) { saveDebugSettings(Homey); })
  // }
   
  Homey.get('DebugSettings', function(error, currentSettings) {
    if (error || !currentSettings) {
      Homey.ready();
      if (error) {
        Homey.alert(error, "error", null);
      }
      return;
    }
    if (compatmodeElement) {
      compatmodeElement.checked = currentSettings.compat || false;
    }
    if (debuglogElement) {
      debuglogElement.checked = currentSettings.logging || false;
    }
    // if (errorreportElement) { errorreportElement.checked = currentSettings.errorreport || false; }

    Homey.ready();
  });
  
  Homey.ready();
}
