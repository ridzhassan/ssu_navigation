/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e6f7f0',
          100: '#b3e6d4',
          200: '#80d5b8',
          300: '#4dc49c',
          400: '#26b885',
          500: '#00a86b',
          600: '#009960',
          700: '#008752',
          800: '#007544',
          900: '#00562f',
        },
        dark: {
          50: '#e8eaed',
          100: '#c5c9d0',
          200: '#9fa6b2',
          300: '#798394',
          400: '#5c697e',
          500: '#3f4f68',
          600: '#394860',
          700: '#313f55',
          800: '#29364b',
          900: '#1b2638',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

