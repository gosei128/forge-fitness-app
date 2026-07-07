import React from "react";
import { Tabs } from "expo-router";
import { CustomTabBar } from "../../components/CustomTabBar";

const TabLayout = () => {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: "#131316" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Workouts",
        }}
      />

      <Tabs.Screen
        name="exercises"
        options={{
          title: "Exercises",
        }}
      />
      <Tabs.Screen
        name="missions"
        options={{
          title: "Missions",
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
        }}
      />
      <Tabs.Screen
        name="workouts"
        options={{
          title: "Workouts",
        }}
      />
    </Tabs>
  );
};

export default TabLayout;
