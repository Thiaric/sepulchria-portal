export function shapeSchoolBorderClass(
  school: string | null | undefined,
) {
  const key =
    String(school ?? "")
      .trim()
      .toLowerCase();

  if (
    key === "embercraft" ||
    key === "vitalcraft" ||
    key === "mindcraft" ||
    key === "veilcraft" ||
    key === "waycraft" ||
    key === "bondcraft" ||
    key === "runecraft"
  ) {
    return `shape-school-card shape-school-${key}`;
  }

  return "shape-school-card shape-school-default";
}
