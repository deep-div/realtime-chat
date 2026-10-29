import { ApiError, apiFetch } from "../../lib/api/client";
import type { CreateProfileInput, Profile } from "./types";

/** Fetches the current user's backend profile, or null if they haven't completed it yet. */
export async function getMyProfile(): Promise<Profile | null> {
  try {
    return await apiFetch<Profile>("/users/me");
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function createMyProfile(input: CreateProfileInput): Promise<Profile> {
  return apiFetch<Profile>("/users/me", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function uploadMyAvatar(file: File): Promise<Profile> {
  const formData = new FormData();
  formData.append("file", file);
  return apiFetch<Profile>("/users/me/avatar", {
    method: "POST",
    body: formData,
  });
}
