export interface Profile {
  user_id: string;
  username: string;
  display_name: string;
  bio: string | null;
  status: string | null;
  avatar_url: string | null;
  created_at: number;
  updated_at: number;
}

export interface CreateProfileInput {
  username: string;
  display_name: string;
  bio?: string;
  status?: string;
}
