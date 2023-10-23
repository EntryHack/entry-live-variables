export type EventMap = {
  // deno-lint-ignore no-explicit-any
  [key: string]: (...args: any[]) => void;
};

class TypedEmitter<Events extends EventMap> {
  #events = new Map<keyof Events, Events[keyof Events][]>();

  on<E extends keyof Events>(event: E, listener: Events[E]): this {
    const e = this.#events.get(event);

    if (e) e.push(listener);
    else this.#events.set(event, [listener]);

    return this;
  }
  once<E extends keyof Events>(event: E, listener: Events[E]): this {
    const _listener = ((...args: Parameters<Events[E]>) => {
      this.off(event, _listener);
      listener(...args);
    }) as Events[E];

    // deno-lint-ignore ban-ts-comment
    // @ts-ignore
    _listener._ = listener;

    return this.on(event, _listener);
  }
  emit<E extends keyof Events>(
    event: E,
    ...args: Parameters<Events[E]>
  ): this {
    const events = this.#events.get(event) ?? [];

    for (const listener of events) {
      listener(...args);
    }

    return this;
  }
  off<E extends keyof Events>(event: E, listener: Events[E]): this {
    const events = this.#events.get(event) ?? [];
    const liveEvents: Events[E][] = [];

    for (const _listener of events) {
      // deno-lint-ignore ban-ts-comment
      // @ts-ignore
      if (_listener !== listener && _listener._ !== listener) {
        liveEvents.push(_listener as Events[E]);
      }
    }

    if (liveEvents.length > 0) this.#events.set(event, liveEvents);
    else this.#events.delete(event);

    return this;
  }
}

export default TypedEmitter;
