import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { usePetStore } from '@/lib/pet-store';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { CustomDatePicker } from '@/components/custom-date-picker';
import {
  MedicationFrequency,
  MEDICATION_FREQUENCIES,
  COMMON_MEDICATIONS,
} from '@/shared/pet-types';

export default function AddMedicationScreen() {
  const { petId } = useLocalSearchParams<{ petId: string }>();
  const router = useRouter();
  const colors = useColors();
  const { addMedication, getPet } = usePetStore();

  const pet = getPet(petId);

  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState<MedicationFrequency>('once_daily');
  const [instructions, setInstructions] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [isOngoing, setIsOngoing] = useState(true);
  const [trackPills, setTrackPills] = useState(false);
  const [pillsRemaining, setPillsRemaining] = useState('');
  const [pillsPerRefill, setPillsPerRefill] = useState('');
  const [refillReminderAt, setRefillReminderAt] = useState('10');
  
  const [showCommonMeds, setShowCommonMeds] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSelectCommonMed = (med: { name: string; defaultDosage: string }) => {
    setName(med.name);
    setDosage(med.defaultDosage);
    setShowCommonMeds(false);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a medication name');
      return;
    }
    if (!dosage.trim()) {
      Alert.alert('Error', 'Please enter a dosage');
      return;
    }

    setIsSaving(true);
    try {
      await addMedication({
        petId,
        name: name.trim(),
        dosage: dosage.trim(),
        frequency,
        instructions: instructions.trim() || undefined,
        startDate: startDate.toISOString(),
        endDate: !isOngoing && endDate ? endDate.toISOString() : undefined,
        isOngoing,
        pillsRemaining: trackPills && pillsRemaining ? parseInt(pillsRemaining, 10) : undefined,
        pillsPerRefill: trackPills && pillsPerRefill ? parseInt(pillsPerRefill, 10) : undefined,
        refillReminderAt: trackPills && refillReminderAt ? parseInt(refillReminderAt, 10) : undefined,
      });
      router.back();
    } catch (error) {
      console.error('Failed to add medication:', error);
      Alert.alert('Error', 'Failed to add medication. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  

  const styles = StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerButton: {
      paddingVertical: 8,
      paddingHorizontal: 4,
    },
    headerButtonText: {
      fontSize: 17,
      color: colors.tint,
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: '600',
      color: colors.text,
    },
    saveButton: {
      opacity: isSaving ? 0.5 : 1,
    },
    content: {
      padding: 16,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.muted,
      textTransform: 'uppercase',
      marginBottom: 8,
      marginLeft: 4,
    },
    inputContainer: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      overflow: 'hidden',
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    inputRowLast: {
      borderBottomWidth: 0,
    },
    inputLabel: {
      fontSize: 16,
      color: colors.text,
      width: 100,
    },
    input: {
      flex: 1,
      fontSize: 16,
      color: colors.text,
      textAlign: 'right',
    },
    inputPlaceholder: {
      color: colors.muted,
    },
    
    frequencyContainer: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      overflow: 'hidden',
    },
    frequencyOption: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    frequencyOptionLast: {
      borderBottomWidth: 0,
    },
    frequencyOptionSelected: {
      backgroundColor: colors.tint + '15',
    },
    frequencyText: {
      fontSize: 16,
      color: colors.text,
    },
    checkmark: {
      fontSize: 18,
      color: colors.tint,
      fontWeight: '600',
    },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surface,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      marginBottom: 12,
    },
    switchLabel: {
      fontSize: 16,
      color: colors.text,
    },
    commonMedsButton: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      alignItems: 'center',
      marginBottom: 16,
    },
    commonMedsButtonText: {
      fontSize: 16,
      color: colors.tint,
      fontWeight: '500',
    },
    commonMedsList: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      marginBottom: 16,
      overflow: 'hidden',
    },
    commonMedItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    commonMedItemLast: {
      borderBottomWidth: 0,
    },
    commonMedName: {
      fontSize: 16,
      color: colors.text,
    },
    commonMedDosage: {
      fontSize: 14,
      color: colors.muted,
    },
    pillsSection: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      overflow: 'hidden',
      marginTop: 12,
    },
    note: {
      fontSize: 13,
      color: colors.muted,
      marginTop: 8,
      marginLeft: 4,
    },
  });

  if (!pet) {
    return (
      <ScreenContainer>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
            <Text style={styles.headerButtonText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Medication</Text>
          <View style={styles.headerButton} />
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: colors.text }}>Pet not found</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
            <Text style={styles.headerButtonText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Medication</Text>
          <TouchableOpacity
            style={[styles.headerButton, styles.saveButton]}
            onPress={handleSave}
            disabled={isSaving}
          >
            <Text style={[styles.headerButtonText, { fontWeight: '600' }]}>
              {isSaving ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Quick Select Common Medications */}
          <TouchableOpacity
            style={styles.commonMedsButton}
            onPress={() => setShowCommonMeds(!showCommonMeds)}
          >
            <Text style={styles.commonMedsButtonText}>
              {showCommonMeds ? 'Hide Common Medications' : 'Select Common Medication'}
            </Text>
          </TouchableOpacity>

          {showCommonMeds && (
            <View style={styles.commonMedsList}>
              {COMMON_MEDICATIONS.map((med, index) => (
                <TouchableOpacity
                  key={med.name}
                  style={[
                    styles.commonMedItem,
                    index === COMMON_MEDICATIONS.length - 1 && styles.commonMedItemLast,
                  ]}
                  onPress={() => handleSelectCommonMed(med)}
                >
                  <Text style={styles.commonMedName}>{med.name}</Text>
                  <Text style={styles.commonMedDosage}>{med.defaultDosage}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Medication Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Medication Details</Text>
            <View style={styles.inputContainer}>
              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Name</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter medication name"
                  placeholderTextColor={colors.muted}
                />
              </View>
              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Dosage</Text>
                <TextInput
                  style={styles.input}
                  value={dosage}
                  onChangeText={setDosage}
                  placeholder="e.g., 10mg, 1 tablet"
                  placeholderTextColor={colors.muted}
                />
              </View>
              <View style={[styles.inputRow, styles.inputRowLast]}>
                <Text style={styles.inputLabel}>Instructions</Text>
                <TextInput
                  style={styles.input}
                  value={instructions}
                  onChangeText={setInstructions}
                  placeholder="e.g., Give with food"
                  placeholderTextColor={colors.muted}
                />
              </View>
            </View>
          </View>

          {/* Frequency */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Frequency</Text>
            <View style={styles.frequencyContainer}>
              {MEDICATION_FREQUENCIES.map((freq, index) => (
                <TouchableOpacity
                  key={freq.value}
                  style={[
                    styles.frequencyOption,
                    index === MEDICATION_FREQUENCIES.length - 1 && styles.frequencyOptionLast,
                    frequency === freq.value && styles.frequencyOptionSelected,
                  ]}
                  onPress={() => setFrequency(freq.value)}
                >
                  <Text style={styles.frequencyText}>{freq.label}</Text>
                  {frequency === freq.value && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Schedule */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Schedule</Text>
            <View style={styles.inputContainer}>
              <CustomDatePicker
                value={startDate}
                onChange={setStartDate}
                label="Start Date"
              />
              <View style={[styles.inputRow, styles.inputRowLast]}>
                <Text style={styles.inputLabel}>Ongoing</Text>
                <Switch
                  value={isOngoing}
                  onValueChange={setIsOngoing}
                  trackColor={{ false: colors.border, true: colors.tint }}
                />
              </View>
            </View>

            {!isOngoing && (
              <View style={{ marginTop: 12 }}>
                <CustomDatePicker
                  value={endDate || new Date()}
                  onChange={(date: Date) => setEndDate(date)}
                  label="End Date"
                  minimumDate={startDate}
                />
              </View>
            )}
          </View>

          {/* Refill Tracking */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Refill Tracking</Text>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Track pill count</Text>
              <Switch
                value={trackPills}
                onValueChange={setTrackPills}
                trackColor={{ false: colors.border, true: colors.tint }}
              />
            </View>

            {trackPills && (
              <View style={styles.pillsSection}>
                <View style={styles.inputRow}>
                  <Text style={styles.inputLabel}>Pills Left</Text>
                  <TextInput
                    style={styles.input}
                    value={pillsRemaining}
                    onChangeText={setPillsRemaining}
                    placeholder="Current count"
                    placeholderTextColor={colors.muted}
                    keyboardType="number-pad"
                  />
                </View>
                <View style={styles.inputRow}>
                  <Text style={styles.inputLabel}>Per Refill</Text>
                  <TextInput
                    style={styles.input}
                    value={pillsPerRefill}
                    onChangeText={setPillsPerRefill}
                    placeholder="Pills per refill"
                    placeholderTextColor={colors.muted}
                    keyboardType="number-pad"
                  />
                </View>
                <View style={[styles.inputRow, styles.inputRowLast]}>
                  <Text style={styles.inputLabel}>Remind At</Text>
                  <TextInput
                    style={styles.input}
                    value={refillReminderAt}
                    onChangeText={setRefillReminderAt}
                    placeholder="Pills remaining"
                    placeholderTextColor={colors.muted}
                    keyboardType="number-pad"
                  />
                </View>
              </View>
            )}
            {trackPills && (
              <Text style={styles.note}>
                You'll be reminded when pills remaining reaches the "Remind At" count.
              </Text>
            )}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>

        
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
