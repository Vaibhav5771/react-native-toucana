import { useUser } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import type { ComponentProps } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  Easing,
  interpolate,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { CallingState, StreamCall, useCall, useCallStateHooks } from "@stream-io/video-react-native-sdk";

import { Image } from "@/components/image";
import { getOfficeImageSource } from "@/constants/images";
import { useAgentSession, type AgentSessionStatus } from "@/hooks/use-agent-session";
import { useLessonCall, type LessonCallStatus } from "@/hooks/use-lesson-call";
import { useLiveCaptions, type LiveCaption } from "@/hooks/use-live-captions";
import { languages } from "@/data/languages";
import { lessons } from "@/data/lessons";
import { useProgressStore } from "@/store/progress";

const FEEDBACK = [
  { label: "Speaking", value: "Excellent", colorClass: "text-tucana-teal-deep" },
  { label: "Pronunciation", value: "Great", colorClass: "text-tucana-blue" },
  { label: "Grammar", value: "Good", colorClass: "text-warning" },
] as const;

export default function LessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const lesson = lessons.find((item) => item.id === id);
  const language = languages.find((item) => item.id === lesson?.languageId);
  const { user } = useUser();

  const { call, status, error, retry } = useLessonCall(lesson?.id ?? "", lesson?.languageId ?? "spanish");
  const [hasEnded, setHasEnded] = useState(false);
  const completedItemIds = useProgressStore((state) => state.completedItemIds);
  const markLessonComplete = useProgressStore((state) => state.markLessonComplete);

  const isLocked = lesson
    ? lessons
        .filter((item) => item.unitId === lesson.unitId && item.order < lesson.order)
        .some((item) => !completedItemIds.includes(item.id))
    : false;

  const endCall = useCallback(async () => {
    if (call && call.state.callingState !== CallingState.LEFT) {
      await call.leave().catch((err) => console.error("Failed to leave call", err));
    }
    if (lesson) {
      markLessonComplete(lesson.id);
    }
    setHasEnded(true);
  }, [call, lesson, markLessonComplete]);

  useEffect(() => {
    if (!hasEnded) return;
    const timeout = setTimeout(() => router.back(), 500);
    return () => clearTimeout(timeout);
  }, [hasEnded]);

  if (!lesson || !language) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#ffffff" }} edges={["top"]}>
        <View className="flex-1 items-center justify-center px-screen">
          <Text className="font-poppins-semibold text-h2 text-ink">Lesson not found</Text>
          <Pressable onPress={() => router.back()} className="mt-4" hitSlop={8}>
            <Text className="font-poppins-medium text-body-md text-tucana-blue">Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (isLocked) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#ffffff" }} edges={["top"]}>
        <View className="flex-1 items-center justify-center px-screen">
          <Ionicons name="lock-closed" size={32} color="#94a3b8" />
          <Text className="mt-3 font-poppins-semibold text-h2 text-ink">Lesson locked</Text>
          <Text className="mt-1 text-center font-poppins text-body-md text-ink-muted">
            Finish the previous lessons in this unit first.
          </Text>
          <Pressable onPress={() => router.back()} className="mt-4" hitSlop={8}>
            <Text className="font-poppins-medium text-body-md text-tucana-blue">Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const shared = {
    lesson,
    language,
    userName: user?.firstName ?? user?.username ?? "You",
    userImage: user?.imageUrl,
    status,
    error,
    retry,
    hasEnded,
    onEndCall: endCall,
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#ffffff" }} edges={["top"]}>
      {call ? (
        <StreamCall call={call}>
          <ConnectedLessonBody {...shared} />
        </StreamCall>
      ) : (
        <LessonBody
          {...shared}
          micEnabled={false}
          callingState={CallingState.UNKNOWN}
          onMicPressIn={() => {}}
          onMicPressOut={() => {}}
          agentStatus="idle"
          captions={[]}
        />
      )}
    </SafeAreaView>
  );
}

function ConnectedLessonBody(
  props: Omit<
    ComponentProps<typeof LessonBody>,
    "micEnabled" | "callingState" | "onMicPressIn" | "onMicPressOut" | "agentStatus" | "captions"
  >,
) {
  const call = useCall();
  const { useMicrophoneState, useCallCallingState } = useCallStateHooks();
  const { isEnabled: micEnabled } = useMicrophoneState();
  const callingState = useCallCallingState();
  const agentStatus = useAgentSession(call, callingState === CallingState.JOINED, props.lesson.id);
  const captions = useLiveCaptions(call);

  // Push-to-talk. The mic stays muted so the AI teacher never hears its own
  // voice back through the speaker (that feedback loop is what made it sound
  // like it was talking to itself). Holding the button unmutes us, which also
  // lets the realtime model barge-in — it stops speaking and listens.
  const onMicPressIn = useCallback(() => {
    call?.microphone.enable().catch((err) => console.error("Failed to enable microphone", err));
  }, [call]);

  const onMicPressOut = useCallback(() => {
    call?.microphone.disable().catch((err) => console.error("Failed to disable microphone", err));
  }, [call]);

  return (
    <LessonBody
      {...props}
      micEnabled={micEnabled}
      callingState={callingState}
      onMicPressIn={onMicPressIn}
      onMicPressOut={onMicPressOut}
      agentStatus={agentStatus}
      captions={captions}
    />
  );
}

type LessonBodyProps = {
  lesson: (typeof lessons)[number];
  language: (typeof languages)[number];
  userName: string;
  userImage?: string | null;
  status: LessonCallStatus;
  error: string | null;
  retry: () => void;
  hasEnded: boolean;
  onEndCall: () => void;
  micEnabled: boolean;
  callingState: CallingState;
  onMicPressIn: () => void;
  onMicPressOut: () => void;
  agentStatus: AgentSessionStatus;
  captions: LiveCaption[];
};

function LessonBody({
  lesson,
  language,
  userName,
  userImage,
  status,
  error,
  retry,
  hasEnded,
  onEndCall,
  micEnabled,
  callingState,
  onMicPressIn,
  onMicPressOut,
  agentStatus,
  captions,
}: LessonBodyProps) {
  const presence = hasEnded ? "ended" : callingState === CallingState.JOINED ? "joined" : status;
  const canInteract = presence === "joined";

  const holdLabel = !canInteract
    ? "Connecting to your teacher…"
    : micEnabled
      ? "Listening… keep holding"
      : "Hold to speak";

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
      {/* Header: title + live status on the left, one clear End control top-right. */}
      <View className="flex-row items-start gap-3 px-screen pt-2">
        <View className="flex-1">
          <Text className="font-poppins-semibold text-h3 text-ink">AI Teacher</Text>
          <CallStatusRow presence={presence} />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="End call"
          onPress={onEndCall}
          disabled={hasEnded}
          hitSlop={8}
          className="h-11 flex-row items-center gap-1.5 rounded-pill bg-error px-4 active:opacity-80"
          style={hasEnded ? { opacity: 0.4 } : undefined}
        >
          <Ionicons name="call" size={16} color="#ffffff" style={{ transform: [{ rotate: "135deg" }] }} />
          <Text className="font-poppins-semibold text-body-sm text-background">End</Text>
        </Pressable>
      </View>

      <View className="px-screen pb-1 pt-3">
        <Text className="font-poppins-medium text-body-sm text-ink-muted" numberOfLines={1}>
          {language.name} · {lesson.title}
        </Text>
        {lesson.goals[0] && (
          <Text className="mt-0.5 font-poppins text-caption text-ink-muted/70" numberOfLines={1}>
            Goal: {lesson.goals[0].text}
          </Text>
        )}
        <View className="mt-1.5 flex-row items-center gap-1.5">
          {userImage ? (
            <Image source={userImage} className="h-4 w-4 rounded-pill" contentFit="cover" />
          ) : (
            <View className="h-4 w-4 items-center justify-center rounded-pill bg-tucana-blue/10">
              <Ionicons name="person" size={9} color="#3b82f6" />
            </View>
          )}
          <Text className="font-poppins text-caption text-ink-muted/70">Connected as {userName}</Text>
        </View>
        {presence !== "ended" && <AgentStatusRow status={agentStatus} />}
      </View>

      {status === "error" && (
        <View className="mx-screen mt-2 flex-row items-center gap-3 rounded-card border border-error/30 bg-error/10 px-4 py-3">
          <Ionicons name="alert-circle" size={18} color="#ff4d4f" />
          <Text className="flex-1 font-poppins-medium text-body-sm text-error">
            {error ?? "Couldn't connect to the lesson call."}
          </Text>
          <Pressable onPress={retry} hitSlop={8}>
            <Text className="font-poppins-semibold text-body-sm text-error">Retry</Text>
          </Pressable>
        </View>
      )}

      <View className="mx-screen mt-2 overflow-hidden rounded-card bg-ink" style={{ aspectRatio: 3 / 2 }}>
        <Image
          source={getOfficeImageSource(language.id)}
          contentFit="cover"
          className="absolute inset-0 h-full w-full"
        />

        {presence === "connecting" && (
          <View className="absolute inset-0 items-center justify-center bg-ink/40">
            <ActivityIndicator color="#ffffff" />
            <Text className="mt-2 font-poppins-medium text-body-sm text-background">Connecting…</Text>
          </View>
        )}

        {presence === "joined" && (
          <>
            <View className="absolute right-3 top-3 flex-row items-center gap-1 rounded-pill bg-ink/70 px-2 py-1">
              <Ionicons name="chatbox-ellipses" size={11} color="#ffffff" />
              <Text className="font-poppins-semibold text-caption text-background">Live captions</Text>
            </View>
            <View className="absolute inset-x-3 bottom-3">
              {captions.length > 0 ? (
                <LiveCaptions captions={captions} userName={userName} />
              ) : (
                <View className="rounded-card bg-background/95 px-4 py-3 shadow-md">
                  <Text className="font-poppins-semibold text-body-md text-ink">
                    {lesson.aiTeacherPrompt.openingMessage}
                  </Text>
                </View>
              )}
            </View>
          </>
        )}
      </View>

      <View className="mt-5 px-screen">
        <Text className="font-poppins-semibold text-body-md text-ink">Practice phrases</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-2"
          contentContainerStyle={{ paddingRight: 8 }}
        >
          {lesson.phrases.map((phrase) => (
            <View
              key={phrase.id}
              className="mr-3 min-w-[170px] rounded-card border border-border/60 bg-surface px-4 py-3"
            >
              <Text className="font-poppins-semibold text-body-md text-ink">{phrase.text}</Text>
              <Text className="mt-0.5 font-poppins text-body-sm text-ink-muted">{phrase.translation}</Text>
              {phrase.pronunciation && (
                <Text className="mt-0.5 font-poppins text-caption text-ink-muted/70">
                  {phrase.pronunciation}
                </Text>
              )}
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Single primary action: hold to speak (push-to-talk). */}
      <View className="mt-8 items-center px-screen">
        <PushToTalkButton
          disabled={!canInteract}
          listening={micEnabled}
          onPressIn={onMicPressIn}
          onPressOut={onMicPressOut}
        />
        <Text className="mt-4 font-poppins-semibold text-body-md text-ink">{holdLabel}</Text>
        <Text className="mt-1 max-w-[300px] text-center font-poppins text-caption text-ink-muted">
          Hold the button while you talk, then let go. Your teacher pauses and listens while you hold.
        </Text>
      </View>

      <View className="mx-screen mb-2 mt-8 flex-row rounded-card border border-border/60 bg-surface py-4">
        {FEEDBACK.map((item, index) => (
          <View
            key={item.label}
            className={`flex-1 items-center ${index > 0 ? "border-l border-border/60" : ""}`}
          >
            <Text className="font-poppins-medium text-caption text-ink-muted">{item.label}</Text>
            <Text className={`mt-1 font-poppins-semibold text-body-md ${item.colorClass}`}>{item.value}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

type Presence = LessonCallStatus | "ended";

function CallStatusRow({ presence }: { presence: Presence }) {
  const copy: Record<Presence, { label: string; dotClass: string }> = {
    connecting: { label: "Connecting…", dotClass: "bg-warning" },
    joined: { label: "Live", dotClass: "bg-success" },
    error: { label: "Connection error", dotClass: "bg-error" },
    ended: { label: "Call ended", dotClass: "bg-ink-muted" },
  };
  const { label, dotClass } = copy[presence];

  return (
    <View className="mt-0.5 flex-row items-center gap-1.5">
      <View className={`h-2 w-2 rounded-pill ${dotClass}`} />
      <Text className="font-poppins-medium text-caption text-ink-muted">{label}</Text>
    </View>
  );
}

/**
 * Live closed-caption overlay for the call. Shows the two most recent lines —
 * the newest in full, the previous one dimmed — labelled by speaker so the
 * learner can follow both the AI teacher and their own speech as it happens.
 */
function LiveCaptions({ captions, userName }: { captions: LiveCaption[]; userName: string }) {
  const visible = captions.slice(-2);

  return (
    <View className="rounded-card bg-ink/90 px-4 py-3 shadow-md">
      {visible.map((line, index) => {
        const isTeacher = line.role === "assistant";
        const isNewest = index === visible.length - 1;
        return (
          <View key={line.id} className={index > 0 ? "mt-2" : ""} style={{ opacity: isNewest ? 1 : 0.55 }}>
            <Text
              className={`font-poppins-semibold text-caption ${
                isTeacher ? "text-tucana-teal" : "text-tucana-lime"
              }`}
            >
              {isTeacher ? "AI Teacher" : userName}
            </Text>
            <Text className="mt-0.5 font-poppins-medium text-body-sm text-background">{line.text}</Text>
          </View>
        );
      })}
    </View>
  );
}

const AGENT_STATUS_COPY: Record<AgentSessionStatus, { label: string; dotClass: string }> = {
  idle: { label: "AI teacher not started", dotClass: "bg-ink-muted" },
  connecting: { label: "AI teacher connecting…", dotClass: "bg-warning" },
  connected: { label: "AI teacher connected", dotClass: "bg-success" },
  failed: { label: "AI teacher connection failed", dotClass: "bg-error" },
};

function AgentStatusRow({ status }: { status: AgentSessionStatus }) {
  const { label, dotClass } = AGENT_STATUS_COPY[status];

  return (
    <View className="mt-1 flex-row items-center gap-1.5">
      <View className={`h-2 w-2 rounded-pill ${dotClass}`} />
      <Text className="font-poppins-medium text-caption text-ink-muted">{label}</Text>
    </View>
  );
}

const PTT_SIZE = 104;

type PushToTalkButtonProps = {
  disabled?: boolean;
  /** Whether the mic is currently live (unmuted). */
  listening: boolean;
  onPressIn: () => void;
  onPressOut: () => void;
};

/**
 * The one control on the call: press and hold to talk. Reanimated is used for
 * the press spring and the pulsing halo (animated + shadow + transform styles,
 * so inline styles are the documented exception to the NativeWind rule).
 */
function PushToTalkButton({ disabled, listening, onPressIn, onPressOut }: PushToTalkButtonProps) {
  const [holding, setHolding] = useState(false);
  const pressScale = useSharedValue(1);
  const pulse = useSharedValue(0);

  const startHold = () => {
    if (disabled) return;
    setHolding(true);
    pressScale.set(withSpring(1.08, { duration: 260, dampingRatio: 0.6, reduceMotion: ReduceMotion.System }));
    pulse.set(
      withRepeat(
        withTiming(1, { duration: 1200, easing: Easing.out(Easing.ease), reduceMotion: ReduceMotion.System }),
        -1,
        false,
      ),
    );
    onPressIn();
  };

  const endHold = () => {
    if (disabled) return;
    setHolding(false);
    pressScale.set(withSpring(1, { duration: 260, dampingRatio: 0.7, reduceMotion: ReduceMotion.System }));
    pulse.set(withTiming(0, { duration: 200, reduceMotion: ReduceMotion.System }));
    onPressOut();
  };

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.get() }],
  }));

  const haloStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pulse.get(), [0, 1], [1, 1.7]) }],
    opacity: interpolate(pulse.get(), [0, 1], [0.35, 0]),
  }));

  const active = holding || listening;

  return (
    <View style={{ width: PTT_SIZE, height: PTT_SIZE, alignItems: "center", justifyContent: "center" }}>
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: "absolute",
            width: PTT_SIZE,
            height: PTT_SIZE,
            borderRadius: PTT_SIZE / 2,
            backgroundColor: "#14b8a6",
          },
          haloStyle,
        ]}
      />
      <Animated.View style={buttonStyle}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Hold to speak"
          accessibilityHint="Hold to talk to your teacher, release when you're done"
          accessibilityState={{ disabled: !!disabled, busy: active }}
          disabled={disabled}
          onPressIn={startHold}
          onPressOut={endHold}
          style={{
            width: PTT_SIZE,
            height: PTT_SIZE,
            borderRadius: PTT_SIZE / 2,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: disabled ? "#f1f5f9" : active ? "#14b8a6" : "#ffffff",
            borderWidth: active ? 0 : 2,
            borderColor: "#14b8a6",
            shadowColor: "#14b8a6",
            shadowOpacity: disabled ? 0 : active ? 0.4 : 0.18,
            shadowRadius: active ? 18 : 10,
            shadowOffset: { width: 0, height: 8 },
            elevation: disabled ? 0 : active ? 10 : 5,
            opacity: disabled ? 0.6 : 1,
          }}
        >
          <Ionicons
            name={active ? "mic" : "mic-outline"}
            size={38}
            color={disabled ? "#64748b" : active ? "#ffffff" : "#14b8a6"}
          />
        </Pressable>
      </Animated.View>
    </View>
  );
}
