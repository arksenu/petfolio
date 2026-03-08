CREATE TABLE `conciergeMessages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`localId` varchar(64) NOT NULL,
	`requestId` int NOT NULL,
	`userId` int NOT NULL,
	`senderType` varchar(32) NOT NULL DEFAULT 'user',
	`messageType` varchar(32) NOT NULL DEFAULT 'text',
	`content` text NOT NULL,
	`audioUrl` text,
	`audioDuration` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `conciergeMessages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `conciergeRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`localId` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`petLocalId` varchar(64),
	`petName` varchar(255),
	`status` varchar(32) NOT NULL DEFAULT 'active',
	`preview` text,
	`messageCount` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `conciergeRequests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vetProviders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`localId` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`petLocalId` varchar(64) NOT NULL,
	`clinicName` varchar(255) NOT NULL,
	`phone` varchar(32),
	`address` text,
	`providerType` varchar(32) NOT NULL DEFAULT 'primary_vet',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vetProviders_id` PRIMARY KEY(`id`)
);
