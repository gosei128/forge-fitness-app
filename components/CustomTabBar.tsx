import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Keyboard,
  LayoutChangeEvent,
  StyleSheet,
} from "react-native";
import { BottomTabBarProps } from "expo-router/build/react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  FadeInLeft,
  FadeOutRight,
} from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";

export function CustomTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [tabLayouts, setTabLayouts] = useState<{
    [key: string]: { x: number; width: number };
  }>({});

  // Shared values for the sliding pill indicator
  const indicatorX = useSharedValue(0);
  const indicatorWidth = useSharedValue(0);
  const indicatorOpacity = useSharedValue(0);

  useEffect(() => {
    const showSubscription = Keyboard.addListener("keyboardDidShow", () =>
      setIsKeyboardVisible(true),
    );
    const hideSubscription = Keyboard.addListener("keyboardDidHide", () =>
      setIsKeyboardVisible(false),
    );
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const standardRoutes = state.routes.filter((r) => r.name !== "workouts");
  const trainRoute = state.routes.find((r) => r.name === "workouts");

  const activeRouteName = state.routes[state.index].name;
  const isStandardTabActive = standardRoutes.some(
    (r) => r.name === activeRouteName,
  );

  useEffect(() => {
    const activeRoute = state.routes[state.index];
    const layout = tabLayouts[activeRoute.key];

    if (isStandardTabActive && layout) {
      // Spring configuration matched cleanly for smooth responsive sliding
      indicatorX.value = withSpring(layout.x, {
        damping: 1800,
        stiffness: 1400,
      });
      indicatorWidth.value = withSpring(layout.width, {
        damping: 1800,
        stiffness: 1400,
      });
      indicatorOpacity.value = withSpring(1);
    } else {
      indicatorOpacity.value = withSpring(0);
    }
  }, [state.index, tabLayouts, isStandardTabActive]);

  const animatedIndicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: indicatorWidth.value,
    opacity: indicatorOpacity.value,
  }));

  if (isKeyboardVisible) return null;

  return (
    <View
      className="absolute bottom-6 left-3 right-3 rounded-full flex-row p-2 items-center justify-between"
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
        marginBottom: Math.max(insets.bottom - 10, 0),
        backgroundColor: "rgba(19, 19, 22, 0.85)", // Dark background fallback
      }}
    >
      <BlurView
        intensity={30}
        tint="dark"
        blurMethod="none"
        style={{
          ...StyleSheet.absoluteFill,
          borderRadius: 9999,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: "rgba(255, 255, 255, 0.1)",
        }}
      />
      {/* LEFT SECTION: Standard Navigation Items */}
      <View className="flex-row items-center pl-1 relative flex-1">
        {/* Animated Sliding Background Bubble */}
        <Animated.View
          style={[
            animatedIndicatorStyle,
            {
              position: "absolute",
              height: "100%",
              backgroundColor: "rgba(255, 255, 255, 0.12)",
              borderRadius: 9999,
              zIndex: 0,
            },
          ]}
        />

        {standardRoutes.map((route) => {
          const { options } = descriptors[route.key];
          const globalIndex = state.routes.findIndex(
            (r) => r.key === route.key,
          );
          const isFocused = state.index === globalIndex;

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

          const handleLayout = (e: LayoutChangeEvent) => {
            const { x, width } = e.nativeEvent.layout;
            setTabLayouts((prev) => ({
              ...prev,
              [route.key]: { x, width },
            }));
          };

          let iconName: any = "help-circle";
          let IconComponent: any = Feather;
          let displayLabel = "Tab";

          if (route.name === "index") {
            iconName = isFocused ? "home" : "home-outline";
            IconComponent = Ionicons;
            displayLabel = "Home";
          } else if (route.name === "exercises") {
            iconName = "dumbbell";
            IconComponent = MaterialCommunityIcons;
            displayLabel = "Exercises";
          } else if (route.name === "missions") {
            iconName = "sword";
            IconComponent = MaterialCommunityIcons;
            displayLabel = "Missions";
          } else if (route.name === "profile") {
            iconName = "account";
            IconComponent = MaterialCommunityIcons;
            displayLabel = "Profile";
          }

          return (
            <TabButton
              key={route.key}
              isFocused={isFocused}
              displayLabel={displayLabel}
              onPress={onPress}
              onLayout={handleLayout}
              iconName={iconName}
              IconComponent={IconComponent}
            />
          );
        })}
      </View>

      {/* RIGHT SECTION: Asymmetric Hero Train Button */}
      {trainRoute && (
        <TrainButton
          trainRoute={trainRoute}
          isFocused={
            state.index ===
            state.routes.findIndex((r) => r.key === trainRoute.key)
          }
          navigation={navigation}
        />
      )}
    </View>
  );
}

// Internal sub-component to cleanly manage single button transition animations
interface TabButtonProps {
  isFocused: boolean;
  displayLabel: string;
  onPress: () => void;
  onLayout: (e: LayoutChangeEvent) => void;
  iconName: string;
  IconComponent: any;
}

function TabButton({
  isFocused,
  displayLabel,
  onPress,
  onLayout,
  iconName,
  IconComponent,
}: TabButtonProps) {
  const iconScale = useSharedValue(1);

  useEffect(() => {
    iconScale.value = withSpring(isFocused ? 1.2 : 1, {
      damping: 1400,
      stiffness: 1400,
    });
  }, [isFocused]);

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  return (
    <Pressable
      onPress={onPress}
      onLayout={onLayout}
      className="items-center justify-center py-2 px-3.5 rounded-full z-10 flex-row"
      style={{ gap: 4 }}
    >
      <Animated.View
        style={animatedIconStyle}
        className="items-center justify-center"
      >
        <IconComponent
          name={iconName}
          size={15}
          color={isFocused ? "#ffffff" : "#a1a1aa"}
        />
      </Animated.View>

      {isFocused && (
        <Animated.Text
          entering={FadeInLeft.duration(200)}
          exiting={FadeOutRight.duration(150)}
          className="text-[10px] tracking-tight font-spaceBold text-white"
        >
          {displayLabel}
        </Animated.Text>
      )}
    </Pressable>
  );
}

interface TrainButtonProps {
  trainRoute: any;
  isFocused: boolean;
  navigation: any;
}

function TrainButton({ trainRoute, isFocused, navigation }: TrainButtonProps) {
  const onPress = () => {
    const event = navigation.emit({
      type: "tabPress",
      target: trainRoute.key,
      canPreventDefault: true,
    });
    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(trainRoute.name, trainRoute.params);
    }
  };

  const trainScale = useSharedValue(1);
  const trainWidth = useSharedValue(120);

  useEffect(() => {
    trainScale.value = withSpring(isFocused ? 1 : 1, {
      damping: 1500,
      stiffness: 1500,
    });
    trainWidth.value = withSpring(isFocused ? 160 : 120, {
      damping: 1500,
      stiffness: 1500,
    });
  }, [isFocused]);

  const animatedTrainStyle = useAnimatedStyle(() => ({
    transform: [{ scale: trainScale.value }],
    width: trainWidth.value,
  }));

  return (
    <Animated.View style={[animatedTrainStyle, { overflow: "hidden" }]}>
      <Pressable
        onPress={onPress}
        className="rounded-full py-3.5 flex-row items-center justify-center space-x-2 border bg-[#f3ff47] border-[#f3ff47] w-full"
        style={{ paddingHorizontal: 10 }}
      >
        <Text
          className="font-spaceBold text-sm tracking-wide text-black"
          numberOfLines={1}
        >
          Go Train
        </Text>
        <Feather name="arrow-right" size={16} color="#000000" />
      </Pressable>
    </Animated.View>
  );
}
