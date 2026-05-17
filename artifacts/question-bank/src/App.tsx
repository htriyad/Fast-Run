import { Route, Switch } from "wouter";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import { AppLayout } from "@/components/layout/AppLayout";
import Dashboard from "@/pages/Dashboard";
import Folders from "@/pages/Folders";
import FolderDetail from "@/pages/FolderDetail";
import SetDetail from "@/pages/SetDetail";
import ImportPage from "@/pages/ImportPage";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppLayout>
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/folders" component={Folders} />
            <Route path="/folders/:id" component={FolderDetail} />
            <Route path="/sets/:id" component={SetDetail} />
            <Route path="/import" component={ImportPage} />
            <Route component={NotFound} />
          </Switch>
        </AppLayout>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
