import type { UserProfile } from '@optimizely/react-sdk';

// TODO: UserProfileServiceAsync should be exported from @optimizely/optimizely-sdk (missing from export_types)
interface UserProfileServiceAsync {
  lookup(userId: string): Promise<UserProfile>;
  save(profile: UserProfile): Promise<void>;
}

export class AsyncUserProfileService implements UserProfileServiceAsync {
  private store = new Map<string, UserProfile>();
  private delayMs: number;

  constructor(delayMs = 500) {
    this.delayMs = delayMs;
  }

  async lookup(userId: string): Promise<UserProfile> {
    await new Promise((resolve) => setTimeout(resolve, this.delayMs));
    return (
      this.store.get(userId) ?? {
        user_id: userId,
        experiment_bucket_map: {},
      }
    );
  }

  async save(profile: UserProfile): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, this.delayMs));
    this.store.set(profile.user_id, profile);
  }
}
