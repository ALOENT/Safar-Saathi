/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        safar: {
          dark: '#14532d',
          primary: '#15803d',
          light: '#f0fdf4',
          accent: '#22c55e',
          sos: '#dc2626',
          sosDark: '#991b1b'
        }
      }
    },
  },
  plugins: [],
}
