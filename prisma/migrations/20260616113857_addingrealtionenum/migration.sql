/*
  Warnings:

  - You are about to drop the column `emergencyContactName` on the `Parent` table. All the data in the column will be lost.
  - You are about to drop the column `emergencyContactPhone` on the `Parent` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ParentRelationship" AS ENUM ('MOTHER', 'FATHER', 'GUARDIAN', 'AUNT', 'UNCLE', 'GRANDPARENT', 'OTHER');

-- AlterTable
ALTER TABLE "Parent" DROP COLUMN "emergencyContactName",
DROP COLUMN "emergencyContactPhone";
