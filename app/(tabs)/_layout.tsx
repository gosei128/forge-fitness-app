import {StyleSheet, Text, View} from 'react-native'
import React from 'react'
import {NativeTabs} from "expo-router/unstable-native-tabs"
const TabLayout = () => {
    return (
        <NativeTabs>
            <NativeTabs.Trigger name='index'>
                <NativeTabs.Trigger.Label>Dashboard</NativeTabs.Trigger.Label>
                <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
                <NativeTabs.Trigger.Badge>1</NativeTabs.Trigger.Badge>
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name='dashboard'>
                <NativeTabs.Trigger.Label>Dashboard</NativeTabs.Trigger.Label>
                <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
                <NativeTabs.Trigger.Badge>1</NativeTabs.Trigger.Badge>
            </NativeTabs.Trigger>
        </NativeTabs>
    )
}
export default TabLayout
const styles = StyleSheet.create({})
