// 34567890123456789012345678901234567890123456789012345678901234567890123456789

// JSHint - TODO
/* jshint asi: true */

// TrialBalance_.gs
// ================

var TrialBalance_ = {

/**
 * Download the trial balance
 *
 * @param {boolean} useReportingDate
 *
 * @return {Array} data array
 */

download: function(useReportingDate) {

  Log.functionEntryPoint()
  var callingfunction = 'TrialBalance_.download'
  
  Log.fine('useReportingDate: ' + useReportingDate)
  
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet()
  spreadsheet.toast('Downloading trial balance')
  
  var trialBalancesSheet = spreadsheet.getSheetByName(TRIAL_BALANCES_SHEET_NAME)

  trialBalancesSheet
    .getRange(2, 1, trialBalancesSheet.getLastRow(), trialBalancesSheet.getLastColumn())
    .clear()

  var settingsSheet = spreadsheet.getSheetByName(SETTINGS_SHEET_NAME)
  var reportingDateString
  var gmtString

  if (useReportingDate) {

    var reportingDate = settingsSheet.getRange(REPORTING_DATE_CELL).getValue()    
    Assert.assertDate(reportingDate, callingfunction, 'No reporting date')
    
    gmtString = reportingDate.getTimezoneOffset() === -60 ? 'GMT+1' : 'GMT'
    reportingDateString = Utilities.formatDate(reportingDate, gmtString, 'yyyy-MM-dd')
    Log.fine('reportingDateString: ' + reportingDateString)
    
    getTrialBalance(reportingDateString)
    
  } else {
  
    var startDate = settingsSheet.getRange(START_DATE_CELL).getValue()
    Assert.assertDate(startDate, callingfunction, 'No start date')
    Log.fine('startDate: ' + startDate)
        
    var endDate = settingsSheet.getRange(END_DATE_CELL).getValue()
    Assert.assertDate(endDate, callingfunction, 'No end date')
    Log.fine('endDate: ' + endDate)

    var testDate = startDate

    while (testDate < endDate) {
    
      if (testDate.getMonth() === endDate.getMonth() &&
          testDate.getYear() === endDate.getYear()) {
      
        // We've reached the final month so use the end date to get the report
        testDate = endDate
        
        Log.fine('In last month')
        Log.fine('testDate: ' + testDate)
            
      } else {
  
        // Get the last day of this month
        testDate = new Date(testDate.getYear(), testDate.getMonth() + 1, 0)
        
        Log.fine('Get the last day of this month')
        Log.fine('testDate: ' + testDate)
        
      }
      
      // Gotcha: Sometimes the dates are stored in GMT, sometimes in BST so need
      // to not assume the timezone although you'd think you only needed to get it once
      gmtString = testDate.getTimezoneOffset() === -60 ? 'GMT+1' : 'GMT' 
      
      var reportingDateString = Utilities.formatDate(testDate, gmtString, 'yyyy-MM-dd')
      Log.fine('reportingDateString: ' + reportingDateString)      
      
      getTrialBalance(reportingDateString)      
      
      // Move onto the first day of next month
      testDate = new Date(testDate.getYear(), testDate.getMonth() + 1, 1)
      Log.fine('testDate: ' + testDate)          
    }
  }

  spreadsheet.toast('Finished download')
  return true
  
  // Private Functions
  // -----------------
  
  /**
   * Get the trial balance for a particular date and write it to the 
   * sheet
   *
   * @param {String} reportingDateString (YYYY-MM-dd)
   */
  
  function getTrialBalance(reportingDateString) {
  
    var responseData = XeroApi_.fetchData(TRIAL_BALANCE_URL, reportingDateString, 'date')
  
    if (responseData === null) {
      throw new Error('Could not get Trial Balances data')
    }
    
    var data = []
    var newDataRow = []    
    var accountTypes = responseData.Reports[0].Rows
    accountTypes.shift() // Remove the header  
    var numberOfAccountTypes = accountTypes.length
    Log.fine('numberOfAccountTypes: ' + numberOfAccountTypes)
  
    for (var accountTypeIndex = 0; 
         accountTypeIndex < numberOfAccountTypes; 
         accountTypeIndex++) {
    
      var accounts = accountTypes[accountTypeIndex].Rows
      var numberOfAccounts = accounts.length
      Log.finer('numberOfAccounts: ' + numberOfAccounts)
          
      for (var accountIndex = 0; accountIndex < numberOfAccounts; accountIndex++) {
          
        var columns = accounts[accountIndex].Cells
        var numberOfColumns = columns.length
        Log.finer('numberOfColumns: ' + numberOfColumns)
        var addRow = false
        
        newDataRow.push(reportingDateString)
    
        for (var cellIndex = 0; cellIndex < numberOfColumns; cellIndex++) {
    
          var cell = columns[cellIndex]
          var cellValue = cell.Value
          Log.finer('cellValue: ' + cellValue)
          
          if (cellIndex === 0) {
          
            // Account name and code
          
            Log.finer('Cell index: ' + 0)
            
            if (cell.hasOwnProperty('Attributes')) {
            
              var id = cell.Attributes[0].Id
    
              Log.finer('id: ' + id)
    
              if (id === 'account') {     
                    
                var account = cellValue          
                Log.finer('account: ' + account)
                
                var regExp = /\(([^)]+)\)/
                var accountCode = regExp.exec(account)[1]
                var description = account.replace(/\s*\(.*?\)\s*/g, '')
      
                newDataRow.push(accountCode)
                newDataRow.push(description)
                
                addRow = true
             }
           }
            
         } else if (cellIndex === 1) {
         
           var debit = Utils_.checkNaN(parseFloat(cellValue, 10))       
           Log.finer('debit: ' + debit)
           
         } else if (cellIndex === 2) {
         
           var credit = Utils_.checkNaN(parseFloat(cellValue, 10))    
           Log.finer('credit: ' + credit)
           
           newDataRow.push(credit - debit)
           
         } else if (cellIndex === 3) {
         
           var ytdDebit = Utils_.checkNaN(parseFloat(cellValue, 10))  
           Log.finer('ytdDebit: ' + ytdDebit)
           
         } else if (cellIndex === 4) {
         
           var ytdCredit = Utils_.checkNaN(parseFloat(cellValue, 10))    
           Log.finer('ytdCredit: ' + ytdCredit)
           
           newDataRow.push(ytdCredit - ytdDebit)       
         }
         
        } // for each cell
        
        if (addRow) {
          data.push(newDataRow.slice())
          newDataRow = []
          addRow = false
        }
      
      } // for each account
      
    } // for each accountType

    trialBalancesSheet
      .getRange(
        trialBalancesSheet.getLastRow() + 1, 
        1, 
        data.length, 
        data[0].length)
      .setValues(data)
      
    Log.info('Written trial balance (' + reportingDateString + ') to sheet')
    
  } // TrialBalance_.download.getTrialBalance()
  
}, // TrialBalance_.download()

} // TrialBalance_