/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class', // Enable class-based dark mode
  theme: {
    extend: {
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
      },
      keyframes: {
        fadeInBottom: {
          '0%': { opacity: '0', transform: 'translateY(40px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(-30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        gradientMove: {
          '0%': { backgroundPosition: '0% 0%' },
          '50%': { backgroundPosition: '100% 100%' },
          '100%': { backgroundPosition: '0% 0%' },
        },
        float: {
          '0%': { transform: 'translate(0, 0) rotate(0deg)', opacity: '0.7' },
          '25%': { transform: 'translate(30px, -20px) rotate(90deg)', opacity: '1' },
          '50%': { transform: 'translate(-15px, 25px) rotate(180deg)', opacity: '0.8' },
          '75%': { transform: 'translate(25px, -30px) rotate(270deg)', opacity: '1' },
          '100%': { transform: 'translate(0, 0) rotate(360deg)', opacity: '0.7' },
        },
        colorShift: {
          '0%': { backgroundColor: 'rgba(239, 68, 68, 0.6)' },
          '25%': { backgroundColor: 'rgba(34, 197, 94, 0.6)' },
          '50%': { backgroundColor: 'rgba(168, 85, 247, 0.6)' },
          '75%': { backgroundColor: 'rgba(249, 115, 22, 0.6)' },
          '100%': { backgroundColor: 'rgba(239, 68, 68, 0.6)' },
        },
      },
      animation: {
        fadeInBottom: 'fadeInBottom 1s ease-out forwards',
        fadeInUp: 'fadeInUp 1s ease-out forwards',
        gradientMove: 'gradientMove 12s linear infinite',
        float: 'float linear infinite',
        colorShift: 'colorShift 8s ease-in-out infinite',
      },
    },
  },
  plugins: [require("daisyui")],
};
