/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        adwaita: {
          bg: '#f0f0f0',
          canvas: '#9a9996',
          header: '#ebebeb',
          sidebar: '#ffffff',
          border: '#cdcdcd',
          hover: '#e0e0e0',
          active: '#d5d5d5',
          fab: '#3d3d3d',
          accent: '#3584e4',
          text: '#2e3436',
          'text-dim': '#77767b',
        },
        dark: {
          bg: '#1a1a1a',
          canvas: '#121212',
          header: '#242424',
          sidebar: '#242424',
          popover: '#2c2c2c',
          border: '#111111',
          hover: '#3a3a3a',
          active: '#454545',
          fab: '#383838',
          accent: '#3584e4',
          text: '#ffffff',
          'text-dim': '#a0a0a0',
        }
      },
      borderRadius: {
        'window': '12px',
        'pill': '100px',
      },
      fontFamily: {
        'sans': ['Inter', 'Cantarell', 'system-ui', '-apple-system', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
