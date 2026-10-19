import type { Metadata } from "next";
import "@fontsource/geist/400.css";
import "@fontsource/geist/500.css";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/600.css";
import "./globals.css";
import { StudioProvider } from "../components/store";
import { Shell } from "../components/shell";
export const metadata: Metadata = { title: "drishvo.co.in — Studio", description: "A thoughtful studio for educational video." };
export default function Layout({ children }: { children: React.ReactNode }) {
 return <html lang="en"><body><StudioProvider><Shell>{children}</Shell></StudioProvider></body></html>;
}

