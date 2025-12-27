import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Footer } from "@/components/common";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PersonalAI - Your Intelligent Life Assistant",
  description: "AI-powered personal assistant that learns from your data",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased flex flex-col min-h-screen`}>
        <Providers>
          <div className="flex-1">{children}</div>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
