import React, { memo, useCallback } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Check, X } from "lucide-react-native";
import Animated, { FadeIn, FadeOut, FadeInUp } from "react-native-reanimated";

const UNITS = [
  {
    label: "Pounds(lbs)",
    value: "lbs",
    title: "Pounds",
    desc: "Default for barbell and machine loads.",
  },
  {
    label: "Kilograms(kg)",
    value: "kg",
    title: "Kilograms",
    desc: "Metric plates, dumbbells, and machines.",
  },
  {
    label: "Bodyweight",
    value: "bodyweight",
    title: "Bodyweight",
    desc: "Use when external load is not tracked.",
  },
] as const;

type UnitValue = (typeof UNITS)[number]["value"];

interface UnitDropdownMenuProps {
  visible: boolean;
  currentUnit: string;
  onSelect: (unit: string) => void;
  onClose: () => void;
}

export default function UnitDropdownMenu({
  visible,
  currentUnit,
  onSelect,
  onClose,
}: UnitDropdownMenuProps) {
  const handleSelect = useCallback(
    (unit: UnitValue) => {
      onSelect(unit);
      onClose();
    },
    [onClose, onSelect],
  );

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <Animated.View
          entering={FadeIn.duration(140)}
          exiting={FadeOut.duration(120)}
          style={styles.backdrop}
        />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close weight unit menu"
          onPress={onClose}
          style={styles.backdropPressable}
        />

        <Animated.View
          entering={FadeInUp.duration(280).springify().damping(1000)}
          exiting={FadeOut.duration(200)}
          style={styles.sheet}
        >
          <View style={styles.handle} />

          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>Weight Unit</Text>
              <Text style={styles.title}>Track this exercise as</Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close weight unit menu"
              hitSlop={10}
              onPress={onClose}
              style={({ pressed }) => [
                styles.closeButton,
                pressed && styles.closeButtonPressed,
              ]}
            >
              <X color="#d8d8dc" size={18} />
            </Pressable>
          </View>

          <View style={styles.options}>
            {UNITS.map((unit) => {
              const isSelected = currentUnit === unit.value;
              return (
                <UnitOption
                  key={unit.value}
                  label={unit.label}
                  title={unit.title}
                  desc={unit.desc}
                  selected={isSelected}
                  onPress={() => handleSelect(unit.value)}
                />
              );
            })}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

interface UnitOptionProps {
  label: string;
  title: string;
  desc: string;
  selected: boolean;
  onPress: () => void;
}

const UnitOption = memo(function UnitOption({
  label,
  title,
  desc,
  selected,
  onPress,
}: UnitOptionProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${title}, ${desc}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        selected && styles.optionSelected,
        pressed && styles.optionPressed,
      ]}
    >
      <View style={[styles.badge, selected && styles.badgeSelected]}>
        <Text style={[styles.badgeText, selected && styles.badgeTextSelected]}>
          {label}
        </Text>
      </View>

      <View style={styles.optionCopy}>
        <Text
          style={[styles.optionTitle, selected && styles.optionTitleSelected]}
        >
          {title}
        </Text>
        <Text style={styles.optionDesc}>{desc}</Text>
      </View>

      {/* <View style={[styles.checkSlot, selected && styles.checkSlotSelected]}>
        {selected ? <Check color="#050505" size={15} strokeWidth={3} /> : null}
      </View> */}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.68)",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  backdropPressable: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  sheet: {
    backgroundColor: "#151517",
    borderTopColor: "#2a2a2d",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    elevation: 24,
    paddingBottom: 28,
    paddingHorizontal: 18,
    paddingTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -12 },
    shadowOpacity: 0.35,
    shadowRadius: 22,
  },
  handle: {
    alignSelf: "center",
    backgroundColor: "#3a3a3f",
    borderRadius: 999,
    height: 5,
    marginBottom: 18,
    width: 44,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  eyebrow: {
    color: "#f3ff47",
    fontFamily: "SpaceGrotesk-Bold",
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  title: {
    color: "#ffffff",
    fontFamily: "SpaceGrotesk-Bold",
    fontSize: 22,
    marginTop: 2,
  },
  closeButton: {
    alignItems: "center",
    backgroundColor: "#242428",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  closeButtonPressed: {
    backgroundColor: "#303035",
  },
  options: {
    gap: 10,
  },
  option: {
    alignItems: "center",
    backgroundColor: "#1c1c20",
    borderColor: "#2b2b30",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: 72,
    paddingHorizontal: 12,
    paddingVertical: 12,
    width: "100%",
  },
  optionSelected: {
    backgroundColor: "rgba(243, 255, 71, 0.09)",
    borderColor: "rgba(243, 255, 71, 0.65)",
  },
  optionPressed: {
    backgroundColor: "#26262b",
  },
  badge: {
    alignItems: "center",
    backgroundColor: "#2a2a2f",
    borderRadius: 12,
    height: 38,
    justifyContent: "center",
    marginRight: 12,
    paddingHorizontal: 10,
    minWidth: 110,
  },
  badgeSelected: {
    backgroundColor: "#f3ff47",
  },
  badgeText: {
    color: "#bdbdc4",
    fontFamily: "SpaceGrotesk-Bold",
    fontSize: 12,
  },
  badgeTextSelected: {
    color: "#050505",
  },
  optionCopy: {
    flex: 1,
  },
  optionTitle: {
    color: "#f3f3f5",
    fontFamily: "SpaceGrotesk-Bold",
    fontSize: 15,
  },
  optionTitleSelected: {
    color: "#ffffff",
  },
  optionDesc: {
    color: "#92929a",
    fontFamily: "SpaceGrotesk-Regular",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  checkSlot: {
    alignItems: "center",
    borderColor: "#3a3a40",
    borderRadius: 12,
    borderWidth: 1,
    height: 24,
    justifyContent: "center",
    width: 24,
  },
  checkSlotSelected: {
    backgroundColor: "#f3ff47",
    borderColor: "#f3ff47",
  },
});
