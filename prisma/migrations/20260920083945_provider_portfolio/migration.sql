-- CreateTable
CREATE TABLE `ProviderPortfolioImage` (
    `id` VARCHAR(191) NOT NULL,
    `providerId` VARCHAR(191) NOT NULL,
    `imageUrl` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ProviderPortfolioImage_providerId_idx`(`providerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ProviderPortfolioImage` ADD CONSTRAINT `ProviderPortfolioImage_providerId_fkey` FOREIGN KEY (`providerId`) REFERENCES `ServiceProviderProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
