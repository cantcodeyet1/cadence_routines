import { Routes, Route } from "react-router-dom";
import { Home } from "./pages/Home.jsx";
import { RoutineDetail } from "./pages/RoutineDetail.jsx";
import { Session } from "./pages/Session.jsx";
import { AllHabits } from "./pages/AllHabits.jsx";
import { HabitDetail } from "./pages/HabitDetail.jsx";
import { Progress } from "./pages/Progress.jsx";
import { Profile } from "./pages/Profile.jsx";
import { AddRoutine } from "./pages/AddRoutine.jsx";
import { AddHabit } from "./pages/AddHabit.jsx";

export default function App() {
  return (
    <div className="app-shell">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/routines/new" element={<AddRoutine />} />
        <Route path="/routines/:routineId" element={<RoutineDetail />} />
        <Route path="/routines/:routineId/session" element={<Session />} />
        <Route path="/habits" element={<AllHabits />} />
        <Route path="/habits/new" element={<AddHabit />} />
        <Route path="/habits/:habitId" element={<HabitDetail />} />
        <Route path="/progress" element={<Progress />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </div>
  );
}
