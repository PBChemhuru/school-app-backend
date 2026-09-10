-- DropForeignKey
ALTER TABLE "ParentStudent" DROP CONSTRAINT "ParentStudent_parentId_fkey";

-- DropForeignKey
ALTER TABLE "ParentStudent" DROP CONSTRAINT "ParentStudent_studentId_fkey";

-- AddForeignKey
ALTER TABLE "ParentStudent" ADD CONSTRAINT "ParentStudent_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Parent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentStudent" ADD CONSTRAINT "ParentStudent_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
