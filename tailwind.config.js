/** @type {import('tailwindcss').Config} **/

module.exports = {
    content: [
        "./App.tsx",
        "./app/**/*.{js,jsx,ts,tsx}",
        "./components/**/*.{js,jsx,ts,tsx}",
    ],
    presets: [require("nativewind/preset")],
    theme: {
        extend: {
            colors: {
                primary: "#131316",
                secondary: "#f3ff47",
                tertiary: "#2b2b2b",
            },
            fontFamily: {
                sans: ["SpaceGrotesk-Regular"],
                spaceLight: ["SpaceGrotesk-Light"],
                spaceRegular: ["SpaceGrotesk-Regular"],
                spaceMedium: ["SpaceGrotesk-Medium"],
                spaceSemiBold: ["SpaceGrotesk-SemiBold"],
                spaceBold: ["SpaceGrotesk-Bold"],
            },
        },
    },
    plugins: [],
}
