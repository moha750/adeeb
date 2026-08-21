import { color, radius, space, stroke } from "@adeeb/theme-native";
import { useRouter } from "expo-router";
import { CaretDownIcon, ClipboardTextIcon } from "@/ui/glyphs";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getMyTasks, submitTask, type MyTask } from "@/lib/tasks";
import { TOUCH } from "@/ui/layout";
import { Note } from "@/ui/Screen";
import { T } from "@/ui/T";

/**
 * مهامّي.
 *
 * والتسليمُ **في الشاشة نفسِها** لا في صفحةٍ ثانية: المهمّةُ في الجوّال سطرٌ يُقرأ وسطرٌ
 * يُكتب، وفتحُ صفحةٍ لأجل حقلٍ واحدٍ يجعل الفعلَ أبعدَ ممّا يستحقّ. ويُطوى الحقلُ لغير
 * المعلَّقة: ما سُلّم أو أُعذر لا يُطلَب فيه شيء.
 */
export default function TasksScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [tasks, setTasks] = useState<MyTask[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const read = useCallback(async () => {
    const res = await getMyTasks();
    return res;
  }, []);

  useEffect(() => {
    let alive = true;
    void read().then((res) => {
      if (!alive) return;
      setTasks(res.data);
      setError(res.error);
    });
    return () => {
      alive = false;
    };
  }, [read]);

  const reload = async () => {
    const res = await read();
    setTasks(res.data);
    setError(res.error);
  };

  const pending = tasks?.filter((t) => t.state === "pending").length ?? 0;

  return (
    <Wrap top={insets.top} onClose={() => router.back()}>
      {!tasks && !error ? <ActivityIndicator color={color.primary} /> : null}
      {error ? <Note tone="danger">{`تعذّرت القراءة: ${error}`}</Note> : null}
      {tasks?.length === 0 ? <Note>لا مهامَّ أُسنِدت إليك.</Note> : null}

      {tasks?.length ? (
        <T size="sm" color={color.textMuted}>
          {pending ? `${pending} تنتظرك من ${tasks.length}` : `${tasks.length} مهمّةً، ولا شيءَ ينتظرك`}
        </T>
      ) : null}

      {tasks?.map((t) => (
        <TaskCard key={t.assignmentId} task={t} onDone={reload} />
      ))}
    </Wrap>
  );
}

function TaskCard({ task, onDone }: { task: MyTask; onDone: () => Promise<void> }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const tone =
    task.stateTone === "success" ? color.success_ : task.stateTone === "danger" ? color.danger_ : color.textMuted;

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <ClipboardTextIcon size={20} color={color.primary} />
        <T size="base" weight="bold" style={{ flex: 1 }}>
          {task.title}
        </T>
        <View style={styles.state}>
          <T size="xs" color={tone}>
            {task.stateLabel}
          </T>
        </View>
      </View>

      {task.description ? (
        <T size="sm" color={color.textMuted} leading="relaxed">
          {task.description}
        </T>
      ) : null}

      <T size="xs" color={color.textMuted}>
        {[task.committee, task.dueLabel ? `الموعد ${task.dueLabel}` : null].filter(Boolean).join("، ")}
      </T>

      {task.submission ? (
        <View style={styles.said}>
          <T size="xs" color={color.textMuted}>
            سلّمتَ
          </T>
          <T size="sm">{task.submission}</T>
        </View>
      ) : null}

      {task.note ? (
        <T size="xs" color={color.textMuted}>
          {`ملاحظةُ قائدك: ${task.note}`}
        </T>
      ) : null}

      {task.state === "pending" && task.status === "open" ? (
        <>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="اكتب ما تسلّمه"
            placeholderTextColor={color.textMuted}
            multiline
            editable={!busy}
          />
          <Pressable
            style={styles.cta}
            disabled={busy}
            onPress={async () => {
              setBusy(true);
              const res = await submitTask(task.assignmentId, text);
              setBusy(false);
              if (!res.ok) Alert.alert("تعذّر التسليم", res.message);
              else {
                setText("");
                await onDone();
              }
            }}
          >
            <T size="base" weight="medium" color={color.onPrimary}>
              {busy ? "جارٍ التسليم" : "سلّم"}
            </T>
          </Pressable>
        </>
      ) : null}
    </View>
  );
}

function Wrap({ children, onClose, top }: { children: React.ReactNode; onClose: () => void; top: number }) {
  return (
    <View style={styles.root}>
      <View style={{ paddingTop: top }}>
        <Pressable onPress={onClose} hitSlop={10} style={styles.close} accessibilityLabel="إغلاق">
          <CaretDownIcon size={24} color={color.text} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  close: { width: TOUCH, height: TOUCH, alignItems: "center", justifyContent: "center", marginInlineStart: space[3] },
  body: { paddingHorizontal: space[5], paddingBottom: space[10], gap: space[3] },
  card: {
    backgroundColor: color.surface,
    borderRadius: radius.base,
    borderWidth: stroke.w,
    borderColor: color.cardStroke,
    padding: space[4],
    gap: space[2],
  },
  head: { flexDirection: "row", alignItems: "center", gap: space[2] },
  state: {
    backgroundColor: color.surface2,
    borderRadius: radius.full,
    paddingHorizontal: space[3],
    paddingVertical: space[1],
  },
  said: { backgroundColor: color.surface2, borderRadius: radius.sm, padding: space[3], gap: 2 },
  input: {
    minHeight: TOUCH + 12,
    backgroundColor: color.surface2,
    borderRadius: radius.sm,
    borderWidth: stroke.w,
    borderColor: color.cardStroke,
    padding: space[3],
    color: color.text,
    textAlign: "right",
  },
  cta: {
    minHeight: TOUCH,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.base,
    backgroundColor: color.primary,
  },
});
