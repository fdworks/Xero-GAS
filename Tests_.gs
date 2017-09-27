// 34567890123456789012345678901234567890123456789012345678901234567890123456789

// JSHint - TODO
/* jshint asi: true */

// Tests.gs
// ========

function test_string() {
  var a = 2.0
//  throw new Error(Math.floor(a))
//  throw new Error(a)
  PropertiesService.getScriptProperties().setProperty('test1', Math.floor(a).toString())
}

function test_splitDates() {

  var startDate = new Date(2016, 11, 4)
  var endDate = new Date(2017, 0, 5)
  var testDate = startDate
  
  while (testDate < endDate) {

    // Get the last day of this month
    testDate = new Date(testDate.getYear(), testDate.getMonth() + 1, 0)
    Logger.log(testDate)
    
    // Move onto the first day of next month
    testDate = new Date(testDate.getYear(), testDate.getMonth() + 1, 1)
    Logger.log(testDate)    
  }
}

function test_encode() {
  var a  = encodeURIComponent('https://api.xero.com/api.xro/2.0/reports/TrialBalance?date=2016-07-01')
  return
}

function test_time() {
  var a = new Date().getTimezoneOffset()
  return a
}

function test_regex() {

  var account = 'Sales (200)'
  var regExp = /\(([^)]+)\)/
  var code = regExp.exec(account)
  return code

}

function test_doServerSomething() {
  var a = invoicesDownload() 
  return
}

function test_dumpConfig() {
  Logger.log(PropertiesService.getUserProperties().getProperties())
}

function test_clearConfig() {
  PropertiesService.getScriptProperties().deleteAllProperties()
}

function test_datesBigger() {

  var a = new Date(2016, 3, 5) // 5Apr2016
  var b = new Date(2016, 3, 4) // 4Apr2016
  var c = ''
    
  if (b > a) {
    throw new Error('Bigger') 
  }
}

// 1437955200000

function test_systemTime() {

  var a = new Date(1437955200000)
  return
}

function test_TrialBalances() {
  var a = TrialBalance_.download()
  return
}