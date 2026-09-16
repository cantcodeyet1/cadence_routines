-- DropIndex
DROP INDEX "RoutineSession_routineId_date_key";

-- CreateIndex
CREATE INDEX "RoutineSession_routineId_date_idx" ON "RoutineSession"("routineId", "date");
