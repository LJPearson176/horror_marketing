/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'horror-black': '#050505',
        'horror-red': '#8a0000',
      },
    },
  },
  plugins: [],
}
