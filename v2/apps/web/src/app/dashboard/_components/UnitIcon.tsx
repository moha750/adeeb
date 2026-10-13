"use client";

import { createContext, useContext, type ReactNode } from "react";
import {
  Archive, BookOpen, Briefcase, Buildings, CalendarStar, Camera, ChartLineUp, ChatsCircle, Code, Cpu, Database, Feather,
  FilmSlate, GlobeHemisphereEast, GraduationCap, Handshake, Headphones, IdentificationBadge, Lightbulb, Megaphone, Microphone,
  Newspaper, PaintBrush, Palette, PenNib, SealCheck, Trophy, UsersFour, UsersThree, VideoCamera,
} from "@phosphor-icons/react";

/**
 * **رسومُ الأيقونات من خارج المقترحة** — مفتاحٌ ← عقدةُ `svg` رسمها الخادمُ من المكتبة كلِّها
 * (`lib/unitIconCatalog.ts`). تمرّرها الصفحةُ لأيقونات وحداتها القائمة، فلا يحمل المتصفّحُ المكتبة.
 */
const UnitIconNodes = createContext<Record<string, ReactNode>>({});

export function UnitIconNodesProvider({ nodes, children }: { nodes: Record<string, ReactNode>; children: ReactNode }) {
  return <UnitIconNodes.Provider value={nodes}>{children}</UnitIconNodes.Provider>;
}
export const useUnitIconNodes = () => useContext(UnitIconNodes);

/**
 * **أيقونةُ الوحدة** — قسمٌ أو لجنةٌ بمفتاحها في القاعدة (`departments.icon` · `committees.icon`، ترحيل
 * `20261010083838_unit_icons`). المفاتيحُ المعروفةُ وأسماؤها في `lib/unitIcons.ts` (يقرؤها الخادمُ والمنتقي)،
 * ولكلّ مفتاحٍ هناك فرعٌ هنا.
 *
 * وما كان من المكتبة خارج المقترحة يُرسم من سياق `UnitIconNodes` (رسمُ الخادم)، وما لم يُوجد هناك، أو كان
 * فارغًا، يسقط إلى أيقونةٍ عامّة بنوع الوحدة: مبنى للقسم، وجمعٌ للجنة. فلا يكسر مفتاحٌ مجهولٌ شاشة.
 *
 * و`switch` لا خريطةُ مكوّنات: مكوّنٌ يُختار من خريطةٍ أثناء الرسم يُعدّ «مُنشأً في الرسم» عند مُدقّق React.
 */
export function UnitIcon({ icon, kind }: { icon?: string | null; kind: "department" | "committee" }) {
  const drawn = useContext(UnitIconNodes);
  switch (icon) {
    case "film-slate": return <FilmSlate aria-hidden />;
    case "camera": return <Camera aria-hidden />;
    case "video-camera": return <VideoCamera aria-hidden />;
    case "microphone": return <Microphone aria-hidden />;
    case "headphones": return <Headphones aria-hidden />;
    case "megaphone": return <Megaphone aria-hidden />;
    case "paint-brush": return <PaintBrush aria-hidden />;
    case "palette": return <Palette aria-hidden />;
    case "pen-nib": return <PenNib aria-hidden />;
    case "feather": return <Feather aria-hidden />;
    case "book-open": return <BookOpen aria-hidden />;
    case "newspaper": return <Newspaper aria-hidden />;
    case "calendar-star": return <CalendarStar aria-hidden />;
    case "handshake": return <Handshake aria-hidden />;
    case "identification-badge": return <IdentificationBadge aria-hidden />;
    case "users-three": return <UsersThree aria-hidden />;
    case "chats-circle": return <ChatsCircle aria-hidden />;
    case "globe-hemisphere-east": return <GlobeHemisphereEast aria-hidden />;
    case "code": return <Code aria-hidden />;
    case "cpu": return <Cpu aria-hidden />;
    case "database": return <Database aria-hidden />;
    case "archive": return <Archive aria-hidden />;
    case "chart-line-up": return <ChartLineUp aria-hidden />;
    case "seal-check": return <SealCheck aria-hidden />;
    case "briefcase": return <Briefcase aria-hidden />;
    case "lightbulb": return <Lightbulb aria-hidden />;
    case "trophy": return <Trophy aria-hidden />;
    case "graduation-cap": return <GraduationCap aria-hidden />;
    default: {
      const node = icon ? drawn[icon] : null;
      if (node) return <>{node}</>;
      return kind === "department" ? <Buildings aria-hidden /> : <UsersFour aria-hidden />;
    }
  }
}
