import { color } from "@adeeb/theme-native";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";

import { Pressable } from "react-native";

import { getUpcomingActivities, type Activity } from "@/lib/activities";
import { Card, Note, Screen } from "@/ui/Screen";
import { T } from "@/ui/T";

/**
 * قائمةُ الأنشطة القادمة.
 * تُقرأ بمفتاح anon بلا حساب، والحجزُ في صفحة النشاط لأنّه يحتاج بابًا ثلاثيًّا:
 * حسابٌ ← بيانٌ فيه جنسُك ← مقعدٌ متاح.
 */
export default function ActivitiesScreen() {
  const router = useRouter();
  const [items, setItems] = useState<Activity[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getUpcomingActivities().then(({ data, error }) => {
      setItems(data);
      setError(error);
    });
  }, []);

  return (
    <Screen title="الأنشطة" subtitle="ما هو قادم">
      {error ? <Note tone="danger">{`تعذّرت القراءة: ${error}`}</Note> : null}
      {!items && !error ? <Note>جارٍ التحميل</Note> : null}
      {items?.length === 0 ? <Note>لا أنشطةَ قادمةً الآن</Note> : null}

      {items?.map((a) => (
        <Pressable key={a.id} onPress={() => router.push(`/activity/${a.id}`)}>
        <Card>
          <T size="lg" weight="bold">
            {a.name}
          </T>
          <T size="sm" color={color.textMuted}>
            {`${a.date} الساعة ${a.startTime}`}
          </T>
          {a.location ? (
            <T size="sm" color={color.textMuted}>
              {a.location}
            </T>
          ) : null}
        </Card>
        </Pressable>
      ))}
    </Screen>
  );
}
