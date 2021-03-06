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

var PAGE_MAIN              = 0;
var PAGE_SETTINGS          = 1;
var PAGE_PASSWORD          = 2;

var URL_GET_STATUS         = "https://api.particle.io/v1/devices/DEVICE/doorstatus?access_token=TOKEN";
var URL_OPEN_DOOR          = "https://api.particle.io/v1/devices/DEVICE/open?access_token=TOKEN";
var URL_CLOSE_DOOR         = "https://api.particle.io/v1/devices/DEVICE/close?access_token=TOKEN";

var LOCAL_STORAGE_DEVICE_ID    = 'deviceId';
var LOCAL_STORAGE_ACCESS_TOKEN = 'accessToken';
var LOCAL_STORAGE_DURATION     = 'duration';
var LOCAL_STORAGE_PASSWORD     = 'password';

var HTTP_TIMEOUT           = 8000;
var HTTP_GET               = 'GET';
var HTTP_POST              = 'POST';


/* Global variables */
var door_status  = DOOR_STATUS_UNKNWON;
var current_page = PAGE_MAIN;

/* Variable with settings */
var storedDeviceId    = '';
var storedAccessToken = '';
var storedDuration    = 10;
var storedPassword    = '';

/* Variable with typed password */
var typedPassword     = '';


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
    return false;
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
  
  return true;
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
      }, storedDuration * 1000);
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
  
  if (startHttpRequest(HTTP_GET, URL_GET_STATUS, httpResultDoorStatus))
  {  
    updateDoorStatus(DOOR_STATUS_REFRESHING);
  }
} /* handleRefreshButton */


function handleActionButton(e)
{
  var nextDoorStatus;
  var url;
    
  /* Calculare URL and next status */  
  if (door_status == DOOR_STATUS_OPEN)
  {
    nextDoorStatus = DOOR_STATUS_CLOSING;
    url = URL_CLOSE_DOOR;
  }
  else if (door_status == DOOR_STATUS_CLOSED)
  {
    nextDoorStatus = DOOR_STATUS_OPENING;
    url = URL_OPEN_DOOR;
  }
  else
  {
    // Nothing to do
    return;
  }
    
  /* Initiate HTTP request */
  if (startHttpRequest(HTTP_POST, url, httpResultDoorAction))
  {
    /* Update door status */
    updateDoorStatus(nextDoorStatus);
  }
} /* handleActionButton */


function loadSettings()
{
  storedDeviceId = localStorage.getItem(LOCAL_STORAGE_DEVICE_ID);
  if (storedDeviceId == null)
  {
    storedDeviceId = 'Insert Device ID';
  }

  storedAccessToken = localStorage.getItem(LOCAL_STORAGE_ACCESS_TOKEN);
  if (storedAccessToken == null)
  {
    storedAccessToken = 'Insert Access token';
  }

  storedDuration = localStorage.getItem(LOCAL_STORAGE_DURATION);
  if (storedDuration == null)
  {
    storedDuration = 10;
  }

  storedPassword = localStorage.getItem(LOCAL_STORAGE_PASSWORD);
  if (storedPassword == null)
  {
    storedPassword = '';
  }
} /* loadSettings */


function handleSettingsButton(e)
{
  /* If the password screen is displayed, don't process the settings button */
  if (current_page != PAGE_MAIN)
  {
    return;
  }

  /* Populate fields */
  document.getElementById('deviceId').value = storedDeviceId;
  document.getElementById('accessToken').value = storedAccessToken;
  document.getElementById('duration').value = storedDuration;
  document.getElementById('password').value = storedPassword;

  /* Display settings page and hide main page */
  displayPage(PAGE_SETTINGS);
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


function validatePassword(password)
{
  /* Password can be either empty or have 4 digits */
  if (password.length == 0)
  {
    return true;
  }
  if (password.length == 4)
  {
    return /[0-9]{4}/g.test(password);
  }
  return false;
} /* validatePassword */


function handleSaveButton(e)
{
  var configOk       = true;
  var refreshNeeded  = false;
  
  /* Retrieve values */
  var deviceId    = document.getElementById('deviceId').value;
  var accessToken = document.getElementById('accessToken').value;
  var duration    = Number(document.getElementById('duration').value);
  var password    = document.getElementById('password').value;
  
  /* Validate each field */
  if (!validateDeviceId(deviceId))
  {
    document.getElementById('invalidDeviceId').className = "errorInput";
    configOk = false;
  }
  if (!validateAccessToken(accessToken))
  {
    document.getElementById('invalidAccessToken').className = "errorInput";
    configOk = false;
  }
  if (!validateDuration(duration))
  {
    document.getElementById('invalidDuration').className = "errorInput";
    configOk = false;
  }
  if (!validatePassword(password))
  {
    document.getElementById('invalidPassword').className = "errorInput";
    configOk = false;
  }
  
  if (!configOk)
  {
    return;
  }
  
  /* Store values to persistent storage */
  localStorage.setItem(LOCAL_STORAGE_DEVICE_ID, deviceId);
  localStorage.setItem(LOCAL_STORAGE_ACCESS_TOKEN, accessToken);
  localStorage.setItem(LOCAL_STORAGE_DURATION, Number(duration));
  localStorage.setItem(LOCAL_STORAGE_PASSWORD, password);
  
  /* Check if refresh needed */
  if (storedDeviceId != deviceId || storedAccessToken != accessToken)
  {
    refreshNeeded = true;
  }
  
  /* Update global values */
  storedDeviceId = deviceId;
  storedAccessToken = accessToken;
  storedDuration = duration;
  storedPassword = password;
    
  /* Go back to main page */
  displayPage(PAGE_MAIN);
  
  /* Immediately start a refresh, if needed */
  if (refreshNeeded)
  {
    handleRefreshButton();
  }
} /* handleSaveButton */


function handleSettingsItemFocus(e)
{
  /* Hide error messages, if present */
  document.getElementById('invalidDeviceId').className    = 'hidden';
  document.getElementById('invalidAccessToken').className = 'hidden';
  document.getElementById('invalidDuration').className    = 'hidden';
  document.getElementById('invalidPassword').className    = 'hidden';
} /* handleSettingsItemFocus */


function handleEnterPasswordKey(typedKey)
{
  /* Reset password if already reached 4 digits */
  if (typedPassword.length >= 4)
  {
    typedPassword = '';
    document.getElementById('digit1').style.color = 'black';
    document.getElementById('digit2').style.color = 'black';
    document.getElementById('digit3').style.color = 'black';
    document.getElementById('digit4').style.color = 'black';
  }
  
  typedPassword = typedPassword + typedKey;

  if (typedPassword.length >= 1)
  {
    document.getElementById('digit1').innerHTML = '*';
  }
  else
  {
    document.getElementById('digit1').innerHTML = '&nbsp;';
  }
  if (typedPassword.length >= 2)
  {
    document.getElementById('digit2').innerHTML = '*';
  }
  else
  {
    document.getElementById('digit2').innerHTML = '&nbsp;';
  }
  if (typedPassword.length >= 3)
  {
    document.getElementById('digit3').innerHTML = '*';
  }
  else
  {
    document.getElementById('digit3').innerHTML = '&nbsp;';
  }
  if (typedPassword.length == 4)
  {
    document.getElementById('digit4').innerHTML = '*';
  }
  else
  {
    document.getElementById('digit4').innerHTML = '&nbsp;';
  }

  if (typedPassword.length < 4)
  {
    return;
  }
  
  /* Display main screen in case of correct password and also
     start refresh */
  if (typedPassword == storedPassword)
  {
    displayPage(PAGE_MAIN);

    /* Start HTTP request */
    handleRefreshButton();
    return;
  }
  
  /* Change color to red in case of wrong password */
  document.getElementById('digit1').style.color = 'red';
  document.getElementById('digit2').style.color = 'red';
  document.getElementById('digit3').style.color = 'red';
  document.getElementById('digit4').style.color = 'red';
} /* handleEnterPasswordKey */


function  displayPage(page)
{
  if (current_page == page)
  {
    return;
  }
  
  var classMain     = 'hidden';
  var classSettings = 'hidden';
  var classPassword = 'hidden';
  
  switch(page)
  {
    case PAGE_MAIN:
      classMain = 'visible';
      break;
    case PAGE_SETTINGS:
      classSettings = 'visible';
      break;
    case PAGE_PASSWORD:
      classPassword = 'visible';
      break;
    default:
      return;
  }
  
  document.getElementById('mainpage').className = classMain;
  document.getElementById('settingspage').className = classSettings;
  document.getElementById('passwordpage').className = classPassword;
  
  current_page = page;
} /* displayPage */


function windowLoad(e)
{
  /* Load settings */
  loadSettings();
  
  /* Initialize status door and update display accordingly */
  updateDoorStatus(DOOR_STATUS_UNKNWON);

  if (storedPassword.length > 0)
  {
    /* Display password page if password is required */
    displayPage(PAGE_PASSWORD);
    return;
  }
  
  /* Start HTTP request */
  handleRefreshButton();
} /* windowLoad */


/* Listener for window load */
window.addEventListener('load', windowLoad, false);

/* Register for button action */
document.getElementById('refreshButton').addEventListener('click', handleRefreshButton, false);
document.getElementById('actionButton').addEventListener('click', handleActionButton, false);
document.getElementById('settingsIcon').addEventListener('click', handleSettingsButton, false);
document.getElementById('saveButton').addEventListener('click', handleSaveButton, false);
document.getElementById('deviceId').addEventListener('change', handleSettingsItemFocus, false);
document.getElementById('accessToken').addEventListener('change', handleSettingsItemFocus, false);
document.getElementById('duration').addEventListener('change', handleSettingsItemFocus, false);

document.getElementById('key1').addEventListener('click', function(){ handleEnterPasswordKey('1') }, false);
document.getElementById('key2').addEventListener('click', function(){ handleEnterPasswordKey('2') }, false);
document.getElementById('key3').addEventListener('click', function(){ handleEnterPasswordKey('3') }, false);
document.getElementById('key4').addEventListener('click', function(){ handleEnterPasswordKey('4') }, false);
document.getElementById('key5').addEventListener('click', function(){ handleEnterPasswordKey('5') }, false);
document.getElementById('key6').addEventListener('click', function(){ handleEnterPasswordKey('6') }, false);
document.getElementById('key7').addEventListener('click', function(){ handleEnterPasswordKey('7') }, false);
document.getElementById('key8').addEventListener('click', function(){ handleEnterPasswordKey('8') }, false);
document.getElementById('key9').addEventListener('click', function(){ handleEnterPasswordKey('9') }, false);
document.getElementById('key0').addEventListener('click', function(){ handleEnterPasswordKey('0') }, false);
