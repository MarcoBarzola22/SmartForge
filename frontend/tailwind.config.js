/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      maxWidth: {
        mobile: '390px'
      },
      minHeight: {
        touch: '48px'
      },
      minWidth: {
        touch: '48px'
      },
      colors: {
        forge: {
          dark: '#0f172a',
          card: '#1e293b',
          border: '#334155',
          amber: '#f59e0b',
          accent: '#eab308'
        }
      }
    }
  },
  plugins: []
};
