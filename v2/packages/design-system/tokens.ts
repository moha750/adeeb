/**
 * قيم الرموز كـ TypeScript — لاستهلاكها في منطق JS أو في React Native مستقبلًا.
 * الحقيقة الواحدة للويب هي tokens.css؛ هذا الملف نسخة موازية للجافاسكربت.
 * حافِظ على تطابقهما عند أي تعديل.
 */

export const color = {
  navy: {
    50: '#eff2f7', 100: '#dde3ed', 200: '#bcc9dc', 300: '#8ea0bc', 400: '#5e779c',
    500: '#456691', 600: '#33527a', 700: '#274060', 800: '#1e3350', 900: '#16263a', 950: '#0e1826',
  },
  steel: {
    50: '#eef3f8', 100: '#dce5ef', 200: '#bccfe0', 300: '#92aac3', 400: '#5e88ab',
    500: '#45719a', 600: '#335c81', 700: '#294c6c', 800: '#213d57', 900: '#1b3145',
  },
  neutral: {
    50: '#f6f7fa', 100: '#eceef2', 200: '#dce0e7', 300: '#c2c8d2', 400: '#99a1af',
    500: '#6f7789', 600: '#545c6d', 700: '#414857', 800: '#2a2f3a', 900: '#191d25',
  },
  brand: { primary: '#274060', secondary: '#335c81' },
  semantic: { success: '#2e8b6b', warning: '#c58a2c', danger: '#c0473c', info: '#335c81' },
} as const;

export const font = {
  display: 'Lyon Arabic',
  body: 'Lyon Arabic',
  latin: 'Eras',
  weight: { light: 300, regular: 400, medium: 500, bold: 700, black: 900 },
  size: { xs: 12, sm: 14, base: 16, lg: 18, xl: 20, '2xl': 24, '3xl': 30, '4xl': 36, '5xl': 48, '6xl': 60 },
  leading: { tight: 1.15, snug: 1.35, normal: 1.6, relaxed: 1.8 },
} as const;

export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, 16: 64, 20: 80, 24: 96 } as const;
export const radius = { sm: 6, md: 10, lg: 14, xl: 20, full: 9999 } as const;

export const tokens = { color, font, space, radius } as const;
export default tokens;
