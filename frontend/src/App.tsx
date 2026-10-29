import { AppLayout } from "./components/layout/AppLayout";
import { AuthProvider } from "./features/auth/context/AuthContext";

function App() {
  return (
    <AuthProvider>
      <AppLayout />
    </AuthProvider>
  );
}

export default App;
