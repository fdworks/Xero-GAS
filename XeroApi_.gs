// 34567890123456789012345678901234567890123456789012345678901234567890123456789

// JSHint - TODO
/* jshint asi: true */

// Xero.gs
// =======
//
// Object for connecting to the Xero API

var XeroApi_ = {  

  // Local setting storage 
  appType: '', 
  userAgent: '', 
  consumerKey: '', 
  consumerSecret: '', 
  callbackURL: '', 
  rsaKey: '', 
  isConnected: false,
  
  /**
   * Get a Xero property
   *
   * @param {String} propName
   *
   * @return {Object} proerty value or null
   */
   
  getProperty: function(propName) {   
    Log.functionEntryPoint();
    return (typeof this[propName] !== "undefined") ? this[propName] : null;
  },

  /**
   * Load the settings from persisten memory
   *
   * @return {Boolean} whether settings loaded
   */
   
  loadSettings: function() {
  
    Log.functionEntryPoint();  
    
    var p = PropertiesService.getScriptProperties().getProperties();   
    
    if (p.appType === null || p.appType === '') {
    
      throw new Error ('Please enter Xero Settings.');
      
    } else if (p.userAgent === null || 
      p.userAgent === '' || 
      p.consumerKey === null || 
      p.consumerKey === '' || 
      p.consumerSecret === null || 
      p.consumerSecret === '') {
      
      throw new Error ('Error: Missing Xero Settings (Apllication Name / Consumer Key / Consumer Secret).');
      
    } else if (p.appType === 'Public') {
    
      if (p.callbackURL === null || p.callbackURL === '') {
        throw new Error ('Error: Missing Xero Settings (Callback URL.');
      } 
      
    } else if (p.appType === 'Partner') {
    
      if (p.callbackURL === null || p.callbackURL === '' || p.rsaKey === null || p.rsaKey === '' ) {
        throw new Error ('Error: Missing Xero Settings (Callback URL/ RSA Key');
      }           
    }
       
    this.appType = p.appType;
    this.userAgent = p.userAgent;
    this.consumerKey = p.consumerKey;
    this.consumerSecret = p.consumerSecret;
    this.rsaKey = p.rsaKey;
    this.callbackURL = p.callbackURL;
    this.requestTokenSecret = "";
    this.accessToken = "";
    this.accessTokenSecret = "";    
    
    if (p.requestTokenSecret !== null) {
      this.requestTokenSecret = p.requestTokenSecret;   
    }
    
    if (p.accessToken !== null) {
      this.accessToken = p.accessToken;    
    }
    
    if (p.accessTokenSecret !== null) {
      this.accessTokenSecret = p.accessTokenSecret;        
    }
    
    if (p.isConnected !== null) {
      this.isConnected = (p.isConnected === 'true') ? true : false;
    }
    
    return true;
  },  

  /**
   *
   * @return {String} auth url or ''
   */
   
  connect: function() {
  
    Log.functionEntryPoint();
    
    this.loadSettings();
    
    var authUrl = ''
    
    Log.fine('this.appType: ' + this.appType)    
    Log.fine('this.isConnected: ' + this.isConnected)    

    if (this.appType !== 'Private' && !this.isConnected) {
    
      // Ask user to connect to Xero first. Get an Unauthorised Request Token  
      
      var payload = {"oauth_consumer_key": this.consumerKey,
                     "oauth_signature_method": "PLAINTEXT",
                     "oauth_signature": encodeURIComponent(this.consumerSecret + '&'),
                     "oauth_timestamp": ((new Date().getTime())/1000).toFixed(0),
                     "oauth_nonce": Utils_.generateRandomString(Math.floor(Math.round(25))),
                     "oauth_version": "1.0",
                     "oauth_callback": this.callbackURL};
                     
      var options = {"method": "post", "payload": payload};
      var response = UrlFetchApp.fetch(REQUEST_TOKEN_URL, options);  
      var reoAuthToken = /(oauth_token=)([a-zA-Z0-9]+)/;    
      var tokenMatch = reoAuthToken.exec(response.getContentText());
      var oAuthRequestToken = tokenMatch[2];
      var reTokenSecret = /(oauth_token_secret=)([a-zA-Z0-9]+)/;
      var secretMatch = reTokenSecret.exec(response.getContentText())  ;
      var tokenSecret = secretMatch[2];
      
      PropertiesService.getScriptProperties().setProperty('requestTokenSecret', tokenSecret); 
      
      //Log.fine('Request Token = ' + oAuthRequestToken);
      //Log.fine('Request Token Secret = ' + tokenSecret);
    
      Log.info('Returning user\'s auth link')
    
      authUrl = AUTHORIZE_URL + '?oauth_token=' + oAuthRequestToken;
      
    } else {

      Log.info('Already connected to Xero')      
    }
    
    return authUrl
    
  }, // XeroApi_.connect()
  
  /**
   * Fetch private app data
   */
   
  fetchPrivateAppData: function(item, pageNo) {
  
    Log.functionEntryPoint();  
    var method = 'GET';
    var requestURL = API_END_POINT + '/' + item ;    
    var oauth_signature_method = 'RSA-SHA1';
    var oauth_timestamp = (new Date().getTime()/1000).toFixed();
    var oauth_nonce = Utils_.generateRandomString(Math.floor(Math.random() * 50));
    var oauth_version = '1.0';     
    var signBase = 'GET' + '&' + encodeURIComponent(requestURL) + '&'
    + encodeURIComponent('oauth_consumer_key=' + this.consumerKey + '&oauth_nonce=' + oauth_nonce + '&oauth_signature_method='
                         + oauth_signature_method + '&oauth_timestamp=' + oauth_timestamp + '&oauth_token=' + this.consumerKey + '&oauth_version='
                         + oauth_version + '&page=' + pageNo);  
    if (!this.rsa) {
      this.rsa = new RSAKey();      
      this.rsa.readPrivateKeyFromPEMString(this.rsaKey);        
      var sbSigned = this.rsa.signString(signBase, 'sha1');              
    }
    else {
      var sbSigned = this.rsa.signString(signBase, 'sha1');
    }
    
    var data = new Array();
    for (var i =0; i < sbSigned.length; i += 2) 
      data.push(parseInt("0x" + sbSigned.substr(i, 2)));      
    var oauth_signature = hex2b64(sbSigned);  
    
    var authHeader = "OAuth oauth_token=\"" + this.consumerKey + "\",oauth_nonce=\"" + oauth_nonce + "\",oauth_consumer_key=\"" + this.consumerKey 
    + "\",oauth_signature_method=\"RSA-SHA1\",oauth_timestamp=\"" + oauth_timestamp + "\",oauth_version=\"1.0\",oauth_signature=\""
    + encodeURIComponent(oauth_signature) + "\"";    
    
    var headers = { "User-Agent": this.userAgent, "Authorization": authHeader, "Accept": "application/json"};    
    var options = { muteHttpExceptions: true, "headers": headers}; 
    var response = UrlFetchApp.fetch(requestURL + '?page=' + pageNo, options);
    Log.fine(response);
    if (response.getResponseCode() === 200)
      return JSON.parse(response.getContentText());    
    else
      return false;
  },
  
  /**
   * Fetch data from the Xero API
   *
   * @param {String} item
   * @param {Number} pageNo
   *
   * @return {Object} data object or null
   */
   
  fetchData: function(item, pageNo, query) {
  
    Log.functionEntryPoint();  
    
    this.loadSettings();
    
    switch (this.appType) {
    
    case 'Private':
    
      return this.fetchPrivateAppData(item, pageNo);
      
    case 'Public':
    
      if (!this.isConnected) {
      
        this.connect();
        break;
        
      } else {
      
        return this.fetchPublicAppData(item, pageNo, query)
      }
      
    case 'Partner':
    
      if (!this.isConnected) {
      
        this.connect();
        break;
        
      } else {
      
        return this.fetchPartnerAppData(item)
      }
      
    default:
      throw new Error('Unrecognised type: ' + this.appType)
    }
    
    return null
  },
    
  /**
   *
   */
   
  fetchPublicAppData: function(item, parameter, query) {  

    Log.functionEntryPoint();  

    /* For PUBLIC APPLICATION TYPE */
        
    if (typeof query !== 'undefined' && query !== '') {
    
      query = query + '=' + parameter
      
    } else {
    
      query = ''
    }

    Log.fine('query: ' + query)
    
    this.loadSettings(); // get latest settings
    
    var method = 'GET'
    var requestURL = API_END_POINT + '/' + item 
    var oauth_signature_method = 'HMAC-SHA1'
    var oauth_timestamp =  (new Date().getTime()/1000).toFixed()
    var oauth_nonce = Utils_.generateRandomString(Math.floor(Math.random() * 50))
    var oauth_version = '1.0'
    
    var signBase = 'GET' + '&' + encodeURIComponent(requestURL) + '&' 
      
    if ((item === TRIAL_BALANCE_URL) && query !== '') { 
      signBase += encodeURIComponent(query + '&')
    }
    
    signBase += encodeURIComponent(
      'oauth_consumer_key=' + this.consumerKey + '&' + 
      'oauth_nonce=' + oauth_nonce + '&' + 
      'oauth_signature_method=' + oauth_signature_method + '&' + 
      'oauth_timestamp=' + oauth_timestamp + '&' + 
      'oauth_token=' + this.accessToken  + '&' +                 
      'oauth_version=' + oauth_version              
    )
     
    if (item === INVOICE_URL && query !== '') { 
      signBase += encodeURIComponent('&' + query)
    }

    // signBase has too many strange chars to use Log.fine(), use Logger
    Logger.log(signBase)
    // Log.fine('signBase: ' + signBase);
    
    var sbSigned = Utilities
      .computeHmacSignature(
        Utilities.MacAlgorithm.HMAC_SHA_1, 
        signBase, 
        encodeURIComponent(this.consumerSecret) + '&' + encodeURIComponent(this.accessTokenSecret));
        
    Log.fine('sbSigned: ' + sbSigned);    
    
    var oauth_signature = Utilities.base64Encode(sbSigned);
    
    Log.fine('oauth_signature: ' + oauth_signature);
    
    var authHeader = 
      "OAuth oauth_consumer_key=\"" + this.consumerKey + 
      "\",oauth_nonce=\"" + oauth_nonce + 
      "\",oauth_token=\"" + this.accessToken + 
      "\",oauth_signature_method=\"" + oauth_signature_method + 
      "\",oauth_timestamp=\"" + oauth_timestamp + 
      "\",oauth_version=\"" + oauth_version + 
      "\",oauth_signature=\"" + 
      encodeURIComponent(oauth_signature) + "\"";
    
    var headers = {"User-Agent": + this.userAgent, "Authorization": authHeader, "Accept": "application/json"};
    var options = {"headers": headers, "muteHttpExceptions": true};

    requestURL = requestURL + (query === '' ? '' : '?') + query
    
    Log.fine('requestURL: ' + requestURL)

    var response = UrlFetchApp.fetch(requestURL, options);

    var responseCode = response.getResponseCode();
    var responseText = response.getContentText();
    
    if (responseCode === 200) {
    
      return JSON.parse(responseText);
      
    } else if (responseCode === 401) {
    
      PropertiesService.getScriptProperties().setProperty('isConnected', 'false')
      onOpen() // Reset menu
      throw new Error('The Auth token has expired, run Xero > Settings (connect)');
      
    } else {
    
      throw new Error(responseText);
    }
    
  }, // fetchPublicAppData()

  /**
   *
   */

  fetchPartnerAppData: function(item) {
    return false;
  },
  
  /**
   *
   */
   
  uploadData: function(item, xml, method) {
  
    Log.functionEntryPoint();  
    
    var method = method || 'POST';
    var requestURL = API_END_POINT + '/' + item ;    
    var oauth_signature_method = 'RSA-SHA1';
    var oauth_timestamp = (new Date().getTime()/1000).toFixed();
    var oauth_nonce = Utils_.generateRandomString(Math.floor(Math.random() * 50));
    var oauth_version = '1.0';
    var signBase = method + '&' + encodeURIComponent(requestURL) + '&' + 'SummarizeErrors=false' + 
    + encodeURIComponent('oauth_consumer_key=' + this.consumerKey + '&oauth_nonce=' + oauth_nonce + '&oauth_signature_method='
                         + oauth_signature_method + '&oauth_timestamp=' + oauth_timestamp + '&oauth_token=' + this.consumerKey + '&oauth_version='
                         + oauth_version + '&order=');  
    if (method === 'POST')
      signBase += '&xml=' + xml;
    
    
    var rsa = new RSAKey();
    rsa.readPrivateKeyFromPEMString(this.rsaKey);
    var sbSigned = rsa.signString(signBase, 'sha1');
    Log.fine(sbSigned);
    
    var data = new Array();
    for (var i =0; i < sbSigned.length; i += 2) 
      data.push(parseInt("0x" + sbSigned.substr(i, 2)));      
    var oauth_signature = hex2b64(sbSigned);  
    
    var authHeader = "OAuth oauth_token=\"" + this.consumerKey + "\",oauth_nonce=\"" + oauth_nonce + "\",oauth_consumer_key=\"" + this.consumerKey 
    + "\",oauth_signature_method=\"RSA-SHA1\",oauth_timestamp=\"" + oauth_timestamp + "\",oauth_version=\"1.0\",oauth_signature=\""
    + encodeURIComponent(oauth_signature) + "\"";    
    var payload = {"order": "", "xml": xml};
    var headers = { "User-Agent": this.userAgent, "Authorization": authHeader, "Accept": "application/json", "muteHttpExceptions": true };
    var options = { "headers": headers, "method": "post", "payload": payload };  
    try {
      var response = UrlFetchApp.fetch(requestURL + '?SummarizeErrors=false', options); 
      if (response.getResponseCode() === 200 && response.getHeaders().Status === "OK") 
        return JSON.parse(response.getContentText());                
      else
        throw "Request Failed: Response Code: " + response.getResponseCode();      
    } 
    catch(e) {
      throw e.message;
    }
    Log.fine(response.getContentText());    // return XML
    return false;
  } 
  
} // Xero object