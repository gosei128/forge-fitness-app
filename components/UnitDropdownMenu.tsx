import React from "react";
import { View, Text, Pressable, Modal, TouchableOpacity } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  ZoomIn,
  ZoomOut,
} from "react-native-reanimated";

const UNITS = [
  { label: "LBS", value: "lbs", desc: "Pounds" },
  { label: "KG", value: "kg", desc: "Kilograms" },
  { label: "BW", value: "bodyweight", desc: "Bodyweight" },
];

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
  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: "rgba(0, 0, 0, 0.7)",
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 20,
        }}
      >
        <TouchableOpacity activeOpacity={1}>
          <Animated.View
            entering={ZoomIn.duration(180).springify()}
            exiting={FadeOut.duration(120).withCallback(() => undefined)}
            style={{
              backgroundColor: "#171719",
              borderRadius: 24,
              borderWidth: 1,
              borderColor: "#2a2a2d",
              paddingVertical: 16,
              paddingHorizontal: 14,
              width: 280,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 14 },
              shadowOpacity: 0.45,
              shadowRadius: 18,
              elevation: 24,
            }}
          >
            {/* Header */}
            <View style={{ marginBottom: 10, paddingHorizontal: 4 }}>
              <Text
                style={{
                  color: "#a1a1a5",
                  fontSize: 11,
                  fontFamily: "SpaceGrotesk-Bold",
                  letterSpacing: 1.3,
                  textTransform: "uppercase",
                }}
              >
                Weight Unit
              </Text>
            </View>

            <View style={{ gap: 8 }}>
              {UNITS.map((unit) => {
                const isSelected = currentUnit === unit.value;
                return (
                  <Pressable
                    key={unit.value}
                    onPress={() => {
                      onSelect(unit.value);
                      onClose();
                    }}
                    style={({ pressed }) => ({
                      flexDirection: "row",
                      alignItems: "center",
                      paddingHorizontal: 12,
                      paddingVertical: 12,
                      borderRadius: 14,
                      backgroundColor: pressed
                        ? "#232327"
                        : isSelected
                          ? "rgba(243, 255, 71, 0.1)"
                          : "transparent",
                    })}
                  >
                    {/* Badge */}
                    <View
                      style={{
                        width: 44,
                        height: 30,
                        borderRadius: 9,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: isSelected ? "#f3ff47" : "#252528",
                        marginRight: 12,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontFamily: "SpaceGrotesk-Bold",
                          color: isSelected ? "#000" : "#a1a1a5",
                        }}
                      >
                        {unit.label}
                      </Text>
                    </View>

                    {/* Description */}
                    <Text
                      style={{
                        flex: 1,
                        fontSize: 14,
                        fontFamily: isSelected
                          ? "SpaceGrotesk-Bold"
                          : "SpaceGrotesk-Regular",
                        color: isSelected ? "#ffffff" : "#bcbcbf",
                      }}
                    >
                      {unit.desc}
                    </Text>

                    {/* Checkmark Dot */}
                  </Pressable>
                );
              })}
            </View>

            {/* Cancel Button */}
            <View
              style={{
                marginTop: 10,
                borderTopWidth: 1,
                borderColor: "#2a2a2d",
                paddingTop: 8,
              }}
            >
              <Pressable
                onPress={onClose}
                style={({ pressed }) => ({
                  paddingVertical: 10,
                  borderRadius: 12,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: pressed ? "#252528" : "transparent",
                })}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontFamily: "SpaceGrotesk-Medium",
                    color: "#8f8f95",
                  }}
                >
                  Cancel
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
