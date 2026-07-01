import {StyleSheet, Text, View} from 'react-native'
import React from 'react'
interface SpacerProps{
    height?: number
    width?: number
}
const Spacer = ({height, width}:SpacerProps) => {
    return (
        <View style={{height, width}} className={`h-${height} w-${width}`}/>
    )
}
export default Spacer
const styles = StyleSheet.create({})
