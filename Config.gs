// 34567890123456789012345678901234567890123456789012345678901234567890123456789

// JSHint - TODO
/* jshint asi: true */

// Code review all files - TODO
// JSHint review (see files) - TODO
// Unit Tests - TODO
// System Test (Dev) - TODO
// System Test (Prod) - TODO

// Config.gs
// =========
//
// All the constans and configuration settings

// Configuration
// =============

var SCRIPT_NAME = "XeroApp"
var SCRIPT_VERSION = "v2.0 (Dev)"

var PRODUCTION_VERSION = false

var ACCOUNTS_HIERARCHY_SHEET_NAME = "Accounts Hierarchy"
var ACCOUNTS_SHEET_NAME = "Accounts Download"

var RESPONSE_NUMBER = 'FD309906' // 'INV-0065'

// Log Library
// -----------

var LOG_LEVEL = PRODUCTION_VERSION ? Log.Level.INFO : Log.Level.ALL
var LOG_SHEET_ID = ''
var LOG_DISPLAY_FUNCTION_NAMES = Log.DisplayFunctionNames.YES

// Assert library
// --------------

var SEND_ERROR_EMAIL = PRODUCTION_VERSION ? false : true
var HANDLE_ERROR = Assert.HandleError.THROW
var ADMIN_EMAIL_ADDRESS = 'andrewr1969+xeroapp@gmail.com,jonathan.gaunt@fd-works.co.uk'

// CBL Library
// -----------

var CBL_DISABLE = false

// For testing needs to be at least 45s to stop them overlapping, but the 
// timeout has to be less than this or they'll overlap
// var CBL_NEXT_TRIGGER_MS = 2 * 60 * 1000
var CBL_NEXT_TRIGGER_MS = 7 * 60 * 1000 // 7 mins

var CBL_FORCE_TIMEOUT = false

// var CBL_TIME_RUN_OUT_SECONDS = 30
var CBL_TIME_RUN_OUT_SECONDS = 300

var CBL_BATCH_FUNCTION_NAME = 'invoicesDownload'

var CBL_COMPLETE_EMAIL_TITLE = 'Invoice download complete'
var CBL_ERROR_EMAIL_TITLE = 'Error downloading Invoices'

var CBL_PREFIX = 'CBL_'
var CBL_START_BATCH_POSTFIX = '_START_BATCH'
var CBL_KEY_POSTFIX = '_KEY'
var CBL_TRIGGER_ID_POSTFIX = '_TRIGGER_ID'
  
// Constants/Enums
// ===============

var RESPONSE_TYPE = {
  CREDIT_NOTE: 'CREDIT_NOTE',
  INVOICE: 'INVOICE',
}

var INVOICE_STATUS = [
  'DRAFT',
  'SUBMITTED', 
  'DELETED', 
  'VOIDED',
]

var SUB_PANEL_CSS = {
  backgroundColor: '#f7f7f7',
  border: '1px solid grey',
  padding: '10px'
};

var ACCPAY_SHEET_NAME = 'ACCPAY'
var ACCREC_SHEET_NAME = 'ACCREC'
var SETTINGS_SHEET_NAME = 'Settings'
var TRIAL_BALANCES_SHEET_NAME = 'Trial Balances'

var TRIAL_BALANCE_URL = 'Reports/TrialBalance'
var INVOICE_URL = 'Invoices'

var REPORTING_DATE_CELL = 'B1'
var START_DATE_CELL = 'B2'
var END_DATE_CELL = 'B3'

var DATE_STRING_TYPE_1 = 'DATE_STRING_TYPE_1' // "2016-07-18T00:00:00"
var DATE_STRING_TYPE_2 = 'DATE_STRING_TYPE_2' // "/Date(1437955200000+0000)/"

// Exponential Backoff
// -------------------

var ENABLE_EXPONENTIAL_BACKOFF = true
var BACKOFF_WAIT = 1000
var BACKOFF_TRIES = 5
var MINIMUM_ERROR_LENGTH = 15
var BACKOFF_ON_ALL_ERRORS = false

var BACKOFF_ON_ERRORS = [
  "Exception: Service invoked too many times",
  "Exception: Rate Limit Exceeded",
  "Exception: Quota Error: User Rate Limit Exceeded",
  "Service error: Spreadsheets",
  "Exception: Internal error. Please try again.",
  "Exception: Cannot execute AddColumn because another task",
  "Execution failed: Service invoked too many times in a short time",
]

// Xero API
// --------

var BASE_URL = 'https://api.xero.com';
var REQUEST_TOKEN_URL = BASE_URL + '/oauth/RequestToken';
var AUTHORIZE_URL = BASE_URL + '/oauth/Authorize';
var ACCESS_TOKEN_URL = BASE_URL + '/oauth/AccessToken';
var API_END_POINT = BASE_URL + '/api.xro/2.0';

// Function Template
// -----------------

/**
 *
 * 
 * @param {Object}
 *
 * @return {Object}
 */
 
function functionTemplate() {

  Log.functionEntryPoint()
  
  

} // functionTemplate() 
