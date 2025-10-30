import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import Calendar from "./pages/Calendar";
import Chat from "./pages/Chat";
import Groups from "./pages/Groups";
import Timer from "./pages/Timer";
import { Nav } from "./components/Nav";

export function App() {
  return (
    <div className="min-h-screen">
      <Nav />
      <main className="container-max pb-12">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/groups" element={<Groups />} />
          <Route path="/timer" element={<Timer />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
