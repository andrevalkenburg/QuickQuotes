import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import TabSelector from '../components/TabSelector';
import QuoteCard from '../components/QuoteCard';
import AppHeader from '../components/AppHeader';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Initial mock data for the different tabs
const initialMockData = {
  Draft: [],
  Sent: [],
  Accepted: [],
  'Scheduled Work': [],
  Complete: [],
};

// Key for storing quotes in AsyncStorage
const QUOTES_STORAGE_KEY = 'quickquote_data';

const DashboardScreen = ({ navigation, route }) => {
  const tabs = ['Draft', 'Sent', 'Accepted', 'Scheduled Work', 'Complete'];
  const [activeTab, setActiveTab] = useState('Draft');
  const [quotes, setQuotes] = useState(initialMockData);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load quotes from storage on initial load
  useEffect(() => {
    const loadQuotes = async () => {
      try {
        const storedQuotes = await AsyncStorage.getItem(QUOTES_STORAGE_KEY);
        if (storedQuotes) {
          console.log('Loaded quotes from storage');
          setQuotes(JSON.parse(storedQuotes));
        } else {
          console.log('No stored quotes found, using empty data');
          // Use empty data instead of mock data for initialization
          const emptyData = {
            Draft: [],
            Sent: [],
            Accepted: [],
            'Scheduled Work': [],
            Complete: [],
          };
          setQuotes(emptyData);
          // Save empty data to storage
          await AsyncStorage.setItem(QUOTES_STORAGE_KEY, JSON.stringify(emptyData));
        }
        setIsInitialized(true);
      } catch (error) {
        console.error('Error loading quotes:', error);
        // Fall back to empty data on error
        const emptyData = {
          Draft: [],
          Sent: [],
          Accepted: [],
          'Scheduled Work': [],
          Complete: [],
        };
        setQuotes(emptyData);
        setIsInitialized(true);
      }
    };

    loadQuotes();
  }, []);

  // Save quotes to storage whenever they change
  useEffect(() => {
    const saveQuotes = async () => {
      if (isInitialized) {
        try {
          await AsyncStorage.setItem(QUOTES_STORAGE_KEY, JSON.stringify(quotes));
          console.log('Quotes saved to storage');
        } catch (error) {
          console.error('Error saving quotes:', error);
        }
      }
    };

    saveQuotes();
  }, [quotes, isInitialized]);

  // Handle actions from the QuoteFormScreen
  useFocusEffect(
    React.useCallback(() => {
      // Add null check for route and route.params
      if (route && route.params && isInitialized) {
        if (route.params.action === 'add_draft' && route.params.quote) {
          // Add new draft quote
          const newQuote = route.params.quote;
          console.log('Adding new draft quote with description:', newQuote.description);
          
          // Create a new Draft array with the new quote at the beginning
          const updatedDrafts = [newQuote, ...quotes.Draft];
          
          // Update the quotes state with the entire state object
          setQuotes(prevQuotes => ({
            ...prevQuotes,
            Draft: updatedDrafts
          }));
          
          // Ensure we're on the Draft tab to see the new quote
          setActiveTab('Draft');
          
          // Clear params to prevent duplicate additions
          navigation.setParams({ action: null, quote: null });
          
          console.log('Added draft quote:', newQuote.id);
        } 
        else if (route.params.action === 'update_draft' && route.params.quote) {
          // Update existing draft quote
          const updatedQuote = route.params.quote;
          console.log('Updating draft quote with description:', updatedQuote.description);
          
          // Create a new array with the updated quote
          const updatedDrafts = quotes.Draft.map(quote => 
            quote.id === updatedQuote.id ? updatedQuote : quote
          );
          
          // Update the quotes state with the entire state object
          setQuotes(prevQuotes => ({
            ...prevQuotes,
            Draft: updatedDrafts
          }));
          
          // Ensure we're on the Draft tab to see the updated quote
          setActiveTab('Draft');
          
          // Clear params to prevent duplicate updates
          navigation.setParams({ action: null, quote: null });
          
          console.log('Updated draft quote:', updatedQuote.id);
        }
        else if (route.params.action === 'send_quote' && route.params.quote) {
          // Move quote from Draft to Sent section
          const sentQuote = route.params.quote;
          const fromDraftId = route.params.fromDraftId;
          
          console.log('Moving quote to Sent section:', sentQuote.id);
          
          // Create updated state
          let updatedState = { ...quotes };
          
          // Add to Sent section
          updatedState.Sent = [sentQuote, ...updatedState.Sent];
          
          // If it was from a draft, remove from Draft section
          if (fromDraftId) {
            updatedState.Draft = updatedState.Draft.filter(quote => quote.id !== fromDraftId);
          }
          
          // Update the quotes state
          setQuotes(updatedState);
          
          // Switch to Sent tab to show the sent quote
          setActiveTab('Sent');
          
          // Clear params to prevent duplicate sends
          navigation.setParams({ action: null, quote: null, fromDraftId: null });
          
          console.log('Quote sent and moved to Sent section:', sentQuote.id);
        }
      }
    }, [route && route.params, quotes, isInitialized])
  );

  const addNewQuote = () => {
    navigation.navigate('QuoteForm');
  };

  const deleteQuote = (quoteId) => {
    // Only handle deletion for Draft quotes
    if (activeTab === 'Draft') {
      // Filter out the quote with the matching ID
      const updatedDrafts = quotes.Draft.filter(quote => quote.id !== quoteId);
      
      // Update the quotes state with the entire state object
      setQuotes(prevQuotes => ({
        ...prevQuotes,
        Draft: updatedDrafts
      }));
      
      console.log(`Deleted quote ID: ${quoteId}`);
    }
  };

  const editQuote = (quoteId) => {
    // Find the quote to edit
    const quoteToEdit = quotes.Draft.find(quote => quote.id === quoteId);
    if (quoteToEdit) {
      // Navigate to QuoteFormScreen with the quote data
      navigation.navigate('QuoteForm', { quote: quoteToEdit });
    }
  };

  // Handle resending a quote
  const resendQuote = (quoteId) => {
    // Find the quote to resend
    const quoteToResend = quotes.Sent.find(quote => quote.id === quoteId);
    if (quoteToResend) {
      // Add today's date to sentDates array
      const today = new Date().toISOString().split('T')[0]; // Format as YYYY-MM-DD
      const updatedQuote = {
        ...quoteToResend,
        sentDates: [...(quoteToResend.sentDates || [quoteToResend.date]), today]
      };
      
      // Update the quotes state with the resent quote
      const updatedSent = quotes.Sent.map(quote => 
        quote.id === quoteId ? updatedQuote : quote
      );
      
      setQuotes(prevQuotes => ({
        ...prevQuotes,
        Sent: updatedSent
      }));
      
      console.log(`Resent quote ID: ${quoteId}`);
      
      // Show success message
      Alert.alert(
        "Success", 
        "Quote resent successfully!",
        [{ text: "OK" }]
      );
    }
  };

  // Handle downloading a PDF for a quote
  const downloadPDF = async (quoteId) => {
    // Find the quote to generate PDF for
    const quoteToDownload = quotes.Sent.find(quote => quote.id === quoteId);
    if (quoteToDownload) {
      try {
        // Import the PDF generator functions
        const { generateQuotePDF, sharePDF } = require('../utils/pdfGenerator');
        
        // Generate PDF and get the file path
        const pdfUri = await generateQuotePDF(quoteToDownload);
        
        // Share the PDF
        await sharePDF(pdfUri);
        
        console.log(`Downloaded quote PDF ID: ${quoteId}`);
      } catch (error) {
        console.error('Error generating or sharing PDF:', error);
        
        // Show error message
        Alert.alert(
          "Error", 
          "There was an error generating the PDF. Please try again.",
          [{ text: "OK" }]
        );
      }
    }
  };

  // Handle accepting a quote
  const acceptQuote = (quoteId) => {
    // Find the quote in Sent
    const quoteToAccept = quotes.Sent.find(quote => quote.id === quoteId);
    if (quoteToAccept) {
      // Add acceptance date
      const today = new Date().toISOString().split('T')[0]; // Format as YYYY-MM-DD
      const acceptedQuote = {
        ...quoteToAccept,
        acceptedDate: today
      };
      
      // Create updated state
      let updatedState = { ...quotes };
      
      // Add to Accepted section
      updatedState.Accepted = [acceptedQuote, ...updatedState.Accepted];
      
      // Remove from Sent section
      updatedState.Sent = updatedState.Sent.filter(quote => quote.id !== quoteId);
      
      // Update the quotes state
      setQuotes(updatedState);
      
      // Switch to Accepted tab to show the accepted quote
      setActiveTab('Accepted');
      
      console.log('Quote accepted and moved to Accepted section:', quoteId);
      
      // Show success message
      Alert.alert(
        "Success", 
        "Quote marked as accepted!",
        [{ text: "OK" }]
      );
    }
  };

  // Handle marking deposit paid
  const markDepositPaid = (quoteId) => {
    // Find the quote in Accepted
    const quoteToUpdate = quotes.Accepted.find(quote => quote.id === quoteId);
    if (quoteToUpdate) {
      // Add deposit paid date
      const today = new Date().toISOString().split('T')[0]; // Format as YYYY-MM-DD
      const updatedQuote = {
        ...quoteToUpdate,
        depositDate: today
      };
      
      // Create updated state
      let updatedState = { ...quotes };
      
      // Add to Scheduled Work section
      updatedState['Scheduled Work'] = [updatedQuote, ...updatedState['Scheduled Work']];
      
      // Remove from Accepted section
      updatedState.Accepted = updatedState.Accepted.filter(quote => quote.id !== quoteId);
      
      // Update the quotes state
      setQuotes(updatedState);
      
      // Switch to Scheduled Work tab
      setActiveTab('Scheduled Work');
      
      console.log('Quote marked with deposit paid and moved to Scheduled Work:', quoteId);
      
      // Show success message
      Alert.alert(
        "Success", 
        "Deposit marked as paid!",
        [{ text: "OK" }]
      );
    }
  };

  // Handle marking work as complete
  const markWorkComplete = (quoteId) => {
    // Find the quote in Scheduled Work
    const quoteToUpdate = quotes['Scheduled Work'].find(quote => quote.id === quoteId);
    if (quoteToUpdate) {
      // Add work complete date
      const today = new Date().toISOString().split('T')[0]; // Format as YYYY-MM-DD
      const updatedQuote = {
        ...quoteToUpdate,
        completedDate: today,
        isPaid: false // Default to not paid yet
      };
      
      // Create updated state
      let updatedState = { ...quotes };
      
      // Add to Complete section
      updatedState.Complete = [updatedQuote, ...updatedState.Complete];
      
      // Remove from Scheduled Work section
      updatedState['Scheduled Work'] = updatedState['Scheduled Work'].filter(quote => quote.id !== quoteId);
      
      // Update the quotes state
      setQuotes(updatedState);
      
      // Switch to Complete tab
      setActiveTab('Complete');
      
      console.log('Quote marked as complete:', quoteId);
      
      // Show success message
      Alert.alert(
        "Success", 
        "Work marked as complete!",
        [{ text: "OK" }]
      );
    }
  };

  // Handle marking final payment received
  const markFinalPayment = (quoteId) => {
    // Find the quote in Complete
    const quoteToUpdate = quotes.Complete.find(quote => quote.id === quoteId);
    if (quoteToUpdate) {
      // Add final payment date
      const today = new Date().toISOString().split('T')[0]; // Format as YYYY-MM-DD
      const updatedQuote = {
        ...quoteToUpdate,
        finalPaymentDate: today,
        isPaid: true
      };
      
      // Update the quotes state with the paid quote
      const updatedComplete = quotes.Complete.map(quote => 
        quote.id === quoteId ? updatedQuote : quote
      );
      
      setQuotes(prevQuotes => ({
        ...prevQuotes,
        Complete: updatedComplete
      }));
      
      console.log('Quote marked as fully paid:', quoteId);
      
      // Show success message
      Alert.alert(
        "Success", 
        "Final payment marked as received!",
        [{ text: "OK" }]
      );
    }
  };

  // Handle downloading an invoice for a completed quote
  const downloadInvoice = async (quoteId) => {
    // Find the quote to generate invoice for
    const quoteToInvoice = quotes.Complete.find(quote => quote.id === quoteId);
    if (quoteToInvoice && quoteToInvoice.isPaid) {
      try {
        // Import the PDF generator functions
        const { generateInvoicePDF, sharePDF } = require('../utils/pdfGenerator');
        
        // Generate PDF invoice and get the file path
        const pdfUri = await generateInvoicePDF(quoteToInvoice);
        
        // Share the PDF
        await sharePDF(pdfUri);
        
        console.log(`Downloaded invoice PDF for ID: ${quoteId}`);
      } catch (error) {
        console.error('Error generating or sharing invoice PDF:', error);
        
        // Show error message
        Alert.alert(
          "Error", 
          "There was an error generating the invoice. Please try again.",
          [{ text: "OK" }]
        );
      }
    } else {
      // Show error if the quote is not found or not fully paid
      Alert.alert(
        "Error", 
        "Cannot generate invoice. The job may not be fully paid.",
        [{ text: "OK" }]
      );
    }
  };

  const renderHeader = () => {
    if (activeTab === 'Draft') {
      return (
        <View style={styles.headerContainer}>
          <TouchableOpacity
            onPress={addNewQuote}
            style={styles.addButton}
          >
            <Text style={styles.addButtonText}>+ New Quote</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return null;
  };

  // Reset quotes storage
  const resetQuotes = async () => {
    try {
      const emptyData = {
        Draft: [],
        Sent: [],
        Accepted: [],
        'Scheduled Work': [],
        Complete: [],
      };
      
      await AsyncStorage.setItem(QUOTES_STORAGE_KEY, JSON.stringify(emptyData));
      setQuotes(emptyData);
      console.log('All quotes cleared');
      
      Alert.alert(
        "Success", 
        "All quotes have been cleared.",
        [{ text: "OK" }]
      );
    } catch (error) {
      console.error('Error resetting quotes:', error);
      
      Alert.alert(
        "Error", 
        "Failed to clear quotes. Please try again.",
        [{ text: "OK" }]
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader subtitle="Dashboard" />

      <TabSelector 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        tabs={tabs} 
      />
      
      {renderHeader()}

      <FlatList
        data={quotes[activeTab]}
        renderItem={({ item }) => (
          <QuoteCard 
            quote={item} 
            tabType={activeTab} 
            onDelete={activeTab === 'Draft' ? deleteQuote : null}
            onEdit={activeTab === 'Draft' ? editQuote : null}
            onResend={activeTab === 'Sent' ? resendQuote : null}
            onDownloadPDF={activeTab === 'Sent' ? downloadPDF : null}
            onAccept={activeTab === 'Sent' ? acceptQuote : null}
            onDepositPaid={activeTab === 'Accepted' ? markDepositPaid : null}
            onWorkComplete={activeTab === 'Scheduled Work' ? markWorkComplete : null}
            onFinalPayment={activeTab === 'Complete' && !item.isPaid ? markFinalPayment : null}
            onDownloadInvoice={activeTab === 'Complete' && item.isPaid ? downloadInvoice : null}
          />
        )}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {activeTab === 'Draft' ? "No draft quotes yet. Create your first quote!" : 
                `No quotes in ${activeTab} status.`}
            </Text>
            {activeTab === 'Draft' && (
              <TouchableOpacity
                style={styles.resetButton}
                onPress={addNewQuote}
              >
                <Text style={styles.resetButtonText}>Create Quote</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB', // gray-50
  },
  headerContainer: {
    padding: 16,
  },
  addButton: {
    backgroundColor: '#3B82F6', // blue-500
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  addButtonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: '500',
  },
  listContent: {
    padding: 16,
    paddingBottom: 80, // Extra padding to account for the bottom nav bar
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#6B7280', // gray-500
  },
  resetButton: {
    backgroundColor: '#3B82F6', // blue-500
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignSelf: 'center',
    marginTop: 16,
  },
  resetButtonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default DashboardScreen; 