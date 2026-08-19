let taskbarEnabled = true;

export function isTaskbarEnabled(): boolean {
  return taskbarEnabled;
}

export function setTaskbarEnabled(enabled: boolean): void {
  taskbarEnabled = enabled;
}
