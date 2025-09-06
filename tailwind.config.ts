import type { Config } from 'tailwindcss';

export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx,js,jsx,html}',
    './dashboard/**/*.{ts,tsx,html}',
    './options/**/*.{ts,tsx,html}',
  ],
  theme: {
    extend: {
      borderRadius: {
        '2xl': '1rem',
      },
    },
  },
  plugins: [],
} satisfies Config;


