-- AlterTable
ALTER TABLE `Review` ADD COLUMN `isApproved` BOOLEAN NOT NULL DEFAULT false;

-- Every review that already existed before this moderation gate shipped was already publicly
-- visible - grandfather them in as approved so this migration doesn't retroactively hide real
-- customer reviews. Only genuinely new reviews (inserted after this migration) start pending.
UPDATE `Review` SET `isApproved` = true;

-- CreateIndex
CREATE INDEX `Review_isApproved_idx` ON `Review`(`isApproved`);
