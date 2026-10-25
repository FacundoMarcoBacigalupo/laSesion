import Matter from 'matter-js';

export function createCauldron(canvas: HTMLCanvasElement) {
  const engine = Matter.Engine.create();
  const W = canvas.width; const H = canvas.height;
  const world = engine.world;
  // walls
  const wallOpts = { isStatic: true, restitution: 0.4, friction: 0.1 };
  Matter.World.add(world, [
    Matter.Bodies.rectangle(W / 2, H + 10, W, 20, wallOpts), // floor
    Matter.Bodies.rectangle(-10, H / 2, 20, H, wallOpts),
    Matter.Bodies.rectangle(W + 10, H / 2, 20, H, wallOpts),
  ]);
  // cauldron curve approximated by static segments
  return { engine, world, W, H };
}

export function addBody(world: any, x: number, y: number, r: number, emoji: string) {
  const body = Matter.Bodies.circle(x, y, r, { restitution: 0.4, friction: 0.1 });
  (body as any).emoji = emoji;
  Matter.World.add(world, body);
  return body;
}