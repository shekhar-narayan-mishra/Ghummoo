/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'teal': '#1D9E75',
        'teal-light': '#E1F5EE',
        'teal-dark': '#0F6E56',
        'purple-light': '#EEEDFE',
        'purple': '#534AB7',
        'purple-dark': '#3C3489',
        'amber-light': '#FAEEDA',
        'amber': '#BA7517',
        'green-light': '#EAF3DE',
        'green': '#3B6D11',
        'red-light': '#FCEBEB',
        'red': '#A32D2D',
        'blue-light': '#E6F1FB',
        'blue': '#185FA5',
      },
      fontFamily: {
        'inter': ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'lg': '12px',
        'md': '8px',
      }
    },
  },
  plugins: [],
}
