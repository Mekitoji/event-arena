import { Commands } from "./cmd.type";
import { SourceEvents } from "./events.type";

export type TEvent = Commands | SourceEvents;
export type Listener<T extends TEvent> = (e: T) => void;
