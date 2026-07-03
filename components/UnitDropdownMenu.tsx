import React from "react";
import { View, Text, Pressable, Modal, TouchableOpacity } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

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
      {/* Full-screen backdrop — tap to dismiss */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.55)",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {/* Card — stops tap propagation so it doesn't dismiss itself */}
        <TouchableOpacity activeOpacity={1}>
          <Animated.View
            entering={FadeIn.duration(150)}
            exiting={FadeOut.duration(100)}
            style={{
              backgroundColor: "#1c1c1f",
              borderRadius: 20,
              borderWidth: 1,
              borderColor: "#2a2a2d",
              paddingVertical: 6,
              paddingHorizontal: 0,
              width: 230,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.6,
              shadowRadius: 20,
              elevation: 20,
            }}
          >
            {/* Header */}
            <View
              style={{
                paddingHorizontal: 16,
                paddingTop: 10,
                paddingBottom: 10,
                borderBottomWidth: 1,
                borderBottomColor: "#2a2a2d",
              }}
            >
              <Text
                style={{
                  color: "#666",
                  fontSize: 10,
                  fontFamily: "SpaceGrotesk-Bold",
                  letterSpacing: 1.5,
                  textTransform: "uppercase",
                }}
              >
                Weight Unit
              </Text>
            </View>

            {/* Options */}
            <View style={{ paddingVertical: 4 }}>
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
                      paddingVertical: 11,
                      marginHorizontal: 6,
                      marginVertical: 2,
                      borderRadius: 14,
                      backgroundColor: pressed
                        ? "#252528"
                        : isSelected
                          ? "rgba(243,255,71,0.08)"
                          : "transparent",
                    })}
                  >
                    {/* Badge */}
                    <View
                      style={{
                        width: 38,
                        height: 26,
                        borderRadius: 8,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: isSelected ? "#f3ff47" : "#252528",
                        marginRight: 12,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          fontFamily: "SpaceGrotesk-Bold",
                          color: isSelected ? "#000" : "#777",
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
                        color: isSelected ? "#fff" : "#999",
                      }}
                    >
                      {unit.desc}
                    </Text>

                    {/* Checkmark dot */}
                    {isSelected && (
                      <View
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: 9,
                          backgroundColor: "#f3ff47",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 10,
                            color: "#000",
                            fontFamily: "SpaceGrotesk-Bold",
                          }}
                        >
                          ✓
                        </Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>

            {/* Cancel */}
            <View
              style={{
                borderTopWidth: 1,
                borderTopColor: "#2a2a2d",
                paddingTop: 4,
                paddingBottom: 4,
              }}
            >
              <Pressable
                onPress={onClose}
                style={({ pressed }) => ({
                  paddingHorizontal: 12,
                  paddingVertical: 11,
                  marginHorizontal: 6,
                  borderRadius: 14,
                  alignItems: "center",
                  backgroundColor: pressed ? "#252528" : "transparent",
                })}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontFamily: "SpaceGrotesk-Medium",
                    color: "#555",
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
