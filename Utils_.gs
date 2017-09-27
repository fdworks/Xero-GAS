// 34567890123456789012345678901234567890123456789012345678901234567890123456789

// JSHint - TODO
/* jshint asi: true */

// Utils_.gs
// =========
//
// Local utilities object

var Utils_ = {

// Normalizes a string, by removing all alphanumeric characters and using mixed case
// to separate words. The output will always start with a lower case letter.
// This function is designed to produce JavaScript object property names.
//
// Arguments:
//   - header: string to normalize
//
// Examples:
//   "First Name" -> "firstName"
//   "Market Cap (millions) -> "marketCapMillions
//   "1 number at the beginning is ignored" -> "numberAtTheBeginningIsIgnored"

normalizeString: function(stringValue) {

  Log.functionEntryPoint();

  var key = "";
  var upperCase = false;
  for (var i = 0; i < stringValue.length; ++i) {
    var letter = stringValue[i];
    if (letter == " " && key.length > 0) {
      upperCase = true;
      continue;
    }
    //if (!isAlnum(letter)) {
    //  continue;
    //}
    if (key.length == 0 && isDigit(letter)) {
      continue; // first character must be a letter
    }
    if (upperCase) {
      upperCase = false;
      key += letter.toUpperCase();
    } else {
      key += letter.toLowerCase();
    }
  }
  
  return key;
  
  // Private Functions
  // -----------------
  
  // Returns true if the character char is alphabetical, false otherwise.
  
  function isAlnum(char) {
    
    return char >= 'A' && char <= 'Z' ||
      char >= 'a' && char <= 'z' ||
        isDigit(char);
    
  } // isAlnum()
  
  // Returns true if the character char is a digit, false otherwise.
  
  function isDigit(char) {
    
    return char >= '0' && char <= '9';
    
  } // isDigit()
  
}, // normalizeString()

/**
 *
 */
 
generateRandomString: function (n) {

  Log.functionEntryPoint();
  var chars = ['a', 'b','c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  chars.push('A', 'B', 'C', 'D', 'E', 'F','G','H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z');
  var randomString = '';  
  for (i=0; i < n; i++) {
    r  = Math.random();
    r = r * 61; 
    r = Math.round(r);  
    randomString = randomString + chars[r];
  }  
  return randomString;
},  

/**
 * Take a string of various formats and convert it 
 * into a date object
 * 
 * @param {String} dateString
 * @param {String} type [OPTIONAL, default DATE_STRING_TYPE_1]
 * 
 * @return {Date} date or null
 */
 
getDate: function(dateString, type) {

  Log.functionEntryPoint()
  
  if (dateString === '' || typeof dateString === 'undefined') {
    Log.finer('Empty date string')
    return null
  }
  
  var localDateString = dateString.slice(0)
  var date = null

  if (type === DATE_STRING_TYPE_2) {
  
    localDateString = parseInt(localDateString.substr(6, 13), 10)
    date = new Date(localDateString) || 0
      
  } else {
  
    localDateString = localDateString.substr(0, 10)
    var year = localDateString.substr(0, 4)
    var month = localDateString.substr(5, 2)
    var day = localDateString.substr(8, 2)
    Log.finer('year: ' + year + ', month: ' + month + ', day: ' + day)
    date = new Date(year, month - 1, day)  
  }

  Log.finer('date: ' + date)

  return date

}, // Utils_.getDate() 

/**
 * Check if a value is NaN
 * 
 * @param {Number} value
 *
 * @return {Number} the number or 0 if NaN
 */
 
checkNaN: function(value) {

  Log.functionEntryPoint()
  return (value !== value) ? 0 : value
  
}, // checkNaN() 

/**
 * Taken from http://ramblings.mcpher.com/Home/excelquirks/dbabstraction/expback
 *
 * recursive rateLimitExpBackoff()
 *
 * @param {function} callBack some function to call that might return rate limit exception
 * @param {number} [sleepFor=1000] optional amount of time to sleep for on the first failure in missliseconds
 * @param {number} [maxAttempts=5] optional maximum number of amounts to try
 * @param {number} [attempts=1] optional the attempt number of this instance - usually only used recursively and not user supplied
 * @param {boolean} [optLogAttempts=false] log re-attempts to Logger
 * @return {object} results of the callback 
 */
  
rateLimitExpBackoff: function(callBack, sleepFor, maxAttempts, attempts , optLogAttempts) {
  
  Log.functionEntryPoint()
  
  var callingfunction = 'Utils_.rateLimitExpBackoff()'
  
  sleepFor = Math.abs(sleepFor || BACKOFF_WAIT);  
  attempts = Math.abs(attempts || 1);
  maxAttempts = Math.abs(maxAttempts || BACKOFF_TRIES);
  
  // Check properly constructed
  
  Assert.assert(
    callBack && typeof(callBack) === "function", 
    callingfunction, 
    'You need to specify a function for rateLimitBackoff to execute')

  if (!ENABLE_EXPONENTIAL_BACKOFF) {
    return callBack()
  }
  
  // Try to execute it
  try {
      
    var r = callBack();
    return r;
      
  } catch(error) {
      
    if (optLogAttempts) {
      Log.info("backoff " + attempts + ": " + error)
    }
    
    // Failed due to rate limiting?
    if (errorQualifies(error)) {
      
      Assert.assert(
        attempts <= maxAttempts, 
        callingfunction, 
        error + " (tried backing off " + (attempts - 1) + " times")
      
      // Wait for some amount of time based on how many times 
      // we've tried plus a small random bit to avoid races
      
      var wait = Math.pow(2,attempts) * sleepFor
      var randomWait = Math.round(Math.random() * sleepFor)
      Utilities.sleep(wait + randomWait);
      
      // Try again
      return rateLimitExpBackoff(callBack, sleepFor,  maxAttempts, attempts + 1, optLogAttempts);
     
    } else {
        
      // Some other error
      throw (error);
    }
  }

  // Private Functions
  // -----------------
  
  /**
   * Check if the error text matches that in the list
   * of qualifying errors
   */
   
  function errorQualifies (errorText) {
    
    Log.functionEntryPoint('Error text: ' + errorText)
    
    if (BACKOFF_ON_ALL_ERRORS) {
      return true
    }
    
    var foundQualifyingError = BACKOFF_ON_ERRORS.some(function(nextErrorToCompare){
    
      var errorLongEnough = nextErrorToCompare.length > MINIMUM_ERROR_LENGTH
      var strippedText = errorText.toString().slice(0, nextErrorToCompare.length)
      Log.finest('stripped text: ' + strippedText)          
      return (errorLongEnough && (strippedText === nextErrorToCompare))
    })
    
    Log.finest('Error qualifies: ' + foundQualifyingError)
    
    return foundQualifyingError     
  }
    
}, // Utils_.rateLimitExpBackoff

/*
 * Get a default value
 */
 
getDefault: function(value, defaultValue) {

  Log.functionEntryPoint()
  Assert.assertDefined(defaultValue, 'Utils_.getDefault()', 'No default value')
  return (value === '' || typeof value === 'undefined') ? defaultValue : value

}, // Utils_.getDefault()

isConnected: function() {
  Log.functionEntryPoint()
  var value = PropertiesService.getUserProperties().getProperty('isConnected')
  var isConnected = (value === 'true') ? true : false
  Log.fine('isConnected: ' + isConnected)
  return isConnected
},

} // Utils_

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent()
}