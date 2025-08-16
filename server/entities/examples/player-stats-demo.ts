import { Player } from '../player';
import { PlayerStats } from '../player-stats';

/**
 * Example demonstrating the PlayerStats system
 * Shows how player statistics are now properly encapsulated and managed
 */

function demonstratePlayerStats() {
  console.log('=== Player Statistics Demo ===\n');
  
  // Create a new player (stats are automatically initialized)
  const player = new Player('demo-player', 'TestPlayer', { x: 100, y: 100 });
  
  console.log('✅ New player created with initialized stats:');
  console.log(`   Kills: ${player.stats.kills}`);
  console.log(`   Deaths: ${player.stats.deaths}`);
  console.log(`   Assists: ${player.stats.assists}`);
  console.log(`   Current streak: ${player.stats.currentStreak}`);
  
  // Simulate some kills
  console.log('\n🎯 Simulating combat...');
  
  player.addKill();
  console.log(`   After 1st kill - Streak: ${player.getCurrentStreak()}, Announcement: "${player.getStreakAnnouncement() || 'None'}"`);
  
  player.addKill();
  console.log(`   After 2nd kill - Streak: ${player.getCurrentStreak()}, Announcement: "${player.getStreakAnnouncement() || 'None'}"`);
  
  player.addKill();
  console.log(`   After 3rd kill - Streak: ${player.getCurrentStreak()}, Announcement: "${player.getStreakAnnouncement() || 'None'}"`);
  
  player.addKill();
  player.addKill();
  console.log(`   After 5th kill - Streak: ${player.getCurrentStreak()}, Announcement: "${player.getStreakAnnouncement() || 'None'}"`);
  
  // Add some assists and damage tracking
  player.addAssist();
  player.addAssist();
  player.addDamageDealt(150);
  player.addShotFired();
  player.addShotFired();
  player.addShotHit();
  
  console.log('\n📊 Current statistics:');
  const stats = player.getStatsSummary();
  console.log(`   K/D/A: ${stats.kills}/${stats.deaths}/${stats.assists}`);
  console.log(`   K/D Ratio: ${stats.kdRatio}`);
  console.log(`   Accuracy: ${stats.accuracy}%`);
  console.log(`   Damage dealt: ${stats.damageDealt}`);
  console.log(`   Damage per kill: ${stats.damagePerKill}`);
  console.log(`   Best streak: ${stats.bestStreak}`);
  
  // Simulate death (resets streak)
  console.log('\n💀 Player dies...');
  player.takeDamage(100); // This calls die() internally when HP reaches 0
  
  console.log(`   Streak after death: ${player.getCurrentStreak()}`);
  console.log(`   Total deaths: ${player.stats.deaths}`);
  console.log(`   Best streak preserved: ${player.stats.bestStreak}`);
  
  // Show detailed stats
  console.log('\n📈 Detailed statistics summary:');
  const finalStats = player.getStatsSummary();
  Object.entries(finalStats).forEach(([key, value]) => {
    console.log(`   ${key}: ${value}`);
  });
}

function demonstrateStatsManagement() {
  console.log('\n=== Statistics Management Demo ===\n');
  
  const stats = new PlayerStats();
  
  // Demonstrate manual stats tracking
  stats.addKill();
  stats.addKill();
  stats.addAssist();
  stats.addDamageDealt(75);
  stats.addShotFired();
  stats.addShotHit();
  
  console.log('✅ Manual stats tracking:');
  console.log(`   Current streak: ${stats.currentStreak}`);
  console.log(`   Streak category: ${stats.getStreakCategory()}`);
  console.log(`   Has notable streak: ${stats.hasNotableStreak()}`);
  
  // Demonstrate derived calculations
  console.log('\n📊 Derived statistics:');
  console.log(`   K/D Ratio: ${stats.getKDRatio()}`);
  console.log(`   K+A/D Ratio: ${stats.getKADRatio()}`);
  console.log(`   Accuracy: ${stats.getAccuracy()}%`);
  console.log(`   Damage per kill: ${stats.getDamagePerKill()}`);
  
  // Demonstrate serialization
  console.log('\n💾 Serialization:');
  const serialized = stats.toJSON();
  console.log('   Serialized stats:', JSON.stringify(serialized, null, 2));
  
  // Demonstrate deserialization
  const restored = PlayerStats.fromJSON(serialized);
  console.log(`   Restored stats - Kills: ${restored.kills}, Streak: ${restored.currentStreak}`);
  
  // Demonstrate reset
  console.log('\n🔄 Reset demonstration:');
  console.log(`   Before reset - Kills: ${stats.kills}, Deaths: ${stats.deaths}`);
  stats.reset();
  console.log(`   After reset - Kills: ${stats.kills}, Deaths: ${stats.deaths}`);
}

function demonstrateStreakSystem() {
  console.log('\n=== Streak System Demo ===\n');
  
  const player = new Player('streak-demo', 'StreakPlayer', { x: 0, y: 0 });
  
  // Test different streak levels
  const streakLevels = [1, 2, 3, 5, 7, 10, 15];
  
  for (const targetStreak of streakLevels) {
    // Reset and build up to target streak
    player.stats.reset();
    for (let i = 0; i < targetStreak; i++) {
      player.addKill();
    }
    
    const announcement = player.getStreakAnnouncement();
    const category = player.stats.getStreakCategory();
    
    console.log(`   ${targetStreak} kills: "${announcement || 'None'}" (${category})`);
  }
}

// Export demo functions
export {
  demonstratePlayerStats,
  demonstrateStatsManagement,
  demonstrateStreakSystem
};

// Auto-run if executed directly
if (require.main === module) {
  demonstratePlayerStats();
  demonstrateStatsManagement();
  demonstrateStreakSystem();
}
