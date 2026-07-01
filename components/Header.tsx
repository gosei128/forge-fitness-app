import {StyleSheet, Text, View} from 'react-native'
import React from 'react'
import {useSafeAreaInsets}   from "react-native-safe-area-context";
interface  HeaderProps {
    title : string
}
const Header = ({title} : HeaderProps) => {
    const insets = useSafeAreaInsets();
    return (
        <View className="bg-primary/95 border rounded-b-2xl border-white/10  flex-row py-2.5 justify-around items-center"
              style={{
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 10 },
                  shadowOpacity: 0.3,
                  shadowRadius: 20,
                  elevation: 10,
                  marginBottom: Math.max(insets.bottom - 10, 0),
              }}>
            <Text className="text-white font-spaceBold text-lg">{title}</Text>
        </View>
    )
}
export default Header
const styles = StyleSheet.create({})
