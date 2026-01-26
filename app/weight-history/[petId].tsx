import { useState, useMemo } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  Alert,
  Platform,
  Dimensions,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import Svg, { Path, Circle, Line, Text as SvgText } from "react-native-svg";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { usePetStore } from "@/lib/pet-store";
import { formatDate, WeightEntry } from "@/shared/pet-types";
import { CustomDatePicker } from "@/components/custom-date-picker";

const CHART_HEIGHT = 200;
const CHART_PADDING = 40;

export default function WeightHistoryScreen() {
  const router = useRouter();
  const { petId } = useLocalSearchParams<{ petId: string }>();
  const colors = useColors();
  const { getPet, getWeightHistoryForPet, addWeightEntry, deleteWeightEntry } = usePetStore();

  const pet = getPet(petId || "");
  const weightHistory = getWeightHistoryForPet(petId || "");

  const [showAddForm, setShowAddForm] = useState(false);
  const [weight, setWeight] = useState("");
  const [unit, setUnit] = useState<"lb" | "kg">(pet?.weightUnit as "lb" | "kg" || "lb");
  const [date, setDate] = useState(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const screenWidth = Dimensions.get("window").width - 40;

  // Sort entries by date for chart
  const sortedEntries = useMemo(() => {
    return [...weightHistory].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [weightHistory]);

  // Calculate chart data
  const chartData = useMemo(() => {
    if (sortedEntries.length < 2) return null;

    const weights = sortedEntries.map((e) => e.weight);
    const minWeight = Math.min(...weights) * 0.95;
    const maxWeight = Math.max(...weights) * 1.05;
    const range = maxWeight - minWeight || 1;

    const chartWidth = screenWidth - CHART_PADDING * 2;
    const chartHeight = CHART_HEIGHT - CHART_PADDING * 2;

    const points = sortedEntries.map((entry, index) => {
      const x = CHART_PADDING + (index / (sortedEntries.length - 1)) * chartWidth;
      const y = CHART_PADDING + chartHeight - ((entry.weight - minWeight) / range) * chartHeight;
      return { x, y, entry };
    });

    // Create smooth path
    let pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      pathD += ` L ${points[i].x} ${points[i].y}`;
    }

    return {
      points,
      pathD,
      minWeight,
      maxWeight,
      chartWidth,
      chartHeight,
    };
  }, [sortedEntries, screenWidth]);

  if (!pet) {
    return (
      <ScreenContainer className="flex-1 items-center justify-center">
        <Text style={{ color: colors.muted }}>Pet not found</Text>
      </ScreenContainer>
    );
  }

  const handleBack = () => {
    router.back();
  };

  const handleAddEntry = async () => {
    const weightValue = parseFloat(weight);
    if (!weightValue || weightValue <= 0) {
      Alert.alert("Invalid Weight", "Please enter a valid weight.");
      return;
    }

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setIsSubmitting(true);
    try {
      await addWeightEntry({
        petId: petId || "",
        weight: weightValue,
        weightUnit: unit,
        date: date.toISOString(),
      });

      setWeight("");
      setDate(new Date());
      setShowAddForm(false);

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to add weight entry.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEntry = (entryId: string) => {
    Alert.alert("Delete Entry", "Are you sure you want to delete this weight entry?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteWeightEntry(entryId) },
    ]);
  };

  const renderChart = () => {
    if (!chartData) {
      return (
        <View style={[styles.chartPlaceholder, { backgroundColor: colors.surface }]}>
          <IconSymbol name="chart.line.uptrend.xyaxis" size={48} color={colors.muted} />
          <Text style={[styles.chartPlaceholderText, { color: colors.muted }]}>
            Add at least 2 weight entries to see the chart
          </Text>
        </View>
      );
    }

    return (
      <View style={[styles.chartContainer, { backgroundColor: colors.surface }]}>
        <Svg width={screenWidth} height={CHART_HEIGHT}>
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
            <Line
              key={i}
              x1={CHART_PADDING}
              y1={CHART_PADDING + chartData.chartHeight * ratio}
              x2={screenWidth - CHART_PADDING}
              y2={CHART_PADDING + chartData.chartHeight * ratio}
              stroke={colors.border}
              strokeWidth={1}
              strokeDasharray="4,4"
            />
          ))}

          {/* Y-axis labels */}
          {[0, 0.5, 1].map((ratio, i) => {
            const value = chartData.maxWeight - (chartData.maxWeight - chartData.minWeight) * ratio;
            return (
              <SvgText
                key={i}
                x={CHART_PADDING - 8}
                y={CHART_PADDING + chartData.chartHeight * ratio + 4}
                fontSize={10}
                fill={colors.muted}
                textAnchor="end"
              >
                {value.toFixed(0)}
              </SvgText>
            );
          })}

          {/* Line path */}
          <Path
            d={chartData.pathD}
            stroke={colors.primary}
            strokeWidth={2}
            fill="none"
          />

          {/* Data points */}
          {chartData.points.map((point, i) => (
            <Circle
              key={i}
              cx={point.x}
              cy={point.y}
              r={5}
              fill={colors.primary}
            />
          ))}
        </Svg>

        {/* X-axis labels */}
        <View style={styles.xAxisLabels}>
          {sortedEntries.length > 0 && (
            <>
              <Text style={[styles.xLabel, { color: colors.muted }]}>
                {formatDate(sortedEntries[0].date).split(",")[0]}
              </Text>
              <Text style={[styles.xLabel, { color: colors.muted }]}>
                {formatDate(sortedEntries[sortedEntries.length - 1].date).split(",")[0]}
              </Text>
            </>
          )}
        </View>
      </View>
    );
  };

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.headerButton}>
          <IconSymbol name="chevron.left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Weight History</Text>
          <Text style={[styles.headerSubtitle, { color: colors.muted }]}>{pet.name}</Text>
        </View>
        <TouchableOpacity
          onPress={() => setShowAddForm(!showAddForm)}
          style={styles.headerButton}
        >
          <IconSymbol
            name={showAddForm ? "xmark" : "plus"}
            size={24}
            color={colors.primary}
          />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Current Weight */}
        <View style={[styles.currentWeight, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.currentWeightLabel, { color: colors.muted }]}>Current Weight</Text>
          <Text style={[styles.currentWeightValue, { color: colors.foreground }]}>
            {pet.weight ? `${pet.weight} ${pet.weightUnit || "lb"}` : "Not recorded"}
          </Text>
          {sortedEntries.length >= 2 && (
            <View style={styles.weightChange}>
              {(() => {
                const latest = sortedEntries[sortedEntries.length - 1].weight;
                const previous = sortedEntries[sortedEntries.length - 2].weight;
                const change = latest - previous;
                const isGain = change > 0;
                return (
                  <>
                    <IconSymbol
                      name={isGain ? "arrow.up" : "arrow.down"}
                      size={14}
                      color={isGain ? colors.warning : colors.success}
                    />
                    <Text
                      style={[
                        styles.weightChangeText,
                        { color: isGain ? colors.warning : colors.success },
                      ]}
                    >
                      {Math.abs(change).toFixed(1)} {unit} since last entry
                    </Text>
                  </>
                );
              })()}
            </View>
          )}
        </View>

        {/* Add Entry Form */}
        {showAddForm && (
          <View style={[styles.addForm, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.formTitle, { color: colors.foreground }]}>Add Weight Entry</Text>

            <View style={styles.weightInputRow}>
              <TextInput
                style={[styles.weightInput, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
                value={weight}
                onChangeText={setWeight}
                placeholder="0"
                placeholderTextColor={colors.muted}
                keyboardType="decimal-pad"
              />
              <View style={styles.unitToggle}>
                {(["lb", "kg"] as const).map((u) => (
                  <TouchableOpacity
                    key={u}
                    onPress={() => setUnit(u)}
                    style={[
                      styles.unitButton,
                      {
                        backgroundColor: unit === u ? colors.primary : colors.background,
                        borderColor: unit === u ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.unitButtonText,
                        { color: unit === u ? "#FFFFFF" : colors.foreground },
                      ]}
                    >
                      {u}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <CustomDatePicker
              label="Date"
              value={date}
              onChange={setDate}
            />

            <TouchableOpacity
              onPress={handleAddEntry}
              disabled={isSubmitting}
              style={[styles.addButton, { backgroundColor: colors.primary, opacity: isSubmitting ? 0.6 : 1 }]}
            >
              <Text style={styles.addButtonText}>
                {isSubmitting ? "Adding..." : "Add Entry"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Chart */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Weight Trend</Text>
          {renderChart()}
        </View>

        {/* History List */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>History</Text>
          {sortedEntries.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
              <Text style={[styles.emptyText, { color: colors.muted }]}>
                No weight entries yet. Tap + to add one.
              </Text>
            </View>
          ) : (
            [...sortedEntries].reverse().map((entry) => (
              <View
                key={entry.id}
                style={[styles.historyItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <View style={styles.historyContent}>
                  <Text style={[styles.historyWeight, { color: colors.foreground }]}>
                    {entry.weight} {entry.weightUnit}
                  </Text>
                  <Text style={[styles.historyDate, { color: colors.muted }]}>
                    {formatDate(entry.date)}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => handleDeleteEntry(entry.id)}>
                  <IconSymbol name="trash.fill" size={18} color={colors.error} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  currentWeight: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    marginBottom: 16,
  },
  currentWeightLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  currentWeightValue: {
    fontSize: 32,
    fontWeight: "bold",
  },
  weightChange: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 4,
  },
  weightChangeText: {
    fontSize: 14,
    fontWeight: "500",
  },
  addForm: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 16,
  },
  weightInputRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  weightInput: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 18,
    fontWeight: "600",
  },
  unitToggle: {
    flexDirection: "row",
    gap: 8,
  },
  unitButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  unitButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  addButton: {
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  chartContainer: {
    borderRadius: 16,
    padding: 8,
    overflow: "hidden",
  },
  chartPlaceholder: {
    height: CHART_HEIGHT,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  chartPlaceholderText: {
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 32,
  },
  xAxisLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: CHART_PADDING,
    marginTop: 4,
  },
  xLabel: {
    fontSize: 10,
  },
  emptyState: {
    padding: 24,
    borderRadius: 16,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
  },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  historyContent: {
    flex: 1,
  },
  historyWeight: {
    fontSize: 18,
    fontWeight: "600",
  },
  historyDate: {
    fontSize: 13,
    marginTop: 2,
  },
});
