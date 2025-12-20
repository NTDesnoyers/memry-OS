import { db } from "./db";
import { interactions } from "@shared/schema";
import { isNull, ne, sql } from "drizzle-orm";
import { processInteraction } from "./conversation-processor";

// Flush output immediately
process.stdout.setDefaultEncoding('utf-8');

async function batchProcess() {
  console.log("Starting batch processing of unprocessed interactions...");
  console.log(new Date().toISOString());
  
  // Get all unprocessed interactions (limit to 50 per batch to avoid issues)
  const unprocessed = await db.select({ id: interactions.id, title: interactions.title })
    .from(interactions)
    .where(
      sql`(${interactions.aiExtractedData} IS NULL OR ${interactions.aiExtractedData}->>'processingStatus' != 'completed') AND ${interactions.deletedAt} IS NULL`
    )
    .limit(50);
  
  console.log(`Processing batch of ${unprocessed.length} unprocessed interactions`);
  
  let processed = 0;
  let failed = 0;
  
  for (const interaction of unprocessed) {
    const startTime = Date.now();
    try {
      const result = await processInteraction(interaction.id);
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      if (result.success) {
        processed++;
        console.log(`[${processed}/${unprocessed.length}] (${duration}s) ${interaction.title?.slice(0, 40) || interaction.id} - ${result.draftsCreated || 0} drafts`);
      } else {
        failed++;
        console.error(`[FAIL ${processed + failed}/${unprocessed.length}] ${interaction.title?.slice(0, 40)} - ${result.error}`);
      }
    } catch (error: any) {
      failed++;
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      console.error(`[ERR ${processed + failed}/${unprocessed.length}] (${duration}s) ${error.message?.slice(0, 100)}`);
    }
    
    // Delay between processing to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(`\nBatch processing complete!`);
  console.log(`Processed: ${processed}`);
  console.log(`Failed: ${failed}`);
  
  // Show voice profile summary
  const { voiceProfile } = await import("@shared/schema");
  const profiles = await db.select().from(voiceProfile);
  console.log(`\nVoice Profile: ${profiles.length} patterns learned`);
  
  const categories: Record<string, number> = {};
  for (const p of profiles) {
    categories[p.category] = (categories[p.category] || 0) + 1;
  }
  console.log("Patterns by category:", categories);
  
  process.exit(0);
}

batchProcess().catch((err) => {
  console.error("Batch processing error:", err);
  process.exit(1);
});
