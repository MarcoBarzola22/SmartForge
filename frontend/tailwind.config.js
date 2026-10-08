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
          elevated: 'oklch(0.235 0.007 286)',
          disabled: '#27272A',
        },
        border: {
          subtle: '#27272A',
          interactive: '#52525B',
          disabled: '#3F3F46',
        },
        brand: {
          DEFAULT: 'oklch(0.623 0.188 259.8)',
          primary: '#3B82F6',
          contrast: '#0C0C0E',
          focus: 'oklch(0.707 0.143 254.6)',
        },
        content: {
          DEFAULT: 'oklch(1 0 0)',
          1: 'oklch(1 0 0)',
          2: 'oklch(0.712 0.013 286)',
          3: 'oklch(0.552 0.014 286)',
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
        // Tokens de Lovable Design System
        ink: 'oklch(0.15 0.004 286)',
        shell: 'oklch(0 0 0)',
        neon: 'oklch(0.866 0.29 142.5)',
        success: 'oklch(0.723 0.192 149.6)',
        amber: 'oklch(0.769 0.165 70.1)',
        fatigue: {
          DEFAULT: 'oklch(0.637 0.208 25.3)',
          text: 'oklch(0.711 0.166 22.2)',
        },
        line: {
          DEFAULT: 'oklch(0.274 0.006 286)',
          strong: 'oklch(0.442 0.014 286)',
        },
        forge: {
          dark: '#0C0C0E',
          card: '#18181B',
          border: '#52525B',
          amber: '#F59E0B',
          accent: '#3B82F6'
        }
      },
      boxShadow: {
        'glow-brand': '0 10px 25px -5px rgba(59, 130, 246, 0.3)',
        'glow-neon': '0 10px 25px -5px rgba(0, 245, 118, 0.2)',
        'glow-amber': '0 10px 25px -5px rgba(245, 158, 11, 0.3)',
        'glow-success': '0 10px 25px -5px rgba(34, 197, 94, 0.3)',
      }
    }
  },
  plugins: []
};
