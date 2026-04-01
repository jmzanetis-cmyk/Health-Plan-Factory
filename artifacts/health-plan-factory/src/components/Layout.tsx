import { ReactNode } from "react";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { DisclaimerBar } from "./DisclaimerBar";

interface LayoutProps {
  children: ReactNode;
  hideFooter?: boolean;
}

export function Layout({ children, hideFooter = false }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--warm-white)" }}>
      <Navbar />
      <main className="flex-1 pt-[84px]">
        {children}
      </main>
      {!hideFooter && <Footer />}
      <DisclaimerBar />
    </div>
  );
}
