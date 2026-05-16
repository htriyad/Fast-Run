import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Home } from "@/pages/Home";
import { FolderView } from "@/pages/FolderView";
import { QuestionSetView } from "@/pages/QuestionSetView";
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Sun, Moon } from "lucide-react";

type Theme = "dark" | "light";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextType>({
  theme: "dark",
  toggleTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function applyTheme(theme: Theme) {
  const html = document.documentElement;
  if (theme === "light") {
    html.classList.add("light");
    html.classList.remove("dark");
  } else {
    html.classList.add("dark");
    html.classList.remove("light");
  }
}

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem("chorcha_theme");
      return (saved === "light" || saved === "dark") ? saved : "dark";
    } catch {
      return "dark";
    }
  });

  useEffect(() => {
    applyTheme(theme);
    try { localStorage.setItem("chorcha_theme", theme); } catch {}
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === "dark" ? "light" : "dark");
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className="fixed top-3 right-3 z-50 w-8 h-8 rounded-xl flex items-center justify-center transition-all
        bg-white/8 hover:bg-white/14 border border-white/10 hover:border-white/20
        light:bg-black/5 light:hover:bg-black/10 light:border-black/10 light:hover:border-black/20
        shadow-sm backdrop-blur-sm"
    >
      {theme === "dark"
        ? <Sun className="w-4 h-4 text-amber-400" />
        : <Moon className="w-4 h-4 text-indigo-500" />
      }
    </button>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/folders/:id" component={FolderView} />
      <Route path="/sets/:id" component={QuestionSetView} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <div className="min-h-[100dvh] bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
              <ThemeToggle />
              <Router />
            </div>
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
