-- Expand-migrate-contract migration (docs/decisions.md ADR 39): Product's price/stock/discount/
-- seller/city columns move onto a new per-seller Listing row. Expand first (add the new columns/
-- tables alongside the old ones), backfill data while both shapes still exist, then contract
-- (drop the now-redundant Product columns) - never drop-then-repopulate, which would lose data.

-- ============================================================================
-- 1) EXPAND: new columns/tables, old Product columns untouched so far.
-- ============================================================================

-- AlterTable
ALTER TABLE `Product`
    ADD COLUMN `code` VARCHAR(191) NULL,
    ADD COLUMN `rejectionReason` TEXT NULL,
    ADD COLUMN `status` ENUM('PENDING_REVIEW', 'APPROVED', 'REJECTED', 'NEEDS_REVISION') NOT NULL DEFAULT 'PENDING_REVIEW',
    ADD COLUMN `submittedBySellerId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `ProductCodeCounter` (
    `id` VARCHAR(191) NOT NULL DEFAULT 'singleton',
    `value` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Listing` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `sellerId` VARCHAR(191) NOT NULL,
    `cityId` VARCHAR(191) NOT NULL,
    `price` DECIMAL(12, 0) NOT NULL,
    `discountPrice` DECIMAL(12, 0) NULL,
    `stock` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Listing_cityId_isActive_idx`(`cityId`, `isActive`),
    INDEX `Listing_sellerId_idx`(`sellerId`),
    UNIQUE INDEX `Listing_productId_sellerId_key`(`productId`, `sellerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `Product_code_key` ON `Product`(`code`);

-- CreateIndex
CREATE INDEX `Product_categoryId_status_idx` ON `Product`(`categoryId`, `status`);

-- CreateIndex
CREATE INDEX `Product_status_idx` ON `Product`(`status`);

-- CreateIndex
CREATE INDEX `Product_submittedBySellerId_idx` ON `Product`(`submittedBySellerId`);

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_submittedBySellerId_fkey` FOREIGN KEY (`submittedBySellerId`) REFERENCES `SellerProfile`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Listing` ADD CONSTRAINT `Listing_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Listing` ADD CONSTRAINT `Listing_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `SellerProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Listing` ADD CONSTRAINT `Listing_cityId_fkey` FOREIGN KEY (`cityId`) REFERENCES `City`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================================
-- 2) MIGRATE: backfill every existing Product row into an approved catalog entry + one Listing
--    carrying its old price/stock/discount/seller/city - while the old columns still exist.
-- ============================================================================

-- Every product that existed before this workflow shipped was never "reviewed" through it - it
-- simply enters the catalog pre-approved, with a real sequential VP code assigned in creation
-- order (arbitrary but stable, matching no other ordering requirement).
SET @code := 10000;
UPDATE `Product`
SET `code` = CONCAT('VP', (@code := @code + 1)), `status` = 'APPROVED'
ORDER BY `createdAt` ASC;

-- Seed ProductCodeCounter so the next admin-approved product continues the sequence with no
-- collision against the codes just assigned above.
INSERT INTO `ProductCodeCounter` (`id`, `value`) VALUES ('singleton', @code)
    ON DUPLICATE KEY UPDATE `value` = @code;

-- One Listing per existing Product, carrying over exactly the seller/city/price/stock/discount/
-- active state it already had. Product.id is preserved unchanged, so every existing OrderItem/
-- Review FK into Product stays valid with no migration of its own needed.
INSERT INTO `Listing` (`id`, `productId`, `sellerId`, `cityId`, `price`, `discountPrice`, `stock`, `isActive`, `createdAt`, `updatedAt`)
SELECT UUID(), `id`, `sellerId`, `cityId`, `price`, `discountPrice`, `stock`, `isActive`, `createdAt`, `updatedAt`
FROM `Product`;

-- ============================================================================
-- 3) CONTRACT: drop the now-redundant Product columns - safe now that every existing row has an
--    equivalent Listing row holding the same data.
-- ============================================================================

-- DropForeignKey
ALTER TABLE `Product` DROP FOREIGN KEY `Product_cityId_fkey`;

-- DropForeignKey
ALTER TABLE `Product` DROP FOREIGN KEY `Product_sellerId_fkey`;

-- DropIndex
DROP INDEX `Product_cityId_categoryId_isActive_idx` ON `Product`;

-- DropIndex
DROP INDEX `Product_sellerId_idx` ON `Product`;

-- AlterTable
ALTER TABLE `Product`
    DROP COLUMN `cityId`,
    DROP COLUMN `discountPrice`,
    DROP COLUMN `isActive`,
    DROP COLUMN `price`,
    DROP COLUMN `sellerId`,
    DROP COLUMN `stock`;
