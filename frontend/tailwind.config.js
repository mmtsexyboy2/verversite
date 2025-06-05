const colors = require('tailwindcss/colors'); // Import colors

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}", // If using App Router
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          light: '#6D8BCC',   // Lighter shade
          DEFAULT: '#4A70B0', // Main primary color (muted, classic blue)
          dark: '#3A5A8C',    // Darker shade
        },
        text_default: '#2D3748',    // Dark gray, like Tailwind's gray-800
        text_secondary: '#718096', // Medium gray, like Tailwind's gray-600
        app_bg: '#F7FAFC',          // Very light gray, like Tailwind's gray-100
        success: colors.green[600],
        error: colors.red[600],
        warning: colors.amber[500],
        info: colors.sky[500],
      },
    },
  },
  plugins: [],
};
