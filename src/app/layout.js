import "./globals.css";
import AuthGuard from "@/components/AuthGuard";
import InventuraGuard from "@/components/InventuraGuard";
import BottomNav from "@/components/organisms/BottomNav";
import OfflineBoot from "@/offline/OfflineBoot";
import ConnectionStatus from "@/components/organisms/ConnectionStatus";
import ThemeBoot from "@/components/ThemeBoot";

export const metadata = {
  title: "EIRA Stocktaking",
  description: "Inventura majetku",
};

/** Prevents theme flash before React hydrates. */
const themeInitScript = `(function(){try{var t=localStorage.getItem("settings_theme");var r=document.documentElement;if(t==="light"||t==="dark")r.setAttribute("data-theme",t);else r.removeAttribute("data-theme");}catch(e){}})();`;

export default function RootLayout({ children }) {
  return (
    <html lang="cs" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Round" rel="stylesheet" />
      </head>
      <body className="antialiased">
        <ThemeBoot />
        <OfflineBoot />
        <AuthGuard>
          <InventuraGuard>
            {children}
          </InventuraGuard>
          <BottomNav />
          <ConnectionStatus />
        </AuthGuard>
      </body>
    </html>
  );
}
