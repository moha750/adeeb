/**
 * مولَّدٌ آليًّا من packages/design-system/tokens.css — **لا يُحرَّر بيد**.
 * أعِد التوليد بـ:  node scripts/theme-native.mjs
 *
 * كلُّ قيمةٍ هنا محلولةٌ بالكامل: لا var ولا calc ولا color-mix، والمزجُ تمّ في فضاء oklab
 * كما يفعله المتصفّح، فلونُ التطبيق هو لونُ الموقع نفسُه لا تقريبٌ له.
 */

/* eslint-disable */

export const color = {
  navy: {
    "50": "#eff2f7",
    "100": "#dde3ed",
    "200": "#bcc9dc",
    "300": "#8ea0bc",
    "400": "#5e779c",
    "500": "#456691",
    "600": "#33527a",
    "700": "#274060",
    "800": "#1e3350",
    "900": "#16263a",
    "950": "#0e1826"
  },
  steel: {
    "50": "#eef3f8",
    "100": "#dce5ef",
    "200": "#bccfe0",
    "300": "#92aac3",
    "400": "#5e88ab",
    "500": "#45719a",
    "600": "#335c81",
    "700": "#294c6c",
    "800": "#213d57"
  },
  neutral: {
    "50": "#f6f7fa",
    "100": "#eceef2",
    "200": "#dce0e7",
    "300": "#c2c8d2",
    "400": "#99a1af",
    "500": "#6f7789",
    "600": "#545c6d",
    "700": "#414857",
    "800": "#2a2f3a"
  },
  success: {
    "50": "#e9f8f0",
    "100": "#cdeede",
    "200": "#a0e0c1",
    "300": "#63cd9c",
    "400": "#35b57f",
    "500": "#1f9d5f",
    "600": "#1a8452",
    "700": "#166a43",
    "800": "#125334",
    "900": "#0e3f28"
  },
  warning: {
    "50": "#fdf4e3",
    "100": "#f9e6bf",
    "200": "#f2cd82",
    "300": "#ebb14a",
    "400": "#e39f24",
    "500": "#d9920f",
    "600": "#b87a0c",
    "700": "#94620b",
    "800": "#6f4a0a",
    "900": "#4d3308"
  },
  danger: {
    "50": "#fceceb",
    "100": "#f9d6d2",
    "200": "#f2aaa3",
    "300": "#e87a6f",
    "400": "#dd5546",
    "500": "#d23b2c",
    "600": "#b52f22",
    "700": "#93261b",
    "800": "#6f1d15",
    "900": "#4d1410"
  },
  bg: "#f5f7fa",
  surface: "#ffffff",
  surface2: "#eef1f6",
  text: "#182031",
  textMuted: "#5c6678",
  border: "rgba(24,32,49,.12)",
  primary: "#274060",
  primaryHover: "#1e3350",
  onPrimary: "#ffffff",
  secondary: "#335c81",
  secondaryHover: "#294c6c",
  onSecondary: "#ffffff",
  ring: "#45719a",
  success_: "#1a8452",
  successSoft: "#e9f8f0",
  warning_: "#b87a0c",
  warningSoft: "#fdf4e3",
  danger_: "#b52f22",
  dangerSoft: "#fceceb",
  info: "#335c81",
  infoSoft: "#e4ebf2",
  scrim: "rgba(20, 31, 48, .42)",
  glassBg: "rgba(255,255,255,.16)",
  glassBgStrong: "rgba(255,255,255,.28)",
  glassBorder: "rgba(255,255,255,.28)",
  cardStroke: "#bccfe0",
  cardStrokeActive: "#45719a",
  cardStrokeBrand: "#97b2cb",
  cardStrokeNeutral: "#9babbc",
  cardStrokeSuccess: "#91b9b4",
  cardStrokeWarning: "#bdb7ab",
  cardStrokeDanger: "#c2a4a8",
  auroraBrand: "#e7ebf0",
  auroraNeutral: "#eaebef",
  auroraSuccess: "#e4f3ec",
  auroraWarning: "#faf2e2",
  auroraDanger: "#fae7e6",
  borderAurora: "rgba(54, 85, 118, 0.296)",
  chart: [
    "#2f74bd",
    "#3a4fa0",
    "#b0812f",
    "#12a08c",
    "#a8477f",
    "#d1622e"
  ]
} as const;

export type Gradient = { angle: number; colors: string[]; locations: number[] };
export const gradient: Record<"primary" | "success" | "warning" | "danger" | "neutral" | "chartBar" | "chartCol" | "surfaceAurora", Gradient> = {
  primary: {
    angle: 135,
    colors: [
      "#5e88ab",
      "#1e3350"
    ],
    locations: [
      0,
      1
    ]
  },
  success: {
    angle: 135,
    colors: [
      "#63cd9c",
      "#1a8452"
    ],
    locations: [
      0,
      1
    ]
  },
  warning: {
    angle: 135,
    colors: [
      "#ebb14a",
      "#b87a0c"
    ],
    locations: [
      0,
      1
    ]
  },
  danger: {
    angle: 135,
    colors: [
      "#e87a6f",
      "#b52f22"
    ],
    locations: [
      0,
      1
    ]
  },
  neutral: {
    angle: 135,
    colors: [
      "#99a1af",
      "#414857"
    ],
    locations: [
      0,
      1
    ]
  },
  chartBar: {
    angle: 135,
    colors: [
      "#5e88ab",
      "#335c81"
    ],
    locations: [
      0,
      1
    ]
  },
  chartCol: {
    angle: 180,
    colors: [
      "#5e88ab",
      "#1e3350"
    ],
    locations: [
      0,
      1
    ]
  },
  surfaceAurora: {
    angle: 135,
    colors: [
      "#e4eaf1",
      "#ffffff"
    ],
    locations: [
      0,
      0.62
    ]
  }
};

export const radius = {
  base: 16,
  nested: 13,
  sm: 10,
  xs: 6,
  full: 9999
} as const;

export const stroke = {
  w: 1.75,
  wActive: 1.75
} as const;

export const space = {
  "1": 4,
  "2": 8,
  "3": 12,
  "4": 16,
  "5": 20,
  "6": 24,
  "8": 32,
  "10": 40,
  "12": 48,
  "16": 64,
  "20": 80,
  "24": 96
} as const;

export const text = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  "2xl": 24,
  "3xl": 30,
  "4xl": 36,
  "5xl": 48,
  "6xl": 60
} as const;

export const leading = {
  tight: 1.15,
  snug: 1.35,
  normal: 1.6,
  relaxed: 1.8
} as const;

export const weight = {
  light: 300,
  regular: 400,
  medium: 500,
  bold: 700,
  black: 900
} as const;

export const shadowTone = {
  brand: {
    r: 69,
    g: 113,
    b: 154
  },
  success: {
    r: 26,
    g: 132,
    b: 82
  },
  warning: {
    r: 184,
    g: 122,
    b: 12
  },
  danger: {
    r: 181,
    g: 47,
    b: 34
  },
  neutral: {
    r: 84,
    g: 92,
    b: 109
  }
} as const;

export const duration = {
  fast: 150,
  base: 250,
  slow: 400,
  chart: 850
} as const;
