export interface iStoreState {
  lastUserUpdate?: Date | null;
}

export class Observable {
  private observers: Array<{ callback: (state: iStoreState, prevState?: iStoreState) => void; flagKey: string }>;
  private state: iStoreState;

  constructor() {
    this.observers = [];
    this.state = {
      lastUserUpdate: null,
    };
  }

  subscribe(flagKey: string, callback: (state: iStoreState, prevState?: iStoreState) => void) {
    this.observers.push({ flagKey, callback });
  }

  unsubscribe(callback: (state: iStoreState, prevState?: iStoreState) => void) {
    this.observers = this.observers.filter(observer => observer.callback !== callback);
  }

  updateStore(newState: iStoreState) {
    return { ...this.state, ...newState };
  }

  setState(newStore: iStoreState, flagKey?: string) {
    const prevState = { ...this.state };
    this.state = this.updateStore(newStore);
    if (!flagKey) {
      this.notify(prevState);
    } else {
      // this.observers
      //   .filter(observer => observer.flagKey == flagKey)
      //   .forEach(obj => obj.callback(this.state, prevState));

      this.observers.forEach(observer => {
        if (observer.flagKey == flagKey) observer.callback(this.state, prevState);
      });
    }
  }

  notify(prevState: iStoreState) {
    this.observers.forEach(observer => observer.callback(this.state, prevState));
  }
}

const notifier = (function() {
  let instance: Observable;

  return {
    getInstance: function() {
      if (!instance) {
        instance = new Observable();
      }
      return instance;
    },
  };
})();

export default notifier;
