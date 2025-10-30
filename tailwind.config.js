export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: { DEFAULT: "1rem", md: "1.25rem", lg: "1.5rem" },
      screens: { sm: "640px", md: "768px", lg: "1024px", xl: "1200px", "2xl": "1320px" }
    },
    extend: {
      colors: {
        surface: "rgb(var(--color-surface) / <alpha-value>)",
        card: "rgb(var(--color-card) / <alpha-value>)",
        primary: { DEFAULT: "#06B6D4", 500: "#06B6D4", 600: "#0891B2", 400: "#22D3EE" },
        success: "#22C55E",
        warning: "#F59E0B",
        danger: "#EF4444"
      },
      boxShadow: {
        glass: "0 12px 40px rgba(0, 0, 0, 0.35), inset 0 1px rgba(255, 255, 255, 0.05)",
        soft: "0 10px 28px rgba(0, 0, 0, 0.28)"
      },
      borderRadius: {
        "2xl": "1.25rem",
        "3xl": "1.5rem"
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-subtle': 'pulseSubtle 2s ease-in-out infinite'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' }
        }
      }
    }
  },
  plugins: []
}