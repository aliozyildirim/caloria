// Global event emitter for onboarding completion
class OnboardingEvents {
  private listeners: Array<() => void> = [];

  addListener(callback: () => void): () => void {
    this.listeners.push(callback);
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  emit(): void {
    this.listeners.forEach(callback => callback());
  }
}

export const onboardingEvents = new OnboardingEvents();
