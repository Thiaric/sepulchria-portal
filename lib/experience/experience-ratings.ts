export type ExperienceRating = {
  value: 1 | 2 | 3 | 4 | 5;
  label: string;
  description: string;
  imageSrc: string;
  fallback: string;
};

export const EXPERIENCE_FEEDBACK_COOLDOWN_DAYS = 7;

export const EXPERIENCE_RATINGS: ExperienceRating[] = [
  {
    value: 1,
    label: "Very bad",
    description: "A frustrating or unpleasant experience.",
    imageSrc: "/icons/satisfaction/1-very-bad.png",
    fallback: "😡",
  },
  {
    value: 2,
    label: "Not great",
    description: "Below expectations, with noticeable issues.",
    imageSrc: "/icons/satisfaction/2-not-great.png",
    fallback: "🙁",
  },
  {
    value: 3,
    label: "Okay",
    description: "Fine overall, with room to improve.",
    imageSrc: "/icons/satisfaction/3-okay.png",
    fallback: "😐",
  },
  {
    value: 4,
    label: "Good",
    description: "A pleasant and satisfying session.",
    imageSrc: "/icons/satisfaction/4-good.png",
    fallback: "🙂",
  },
  {
    value: 5,
    label: "Great",
    description: "A very positive and enjoyable experience.",
    imageSrc: "/icons/satisfaction/5-great.png",
    fallback: "🥰",
  },
];
