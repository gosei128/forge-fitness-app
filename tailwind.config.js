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
                secondary: "#fba613",
            },
        },
    },
    plugins: [],
}
