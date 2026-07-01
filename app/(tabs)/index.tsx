import { StatusBar } from 'expo-status-bar';
import { Button, Pressable } from 'react-native';
import {router} from "expo-router";
import {Text, View } from 'react-native';
import Animated, { FadeInUp, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import {db} from "../../db"
import {exercises} from "../../db/schema"

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function Index() {
    const insertScale = useSharedValue(1);
    const fetchScale = useSharedValue(1);

    const handleInsert = async () => {
        const res = await db.insert(exercises).values({
            name : "Bench Press",
            muscleGroup : "Chest",
            equipment : "Barbell",
            category : "Compound"
        }).returning();
        console.log("Inserted:", res)
    }

    const handleFetch = async () => {
        const res = await db.select().from(exercises)
        console.log("All exercises:", res)
    }

    const insertAnimatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ scale: insertScale.value }]
        };
    });

    const fetchAnimatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ scale: fetchScale.value }]
        };
    });

    const handleInsertPressIn = () => {
        insertScale.value = withSpring(0.9);
    };

    const handleInsertPressOut = () => {
        insertScale.value = withSpring(1);
    };

    const handleFetchPressIn = () => {
        fetchScale.value = withSpring(0.9);
    };

    const handleFetchPressOut = () => {
        fetchScale.value = withSpring(1);
    };

    return (
        <View className="flex-1 bg-primary justify-center items-center gap-4" >
            <Text className="text-white">Open up App.tsx to start working on your app!</Text>

            <AnimatedPressable
                className="bg-white p-4 rounded-lg"
                style={insertAnimatedStyle}
                onPressIn={handleInsertPressIn}
                onPressOut={handleInsertPressOut}
                onPress={handleInsert}
            >
                <Text className="">Insert</Text>
            </AnimatedPressable>

            <AnimatedPressable
                className="bg-white p-4 rounded-lg"
                style={fetchAnimatedStyle}
                onPressIn={handleFetchPressIn}
                onPressOut={handleFetchPressOut}
                onPress={handleFetch}
            >
                <Text className="">All Exercises</Text>
            </AnimatedPressable>

            <StatusBar style="auto" />
        </View>
    );
}
