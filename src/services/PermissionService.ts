import { AppRegistry } from '../core/AppRegistry';

export type PermissionStatus = 'granted' | 'denied' | 'prompt';

class PermissionServiceClass {
  // Store dynamic permissions state (e.g. user overrides)
  private userPermissions: Record<string, Record<string, PermissionStatus>> = {};

  /**
   * Check if an app has a specific permission
   */
  public hasPermission(appId: string, permission: string): boolean {
    const manifest = AppRegistry.getAppManifest(appId);
    if (!manifest) return false;

    // Standard system permission rules
    const declaredPermissions = manifest.permissions || [];
    if (!declaredPermissions.includes(permission) && permission !== 'basic') {
      return false; // Not declared in manifest
    }

    // Check if there is a user override
    const userOverride = this.userPermissions[appId]?.[permission];
    if (userOverride === 'denied') return false;
    if (userOverride === 'granted') return true;

    // Default to granted if declared in manifest for now, or could require prompt
    return true;
  }

  /**
   * Request permission for an application
   */
  public requestPermission(appId: string, permission: string): Promise<boolean> {
    return new Promise((resolve) => {
      const manifest = AppRegistry.getAppManifest(appId);
      if (!manifest) {
        resolve(false);
        return;
      }

      const declared = manifest.permissions || [];
      if (!declared.includes(permission)) {
        resolve(false);
        return;
      }

      // Initialize override storage if missing
      if (!this.userPermissions[appId]) {
        this.userPermissions[appId] = {};
      }

      // Automatically grant or could trigger a modal prompt. We can trigger an EventBus notification
      this.userPermissions[appId][permission] = 'granted';
      resolve(true);
    });
  }

  /**
   * Revoke a permission for an app
   */
  public revokePermission(appId: string, permission: string): void {
    if (!this.userPermissions[appId]) {
      this.userPermissions[appId] = {};
    }
    this.userPermissions[appId][permission] = 'denied';
  }
}

export const PermissionService = new PermissionServiceClass();
