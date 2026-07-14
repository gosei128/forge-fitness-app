import { StyleSheet, Text, View, Pressable } from "react-native";
import React, { useState, useEffect } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronLeft, User, Flame } from "lucide-react-native";
import { useRouter, usePathname } from "expo-router";
import { BlurView } from "expo-blur";
import { db } from "../db";
import { userStats, user } from "../db/schema";
import { eq } from "drizzle-orm";

interface HeaderProps {
  title: string;
  showBack?: boolean;
  onBackPress?: () => void;
  showProfile?: boolean;
  onProfilePress?: () => void;
  rightElement?: React.ReactNode;
}

const Header = ({
  title,
  showBack,
  onBackPress,
  showProfile,
  onProfilePress,
  rightElement,
}: HeaderProps) => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();

  const [streak, setStreak] = useState<number | null>(null);
  const [level, setLevel] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchStats() {
      try {
        const users = await db.select().from(user).limit(1);
        if (users.length > 0) {
          const userId = users[0].id;
          const res = await db
            .select()
            .from(userStats)
            .where(eq(userStats.userId, userId))
            .limit(1);
          if (res.length > 0 && isMounted) {
            setStreak(res[0].currentStreak);
            setLevel(res[0].currentLevel);
          }
        }
      } catch (e) {
        console.error("Error fetching stats for header:", e);
      }
    }
    fetchStats();
    return () => {
      isMounted = false;
    };
  }, [pathname]);

  const isTabScreen = [
    "/",
    "/exercises",
    "/workouts",
    "/missions",
    "/profile",
  ].includes(pathname);
  const showBackButton =
    showBack !== undefined ? showBack : router.canGoBack() && !isTabScreen;
  const showProfileButton =
    showProfile !== undefined ? showProfile : pathname === "/";

  return (
    <View
      style={{
        paddingTop: insets.top,
        height: 60 + insets.top,
        position: "relative",
        zIndex: 50,
      }}
      className="border-b border-neutral-900/60 bg-primary/70"
    >
      <BlurView intensity={80} tint="dark" className="absolute inset-0" />

      <View className="flex-row items-center justify-between px-4 h-[60px] relative">
        {/* Left Slot */}
        <View className="w-12 items-start justify-center">
          {showBackButton ? (
            <Pressable
              onPress={onBackPress || (() => router.back())}
              className="w-10 h-10 rounded-xl bg-neutral-900/50 border border-neutral-800/40 items-center justify-center active:scale-95 transition-all"
            >
              <ChevronLeft color="#ffffff" size={20} />
            </Pressable>
          ) : showProfileButton ? (
            <Pressable
              onPress={onProfilePress || (() => router.push("/(tabs)/profile"))}
              className="w-10 h-10 rounded-xl bg-neutral-900/50 border border-neutral-800/40 items-center justify-center active:scale-95 transition-all overflow-hidden"
            >
              <User color="#f3ff47" size={20} />
            </Pressable>
          ) : null}
        </View>

        {/* Center Slot (Title) */}
        <View className="flex-1 items-center justify-center">
          {title === "FORGE" ? (
            <View className="flex-row items-center space-x-1.5">
              <Text className="text-white font-spaceBold text-xl tracking-[0.2em] uppercase">
                FORGE
              </Text>
            </View>
          ) : (
            <Text
              numberOfLines={1}
              className="text-white font-spaceBold text-lg tracking-[0.1em] uppercase text-center"
            >
              {title}
            </Text>
          )}
        </View>

        {/* Right Slot */}
        <View className="w-12 items-end justify-center">
          {rightElement ? (
            rightElement
          ) : streak !== null ? (
            <View
              className={`flex-row items-center border px-2.5 py-1.5 rounded-xl ${
                streak > 0
                  ? "bg-amber-500/10 border-amber-500/25"
                  : "bg-neutral-900/50 border-neutral-800/40"
              }`}
            >
              <Flame
                color={streak > 0 ? "#fba613" : "#6b7280"}
                fill={streak > 0 ? "#fba613" : "transparent"}
                size={14}
              />
              <Text
                className={`font-spaceBold text-xs ml-1 ${
                  streak > 0 ? "text-amber-400" : "text-neutral-500"
                }`}
              >
                {streak}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
};

export default Header;
const styles = StyleSheet.create({});
