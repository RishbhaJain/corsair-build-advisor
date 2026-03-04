/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        corsair: {
          yellow: "#FFF600",
          dark: "#0a0a0a",
          card: "#111111",
          border: "#222222",
          muted: "#555555",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
}

