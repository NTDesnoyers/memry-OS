CREATE TABLE "agent_actions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" varchar,
	"agent_name" text NOT NULL,
	"action_type" text NOT NULL,
	"risk_level" text DEFAULT 'low' NOT NULL,
	"status" text DEFAULT 'proposed' NOT NULL,
	"person_id" varchar,
	"deal_id" varchar,
	"target_entity" text,
	"target_entity_id" varchar,
	"proposed_content" jsonb,
	"reasoning" text,
	"approved_by" text,
	"approved_at" timestamp,
	"executed_at" timestamp,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_profile" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text DEFAULT 'Agent Name' NOT NULL,
	"email" text,
	"phone" text,
	"agent_id" text,
	"license_number" text,
	"license_state" text,
	"brokerage" text,
	"brokerage_logo_url" text,
	"brokerage_primary_color" text,
	"team_name" text,
	"personal_logo_url" text,
	"headshot_url" text,
	"headshot_position" text DEFAULT 'center center',
	"website" text,
	"social_linkedin" text,
	"social_facebook" text,
	"social_instagram" text,
	"google_review_url" text,
	"google_review_qr_url" text,
	"tagline" text,
	"annual_transaction_goal" integer DEFAULT 24,
	"annual_gci_goal" integer DEFAULT 200000,
	"word_of_year" text,
	"affirmation" text,
	"family_mission" text,
	"business_mission" text,
	"quarterly_focus" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_subscriptions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_name" text NOT NULL,
	"event_type" text NOT NULL,
	"priority" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"config" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_actions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"action_type" text NOT NULL,
	"proposed_by" text DEFAULT 'ai' NOT NULL,
	"input" jsonb,
	"verifier_name" text,
	"verifier_passed" boolean,
	"verifier_errors" text[],
	"verifier_warnings" text[],
	"verifier_score" integer,
	"outcome" text,
	"result_data" jsonb,
	"executed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_conversations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"messages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "beta_feedback" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"message" text NOT NULL,
	"page" text,
	"user_agent" text,
	"status" text DEFAULT 'new' NOT NULL,
	"resolution" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "beta_intake" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"beta_user_id" varchar NOT NULL,
	"meeting_tools" text[],
	"call_tools" text[],
	"messaging_tools" text[],
	"email_tools" text[],
	"crm_tools" text[],
	"other_tools" text,
	"priorities" text[],
	"pain_points" text,
	"submitted_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "beta_intake_beta_user_id_unique" UNIQUE("beta_user_id")
);
--> statement-breakpoint
CREATE TABLE "beta_users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"brokerage" text,
	"is_ninja_certified" boolean DEFAULT false,
	"status" text DEFAULT 'pending',
	"onboarded_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "beta_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "business_settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"year" integer DEFAULT 2025 NOT NULL,
	"annual_gci_goal" integer DEFAULT 200000,
	"franchise_fee_flat" integer DEFAULT 0,
	"franchise_fee_percent" integer DEFAULT 0,
	"franchise_fee_cap" integer DEFAULT 0,
	"marketing_fee_flat" integer DEFAULT 0,
	"marketing_fee_percent" integer DEFAULT 0,
	"marketing_fee_cap" integer DEFAULT 0,
	"office_cap" integer DEFAULT 0,
	"starting_split" integer DEFAULT 70,
	"secondary_split" integer DEFAULT 85,
	"progressive_tiers" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calls" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"person_id" varchar,
	"phone_number" text,
	"direction" text,
	"duration" integer,
	"transcript" text,
	"summary" text,
	"action_items" text[],
	"recording_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "capture_integrations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"display_name" text NOT NULL,
	"is_active" boolean DEFAULT false,
	"config" jsonb,
	"last_sync_at" timestamp,
	"last_sync_status" text,
	"last_sync_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coaching_insights" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"category" text,
	"insight" text NOT NULL,
	"original_behavior" text,
	"suggested_behavior" text,
	"supporting_examples" text[],
	"interaction_ids" text[],
	"confidence_score" integer,
	"status" text DEFAULT 'active' NOT NULL,
	"user_feedback" text,
	"view_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_calendar" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_idea_id" varchar,
	"title" text NOT NULL,
	"content_type" text NOT NULL,
	"channel" text,
	"scheduled_date" timestamp,
	"status" text DEFAULT 'planned',
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_ideas" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"topic_id" varchar,
	"title" text NOT NULL,
	"description" text,
	"content_type" text NOT NULL,
	"status" text DEFAULT 'idea',
	"outline" text,
	"draft" text,
	"final_content" text,
	"published_url" text,
	"published_at" timestamp,
	"priority" integer DEFAULT 0,
	"ai_generated" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_topics" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"category" text,
	"mention_count" integer DEFAULT 1 NOT NULL,
	"last_mentioned_at" timestamp DEFAULT now(),
	"status" text DEFAULT 'active',
	"sample_quotes" text[],
	"related_interaction_ids" text[],
	"ai_suggestions" jsonb,
	"knowledge_level" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_field_mappings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"integration_id" varchar NOT NULL,
	"local_entity_type" text NOT NULL,
	"local_entity_id" varchar NOT NULL,
	"external_id" varchar NOT NULL,
	"external_data" jsonb,
	"last_synced_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_integrations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"display_name" text NOT NULL,
	"is_active" boolean DEFAULT false,
	"is_primary" boolean DEFAULT false,
	"config" jsonb,
	"last_sync_at" timestamp,
	"last_sync_status" text,
	"last_sync_error" text,
	"sync_contacts_enabled" boolean DEFAULT true,
	"sync_notes_enabled" boolean DEFAULT true,
	"sync_tasks_enabled" boolean DEFAULT true,
	"sync_deals_enabled" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_sync_queue" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"integration_id" varchar NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" varchar NOT NULL,
	"operation" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0,
	"max_attempts" integer DEFAULT 3,
	"last_error" text,
	"external_id" varchar,
	"scheduled_for" timestamp DEFAULT now() NOT NULL,
	"processed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_digests" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"digest_date" timestamp NOT NULL,
	"item_count" integer DEFAULT 0,
	"summary_html" text,
	"content_ids" text[],
	"share_suggestions" jsonb,
	"email_sent_at" timestamp,
	"viewed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dashboard_widgets" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"widget_type" text NOT NULL,
	"title" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"grid_column" integer DEFAULT 1,
	"grid_row" integer DEFAULT 1,
	"is_visible" boolean DEFAULT true,
	"config" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deals" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"person_id" varchar,
	"title" text NOT NULL,
	"address" text,
	"type" text NOT NULL,
	"stage" text NOT NULL,
	"side" text DEFAULT 'buyer',
	"is_referral" boolean DEFAULT false,
	"pain_pleasure_rating" integer DEFAULT 3,
	"value" integer,
	"list_price" integer,
	"sold_price" integer,
	"source" text,
	"commission_percent" integer DEFAULT 3,
	"expected_close_date" timestamp,
	"actual_close_date" timestamp,
	"actual_gci" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dormant_opportunities" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"person_id" varchar,
	"lead_id" varchar,
	"status" text DEFAULT 'pending' NOT NULL,
	"dormancy_score" integer DEFAULT 0,
	"days_since_contact" integer,
	"lead_source" text,
	"last_email_date" timestamp,
	"last_email_subject" text,
	"email_thread_count" integer DEFAULT 0,
	"discovered_via" text NOT NULL,
	"revival_reason" text,
	"suggested_approach" text,
	"campaign_id" varchar,
	"reviewed_at" timestamp,
	"dismissed_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "eight_by_eight_campaigns" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"person_id" varchar NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"current_step" integer DEFAULT 1 NOT NULL,
	"completed_steps" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"touches" jsonb,
	"outcome" text,
	"outcome_notes" text,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_campaigns" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject" text NOT NULL,
	"html_content" text,
	"recipient_count" integer,
	"sent_at" timestamp,
	"status" text DEFAULT 'draft',
	"campaign_type" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generated_drafts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"person_id" varchar,
	"interaction_id" varchar,
	"type" text NOT NULL,
	"title" text,
	"content" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"metadata" jsonb,
	"sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "handwritten_note_uploads" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"image_url" text NOT NULL,
	"ocr_text" text,
	"recipient_name" text,
	"person_id" varchar,
	"status" text DEFAULT 'pending_ocr' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "households" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"primary_person_id" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interactions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"person_id" varchar,
	"type" text NOT NULL,
	"source" text,
	"title" text,
	"summary" text,
	"transcript" text,
	"external_link" text,
	"external_id" text,
	"duration" integer,
	"occurred_at" timestamp NOT NULL,
	"participants" text[],
	"tags" text[],
	"ai_extracted_data" jsonb,
	"coaching_analysis" jsonb,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"source" text DEFAULT 'manual' NOT NULL,
	"source_details" text,
	"status" text DEFAULT 'new' NOT NULL,
	"qualification_score" integer DEFAULT 0,
	"notes" text,
	"interested_in" text,
	"budget" text,
	"timeline" text,
	"areas" text[],
	"person_id" varchar,
	"assigned_to" text,
	"first_contact_at" timestamp,
	"last_contact_at" timestamp,
	"converted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "life_event_alerts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"person_id" varchar,
	"event_type" text NOT NULL,
	"event_category" text NOT NULL,
	"confidence" text,
	"source_url" text,
	"source_platform" text,
	"raw_content" text,
	"summary" text,
	"suggested_outreach" text,
	"status" text DEFAULT 'new',
	"action_taken" text,
	"detected_at" timestamp DEFAULT now() NOT NULL,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listening_analysis" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"interaction_id" varchar,
	"observation_count" integer DEFAULT 0,
	"interpretation_count" integer DEFAULT 0,
	"observation_examples" text[],
	"interpretation_examples" text[],
	"feeling_acknowledgments" integer DEFAULT 0,
	"feeling_examples" text[],
	"emotion_before_solution" boolean,
	"need_clarifications" integer DEFAULT 0,
	"need_examples" text[],
	"assumed_needs" integer DEFAULT 0,
	"request_confirmations" integer DEFAULT 0,
	"request_examples" text[],
	"exploratory_questions" integer DEFAULT 0,
	"clarifying_questions" integer DEFAULT 0,
	"feeling_questions" integer DEFAULT 0,
	"need_questions" integer DEFAULT 0,
	"solution_leading_questions" integer DEFAULT 0,
	"closed_questions" integer DEFAULT 0,
	"question_examples" jsonb,
	"conversation_depth_score" integer,
	"trust_building_score" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listening_patterns" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pattern_type" text NOT NULL,
	"description" text NOT NULL,
	"frequency" integer DEFAULT 1,
	"trend" text,
	"last_observed" timestamp,
	"examples" text[],
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"address" text NOT NULL,
	"price" integer,
	"beds" integer,
	"baths" integer,
	"sqft" integer,
	"property_type" text,
	"areas" text[],
	"features" text[],
	"description" text,
	"status" text DEFAULT 'active',
	"listing_type" text,
	"mls_number" text,
	"photo_url" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meetings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"person_id" varchar,
	"title" text NOT NULL,
	"platform" text,
	"start_time" timestamp,
	"duration" integer,
	"transcript" text,
	"summary" text,
	"action_items" text[],
	"recording_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"person_id" varchar,
	"deal_id" varchar,
	"content" text NOT NULL,
	"type" text,
	"tags" text[],
	"image_urls" text[],
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "observer_patterns" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pattern_type" text NOT NULL,
	"description" text NOT NULL,
	"trigger_conditions" jsonb NOT NULL,
	"suggested_action" jsonb NOT NULL,
	"occurrence_count" integer DEFAULT 1,
	"last_triggered_at" timestamp,
	"is_enabled" boolean DEFAULT true,
	"user_feedback_score" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "observer_suggestions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_name" text NOT NULL,
	"intent" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"reasoning" text,
	"evidence" jsonb,
	"confidence" integer DEFAULT 50 NOT NULL,
	"context_route" text,
	"context_entity_type" text,
	"context_entity_id" varchar,
	"person_id" varchar,
	"deal_id" varchar,
	"lead_id" varchar,
	"action_payload" jsonb,
	"pattern_id" text,
	"snooze_until" timestamp,
	"accepted_at" timestamp,
	"dismissed_at" timestamp,
	"feedback_note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "people" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"nickname" text,
	"email" text,
	"phone" text,
	"role" text,
	"segment" text,
	"address" text,
	"household_id" varchar,
	"notes" text,
	"ford_family" text,
	"ford_occupation" text,
	"ford_recreation" text,
	"ford_dreams" text,
	"linkedin_url" text,
	"facebook_url" text,
	"instagram_url" text,
	"twitter_url" text,
	"last_contact" timestamp,
	"is_buyer" boolean DEFAULT false,
	"buyer_status" text,
	"buyer_price_min" integer,
	"buyer_price_max" integer,
	"buyer_beds" integer,
	"buyer_baths" integer,
	"buyer_areas" text[],
	"buyer_property_types" text[],
	"buyer_must_haves" text[],
	"buyer_notes" text,
	"is_realtor" boolean DEFAULT false,
	"realtor_brokerage" text,
	"receive_newsletter" boolean DEFAULT false,
	"needs" text[],
	"offers" text[],
	"profession" text,
	"segment_entered_at" timestamp,
	"contact_attempts" integer DEFAULT 0,
	"contact_responses" integer DEFAULT 0,
	"review_status" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pie_entries" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" timestamp NOT NULL,
	"p_time" integer DEFAULT 0,
	"i_time" integer DEFAULT 0,
	"e_time" integer DEFAULT 0,
	"total_time" integer DEFAULT 0,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pricing_reviews" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"person_id" varchar,
	"title" text NOT NULL,
	"neighborhood" text,
	"city" text,
	"subject_address" text,
	"subject_description" text,
	"mls_data" jsonb,
	"calculated_metrics" jsonb,
	"positioning_ratings" jsonb,
	"notes" text,
	"status" text DEFAULT 'draft',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "real_estate_reviews" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"property_address" text NOT NULL,
	"neighborhood" text,
	"person_id" varchar,
	"client_type" text DEFAULT 'past_client',
	"output_type" text DEFAULT 'digital',
	"status" text DEFAULT 'draft',
	"scheduled_date" timestamp,
	"gamma_link" text,
	"loom_link" text,
	"property_data" jsonb,
	"financial_data" jsonb,
	"components" jsonb,
	"public_records" jsonb,
	"visual_pricing_id" varchar,
	"market_data" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saved_content" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"url" text NOT NULL,
	"title" text,
	"author" text,
	"site_name" text,
	"content" text,
	"summary" text,
	"key_points" text[],
	"tags" text[],
	"image_url" text,
	"status" text DEFAULT 'unread',
	"read_at" timestamp,
	"digest_included_at" timestamp,
	"linked_person_id" varchar,
	"notes" text,
	"source" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_connections" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"platform" text NOT NULL,
	"access_token" text NOT NULL,
	"access_token_expires_at" timestamp,
	"refresh_token" text,
	"platform_user_id" text,
	"platform_page_id" text,
	"instagram_account_id" text,
	"account_name" text,
	"scopes" text[],
	"metadata" jsonb,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_posts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"connection_id" varchar,
	"platform" text NOT NULL,
	"post_type" text DEFAULT 'feed' NOT NULL,
	"content" text NOT NULL,
	"media_urls" text[],
	"hashtags" text[],
	"status" text DEFAULT 'draft' NOT NULL,
	"scheduled_for" timestamp,
	"published_at" timestamp,
	"platform_post_id" text,
	"platform_post_url" text,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" text NOT NULL,
	"sync_type" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"items_received" integer DEFAULT 0,
	"items_processed" integer DEFAULT 0,
	"items_failed" integer DEFAULT 0,
	"error_message" text,
	"metadata" jsonb,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "system_events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" text NOT NULL,
	"event_category" text NOT NULL,
	"person_id" varchar,
	"deal_id" varchar,
	"source_entity" text,
	"source_entity_id" varchar,
	"payload" jsonb,
	"metadata" jsonb,
	"processed_at" timestamp,
	"processed_by" text[],
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"person_id" varchar,
	"deal_id" varchar,
	"review_id" varchar,
	"title" text NOT NULL,
	"description" text,
	"due_date" timestamp,
	"priority" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"todoist_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_connectors" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"beta_user_id" varchar NOT NULL,
	"provider" text NOT NULL,
	"category" text NOT NULL,
	"status" text DEFAULT 'pending',
	"config" jsonb,
	"last_sync_at" timestamp,
	"last_sync_status" text,
	"last_sync_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_core_profile" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"beta_user_id" varchar NOT NULL,
	"mtp" text,
	"mission_statement" text,
	"philosophy" text,
	"decision_framework" text,
	"core_values" text[],
	"years_experience" integer,
	"team_structure" text,
	"annual_goal_transactions" integer,
	"annual_goal_gci" integer,
	"specializations" text[],
	"focus_areas" text[],
	"family_summary" text,
	"hobbies" text[],
	"community_involvement" text,
	"intake_completed_at" timestamp,
	"intake_step" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_core_profile_beta_user_id_unique" UNIQUE("beta_user_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "voice_profile" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" text NOT NULL,
	"value" text NOT NULL,
	"context" text,
	"frequency" integer DEFAULT 1,
	"source" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "weekly_reviews" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"week_start_date" timestamp NOT NULL,
	"accomplishments" text[],
	"challenges" text[],
	"goals" text[],
	"insights" text,
	"gratitude" text[],
	"metrics" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_actions" ADD CONSTRAINT "agent_actions_event_id_system_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."system_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_actions" ADD CONSTRAINT "agent_actions_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_actions" ADD CONSTRAINT "agent_actions_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beta_intake" ADD CONSTRAINT "beta_intake_beta_user_id_beta_users_id_fk" FOREIGN KEY ("beta_user_id") REFERENCES "public"."beta_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calls" ADD CONSTRAINT "calls_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_calendar" ADD CONSTRAINT "content_calendar_content_idea_id_content_ideas_id_fk" FOREIGN KEY ("content_idea_id") REFERENCES "public"."content_ideas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_ideas" ADD CONSTRAINT "content_ideas_topic_id_content_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."content_topics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_field_mappings" ADD CONSTRAINT "crm_field_mappings_integration_id_crm_integrations_id_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."crm_integrations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_sync_queue" ADD CONSTRAINT "crm_sync_queue_integration_id_crm_integrations_id_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."crm_integrations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dormant_opportunities" ADD CONSTRAINT "dormant_opportunities_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dormant_opportunities" ADD CONSTRAINT "dormant_opportunities_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eight_by_eight_campaigns" ADD CONSTRAINT "eight_by_eight_campaigns_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_drafts" ADD CONSTRAINT "generated_drafts_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_drafts" ADD CONSTRAINT "generated_drafts_interaction_id_interactions_id_fk" FOREIGN KEY ("interaction_id") REFERENCES "public"."interactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "handwritten_note_uploads" ADD CONSTRAINT "handwritten_note_uploads_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "life_event_alerts" ADD CONSTRAINT "life_event_alerts_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listening_analysis" ADD CONSTRAINT "listening_analysis_interaction_id_interactions_id_fk" FOREIGN KEY ("interaction_id") REFERENCES "public"."interactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "observer_suggestions" ADD CONSTRAINT "observer_suggestions_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "observer_suggestions" ADD CONSTRAINT "observer_suggestions_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "observer_suggestions" ADD CONSTRAINT "observer_suggestions_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_reviews" ADD CONSTRAINT "pricing_reviews_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "real_estate_reviews" ADD CONSTRAINT "real_estate_reviews_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "real_estate_reviews" ADD CONSTRAINT "real_estate_reviews_visual_pricing_id_pricing_reviews_id_fk" FOREIGN KEY ("visual_pricing_id") REFERENCES "public"."pricing_reviews"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_connection_id_social_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."social_connections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_events" ADD CONSTRAINT "system_events_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_events" ADD CONSTRAINT "system_events_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_connectors" ADD CONSTRAINT "user_connectors_beta_user_id_beta_users_id_fk" FOREIGN KEY ("beta_user_id") REFERENCES "public"."beta_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_core_profile" ADD CONSTRAINT "user_core_profile_beta_user_id_beta_users_id_fk" FOREIGN KEY ("beta_user_id") REFERENCES "public"."beta_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_actions_type_idx" ON "ai_actions" USING btree ("action_type");--> statement-breakpoint
CREATE INDEX "ai_actions_outcome_idx" ON "ai_actions" USING btree ("outcome");--> statement-breakpoint
CREATE INDEX "ai_actions_created_idx" ON "ai_actions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "daily_digests_date_idx" ON "daily_digests" USING btree ("digest_date");--> statement-breakpoint
CREATE INDEX "deals_person_id_idx" ON "deals" USING btree ("person_id");--> statement-breakpoint
CREATE INDEX "deals_stage_idx" ON "deals" USING btree ("stage");--> statement-breakpoint
CREATE INDEX "dormant_opportunities_status_idx" ON "dormant_opportunities" USING btree ("status");--> statement-breakpoint
CREATE INDEX "dormant_opportunities_score_idx" ON "dormant_opportunities" USING btree ("dormancy_score");--> statement-breakpoint
CREATE INDEX "dormant_opportunities_person_idx" ON "dormant_opportunities" USING btree ("person_id");--> statement-breakpoint
CREATE INDEX "interactions_person_id_idx" ON "interactions" USING btree ("person_id");--> statement-breakpoint
CREATE INDEX "interactions_occurred_at_idx" ON "interactions" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "interactions_type_idx" ON "interactions" USING btree ("type");--> statement-breakpoint
CREATE INDEX "leads_status_idx" ON "leads" USING btree ("status");--> statement-breakpoint
CREATE INDEX "leads_source_idx" ON "leads" USING btree ("source");--> statement-breakpoint
CREATE INDEX "leads_created_at_idx" ON "leads" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "notes_person_id_idx" ON "notes" USING btree ("person_id");--> statement-breakpoint
CREATE INDEX "people_segment_idx" ON "people" USING btree ("segment");--> statement-breakpoint
CREATE INDEX "people_last_contact_idx" ON "people" USING btree ("last_contact");--> statement-breakpoint
CREATE INDEX "saved_content_status_idx" ON "saved_content" USING btree ("status");--> statement-breakpoint
CREATE INDEX "saved_content_created_idx" ON "saved_content" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "tasks_person_id_idx" ON "tasks" USING btree ("person_id");--> statement-breakpoint
CREATE INDEX "tasks_due_date_idx" ON "tasks" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "tasks_status_idx" ON "tasks" USING btree ("status");