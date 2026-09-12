/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    screens: {
      'xs': '320px',
      'mobile': '360px',
      'mobile-max': '390px',
      'sm': '640px',
      'md': '768px',
    },
    extend: {
      maxWidth: {
        mobile: '390px'
      },
      spacing: {
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '8': '32px',
        '12': '48px',
        '16': '64px',
      },
      height: {
        bar: '64px',
      },
      minHeight: {
        touch: '48px',
        bar: '64px',
      },
      minWidth: {
        touch: '48px',
        'btn-text': '120px',
      },
      colors: {
        base: '#0C0C0E',
        surface: {
          1: '#18181B',
          2: '#27272A',
          disabled: '#27272A',
        },
        border: {
          subtle: '#27272A',
          interactive: '#52525B',
          disabled: '#3F3F46',
        },
        brand: {
          primary: '#3B82F6',
          contrast: '#0C0C0E',
          focus: '#60A5FA',
        },
        content: {
          primary: '#FFFFFF',
          secondary: '#A1A1AA',
          disabled: '#71717A',
        },
        status: {
          success: '#22C55E',
          error: {
            text: '#F87171',
            bg: '#EF4444',
          },
          warning: '#F59E0B',
        },
        forge: {
          dark: '#0C0C0E',
          card: '#18181B',
          border: '#52525B',
          amber: '#F59E0B',
          accent: '#3B82F6'
        }
      }
    }
  },
  plugins: []
};
