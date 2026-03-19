export type ConversationType = "direct" | "group";

export interface Profile {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  status: string | null;
  updated_at: string;
  do_not_disturb?: boolean;
  banned_until?: string | null;
  is_premium?: boolean;
}

export interface Conversation {
  id: string;
  type: ConversationType;
  name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Participant {
  conversation_id: string;
  user_id: string;
  joined_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  attachment_url: string | null;
  created_at: string;
  is_read: boolean;
  edited_at: string | null;
  reply_to_id: string | null;
  hidden?: boolean;
}

export interface MessageReaction {
  message_id: string;
  user_id: string;
  emoji: string;
}

export interface ConversationPin {
  conversation_id: string;
  message_id: string;
  pinned_by: string;
  pinned_at: string;
}
