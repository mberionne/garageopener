/* Constants */
var DOOR_STATUS_UNKNWON    = 0;
var DOOR_STATUS_OPEN       = 1;
var DOOR_STATUS_OPENING    = 2;
var DOOR_STATUS_CLOSED     = 3;
var DOOR_STATUS_CLOSING    = 4;
var DOOR_STATUS_ERROR      = 5;
var DOOR_STATUS_REFRESHING = 6;
var DOOR_STATUS_NO_CONFIG  = 7;
var DOOR_STATUS_TIMEOUT    = 8;

var URL_GET_STATUS         = "https://api.particle.io/v1/devices/DEVICE/doorstatus?access_token=TOKEN";
var URL_OPEN_DOOR          = "https://api.particle.io/v1/devices/DEVICE/XXXopen?access_token=TOKEN";
var URL_CLOSE_DOOR         = "https://api.particle.io/v1/devices/DEVICE/XXXclose?access_token=TOKEN";

var HTTP_TIMEOUT           = 8000;


/* Door status */
var door_status = DOOR_STATUS_UNKNWON;

/* Variable with settings */
var storedDeviceId    = '';
var storedAccessToken = '';
var storedDuration    = 0;


function updateDoorStatus(status)
{
  var doorStatusStrings = [
   'Unknown',
   'Open',
   'Opening',
   'Closed',
   'Closing',
   'Error',
   'Refreshing',
   'Invalid configuration',
   'Timeout'];
  
  door_status = status;
  
  var doorStatusText = document.getElementById('doorstatustext');
  doorStatusText.innerHTML = doorStatusStrings[door_status];
  
  if (door_status == DOOR_STATUS_OPEN)
  {
    /* Show action button to close the door */
    document.getElementById('actionDiv').className = "actionDiv";
    document.getElementById('actionButton').innerHTML = "Close";
  }  
  else if (door_status == DOOR_STATUS_CLOSED)
  {
    /* Show action button to open the door */
    document.getElementById('actionDiv').className = "actionDiv";
    document.getElementById('actionButton').innerHTML = "Open";
  }  
  else
  {
    /* Hide action button */
    document.getElementById('actionDiv').className = "hidden";
  }  
} /* updateDoorStatus */


function startHttpRequest(method, url, callback)
{
  /* Validate configuration */
  if (!validateDeviceId(storedDeviceId) || !validateAccessToken(storedAccessToken))
  {
    updateDoorStatus(DOOR_STATUS_NO_CONFIG);
    return;
  }

  /* Compose URL with correct device ID and access token */
  url = url.replace('DEVICE', storedDeviceId);
  url = url.replace('TOKEN',  storedAccessToken);
  
  var xmlhttp = new XMLHttpRequest();
  xmlhttp.onreadystatechange = function()
    {
      /* Handle only callback when page is complete */
      if (xmlhttp.readyState == 4)
      {
        /* Invoke callback */
        callback(xmlhttp, false);
      }
    }
  xmlhttp.timeout = HTTP_TIMEOUT;
  xmlhttp.ontimeout = function()
    {
      callback(xmlhttp, true);
    }
  xmlhttp.open(method, url , true);
  xmlhttp.send();
} /* startHttpRequest */


function httpResultDoorStatus(xmlhttp, timeout)
{
  var newStatus = DOOR_STATUS_ERROR;
  
  if (timeout)
  {
    newStatus = DOOR_STATUS_TIMEOUT;
  }
  else if (xmlhttp.status == 200)
  {
    var jsonObject = JSON.parse(xmlhttp.response);
    var currentStatus = jsonObject.result;
    
    /* Only valid status values returned by server */
    if (currentStatus >= DOOR_STATUS_UNKNWON && currentStatus <= DOOR_STATUS_CLOSING)
    {
      newStatus = currentStatus;
    }
  }
  
  updateDoorStatus(newStatus);
} /* httpResultDoorStatus */


function httpResultDoorAction(xmlhttp, timeout)
{
  if (timeout)
  {
    updateDoorStatus(DOOR_STATUS_TIMEOUT);
  }
  else if (xmlhttp.status == 200)
  {
    /* In case of success, no need to update the UI, as it was already updated
       when button was pressed. So only start timer. */
    var doorActionTimerId = setTimeout(function()
      {
        /* Handle timeout only if we are still opening or closing the door,
           triggering as if user pressed the refresh button */
        if (door_status == DOOR_STATUS_CLOSING || door_status == DOOR_STATUS_OPENING)
        {
          handleRefreshButton();
        }
      }, storedDuration);
  }
  else
  {
    /* Update the UI with error message */
    updateDoorStatus(DOOR_STATUS_ERROR);
  }
} /* httpResultDoorAction */


function handleRefreshButton(e)
{
  /* Check if already refreshing: in that case nothing to do */
  if (door_status == DOOR_STATUS_REFRESHING)
  {
    return;
  }
  
  startHttpRequest("GET", URL_GET_STATUS, httpResultDoorStatus);
    
  updateDoorStatus(DOOR_STATUS_REFRESHING);
} /* handleRefreshButton */


function handleActionButton(e)
{
  var nextDoorStatus;
  var url;
    
  /* Calculare URL and next status */  
  if (door_status == DOOR_STATUS_OPEN)
  {
    nextDoorStatus = DOOR_STATUS_CLOSING;
    url = URL_OPEN_DOOR;
  }
  else if (door_status == DOOR_STATUS_CLOSED)
  {
    nextDoorStatus = DOOR_STATUS_OPENING;
    url = URL_CLOSE_DOOR;
  }
  else
  {
    // Nothing to do
    return;
  }
    
  /* Initiate HTTP request */
  startHttpRequest("POST", url, httpResultDoorAction);
   
  /* Update door status */
  updateDoorStatus(nextDoorStatus);
} /* handleActionButton */


function loadSettings()
{
  storedDeviceId = localStorage.getItem('deviceId');
  if (storedDeviceId == null)
  {
    storedDeviceId = 'Dev ID - NULL';
  }
  storedAccessToken = localStorage.getItem('accessToken');
  if (storedAccessToken == null)
  {
    storedAccessToken = 'Access token - NULL';
  }
  storedDuration = localStorage.getItem('duration');
  if (storedDuration == null)
  {
    storedDuration = 10;
  }
} /* loadSettings */


function handleSettingsButton(e)
{
  /* Populate fields */
  document.getElementById('deviceId').value = storedDeviceId;
  document.getElementById('accessToken').value = storedAccessToken;
  document.getElementById('duration').value = storedDuration;

  /* Display settings page and hide main page */
  document.getElementById('mainpage').className = "hidden";
  document.getElementById('settingspage').className = "visible";
} /* handleSettingsButton */


function validateDeviceId(deviceId)
{
  /* Device ID must be 24 digits */
  if (deviceId.length != 24)
  {
    return false;
  }
  
  return /[0-9A-Fa-f]{24}/g.test(deviceId);
} /* validateDeviceId */


function validateAccessToken(accessToken)
{
  /* Access token must be 40 digits */
  if (accessToken.length != 40)
  {
    return false;
  }

  return /[0-9A-Fa-f]{40}/g.test(accessToken);
} /* validateAccessToken */


function validateDuration(duration)
{
  /* Must be a number */
  if (isNaN(duration))
  {
    return false;
  }
  
  /* Duration must be between 3 and 60 seconds */
  if (Number(duration) < 3 || Number(duration) > 60)
  {
    return false;
  }
  return true;
} /* validateDuration */


function handleSaveButton(e)
{
  /* Retrieve values */
  var deviceId    = document.getElementById('deviceId').value;
  var accessToken = document.getElementById('accessToken').value;
  var duration    = Number(document.getElementById('duration').value);
          
  /* Validate each field */
  if (!validateDeviceId(deviceId))
  {
    document.getElementById('invalidDeviceId').className = "errorInput";
    return;
  }
  if (!validateAccessToken(accessToken))
  {
    document.getElementById('invalidAccessToken').className = "errorInput";
    return;
  }
  if (!validateDuration(duration))
  {
    document.getElementById('invalidDuration').className = "errorInput";
    return;
  }
  
  /* Store values to persistent storage */
  localStorage.setItem('deviceId', deviceId);
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('duration', Number(duration));
  
  /* Update global values */
  storedDeviceId = deviceId;
  storedAccessToken = accessToken;
  storedDuration = duration;
    
  /* Go back to main page */
  document.getElementById('mainpage').className = "visible";
  document.getElementById('settingspage').className = "hidden";
} /* handleSaveButton */

function handleFocus(e)
{
  /* Hide error messages, if present */
  document.getElementById('invalidDeviceId').className = "hidden";
  document.getElementById('invalidAccessToken').className = "hidden";
  document.getElementById('invalidDuration').className = "hidden";
} /* handleFocus */

function windowLoad(e)
{
  /* Load settings */
  loadSettings();
  
  /* Initialize status door and update display accordingly */
  updateDoorStatus(DOOR_STATUS_UNKNWON);
  
  /* Start HTTP request */
  handleRefreshButton();
} /* windowLoad */

/* Listed for window load */
window.addEventListener('load', windowLoad, false);

/* Register for button action */
document.getElementById('refreshButton').addEventListener('click', handleRefreshButton, false);
document.getElementById('actionButton').addEventListener('click', handleActionButton, false);
document.getElementById('settingsIcon').addEventListener('click', handleSettingsButton, false);
document.getElementById('saveButton').addEventListener('click', handleSaveButton, false);
document.getElementById('deviceId').addEventListener('change', handleFocus, false);
document.getElementById('accessToken').addEventListener('change', handleFocus, false);
document.getElementById('duration').addEventListener('change', handleFocus, false);


