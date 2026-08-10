export type TidingPriority =
  | "normal"
  | "important"
  | "urgent";

export type Tiding = {
  id: string;
  title: string;
  message: string;
  priority: TidingPriority;
  is_active: boolean;
  starts_at: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};
