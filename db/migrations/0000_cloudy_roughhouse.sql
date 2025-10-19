CREATE TABLE "event_dates" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"date" date NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "votes" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_date_id" integer NOT NULL,
	"person_name" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "votes_event_date_id_person_name_unique" UNIQUE("event_date_id","person_name")
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "event_dates" ADD CONSTRAINT "event_dates_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_event_date_id_event_dates_id_fk" FOREIGN KEY ("event_date_id") REFERENCES "public"."event_dates"("id") ON DELETE cascade ON UPDATE no action;