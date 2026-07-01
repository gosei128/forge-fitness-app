import {StyleSheet, Text, View} from 'react-native'
import React from 'react'
import migration from "../drizzle/migrations"
import {db} from "../db"
import {useMigrations} from "drizzle-orm/expo-sqlite/migrator"
import { Stack } from "expo-router";
import '../global.css'

const RootLayout = () => {
const { success, error} = useMigrations(db, migration)
    if(error) return <Text>Something went wrong {error.message}</Text>
    if(!success)return <View style={styles.loadingContainer}><Text>Loading...</Text></View>
    console.log("hello world")
    return (
        <>
            <Stack>
                <Stack.Screen name={"(tabs)"} options={{headerShown: false}} />
            </Stack>
        </>
    )
}
export default RootLayout
const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    }
})
