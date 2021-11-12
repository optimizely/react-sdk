export interface iStoreState {
  lastUserUpdate?: Date | null;
}

export class Observable {
  private observers: Array<(state: iStoreState, prevState?: iStoreState) => void>;
  private state: iStoreState;

  constructor() {
    this.observers = [];
    this.state = {
      lastUserUpdate: null,
    };
  }

  subscribe(callback: (state: iStoreState, prevState?: iStoreState) => void) {
    this.observers.push(callback);
  }

  unsubscribe(callback: (state: iStoreState, prevState?: iStoreState) => void) {
    this.observers = this.observers.filter(observer => observer !== callback);
  }

  updateStore(newState: iStoreState) {
    return { ...this.state, ...newState };
  }

  setState(newStore: iStoreState) {
    const prevState = { ...this.state };
    this.state = this.updateStore(newStore);
    this.notify(prevState);
  }

  notify(prevState: iStoreState) {
    this.observers.forEach(callback => callback(this.state, prevState));
  }
}

const store = (function() {
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

export default store;
