import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";

import LandingPage from "@/pages/landing";
import AuthPage from "@/pages/auth";
import ChatPage from "@/pages/chat";
import RandomChatPage from "@/pages/random-chat";
import NotFound from "@/pages/not-found";
import ChatLayout from "@/components/chat-layout";

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/auth" component={AuthPage} />
      
      {/* Protected Chat Routes */}
      <Route path="/chat">
        <ChatLayout>
          <ChatPage />
        </ChatLayout>
      </Route>
      
      <Route path="/random">
        <ChatLayout>
          <RandomChatPage />
        </ChatLayout>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
