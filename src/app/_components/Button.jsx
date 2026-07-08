import Link from "next/link";

export default function Button({ href, type, onClick, disabled, className, children }) {
  // Clases base combinadas con la propiedad className para que sea flexible
  const baseClasses = `block bg-blue-600 text-center text-white font-bold font-poppins text-lg p-3 border rounded-xl hover:bg-blue-700 transition-colors duration-200 shadow-lg disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center justify-center ${
    className || "w-[55%] m-auto md:text-xl md:p-3 lg:p-5"
  }`;

  // Si le pasamos un onClick o un type (como "submit"), renderizamos un <button> real
  if (onClick || type) {
    return (
      <button
        type={type || "button"}
        onClick={onClick}
        disabled={disabled}
        className={baseClasses}
      >
        {children}
      </button>
    );
  }

  // Si no tiene type ni onClick, asumimos que es para navegar y usamos <Link>
  return (
    <Link href={href || "#"} className={baseClasses}>
      {children}
    </Link>
  );
}