import { BrowserRouter, Route, Routes } from "react-router-dom";
import { createTheme, CssBaseline, ThemeProvider } from "@mui/material";
import { Host } from "./Host";
import { Join } from "./Join";
import { LanguageProvider } from "./i18n";
import { ModeSelect } from "./components/ModeSelect";
import { ReceiverPage } from "./components/ReceiverPage";

const theme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#8b7cff" },
    secondary: { main: "#55d6be" },
    background: { default: "#080a12", paper: "rgba(20, 24, 39, 0.72)" },
  },
  typography: { fontFamily: '"Inter", "Segoe UI", sans-serif' },
  shape: { borderRadius: 20 },
  components: {
    MuiButton: { defaultProps: { disableElevation: true } },
    MuiPaper: { styleOverrides: { root: { backgroundImage: "none" } } },
  },
});

export function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LanguageProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<ModeSelect />} />
            <Route path="/host" element={<Host />} />
            <Route path="/host/:roomId" element={<Host />} />
            <Route path="/receive/:roomId" element={<ReceiverPage />} />
            <Route path="/:roomId" element={<Join />} />
          </Routes>
        </BrowserRouter>
      </LanguageProvider>
    </ThemeProvider>
  );
}
