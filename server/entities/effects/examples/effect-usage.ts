import { Player } from '../../player';
import { Vec2 } from '../../../core/types/vec2.type';
import {
  EffectFactory,
  EffectCombinations,
  EffectType,
  EffectEvent,
  DashTrailEffect,
} from '../index';

/**
 * Example usage of the Effect Manager system
 */
export class EffectUsageExamples {
  /**
   * Example: Creating a player and applying damage with effects
   */
  static exampleDamageApplication() {
    const player = new Player('player1', 'TestPlayer', { x: 100, y: 100 });

    // Apply damage from a rocket with knockback
    const knockbackDirection: Vec2 = { x: 1, y: 0 };
    const wasDead = player.takeDamage(35, 'rocket', knockbackDirection);

    console.log(`Player took damage. Dead: ${wasDead}`);
    console.log(`Active effects: ${player.effects.getEffectCount()}`);

    // The takeDamage method automatically creates:
    // - Damage flash effect
    // - Knockback effect
    // - Camera shake effect (for significant damage)
  }

  /**
   * Example: Applying buffs with visual effects
   */
  static exampleBuffApplication() {
    const player = new Player('player2', 'BuffedPlayer', { x: 200, y: 200 });

    // Apply haste buff (includes visual trail effect)
    player.applyHaste(5000, 1.8); // 5 seconds, 1.8x speed

    // Apply shield buff (includes glow effect)
    player.applyShield(8000); // 8 seconds

    // Apply dash with trail and invulnerability effects
    player.applyDash(300, 3.0, true); // 300ms dash with iframes

    console.log(`Player has ${player.effects.getEffectCount()} active effects`);
    console.log(
      'Effect types:',
      player.effects.getAllEffects().map((e) => e.type),
    );
  }

  /**
   * Example: Manual effect creation and management
   */
  static exampleManualEffectCreation() {
    const player = new Player('player3', 'ManualPlayer', { x: 300, y: 300 });

    // Create custom explosion effect at player position
    const explosion = EffectFactory.createExplosion(
      player.id,
      player.pos,
      75, // radius
      50, // damage
      '#ff4400', // custom color
    );

    player.addEffect(explosion);

    // Create spark effect for projectile bounce
    const spark = EffectFactory.createSpark(
      { x: player.pos.x + 20, y: player.pos.y },
      { x: -1, y: 0.5 }, // direction
    );

    player.addEffect(spark);

    // Listen to effect events
    player.effects.on(EffectEvent.ADDED, (effect) => {
      console.log(`Effect added: ${effect.type}`);
    });

    player.effects.on(EffectEvent.EXPIRED, (effect) => {
      console.log(`Effect expired: ${effect.type}`);
    });
  }

  /**
   * Example: Dash trail management during movement
   */
  static exampleDashTrailUpdate() {
    const player = new Player('player4', 'DashPlayer', { x: 400, y: 400 });

    // Start dash
    player.applyDash(500); // 500ms dash

    // Simulate movement updates during dash
    const updateInterval = setInterval(() => {
      // Move player
      player.pos.x += 5;
      player.pos.y += 2;

      // Update effects (this will update dash trail positions)
      player.updateEffects();

      // Get dash trail effect
      const dashTrail = player.effects.getEffectByType(
        EffectType.DASH_TRAIL,
      ) as DashTrailEffect;
      if (dashTrail) {
        console.log(
          `Dash trail has ${dashTrail.data.positions?.length} position points`,
        );
      }

      // Stop when dash ends
      if (!player.isDashing()) {
        clearInterval(updateInterval);
        console.log('Dash ended, trail will fade out');
      }
    }, 16); // ~60fps updates
  }

  /**
   * Example: Complex effect combinations
   */
  static exampleComplexScenario() {
    const player = new Player('player5', 'ComplexPlayer', { x: 500, y: 500 });

    // Player gets hit by rocket explosion
    const explosionEffects = EffectCombinations.createDamageEffects(
      player.id,
      40,
      'explosion',
      { x: -0.7, y: -0.7 },
    );

    explosionEffects.forEach((effect) => player.addEffect(effect));

    // Player dies from damage
    if (player.hp <= 0) {
      player.die(); // This creates death effects automatically
    }

    // Simulate effect updates over time
    let time = 0;
    const simulationInterval = setInterval(() => {
      player.updateEffects();
      time += 50;

      console.log(
        `Time: ${time}ms, Active effects: ${player.effects.getEffectCount()}`,
      );

      if (time >= 1000) {
        clearInterval(simulationInterval);
        console.log('Simulation ended');
        console.log('Final effect summary:', player.effects.getDebugSummary());
      }
    }, 50);
  }

  /**
   * Example: Effect serialization for network transmission
   */
  static exampleEffectSerialization() {
    const player = new Player('player6', 'NetworkPlayer', { x: 600, y: 600 });

    // Add various effects
    player.takeDamage(25, 'rocket', { x: 1, y: 0 });
    player.applyHaste(3000);
    player.heal(15);

    // Get effects in JSON format for network transmission
    const effectsJson = player.getActiveEffects();
    console.log('Effects for network:', JSON.stringify(effectsJson, null, 2));

    // Check specific effects
    console.log('Has damage flash:', player.hasEffect(EffectType.DAMAGE_FLASH));
    console.log('Has haste trail:', player.hasEffect(EffectType.HASTE_TRAIL));
    console.log('Has heal pulse:', player.hasEffect(EffectType.HEAL_PULSE));
  }

  /**
   * Run all examples
   */
  static runAllExamples() {
    console.log('=== Damage Application Example ===');
    this.exampleDamageApplication();

    console.log('\n=== Buff Application Example ===');
    this.exampleBuffApplication();

    console.log('\n=== Manual Effect Creation Example ===');
    this.exampleManualEffectCreation();

    console.log('\n=== Effect Serialization Example ===');
    this.exampleEffectSerialization();

    // Note: Dash trail and complex scenario examples use timers
    // so they would need to be run separately in a real environment
  }
}

// Example usage:
// EffectUsageExamples.runAllExamples();
