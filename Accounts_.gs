// 34567890123456789012345678901234567890123456789012345678901234567890123456789

// JSHint - TODO
/* jshint asi: true */

// Accounts_.gs
// ============

var Accounts_ = {

/**
 * Download all the Accounts data
 *
 * @return {Array} account data array
 */

download: function() {

  Log.functionEntryPoint()

  var ss = SpreadsheetApp.getActiveSpreadsheet()
  var gotSheet = (ss !== null)
  
  if (gotSheet) {
  
    var sheet = ss.getSheetByName(ACCOUNTS_SHEET_NAME)
    
    if (sheet === null) {
      sheet = ss.insertSheet(ACCOUNTS_SHEET_NAME)
    }
    
    sheet.clearContents()
    
    if (sheet.getLastRow() === 0) {
      var arrHeaders = ['Name']
      sheet.appendRow(arrHeaders).getRange(1, 1, 1, 1).setFontWeight('bold')
    }
  }

  var accountsNames = []
  var pageNo = 1
  var moreData = true

  // Connect to Xero
  XeroApi_.connect()   
  
  while (moreData) {
  
    var accounts
    
    if (gotSheet) {
      ss.toast('Downloading page ' + pageNo + ' ...')
    }
    
    var accountsInfo = XeroApi_.fetchData('Accounts', pageNo)
    
    if (accountsInfo !== null) {
      accounts = accountsInfo.Accounts
    } else {
      return []
    }
    
    // If less than 100 records returned, there are no more records
    if (accounts.length < 100) {
      moreData = false 
    } else {
      pageNo++
    }
    
    // Processing the result and update Invoices data in the sheet    
    for (var i = 0; i < accounts.length; i++) {
      
      var account = accounts[i]            
      var name = (account.Name != null) ? account.Name : ""
      accountsNames.push(name)
      
      // Add data in the Spreadsheet    
      var arr = [name]
      
      if (gotSheet) {
        sheet.appendRow(arr)
      }
    }
  }           
     
  return accountsNames
  
}, // Accounts_.download()

}
