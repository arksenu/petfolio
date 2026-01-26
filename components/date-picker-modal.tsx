import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Platform,
  useColorScheme,
} from "react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useColors } from "@/hooks/use-colors";

interface DatePickerModalProps {
  value: Date;
  onChange: (date: Date) => void;
  mode?: "date" | "time" | "datetime";
  minimumDate?: Date;
  maximumDate?: Date;
  label?: string;
}

export function DatePickerModal({
  value,
  onChange,
  mode = "date",
  minimumDate,
  maximumDate,
  label,
}: DatePickerModalProps) {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState(value);

  const formatDisplayValue = () => {
    if (mode === "time") {
      return value.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } else if (mode === "datetime") {
      return value.toLocaleString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    }
    return value.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handlePress = () => {
    setTempDate(value);
    setShowPicker(true);
  };

  const handleChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowPicker(false);
      if (event.type === "set" && selectedDate) {
        onChange(selectedDate);
      }
    } else {
      // iOS - update temp date
      if (selectedDate) {
        setTempDate(selectedDate);
      }
    }
  };

  const handleConfirm = () => {
    onChange(tempDate);
    setShowPicker(false);
  };

  const handleCancel = () => {
    setShowPicker(false);
  };

  // Android uses native picker dialog
  if (Platform.OS === "android") {
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
        {showPicker && (
          <DateTimePicker
            value={value}
            mode={mode === "datetime" ? "date" : mode}
            display="default"
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            onChange={handleChange}
          />
        )}
      </View>
    );
  }

  // iOS uses modal with spinner
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
              { backgroundColor: colorScheme === "dark" ? "#1c1c1e" : "#ffffff" },
            ]}
          >
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={handleCancel} style={styles.modalButton}>
                <Text style={[styles.cancelText, { color: colors.muted }]}>Cancel</Text>
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                {label || (mode === "time" ? "Select Time" : "Select Date")}
              </Text>
              <TouchableOpacity onPress={handleConfirm} style={styles.modalButton}>
                <Text style={[styles.confirmText, { color: colors.primary }]}>Done</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.pickerContainer}>
              <DateTimePicker
                value={tempDate}
                mode={mode === "datetime" ? "date" : mode}
                display="spinner"
                minimumDate={minimumDate}
                maximumDate={maximumDate}
                onChange={handleChange}
                themeVariant={colorScheme === "dark" ? "dark" : "light"}
                style={styles.picker}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Time-only picker component
interface TimePickerModalProps {
  value: Date;
  onChange: (date: Date) => void;
  label?: string;
}

export function TimePickerModal({ value, onChange, label }: TimePickerModalProps) {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState(value);

  const formatDisplayValue = () => {
    return value.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const handlePress = () => {
    setTempDate(value);
    setShowPicker(true);
  };

  const handleChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowPicker(false);
      if (event.type === "set" && selectedDate) {
        const newDate = new Date(value);
        newDate.setHours(selectedDate.getHours(), selectedDate.getMinutes());
        onChange(newDate);
      }
    } else {
      if (selectedDate) {
        setTempDate(selectedDate);
      }
    }
  };

  const handleConfirm = () => {
    const newDate = new Date(value);
    newDate.setHours(tempDate.getHours(), tempDate.getMinutes());
    onChange(newDate);
    setShowPicker(false);
  };

  const handleCancel = () => {
    setShowPicker(false);
  };

  if (Platform.OS === "android") {
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
        {showPicker && (
          <DateTimePicker
            value={value}
            mode="time"
            display="default"
            onChange={handleChange}
          />
        )}
      </View>
    );
  }

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
              { backgroundColor: colorScheme === "dark" ? "#1c1c1e" : "#ffffff" },
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
            <View style={styles.pickerContainer}>
              <DateTimePicker
                value={tempDate}
                mode="time"
                display="spinner"
                onChange={handleChange}
                themeVariant={colorScheme === "dark" ? "dark" : "light"}
                style={styles.picker}
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
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackground: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  modalButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  cancelText: {
    fontSize: 17,
  },
  confirmText: {
    fontSize: 17,
    fontWeight: "600",
  },
  pickerContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  picker: {
    width: "100%",
    height: 216,
  },
});
