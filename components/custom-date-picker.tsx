import { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  Dimensions,
  Platform,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/use-colors";

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

// Generate arrays for months, days, years
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const generateYears = (minYear: number, maxYear: number) => {
  const years: number[] = [];
  for (let i = maxYear; i >= minYear; i--) {
    years.push(i);
  }
  return years;
};

const getDaysInMonth = (month: number, year: number) => {
  return new Date(year, month + 1, 0).getDate();
};

interface WheelPickerProps {
  data: (string | number)[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  width: number;
}

function WheelPicker({ data, selectedIndex, onSelect, width }: WheelPickerProps) {
  const colors = useColors();
  const scrollViewRef = useRef<ScrollView>(null);
  const [internalIndex, setInternalIndex] = useState(selectedIndex);
  const isUserScrolling = useRef(false);
  const scrollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Scroll to selected index on mount and when selectedIndex changes externally
  useEffect(() => {
    if (!isUserScrolling.current && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({
        y: selectedIndex * ITEM_HEIGHT,
        animated: false,
      });
      setInternalIndex(selectedIndex);
    }
  }, [selectedIndex]);

  const snapToIndex = useCallback((index: number) => {
    const clampedIndex = Math.max(0, Math.min(index, data.length - 1));
    
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({
        y: clampedIndex * ITEM_HEIGHT,
        animated: true,
      });
    }
    
    if (clampedIndex !== internalIndex) {
      setInternalIndex(clampedIndex);
      onSelect(clampedIndex);
      if (Platform.OS !== "web") {
        Haptics.selectionAsync();
      }
    }
  }, [data.length, internalIndex, onSelect]);

  const handleScrollEnd = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / ITEM_HEIGHT);
    snapToIndex(index);
    isUserScrolling.current = false;
  }, [snapToIndex]);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    // Clear any existing timeout
    if (scrollTimeout.current) {
      clearTimeout(scrollTimeout.current);
    }
    
    // Set a timeout to snap after scrolling stops (for web)
    if (Platform.OS === "web") {
      scrollTimeout.current = setTimeout(() => {
        const offsetY = event.nativeEvent.contentOffset.y;
        const index = Math.round(offsetY / ITEM_HEIGHT);
        snapToIndex(index);
        isUserScrolling.current = false;
      }, 150);
    }
  }, [snapToIndex]);

  const handleScrollBegin = useCallback(() => {
    isUserScrolling.current = true;
  }, []);

  return (
    <View style={[styles.wheelContainer, { width, height: PICKER_HEIGHT }]}>
      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onScrollBeginDrag={handleScrollBegin}
        onMomentumScrollEnd={handleScrollEnd}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{
          paddingVertical: ITEM_HEIGHT * 2,
        }}
      >
        {data.map((item, index) => {
          const isSelected = index === internalIndex;
          const distance = Math.abs(index - internalIndex);
          const opacity = distance === 0 ? 1 : distance === 1 ? 0.6 : 0.3;
          
          return (
            <TouchableOpacity
              key={`${item}-${index}`}
              onPress={() => snapToIndex(index)}
              style={[styles.wheelItem, { height: ITEM_HEIGHT }]}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.wheelItemText,
                  {
                    color: colors.foreground,
                    fontWeight: isSelected ? "600" : "400",
                    fontSize: isSelected ? 20 : 16,
                    opacity: opacity,
                  },
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      {/* Selection indicator */}
      <View
        style={[
          styles.selectionIndicator,
          {
            top: ITEM_HEIGHT * 2,
            height: ITEM_HEIGHT,
            borderColor: colors.border,
          },
        ]}
        pointerEvents="none"
      />
    </View>
  );
}

interface CustomDatePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
  label?: string;
}

export function CustomDatePicker({
  value,
  onChange,
  minimumDate,
  maximumDate,
  label,
}: CustomDatePickerProps) {
  const colors = useColors();
  const [showPicker, setShowPicker] = useState(false);
  
  // Temp values for picker
  const [tempMonth, setTempMonth] = useState(value.getMonth());
  const [tempDay, setTempDay] = useState(value.getDate());
  const [tempYear, setTempYear] = useState(value.getFullYear());

  // Default year range: 1900 to current year + 10 (for future dates like vaccinations)
  const currentYear = new Date().getFullYear();
  const minYear = minimumDate?.getFullYear() || 1900;
  const maxYear = maximumDate?.getFullYear() || currentYear + 10;
  const years = generateYears(minYear, maxYear);
  
  const daysInMonth = getDaysInMonth(tempMonth, tempYear);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const formatDisplayValue = () => {
    return value.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handlePress = () => {
    setTempMonth(value.getMonth());
    setTempDay(value.getDate());
    setTempYear(value.getFullYear());
    setShowPicker(true);
  };

  const handleConfirm = () => {
    // Validate day against days in selected month
    const maxDay = getDaysInMonth(tempMonth, tempYear);
    const validDay = Math.min(tempDay, maxDay);
    
    const newDate = new Date(tempYear, tempMonth, validDay);
    onChange(newDate);
    
    setShowPicker(false);
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleCancel = () => {
    setShowPicker(false);
  };

  // Adjust day if it exceeds days in month
  useEffect(() => {
    const maxDay = getDaysInMonth(tempMonth, tempYear);
    if (tempDay > maxDay) {
      setTempDay(maxDay);
    }
  }, [tempMonth, tempYear, tempDay]);

  const screenWidth = Dimensions.get("window").width;
  const monthWidth = screenWidth * 0.4;
  const dayWidth = screenWidth * 0.2;
  const yearWidth = screenWidth * 0.3;

  return (
    <View>
      <TouchableOpacity
        onPress={handlePress}
        style={[
          styles.input,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Text style={{ color: colors.foreground }}>{formatDisplayValue()}</Text>
      </TouchableOpacity>

      <Modal
        visible={showPicker}
        transparent
        animationType="slide"
        onRequestClose={handleCancel}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackground}
            activeOpacity={1}
            onPress={handleCancel}
          />
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.background },
            ]}
          >
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={handleCancel} style={styles.modalButton}>
                <Text style={[styles.cancelText, { color: colors.muted }]}>Cancel</Text>
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                {label || "Select Date"}
              </Text>
              <TouchableOpacity onPress={handleConfirm} style={styles.modalButton}>
                <Text style={[styles.confirmText, { color: colors.primary }]}>Done</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.pickerRow}>
              <WheelPicker
                data={MONTHS}
                selectedIndex={tempMonth}
                onSelect={setTempMonth}
                width={monthWidth}
              />
              <WheelPicker
                data={days}
                selectedIndex={tempDay - 1}
                onSelect={(index) => setTempDay(index + 1)}
                width={dayWidth}
              />
              <WheelPicker
                data={years}
                selectedIndex={years.indexOf(tempYear)}
                onSelect={(index) => setTempYear(years[index])}
                width={yearWidth}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Time picker component
interface CustomTimePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  label?: string;
}

export function CustomTimePicker({
  value,
  onChange,
  label,
}: CustomTimePickerProps) {
  const colors = useColors();
  const [showPicker, setShowPicker] = useState(false);
  
  const [tempHour, setTempHour] = useState(value.getHours() % 12 || 12);
  const [tempMinute, setTempMinute] = useState(value.getMinutes());
  const [tempAmPm, setTempAmPm] = useState(value.getHours() >= 12 ? 1 : 0);

  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, "0"));
  const ampm = ["AM", "PM"];

  const formatDisplayValue = () => {
    return value.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const handlePress = () => {
    const hour = value.getHours();
    setTempHour(hour % 12 || 12);
    setTempMinute(value.getMinutes());
    setTempAmPm(hour >= 12 ? 1 : 0);
    setShowPicker(true);
  };

  const handleConfirm = () => {
    let hour24 = tempHour;
    if (tempAmPm === 1) { // PM
      hour24 = tempHour === 12 ? 12 : tempHour + 12;
    } else { // AM
      hour24 = tempHour === 12 ? 0 : tempHour;
    }
    
    const newDate = new Date(value);
    newDate.setHours(hour24, tempMinute);
    onChange(newDate);
    setShowPicker(false);
    
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleCancel = () => {
    setShowPicker(false);
  };

  const screenWidth = Dimensions.get("window").width;
  const hourWidth = screenWidth * 0.25;
  const minuteWidth = screenWidth * 0.25;
  const ampmWidth = screenWidth * 0.25;

  return (
    <View>
      <TouchableOpacity
        onPress={handlePress}
        style={[
          styles.input,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Text style={{ color: colors.foreground }}>{formatDisplayValue()}</Text>
      </TouchableOpacity>

      <Modal
        visible={showPicker}
        transparent
        animationType="slide"
        onRequestClose={handleCancel}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackground}
            activeOpacity={1}
            onPress={handleCancel}
          />
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.background },
            ]}
          >
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={handleCancel} style={styles.modalButton}>
                <Text style={[styles.cancelText, { color: colors.muted }]}>Cancel</Text>
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                {label || "Select Time"}
              </Text>
              <TouchableOpacity onPress={handleConfirm} style={styles.modalButton}>
                <Text style={[styles.confirmText, { color: colors.primary }]}>Done</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.pickerRow}>
              <WheelPicker
                data={hours}
                selectedIndex={tempHour - 1}
                onSelect={(index) => setTempHour(index + 1)}
                width={hourWidth}
              />
              <WheelPicker
                data={minutes}
                selectedIndex={tempMinute}
                onSelect={setTempMinute}
                width={minuteWidth}
              />
              <WheelPicker
                data={ampm}
                selectedIndex={tempAmPm}
                onSelect={setTempAmPm}
                width={ampmWidth}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalButton: {
    padding: 8,
    minWidth: 70,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  cancelText: {
    fontSize: 17,
  },
  confirmText: {
    fontSize: 17,
    fontWeight: "600",
    textAlign: "right",
  },
  pickerRow: {
    flexDirection: "row",
    justifyContent: "center",
    paddingVertical: 10,
  },
  wheelContainer: {
    overflow: "hidden",
  },
  wheelItem: {
    justifyContent: "center",
    alignItems: "center",
  },
  wheelItemText: {
    textAlign: "center",
  },
  selectionIndicator: {
    position: "absolute",
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
});
