import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const QuoteCard = ({ 
  quote, 
  tabType, 
  onDelete, 
  onEdit, 
  onResend, 
  onDownloadPDF,
  onAccept, 
  onDepositPaid,
  onWorkComplete,
  onFinalPayment,
  onDownloadInvoice
}) => {
  const [showHistory, setShowHistory] = useState(false);

  const handleButtonPress = (action) => {
    console.log(`${action} for quote ID: ${quote.id}`);
    
    if (action === 'Resend Quote' && onResend) {
      onResend(quote.id);
    } else if (action === 'Download PDF' && onDownloadPDF) {
      onDownloadPDF(quote.id);
    } else if (action === 'Accept Quote' && onAccept) {
      onAccept(quote.id);
    } else if (action === 'Mark Deposit Paid' && onDepositPaid) {
      onDepositPaid(quote.id);
    } else if (action === 'Mark Work Complete' && onWorkComplete) {
      onWorkComplete(quote.id);
    } else if (action === 'Mark Payment Received' && onFinalPayment) {
      onFinalPayment(quote.id);
    } else if (action === 'Download Invoice' && onDownloadInvoice) {
      onDownloadInvoice(quote.id);
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(quote.id);
    }
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit(quote.id);
    } else {
      console.log('Edit handler not provided for quote ID:', quote.id);
    }
  };

  // Toggle history visibility
  const toggleHistory = () => {
    setShowHistory(!showHistory);
  };

  // Get contact info display text
  const getContactInfo = () => {
    if (quote.contactType === 'email' && quote.email) {
      return `Email: ${quote.email}`;
    } else if (quote.contactType === 'phone' && quote.phoneNumber) {
      return `Phone: ${quote.phoneNumber}`;
    }
    return '';
  };

  // Get latest activity status with date
  const getLatestActivity = () => {
    // Complete section - check in order of recency
    if (tabType === 'Complete') {
      if (quote.isPaid && quote.finalPaymentDate) {
        return (
          <TouchableOpacity onPress={toggleHistory} style={styles.activityContainer}>
            <Text style={styles.paidDate}>Final Payment: {quote.finalPaymentDate}</Text>
            <MaterialIcons 
              name={showHistory ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
              size={16} 
              color="#6B7280" 
            />
          </TouchableOpacity>
        );
      }
      if (quote.completedDate) {
        return (
          <TouchableOpacity onPress={toggleHistory} style={styles.activityContainer}>
            <Text style={styles.date}>Work Complete: {quote.completedDate}</Text>
            <MaterialIcons 
              name={showHistory ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
              size={16} 
              color="#6B7280" 
            />
          </TouchableOpacity>
        );
      }
    }

    // Scheduled Work section
    if (tabType === 'Scheduled Work' && quote.depositDate) {
      return (
        <TouchableOpacity onPress={toggleHistory} style={styles.activityContainer}>
          <Text style={styles.date}>Deposit: {quote.depositDate}</Text>
          <MaterialIcons 
            name={showHistory ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
            size={16} 
            color="#6B7280" 
          />
        </TouchableOpacity>
      );
    }

    // Accepted section
    if (tabType === 'Accepted' && quote.acceptedDate) {
      return (
        <TouchableOpacity onPress={toggleHistory} style={styles.activityContainer}>
          <Text style={styles.date}>Accepted: {quote.acceptedDate}</Text>
          <MaterialIcons 
            name={showHistory ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
            size={16} 
            color="#6B7280" 
          />
        </TouchableOpacity>
      );
    }

    // Sent section - show latest sent/resent date
    if (tabType === 'Sent') {
      if (quote.sentDates && quote.sentDates.length > 1) {
        const lastSentDate = quote.sentDates[quote.sentDates.length - 1];
        return (
          <TouchableOpacity onPress={toggleHistory} style={styles.activityContainer}>
            <Text style={styles.resentDate}>Resent: {lastSentDate}</Text>
            <MaterialIcons 
              name={showHistory ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
              size={16} 
              color="#6B7280" 
            />
          </TouchableOpacity>
        );
      }
      
      if (quote.date) {
        return (
          <TouchableOpacity onPress={toggleHistory} style={styles.activityContainer}>
            <Text style={styles.date}>Sent: {quote.date}</Text>
            <MaterialIcons 
              name={showHistory ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
              size={16} 
              color="#6B7280" 
            />
          </TouchableOpacity>
        );
      }
    }

    // Draft section or fallback - just show the date if available
    if (quote.date) {
      return <Text style={styles.date}>{quote.date}</Text>;
    }

    return null;
  };

  // Render timeline dates section (expanded history)
  const renderTimelineDates = () => {
    if (!showHistory || !quote.date) return null;
    
    const elements = [];
    
    // Get all dates in chronological order
    const allDates = [];
    
    // Sent date
    if (quote.date) {
      allDates.push({ type: 'sent', date: quote.date });
    }
    
    // Resent dates if available
    if (quote.sentDates && quote.sentDates.length > 1) {
      // Skip the first date as it's already included as the sent date
      quote.sentDates.slice(1).forEach((date, index) => {
        allDates.push({ type: 'resent', date });
      });
    }
    
    // Accepted date
    if (quote.acceptedDate) {
      allDates.push({ type: 'accepted', date: quote.acceptedDate });
    }
    
    // Deposit date
    if (quote.depositDate) {
      allDates.push({ type: 'deposit', date: quote.depositDate });
    }
    
    // Work Complete date
    if (quote.completedDate) {
      allDates.push({ type: 'completed', date: quote.completedDate });
    }
    
    // Final Payment date
    if (quote.isPaid && quote.finalPaymentDate) {
      allDates.push({ type: 'finalPayment', date: quote.finalPaymentDate });
    }
    
    // Sort by date (newest first)
    allDates.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Create history elements
    allDates.forEach((item, index) => {
      // Skip the latest date as it's already shown
      if (index === allDates.length - 1 && tabType !== 'Draft') {
        return;
      }
      
      switch (item.type) {
        case 'sent':
          elements.push(
            <Text key="sent" style={styles.historyDate}>Sent: {item.date}</Text>
          );
          break;
        case 'resent':
          elements.push(
            <Text key={`resent-${index}`} style={styles.historyDate}>
              Resent: {item.date}
            </Text>
          );
          break;
        case 'accepted':
          elements.push(
            <Text key="accepted" style={styles.historyDate}>
              Accepted: {item.date}
            </Text>
          );
          break;
        case 'deposit':
          elements.push(
            <Text key="deposit" style={styles.historyDate}>
              Deposit: {item.date}
            </Text>
          );
          break;
        case 'completed':
          elements.push(
            <Text key="completed" style={styles.historyDate}>
              Work Complete: {item.date}
            </Text>
          );
          break;
        case 'finalPayment':
          elements.push(
            <Text key="finalPayment" style={styles.historyDate}>
              Final Payment: {item.date}
            </Text>
          );
          break;
      }
    });
    
    return (
      <View style={styles.historyContainer}>
        {elements}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <Text style={styles.customerName}>{quote.customerName}</Text>
          {getLatestActivity()}
          {renderTimelineDates()}
        </View>
        <View style={styles.amountContainer}>
          <Text style={styles.amount}>
            R{quote.amount.toFixed(2)}
          </Text>
        </View>
      </View>
      
      {tabType === 'Draft' && (
        <View style={styles.serviceContainer}>
          <View style={styles.serviceInfo}>
            <Text style={styles.serviceText}>
              {quote.service}
            </Text>
          </View>
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              onPress={handleEdit}
              style={styles.actionButton}
            >
              <Text style={styles.actionButtonText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleDelete}
              style={styles.deleteButton}
            >
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      
      {tabType === 'Sent' && (
        <View style={[styles.serviceContainer, styles.sentServiceContainer]}>
          <View style={styles.serviceInfo}>
            <Text style={styles.statusText}>
              Awaiting client response
            </Text>
            <Text style={styles.serviceText}>
              {quote.service}
            </Text>
            {getContactInfo() ? (
              <Text style={styles.contactInfo}>{getContactInfo()}</Text>
            ) : null}
          </View>
          <View style={styles.verticalButtonContainer}>
            <TouchableOpacity
              onPress={() => handleButtonPress('Download PDF')}
              style={[styles.actionButton, styles.blueButton, styles.fullWidthButton]}
            >
              <MaterialIcons name="file-download" size={16} color="white" style={styles.buttonIcon} />
              <Text style={styles.actionButtonText}>PDF</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleButtonPress('Resend Quote')}
              style={[styles.actionButton, styles.fullWidthButton]}
            >
              <Text style={styles.actionButtonText}>Resend</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleButtonPress('Accept Quote')}
              style={[styles.acceptButton, styles.fullWidthButton]}
            >
              <Text style={styles.acceptButtonText}>Accept</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      
      {tabType === 'Accepted' && (
        <View style={styles.serviceContainer}>
          <View style={styles.serviceInfo}>
            <Text style={styles.statusText}>
              Quote accepted, awaiting deposit
            </Text>
            <Text style={styles.serviceText}>
              {quote.service}
            </Text>
            {getContactInfo() ? (
              <Text style={styles.contactInfo}>{getContactInfo()}</Text>
            ) : null}
          </View>
          <TouchableOpacity
            onPress={() => handleButtonPress('Mark Deposit Paid')}
            style={styles.cashButton}
          >
            <Text style={styles.cashButtonText}>Payment Received</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {tabType === 'Scheduled Work' && (
        <View style={styles.serviceContainer}>
          <View style={styles.serviceInfo}>
            <Text style={styles.statusText}>
              Deposit paid, work scheduled
            </Text>
            <Text style={styles.serviceText}>
              {quote.service}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => handleButtonPress('Mark Work Complete')}
            style={styles.actionButton}
          >
            <Text style={styles.actionButtonText}>Complete</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {tabType === 'Complete' && (
        <View style={styles.serviceContainer}>
          <View style={styles.serviceInfo}>
            <Text style={quote.isPaid ? styles.paidStatusText : styles.unpaidStatusText}>
              {quote.isPaid ? 'Fully paid' : 'Awaiting final payment'}
            </Text>
            <Text style={styles.serviceText}>
              {quote.service}
            </Text>
          </View>
          {!quote.isPaid && (
            <TouchableOpacity
              onPress={() => handleButtonPress('Mark Payment Received')}
              style={styles.cashButton}
            >
              <Text style={styles.cashButtonText}>Payment Received</Text>
            </TouchableOpacity>
          )}
          {quote.isPaid && (
            <TouchableOpacity
              onPress={() => handleButtonPress('Download Invoice')}
              style={[styles.actionButton, styles.blueButton]}
            >
              <MaterialIcons name="receipt" size={16} color="white" style={styles.buttonIcon} />
              <Text style={styles.actionButtonText}>Download Invoice</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#F3F4F6', // gray-100
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  headerInfo: {
    flex: 1,
    marginRight: 8,
  },
  customerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937', // gray-800
    marginBottom: 2,
  },
  activityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginTop: 2,
  },
  historyContainer: {
    marginTop: 4,
    paddingLeft: 8,
    borderLeftWidth: 1,
    borderLeftColor: '#E5E7EB', // gray-200
  },
  date: {
    fontSize: 13,
    color: '#6B7280', // gray-500
    marginRight: 4,
  },
  historyDate: {
    fontSize: 12,
    color: '#9CA3AF', // gray-400
    marginTop: 2,
    marginBottom: 2,
  },
  resentDate: {
    fontSize: 13,
    color: '#9CA3AF', // gray-400
    marginRight: 4,
    fontStyle: 'italic',
  },
  paidDate: {
    fontSize: 13,
    color: '#10B981', // green-500
    marginRight: 4,
    fontWeight: '500',
  },
  amountContainer: {
    backgroundColor: '#EFF6FF', // blue-50
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  amount: {
    color: '#1D4ED8', // blue-700
    fontWeight: '500',
  },
  serviceContainer: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  serviceInfo: {
    flex: 1,
  },
  serviceText: {
    fontSize: 14,
    color: '#4B5563', // gray-600
    marginBottom: 4,
  },
  descriptionText: {
    fontSize: 12,
    color: '#6B7280', // gray-500
    marginBottom: 2,
    fontStyle: 'italic',
  },
  contactInfo: {
    fontSize: 12,
    color: '#6B7280', // gray-500
    marginBottom: 2,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#F59E0B', // amber-500
    marginBottom: 4,
  },
  paidStatusText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#10B981', // green-500
    marginBottom: 4,
  },
  unpaidStatusText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#EF4444', // red-500
    marginBottom: 4,
  },
  actionButton: {
    backgroundColor: '#10B981', // green-500
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  blueButton: {
    backgroundColor: '#3B82F6', // blue-500
  },
  actionButtonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: '500',
  },
  acceptButton: {
    backgroundColor: '#3B82F6', // blue-500
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  acceptButtonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: '500',
  },
  cashButton: {
    backgroundColor: '#FEF3C7', // amber-100
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#F59E0B', // amber-500
  },
  cashButtonText: {
    color: '#D97706', // amber-600
    fontWeight: '500',
    fontSize: 12,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  verticalButtonContainer: {
    flexDirection: 'column',
    gap: 8,
    width: 120, // Set fixed width for the vertical button container
  },
  fullWidthButton: {
    width: '100%', // Make buttons take full width of container
    justifyContent: 'center',
  },
  deleteButton: {
    backgroundColor: '#FEE2E2', // red-100
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#EF4444', // red-500
  },
  deleteButtonText: {
    color: '#B91C1C', // red-700
    textAlign: 'center',
    fontWeight: '500',
  },
  buttonIcon: {
    marginRight: 4,
  },
  sentServiceContainer: {
    alignItems: 'flex-start',
    minHeight: 130, // Provide enough space for the buttons
  },
});

export default QuoteCard; 