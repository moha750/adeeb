// أيقونات الهيكل — Phosphor (currentColor؛ الأحجام عبر CSS الحاوي)
import {
  House,
  UsersThree,
  ClipboardText,
  FileText,
  CalendarBlank,
  Globe,
  Gear,
  Bell,
  MagnifyingGlass,
  CaretRight,
  CaretDoubleRight,
  Plus,
  Lifebuoy,
  List,
  SidebarSimple,
  ChartLineUp,
  SignOut,
} from "@phosphor-icons/react";

type P = { className?: string };

export const IconHome = (p: P) => <House aria-hidden {...p} />;
export const IconUsers = (p: P) => <UsersThree aria-hidden {...p} />;
export const IconClip = (p: P) => <ClipboardText aria-hidden {...p} />;
export const IconDoc = (p: P) => <FileText aria-hidden {...p} />;
export const IconCal = (p: P) => <CalendarBlank aria-hidden {...p} />;
export const IconGlobe = (p: P) => <Globe aria-hidden {...p} />;
export const IconGear = (p: P) => <Gear aria-hidden {...p} />;
export const IconBell = (p: P) => <Bell aria-hidden {...p} />;
export const IconSearch = (p: P) => <MagnifyingGlass aria-hidden {...p} />;
export const IconCaret = (p: P) => <CaretRight aria-hidden {...p} />;
export const IconChevrons = (p: P) => <CaretDoubleRight aria-hidden {...p} />;
export const IconPlus = (p: P) => <Plus aria-hidden {...p} />;
export const IconLife = (p: P) => <Lifebuoy aria-hidden {...p} />;
export const IconMenu = (p: P) => <List aria-hidden {...p} />;
export const IconPanel = (p: P) => <SidebarSimple aria-hidden {...p} />;
export const IconChart = (p: P) => <ChartLineUp aria-hidden {...p} />;
export const IconLogout = (p: P) => <SignOut aria-hidden {...p} />;

export const ICONS = {
  home: IconHome, users: IconUsers, clip: IconClip, doc: IconDoc,
  cal: IconCal, globe: IconGlobe, gear: IconGear, chart: IconChart,
} as const;
export type IconKey = keyof typeof ICONS;
