/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  corePlugins: {
    // Keep existing bespoke styling stable while we adopt Tailwind incrementally.
    preflight: false,
  },
  theme: {
    extend: {},
  },
  plugins: [],
};
