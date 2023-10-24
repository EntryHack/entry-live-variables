import { io } from "./deps.ts";
import { LiveVariableError } from "./error.ts";
import { graphql } from "./utils/graphql.ts";
import TypedEmitter from "./utils/typed-emitter.ts";
import { LiveList, LiveVariable } from "./variable.ts";

interface LiveVariableClientConnectOptions {
  io?: {
    uri?: string;
    path?: string;
  };
}

export interface LiveVariableInfo {
  _id: string;
  id: string;
  value: string;
  variableType: "variable";
}

export interface LiveListInfo {
  _id: string;
  id: string;
  list: string[];
  value: Record<string, string>;
  variableType: "list";
}

interface UpdatedLiveListInfo {
  _id: string;
  id: string;
  array: { _key: string; data: string }[];
  variableType: "list";
}

export class LiveVariableClient extends TypedEmitter<{
  connect: (variables: (LiveVariable | LiveList)[]) => void | Promise<void>;
  valueChange: (variable: LiveVariable, value: string) => void | Promise<void>;
}> {
  #socket?: SocketIOClient.Socket;
  #credentials?: { username: string; password: string };
  #variables = new Map<string, LiveVariable>();
  #lists = new Map<string, LiveList>();
  #connected = false;

  constructor() {
    super();
  }

  setCredentials(username: string, password: string) {
    this.#credentials = { username, password };
    return this;
  }

  get variables() {
    return this.#variables;
  }

  get lists() {
    return this.#lists;
  }

  async connect(
    projectId: string,
    options?: Partial<LiveVariableClientConnectOptions>,
  ) {
    if (!this.#credentials) {
      throw new Error(LiveVariableError.CREDENTIALS_NOT_SET);
    }
    const query = await graphql<{ cloudServerInfo: { query: string } }>(
      this.#credentials.username,
      this.#credentials.password,
      `query($id:ID!){cloudServerInfo(id:$id){query}}`,
      { id: projectId },
    );

    const socket = io(options?.io?.uri ?? "wss://playentry.org", {
      transports: ["websocket"],
      path: options?.io?.path ?? "/cv",
      query: { q: query.cloudServerInfo.query },
    });

    socket.on(
      "action",
      (
        res: {
          type: string;
          _id: string;
          id: string;
          value?: string;
          data?: string;
          key?: string;
          newKey?: string;
          index?: number;
          variableType: "variable" | "list";
        },
      ) => {
        if (res.variableType === "variable" && res.value) {
          this.#variables.get(res.id)?.emit("change", res.value);
        }
        if (res.variableType === "list") {
          if (res.type === "append" && res.key && res.data) {
            this.#lists.get(res.id)?.emit(
              // deno-lint-ignore ban-ts-comment
              // @ts-ignore
              "__change_append",
              res.key,
              // deno-lint-ignore ban-ts-comment
              // @ts-ignore
              res.data,
            );
          }
          if (res.type === "delete" && res.index !== undefined) {
            this.#lists.get(res.id)?.emit(
              // deno-lint-ignore ban-ts-comment
              // @ts-ignore
              "__change_delete",
              res.index,
            );
          }
          if (
            res.type === "insert" && res.index !== undefined && res.key &&
            res.data
          ) {
            this.#lists.get(res.id)?.emit(
              // deno-lint-ignore ban-ts-comment
              // @ts-ignore
              "__change_insert",
              res.index,
              // deno-lint-ignore ban-ts-comment
              // @ts-ignore
              res.key,
              res.data,
            );
          }
          if (res.type === "replace" && res.key && res.newKey && res.data) {
            this.#lists.get(res.id)?.emit(
              // deno-lint-ignore ban-ts-comment
              // @ts-ignore
              "__change_replace",
              res.key,
              // deno-lint-ignore ban-ts-comment
              // @ts-ignore
              res.newKey,
              res.data,
            );
          }
        }
      },
    );

    socket.on(
      "welcome",
      (
        res: {
          variables: (LiveVariableInfo | LiveListInfo | UpdatedLiveListInfo)[];
        },
      ) => {
        const variables: (LiveVariable | LiveList)[] = res.variables
          .map(
            (variable) => {
              if (variable.variableType === "variable") {
                return new LiveVariable(variable, socket);
              } else if ("array" in variable) {
                const value: Record<string, string> = variable.array.reduce(
                  (prev, curr) => {
                    prev[curr._key] = curr.data;
                    return prev;
                  },
                  {} as Record<string, string>,
                );

                return new LiveList({
                  _id: variable._id,
                  id: variable.id,
                  list: Object.keys(value),
                  value,
                  variableType: "list",
                }, socket);
              } else return new LiveList(variable, socket);
            },
          );

        for (
          const variable of variables.filter((v): v is LiveVariable =>
            v instanceof LiveVariable
          )
        ) {
          this.#variables.set(variable.id, variable);
        }
        for (
          const list of variables.filter((v): v is LiveList =>
            v instanceof LiveList
          )
        ) {
          this.#lists.set(list.id, list);
        }

        this.#socket = socket;
        this.#connected = true;
        this.emit("connect", variables);
      },
    );

    this.#socket = socket;

    return this;
  }

  whenConnected() {
    return new Promise<void>((res) => {
      if (this.#connected) res();
      else this.once("connect", () => res());
    });
  }
}
