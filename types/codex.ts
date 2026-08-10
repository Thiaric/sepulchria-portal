export type CodexEntryBase = {
  id: string;
  name: string;
  slug: string;
  summary: string;
  description: string;
  image_url: string | null;
  banner_url: string | null;
  icon_url: string | null;
  colour: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type Race =
  CodexEntryBase & {
    min_age: number | null;
    max_age: number | null;
  };

export type Association =
  CodexEntryBase;

export type RaceOption = Pick<
  Race,
  | "id"
  | "name"
  | "slug"
  | "summary"
  | "icon_url"
  | "colour"
  | "min_age"
  | "max_age"
>;

export type AssociationOption =
  Pick<
    Association,
    | "id"
    | "name"
    | "slug"
    | "summary"
    | "icon_url"
    | "colour"
  >;
