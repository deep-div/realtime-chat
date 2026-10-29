import { AppLayout } from "./components/layout/AppLayout";
import { AuthProvider } from "./features/auth/context/AuthContext";
import { ChatProvider } from "./features/chat/context/ChatContext";

function App() {
  return (
    <AuthProvider>
      <ChatProvider>
        <AppLayout />
      </ChatProvider>
    </AuthProvider>
  );
}

export default App;
