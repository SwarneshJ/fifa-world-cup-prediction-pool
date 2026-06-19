CREATE TABLE "matches" (
	"id" integer PRIMARY KEY NOT NULL,
	"stage" text NOT NULL,
	"group" text,
	"home_team" text NOT NULL,
	"away_team" text NOT NULL,
	"kickoff_at" timestamp NOT NULL,
	"venue" text NOT NULL,
	"home_score" integer,
	"away_score" integer,
	"winner" text,
	"finished" boolean DEFAULT false NOT NULL,
	"is_locked_manually" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "predictions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"match_id" integer NOT NULL,
	"pick" text NOT NULL,
	"predicted_home_score" integer,
	"predicted_away_score" integer,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_match_unique" UNIQUE("user_id","match_id")
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"name" text NOT NULL,
	"is_admin" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;