/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        adwaita: {
          bg: '#fafafa',
          header: '#ebebeb',
          sidebar: '#f2f2f2',
          border: '#c8c8c8',
          hover: '#dfdfdf',
        }
      },
      borderRadius: {
        'window': '12px',
      }
    },
  },
  plugins: [],
}
