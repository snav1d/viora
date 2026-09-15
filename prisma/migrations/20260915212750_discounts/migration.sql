-- AlterTable
ALTER TABLE `Order` ADD COLUMN `couponId` VARCHAR(191) NULL,
    ADD COLUMN `discountAmount` DECIMAL(12, 0) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `Product` ADD COLUMN `discountPrice` DECIMAL(12, 0) NULL;

-- CreateTable
CREATE TABLE `Coupon` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `type` ENUM('PERCENTAGE', 'FIXED_AMOUNT') NOT NULL,
    `value` DECIMAL(12, 0) NOT NULL,
    `maxDiscountAmount` DECIMAL(12, 0) NULL,
    `minOrderAmount` DECIMAL(12, 0) NULL,
    `maxRedemptions` INTEGER NULL,
    `maxRedemptionsPerUser` INTEGER NULL,
    `startsAt` DATETIME(3) NULL,
    `endsAt` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Coupon_code_key`(`code`),
    INDEX `Coupon_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Order_couponId_idx` ON `Order`(`couponId`);

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_couponId_fkey` FOREIGN KEY (`couponId`) REFERENCES `Coupon`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
