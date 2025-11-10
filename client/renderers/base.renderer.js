/**
 * Base renderer class - defines common interface
 */
export class BaseRenderer {
  constructor(ctx, gameState) {
    this.ctx = ctx;
    this.gameState = gameState;
  }

  render() {
    throw new Error('render() must be implemented by subclass');
  }
}
