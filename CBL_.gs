
// Taken from the Gist as the library wasn't using the latest version
//
// https://gist.github.com/patt0/8395003

/**
 *  ---  Continous Execution Library ---
 *
 *  Copyright (c) 2013 Patrick Martinent
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
 
// Continuous Batch Library
// ------------------------

var CBL = (function() {

var interationStart

return {

/*
 * Call this function at the start of your batch script
 * it will create the necessary ScriptProperties with the fname
 * so that it can keep managing the triggers until the batch
 * execution is complete. It will store the start time for the
 * email it sends out to you when the batch has completed
 *
 * @param {String} fname The batch function to invoke repeatedly [OPTIONAL].
 */

startOrResumeContinousExecutionInstance: function(fname) {

  Log.functionEntryPoint()

  if (CBL_DISABLE) {
    return
  }

  fname = Utils_.getDefault(fname, CBL_BATCH_FUNCTION_NAME)

  var properties = PropertiesService.getUserProperties()
  var start = properties.getProperty(CBL_PREFIX + fname + CBL_START_BATCH_POSTFIX)
  
  if (start === '' || start === null)
  {
    start = new Date()
    properties.setProperty(CBL_PREFIX + fname + CBL_START_BATCH_POSTFIX, start)
    properties.setProperty(CBL_PREFIX + fname + CBL_KEY_POSTFIX, "")
  }
  
  interationStart = new Date()
  Log.fine('interationStart: ' + interationStart)
  
  deleteCurrentTrigger_(fname)
  enableNextTrigger_(fname)
  
}, // CBL.startOrResumeContinousExecutionInstance()
 
/*
 * In order to be able to understand where your batch last executed you
 * set the key ( or counter ) everytime a new item in your batch is complete
 * when you restart the batch through the trigger, use getBatchKey to start 
 * at the right place
 *
 * @param {String} key The batch key that was just completed.
 * @param {String} fname The batch function we are continuously triggering [OPTIONAL]
 */

setBatchKey: function (key, fname){

  Log.functionEntryPoint()
  
  fname = Utils_.getDefault(fname, CBL_BATCH_FUNCTION_NAME)
  
  checkInitialised()
    
  var properties = PropertiesService.getUserProperties()
  properties.setProperty(CBL_PREFIX + fname + CBL_KEY_POSTFIX, key)
  
}, // CBL.setBatchKey()
 
/*
 * This function returns the current batch key, so you can start processing at
 * the right position when your batch resumes from the execution of the trigger
 *
 * @param {String} fname The batch function we are continuously triggering [OPTIONAL]
 *
 * @return {String} The batch key which was last completed or null
 */

getBatchKey: function(fname) {

  Log.functionEntryPoint()
  
  fname = Utils_.getDefault(fname, CBL_BATCH_FUNCTION_NAME)
    
  checkInitialised()  
  
  var properties = PropertiesService.getUserProperties()
  return properties.getProperty(CBL_PREFIX + fname + CBL_KEY_POSTFIX)
  
}, // CBL.getBatchKey()

/*
 * When the batch is complete run this function, and pass it an email and
 * custom title so you have an indication that the process is complete as
 * well as the time it took
 *
 * @param {emailRecipient} str The email address to which the email will be sent.
 * @param {customTitle} str The custom title for the email
 * @param {fname} str The batch function we are continuously triggering [OPTIONAL]
 */

endContinuousExecutionInstance: function(emailRecipient, customTitle, fname) {

  Log.functionEntryPoint()

  if (CBL_DISABLE) {
    return
  }

  fname = Utils_.getDefault(fname, CBL_BATCH_FUNCTION_NAME)

  checkInitialised()
  
  var properties = PropertiesService.getUserProperties()
  var end = new Date()
  var start = properties.getProperty(CBL_PREFIX + fname + CBL_START_BATCH_POSTFIX)
  var key = properties.getProperty(CBL_PREFIX + fname + CBL_KEY_POSTFIX)
 
  var emailTitle = customTitle + " : Continuous Execution Script for " + fname;
  var body = "Started : " + start + "<br>" + "Ended :" + end + "<br>" + "LAST KEY : " + key;
  
  if (emailRecipient) {
    MailApp.sendEmail(emailRecipient, emailTitle, "", {htmlBody:body})
  }
  
  deleteCurrentTrigger_(fname)
  properties.deleteProperty(CBL_PREFIX + fname + CBL_START_BATCH_POSTFIX)
  properties.deleteProperty(CBL_PREFIX + fname + CBL_KEY_POSTFIX)
  properties.deleteProperty(CBL_PREFIX + fname + CBL_TRIGGER_ID_POSTFIX)
    
}, // CBL.endContinuousExecutionInstance()
 
/*
 * Call this function when finishing a batch item to find out if we have
 * time for one more. if not exit elegantly and let the batch restart with
 * the trigger
 *
 * @param {String} fname The batch function we are continuously triggering [OPTIONAL]
 *
 * @return {Boolean} whether we are close to reaching the exec time limit
 */

isTimeRunningOut: function(fname) {

  Log.functionEntryPoint()

  if (CBL_DISABLE) {
    return
  }

  if (CBL_FORCE_TIMEOUT) {
    return true
  }

  fname = Utils_.getDefault(fname, CBL_BATCH_FUNCTION_NAME)

  checkInitialised()

  var now = new Date()
  var timeElapsed = Math.floor((now.getTime() - interationStart.getTime())/1000)
  Log.fine('timeElapsed: ' + timeElapsed)
  
  return (timeElapsed > CBL_TIME_RUN_OUT_SECONDS)
  
}, // CBL.isTimeRunningOut()

} // CBL object return

// Private functions
// -----------------

/*
 * Set the next trigger
 *
 * @param {String} fname The batch function we are continuously triggering [OPTIONAL]
 *
 */

function enableNextTrigger_(fname) {

  Log.functionEntryPoint()

  var nextTrigger = Utils_.rateLimitExpBackoff(function() {
    return ScriptApp.newTrigger(fname).timeBased().after(CBL_NEXT_TRIGGER_MS).create();
  })
  
  var triggerId = nextTrigger.getUniqueId();
 
  PropertiesService.getUserProperties()
    .setProperty(CBL_PREFIX + fname + CBL_TRIGGER_ID_POSTFIX, triggerId);
  
} // CBL.enableNextTrigger_()
 
/*
 * Deletes the current trigger, so we don't end up with undeleted
 * time based triggers all over the place
 *
 * @param {String} fname The batch function we are continuously triggering [OPTIONAL]
 */

function deleteCurrentTrigger_(fname) {

  Log.functionEntryPoint()

  var properties = PropertiesService.getUserProperties();
  var triggerId = properties.getProperty(CBL_PREFIX + fname + CBL_TRIGGER_ID_POSTFIX);
  var triggers = ScriptApp.getProjectTriggers();
  
  for (var i in triggers) {
  
    if (triggers[i].getUniqueId() === triggerId) {

      Utils_.rateLimitExpBackoff(function() {
        ScriptApp.deleteTrigger(triggers[i]);
      })
      
      break;
    }
  }
  
  properties.setProperty(CBL_PREFIX + fname + CBL_TRIGGER_ID_POSTFIX, '');
  
} // CBL.deleteCurrentTrigger_()

/*
 * Check that the object has been initialised
 */
 
function checkInitialised() {

  if (!(interationStart instanceof Date)) {
    throw new Error('CBL not initialised - call CBL.startOrResumeContinousExecutionInstance() first')
  }
 
} // CBL.checkInitialised()

})() // CBL  