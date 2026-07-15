/**
 * Tailwind preset — نظام رموز أديب
 * يربط أدوات Tailwind بمتغيّرات CSS في tokens.css (مصدرٌ واحد للحقيقة).
 * الاستخدام في apps/web:
 *   // tailwind.config.js
 *   module.exports = { presets: [require('@adeeb/design-system/tailwind.preset')] }
 */
module.exports = {
  theme: {
    extend: {
      colors: {
        navy: {
          50: 'var(--navy-50)', 100: 'var(--navy-100)', 200: 'var(--navy-200)', 300: 'var(--navy-300)',
          400: 'var(--navy-400)', 500: 'var(--navy-500)', 600: 'var(--navy-600)', 700: 'var(--navy-700)',
          800: 'var(--navy-800)', 900: 'var(--navy-900)', 950: 'var(--navy-950)',
        },
        steel: {
          50: 'var(--steel-50)', 100: 'var(--steel-100)', 200: 'var(--steel-200)', 300: 'var(--steel-300)',
          400: 'var(--steel-400)', 500: 'var(--steel-500)', 600: 'var(--steel-600)', 700: 'var(--steel-700)',
          800: 'var(--steel-800)', 900: 'var(--steel-900)',
        },
        neutral: {
          50: 'var(--neutral-50)', 100: 'var(--neutral-100)', 200: 'var(--neutral-200)', 300: 'var(--neutral-300)',
          400: 'var(--neutral-400)', 500: 'var(--neutral-500)', 600: 'var(--neutral-600)', 700: 'var(--neutral-700)',
          800: 'var(--neutral-800)', 900: 'var(--neutral-900)',
        },
        // رموز دلالية (تنقلب مع الثيم)
        bg: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        'surface-2': 'var(--color-surface-2)',
        line: 'var(--color-border)',
        primary: { DEFAULT: 'var(--color-primary)', hover: 'var(--color-primary-hover)', fg: 'var(--color-on-primary)' },
        secondary: { DEFAULT: 'var(--color-secondary)', hover: 'var(--color-secondary-hover)' },
        success: 'var(--success)', warning: 'var(--warning)', danger: 'var(--danger)', info: 'var(--info)',
        content: { DEFAULT: 'var(--color-text)', muted: 'var(--color-text-muted)' },
      },
      fontFamily: {
        display: ['var(--font-display)'],
        body: ['var(--font-body)'],
        latin: ['var(--font-latin)'],
        mono: ['var(--font-mono)'],
      },
      // نظام الزوايا المتراكز: الأساس + المشتقّات (لا md/lg/xl — العائلة من --radius)
      borderRadius: {
        DEFAULT: 'var(--radius)', xs: 'var(--radius-xs)', sm: 'var(--radius-sm)',
        nested: 'var(--radius-nested)', full: 'var(--radius-full)',
      },
      boxShadow: { sm: 'var(--shadow-sm)', md: 'var(--shadow-md)', lg: 'var(--shadow-lg)' },
      ringColor: { DEFAULT: 'var(--color-ring)' },
      transitionTimingFunction: { standard: 'var(--ease-standard)' },
      zIndex: { dropdown: '1000', sticky: '1100', modal: '1300', toast: '1500' },
    },
  },
};
