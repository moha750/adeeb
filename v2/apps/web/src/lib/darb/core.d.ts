/**
 * أنواعُ اللبّ المولَّد (`core.js`). اللبُّ نفسُه JavaScript لأنّه يُقتطع من اللعبة
 * كما هو، وهذا الملفُّ يصف ما يحتاجه الخادمُ منه فقط.
 */
export declare const CORE_VERSION: string;
export declare const STEP: number;
export declare const SLOT: number;
export declare const PW_T: number[];
export declare const WORDS: string[][];

export interface SimState {
  step: number;
  dist: number;
  alive: boolean;
  candy: number;
  [key: string]: number | boolean | string;
}

export declare class Sim {
  constructor(seed: number);
  s: SimState;
  log: [number, number][];
  /** ١ يسار · ٢ يمين · ٣ قفز · ٤ انزلاق */
  input(action: number): void;
  tick(): void;
  /** المسافةُ بالمتر، مقرَّبةً إلى الأدنى. */
  score(): number;
  candies(): number;
}
