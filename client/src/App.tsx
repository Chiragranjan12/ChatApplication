import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { ProtectedRoute } from "@/components/protected-route";

import LandingPage from "@/pages/landing";
import AuthPage from "@/pages/auth";
import VerifyEmailPage from "@/pages/verify-email";
import ChatPage from "@/pages/chat";
import RandomChatPage from "@/pages/random-chat";
import NotFound from "@/pages/not-found";
import ChatLayout from "@/components/chat-layout";

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/verify-email" component={VerifyEmailPage} />

      {/* Protected Chat Routes */}
      <Route path="/chat">
        <ProtectedRoute>
          <ChatLayout>
            <ChatPage />
          </ChatLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/random">
        <ProtectedRoute>
          <ChatLayout>
            <RandomChatPage />
          </ChatLayout>
        </ProtectedRoute>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

import { DevModeBanner } from "@/components/dev-mode-banner";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <DevModeBanner />
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
