import "@/app/globals.css"; // <-- Vital para que cargue Tailwind

export const metadata = {
  title: "Comité de Graduación | Panel de Gestión",
  description: "Sistema de gestión de invitados y pagos para la graduación",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className="antialiased bg-slate-50">{children}</body>
    </html>
  );
}