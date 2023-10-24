import { LiveListInfo, LiveVariableInfo } from "./client.ts";
import { LiveVariableError } from "./error.ts";
import textEllipsis from "./utils/text-ellipsis.ts";
import TypedEmitter from "./utils/typed-emitter.ts";

export class LiveVariable extends TypedEmitter<{
  change: (value: string) => void | Promise<void>;
}> {
  #socket: SocketIOClient.Socket;
  readonly _id: string;
  readonly id: string;
  #value: string;

  constructor(info: LiveVariableInfo, socket: SocketIOClient.Socket) {
    super();

    this.on("change", (value) => void (this.#value = value));

    this.#socket = socket;
    this._id = info._id;
    this.id = info.id;
    this.#value = info.value;
  }

  get value() {
    return this.#value;
  }

  setValue(value: string) {
    return new Promise<string>((res, rej) => {
      this.#socket.emit(
        "action",
        {
          type: "set",
          _id: this._id,
          id: this.id,
          value,
          variableType: "variable",
        },
        (success: boolean, { value }: { value: string }) => {
          if (success) {
            this.#value = value;
            res(value);
          } else rej(LiveVariableError.SET_VARIABLE_FAILED);
        },
      );
    });
  }

  toString() {
    return `LiveVariable(${this.id}: ${textEllipsis(this.value, 10)})`;
  }

  toJSON() {
    return {
      id: this.id,
      value: this.value,
    };
  }
}

export class LiveList extends TypedEmitter<{
  change: (value: string[]) => void | Promise<void>;
}> {
  #socket: SocketIOClient.Socket;
  readonly _id: string;
  readonly id: string;
  #value: [string, string][];

  constructor(info: LiveListInfo, socket: SocketIOClient.Socket) {
    super();

    this.on(
      // deno-lint-ignore ban-ts-comment
      // @ts-ignore
      "__change_append",
      (key: string, data: string) => {
        this.#value.push([key, data]);
        this.emit("change", this.#value.map((v) => v[1]));
      },
    );
    this.on(
      // deno-lint-ignore ban-ts-comment
      // @ts-ignore
      "__change_delete",
      (index: number) => {
        this.#value.splice(index, 1);
        this.emit("change", this.#value.map((v) => v[1]));
      },
    );
    this.on(
      // deno-lint-ignore ban-ts-comment
      // @ts-ignore
      "__change_insert",
      (index: number, key: string, data: string) => {
        this.#value.splice(index, 0, [key, data]);
        this.emit("change", this.#value.map((v) => v[1]));
      },
    );
    this.on(
      // deno-lint-ignore ban-ts-comment
      // @ts-ignore
      "__change_replace",
      (key: string, newKey: string, data: string) => {
        const index = this.#value.findIndex((v) => v[0] === key);
        this.#value[index] = [newKey, data];
        this.emit("change", this.#value.map((v) => v[1]));
      },
    );

    this.#socket = socket;
    this._id = info._id;
    this.id = info.id;
    this.#value = info.list?.map((key) => {
      const item = info.value[key];
      return [key, item];
    }) ?? [];
  }

  get value() {
    return this.#value.map((v) => v[1]);
  }

  appendValue(value: string) {
    return new Promise<string[]>((res, rej) => {
      this.#socket.emit(
        "action",
        {
          type: "append",
          _id: this._id,
          id: this.id,
          data: value,
          variableType: "list",
        },
        (
          success: boolean,
          { key, data }: { key: string; data: string },
        ) => {
          if (success) {
            this.#value.push([key, data]);
            this.emit("change", this.#value.map((v) => v[1]));
            res(this.#value.map((v) => v[1]));
          } else rej(LiveVariableError.SET_LIST_FAILED);
        },
      );
    });
  }

  deleteValue(index: number) {
    return new Promise<string[]>((res, rej) => {
      this.#socket.emit(
        "action",
        {
          type: "delete",
          _id: this._id,
          id: this.id,
          index,
          variableType: "list",
        },
        (
          success: boolean,
          { index }: { index: number },
        ) => {
          if (success) {
            this.#value.splice(index, 1);
            this.emit("change", this.#value.map((v) => v[1]));
            res(this.#value.map((v) => v[1]));
          } else rej(LiveVariableError.SET_LIST_FAILED);
        },
      );
    });
  }

  insertValue(index: number, value: string) {
    return new Promise<string[]>((res, rej) => {
      this.#socket.emit(
        "action",
        {
          type: "insert",
          _id: this._id,
          id: this.id,
          index,
          data: value,
          variableType: "list",
        },
        (
          success: boolean,
          { index, key, data }: { index: number; key: string; data: string },
        ) => {
          if (success) {
            this.#value.splice(index, 0, [key, data]);
            this.emit("change", this.#value.map((v) => v[1]));
            res(this.#value.map((v) => v[1]));
          } else rej(LiveVariableError.SET_LIST_FAILED);
        },
      );
    });
  }

  replaceValue(index: number, value: string) {
    return new Promise<string[]>((res, rej) => {
      const key = this.#value[index][0];
      this.#socket.emit(
        "action",
        {
          type: "replace",
          _id: this._id,
          id: this.id,
          key,
          data: value,
          variableType: "list",
        },
        (
          success: boolean,
          { key, newKey, data }: { key: string; newKey: string; data: string },
        ) => {
          if (success) {
            const index = this.#value.findIndex((v) => v[0] === key);
            this.#value[index] = [newKey, data];
            this.emit("change", this.#value.map((v) => v[1]));
            res(this.#value.map((v) => v[1]));
          } else rej(LiveVariableError.SET_LIST_FAILED);
        },
      );
    });
  }

  toString() {
    return `LiveList(${this.id}: [${
      textEllipsis(Object.values(this.#value).join(", "), 10)
    }])`;
  }

  toJSON() {
    return {
      id: this.id,
      value: this.#value,
    };
  }
}
