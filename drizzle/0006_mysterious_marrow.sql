ALTER TABLE "students" ADD COLUMN "secondary_phone" varchar(20);--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "birth_date" date;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "gender" "gender";--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "nationality" varchar(80);--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "naturalness" varchar(120);--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "photo_url" varchar(500);--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "emergency_contact" varchar(120);--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "status" "student_status" DEFAULT 'active' NOT NULL;