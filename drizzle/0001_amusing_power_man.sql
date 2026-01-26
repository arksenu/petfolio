CREATE TABLE `petDocuments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`localId` varchar(64) NOT NULL,
	`petId` int NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`category` varchar(64) NOT NULL,
	`date` timestamp NOT NULL,
	`fileUri` text,
	`fileType` varchar(32) DEFAULT 'image',
	`fileName` varchar(255),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `petDocuments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`localId` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`species` varchar(64) NOT NULL,
	`breed` varchar(255),
	`dateOfBirth` timestamp,
	`weight` decimal(10,2),
	`weightUnit` varchar(10) DEFAULT 'lb',
	`photoUri` text,
	`microchipNumber` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reminders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`localId` varchar(64) NOT NULL,
	`petId` int NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`date` timestamp NOT NULL,
	`time` varchar(10),
	`isEnabled` boolean NOT NULL DEFAULT true,
	`notificationId` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reminders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vaccinations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`localId` varchar(64) NOT NULL,
	`petId` int NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`dateAdministered` timestamp NOT NULL,
	`expirationDate` timestamp,
	`veterinarian` varchar(255),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vaccinations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `weightHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`localId` varchar(64) NOT NULL,
	`petId` int NOT NULL,
	`userId` int NOT NULL,
	`weight` decimal(10,2) NOT NULL,
	`weightUnit` varchar(10) NOT NULL DEFAULT 'lb',
	`date` timestamp NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `weightHistory_id` PRIMARY KEY(`id`)
);
