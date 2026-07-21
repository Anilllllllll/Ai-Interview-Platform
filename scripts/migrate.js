// ============================================
// Database Migration Runner
// ============================================
// WHY MIGRATIONS?
// When you add/change fields in your Mongoose schemas,
// existing documents in production DON'T automatically update.
// Migrations let you:
//   1. Add default values to existing documents
//   2. Rename fields across all documents
//   3. Transform data (e.g., split "name" into "firstName" + "lastName")
//   4. Track which migrations have run (idempotent)
//
// HOW IT WORKS:
//   1. Each migration has a unique name and an up() function
//   2. The runner checks which migrations have already run
//   3. Runs only NEW migrations in order
//   4. Records completed migrations in a "migrations" collection
//
// USAGE:
//   node scripts/migrate.js           — run all pending migrations
//   node scripts/migrate.js --status  — show migration status
//
// Interview answer: "We use a lightweight migration runner
// that tracks completed migrations in MongoDB. Each migration
// is idempotent — safe to run multiple times. This ensures
// schema changes are applied consistently across all environments."

require("dotenv").config({ path: require("path").join(__dirname, "../backend/.env") });
const mongoose = require("mongoose");

// Migration tracking schema
const migrationSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    executedAt: { type: Date, default: Date.now },
});
const Migration = mongoose.model("Migration", migrationSchema);

// ─────────────────────────────────────────
// DEFINE MIGRATIONS HERE
// ─────────────────────────────────────────
// Each migration has:
//   name: unique identifier (use date prefix for ordering)
//   up: async function that applies the change
const migrations = [
    {
        name: "2026-07-21_add-default-experienceLevel",
        description: "Set default experienceLevel for users missing it",
        up: async () => {
            const User = require("../backend/models/User");
            const result = await User.updateMany(
                { experienceLevel: { $exists: false } },
                { $set: { experienceLevel: "Mid" } }
            );
            console.log(`  Updated ${result.modifiedCount} users with default experienceLevel`);
        },
    },
    {
        name: "2026-07-21_add-default-interviewMode",
        description: "Set default interviewMode for sessions missing it",
        up: async () => {
            const InterviewSession = require("../backend/models/InterviewSession");
            const result = await InterviewSession.updateMany(
                { interviewMode: { $exists: false } },
                { $set: { interviewMode: "domain" } }
            );
            console.log(`  Updated ${result.modifiedCount} sessions with default interviewMode`);
        },
    },
];

// ─────────────────────────────────────────
// MIGRATION RUNNER
// ─────────────────────────────────────────
const runMigrations = async () => {
    const MONGO_URI = process.env.MONGO_URI;
    if (!MONGO_URI) {
        console.error("Error: MONGO_URI not set in environment");
        process.exit(1);
    }

    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB\n");

    // Check --status flag
    if (process.argv.includes("--status")) {
        const completed = await Migration.find().sort({ executedAt: 1 });
        console.log("Migration Status:");
        console.log("─".repeat(60));
        for (const m of migrations) {
            const done = completed.find((c) => c.name === m.name);
            const status = done ? `✅ ${done.executedAt.toISOString()}` : "⏳ Pending";
            console.log(`  ${m.name}: ${status}`);
        }
        await mongoose.disconnect();
        return;
    }

    // Run pending migrations
    let ran = 0;
    for (const migration of migrations) {
        const exists = await Migration.findOne({ name: migration.name });
        if (exists) {
            console.log(`⏭️  Skip: ${migration.name} (already executed)`);
            continue;
        }

        console.log(`🔄 Running: ${migration.name}`);
        console.log(`   ${migration.description}`);
        try {
            await migration.up();
            await Migration.create({ name: migration.name });
            console.log(`✅ Done: ${migration.name}\n`);
            ran++;
        } catch (err) {
            console.error(`❌ Failed: ${migration.name}`);
            console.error(`   Error: ${err.message}`);
            process.exit(1);
        }
    }

    console.log(`\n${ran} migration(s) executed. ${migrations.length - ran} skipped.`);
    await mongoose.disconnect();
};

runMigrations().catch((err) => {
    console.error("Migration runner failed:", err.message);
    process.exit(1);
});
