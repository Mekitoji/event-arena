import { Vec2 } from "./vec2.type";

export type CmdType = `cmd:${string}`;
export type SkillType = `skill:${string}`;

export const Skills: Record<Uppercase<string>, SkillType> = {
  SHOOT: 'skill:shoot',
  SHOTGUN: 'skill:shotgun',
  ROCKET: 'skill:rocket',
  DASH: 'skill:dash',
  NOVA: 'skill:nova',
} as const;

export type ESkills = typeof Skills[keyof typeof Skills];

export type BaseCmd<T extends CmdType, P extends object = object> = { type: T } & P;

export type CmdJoin = BaseCmd<'cmd:join', { name: string }>;
export type CmdMove = BaseCmd<'cmd:move', { playerId: string, dir: Vec2 }>;
export type CmdCast = BaseCmd<'cmd:cast', { playerId: string, skill: ESkills }>;
export type CmdLeave = BaseCmd<'cmd:leave', { playerId: string }>;
export type CmdRespawn = BaseCmd<'cmd:respawn', { playerId: string }>;
export type CmdAim = BaseCmd<'cmd:aim', { playerId: string, dir: Vec2 }>;

export type Commands = CmdJoin | CmdMove | CmdCast | CmdLeave | CmdRespawn | CmdAim;
