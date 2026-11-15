import "./globals.css";
export const metadata = { title: "Smart Attendance", description: "CSE-4B attendance management" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
