export type MessageActionState = {
  ok: boolean;
  message: string;
  submittedAt?: number;
};

export type ConversationSummary = {
  id: string;
  updated_at: string;
  archived_by_me: boolean;
  unread_count: number;
  other_character: {
    id: string;
    display_name: string;
    portrait_url: string | null;
  } | null;
  last_message: {
    body: string;
    created_at: string;
    sender_character_id: string;
  } | null;
};

export type DirectMessage = {
  id: string;
  body: string;
  created_at: string;
  sender_character_id: string;
  sender: {
    id: string;
    display_name: string;
    portrait_url: string | null;
  } | {
    id: string;
    display_name: string;
    portrait_url: string | null;
  }[] | null;
};
