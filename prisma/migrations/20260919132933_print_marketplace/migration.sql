-- AlterTable
ALTER TABLE `OrderItem` ADD COLUMN `reassignmentRequestedAt` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `ServiceProviderProfile` ADD COLUMN `isVerifiedByViora` BOOLEAN NOT NULL DEFAULT false;
