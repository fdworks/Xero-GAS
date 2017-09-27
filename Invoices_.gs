// 34567890123456789012345678901234567890123456789012345678901234567890123456789

// JSHint - TODO
/* jshint asi: true */

// Invoices_.gs
// ============

var Invoices_ = {

/**
 * Download the Invoices and separate them into ACCPAY and ACCREC
 *
 * @return {Array} invoice data array
 */

download: function() {

  Log.functionEntryPoint()
  
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet()  
  
  var reportingDate = spreadsheet
    .getSheetByName(SETTINGS_SHEET_NAME)
    .getRange(REPORTING_DATE_CELL)
    .getValue()

  Log.fine('reportingDate: ' + reportingDate)

  spreadsheet.toast('Downloading invoices')
  
  // Get the Invoices
  // ----------------
  
  var responseData = Api_.fetchData('Invoices')
    
  if (responseData === null) {
    throw new Error('Could not get Invoice data')
  } else {
    Log.fine('Fetch complete')
  }
    
  processResponsesAndWriteToSheet(RESPONSE_TYPE.INVOICE)
  
  // Get the CreditNotes
  // -------------------

  var responseData = Api_.fetchData('CreditNotes')
    
  if (responseData === null) {
    throw new Error('Could not get CreditNote data')
  } else {
    Log.fine('Fetch complete')
  }
    
  processResponsesAndWriteToSheet(RESPONSE_TYPE.CREDIT_NOTE)
  
  var message = 'Finished download'
  Log.info(message)
  spreadsheet.toast(message)

  return true
  
  // Private Functions
  // -----------------

  /**
   * Process the result and update Invoices data in the sheet (the CreditNotes)
   * data is also included in the Invoices sheets)
   */
   
  function processResponsesAndWriteToSheet(type) {
  
    Log.functionEntryPoint()
    
    var responses
    
    var accPaySheet = spreadsheet.getSheetByName(ACCPAY_SHEET_NAME)
    var accRecSheet = spreadsheet.getSheetByName(ACCREC_SHEET_NAME)
    
    // Check the type upfront, after this we can just check for CREDIT_NOTES and 
    // then default to INVOICE
    
    if (type === RESPONSE_TYPE.INVOICE) {
    
      responses =  responseData.Invoices
      
      // The Invoices are written first so clear the sheet now
      accPaySheet.getRange(2, 1, accPaySheet.getLastRow(), accPaySheet.getLastColumn()).clear()
      accRecSheet.getRange(2, 1, accRecSheet.getLastRow(), accRecSheet.getLastColumn()).clear()
            
    } else if (type === RESPONSE_TYPE.CREDIT_NOTE) {

      responses =  responseData.CreditNotes

    } else {
    
      throw new Error('Unsupported response type')
    }
    
    var numberOfResponses = responses.length
    Log.fine('numberOfResponses: ' + numberOfResponses)
    
    var accPayData = []
    var accRecData = []
    
    var numberName = (type === RESPONSE_TYPE.INVOICE) ? 'InvoiceNumber' : 'CreditNoteNumber'
            
    for (var responseIndex = 0; responseIndex < numberOfResponses; responseIndex++) {
      
      var response = responses[responseIndex]
      var responseNumber = response[numberName]
      
      Log.finer('Response: ' + responseNumber + ' (' + responseIndex + ')')
            
      if (RESPONSE_NUMBER !== '' && responseNumber === RESPONSE_NUMBER) {
        Logger.log(response)
      }
            
      var responseDate = Utils_.getDate(response.DateString, DATE_STRING_TYPE_1) || ''
      Log.finer('responseDate: ' + responseDate)
      
      if (responseDate > reportingDate) {
        Log.fine('Ignoring this response as date after reporting date')      
        continue
      }
      
      // The CreditNote status are the same as those for the Invoices
      var ignoreResponse = INVOICE_STATUS.some(function(status) {
        if (response.Status === status) {
          Log.fine('Ignoring this response as ' + status)      
          return true      
        }
      })
      
      if (ignoreResponse) {
        continue      
      }

      var accType = response.Type || ''
      var currencyRate = response.CurrencyRate || 1
      
      var epPaymentDate
      
      if (accType === 'ACCREC') {
        
        // Invoice receipt
        epPaymentDate = Utils_.getDate(
          response.ExpectedPaymentDate, 
          DATE_STRING_TYPE_1
        ) || ''
        
      } else if (accType === 'ACCPAY') {
        
        // Invoice payment
        epPaymentDate = Utils_.getDate(
          response.PlannedPaymentDate, DATE_STRING_TYPE_1
        ) || '' 
      } 
      
      Log.finer('epPaymentDate: ' + epPaymentDate)
      
      var amountCredited = getCredits()
      var creditNotesAmount = amountCredited / currencyRate
      
      var amountPaid
      var amountDue
      var responseTotal

      if (type === RESPONSE_TYPE.CREDIT_NOTE) {
      
        creditNotesAmount = creditNotesAmount * -1
        responseTotal = 0
        amountDue = creditNotesAmount
        amountPaid = 0
        
      } else {
      
        // Invoice
        amountPaid = getPayments()
        responseTotal = response.Total || 0
        amountDue = responseTotal - amountPaid - amountCredited
      }
      
      var newRow = [
        response.Contact.Name || '', 
        responseNumber || '',        
        responseDate, 
        Utils_.getDate(response.DueDateString) || '', 
        epPaymentDate || '',
        responseTotal / currencyRate,     // Invoice Total
        amountPaid / currencyRate,        // Payments
        creditNotesAmount / currencyRate, // Credit Notes
        amountDue / currencyRate,         // Outstanding
      ]
      
      if (accType === 'ACCREC' || accType === 'ACCRECCREDIT') {
      
        accRecData.push(newRow)
        
      } else {
      
        // 'ACCPAY' or 'ACCPAYCREDIT'
        accPayData.push(newRow)
      }
        
    } // for each response
    
    accPaySheet
      .getRange(
        2, 
        1, 
        accPayData.length, 
        accPaySheet.getLastColumn())
      .setValues(accPayData)

    accRecSheet
      .getRange(
        2, 
        1, 
        accRecData.length, 
        accRecSheet.getLastColumn())
      .setValues(accRecData)

    return
    
    // Private Functions
    // -----------------
    
    /**
     * get Payments
     * 
     * @return {Number} amountPaid
     */
     
    function getPayments() {
    
      Log.functionEntryPoint()
      
      var amountPaid = 0
      
      response.Payments.forEach(function(payment) {
        
        var thisPaymentDate = Utils_.getDate(payment.Date, DATE_STRING_TYPE_2)
        Log.finer('thisPaymentDate: ' + thisPaymentDate)
        
        if (thisPaymentDate <= reportingDate) {
          
          Log.finer('Recording payment')
          amountPaid += payment.Amount
          
        } else {
          
          Log.fine('Ignoring payment as date after reporting date')
        }
      })

      response.Prepayments.forEach(function(prepayment) {
        Log.fine('Recording prepayment')
        amountPaid += prepayment.AppliedAmount
      })

      response.Overpayments.forEach(function(overpayment) {
        Log.fine('Recording overpayment')
        amountPaid += overpayment.AppliedAmount
      })

      return amountPaid
        
    } // Invoices_.download.getPayments() 
  
    /**
     * getCredits
     * 
     * @return {Number} amount credited
     */
     
    function getCredits() {
    
      Log.functionEntryPoint()
      
      var amountCredited = 0
      
      if (accType === 'ACCRECCREDIT' || accType === 'ACCPAYCREDIT') {
      
        // CreditNotes don't have a Payment value
        return response.RemainingCredit
      }
            
      response.CreditNotes.forEach(function(creditNote) {
        
        var thisCreditNoteDate = Utils_.getDate(creditNote.Date, DATE_STRING_TYPE_2)
        Log.finer('thisCreditNoteDate: ' + thisCreditNoteDate)
        
        if (thisCreditNoteDate <= reportingDate) {
          
          Log.finer('Recording credit note')        
          amountCredited += creditNote.AppliedAmount
          
        } else {
          
          Log.fine('Ignoring credit note as date after reporting date')
        }
      })
      
      return amountCredited
      
    } // Invoices_.download.getCredits() 
    
  } // Invoices_.download.processResponsesAndWriteToSheet() 

}, // Invoices_.download()

/**
 * Download all the Invoices data
 *
 * @return {Array} invoice data array
 */

fullDownload: function() {

  Log.functionEntryPoint()

  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet()
  var downloadSheet = spreadsheet.getSheetByName("Invoices Download")
  
  if (downloadSheet === null) {
    downloadSheet = spreadsheet.insertSheet("Invoices Download")    
  }

  if (downloadSheet.getLastRow() === 0) {

      var arrHeaders = [
      'Type', 
      'Contact Name', 
      'Date',	
      'Due Date', 
      'Status', 
      'Line Amount Types', 
      'Sub Total',	
      'Total Tax', 
      'Total', 
      'Updated Date (UTC)',	
      'Currency Code', 
      'Invoice ID', 
      'Invoice Number', 
      'Amount Due', 
      'Amount Paid', 
      'Amount Credited']
      
    downloadSheet
      .appendRow(arrHeaders)
      .getRange(1, 1, 1, 16)
        .setFontWeight('bold') 
  }

  var lineInvoiceSheet = spreadsheet.getSheetByName("Download - Invoices Line Items") 

  if (lineInvoiceSheet === null) {
    spreadsheet.insertSheet("Download - Invoices Line Items")      
  }
  
  if (lineInvoiceSheet.getLastRow() === 0) {
  
    var liHeaders = [
      'Invoice ID', 
      'Invoice Number', 
      'Description', 
      'Quantity',	
      'Unit Amount', 
      'Tax Type', 
      'Tax Amount', 
      'Line Amount',	
      'Account Code']
      
    lineInvoiceSheet
      .appendRow(liHeaders)
      .getRange(1, 1, 1, 9)
        .setFontWeight('bold')
  }
  
  var pageNo = 1
  var moreData = true
  
  Api_.connect()
  
  while (moreData) {
  
    spreadsheet.toast('Downloading page ' + pageNo + ' ...')
    
    var responseData = Api_.fetchData(INVOICE_URL, pageNo)
    var invoices    
    
    if (responseData !== null) {
    
      invoices = responseData.Invoices 
      
    } else {
    
      throw new Error('Could not get Invoice data')
    }

    // If less than 100 records returned, there are no more records
    if (invoices.length < 100) {
    
      moreData = false 
      
    } else {
    
      pageNo++
    }
    
    // Process the result and update Invoices data in the sheet  
    
    for (var i = 0; i < invoices.length; i++) {
    
      var invoice         = invoices[i]      
      var accType         = (invoice.Type !== null) ? invoice.Type : ""
      var contactName     = (invoice.Contact !== null) ? invoice.Contact.Name : "" 
      var date            = (invoice.DateString !== null) ? invoice.DateString : ""
      var dueDate         = (invoice.DueDateString !== null) ? invoice.DueDateString : ""
      var status          = (invoice.Status !== null) ? invoice.Status  : ""
      var lineAmountTypes = (invoice.LineAmountTypes !== null) ? invoice.LineAmountTypes : ""
      
      // Line Items present in the Middle
      var subTotal       = (invoice.SubTotal !== null) ? invoice.SubTotal : ""
      var totalTax       = (invoice.TotalTax !== null) ? invoice.TotalTax : ""
      var total          = (invoice.Total !== null)    ? invoice.Total    : ""
      var updatedDateUTC = (invoice.UpdatedDateUTC !== null) ?  eval('new ' + invoice.UpdatedDateUTC.substr(1, invoice.UpdatedDateUTC.length - 2) + '.toISOString()') : ""         
      var currencyCode   = (invoice.CurrencyCode !== null) ? invoice.CurrencyCode : ""
      var invoiceID      = (invoice.InvoiceID !== null) ? invoice.InvoiceID : ""
      var invoiceNumber  = (invoice.InvoiceNumber !== null) ? invoice.InvoiceNumber : ""
      
      // Payments present in the Middle
      var amountDue      = (invoice.AmountDue !== null) ? invoice.AmountDue : ""
      var amountPaid     = (invoice.AmountPaid !== null) ? invoice.AmountPaid : ""
      var amountCredited = (invoice.AmountCredited !== null) ? invoice.AmountCredited : 0
      
      // Add Line Items to the Invoice in the end, because all other fields for 
      // invoice will be common       
      
      var lineItems = (invoice.LineItems !== null) ? invoice.LineItems : []
      
      for (var k = 0; k < lineItems.length; k++) {
      
        var item         = lineItems[k]         
        var description  = (item.Description !== null ) ? item.Description : ""
        var quantity     = (item.Quantity !== null) ? item.Quantity : ""
        var unitAmount   = (item.UnitAmount !== null) ? item.UnitAmount : ""
        var taxType      = (item.TaxType !== null) ? item.TaxType : ""
        var taxAmount    = (item.TaxAmount !== null) ? item.TaxAmount : ""
        var lineAmount   = (item.LineAmount !== null) ? item.LineAmount : ""
        var accountCode  = (item.AccountCode !== null) ? item.AccountCode : ""
        
        var tmp = [
          invoiceID,
          invoiceNumber,
          description,
          quantity,
          unitAmount,
          taxType,
          taxAmount,
          lineAmount,
          accountCode
        ]

        lineInvoiceSheet.appendRow(tmp)
      }      
      
      // Add data in the Spreadsheet    
      var arr = [
        accType, 
        contactName, 
        date, 
        dueDate, 
        status, 
        lineAmountTypes, 
        subTotal, 
        totalTax,
        total, 
        updatedDateUTC, 
        currencyCode, 
        invoiceID, 
        invoiceNumber,
        amountDue, 
        amountPaid, 
        amountCredited]

      downloadSheet.appendRow(arr)
    } 
  }
  
  spreadsheet.toast('Finished download')

  return true
  
}, // Invoices_.fullDownload)

} // Invoices_

/*
 [
   {
     CurrencyRate=1, 
     UpdatedDateUTC=/Date(1301876345573+0000)/, 
     AmountPaid=0, 
     AmountCredited=0, 
     Payments=[], 
     CreditNotes=[], 
     SubTotal=103.43, 
     CurrencyCode=GBP, 
     DueDateString=2016-07-28T00:00:00, 
     TotalTax=5.17, 
     InvoiceNumber=RPT445-1, 
     DueDate=/Date(1469664000000+0000)/, 
     Status=AUTHORISED, 
     AmountDue=108.6, 
     LineItems=[{
       TaxType=RRINPUT, 
       TaxAmount=5.17, 
       Description=Monthly electricity, 
       Tracking=[], 
       AccountCode=445, 
       LineAmount=108.6, 
       Quantity=1, 
       UnitAmount=108.6, 
       LineItemID=b768f5fd-0ada-4cba-a3cd-7d1f22ad5aaa
     }], 
     Reference=, 
     Prepayments=[], 
     HasAttachments=false, 
     InvoiceID=2175c381-d323-4e20-8c94-7680ea7f85d3, 
     Date=/Date(1468800000000+0000)/, 
     Contact={
       Addresses=[], 
       ContactGroups=[], 
       ContactPersons=[], 
       Phones=[], 
       ContactID=dec56ceb-65e9-43b3-ac98-7fe09eb37e31, 
       HasValidationErrors=false, 
       Name=PowerDirect
     }, 
     LineAmountTypes=Inclusive, 
     Type=ACCPAY, 
     DateString=2016-07-18T00:00:00, 
     Total=108.6, 
     Overpayments=[], 
     IsDiscounted=false, 
     HasErrors=false
   }, 
   {
     BrandingThemeID=5d4dd402-c851-497e-aae1-9ff265c0d15a, 
     UpdatedDateUTC=/Date(1301880480487+0000)/, 
     AmountPaid=500, 
     AmountCredited=0, 
     Payments=[{
       CurrencyRate=1, 
       Reference=INV-001, 
       Amount=500, 
       PaymentID=4c955477-b582-4d5e-898a-86fa14e461fb, 
       HasAccount=false, 
       HasValidationErrors=false, 
       Date=/Date(1437955200000+0000)/
     }], 
     CreditNotes=[], 
     SubTotal=416.67, 
     CurrencyCode=GBP, 
     DueDateString=2015-07-27T00:00:00, 
     TotalTax=83.33, InvoiceNumber=INV-0001, 
     DueDate=/Date(1437955200000+0000)/, 
     Status=PAID, 
     AmountDue=0, 
     LineItems=[{TaxType=OUTPUT2, TaxAmount=83.33, Description=Retainer for consulting work, Tracking=[], AccountCode=200, LineAmount=500, Quantity=1, UnitAmount=500, LineItemID=d78a6e4f-85d0-4d8d-8ab1-7c9fa0d806eb}], Reference=RPT200-1, Prepayments=[], HasAttachments=false, SentToContact=true, InvoiceID=4b6d0c8f-10fa-42cd-a6e5-53b175e90005, Date=/Date(1437091200000+0000)/, Contact={Addresses=[], ContactGroups=[], ContactPersons=[], Phones=[], ContactID=a871a956-05b5-4e2a-9419-7aeb478ca647, HasValidationErrors=false, Name=Ridgeway University}, LineAmountTypes=Inclusive, Type=ACCREC, FullyPaidOnDate=/Date(1437955200000+0000)/, DateString=2015-07-17T00:00:00, Total=500, Overpayments=[], IsDiscounted=false, HasErrors=false}, {BrandingThemeID=5d4dd402-c851-497e-aae1-9ff265c0d15a, UpdatedDateUTC=/Date(1301880498613+0000)/, AmountPaid=500, AmountCredited=0, Payments=[{CurrencyRate=1, Reference=INV-002, Amount=500, PaymentID=bd741ef4-c6f8-4ba8-9b64-79b9779cf565, HasAccount=false, HasValidationErrors=false, Date=/Date(1440547200000+0000)/}], CreditNotes=[], SubTotal=416.67, CurrencyCode=GBP, DueDateString=2015-08-26T00:00:00, TotalTax=83.33, InvoiceNumber=INV-0002, DueDate=/Date(1440547200000+0000)/, Status=PAID, AmountDue=0, LineItems=[{TaxType=OUTPUT2, TaxAmount=83.33, Description=Retainer for consulting work, Tracking=[], AccountCode=200, LineAmount=500, Quantity=1, UnitAmount=500, LineItemID=4d8f5019-f755-483b-a5c2-1d3b56938ffc}], Reference=RPT200-1, Prepayments=[], HasAttachments=false, SentToContact=true, InvoiceID=5d91be3d-6c7c-4885-acbc-2d1ca7b9c06e, Date=/Date(1439683200000+0000)/, Contact={Addresses=[], ContactGroups=[], ContactPersons=[], Phones=[], ContactID=a871a956-05b5-4e2a-9419-7aeb478ca647, HasValidationErrors=false, Name=Ridgeway University}, LineAmountTypes=Inclusive, Type=ACCREC, FullyPaidOnDate=/Date(1440547200000+0000)/, DateString=2015-08-16T00:00:00, Total=500, Overpayments=[], IsDiscounted=false, HasErrors=false}, {BrandingThemeID=5d4dd402-c851-497e-aae1-9ff265c0d15a, UpdatedDateUTC=/Date(1301880520783+0000)/, AmountPaid=500, AmountCredited=0, Payments=[{CurrencyRate=1, Reference=INV-0003, Amount=500, PaymentID=eea216c6-29c6-4de2-83f4-4196ae3bfaac, HasAccount=false, HasValidationErrors=false, Date=/Date(1443225600000+0000)/}], CreditNotes=[], SubTotal=416.67, CurrencyCode=GBP, DueDateString=2015-09-26T00:00:00, TotalTax=83.33, InvoiceNumber=INV-0003, DueDate=/Date(1443225600000+0000)/, Status=PAID, AmountDue=0, LineItems=[{TaxType=OUTPUT2, TaxAmount=83.33, Description=Retainer for consulting work, Tracking=[], AccountCode=200, LineAmount=500, Quantity=1, UnitAmount=500, LineItemID=d2621e25-787b-4868-bdbb-cb2933788b4b}], Reference=RPT200-1, Prepayments=[], HasAttachments=false, SentToContact=true, InvoiceID=7ea31cd8-045c-4871-8cda-c0420953a39c, Date=/Date(1442361600000+0000)/, Contact={Addresses=[], ContactGroups=[], ContactPersons=[], Phones=[], ContactID=a871a956-05b5-4e2a-9419-7aeb478ca647, HasValidationErrors=false, Name=Ridgeway University}, LineAmountTypes=Inclusive, Type=ACCREC, FullyPaidOnDate=/Date(1443225600000+0000)/, DateString=2015-09-16T00:00:00, Total=500, Overpayments=[], IsDiscounted=false, HasErrors=false}, {BrandingThemeID=5d4dd402-c851-497e-aae1-9ff265c0d15a, CurrencyRate=1, UpdatedDateUTC=/Date(1301880539753+0000)/, AmountPaid=1000, AmountCredited=0, Payments=[{CurrencyRate=1, Reference=INV-0004, Amount=1000, PaymentID=6190117a-7849-423c-a155-398aed253fa3, HasAccount=false, HasValidationErrors=false, Date=/Date(1445817600000+0000)/}], CreditNotes=[], SubTotal=833.34, CurrencyCode=GBP, DueDateString=2015-10-26T00:00:00, TotalTax=166.66, InvoiceNumber=INV-0004, DueDate=/Date(1445817600000+0000)/, Status=PAID, AmountDue=0, LineItems=[{TaxType=OUTPUT2, TaxAmount=83.33, Description=Retainer for consulting work, Tracking=[], AccountCode=200, LineAmount=500, Quantity=1, UnitAmount=500, LineItemID=1c42ea22-2412-4bc4-9a86-60f1b770ab51}, {TaxType=OUTPUT2, ItemCode=Train-MS, TaxAmount=83.33, Description=Half day training - Microsoft Office, Tracking=[], AccountCode=200, LineAmount=500, Quantity=1, UnitAmount=500, LineItemID=737e70da-466b-4450-a58d-938cb1e5c8b4}], Reference=RPT200-1, Prepayments=[], HasAttachments=false, SentToContact=true, InvoiceID=4f9d9bcc-3c75-4884-93a4-19d3b5a4b5f8, Date=/Date(1444953600000+0000)/, Contact={Addresses=[], ContactGroups=[], ContactPersons=[], Phones=[], ContactID=a871a956-05b5-4e2a-9419-7aeb478ca647, HasValidationErrors=false, Name=Ridgeway University}, LineAmountTypes=Inclusive, Type=ACCREC, FullyPaidOnDate=/Date(1445817600000+0000)/, DateString=2015-10-16T00:00:00, Total=1000, Overpayments=[], IsDiscounted=false, HasErrors=false}, {BrandingThemeID=5d4dd402-c851-497e-aae1-9ff265c0d15a, UpdatedDateUTC=/Date(1301880591280+0000)/, AmountPaid=500, AmountCredited=0, Payments=[{CurrencyRate=1, Reference=INV-0005, Amount=500, PaymentID=168d6616-3a4e-4f58-b8e4-adaeccd00347, HasAccount=false, HasValidationErrors=false, Date=/Date(1448496000000+0000)/}], CreditNotes=[], SubTotal=416.67, CurrencyCode=GBP, DueDateString=2015-11-26T00:00:00, TotalTax=83.33, InvoiceNumber=INV-0005, DueDate=/Date(1448496000000+0000)/, Status=PAID, AmountDue=0, LineItems=[{TaxType=OUTPUT2, TaxAmount=83.33, Description=Retainer for consulting work, Tracking=[], AccountCode=200, LineAmount=500, Quantity=1, UnitAmount=500, LineItemID=d6e3a16e-0c88-4e81-8b66-0fe6c192c29f}], Reference=RPT200-1, Prepayments=[], HasAttachments=false, SentToContact=true, InvoiceID=208c87e9-3721-435d-b6b0-c13ff8ff06b4, Date=/Date(1447632000000+0000)/, Contact={Addresses=[], ContactGroups=[], ContactPersons=[], Phones=[], ContactID=a871a956-05b5-4e2a-9419-7aeb478ca647, HasValidationErrors=false, Name=Ridgeway University}, LineAmountTypes=Inclusive, Type=ACCREC, FullyPaidOnDate=/Date(1448496000000+0000)/, DateString=2015-11-16T00:00:00, Total=500, Overpayments=[], IsDiscounted=false, HasErrors=false}, {BrandingThemeID=5d4dd402-c851-497e-aae1-9ff265c0d15a, UpdatedDateUTC=/Date(1301880608443+0000)/, AmountPaid=500, AmountCredited=0, Payments=[{CurrencyRate=1, Reference=INV-0006, Amount=500, PaymentID=222a628d-0381-4ffc-b245-66041305a64d, HasAccount=false, HasValidationErrors=false, Date=/Date(1451174400000+0000)/}], CreditNotes=[], SubTotal=416.67, CurrencyCode=GBP, DueDateString=2015-12-27T00:00:00, TotalTax=83.33, InvoiceNumber=INV-0006, DueDate=/Date(1451174400000+0000)/, Status=PAID, AmountDue=0, LineItems=[{TaxType=OUTPUT2, TaxAmount=83.33, Description=Retainer for consulting work, Tracking=[], AccountCode=200, LineAmount=500, Quantity=1, UnitAmount=500, LineItemID=f0355946-2384-421e-a382-fd9ce2627e21}], Reference=RPT200-1, Prepayments=[], HasAttachments=false, SentToContact=true, InvoiceID=379d60f2-56b9-4043-af4
*/
