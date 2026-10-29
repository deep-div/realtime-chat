import { type ChangeEvent, type FormEvent, useRef, useState } from "react";
import { Button } from "../../../components/ui/Button";
import { CameraIcon } from "../../../components/ui/CameraIcon";
import { Input } from "../../../components/ui/Input";
import { ApiError } from "../../../lib/api/client";
import { getAvatarColor } from "../../../lib/avatarColor";
import { useAuth } from "../../auth/hooks/useAuth";
import { createMyProfile, uploadMyAvatar } from "../api";

const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;

export function CompleteProfileForm() {
  const { user, refreshProfile } = useAuth();
  const emailInitial = user?.email?.trim().charAt(0).toUpperCase() ?? "?";
  const avatarColor = getAvatarColor(user?.uid ?? emailInitial);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      setError("Avatar must be under 5MB.");
      return;
    }

    setError(null);
    setAvatarFile(file);
    setAvatarPreview((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return URL.createObjectURL(file);
    });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await createMyProfile({
        username,
        display_name: displayName,
        bio: bio || undefined,
      });
      if (avatarFile) {
        await uploadMyAvatar(avatarFile);
      }
      await refreshProfile();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-sm animate-[fade-in-up_0.5s_ease-out] px-6">
      <div className="flex flex-col items-center gap-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight text-ink">
            Complete your profile
          </h2>
          <p className="mt-2 text-sm text-ink-muted">
            Add a photo and pick a username so others can find and recognize you.
          </p>
        </div>

        <div className="relative">
          <div
            className={`flex h-28 w-28 items-center justify-center overflow-hidden rounded-full ring-4 ring-surface shadow-lg shadow-primary/10 ${
              avatarPreview ? "bg-surface-muted" : avatarColor
            }`}
          >
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt="Avatar preview"
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-4xl font-semibold text-white">
                {emailInitial}
              </span>
            )}
          </div>
          <button
            type="button"
            aria-label="Upload avatar"
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md shadow-primary/40 ring-2 ring-surface transition-transform hover:scale-105 active:scale-95"
          >
            <CameraIcon className="h-4.5 w-4.5" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleAvatarChange}
            className="hidden"
          />
        </div>

        <form className="flex w-full flex-col gap-4" onSubmit={handleSubmit}>
          <Input
            id="username"
            label="Username"
            placeholder="riya_sharma"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            minLength={3}
            maxLength={20}
            required
          />
          <Input
            id="display-name"
            label="Display name"
            placeholder="Riya Sharma"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            minLength={1}
            maxLength={50}
            required
          />
          <Input
            id="bio"
            label="Bio (optional)"
            placeholder="Say something about yourself"
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            maxLength={150}
          />

          {error && <p className="text-sm text-red-500">{error}</p>}

          <Button type="submit" disabled={isSubmitting} className="mt-2 w-full">
            {isSubmitting ? "Please wait…" : "Continue"}
          </Button>
        </form>
      </div>
    </div>
  );
}
