CREATE TABLE `delivery` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_id` integer NOT NULL,
	`delivery_person_id` integer,
	`status` text NOT NULL,
	`current_latitude` real,
	`current_longitude` real,
	`assigned_at` text,
	`picked_up_at` text,
	`delivered_at` text,
	`notes` text,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`delivery_person_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `delivery_order_id_unique` ON `delivery` (`order_id`);--> statement-breakpoint
CREATE TABLE `inventory` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`pharmacy_id` integer NOT NULL,
	`medicine_id` integer NOT NULL,
	`quantity` integer DEFAULT 0 NOT NULL,
	`price` real NOT NULL,
	`discount_percentage` real DEFAULT 0,
	`is_available` integer DEFAULT true,
	`last_updated` text NOT NULL,
	FOREIGN KEY (`pharmacy_id`) REFERENCES `pharmacies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`medicine_id`) REFERENCES `medicines`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `medicines` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`brand` text NOT NULL,
	`salt_composition` text NOT NULL,
	`category` text NOT NULL,
	`description` text,
	`manufacturer` text,
	`unit` text NOT NULL,
	`price` real NOT NULL,
	`requires_prescription` integer DEFAULT false,
	`image_url` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_id` integer NOT NULL,
	`medicine_id` integer NOT NULL,
	`quantity` integer NOT NULL,
	`price` real NOT NULL,
	`discount` real DEFAULT 0,
	`subtotal` real NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`medicine_id`) REFERENCES `medicines`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`pharmacy_id` integer NOT NULL,
	`order_number` text NOT NULL,
	`status` text NOT NULL,
	`total_amount` real NOT NULL,
	`delivery_fee` real DEFAULT 0,
	`delivery_address` text NOT NULL,
	`delivery_latitude` real,
	`delivery_longitude` real,
	`estimated_delivery_time` integer,
	`prescription_required` integer DEFAULT false,
	`prescription_verified` integer DEFAULT false,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`pharmacy_id`) REFERENCES `pharmacies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_order_number_unique` ON `orders` (`order_number`);--> statement-breakpoint
CREATE TABLE `pharmacies` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer,
	`pharmacy_name` text NOT NULL,
	`license_number` text NOT NULL,
	`address` text NOT NULL,
	`latitude` real NOT NULL,
	`longitude` real NOT NULL,
	`phone` text NOT NULL,
	`email` text NOT NULL,
	`opening_time` text,
	`closing_time` text,
	`is_active` integer DEFAULT true,
	`rating` real DEFAULT 0,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pharmacies_license_number_unique` ON `pharmacies` (`license_number`);--> statement-breakpoint
CREATE TABLE `prescriptions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`order_id` integer,
	`prescription_url` text NOT NULL,
	`verified_by` integer,
	`is_verified` integer DEFAULT false,
	`verification_notes` text,
	`uploaded_at` text NOT NULL,
	`verified_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`verified_by`) REFERENCES `pharmacies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text NOT NULL,
	`role` text NOT NULL,
	`address` text,
	`latitude` real,
	`longitude` real,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);