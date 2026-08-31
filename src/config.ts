let taskbarEnabled = true;

const configListeners = new Set<() => void>();

export function isTaskbarEnabled(): boolean {
  return taskbarEnabled;
}

/**
 * Subscribes to global taskbar enable/disable. Fired on every
 * `setTaskbarEnabled` call; subscribers re-read the flag themselves.
 * Returns an unsubscribe function.
 */
export function onTaskbarConfigChange(listener: () => void): () => void {
  configListeners.add(listener);
  return () => {
    configListeners.delete(listener);
  };
}

export function setTaskbarEnabled(enabled: boolean): void {
  taskbarEnabled = enabled;
  for (const listener of [...configListeners]) {
    listener();
  }
}
