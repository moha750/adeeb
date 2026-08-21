import { color, type } from "@adeeb/theme-native";
import { Tabs } from "expo-router";
import { CalendarDotsIcon, NewspaperIcon, PaletteIcon, RadioIcon, UserIcon } from "@/ui/glyphs";

/**
 * أبوابُ الزائر الثلاثة: الإذاعة · الأنشطة · الأخبار. ورابعُها «حسابي» وهو بابُ صاحبِه لا بابُ زائر.
 * ورابعٌ («المعرض») لا يظهر إلّا في التطوير — فيه بدائلُ التصميم تُعرَض جنبًا إلى جنب.
 *
 * الشريطُ سفليٌّ لأنّ الإبهامَ يبلغه، والقياسُ 375px لا الشاشةُ العريضة:
 * ٢٣٠ عضوًا من ٢٩١ لم يفتحوا اللوحةَ من حاسوبٍ قطّ.
 */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: color.primary,
        tabBarInactiveTintColor: color.textMuted,
        tabBarStyle: {
          backgroundColor: color.surface,
          borderTopColor: color.border,
          height: 88,
          paddingTop: 8,
        },
        tabBarLabelStyle: type({ size: "xs", weight: "medium" }),
        tabBarItemStyle: { paddingVertical: 4 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "الإذاعة",
          tabBarIcon: ({ color: c, size }) => <RadioIcon color={c as string} size={size} />,
        }}
      />
      <Tabs.Screen
        name="activities"
        options={{
          title: "الأنشطة",
          tabBarIcon: ({ color: c, size }) => <CalendarDotsIcon color={c as string} size={size} />,
        }}
      />
      <Tabs.Screen
        name="news"
        options={{
          title: "الأخبار",
          tabBarIcon: ({ color: c, size }) => <NewspaperIcon color={c as string} size={size} />,
        }}
      />
      <Tabs.Screen
        name="me"
        options={{
          title: "حسابي",
          tabBarIcon: ({ color: c, size }) => <UserIcon color={c as string} size={size} />,
        }}
      />
      <Tabs.Screen
        name="lab"
        options={{
          title: "المعرض",
          href: __DEV__ ? "/lab" : null, // معرضُ التصميم — يختفي في نسخة الإنتاج
          tabBarIcon: ({ color: c, size }) => <PaletteIcon color={c as string} size={size} />,
        }}
      />
    </Tabs>
  );
}
