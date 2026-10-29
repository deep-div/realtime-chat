import { type ChangeEvent, type FormEvent, useRef, useState } from "react";
import { ArrowLeftIcon } from "../../../components/ui/ArrowLeftIcon";
import { Avatar } from "../../../components/ui/Avatar";
import { Button } from "../../../components/ui/Button";
import { CameraIcon } from "../../../components/ui/CameraIcon";
import { Input } from "../../../components/ui/Input";
import { LogOutIcon } from "../../../components/ui/LogOutIcon";
import { ApiError } from "../../../lib/api/client";
import { useAuth } from "../../auth/hooks/useAuth";
import { updateMyProfile, uploadMyAvatar } from "../api";

const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;

interface EditProfileViewProps {
  onBack: () => void;
}

export function EditProfileView({ onBack }: EditProfileViewProps) {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [username, setUsername] = useState(profile?.username ?? "");
  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [status, setStatus] = useState(profile?.status ?? "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const avatarLabel = displayName || username || "?";
  const avatarSrc = avatarPreview ?? profile?.avatar_url ?? null;

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

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      await signOut();
    } finally {
      setIsSigningOut(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await updateMyProfile({
        username,
        display_name: displayName,
        bio: bio || undefined,
        status: status || undefined,
      });
      if (avatarFile) {
        await uploadMyAvatar(avatarFile);
      }
      await refreshProfile();
      onBack();
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
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-3 border-b border-border px-5 py-4">
        <button
          type="button"
          aria-label="Back"
          onClick={onBack}
          className="flex h-8 w-8 items-center justify-center rounded-full text-ink-muted hover:bg-surface-muted"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <span className="text-base font-semibold text-ink">Profile</span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <form className="flex flex-col gap-5 px-5 py-6" onSubmit={handleSubmit}>
          <div className="flex flex-col items-center gap-4 pb-2">
            <div className="relative">
              <Avatar
                src={avatarSrc}
                label={avatarLabel}
                className="h-28 w-28 ring-4 ring-surface shadow-xl shadow-primary/15"
                textClassName="text-4xl"
              />
              <button
                type="button"
                aria-label="Change avatar"
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
            <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
              Tap the camera to change your photo
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
              Your info
            </p>
            <Input
              id="edit-username"
              label="Username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              minLength={3}
              maxLength={20}
              required
            />
            <Input
              id="edit-display-name"
              label="Display name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              minLength={1}
              maxLength={50}
              required
            />
            <Input
              id="edit-status"
              label="Status"
              placeholder="Available"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              maxLength={50}
            />
            <Input
              id="edit-bio"
              label="Bio"
              placeholder="Say something about yourself"
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              maxLength={150}
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <Button type="submit" disabled={isSubmitting} className="mt-1 w-full">
            {isSubmitting ? "Saving…" : "Save changes"}
          </Button>
        </form>

        <div className="mt-auto flex flex-col gap-3 border-t border-border px-5 py-5">
          {user?.email && (
            <div className="flex flex-col gap-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Account
              </p>
              <p className="text-sm text-ink-muted">{user.email}</p>
            </div>
          )}

          <button
            type="button"
            onClick={() => void handleSignOut()}
            disabled={isSigningOut}
            className="flex items-center gap-2 rounded-xl px-2 py-2 text-sm font-semibold text-red-500 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <LogOutIcon className="h-4.5 w-4.5" />
            {isSigningOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </div>
    </div>
  );
}
