/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'shortcode': {
                    'bg': '#1a1a2e',
                    'surface': '#16213e',
                    'accent': '#e94560',
                    'text': '#eaeaea',
                    'muted': '#8b8b8b',
                }
            },
            animation: {
                'fade-in': 'fadeIn 0.15s ease-out',
                'slide-up': 'slideUp 0.15s ease-out',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { opacity: '0', transform: 'translateY(8px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
            },
        },
    },
    plugins: [],
}
