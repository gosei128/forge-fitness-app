import React, { useEffect, useState } from "react";
import { View, Text, Pressable, LayoutChangeEvent, Keyboard } from "react-native";
import { BottomTabBarProps } from "expo-router/build/react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";

export function CustomTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const [containerWidth, setContainerWidth] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSubscription = Keyboard.addListener("keyboardDidShow", () => {
      setIsKeyboardVisible(true);
    });
    const hideSubscription = Keyboard.addListener("keyboardDidHide", () => {
      setIsKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const tabWidth = containerWidth / state.routes.length;
  const translateX = useSharedValue(0);

  useEffect(() => {
    if (tabWidth > 0) {
      translateX.value = withSpring(state.index * tabWidth, {
        damping: 100,
        stiffness: 1000,
      });
    }
  }, [state.index, tabWidth]);

  const animatedIndicatorStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
      width: tabWidth,
    };
  });

  const onLayout = (e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  };

  if (isKeyboardVisible) {
    return null;
  }

  return (
    <View
      className="absolute bottom-6 left-5 right-5 bg-primary/95 border border-white/10 rounded-full flex-row py-2.5 justify-around items-center"
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
        // Account for safe areas (especially on newer iOS devices)
        marginBottom: Math.max(insets.bottom - 10, 0),
      }}
      onLayout={onLayout}
    >
      {/* Active tab background slider pill */}
      {containerWidth > 0 && (
        <Animated.View
          style={[
            animatedIndicatorStyle,
            {
              position: "absolute",
              left: 0,
              height: "120%",
              top: 3,
              bottom: 0,
              justifyContent: "center",
              alignItems: "center",
            },
          ]}
        >
          <View className="bg-secondary/15 rounded-full h-[100%] w-[90%]" />
        </Animated.View>
      )}

      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
              ? options.title
              : route.name;

        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: "tabLongPress",
            target: route.key,
          });
        };

        // Determine icon name based on route name
        let iconName: any;
        let IconComponent: any = Feather;

        if (route.name === "index") {
          iconName = "grid";
          IconComponent = Feather;
        } else if (route.name === "workouts") {
          iconName = isFocused ? "barbell" : "barbell-outline";
          IconComponent = Ionicons;
        } else if (route.name === "exercises") {
          iconName = isFocused ? "arm-flex" : "arm-flex-outline";
          IconComponent = MaterialCommunityIcons;
        } else {
          iconName = "help-circle";
          IconComponent = Feather;
        }

        // Clean label name
        const displayLabel =
          route.name === "index"
            ? "Dashboard"
            : route.name === "workouts"
              ? "Workouts"
              : route.name === "exercises"
                ? "Exercises"
                : String(label);

        return (
          <TabButton
            key={route.key}
            isFocused={isFocused}
            label={displayLabel}
            onPress={onPress}
            onLongPress={onLongPress}
            iconName={iconName}
            IconComponent={IconComponent}
          />
        );
      })}
    </View>
  );
}

// Sub-component for individual tab button with animation
interface TabButtonProps {
  isFocused: boolean;
  label: string;
  onPress: () => void;
  onLongPress: () => void;
  iconName: any;
  IconComponent: any;
}

function TabButton({
  isFocused,
  label,
  onPress,
  onLongPress,
  iconName,
  IconComponent,
}: TabButtonProps) {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withSpring(isFocused ? 1.12 : 1, {
      damping: 100,
      stiffness: 1000,
    });
  }, [isFocused]);

  const animatedIconStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      className="flex-1 items-center justify-center py-2"
    >
      <Animated.View style={[animatedIconStyle, { alignItems: "center" }]}>
        <IconComponent
          name={iconName}
          size={20}
          color={isFocused ? "#f3ff47" : "#9ca3af"} // secondary color when active, gray-400 when inactive
        />
        {isFocused && (
          <Animated.Text
            className={`text-[10px] mt-1 font-medium tracking-wide ${
              isFocused ? "text-secondary font-semibold" : "text-gray-400"
            }`}
            entering={FadeIn.duration(100)}
            exiting={FadeOut.duration(100)}
          >
            {label}
          </Animated.Text>
        )}
      </Animated.View>
    </Pressable>
  );
}
