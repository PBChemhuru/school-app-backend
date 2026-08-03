/*
  Warnings:

  - The `qualifications` column on the `Teacher` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "address" TEXT,
ADD COLUMN     "medicalNotes" TEXT;

-- AlterTable
ALTER TABLE "Teacher" DROP COLUMN "qualifications",
ADD COLUMN     "qualifications" JSONB;
