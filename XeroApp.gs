// 34567890123456789012345678901234567890123456789012345678901234567890123456789

// JSHint - TODO
/* jshint asi: true */

// XeroApp.gs
// ==========
//
// External interface to this script - all of the event handlers.
//
// This files contains all of the event handlers, plus miscellaneous functions 
// not worthy of their own files yet

// Public event handlers
// ---------------------
//
// All external event handlers need to be top-level function calls; they can't 
// be part of an object, and to ensure they are all processed similarily 
// for things like logging and error handling, they all go through 
// errorHandler_(). These can be called from custom menus, web apps, 
// triggers, etc
// 
// The main functionality of a call is in a function with the same name but 
// post-fixed with an underscore (to indicate it is private to the script)
//
// For debug, rather than production builds, lower level functions are exposed
// in the menu

//   :      [function() {},  '()',      'Failed to ', ],

var EVENT_HANDLERS = {

//                         Initial actions  Name                         onError Message                           Main Functionality
//                         ---------------  ----                         ---------------                           ------------------

  doGet:                   [function() {},  'doGet()',                  'Failed to process GET',                   doGet_],
  serverStoreHierachy:     [function() {},  'serverStoreHierachy()',    'Failed to store hierachy',                serverStoreHierachy_],
  closeConnection:         [function() {},  'closeConnection()',        'Failed to close connection',              closeConnection_],
  closeApp:                [function() {},  'closeApp()',               'Failed to closeApp',                      closeApp_],
  displayXeroSetup:        [function() {},  'displaydisplayXeroSetup()','Failed to display Xero setup',            displayXeroSetup_],
  saveSettings:            [function() {},  'saveSettings()',           'Failed to saveSettings',                  saveSettings_],
  accountsDownload:        [function() {},  'accountsDownload()',       'Failed to handle accounts download',      accountsDownload_],
  invoicesFullDownload:    [function() {},  'invoicesFullDownload()',   'Failed to handle invoices full download', invoicesFullDownload_],  
  invoicesDownload:        [function() {},  'invoicesDownload()',       'Failed to handle invoices download',      invoicesDownload_],    
  trialBalancesDownloadReport: [function() {}, 'trialBalancesDownloadReport()', 'Failed to handle trials download (reporting)', trialBalancesDownloadReport_],    
  trialBalancesDownloadRange:  [function() {}, 'trialBalancesDownloadRange()',  'Failed to handle trials download (range)',     trialBalancesDownloadRange_],    
  
}

// function (arg)                     {return eventHandler_(EVENT_HANDLERS., arg)}

function doGet(arg)                       {return eventHandler_(EVENT_HANDLERS.doGet, arg)}
function serverStoreHierachy(arg)         {return eventHandler_(EVENT_HANDLERS.serverStoreHierachy, arg)}
function closeConnection(arg)             {return eventHandler_(EVENT_HANDLERS.closeConnection, arg)}
function closeApp(arg)                    {return eventHandler_(EVENT_HANDLERS.closeApp, arg)}
function displayXeroSetup(arg)            {return eventHandler_(EVENT_HANDLERS.displayXeroSetup, arg)}
function saveSettings(arg)                {return eventHandler_(EVENT_HANDLERS.saveSettings, arg)}
function accountsDownload(arg)            {return eventHandler_(EVENT_HANDLERS.accountsDownload, arg)}
function invoicesFullDownload(arg)        {return eventHandler_(EVENT_HANDLERS.invoicesFullDownload, arg)}
function invoicesDownload(arg)            {return eventHandler_(EVENT_HANDLERS.invoicesDownload, arg)}
function trialBalancesDownloadReport(arg) {return eventHandler_(EVENT_HANDLERS.trialBalancesDownloadReport, arg)}
function trialBalancesDownloadRange(arg)  {return eventHandler_(EVENT_HANDLERS.trialBalancesDownloadRange, arg)}

/**
 * 'on open' event handler. This is a special case as it has limited 
 * authorisation when the doc opens
 */

function onOpen() {

  var value = PropertiesService.getScriptProperties().getProperty('isConnected')
  var isConnected = (value === 'true') ? true : false
  
  var ui = SpreadsheetApp.getUi()
  
  if (ui === null) {
    Log.warning('onOpen called out of context of UI')
    return
  }
  
  var menu = ui.createMenu('Xero')
    
  if (isConnected) {
  
    menu.addItem('Download trial balances (use Reporting Date)', 'trialBalancesDownloadReport')    
    menu.addItem('Download trial balances (use Date Range)', 'trialBalancesDownloadRange')        
    menu.addItem('Download invoices', 'invoicesDownload')
    menu.addItem('Disconnect', 'closeConnection')
    
  } else {
    
    menu.addItem('Settings (connect) ...', 'displayXeroSetup')
  }
     
  menu.addToUi()

} // onOpen_()

// Private Functions
// =================

function accountsDownload_(arg)            {return Accounts_.download(arg)}
function invoicesFullDownload_(arg)        {return Invoices_.fullDownload(arg)}
function invoicesDownload_(arg)            {return Invoices_.download(arg)}
function trialBalancesDownloadReport_(arg) {return TrialBalance_.download(true)}
function trialBalancesDownloadRange_(arg)  {return TrialBalance_.download(false)}

// General
// -------

/**
 * All external function calls should call this to ensure standard 
 * processing - logging, errors, etc - is always done.
 *
 * @param {array} config:
 *   [0] {function} prefunction
 *   [1] {string} eventName
 *   [2] {string} onErrorMessage
 *   [3] {function} mainFunction
 * @parma {object} arg The argument passed to the top-level event handler
 */

function eventHandler_(config, arg) {

  // By default, only one instance of this script can run at a time
  var lock = LockService.getScriptLock()
  
  if (!lock.tryLock(1000)) {  
    return
  }
  
  try {

    config[0]()

    Log.init({
      level: LOG_LEVEL, 
      sheetId: LOG_SHEET_ID,
      displayFunctionNames: LOG_DISPLAY_FUNCTION_NAMES})
    
    Log.info('Handling ' + config[1])
    
    Assert.init({
      handleError: HANDLE_ERROR, 
      sendErrorEmail: SEND_ERROR_EMAIL, 
      emailAddress: ADMIN_EMAIL_ADDRESS,
      scriptName: SCRIPT_NAME,
      scriptVersion: SCRIPT_VERSION, 
    })
    
    return config[3](arg)
    
  } catch (error) {
  
    Assert.handleError(error, config[2], Log)
    
    CBL.endContinuousExecutionInstance( 
      ADMIN_EMAIL_ADDRESS, 
      CBL_ERROR_EMAIL_TITLE) 
        
  } finally {
  
    lock.releaseLock()
  }
  
} // eventHandler_()

// Private event handlers
// ----------------------

/**
 * Private http GET event handler
 */

function doGet_(e) {

  return (e.queryString === 'sort') ? sortAccounts() : completeAuth();
  
  // Private Functions
  // -----------------

  /**
   *
   */

  function sortAccounts() {
  
    Log.functionEntryPoint()
  
    var accountNames = Accounts_.download();  
    var template = HtmlService.createTemplateFromFile('Index');  
    var itemList = '';
    var itemId = 1
  
    accountNames.forEach(function(accountName) {
    
      itemList += 
        '<li class="dd-item" data-id="' + Utils_.normalizeString(accountName) + '">' +
        '  <div class="dd-handle">' + accountName + '</div>' +
        '</li>';
    })
  
    template.itemList = itemList;
    var html = template.evaluate().setSandboxMode(HtmlService.SandboxMode.IFRAME);
    return html
  
  } // doGet.sortAccounts()

  /**
   *
   */
  
  function completeAuth() {
  
    Log.functionEntryPoint()
  
    // https://script.google.com/macro/s/AKfycbyoJ09MtcAJFB-v31CH3sA2L5atNr4jtGW3cYWlqqpvGg_kBEY/exec?oauth_token=KNDX9LRNOC0KNAEB4PSVPDINTGSC6F&oauth_verifier=1144716&org=zX0A5sD18KgGYSSotqTKvG
    
    // Exchange verified Request token for Access Token
    
    XeroApi_.loadSettings();

    var properties = PropertiesService.getScriptProperties();
    
    Log.fine('doGet: XeroApi_.getProperty[consumerKey]' + XeroApi_.getProperty('consumerKey'));
    
    var payload = {
      "oauth_consumer_key": XeroApi_.getProperty('consumerKey'),
      "oauth_token": e.parameter.oauth_token,
      "oauth_signature_method": "PLAINTEXT",
      "oauth_signature": encodeURIComponent(XeroApi_.getProperty('consumerSecret') + '&' + XeroApi_.getProperty('requestTokenSecret')),
      "oauth_timestamp": ((new Date().getTime())/1000).toFixed(0),
      "oauth_nonce": Utils_.generateRandomString(Math.floor(Math.round(25))),
      "oauth_version": "1.0",
      "oauth_verifier": e.parameter.oauth_verifier
    };
        
    var options = {"method": "post", "payload": payload, muteHttpExceptions: true};
    
    try {
    
      var response = UrlFetchApp.fetch(ACCESS_TOKEN_URL, options);
      
    } catch(e) {
    
      Log.fine('UrlFetchApp.fetch(ACCESS_TOKEN_URL, options).response = ' + response.getContentText());
      Log.fine(e);
      return HtmlService.createHtmlOutput("<html><div>"+ response.getContentText() +"</div></html>");  
    }  
    
    var reoAuthToken = /(oauth_token=)([a-zA-Z0-9]+)/;    
    var tokenMatch = reoAuthToken.exec(response.getContentText());
    var reTokenSecret = /(oauth_token_secret=)([a-zA-Z0-9]+)/;
    var secretMatch = reTokenSecret.exec(response.getContentText())  ;  
      
    if (tokenMatch && tokenMatch[2] != '') {
    
      properties.setProperty('accessToken', tokenMatch[2]);  
      properties.setProperty('accessTokenSecret', secretMatch[2]);  
      properties.setProperty('isConnected', 'true');  
      ScriptApp.newTrigger('closeConnection').timeBased().after(30000);
//      onOpen() // Refresh the menu
      return HtmlService.createHtmlOutput("<html><b>Your spreadsheet is now connected to Xero.com for 30 mins.</b></html>");  
    } 
    
  } // doGet.completeAuth()
  
} // doGet()

/**
 *
 */
 
function serverStoreHierachy_(formObject) {

  Log.functionEntryPoint()

  var ss = SpreadsheetApp.openById(XEROAPP_SHEET_ID);  
  var sheet = ss.getSheetByName(ACCOUNTS_HIERARCHY_SHEET_NAME);
  
  if (sheet === null) {
    sheet = ss.insertSheet(ACCOUNTS_HIERARCHY_SHEET_NAME);
  }

  sheet
    .clear()
    .appendRow(['Account Name','Parent'])
    .getRange(1, 1, 1, 2)
      .setBackground('#999999')
      .setFontColor('white')
      .setFontWeight('bold')
      .setHorizontalAlignment('center');

  var nestableOutput = JSON.parse(formObject['nestable-output']);
  var sheetInput = [];

  nestableOutput.forEach(function(row) {
  
    if (row.hasOwnProperty('children')) {
  
      row.children.forEach(function(child) {
        sheetInput.push([child.id, row.id]); 
      })
    }
  })

  if (sheetInput.length > 0) {

    sheet
      .getRange(2, 1, sheetInput.length, sheetInput[0].length)
      .setValues(sheetInput);
      
  } else {
    Log.warning('No accounts');
  }
    
} // serverStoreHierachy()

/**
 *
 */

function closeConnection_() {
  Log.functionEntryPoint()
  PropertiesService.getScriptProperties().setProperty('isConnected', 'false'); 
  onOpen()
}
