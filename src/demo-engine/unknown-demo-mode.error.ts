export class UnknownDemoModeError extends Error {
  constructor(public readonly mode: string) {
    super(`Unknown demo mode: ${mode}`);
    this.name = 'UnknownDemoModeError';
  }
}
