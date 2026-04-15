/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
        "./App.tsx",
    ],
    theme: {
        extend: {
            colors: {
                "on-tertiary": "#ffffff",
                "on-primary-fixed": "#001c39",
                "tertiary-fixed": "#ffdbc8",
                "on-surface": "#171c1f",
                "on-tertiary-fixed": "#321300",
                "surface-container": "#eaeef2",
                "on-error": "#ffffff",
                "on-secondary": "#ffffff",
                "on-primary-container": "#cadeff",
                "surface-variant": "#dfe3e7",
                "secondary-fixed-dim": "#b7c9db",
                "tertiary-fixed-dim": "#ffb68b",
                "on-tertiary-fixed-variant": "#743400",
                "surface-dim": "#d6dade",
                "on-error-container": "#93000a",
                "inverse-on-surface": "#edf1f5",
                "background": "#f6fafe",
                "on-secondary-fixed": "#0b1d2a",
                "primary-container": "#0062b1",
                "surface-container-high": "#e4e9ed",
                "secondary": "#4f6070",
                "on-primary-fixed-variant": "#004884",
                "on-primary": "#ffffff",
                "surface-container-highest": "#dfe3e7",
                "error-container": "#ffdad6",
                "primary": "#004a88",
                "surface-container-low": "#f0f4f8",
                "on-secondary-container": "#546474",
                "surface-container-lowest": "#ffffff",
                "on-background": "#171c1f",
                "on-secondary-fixed-variant": "#384957",
                "on-surface-variant": "#414751",
                "surface": "#f6fafe",
                "surface-tint": "#005fad",
                "error": "#ba1a1a",
                "primary-fixed-dim": "#a4c9ff",
                "outline": "#717783",
                "tertiary-container": "#9d4900",
                "inverse-surface": "#2c3134",
                "tertiary": "#783600",
                "secondary-fixed": "#d3e5f7",
                "inverse-primary": "#a4c9ff"
            },
            borderRadius: {
                '20px': '20px',
                'lg': '0.5rem',
                'xl': '0.75rem',
                'full': '9999px'
            },
            fontFamily: {
                "headline": ["Space Grotesk"],
                "body": ["Manrope"],
                "label": ["Manrope"]
            }
        },
    },
    plugins: [],
}
