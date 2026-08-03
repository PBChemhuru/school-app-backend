/*
  Warnings:

  - You are about to drop the column `profilePhoto` on the `Student` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Student" DROP COLUMN "profilePhoto";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "profilePhoto" TEXT;
