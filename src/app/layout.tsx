import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import { ExamDraftProvider } from "./exam-draft-context";
import ThemeProvider from "../components/ThemeProvider";
import SplashScreen from "../components/SplashScreen";
import AppHeader from "../components/AppHeader";
import AppFooter from "../components/AppFooter";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Adaptive Interview Assessment Platform",
  description: "AI-powered adaptive interview screening tool",
  icons: {
    icon: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={spaceGrotesk.variable} data-theme="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t)}else if(window.matchMedia('(prefers-color-scheme:light)').matches){document.documentElement.setAttribute('data-theme','light')}}catch(e){}})()`,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){if(!sessionStorage.getItem('splash-seen')){document.body.classList.add('splash-active')}})()`,
          }}
        />
      </head>
      <body>
        <SplashScreen />
        <ThemeProvider>
          <AppHeader />
          <main style={{ flex: 1 }}>
            <ExamDraftProvider>{children}</ExamDraftProvider>
          </main>
          <AppFooter />
        </ThemeProvider>
      </body>
    </html>
  );
}
