import { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { warmCache } from "./lib/warm.js";
import { Home } from "./pages/Home.jsx";
import { AllRoutines } from "./pages/AllRoutines.jsx";
import { RoutineDetail } from "./pages/RoutineDetail.jsx";
import { RoutineMilestones } from "./pages/RoutineMilestones.jsx";
import { Session } from "./pages/Session.jsx";
import { AllHabits } from "./pages/AllHabits.jsx";
import { HabitDetail } from "./pages/HabitDetail.jsx";
import { Profile } from "./pages/Profile.jsx";
import { AddRoutine } from "./pages/AddRoutine.jsx";
import { AddHabit } from "./pages/AddHabit.jsx";

export default function App() {
  useEffect(() => {
    // Best-effort background warm-up - a transient network hiccup here
    // shouldn't surface as an unhandled rejection.
    warmCache().catch(() => {});
  }, []);

  return (
    <div className="app-shell">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/routines" element={<AllRoutines />} />
        <Route path="/routines/new" element={<AddRoutine />} />
        <Route path="/routines/:routineId" element={<RoutineDetail />} />
        <Route path="/routines/:routineId/session" element={<Session />} />
        <Route path="/routines/:routineId/milestones" element={<RoutineMilestones />} />
        <Route path="/habits" element={<AllHabits />} />
        <Route path="/habits/new" element={<AddHabit />} />
        <Route path="/habits/:habitId" element={<HabitDetail />} />
        <Route path="/habits/:habitId/edit" element={<AddHabit />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </div>
  );
}
