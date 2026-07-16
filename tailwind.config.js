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
                secondary: "#CAFE20",
                tertiary: "#323031",
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
