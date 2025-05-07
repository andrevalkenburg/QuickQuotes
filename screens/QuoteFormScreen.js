import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  ScrollView, 
  TouchableOpacity, 
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  BackHandler
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { generateQuotePDF, sharePDF } from '../utils/pdfGenerator';

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

const QuoteFormScreen = ({ navigation, route }) => {
  // Check if we're editing an existing quote
  const isEditing = route.params?.quote !== undefined;
  const initialQuote = route.params?.quote || null;

  // Fixed service charge percentage
  const SERVICE_CHARGE_PERCENTAGE = 0.5;

  // Form state
  const [clientName, setClientName] = useState(initialQuote?.customerName || '');
  const [contactType, setContactType] = useState(initialQuote?.contactType || 'phone'); // 'phone' or 'email'
  const [contactInfo, setContactInfo] = useState(
    initialQuote?.contactType === 'email' 
      ? initialQuote?.email || '' 
      : initialQuote?.phoneNumber || ''
  );
  const [clientAddress, setClientAddress] = useState(initialQuote?.clientAddress || '');
  const [description, setDescription] = useState(initialQuote?.description || '');
  const [lineItems, setLineItems] = useState(
    initialQuote?.lineItems || [{ id: 1, description: '', quantity: 1, price: 0 }]
  );
  const [vatPercentage, setVatPercentage] = useState(initialQuote?.vatPercentage || 15);
  const [depositPercentage, setDepositPercentage] = useState(initialQuote?.depositPercentage || 50);
  const [formModified, setFormModified] = useState(false);

  // Set up navigation options with custom back button handling
  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity 
          onPress={handleBackPress}
          style={{ marginLeft: 10 }}
        >
          <MaterialIcons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
      ),
    });
  }, [navigation, clientName, contactInfo, clientAddress, lineItems, description, formModified]);

  // Handle hardware back button
  useFocusEffect(
    React.useCallback(() => {
      // Only add backHandler on Android where it's supported
      if (Platform.OS === 'android') {
        const onBackPress = () => {
          handleBackPress();
          return true; // Prevent default behavior
        };

        BackHandler.addEventListener('hardwareBackPress', onBackPress);

        return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
      }
      // Return empty cleanup function for iOS
      return () => {};
    }, [clientName, contactInfo, clientAddress, lineItems, description, formModified])
  );

  // Mark form as modified when values change
  useEffect(() => {
    if (clientName || contactInfo || clientAddress || description || lineItems.some(item => item.description || item.price > 0)) {
      setFormModified(true);
    }
  }, [clientName, contactInfo, clientAddress, description, lineItems]);

  // Calculate totals
  const calculateItemTotal = (item) => {
    const total = item.quantity * item.price;
    return Number(total.toFixed(2)); // Ensure precision for calculations
  };

  const subtotal = Number(lineItems.reduce((sum, item) => sum + calculateItemTotal(item), 0).toFixed(2));
  const vatAmount = Number((subtotal * (vatPercentage / 100)).toFixed(2));
  const serviceChargeAmount = Number((subtotal * (SERVICE_CHARGE_PERCENTAGE / 100)).toFixed(2));
  const total = Number((subtotal + vatAmount + serviceChargeAmount).toFixed(2));
  const depositAmount = Number((total * (depositPercentage / 100)).toFixed(2));

  // Handle back button / navigation
  const handleBackPress = () => {
    if (formModified) {
      Alert.alert(
        "Save Draft",
        "Would you like to save this quote as a draft?",
        [
          {
            text: "Don't Save",
            style: "cancel",
            onPress: () => navigation.goBack()
          },
          {
            text: "Save Draft",
            onPress: saveAsDraft
          }
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  // Save as draft function
  const saveAsDraft = () => {
    // Create the quote object with all the current form data
    const draftQuote = {
      id: isEditing ? initialQuote.id : `d${Date.now()}`,
      customerName: clientName,
      amount: total,
      formattedAmount: formatCurrency(total),
      service: description || lineItems[0]?.description || 'Quote', // Use description as service name
      // Additional data we might want to store
      contactType,
      [contactType === 'phone' ? 'phoneNumber' : 'email']: contactInfo,
      clientAddress,
      description, // Store the description separately to ensure it's preserved
      lineItems,
      vatPercentage,
      serviceChargePercentage: SERVICE_CHARGE_PERCENTAGE,
      depositPercentage
    };

    console.log('Saving draft with description:', description);

    // For editing, we need to update the existing quote
    if (isEditing) {
      // Navigate back to Main with the updated quote
      navigation.navigate({
        name: 'Main',
        params: { 
          action: 'update_draft',
          quote: draftQuote
        },
        merge: true
      });
    } else {
      // For new quotes, we add to drafts
      navigation.navigate({
        name: 'Main',
        params: { 
          action: 'add_draft',
          quote: draftQuote
        },
        merge: true
      });
    }
  };

  // Add a new line item
  const addLineItem = () => {
    const newId = lineItems.length > 0 
      ? Math.max(...lineItems.map(item => item.id)) + 1 
      : 1;
      
    setLineItems([
      ...lineItems, 
      { id: newId, description: '', quantity: 1, price: 0 }
    ]);
  };

  // Remove a line item
  const removeLineItem = (id) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter(item => item.id !== id));
    }
  };

  // Update a line item
  const updateLineItem = (id, field, value) => {
    const updatedItems = lineItems.map(item => {
      if (item.id === id) {
        return { ...item, [field]: field === 'price' || field === 'quantity' ? Number(value) : value };
      }
      return item;
    });
    setLineItems(updatedItems);
  };

  // Handle sending the quote
  const handleSendQuote = async () => {
    if (contactType === 'phone' && !contactInfo.trim()) {
      Alert.alert(
        "Missing Phone Number", 
        "Please enter a phone number to send the quote.",
        [{ text: "OK" }]
      );
      return;
    } else if (contactType === 'email' && !contactInfo.trim()) {
      Alert.alert(
        "Missing Email", 
        "Please enter an email address to send the quote.",
        [{ text: "OK" }]
      );
      return;
    }

    // Create sent quote object with current date
    const sentQuote = {
      id: isEditing ? initialQuote.id : `s${Date.now()}`,
      customerName: clientName,
      amount: total,
      formattedAmount: formatCurrency(total),
      service: description || lineItems[0]?.description || 'Quote',
      date: new Date().toISOString().split('T')[0], // Format as YYYY-MM-DD
      sentDates: [new Date().toISOString().split('T')[0]], // Array to track all sent dates
      // Additional data to store
      contactType,
      [contactType === 'phone' ? 'phoneNumber' : 'email']: contactInfo,
      clientAddress,
      description,
      lineItems,
      vatPercentage,
      serviceChargePercentage: SERVICE_CHARGE_PERCENTAGE,
      depositPercentage,
      // Add business info if available from OnboardingScreen
      businessName: global.businessName || '',
      businessAddress: global.businessAddress || ''
    };

    console.log("Quote ready to send:", sentQuote);

    try {
      // Generate PDF and get the file path
      const pdfUri = await generateQuotePDF(sentQuote);

    // Navigate back to Main with the sent quote
    navigation.navigate({
      name: 'Main',
      params: { 
        action: 'send_quote',
        quote: sentQuote,
        fromDraftId: isEditing ? initialQuote.id : null // ID of the draft to remove (if editing)
      },
      merge: true
    });

    // Show success message
    Alert.alert(
        "Quote Created", 
        "Your quote has been created. Would you like to share it now?",
      [
        { 
            text: "Not Now", 
            style: "cancel"
          },
          {
            text: "Share PDF",
            onPress: () => sharePDF(pdfUri)
          }
        ]
      );
    } catch (error) {
      console.error("Error generating PDF:", error);
      
      // If PDF generation fails, still save the quote but show an error about PDF
      navigation.navigate({
        name: 'Main',
        params: { 
          action: 'send_quote',
          quote: sentQuote,
          fromDraftId: isEditing ? initialQuote.id : null
        },
        merge: true
      });
      
      Alert.alert(
        "Quote Sent", 
        "Quote was sent successfully, but there was an error generating the PDF.",
        [{ text: "OK" }]
    );
    }
  };

  // Toggle contact type between phone and email
  const toggleContactType = () => {
    setContactType(contactType === 'phone' ? 'email' : 'phone');
    setContactInfo(''); // Clear the contact info when switching types
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Text style={styles.title}>{isEditing ? 'Edit Quote' : 'New Quote'}</Text>
          
          {/* Client Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Client Information</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Client Name & Surname</Text>
              <TextInput
                style={styles.input}
                value={clientName}
                onChangeText={setClientName}
                placeholder="Enter client name"
              />
            </View>
            
            <View style={styles.inputContainer}>
              <View style={styles.contactTypeContainer}>
                <Text style={styles.label}>{contactType === 'phone' ? 'Phone Number' : 'Email'}</Text>
                <TouchableOpacity 
                  onPress={toggleContactType}
                  style={styles.contactTypeToggle}
                >
                  <Text style={styles.contactTypeToggleText}>
                    Switch to {contactType === 'phone' ? 'Email' : 'Phone'}
                  </Text>
                  <MaterialIcons name="arrow-drop-down" size={20} color="#3B82F6" />
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.input}
                value={contactInfo}
                onChangeText={setContactInfo}
                placeholder={contactType === 'phone' ? "Enter phone number" : "Enter email address"}
                keyboardType={contactType === 'phone' ? "phone-pad" : "email-address"}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Client Address</Text>
              <TextInput
                style={[styles.input, styles.multilineInput]}
                value={clientAddress}
                onChangeText={setClientAddress}
                placeholder="Enter client address"
                multiline
                numberOfLines={3}
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={styles.input}
                value={description}
                onChangeText={setDescription}
                placeholder="Enter quote description or service type"
                multiline
              />
            </View>
          </View>
          
          {/* Line Items */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Line Items</Text>
              <TouchableOpacity 
                style={styles.addButton} 
                onPress={addLineItem}
              >
                <MaterialIcons name="add" size={16} color="#FFF" />
                <Text style={styles.addButtonText}>Add Item</Text>
              </TouchableOpacity>
            </View>
            
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.headerCell, styles.descriptionCell]}>DESCRIPTION</Text>
              <Text style={[styles.headerCell, styles.qtyCell]}>QTY</Text>
              <Text style={[styles.headerCell, styles.priceCell]}>PRICE</Text>
              <Text style={[styles.headerCell, styles.totalCell]}>TOTAL</Text>
              <View style={styles.actionCell}></View>
            </View>
            
            {/* Line Items */}
            {lineItems.map((item) => (
              <View key={item.id} style={styles.tableRow}>
                <TextInput
                  style={[styles.cell, styles.descriptionCell, styles.cellInput]}
                  value={item.description}
                  onChangeText={(text) => updateLineItem(item.id, 'description', text)}
                  placeholder="Item description"
                />
                
                <TextInput
                  style={[styles.cell, styles.qtyCell, styles.cellInput]}
                  value={item.quantity.toString()}
                  onChangeText={(text) => updateLineItem(item.id, 'quantity', text)}
                  keyboardType="numeric"
                />
                
                <View style={[styles.cell, styles.priceCell]}>
                  <Text style={styles.currencyPrefix}>R</Text>
                  <TextInput
                    style={styles.priceInput}
                    value={item.price.toString()}
                    onChangeText={(text) => updateLineItem(item.id, 'price', text)}
                    keyboardType="numeric"
                  />
                </View>
                
                <Text style={[styles.cell, styles.totalCell]}>
                  R {calculateItemTotal(item).toFixed(2)}
                </Text>
                
                <TouchableOpacity
                  style={styles.actionCell}
                  onPress={() => removeLineItem(item.id)}
                >
                  <MaterialIcons name="delete" size={22} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
          
          {/* Tax and Deposit Settings */}
          <View style={styles.splitSection}>
            <View style={styles.taxContainer}>
              <Text style={styles.label}>VAT (%)</Text>
              <View style={styles.percentInput}>
                <TextInput
                  style={styles.percentInputField}
                  value={vatPercentage.toString()}
                  onChangeText={(text) => setVatPercentage(Number(text) || 0)}
                  keyboardType="numeric"
                />
                <Text style={styles.percentSymbol}>%</Text>
              </View>
            </View>
            
            <View style={styles.taxContainer}>
              <Text style={styles.label}>Deposit (%)</Text>
              <View style={styles.percentInput}>
                <TextInput
                  style={styles.percentInputField}
                  value={depositPercentage.toString()}
                  onChangeText={(text) => setDepositPercentage(Number(text) || 0)}
                  keyboardType="numeric"
                />
                <Text style={styles.percentSymbol}>%</Text>
              </View>
            </View>
          </View>
          
          {/* Summary */}
          <View style={styles.summary}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal:</Text>
              <Text style={styles.summaryValue}>R {subtotal.toFixed(2)}</Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>VAT ({vatPercentage}%):</Text>
              <Text style={styles.summaryValue}>R {vatAmount.toFixed(2)}</Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Service Charge ({SERVICE_CHARGE_PERCENTAGE}%):</Text>
              <Text style={styles.summaryValue}>R {serviceChargeAmount.toFixed(2)}</Text>
            </View>
            
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total:</Text>
              <Text style={styles.totalValue}>R {total.toFixed(2)}</Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.depositLabel}>Deposit:</Text>
              <Text style={styles.depositValue}>R {depositAmount.toFixed(2)}</Text>
            </View>
          </View>
          
          {/* Send Button */}
          <TouchableOpacity 
            style={styles.sendButton} 
            onPress={handleSendQuote}
          >
            <Text style={styles.sendButtonText}>Send Quote</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 24,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4B5563',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  contactTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contactTypeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  contactTypeToggleText: {
    color: '#3B82F6',
    fontWeight: '500',
    fontSize: 14,
  },
  addButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  addButtonText: {
    color: 'white',
    fontWeight: '500',
    marginLeft: 4,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 8,
    marginBottom: 8,
  },
  headerCell: {
    fontWeight: '600',
    fontSize: 12,
    color: '#6B7280',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingVertical: 8,
    alignItems: 'center',
  },
  cell: {
    padding: 8,
  },
  cellInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 4,
    padding: 8,
  },
  descriptionCell: {
    flex: 3,
  },
  qtyCell: {
    flex: 1,
    textAlign: 'center',
  },
  priceCell: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencyPrefix: {
    paddingLeft: 8,
    color: '#4B5563',
  },
  priceInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 4,
    padding: 8,
    marginLeft: 4,
  },
  totalCell: {
    flex: 2,
    textAlign: 'right',
  },
  actionCell: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splitSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  taxContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    flex: 1,
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  percentInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
  percentInputField: {
    flex: 1,
    padding: 12,
    fontSize: 16,
  },
  percentSymbol: {
    marginRight: 12,
    fontSize: 16,
    color: '#4B5563',
  },
  summary: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  summaryLabel: {
    fontSize: 16,
    color: '#4B5563',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
  },
  totalRow: {
    borderBottomWidth: 0,
    paddingVertical: 12,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  depositLabel: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '500',
  },
  depositValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#3B82F6',
  },
  sendButton: {
    backgroundColor: '#10B981',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  sendButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default QuoteFormScreen; 