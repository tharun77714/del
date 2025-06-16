import type { Profile } from '@/contexts/AuthContext';

export interface Conversation {
  id: string; // UUID
  participant1_id: string;
  participant2_id: string;
  last_message_content?: string | null; // From DB
  last_message_at: string; // ISO Date string
  created_at: string; // ISO Date string
}

export interface Message {
  id: string; // UUID
  conversation_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  image_url?: string;
  message_type: 'text' | 'image';
  created_at: string; // ISO Date string
  is_read: boolean;
  updated_at?: string;
  // Populated client-side or via join for display
  sender?: Pick<Profile, 'id' | 'full_name' | 'business_name' | 'role'>;
}

// For displaying a list of conversations in the sidebar
// Includes details of the OTHER participant
export interface ConversationView extends Conversation {
  otherParticipant: Pick<Profile, 'id' | 'full_name' | 'business_name' | 'role' | 'email'>;
  unread_count: number; // Calculated or fetched
}
