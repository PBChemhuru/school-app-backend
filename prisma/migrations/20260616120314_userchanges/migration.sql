/*
  Warnings:

  - The `relationship` column on the `ParentStudent` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "ParentStudent" DROP COLUMN "relationship",
ADD COLUMN     "relationship" "ParentRelationship";
