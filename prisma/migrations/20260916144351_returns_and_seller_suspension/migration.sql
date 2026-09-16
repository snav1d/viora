-- AlterTable
ALTER TABLE `OrderItem` ADD COLUMN `returnRejectionReason` TEXT NULL,
    ADD COLUMN `returnStatus` ENUM('REQUESTED', 'APPROVED', 'REJECTED') NULL;

-- AlterTable
ALTER TABLE `SellerProfile` MODIFY `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED') NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE `SupportTicket` ADD COLUMN `orderItemId` VARCHAR(191) NULL,
    ADD COLUMN `type` ENUM('GENERAL', 'RETURN_REQUEST') NOT NULL DEFAULT 'GENERAL';

-- AlterTable
ALTER TABLE `TicketMessage` ADD COLUMN `imageUrl` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `SupportTicket_orderItemId_idx` ON `SupportTicket`(`orderItemId`);

-- AddForeignKey
ALTER TABLE `SupportTicket` ADD CONSTRAINT `SupportTicket_orderItemId_fkey` FOREIGN KEY (`orderItemId`) REFERENCES `OrderItem`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
