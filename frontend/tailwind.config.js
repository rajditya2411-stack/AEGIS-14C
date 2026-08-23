/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0b0f19",
        card: "#121827",
        border: "#1f293d",
        sidebar: "#0d1322",
        accent: "#3b82f6",
        domain: "#38bdf8",
        ip: "#34d399",
        email: "#f43f5e",
        person: "#fbbf24",
        org: "#c084fc",
        username: "#a78bfa",
        repo: "#818cf8",
        url: "#38bdf8",
        cert: "#2dd4bf",
        asn: "#f97316"
      }
    },
  },
  plugins: [],
}
