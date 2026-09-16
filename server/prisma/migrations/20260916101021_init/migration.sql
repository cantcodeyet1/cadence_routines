-- CreateEnum
CREATE TYPE "HabitType" AS ENUM ('TICK', 'COUNTDOWN', 'COUNTUP');

-- CreateTable
CREATE TABLE "Routine" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#7C5CFC',
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "bestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastCompletedDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Routine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoutineDay" (
    "id" TEXT NOT NULL,
    "routineId" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,

    CONSTRAINT "RoutineDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Habit" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "HabitType" NOT NULL DEFAULT 'TICK',
    "targetSec" INTEGER,
    "xpValue" INTEGER NOT NULL DEFAULT 10,
    "colorTag" TEXT NOT NULL DEFAULT '#7C5CFC',
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "bestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastCompletedDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Habit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoutineHabit" (
    "id" TEXT NOT NULL,
    "routineId" TEXT NOT NULL,
    "habitId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "required" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "RoutineHabit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoutineSession" (
    "id" TEXT NOT NULL,
    "routineId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "note" TEXT,

    CONSTRAINT "RoutineSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HabitLog" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "habitId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3),
    "durationSec" INTEGER,
    "note" TEXT,
    "skipped" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "HabitLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RoutineDay_routineId_weekday_key" ON "RoutineDay"("routineId", "weekday");

-- CreateIndex
CREATE UNIQUE INDEX "RoutineHabit_routineId_habitId_key" ON "RoutineHabit"("routineId", "habitId");

-- CreateIndex
CREATE UNIQUE INDEX "RoutineSession_routineId_date_key" ON "RoutineSession"("routineId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "HabitLog_sessionId_habitId_key" ON "HabitLog"("sessionId", "habitId");

-- AddForeignKey
ALTER TABLE "RoutineDay" ADD CONSTRAINT "RoutineDay_routineId_fkey" FOREIGN KEY ("routineId") REFERENCES "Routine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutineHabit" ADD CONSTRAINT "RoutineHabit_routineId_fkey" FOREIGN KEY ("routineId") REFERENCES "Routine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutineHabit" ADD CONSTRAINT "RoutineHabit_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "Habit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutineSession" ADD CONSTRAINT "RoutineSession_routineId_fkey" FOREIGN KEY ("routineId") REFERENCES "Routine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HabitLog" ADD CONSTRAINT "HabitLog_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "RoutineSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HabitLog" ADD CONSTRAINT "HabitLog_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "Habit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
