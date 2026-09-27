import earth from "@/assets/images/earth.png";
import mascotAuth from "@/assets/images/mascot-auth.png";
import mascotWelcome from "@/assets/images/mascot-welcome.png";
import palace from "@/assets/images/palace.png";
import cafeScene from "@/assets/images/paris-cafe.png";
import splashIcon from "@/assets/images/splash-icon.png";
import streakFire from "@/assets/images/streak-fire.png";
import toucan from "@/assets/images/toucan_vector.svg";
import toucanOffice from "@/assets/images/toucan-office.png";
import treasure from "@/assets/images/treasure.png";

import type { Lesson, LessonImageKey, LanguageId } from "@/types/learning";

export const images = {
  earth,
  toucan,
  toucanOffice,
  mascotWelcome,
  mascotAuth,
  palace,
  cafeScene,
  treasure,
  streakFire,
  splashIcon,
};

// Scene illustrations are generic (a cafe, a map, a market) and reused across every
// language's lessons rather than drawn once per language, so this is a small, finite
// set of local assets, not one per language/lesson combination.
const LESSON_SCENE_IMAGES: Record<LessonImageKey, number> = {
  cafeScene,
  earth,
  treasure,
  palace,
};

// Custom one-off illustrations, hosted on GitHub raw (this repo is public) rather than
// bundled locally, so the app binary doesn't grow with every new per-language image.
const RAW_ASSETS_BASE = "https://raw.githubusercontent.com/Vaibhav5771/react-native-toucana/dev/assets/images";

// A handful of lessons have gotten a one-off custom illustration instead of the
// shared generic scene above. Keyed by lesson id since each is unique, not reusable.
const LESSON_IMAGE_OVERRIDES: Record<string, string> = {
  "spanish-cafe": `${RAW_ASSETS_BASE}/spanish-madring.png`,
  "japanese-travel": `${RAW_ASSETS_BASE}/japanese-fuji.png`,
  "german-travel": `${RAW_ASSETS_BASE}/german-shopping.png`,
};

/** Picks a lesson's scene image: a per-lesson override, else a remote `imageUrl`, else its local `imageKey`, else the default. */
export function getLessonImageSource(lesson?: Pick<Lesson, "id" | "imageKey" | "imageUrl">) {
  if (lesson?.id && LESSON_IMAGE_OVERRIDES[lesson.id]) return { uri: LESSON_IMAGE_OVERRIDES[lesson.id] };
  if (lesson?.imageUrl) return { uri: lesson.imageUrl };
  if (lesson?.imageKey) return LESSON_SCENE_IMAGES[lesson.imageKey];
  return cafeScene;
}

const OFFICE_IMAGES: Partial<Record<LanguageId, string>> = {
  spanish: `${RAW_ASSETS_BASE}/spain-office.png`,
  japanese: `${RAW_ASSETS_BASE}/japan-office.png`,
  german: `${RAW_ASSETS_BASE}/german-office.png`,
};

/** The AI Teacher call background: a per-language office scene, falling back to the default. */
export function getOfficeImageSource(languageId?: LanguageId) {
  if (languageId && OFFICE_IMAGES[languageId]) return { uri: OFFICE_IMAGES[languageId] };
  return toucanOffice;
}
