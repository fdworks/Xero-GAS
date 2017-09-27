// 34567890123456789012345678901234567890123456789012345678901234567890123456789

// JSHint - TODO
/* jshint asi: true */

// OAuth.gs
// ========
//
// Connect to the Xero API using the Google OAuth library

/**
 * Authorizes and makes a request to the Xero API.
 */
 
function run() {

  var service = getService();
  
  if (service.hasAccess()) {
  
    var url = 'https://api.trello.com/1/members/me/boards';
    var response = service.fetch(url);
    var result = JSON.parse(response.getContentText());
    Logger.log(JSON.stringify(result, null, 2));
    
  } else {
  
    var authorizationUrl = service.authorize();
    Logger.log('Open the following URL and re-run the script: %s',
        authorizationUrl);
  }
}

/**
 * Reset the authorization state, so that it can be re-tested.
 */
 
function reset() {

  var service = getService();
  service.reset();
}

/**
 * Configures the service.
 */
 
function getService() {

  return OAuth1.createService('Xero')
  
    // Set the endpoint URLs.
    .setRequestTokenUrl(REQUEST_TOKEN_URL)
    .setAuthorizationUrl(AUTHORIZE_URL)
    .setAccessTokenUrl(ACCESS_TOKEN_URL)
    
    // Set the consumer key and secret.
    .setConsumerKey(CONSUMER_KEY)
    .setConsumerSecret(CONSUMER_SECRET)
    
    // Set the name of the callback function in the script referenced
    // above that should be invoked to complete the OAuth flow.
    .setCallbackFunction('authCallback')
    
    // Set the property store where authorized tokens should be persisted.
    .setPropertyStore(PropertiesService.getUserProperties());
}

/**
 * Handles the OAuth2 callback.
 */
 
function authCallback(request) {

  var service = getService();
  
  var authorized = service.handleCallback(request);
  
  if (authorized) {
  
    return HtmlService.createHtmlOutput('Success!');
    
  } else {
  
    return HtmlService.createHtmlOutput('Denied');
  }
}
