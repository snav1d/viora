/*
  Warnings:

  - You are about to alter the column `placement` on the `Banner` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(6))` to `Enum(EnumId(15))`.

*/
-- AlterTable
-- Renaming HOME_TOP -> HOME_HERO (plus adding HOME_PROMO_STRIP/SERVICES_HERO) is done as
-- widen -> migrate data -> narrow, all in this one migration file, so `prisma migrate deploy`
-- never needs a manual step in between (unlike the categoryId migration two phases ago - see
-- docs/decisions.md ADR 44's "Rejected" note and ADR 45).
ALTER TABLE `Banner` MODIFY `placement` ENUM('HOME_TOP', 'HOME_HERO', 'HOME_PROMO_STRIP', 'SERVICES_HERO') NOT NULL DEFAULT 'HOME_HERO';
UPDATE `Banner` SET `placement` = 'HOME_HERO' WHERE `placement` = 'HOME_TOP';
ALTER TABLE `Banner` MODIFY `placement` ENUM('HOME_HERO', 'HOME_PROMO_STRIP', 'SERVICES_HERO') NOT NULL DEFAULT 'HOME_HERO';

-- AlterTable
ALTER TABLE `Category` ADD COLUMN `defaultCommissionRate` DECIMAL(5, 2) NULL;

-- AlterTable
ALTER TABLE `Coupon` ADD COLUMN `userId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Order` ADD COLUMN `contactPhone` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `ServiceProviderProfile` ADD COLUMN `approvedAt` DATETIME(3) NULL;

-- CreateIndex
CREATE INDEX `Coupon_userId_idx` ON `Coupon`(`userId`);

-- AddForeignKey
ALTER TABLE `Coupon` ADD CONSTRAINT `Coupon_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
