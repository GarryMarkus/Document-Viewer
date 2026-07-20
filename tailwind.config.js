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
          bg: '#1e1e1e',
          canvas: '#2a2a2a',
          header: '#2d2d2d',
          sidebar: '#252525',
          border: '#3d3d3d',
          hover: '#383838',
          active: '#404040',
          fab: '#555555',
          accent: '#62a0ea',
          text: '#e0e0e0',
          'text-dim': '#888888',
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
