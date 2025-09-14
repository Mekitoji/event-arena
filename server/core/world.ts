import { Vec2 } from './types/vec2.type';
import { Player } from '../entities/player';
import { Projectile } from '../entities/projectile';

export type EntityId = string;

type Pickup = { id: string; pos: Vec2; kind: 'heal' | 'haste' | 'shield' };

export const DEFAULT_WIDTH = 2000;
export const DEFAULT_HEIGH = 1200;

type MapObstacleRect = {
  type: 'rect';
  x: number;
  y: number;
  w: number;
  h: number;
};
// Future: type MapObstacleSeg = { type: 'seg', x1:number,y1:number,x2:number,y2:number };

export const World = {
  players: new Map<EntityId, Player>(),
  projectiles: new Map<EntityId, Projectile>(),
  pickups: new Map<EntityId, Pickup>(),
  bounds: { w: DEFAULT_WIDTH, h: DEFAULT_HEIGH },
  map: {
    obstacles: [
      { type: 'rect', x: 600, y: 200, w: 200, h: 80 } as MapObstacleRect,
      { type: 'rect', x: 1200, y: 600, w: 140, h: 280 } as MapObstacleRect,
      { type: 'rect', x: 900, y: 350, w: 250, h: 60 } as MapObstacleRect,
      { type: 'rect', x: 300, y: 800, w: 180, h: 140 } as MapObstacleRect,
    ],
  },
};
