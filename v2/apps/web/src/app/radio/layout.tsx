import { RadioPlayerProvider } from "./_player/PlayerProvider";

/**
 * تخطيطُ القسم — مسكنُ المشغّل.
 *
 * وضعُه هنا لا في الصفحة هو ما يجعل القسمَ محطّةً: تخطيطُ المسار يبقى مركَّبًا
 * وأنت تتنقّل بين البرامج والحلقات، فيبقى الصوتُ متّصلًا والشريطُ أسفلَك.
 */
export default function RadioLayout({ children }: { children: React.ReactNode }) {
  return <RadioPlayerProvider>{children}</RadioPlayerProvider>;
}
