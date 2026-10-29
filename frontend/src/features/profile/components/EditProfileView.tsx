import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from "react";
import { ArrowLeftIcon } from "../../../components/ui/ArrowLeftIcon";
import { Avatar } from "../../../components/ui/Avatar";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { LogOutIcon } from "../../../components/ui/LogOutIcon";
import { ApiError } from "../../../lib/api/client";
import { useAuth } from "../../auth/hooks/useAuth";
import { removeMyAvatar, updateMyProfile, uploadMyAvatar } from "../api";

const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;

interface EditProfileViewProps {
  onBack: () => void;
}

export function EditProfileView({ onBack }: EditProfileViewProps) {
  const { profile, refreshProfile, signOut } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [username, setUsername] = useState(profile?.username ?? "");
  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [status, setStatus] = useState(profile?.status ?? "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRemovingAvatar, setIsRemovingAvatar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarMenuRef = useRef<HTMLDivElement>(null);

  const avatarLabel = displayName || username || "?";
  const avatarSrc = avatarPreview ?? profile?.avatar_url ?? null;

  useEffect(() => {
    if (!isAvatarMenuOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (!avatarMenuRef.current?.contains(event.target as Node)) {
        setIsAvatarMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isAvatarMenuOpen]);

  async function handleRemoveAvatar() {
    setIsAvatarMenuOpen(false);
    setError(null);
    setAvatarFile(null);
    setAvatarPreview((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return null;
    });
    if (fileInputRef.current) fileInputRef.current.value = "";

    if (!profile?.avatar_url) return;
    setIsRemovingAvatar(true);
    try {
      await removeMyAvatar();
      await refreshProfile();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Could not remove photo. Please try again.");
      }
    } finally {
      setIsRemovingAvatar(false);
    }
  }

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

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto scrollbar-hide">
        <form className="flex flex-col gap-5 px-5 py-6" onSubmit={handleSubmit}>
          <div className="flex flex-col items-center gap-4 pb-2">
            <div className="relative" ref={avatarMenuRef}>
              <button
                type="button"
                aria-label="Edit photo"
                onClick={() => setIsAvatarMenuOpen((open) => !open)}
                className="block rounded-full transition-opacity hover:opacity-90"
              >
                <Avatar
                  src={avatarSrc}
                  label={avatarLabel}
                  className="h-28 w-28 ring-4 ring-surface shadow-xl shadow-primary/15"
                  textClassName="text-4xl"
                />
              </button>

              {isAvatarMenuOpen && (
                <div className="absolute left-1/2 top-full z-10 mt-2 w-44 -translate-x-1/2 overflow-hidden rounded-xl bg-surface py-1 shadow-lg ring-1 ring-border">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAvatarMenuOpen(false);
                      fileInputRef.current?.click();
                    }}
                    className="block w-full px-4 py-2.5 text-left text-sm font-medium text-ink hover:bg-surface-muted"
                  >
                    Upload photo
                  </button>
                  {avatarSrc && (
                    <button
                      type="button"
                      onClick={() => void handleRemoveAvatar()}
                      disabled={isRemovingAvatar}
                      className="block w-full px-4 py-2.5 text-left text-sm font-medium text-red-500 hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isRemovingAvatar ? "Removing…" : "Remove photo"}
                    </button>
                  )}
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>
          </div>

          <div className="flex flex-col gap-4">
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

        <div className="mt-auto border-t border-border px-5 py-5">
          <button
            type="button"
            onClick={() => void handleSignOut()}
            disabled={isSigningOut}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-surface-muted px-4 py-3 text-sm font-semibold text-ink transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            <LogOutIcon className="h-4.5 w-4.5" />
            {isSigningOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </div>
    </div>
  );
}
