import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import type { Lesson } from "@/types/learning";

type LessonStatus = "completed" | "current" | "locked";

type LessonCardProps = {
  lesson: Lesson;
  status: LessonStatus;
  onPress: () => void;
};

const TITLE_COLOR: Record<LessonStatus, string> = {
  completed: "text-ink",
  current: "text-tucana-teal-deep",
  locked: "text-ink-muted",
};

export function LessonCard({ lesson, status, onPress }: LessonCardProps) {
  const isCompleted = status === "completed";
  const isCurrent = status === "current";
  const isLocked = status === "locked";
  const titleColor = TITLE_COLOR[status];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={lesson.title}
      accessibilityState={{ disabled: isLocked }}
      onPress={onPress}
      disabled={isLocked}
      className={`flex-row items-center gap-3 rounded-card border px-4 py-3 active:opacity-80 active:scale-[0.99] ${
        isCurrent ? "border-2 border-tucana-teal bg-tucana-teal/5 shadow-sm" : "border-border/60 bg-background"
      }`}
    >
      <View className="flex-1">
        <Text
          className={`font-poppins-medium text-body-sm ${isCurrent ? "text-tucana-teal-deep" : "text-ink-muted"}`}
        >
          Lesson {lesson.order}
        </Text>
        <Text className={`mt-0.5 font-poppins-semibold text-body-lg ${titleColor}`}>{lesson.title}</Text>
        {isCurrent && (
          <Text className="mt-0.5 font-poppins-medium text-body-sm text-tucana-teal">In progress</Text>
        )}
      </View>

      {isCompleted && <Ionicons name="checkmark-circle" size={28} color="#14b8a6" />}
      {isCurrent && <Ionicons name="play-circle" size={28} color="#14b8a6" />}
      {isLocked && <Ionicons name="lock-closed" size={22} color="#94a3b8" />}
    </Pressable>
  );
}
