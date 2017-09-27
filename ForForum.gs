function getTrialBalances() {
  
  /*
  .
  .
  .
  */

  fetchPublicAppData('Reports/TrialBalance', '2016-07-01', 'date')
  
  /*
  .
  .
  .
  */
  
}

function getInvoices() {
  
  /*
  .
  .
  .
  */

  fetchPublicAppData('Invoices', pageNumber, 'page')
  
  /*
  .
  .
  .
  */
  
}

function fetchPublicAppData(item, parameter, query) {  
  
  /* For PUBLIC APPLICATION TYPE */
  
  this.loadSettings(); // get latest settings
  
  var requestURL = API_END_POINT + '/' + item ;    
  var oauth_signature_method = 'HMAC-SHA1';
  var oauth_timestamp =  (new Date().getTime()/1000).toFixed();
  var oauth_nonce = Utils_.generateRandomString(Math.floor(Math.random() * 50));
  var oauth_version = '1.0';
  
  var signBase = 
      'GET' + '&' + 
        encodeURIComponent(requestURL) + '&' + 
          encodeURIComponent(
            'oauth_consumer_key=' + this.consumerKey + '&' + 
            'oauth_nonce=' + oauth_nonce + '&' + 
            'oauth_signature_method=' + oauth_signature_method + '&' + 
            'oauth_timestamp=' + oauth_timestamp + '&' + 
            'oauth_token=' + this.accessToken  + '&' +                             
            'oauth_version=' + oauth_version + '&' +              
            query + '=' + parameter);
            
  var sbSigned = Utilities
        .computeHmacSignature(
          Utilities.MacAlgorithm.HMAC_SHA_1, 
          signBase, 
          encodeURIComponent(this.consumerSecret) + '&' + encodeURIComponent(this.accessTokenSecret));
          
  var oauth_signature = Utilities.base64Encode(sbSigned);
  
  var authHeader = 
      "OAuth oauth_consumer_key=\"" + this.consumerKey + 
      "\",oauth_nonce=\"" + oauth_nonce + 
      "\",oauth_token=\"" + this.accessToken + 
      "\",oauth_signature_method=\"" + oauth_signature_method + 
      "\",oauth_timestamp=\"" + oauth_timestamp + 
      "\",oauth_version=\"1.0\",oauth_signature=\"" + 
      encodeURIComponent(oauth_signature) + "\"";
  
  var headers = {"User-Agent": + this.userAgent, "Authorization": authHeader, "Accept": "application/json"};
  var options = {"headers": headers, "muteHttpExceptions": false};
  
  var response = UrlFetchApp.fetch(requestURL + '?' + query + '=' + parameter, options); 
    
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
  
} // fetchPublicAppData()
