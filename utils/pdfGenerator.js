import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

/**
 * Generates a PDF document based on quote data
 * @param {Object} quote - The quote data
 * @returns {Promise<string>} - Path to the PDF file
 */
export const generateQuotePDF = async (quote) => {
  try {
    // Generate HTML for PDF content
    const htmlContent = createQuoteHTML(quote);
    
    // Generate the PDF file
    const { uri } = await Print.printToFileAsync({
      html: htmlContent,
      base64: false
    });
    
    return uri;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};

/**
 * Generates a PDF invoice document for completed jobs
 * @param {Object} quote - The quote data with payment details
 * @returns {Promise<string>} - Path to the PDF file
 */
export const generateInvoicePDF = async (quote) => {
  try {
    // Generate HTML for PDF content
    const htmlContent = createInvoiceHTML(quote);
    
    // Generate the PDF file
    const { uri } = await Print.printToFileAsync({
      html: htmlContent,
      base64: false
    });
    
    return uri;
  } catch (error) {
    console.error('Error generating invoice PDF:', error);
    throw error;
  }
};

/**
 * Generates a PDF document for monthly income statement
 * @param {Array} incomeData - The income data for the month
 * @param {Object} metrics - The metrics data (revenue, jobs completed, etc.)
 * @param {string} month - The month name
 * @param {number} year - The year
 * @returns {Promise<string>} - Path to the PDF file
 */
export const generateIncomeStatementPDF = async (incomeData, metrics, month, year) => {
  try {
    // Generate HTML for PDF content
    const htmlContent = createIncomeStatementHTML(incomeData, metrics, month, year);
    
    // Generate the PDF file
    const { uri } = await Print.printToFileAsync({
      html: htmlContent,
      base64: false
    });
    
    return uri;
  } catch (error) {
    console.error('Error generating income statement PDF:', error);
    throw error;
  }
};

/**
 * Share a PDF document with other apps
 * @param {string} fileUri - Path to the PDF file
 */
export const sharePDF = async (fileUri) => {
  if (Platform.OS === 'ios' && !(await Sharing.isAvailableAsync())) {
    alert('Sharing is not available on your device');
    return;
  }
  
  try {
    await Sharing.shareAsync(fileUri);
  } catch (error) {
    console.error('Error sharing PDF:', error);
    throw error;
  }
};

/**
 * Creates HTML content for the invoice PDF
 * @param {Object} quote - The completed quote with payment details
 * @returns {string} - HTML content
 */
const createInvoiceHTML = (quote) => {
  // Format dates
  const today = new Date().toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  const completedDate = quote.completedAt 
    ? new Date(quote.completedAt).toLocaleDateString('en-ZA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : 'Not completed';
  
  const depositDate = quote.depositPaidAt 
    ? new Date(quote.depositPaidAt).toLocaleDateString('en-ZA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : 'Not paid';
  
  const finalPaymentDate = quote.paidAt 
    ? new Date(quote.paidAt).toLocaleDateString('en-ZA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : 'Not paid';

  // Calculate totals and service fees
  const subtotal = quote.lineItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  const vatAmount = subtotal * (quote.vatPercentage / 100);
  const serviceChargeAmount = subtotal * (quote.serviceChargePercentage / 100);
  const total = subtotal + vatAmount + serviceChargeAmount;
  
  const depositAmount = total * (quote.depositPercentage / 100);
  const depositServiceFee = depositAmount * 0.005; // 0.5% service fee
  const depositNet = depositAmount - depositServiceFee;
  
  const finalAmount = total - depositAmount;
  const finalServiceFee = finalAmount * 0.005; // 0.5% service fee
  const finalNet = finalAmount - finalServiceFee;
  
  const totalNet = depositNet + finalNet;
  const totalServiceFee = depositServiceFee + finalServiceFee;
  
  // Generate invoice number from quote ID
  const invoiceNumber = `INV-${quote.id.toString().padStart(4, '0')}`;
  
  // Compile HTML
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Invoice #${invoiceNumber}</title>
      <style>
        body {
          font-family: 'Helvetica Neue', 'Helvetica', Arial, sans-serif;
          font-size: 14px;
          line-height: 1.5;
          color: #333;
          padding: 20px;
          margin: 0;
        }
        .statement-header {
          text-align: center;
          margin-bottom: 30px;
          position: relative;
        }
        .statement-header h1 {
          font-size: 24px;
          margin-bottom: 10px;
          color: #3B82F6;
        }
        .paid-badge {
          position: absolute;
          top: 25px;
          right: 0;
          background-color: #10B981;
          color: white;
          padding: 5px 15px;
          border-radius: 15px;
          font-weight: bold;
        }
        .logo {
          position: absolute;
          top: 0;
          right: 0;
          width: 80px;
          height: auto;
        }
        .metrics-grid {
          display: flex;
          justify-content: space-between;
          margin-bottom: 30px;
        }
        .metric-card {
          width: 31%;
          background-color: #F9FAFB;
          border-radius: 8px;
          padding: 15px;
          text-align: center;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .metric-card h3 {
          margin-top: 0;
          margin-bottom: 5px;
          color: #6B7280;
          font-size: 14px;
          font-weight: 500;
        }
        .metric-card p {
          margin: 0;
          font-size: 20px;
          font-weight: 600;
          color: #111827;
        }
        .info-section {
          display: flex;
          justify-content: space-between;
          margin-bottom: 30px;
        }
        .info-column {
          width: 48%;
        }
        .section {
          margin-bottom: 30px;
        }
        .section h2 {
          border-bottom: 1px solid #e1e1e1;
          padding-bottom: 8px;
          margin-bottom: 15px;
          color: #3B82F6;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        table th, table td {
          padding: 10px;
          text-align: left;
          border-bottom: 1px solid #e1e1e1;
        }
        table th {
          background-color: #f9fafb;
          font-weight: 600;
        }
        .text-center {
          text-align: center;
        }
        .text-right {
          text-align: right;
        }
        .summary {
          margin-top: 30px;
          border-top: 2px solid #3B82F6;
          padding-top: 15px;
        }
        .summary-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
        }
        .summary-row.total {
          font-weight: bold;
          font-size: 16px;
          border-top: 1px solid #e1e1e1;
          border-bottom: 1px solid #e1e1e1;
          padding: 10px 0;
          margin: 15px 0;
        }
        .payment-details {
          page-break-before: always;
          margin-top: 40px;
        }
        .payment-box {
          background-color: #F9FAFB;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 20px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .payment-box h3 {
          margin-top: 0;
          color: #3B82F6;
          border-bottom: 1px solid #e1e1e1;
          padding-bottom: 8px;
        }
        .payment-box .summary-row {
          margin-bottom: 5px;
        }
        .footer {
          margin-top: 50px;
          text-align: center;
          font-size: 12px;
          color: #6b7280;
        }
      </style>
    </head>
    <body>
      <div class="statement-header">
        <img src="data:image/png;base64,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" class="logo">
        <h1>INVOICE</h1>
        <p>Invoice Number: ${invoiceNumber}</p>
        <p>Date: ${today}</p>
        <div class="paid-badge">PAID IN FULL</div>
      </div>
      
      <div class="metrics-grid">
        <div class="metric-card">
          <h3>GROSS AMOUNT</h3>
          <p>R ${total.toFixed(2)}</p>
        </div>
        <div class="metric-card">
          <h3>SERVICE FEES</h3>
          <p>R ${totalServiceFee.toFixed(2)}</p>
        </div>
        <div class="metric-card">
          <h3>NET AMOUNT</h3>
          <p>R ${totalNet.toFixed(2)}</p>
        </div>
      </div>
      
      <div class="info-section">
        <div class="info-column">
          <strong>From:</strong><br>
          ${quote.businessName ? quote.businessName : 'QuickQuote Service'}<br>
          ${quote.businessAddress ? quote.businessAddress : ''}
        </div>
        <div class="info-column">
          <strong>To:</strong><br>
          ${quote.customerName}<br>
          ${quote.clientAddress || ''}
        </div>
      </div>
      
      <div class="section">
        <h2>Service Details</h2>
        ${quote.description ? `<p><strong>Description:</strong> ${quote.description}</p>` : ''}
        <p><strong>Completion Date:</strong> ${completedDate}</p>
        <p><strong>Contact:</strong> ${quote.contactType === 'phone' ? 
          quote.phoneNumber || 'No phone provided' : 
          quote.email || 'No email provided'}</p>
      </div>
      
      <div class="section">
        <h2>Summary</h2>
        <div class="summary">
          <div class="summary-row">
            <div>Subtotal:</div>
            <div>R ${subtotal.toFixed(2)}</div>
          </div>
          <div class="summary-row">
            <div>VAT (${quote.vatPercentage}%):</div>
            <div>R ${vatAmount.toFixed(2)}</div>
          </div>
          <div class="summary-row">
            <div>Service Charge (${quote.serviceChargePercentage}%):</div>
            <div>R ${serviceChargeAmount.toFixed(2)}</div>
          </div>
          <div class="summary-row total">
            <div>Total Gross Amount:</div>
            <div>R ${total.toFixed(2)}</div>
          </div>
          <div class="summary-row">
            <div>Total Service Fees (0.5%):</div>
            <div>R ${totalServiceFee.toFixed(2)}</div>
          </div>
          <div class="summary-row total">
            <div>Total Net Amount:</div>
            <div>R ${totalNet.toFixed(2)}</div>
          </div>
        </div>
      </div>
      
      <div class="payment-details">
        <h2>Payment Details</h2>
        
        <div class="payment-box">
          <h3>Deposit Payment</h3>
          <div class="summary-row">
            <div>Date:</div>
            <div>${depositDate}</div>
          </div>
          <div class="summary-row">
            <div>Gross Amount:</div>
            <div>R ${depositAmount.toFixed(2)}</div>
          </div>
          <div class="summary-row">
            <div>Service Fee (0.5%):</div>
            <div>R ${depositServiceFee.toFixed(2)}</div>
          </div>
          <div class="summary-row">
            <div>Net Amount:</div>
            <div>R ${depositNet.toFixed(2)}</div>
          </div>
        </div>
        
        <div class="payment-box">
          <h3>Final Payment</h3>
          <div class="summary-row">
            <div>Date:</div>
            <div>${finalPaymentDate}</div>
          </div>
          <div class="summary-row">
            <div>Gross Amount:</div>
            <div>R ${finalAmount.toFixed(2)}</div>
          </div>
          <div class="summary-row">
            <div>Service Fee (0.5%):</div>
            <div>R ${finalServiceFee.toFixed(2)}</div>
          </div>
          <div class="summary-row">
            <div>Net Amount:</div>
            <div>R ${finalNet.toFixed(2)}</div>
          </div>
        </div>
      </div>
      
      <div class="footer">
        <p>Thank you for your business!</p>
        <p>Generated by QuickQuote Dashboard</p>
      </div>
    </body>
    </html>
  `;
};

/**
 * Creates HTML content for the income statement PDF
 * @param {Array} incomeData - The income data for the month
 * @param {Object} metrics - The metrics data
 * @param {string} month - The month name
 * @param {number} year - The year
 * @returns {string} - HTML content
 */
const createIncomeStatementHTML = (incomeData, metrics, month, year) => {
  // Format date
  const today = new Date().toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Calculate service fee and net amounts
  const SERVICE_FEE_PERCENTAGE = 0.5;
  
  // Track total service fees
  let totalServiceFees = 0;
  let totalGross = 0;
  
  // Format income items with service fee
  const incomeItemsHTML = incomeData
    .map((payment, index) => {
      const grossAmount = payment.paymentAmount || 0;
      const serviceFee = grossAmount * (SERVICE_FEE_PERCENTAGE / 100);
      const netAmount = grossAmount - serviceFee;
      
      // Update running totals
      totalServiceFees += serviceFee;
      totalGross += grossAmount;
      
      return `
        <tr>
          <td>${payment.customerName || payment.clientName || 'Client'}</td>
          <td>${payment.description || payment.service || 'No description'}</td>
          <td>${payment.paymentType}</td>
          <td class="text-right">${new Date(payment.paymentDate).toLocaleDateString()}</td>
          <td class="text-right">R ${grossAmount.toFixed(2)}</td>
          <td class="text-right">R ${serviceFee.toFixed(2)}</td>
          <td class="text-right">R ${netAmount.toFixed(2)}</td>
        </tr>
      `;
    })
    .join('');
    
  // Calculate net income after fees
  const netIncome = totalGross - totalServiceFees;

  // Compile HTML
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Income Statement - ${month} ${year}</title>
      <style>
        body {
          font-family: 'Helvetica Neue', 'Helvetica', Arial, sans-serif;
          font-size: 14px;
          line-height: 1.5;
          color: #333;
          padding: 20px;
          margin: 0;
        }
        .statement-header {
          text-align: center;
          margin-bottom: 30px;
        }
        .statement-header h1 {
          font-size: 24px;
          margin-bottom: 10px;
          color: #3B82F6;
        }
        .metrics-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 30px;
        }
        .metric-card {
          border: 1px solid #e1e1e1;
          border-radius: 8px;
          padding: 15px;
          background-color: #f9fafb;
        }
        .metric-label {
          font-size: 14px;
          color: #6B7280;
          margin-bottom: 5px;
        }
        .metric-value {
          font-size: 20px;
          font-weight: bold;
          color: #1F2937;
        }
        .statement-details {
          margin-bottom: 30px;
        }
        .statement-details h3 {
          border-bottom: 1px solid #e1e1e1;
          padding-bottom: 5px;
          margin-bottom: 15px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        table th, table td {
          padding: 10px;
          text-align: left;
          border-bottom: 1px solid #e1e1e1;
        }
        table th {
          background-color: #f9fafb;
          font-weight: 600;
        }
        .text-right {
          text-align: right;
        }
        .summary {
          margin-top: 30px;
          border-top: 2px solid #3B82F6;
          padding-top: 15px;
        }
        .summary-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
        }
        .summary-row.total {
          font-weight: bold;
          font-size: 16px;
          border-top: 1px solid #e1e1e1;
          border-bottom: 1px solid #e1e1e1;
          padding: 10px 0;
          margin: 15px 0;
        }
        .fee-note {
          font-style: italic;
          color: #6B7280;
          margin-top: 10px;
          font-size: 12px;
        }
        .footer {
          margin-top: 50px;
          text-align: center;
          font-size: 12px;
          color: #6b7280;
        }
      </style>
    </head>
    <body>
      <div class="statement-header">
        <h1>MONTHLY INCOME STATEMENT</h1>
        <p>Period: ${month} ${year}</p>
        <p>Generated on: ${today}</p>
      </div>
      
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-label">Gross Revenue</div>
          <div class="metric-value">R ${totalGross.toFixed(2)}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Net Revenue (After Fees)</div>
          <div class="metric-value">R ${netIncome.toFixed(2)}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Jobs Completed</div>
          <div class="metric-value">${metrics.jobsCompleted}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Quote Conversion Rate</div>
          <div class="metric-value">${metrics.quoteConversion.toFixed(0)}%</div>
        </div>
      </div>
      
      <div class="statement-details">
        <h3>Income Breakdown</h3>
        ${incomeData.length > 0 ? `
        <table>
          <thead>
            <tr>
              <th>Client</th>
              <th>Description</th>
              <th>Type</th>
              <th class="text-right">Date</th>
              <th class="text-right">Gross Amount</th>
              <th class="text-right">Service Fee (0.5%)</th>
              <th class="text-right">Net Amount</th>
            </tr>
          </thead>
          <tbody>
            ${incomeItemsHTML}
          </tbody>
        </table>
        <p class="fee-note">* A 0.5% service fee is applied to all payments as per agreement.</p>` : 
        '<p>No income recorded for this period.</p>'}
      </div>
      
      <div class="summary">
        <div class="summary-row">
          <div>Gross Income:</div>
          <div>R ${totalGross.toFixed(2)}</div>
        </div>
        <div class="summary-row">
          <div>Total Service Fees (0.5%):</div>
          <div>R ${totalServiceFees.toFixed(2)}</div>
        </div>
        <div class="summary-row total">
          <div>Net Income:</div>
          <div>R ${netIncome.toFixed(2)}</div>
        </div>
      </div>
      
      <div class="footer">
        <p>Generated by QuickQuote Dashboard</p>
      </div>
    </body>
    </html>
  `;
};

/**
 * Creates HTML content for the PDF document
 * @param {Object} quote - The quote data
 * @returns {string} - HTML content
 */
const createQuoteHTML = (quote) => {
  // Format date
  const today = new Date().toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Format line items
  const lineItemsHTML = quote.lineItems
    .map(item => {
      const total = (item.quantity * item.price).toFixed(2);
      return `
        <tr>
          <td>${item.description || 'Item'}</td>
          <td class="text-center">${item.quantity}</td>
          <td class="text-right">R ${item.price.toFixed(2)}</td>
          <td class="text-right">R ${total}</td>
        </tr>
      `;
    })
    .join('');

  // Calculate totals
  const subtotal = quote.lineItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  const vatAmount = subtotal * (quote.vatPercentage / 100);
  const serviceChargeAmount = subtotal * (quote.serviceChargePercentage / 100);
  const total = subtotal + vatAmount + serviceChargeAmount;
  const depositAmount = total * (quote.depositPercentage / 100);

  // Compile HTML
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Quote #${quote.id}</title>
      <style>
        body {
          font-family: 'Helvetica Neue', 'Helvetica', Arial, sans-serif;
          font-size: 14px;
          line-height: 1.5;
          color: #333;
          padding: 20px;
          margin: 0;
        }
        .quote-header {
          text-align: center;
          margin-bottom: 30px;
          position: relative;
        }
        .quote-header h1 {
          font-size: 24px;
          margin-bottom: 10px;
          color: #3B82F6;
        }
        .logo {
          position: absolute;
          top: 0;
          right: 0;
          width: 80px;
          height: auto;
        }
        .quote-info {
          display: flex;
          justify-content: space-between;
          margin-bottom: 30px;
        }
        .quote-info-column {
          width: 48%;
        }
        .quote-details {
          margin-bottom: 30px;
        }
        .quote-details h3 {
          border-bottom: 1px solid #e1e1e1;
          padding-bottom: 5px;
          margin-bottom: 15px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        table th, table td {
          padding: 10px;
          text-align: left;
          border-bottom: 1px solid #e1e1e1;
        }
        table th {
          background-color: #f9fafb;
          font-weight: 600;
        }
        .text-center {
          text-align: center;
        }
        .text-right {
          text-align: right;
        }
        .summary {
          margin-top: 30px;
          border-top: 2px solid #3B82F6;
          padding-top: 15px;
        }
        .summary-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
        }
        .summary-row.total {
          font-weight: bold;
          font-size: 16px;
          border-top: 1px solid #e1e1e1;
          border-bottom: 1px solid #e1e1e1;
          padding: 10px 0;
          margin: 15px 0;
        }
        .footer {
          margin-top: 50px;
          text-align: center;
          font-size: 12px;
          color: #6b7280;
        }
        .logo {
          max-width: 150px;
          margin-bottom: 20px;
        }
      </style>
    </head>
    <body>
      <div class="quote-header">
        <img src="data:image/png;base64,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" class="logo">
        <h1>QUOTE</h1>
        <p>Reference: #${quote.id}</p>
        <p>Date: ${today}</p>
      </div>
      
      <div class="quote-info">
        <div class="quote-info-column">
          <strong>From:</strong><br>
          ${quote.businessName ? quote.businessName : 'QuickQuote Service'}<br>
          ${quote.businessAddress ? quote.businessAddress : ''}
        </div>
        <div class="quote-info-column">
          <strong>To:</strong><br>
          ${quote.customerName}<br>
          ${quote.clientAddress || ''}
        </div>
      </div>
      
      <div class="quote-details">
        <h3>Quote Details</h3>
        ${quote.description ? `<p><strong>Description:</strong> ${quote.description}</p>` : ''}
        <p><strong>Contact:</strong> ${quote.contactType === 'phone' ? 
          quote.phoneNumber || 'No phone provided' : 
          quote.email || 'No email provided'}</p>
      </div>
      
      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th class="text-center">Qty</th>
            <th class="text-right">Unit Price</th>
            <th class="text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          ${lineItemsHTML}
        </tbody>
      </table>
      
      <div class="summary">
        <div class="summary-row">
          <div>Subtotal:</div>
          <div>R ${subtotal.toFixed(2)}</div>
        </div>
        <div class="summary-row">
          <div>VAT (${quote.vatPercentage}%):</div>
          <div>R ${vatAmount.toFixed(2)}</div>
        </div>
        <div class="summary-row">
          <div>Service Charge (${quote.serviceChargePercentage}%):</div>
          <div>R ${serviceChargeAmount.toFixed(2)}</div>
        </div>
        <div class="summary-row total">
          <div>Total:</div>
          <div>R ${total.toFixed(2)}</div>
        </div>
        <div class="summary-row">
          <div>Required Deposit (${quote.depositPercentage}%):</div>
          <div>R ${depositAmount.toFixed(2)}</div>
        </div>
      </div>
      
      <div class="footer">
        <p>Thank you for your business!</p>
        <p>This quote is valid for 30 days from the date of issue.</p>
      </div>
    </body>
    </html>
  `;
}; 