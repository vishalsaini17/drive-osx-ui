type EventCallback<T = any> = (data: T) => void;

class EventBusService {
  private listeners: Record<string, EventCallback[]> = {};

  /**
   * Subscribe to a system event
   */
  public on<T = any>(event: string, callback: EventCallback<T>): () => void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);

    // Return an unsubscribe function
    return () => {
      this.off(event, callback);
    };
  }

  /**
   * Unsubscribe from a system event
   */
  public off<T = any>(event: string, callback: EventCallback<T>): void {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }

  /**
   * Publish/Emit a system event
   */
  public emit<T = any>(event: string, data?: T): void {
    if (!this.listeners[event]) return;
    // Execute all callbacks safely
    this.listeners[event].forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error executing event listener for ${event}:`, error);
      }
    });
  }

  /**
   * Clear all subscribers
   */
  public clear(): void {
    this.listeners = {};
  }
}

export const EventBus = new EventBusService();
