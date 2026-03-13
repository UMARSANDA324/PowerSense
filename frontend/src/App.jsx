import Navbar from "./components/Navbar";
import BottomNav from "./components/BottomNav";
import AppRoutes from "./routes/AppRoutes";

function App() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <div className="flex-1 pb-20">
        <AppRoutes />
      </div>
      <BottomNav />
    </div>
  );
}

export default App;