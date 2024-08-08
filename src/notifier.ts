/**
 * Copyright 2022, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

export interface INotifier {
  subscribe(key: string, callback: () => void): () => void;
  notify(key: string): void;
}

class Notifier implements INotifier {
  private observers: Array<{ subscriptionId: string; key: string; callback: () => void }> = [];
  private static instance: INotifier;

  private constructor() {}

  static getInstance(): INotifier {
    if (!Notifier.instance) {
      Notifier.instance = new Notifier();
    }
    return Notifier.instance;
  }

  subscribe(key: string, callback: () => void): () => void {
    const subscriptionId = `key-${Math.floor(100000 + Math.random() * 999999)}`;
    this.observers.push({ subscriptionId, key, callback });

    return () => {
      const observerIndex = this.observers.findIndex((observer) => observer.subscriptionId === subscriptionId);
      if (observerIndex >= 0) {
        this.observers.splice(observerIndex, 1);
      }
    };
  }

  notify(key: string) {
    this.observers.filter((observer) => observer.key === key).forEach((observer) => observer.callback());
  }
}

export const notifier: INotifier = Notifier.getInstance();
