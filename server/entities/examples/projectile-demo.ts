import { Projectile } from '../projectile';
import { Vec2 } from '../../core/types/vec2.type';

/**
 * Demonstration of the Projectile entity class
 * Shows how projectiles are now properly encapsulated with behavior
 */

function demonstrateProjectileTypes() {
  console.log('=== Projectile Types Demo ===\n');

  const startPos: Vec2 = { x: 100, y: 100 };
  const velocity: Vec2 = { x: 300, y: 0 }; // Moving right at 300 units/second

  // Create different projectile types
  const bullet = new Projectile({
    id: 'bullet-1',
    owner: 'player-1',
    pos: startPos,
    vel: velocity,
    kind: 'bullet',
  });

  const pellet = new Projectile({
    id: 'pellet-1',
    owner: 'player-1',
    pos: startPos,
    vel: velocity,
    kind: 'pellet',
  });

  const rocket = new Projectile({
    id: 'rocket-1',
    owner: 'player-1',
    pos: startPos,
    vel: { x: 200, y: 0 }, // Rockets are slower
    kind: 'rocket',
  });

  console.log('✅ Created projectiles with different properties:');
  console.log(
    `   Bullet: damage=${bullet.damage}, lifetime=${bullet.lifetime}ms, maxBounces=${bullet.maxBounces}`,
  );
  console.log(
    `   Pellet: damage=${pellet.damage}, lifetime=${pellet.lifetime}ms, maxBounces=${pellet.maxBounces}`,
  );
  console.log(
    `   Rocket: damage=${rocket.damage}, lifetime=${rocket.lifetime}ms, explodes=${rocket.shouldExplodeOnCollision()}`,
  );
}

function demonstrateProjectileMovement() {
  console.log('\n=== Projectile Movement Demo ===\n');

  const projectile = new Projectile({
    id: 'demo-projectile',
    owner: 'demo-player',
    pos: { x: 0, y: 50 },
    vel: { x: 100, y: 0 }, // 100 units per second to the right
    kind: 'bullet',
  });

  console.log('✅ Projectile movement simulation:');
  console.log(
    `   Initial position: (${projectile.pos.x}, ${projectile.pos.y})`,
  );
  console.log(`   Speed: ${projectile.getSpeed()} units/second`);
  console.log(
    `   Direction: (${projectile.getDirection().x.toFixed(2)}, ${projectile.getDirection().y.toFixed(2)})`,
  );

  // Simulate movement over time
  for (let i = 1; i <= 3; i++) {
    const deltaTime = 0.5; // 0.5 seconds
    projectile.update(deltaTime);
    console.log(
      `   After ${i * deltaTime}s: (${projectile.pos.x}, ${projectile.pos.y})`,
    );
  }

  // Check if projectile is out of bounds
  const worldWidth = 200;
  const worldHeight = 100;
  const outOfBounds = projectile.isOutOfBounds(worldWidth, worldHeight);
  console.log(
    `   Out of bounds (${worldWidth}x${worldHeight}): ${outOfBounds}`,
  );
}

function demonstrateBouncing() {
  console.log('\n=== Projectile Bouncing Demo ===\n');

  const projectile = new Projectile({
    id: 'bouncing-bullet',
    owner: 'demo-player',
    pos: { x: 100, y: 100 },
    vel: { x: 200, y: 150 }, // Moving diagonally
    kind: 'bullet',
  });

  console.log('✅ Bouncing simulation:');
  console.log(
    `   Initial velocity: (${projectile.vel.x}, ${projectile.vel.y})`,
  );
  console.log(`   Initial damage: ${projectile.getCurrentDamage()}`);
  console.log(`   Can bounce: ${projectile.canBounce()}`);

  // Simulate bouncing off walls
  const walls = [
    { x: 1, y: 0 }, // Right wall (normal pointing left)
    { x: 0, y: -1 }, // Bottom wall (normal pointing up)
    { x: -1, y: 0 }, // Left wall (normal pointing right)
  ];

  walls.forEach((normal, index) => {
    const bounced = projectile.bounce(normal);
    if (bounced) {
      console.log(
        `   Bounce ${index + 1}: velocity=(${projectile.vel.x.toFixed(1)}, ${projectile.vel.y.toFixed(1)}), damage=${projectile.getCurrentDamage().toFixed(1)}`,
      );
    } else {
      console.log(
        `   Bounce ${index + 1}: Failed to bounce (max bounces exceeded or rocket)`,
      );
    }
  });

  console.log(
    `   Final bounce count: ${projectile.bounceCount}/${projectile.maxBounces}`,
  );
}

function demonstrateRocketBehavior() {
  console.log('\n=== Rocket Behavior Demo ===\n');

  const rocket = new Projectile({
    id: 'demo-rocket',
    owner: 'demo-player',
    pos: { x: 50, y: 50 },
    vel: { x: 150, y: 0 },
    kind: 'rocket',
  });

  console.log('✅ Rocket properties:');
  console.log(
    `   Should explode on collision: ${rocket.shouldExplodeOnCollision()}`,
  );
  console.log(`   Can bounce: ${rocket.canBounce()}`);
  console.log(`   Hit radius: ${rocket.hitRadius}`);
  console.log(`   Damage: ${rocket.getCurrentDamage()}`);

  // Try to bounce a rocket (should fail)
  const wallNormal = { x: 1, y: 0 };
  const bounced = rocket.bounce(wallNormal);
  console.log(
    `   Attempted bounce result: ${bounced ? 'Bounced' : 'Did not bounce (rockets explode)'}`,
  );
}

function demonstrateHitDetection() {
  console.log('\n=== Hit Detection Demo ===\n');

  const projectile = new Projectile({
    id: 'hit-test',
    owner: 'demo-player',
    pos: { x: 100, y: 100 },
    vel: { x: 0, y: 0 },
    kind: 'bullet',
  });

  const targets = [
    { name: 'Close target', pos: { x: 105, y: 105 } },
    { name: 'Edge target', pos: { x: 120, y: 100 } },
    { name: 'Far target', pos: { x: 150, y: 100 } },
  ];

  console.log('✅ Hit detection tests:');
  console.log(
    `   Projectile at (${projectile.pos.x}, ${projectile.pos.y}) with hit radius ${projectile.hitRadius}`,
  );

  targets.forEach((target) => {
    const distance = projectile.distanceTo(target.pos);
    const isHit = projectile.isWithinHitRadius(target.pos);
    console.log(
      `   ${target.name} at (${target.pos.x}, ${target.pos.y}): distance=${distance.toFixed(1)}, hit=${isHit}`,
    );
  });
}

function demonstrateLifetime() {
  console.log('\n=== Projectile Lifetime Demo ===\n');

  const projectile = new Projectile({
    id: 'lifetime-test',
    owner: 'demo-player',
    pos: { x: 0, y: 0 },
    vel: { x: 100, y: 0 },
    kind: 'pellet', // Pellets have shorter lifetime
  });

  console.log('✅ Lifetime simulation:');
  console.log(`   Lifetime: ${projectile.lifetime}ms`);
  console.log(`   Age: ${projectile.getAge()}ms`);
  console.log(`   Remaining: ${projectile.getRemainingLifetime()}ms`);
  console.log(`   Is expired: ${projectile.isExpired()}`);

  // Simulate time passing
  const futureTime = Date.now() + projectile.lifetime + 100; // 100ms past expiration
  console.log(`   After lifetime expires:`);
  console.log(`     Age: ${projectile.getAge(futureTime)}ms`);
  console.log(
    `     Remaining: ${projectile.getRemainingLifetime(futureTime)}ms`,
  );
  console.log(`     Is expired: ${projectile.isExpired(futureTime)}`);
}

function demonstrateSerialization() {
  console.log('\n=== Projectile Serialization Demo ===\n');

  const originalProjectile = new Projectile({
    id: 'serialize-test',
    owner: 'demo-player',
    pos: { x: 200, y: 150 },
    vel: { x: 300, y: -50 },
    kind: 'rocket',
    hitRadius: 35,
    damage: 50,
  });

  // Modify some properties
  originalProjectile.update(0.5); // Move forward

  console.log('✅ Serialization test:');
  console.log('   Original projectile:');
  const status = originalProjectile.getStatus();
  console.log(`     Position: (${status.pos.x}, ${status.pos.y})`);
  console.log(`     Speed: ${status.speed.toFixed(1)}`);
  console.log(`     Damage: ${status.damage}`);

  // Serialize
  const serialized = originalProjectile.toJSON();
  console.log('   Serialized data:');
  console.log('    ', JSON.stringify(serialized, null, 4));

  // Deserialize
  const restoredProjectile = Projectile.fromJSON(serialized);
  console.log('   Restored projectile:');
  console.log(
    `     Position: (${restoredProjectile.pos.x}, ${restoredProjectile.pos.y})`,
  );
  console.log(`     Kind: ${restoredProjectile.kind}`);
  console.log(`     Owner: ${restoredProjectile.owner}`);
  console.log(`     Damage: ${restoredProjectile.damage}`);
}

// Export demo functions
export {
  demonstrateProjectileTypes,
  demonstrateProjectileMovement,
  demonstrateBouncing,
  demonstrateRocketBehavior,
  demonstrateHitDetection,
  demonstrateLifetime,
  demonstrateSerialization,
};

// Auto-run if executed directly
if (require.main === module) {
  console.log('🎯 Projectile Entity Demo - Enhanced Projectile System\n');

  try {
    demonstrateProjectileTypes();
    demonstrateProjectileMovement();
    demonstrateBouncing();
    demonstrateRocketBehavior();
    demonstrateHitDetection();
    demonstrateLifetime();
    demonstrateSerialization();

    console.log('\n🎉 All projectile demos completed successfully!');
    console.log('\n📝 Summary of improvements:');
    console.log('   • Projectiles are now proper TypeScript classes');
    console.log(
      '   • Encapsulated behavior (movement, bouncing, hit detection)',
    );
    console.log(
      '   • Type-specific properties (damage, lifetime, bounce limits)',
    );
    console.log('   • Built-in collision and bounds checking');
    console.log('   • Lifetime management with expiration');
    console.log('   • Proper serialization for network transmission');
    console.log('   • Damage degradation after bounces');
    console.log('   • Integrated statistics tracking (shots fired/hit)');
  } catch (error) {
    console.error('❌ Demo failed:', error);
  }
}
