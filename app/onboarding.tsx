import React from "react";
import { router } from "expo-router";
import Onboarding from "../components/Onboarding";

export default function OnboardingScreen() {
  return (
    <Onboarding
      onComplete={(navigateTo?: string) => {
        if (navigateTo) {
          router.replace(navigateTo as any);
        } else {
          router.replace("/(tabs)");
        }
      }}
    />
  );
}
