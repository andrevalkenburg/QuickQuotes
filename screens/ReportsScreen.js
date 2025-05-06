import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ScrollView, 
  SafeAreaView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateIncomeStatementPDF, sharePDF } from '../utils/pdfGenerator';
import AppHeader from '../components/AppHeader';

// Storage key for quotes (must match the one in DashboardScreen)
const QUOTES_STORAGE_KEY = 'quickquote_data';

// Service fee percentage
const SERVICE_FEE_PERCENTAGE = 0.5;

const ReportsScreen = () => {
  // State for selected month and quote data
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [allQuotes, setAllQuotes] = useState(null);
  const [monthlyData, setMonthlyData] = useState({
    revenue: 0,
    netRevenue: 0,
    serviceFees: 0,
    depositRevenue: 0,
    finalPaymentRevenue: 0,
    jobsCompleted: 0,
    quoteConversion: 0,
    averageJobSize: 0,
    completedJobs: [],
    depositPayments: [],
    finalPayments: [],
    combinedPayments: []
  });
  const [previousMonthData, setPreviousMonthData] = useState({
    revenue: 0,
    netRevenue: 0,
    serviceFees: 0,
    depositRevenue: 0,
    finalPaymentRevenue: 0,
    jobsCompleted: 0,
    quoteConversion: 0,
    averageJobSize: 0,
  });
  // Add state for collapsible section
  const [incomeBreakdownExpanded, setIncomeBreakdownExpanded] = useState(true);
  // Add state for PDF generation
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Array of month names
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Load quotes data from storage
  useEffect(() => {
    const loadQuotes = async () => {
      try {
        const storedQuotes = await AsyncStorage.getItem(QUOTES_STORAGE_KEY);
        if (storedQuotes) {
          setAllQuotes(JSON.parse(storedQuotes));
        }
      } catch (error) {
        console.error('Error loading quotes for reports:', error);
      }
    };

    loadQuotes();
  }, []);

  // Update metrics when month or quotes change
  useEffect(() => {
    if (!allQuotes) return;

    // Calculate metrics for selected month
    calculateMonthlyMetrics(selectedMonth, selectedYear);
    
    // Calculate metrics for previous month
    const prevMonth = selectedMonth === 0 ? 11 : selectedMonth - 1;
    const prevYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear;
    calculatePreviousMonthMetrics(prevMonth, prevYear);
  }, [selectedMonth, selectedYear, allQuotes]);

  // Calculate metrics for selected month with service fees
  const calculateMonthlyMetrics = (month, year) => {
    if (!allQuotes) return;

    // Filter completed jobs for selected month
    const completedJobs = allQuotes.Complete ? allQuotes.Complete.filter(quote => {
      const quoteDate = new Date(quote.finalPaymentDate || quote.completedDate);
      return quoteDate.getMonth() === month && quoteDate.getFullYear() === year;
    }) : [];

    // Find deposit payments for this month (from Scheduled Work)
    const depositPayments = allQuotes['Scheduled Work'] ? allQuotes['Scheduled Work'].filter(quote => {
      if (quote.depositDate) {
        const depositDate = new Date(quote.depositDate);
        return depositDate.getMonth() === month && depositDate.getFullYear() === year;
      }
      return false;
    }).map(quote => {
      // Ensure numeric values
      const totalAmount = parseFloat(quote.amount) || 0;
      const depositPercentage = parseFloat(quote.depositPercentage) || 50;
      const depositAmount = quote.depositAmount 
        ? parseFloat(quote.depositAmount) 
        : (totalAmount * depositPercentage / 100);
      
      return {
        ...quote,
        clientName: quote.clientName || 'Client',
        depositAmount: depositAmount,
        paymentAmount: depositAmount
      };
    }) : [];

    // Also find deposit payments from completed jobs 
    // (when the deposit was paid in the selected month but the job is now complete)
    const completedDeposits = allQuotes.Complete ? allQuotes.Complete.filter(quote => {
      if (quote.depositDate) {
        const depositDate = new Date(quote.depositDate);
        return depositDate.getMonth() === month && depositDate.getFullYear() === year;
      }
      return false;
    }).map(quote => {
      // Ensure numeric values
      const totalAmount = parseFloat(quote.amount) || 0;
      const depositPercentage = parseFloat(quote.depositPercentage) || 50;
      const depositAmount = quote.depositAmount 
        ? parseFloat(quote.depositAmount) 
        : (totalAmount * depositPercentage / 100);
      
      return {
        ...quote,
        clientName: quote.clientName || 'Client',
        depositAmount: depositAmount,
        paymentAmount: depositAmount
      };
    }) : [];

    // Combine deposit payments from scheduled and completed jobs
    const allDepositPayments = [...depositPayments, ...completedDeposits];

    // Find final payments for this month (from Complete with finalPaymentDate in this month)
    const finalPayments = allQuotes.Complete ? allQuotes.Complete.filter(quote => {
      if (quote.finalPaymentDate) {
        const paymentDate = new Date(quote.finalPaymentDate);
        return paymentDate.getMonth() === month && paymentDate.getFullYear() === year;
      }
      return false;
    }).map(quote => {
      // Ensure all values are numeric
      const totalAmount = parseFloat(quote.amount) || 0;
      const depositPercentage = parseFloat(quote.depositPercentage) || 50;
      
      // Calculate deposit amount first
      const depositAmount = quote.depositAmount 
        ? parseFloat(quote.depositAmount) 
        : (totalAmount * depositPercentage / 100);
      
      // Final payment is the total amount minus the deposit amount
      const finalPaymentAmount = totalAmount - depositAmount;
      
      console.log('Final payment calculation:', {
        quoteId: quote.id,
        totalAmount,
        depositAmount,
        finalPaymentAmount
      });
      
      return {
        ...quote,
        clientName: quote.clientName || 'Client',
        depositAmount: depositAmount,
        finalPaymentAmount: finalPaymentAmount,
        paymentAmount: finalPaymentAmount // Ensure paymentAmount is set for the table display
      };
    }) : [];

    // Prepare combined payments list (same as what will be shown in the income table)
    const combinedPayments = [
      ...allDepositPayments.map(payment => {
        // Calculate deposit amount ensuring numeric values
        const totalAmount = parseFloat(payment.amount) || 0;
        const depositPercentage = payment.depositPercentage || 50;
        const depositAmount = payment.depositAmount || (totalAmount * depositPercentage / 100);
        
        // Ensure explicit numeric value
        const finalDepositAmount = parseFloat(depositAmount) || 0;
        
        console.log('Deposit payment mapped:', {
          client: payment.clientName,
          totalAmount,
          depositPercentage,
          depositAmount: finalDepositAmount
        });
        
        return {
          ...payment,
          paymentType: 'Deposit',
          paymentDate: payment.depositDate,
          paymentAmount: finalDepositAmount // Ensure deposit amount is set properly
        };
      }),
      ...finalPayments.map(payment => {
        // Final payment amount calculated properly
        // Ensure explicit numeric value
        const finalPaymentAmount = parseFloat(payment.finalPaymentAmount) || 0;
        
        console.log('Final payment mapped:', {
          client: payment.clientName,
          totalAmount: parseFloat(payment.amount) || 0,
          depositAmount: parseFloat(payment.depositAmount) || 0,
          finalPaymentAmount
        });
        
        return {
          ...payment,
          paymentType: 'Final Payment',
          paymentDate: payment.finalPaymentDate,
          paymentAmount: finalPaymentAmount // Ensure final payment amount is set properly
        };
      })
    ];
    
    // Log the entire combined payments array for debugging
    console.log('Combined payments array:', combinedPayments.map(p => ({
      client: p.clientName,
      type: p.paymentType,
      amount: p.paymentAmount,
      date: p.paymentDate
    })));

    // Calculate revenue directly from combined payments
    const revenue = combinedPayments.reduce((total, payment) => 
      total + (payment.paymentAmount || 0), 0);
    
    // Calculate service fees and net revenue
    const serviceFees = combinedPayments.reduce((total, payment) => 
      total + ((payment.paymentAmount || 0) * SERVICE_FEE_PERCENTAGE / 100), 0);
    
    const netRevenue = revenue - serviceFees;

    // For comparison with previous metrics, still calculate these separately
    const depositRevenue = allDepositPayments.reduce((total, job) => {
      return total + (job.depositAmount || 0);
    }, 0);

    const finalPaymentRevenue = finalPayments.reduce((total, job) => {
      return total + (job.finalPaymentAmount || 0);
    }, 0);

    // Calculate average job size
    const averageJobSize = completedJobs.length > 0 
      ? revenue / completedJobs.length 
      : 0;

    // Calculate quote conversion rate (accepted / sent)
    // Get quotes sent in the selected month
    const sentQuotes = allQuotes.Sent ? allQuotes.Sent.filter(quote => {
      // Check if quote was sent in this month
      const quoteDate = new Date(quote.date);
      return quoteDate.getMonth() === month && quoteDate.getFullYear() === year;
    }) : [];
    
    // Add quotes that were originally sent in this month but have since moved to other statuses
    const allSentInMonth = [
      ...sentQuotes,
      // Include quotes in Accepted status that were sent in this month
      ...(allQuotes.Accepted ? allQuotes.Accepted.filter(quote => {
        const sentDate = new Date(quote.date);
        return sentDate.getMonth() === month && sentDate.getFullYear() === year;
      }) : []),
      // Include quotes in Scheduled Work that were sent in this month
      ...(allQuotes['Scheduled Work'] ? allQuotes['Scheduled Work'].filter(quote => {
        const sentDate = new Date(quote.date);
        return sentDate.getMonth() === month && sentDate.getFullYear() === year;
      }) : []),
      // Include quotes in Complete that were sent in this month
      ...(allQuotes.Complete ? allQuotes.Complete.filter(quote => {
        const sentDate = new Date(quote.date);
        return sentDate.getMonth() === month && sentDate.getFullYear() === year;
      }) : [])
    ];
    
    // Get quotes from this month that were accepted
    const acceptedQuotes = allQuotes.Accepted ? allQuotes.Accepted.filter(quote => {
      // Check if it was sent in the selected month
      if (quote.date) {
        const sentDate = new Date(quote.date);
        return sentDate.getMonth() === month && sentDate.getFullYear() === year;
      }
      return false;
    }) : [];
    
    // Get quotes from this month that moved to Scheduled Work
    const scheduledQuotes = allQuotes['Scheduled Work'] ? allQuotes['Scheduled Work'].filter(quote => {
      if (quote.date) {
        const sentDate = new Date(quote.date);
        return sentDate.getMonth() === month && sentDate.getFullYear() === year;
      }
      return false;
    }) : [];
    
    // Get quotes from this month that moved to Complete
    const completedFromCurrentMonth = allQuotes.Complete ? allQuotes.Complete.filter(quote => {
      if (quote.date) {
        const sentDate = new Date(quote.date);
        return sentDate.getMonth() === month && sentDate.getFullYear() === year;
      }
      return false;
    }) : [];
    
    // Total accepted quotes from the current month = those in Accepted + Scheduled Work + Complete
    const totalAcceptedQuotes = acceptedQuotes.length + scheduledQuotes.length + completedFromCurrentMonth.length;
    
    // Conversion rate calculation
    const quoteConversion = allSentInMonth.length > 0 
      ? (totalAcceptedQuotes / allSentInMonth.length) * 100 
      : 0;

    console.log(`Month: ${month+1}/${year}, Sent: ${allSentInMonth.length}, Accepted: ${totalAcceptedQuotes}, Conversion: ${quoteConversion}%`);

    setMonthlyData({
      revenue,
      netRevenue,
      serviceFees,
      depositRevenue,
      finalPaymentRevenue,
      jobsCompleted: completedJobs.length,
      quoteConversion,
      averageJobSize,
      completedJobs: [...completedJobs].sort((a, b) => {
        // Sort by date (newest first)
        const dateA = new Date(a.finalPaymentDate || a.completedDate);
        const dateB = new Date(b.finalPaymentDate || b.completedDate);
        return dateB - dateA;
      }),
      depositPayments: [...allDepositPayments].sort((a, b) => {
        // Sort by deposit date (newest first)
        const dateA = new Date(a.depositDate);
        const dateB = new Date(b.depositDate);
        return dateB - dateA;
      }),
      finalPayments: [...finalPayments].sort((a, b) => {
        // Sort by final payment date (newest first)
        const dateA = new Date(a.finalPaymentDate);
        const dateB = new Date(b.finalPaymentDate);
        return dateB - dateA;
      }),
      // Deep clone the combinedPayments array to prevent reference issues
      combinedPayments: JSON.parse(JSON.stringify(combinedPayments))
    });
  };

  // Calculate metrics for previous month (for comparison) with service fees
  const calculatePreviousMonthMetrics = (month, year) => {
    if (!allQuotes) return;

    // Filter completed jobs for previous month
    const completedJobs = allQuotes.Complete ? allQuotes.Complete.filter(quote => {
      const quoteDate = new Date(quote.finalPaymentDate || quote.completedDate);
      return quoteDate.getMonth() === month && quoteDate.getFullYear() === year;
    }) : [];

    // Find deposit payments for this month (from Scheduled Work)
    const depositPayments = allQuotes['Scheduled Work'] ? allQuotes['Scheduled Work'].filter(quote => {
      if (quote.depositDate) {
        const depositDate = new Date(quote.depositDate);
        return depositDate.getMonth() === month && depositDate.getFullYear() === year;
      }
      return false;
    }).map(quote => {
      // Ensure numeric values
      const totalAmount = parseFloat(quote.amount) || 0;
      const depositPercentage = parseFloat(quote.depositPercentage) || 50;
      const depositAmount = quote.depositAmount 
        ? parseFloat(quote.depositAmount) 
        : (totalAmount * depositPercentage / 100);
      
      return {
        ...quote,
        clientName: quote.clientName || 'Client',
        depositAmount: depositAmount,
        paymentAmount: depositAmount
      };
    }) : [];

    // Also find deposit payments from completed jobs for previous month
    const prevCompletedDeposits = allQuotes.Complete ? allQuotes.Complete.filter(quote => {
      if (quote.depositDate) {
        const depositDate = new Date(quote.depositDate);
        return depositDate.getMonth() === month && depositDate.getFullYear() === year;
      }
      return false;
    }).map(quote => {
      // Ensure numeric values
      const totalAmount = parseFloat(quote.amount) || 0;
      const depositPercentage = parseFloat(quote.depositPercentage) || 50;
      const depositAmount = quote.depositAmount 
        ? parseFloat(quote.depositAmount) 
        : (totalAmount * depositPercentage / 100);
      
      return {
        ...quote,
        clientName: quote.clientName || 'Client',
        depositAmount: depositAmount,
        paymentAmount: depositAmount
      };
    }) : [];

    // Combine deposit payments from scheduled and completed jobs for previous month
    const prevAllDepositPayments = [...depositPayments, ...prevCompletedDeposits];

    // Find final payments for previous month (from Complete with finalPaymentDate in previous month)
    const prevFinalPayments = allQuotes.Complete ? allQuotes.Complete.filter(quote => {
      if (quote.finalPaymentDate) {
        const paymentDate = new Date(quote.finalPaymentDate);
        return paymentDate.getMonth() === month && paymentDate.getFullYear() === year;
      }
      return false;
    }).map(quote => {
      // Ensure all values are numeric
      const totalAmount = parseFloat(quote.amount) || 0;
      const depositPercentage = parseFloat(quote.depositPercentage) || 50;
      
      // Calculate deposit amount first
      const depositAmount = quote.depositAmount 
        ? parseFloat(quote.depositAmount) 
        : (totalAmount * depositPercentage / 100);
      
      // Final payment is the total amount minus the deposit amount
      const finalPaymentAmount = totalAmount - depositAmount;
      
      return {
        ...quote,
        clientName: quote.clientName || 'Client',
        depositAmount: depositAmount,
        finalPaymentAmount: finalPaymentAmount,
        paymentAmount: finalPaymentAmount // Ensure paymentAmount is set for the table display
      };
    }) : [];

    // Prepare combined payments list for previous month
    const prevCombinedPayments = [
      ...prevAllDepositPayments.map(payment => {
        // Calculate deposit amount ensuring numeric values
        const totalAmount = parseFloat(payment.amount) || 0;
        const depositPercentage = payment.depositPercentage || 50;
        const depositAmount = payment.depositAmount || (totalAmount * depositPercentage / 100);
        
        // Ensure explicit numeric value
        const finalDepositAmount = parseFloat(depositAmount) || 0;
        
        return {
          ...payment,
          paymentType: 'Deposit',
          paymentDate: payment.depositDate,
          paymentAmount: finalDepositAmount // Ensure deposit amount is set properly
        };
      }),
      ...prevFinalPayments.map(payment => {
        // Final payment amount calculated properly
        // Ensure explicit numeric value
        const finalPaymentAmount = parseFloat(payment.finalPaymentAmount) || 0;
        
        return {
          ...payment,
          paymentType: 'Final Payment',
          paymentDate: payment.finalPaymentDate,
          paymentAmount: finalPaymentAmount // Ensure final payment amount is set properly
        };
      })
    ];

    // Calculate previous revenue directly from combined payments
    const prevRevenue = prevCombinedPayments.reduce((total, payment) => 
      total + (payment.paymentAmount || 0), 0);
      
    // Calculate service fees and net revenue for previous month
    const prevServiceFees = prevCombinedPayments.reduce((total, payment) => 
      total + ((payment.paymentAmount || 0) * SERVICE_FEE_PERCENTAGE / 100), 0);
    
    const prevNetRevenue = prevRevenue - prevServiceFees;

    // For other metrics, still calculate these separately
    const depositRevenue = prevAllDepositPayments.reduce((total, job) => {
      return total + (job.depositAmount || 0);
    }, 0);

    const finalPaymentRevenue = prevFinalPayments.reduce((total, job) => {
      return total + (job.finalPaymentAmount || 0);
    }, 0);

    // Calculate average job size
    const averageJobSize = completedJobs.length > 0 
      ? prevRevenue / completedJobs.length 
      : 0;

    // Calculate quote conversion rate for previous month
    // Get all quotes sent in the previous month across all statuses
    const prevAllSentInMonth = [
      // Quotes still in Sent status
      ...(allQuotes.Sent ? allQuotes.Sent.filter(quote => {
        const sentDate = new Date(quote.date);
        return sentDate.getMonth() === month && sentDate.getFullYear() === year;
      }) : []),
      // Include quotes in Accepted status that were sent in previous month
      ...(allQuotes.Accepted ? allQuotes.Accepted.filter(quote => {
        const sentDate = new Date(quote.date);
        return sentDate.getMonth() === month && sentDate.getFullYear() === year;
      }) : []),
      // Include quotes in Scheduled Work that were sent in previous month
      ...(allQuotes['Scheduled Work'] ? allQuotes['Scheduled Work'].filter(quote => {
        const sentDate = new Date(quote.date);
        return sentDate.getMonth() === month && sentDate.getFullYear() === year;
      }) : []),
      // Include quotes in Complete that were sent in previous month
      ...(allQuotes.Complete ? allQuotes.Complete.filter(quote => {
        const sentDate = new Date(quote.date);
        return sentDate.getMonth() === month && sentDate.getFullYear() === year;
      }) : [])
    ];
    
    // Get quotes from previous month that were accepted
    const prevAcceptedQuotes = allQuotes.Accepted ? allQuotes.Accepted.filter(quote => {
      // Check if it was sent in the selected month
      if (quote.date) {
        const sentDate = new Date(quote.date);
        return sentDate.getMonth() === month && sentDate.getFullYear() === year;
      }
      return false;
    }) : [];
    
    // Get quotes from previous month that moved to Scheduled Work or Complete
    const prevScheduledQuotes = allQuotes['Scheduled Work'] ? allQuotes['Scheduled Work'].filter(quote => {
      if (quote.date) {
        const sentDate = new Date(quote.date);
        return sentDate.getMonth() === month && sentDate.getFullYear() === year;
      }
      return false;
    }) : [];
    
    const prevCompletedQuotes = allQuotes.Complete ? allQuotes.Complete.filter(quote => {
      if (quote.date) {
        const sentDate = new Date(quote.date);
        return sentDate.getMonth() === month && sentDate.getFullYear() === year;
      }
      return false;
    }) : [];
    
    // Total accepted quotes from the previous month
    const prevTotalAcceptedQuotes = prevAcceptedQuotes.length + prevScheduledQuotes.length + prevCompletedQuotes.length;
    
    // Previous month conversion rate calculation
    const prevQuoteConversion = prevAllSentInMonth.length > 0 
      ? (prevTotalAcceptedQuotes / prevAllSentInMonth.length) * 100 
      : 0;

    console.log(`Prev Month: ${month+1}/${year}, Sent: ${prevAllSentInMonth.length}, Accepted: ${prevTotalAcceptedQuotes}, Conversion: ${prevQuoteConversion}%`);

    setPreviousMonthData({
      revenue: prevRevenue,
      netRevenue: prevNetRevenue,
      serviceFees: prevServiceFees,
      depositRevenue,
      finalPaymentRevenue,
      jobsCompleted: completedJobs.length,
      quoteConversion: prevQuoteConversion,
      averageJobSize,
    });
  };

  // Handle month change
  const changeMonth = (direction) => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    if (direction === 'prev') {
      if (selectedMonth === 0) {
        setSelectedMonth(11);
        setSelectedYear(selectedYear - 1);
      } else {
        setSelectedMonth(selectedMonth - 1);
      }
    } else {
      // Don't allow scrolling beyond the current month
      if ((selectedYear === currentYear && selectedMonth < currentMonth) || 
          (selectedYear < currentYear)) {
        if (selectedMonth === 11) {
          setSelectedMonth(0);
          setSelectedYear(selectedYear + 1);
        } else {
          setSelectedMonth(selectedMonth + 1);
        }
      }
    }
  };

  // Calculate percentage difference for comparison
  const calculateDifference = (current, previous) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  // Format date from ISO string to human-readable date
  const formatDate = (dateString) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const day = date.getDate();
    const monthShort = months[date.getMonth()].substring(0, 3);
    
    return `${day} ${monthShort}`;
  };

  // Render individual income item
  const renderIncomeItem = ({ item }) => (
    <View style={styles.incomeItem}>
      <View style={styles.incomeDetails}>
        <Text style={styles.customerName}>{item.customerName || item.clientName}</Text>
        <Text style={styles.serviceDescription}>{item.description || item.service || 'No description'}</Text>
      </View>
      <View style={styles.incomeAmount}>
        <Text style={styles.amount}>R{item.amount.toFixed(2)}</Text>
        <Text style={styles.date}>
          {formatDate(item.finalPaymentDate || item.completedDate)}
        </Text>
      </View>
    </View>
  );

  // Toggle income breakdown collapse state
  const toggleIncomeBreakdown = () => {
    setIncomeBreakdownExpanded(!incomeBreakdownExpanded);
  };

  // Generate and share monthly income statement PDF
  const generateMonthlyStatementPDF = async () => {
    try {
      setIsGeneratingPDF(true);
      
      // Get metrics and income data
      const metrics = {
        revenue: monthlyData.revenue,
        netRevenue: monthlyData.netRevenue,
        serviceFees: monthlyData.serviceFees,
        jobsCompleted: monthlyData.jobsCompleted,
        averageJobSize: monthlyData.averageJobSize,
        quoteConversion: monthlyData.quoteConversion
      };
      
      // Make sure the payments are sorted by date (newest first)
      const sortedPayments = [...monthlyData.combinedPayments]
        .sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));
      
      // Generate PDF
      const pdfUri = await generateIncomeStatementPDF(
        sortedPayments, 
        metrics,
        months[selectedMonth],
        selectedYear
      );
      
      // Share PDF
      await sharePDF(pdfUri);
      
    } catch (error) {
      console.error('Error generating monthly statement:', error);
      Alert.alert('Error', 'Could not generate monthly statement');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader subtitle="Report & Insights" />

      {/* Month Selector */}
      <View style={styles.monthSelector}>
        <TouchableOpacity 
          style={styles.monthArrow}
          onPress={() => changeMonth('prev')}
        >
          <MaterialIcons name="chevron-left" size={28} color="#3B82F6" />
        </TouchableOpacity>
        
        <Text style={styles.monthYearText}>
          {months[selectedMonth]} {selectedYear}
        </Text>
        
        {/* Only show next button if not on current month */}
        {(selectedYear < new Date().getFullYear() || 
          (selectedYear === new Date().getFullYear() && selectedMonth < new Date().getMonth())) ? (
          <TouchableOpacity 
            style={styles.monthArrow}
            onPress={() => changeMonth('next')}
          >
            <MaterialIcons name="chevron-right" size={28} color="#3B82F6" />
          </TouchableOpacity>
        ) : (
          <View style={styles.monthArrow}>
            <MaterialIcons name="chevron-right" size={28} color="#D1D5DB" />
          </View>
        )}
      </View>

      <ScrollView style={styles.contentContainer}>
        {/* Metrics Section */}
        <View style={styles.metricsContainer}>
          {/* Revenue Metric */}
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Gross Revenue</Text>
            <Text style={styles.metricValue}>
              R{monthlyData.revenue.toFixed(2)}
            </Text>
            <View style={styles.comparison}>
              <MaterialIcons 
                name={calculateDifference(monthlyData.revenue, previousMonthData.revenue) >= 0 
                  ? "arrow-upward" 
                  : "arrow-downward"} 
                size={14} 
                color={calculateDifference(monthlyData.revenue, previousMonthData.revenue) >= 0 
                  ? "#10B981" 
                  : "#EF4444"}
              />
              <Text 
                style={[
                  styles.comparisonText,
                  {
                    color: calculateDifference(monthlyData.revenue, previousMonthData.revenue) >= 0 
                      ? "#10B981" 
                      : "#EF4444"
                  }
                ]}
              >
                {Math.abs(calculateDifference(monthlyData.revenue, previousMonthData.revenue)).toFixed(0)}% vs {
                  months[selectedMonth === 0 ? 11 : selectedMonth - 1].substring(0, 3)
                }
              </Text>
            </View>
          </View>

          {/* Net Revenue Metric */}
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Net Revenue</Text>
            <Text style={styles.metricValue}>
              R{monthlyData.netRevenue.toFixed(2)}
            </Text>
            <View style={styles.subMetric}>
              <Text style={styles.subMetricText}>After {SERVICE_FEE_PERCENTAGE}% service fees</Text>
            </View>
            <View style={styles.comparison}>
              <MaterialIcons 
                name={calculateDifference(monthlyData.netRevenue, previousMonthData.netRevenue) >= 0 
                  ? "arrow-upward" 
                  : "arrow-downward"} 
                size={14} 
                color={calculateDifference(monthlyData.netRevenue, previousMonthData.netRevenue) >= 0 
                  ? "#10B981" 
                  : "#EF4444"}
              />
              <Text 
                style={[
                  styles.comparisonText,
                  {
                    color: calculateDifference(monthlyData.netRevenue, previousMonthData.netRevenue) >= 0 
                      ? "#10B981" 
                      : "#EF4444"
                  }
                ]}
              >
                {Math.abs(calculateDifference(monthlyData.netRevenue, previousMonthData.netRevenue)).toFixed(0)}% vs {
                  months[selectedMonth === 0 ? 11 : selectedMonth - 1].substring(0, 3)
                }
              </Text>
            </View>
          </View>

          {/* Jobs Completed Metric */}
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Completed Jobs</Text>
            <Text style={styles.metricValue}>
              {monthlyData.jobsCompleted}
            </Text>
            <View style={styles.comparison}>
              <MaterialIcons 
                name={calculateDifference(monthlyData.jobsCompleted, previousMonthData.jobsCompleted) >= 0 
                  ? "arrow-upward" 
                  : "arrow-downward"} 
                size={14} 
                color={calculateDifference(monthlyData.jobsCompleted, previousMonthData.jobsCompleted) >= 0 
                  ? "#10B981" 
                  : "#EF4444"}
              />
              <Text 
                style={[
                  styles.comparisonText,
                  {
                    color: calculateDifference(monthlyData.jobsCompleted, previousMonthData.jobsCompleted) >= 0 
                      ? "#10B981" 
                      : "#EF4444"
                  }
                ]}
              >
                {Math.abs(monthlyData.jobsCompleted - previousMonthData.jobsCompleted)} jobs from {
                  months[selectedMonth === 0 ? 11 : selectedMonth - 1].substring(0, 3)
                }
              </Text>
            </View>
          </View>

          {/* Quote Conversion Metric */}
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Quote Conversion</Text>
            <Text style={styles.metricValue}>
              {monthlyData.quoteConversion.toFixed(0)}%
            </Text>
            <View style={styles.comparison}>
              <MaterialIcons 
                name={calculateDifference(monthlyData.quoteConversion, previousMonthData.quoteConversion) >= 0 
                  ? "arrow-upward" 
                  : "arrow-downward"} 
                size={14} 
                color={calculateDifference(monthlyData.quoteConversion, previousMonthData.quoteConversion) >= 0 
                  ? "#10B981" 
                  : "#EF4444"}
              />
              <Text 
                style={[
                  styles.comparisonText,
                  {
                    color: calculateDifference(monthlyData.quoteConversion, previousMonthData.quoteConversion) >= 0 
                      ? "#10B981" 
                      : "#EF4444"
                  }
                ]}
              >
                {Math.abs(calculateDifference(monthlyData.quoteConversion, previousMonthData.quoteConversion)).toFixed(0)}% vs {
                  months[selectedMonth === 0 ? 11 : selectedMonth - 1].substring(0, 3)
                }
              </Text>
            </View>
          </View>
        </View>

        {/* Income Breakdown Section - Collapsible */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderContainer}>
            <TouchableOpacity 
              style={styles.sectionHeader} 
              onPress={toggleIncomeBreakdown}
              activeOpacity={0.7}
            >
              <Text style={styles.sectionTitle}>Income Breakdown</Text>
              <MaterialIcons 
                name={incomeBreakdownExpanded ? "expand-less" : "expand-more"} 
                size={24} 
                color="#3B82F6" 
              />
            </TouchableOpacity>

            {/* Download PDF button */}
            <TouchableOpacity
              style={[
                styles.downloadButton,
                {opacity: monthlyData.combinedPayments.length === 0 ? 0.5 : 1}
              ]}
              onPress={generateMonthlyStatementPDF}
              disabled={isGeneratingPDF || monthlyData.combinedPayments.length === 0}
            >
              {isGeneratingPDF ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <MaterialIcons name="download" size={16} color="#ffffff" />
                  <Text style={styles.downloadButtonText}>PDF</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
          
          {/* Service fee info */}
          {incomeBreakdownExpanded && monthlyData.combinedPayments.length > 0 && (
            <View style={styles.feeInfoContainer}>
              <Text style={styles.feeInfoText}>
                * All payments subject to {SERVICE_FEE_PERCENTAGE}% service fee. Net amounts shown below.
              </Text>
            </View>
          )}
          
          {/* Collapsible content */}
          {incomeBreakdownExpanded && (
            <>
              {monthlyData.combinedPayments.length > 0 ? (
                // Display the pre-calculated combined payments list
                monthlyData.combinedPayments
                // Sort by date, newest first
                .sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate))
                .map((payment, index) => {
                  // Make sure paymentAmount is a number and force conversion again
                  const grossAmount = parseFloat(payment.paymentAmount) || 0;
                  const serviceFee = grossAmount * (SERVICE_FEE_PERCENTAGE / 100);
                  const netAmount = grossAmount - serviceFee;
                  
                  // More detailed logging to debug zero values
                  console.log(`Payment ${index} details:`, {
                    type: payment.paymentType,
                    clientName: payment.clientName,
                    paymentAmount: grossAmount,
                    totalAmount: parseFloat(payment.amount) || 0,
                    depositAmount: parseFloat(payment.depositAmount) || 0,
                    finalPaymentAmount: parseFloat(payment.finalPaymentAmount) || 0,
                    raw: payment.paymentAmount,
                    isNumber: typeof payment.paymentAmount === 'number'
                  });
                  
                  return (
                    <View key={index} style={styles.incomeItem}>
                      <View style={styles.incomeDetails}>
                        <Text style={styles.customerName}>{payment.customerName || payment.clientName}</Text>
                        <Text style={styles.serviceDescription}>{payment.description || payment.service || 'No description'}</Text>
                        <View style={styles.paymentInfo}>
                          <Text style={styles.paymentType}>{payment.paymentType}</Text>
                          <Text style={styles.paymentDate}>
                            {payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString() : 'Date not set'}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.amountContainer}>
                        <Text style={styles.incomeAmount}>
                          R{netAmount.toFixed(2)}
                        </Text>
                        <Text style={styles.grossAmount}>
                          Gross: R{grossAmount.toFixed(2)}
                        </Text>
                      </View>
                    </View>
                  );
                })
              ) : (
                <Text style={styles.noDataText}>No payments this month</Text>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  contentContainer: {
    flex: 1,
    padding: 16,
  },
  monthSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  monthArrow: {
    padding: 8,
  },
  monthYearText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  metricsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  metricCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    width: '48%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  metricLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  subMetric: {
    marginBottom: 8,
  },
  subMetricText: {
    fontSize: 11,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  comparison: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  comparisonText: {
    fontSize: 12,
    marginLeft: 4,
  },
  incomeContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
    backgroundColor: 'white',
    borderRadius: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    flex: 1,
    marginRight: 10,
  },
  downloadButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    width: 70,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 2,
  },
  downloadButtonText: {
    color: 'white',
    marginLeft: 4,
    fontWeight: '600',
  },
  feeInfoContainer: {
    backgroundColor: '#F9FAFB',
    padding: 8,
    marginBottom: 8,
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#9CA3AF',
  },
  feeInfoText: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  incomeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: 'white',
    paddingHorizontal: 12,
    marginBottom: 1,
  },
  incomeDetails: {
    flex: 1,
    marginRight: 16,
  },
  customerName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  serviceDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  amountContainer: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    minWidth: 120,
  },
  incomeAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  grossAmount: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  date: {
    fontSize: 12,
    color: '#6B7280',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    marginTop: 12,
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  revenueBreakdown: {
    marginBottom: 8,
  },
  breakdownText: {
    fontSize: 12,
    color: '#6B7280',
  },
  section: {
    marginBottom: 20,
  },
  subsection: {
    marginTop: 12,
    marginBottom: 16,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  paymentInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  paymentType: {
    fontSize: 12,
    backgroundColor: '#E5E7EB',
    color: '#4B5563',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  paymentDate: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  noDataText: {
    fontStyle: 'italic',
    color: '#888',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'white',
  },
});

export default ReportsScreen; 