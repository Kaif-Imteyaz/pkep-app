/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
  safelist: [
    'border-[#4ade80]',
    'border-[#f87171]',
    'border-[#facc15]',
    'text-[#4ade80]',
    'text-[#f87171]',
    'text-[#facc15]'
  ]
};