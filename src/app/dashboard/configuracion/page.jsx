"use client";
import { useState, useEffect } from "react";
import Button from "@/app/_components/Button"; // <-- ¡Corregido! Sin llaves
import H2 from "@/app/_components/H2";
import { supabase } from "@/app/_lib/supabase/supabase";
import Swal from "sweetalert2";

export default function ConfiguracionPrecios() {
  const [configId, setConfigId] = useState(null);
  const [costoAdulto, setCostoAdulto] = useState("");
  const [costoNino, setCostoNino] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  // Cargar los precios al abrir la página
  useEffect(() => {
    const cargarPrecios = async () => {
      try {
        const { data, error } = await supabase
          .from("precios_configuracion")
          .select("*")
          .limit(1)
          .single();

        if (data) {
          setConfigId(data.id);
          setCostoAdulto(data.costo_adulto);
          setCostoNino(data.costo_nino);
        }
      } catch (error) {
        console.error("Error cargando configuración:", error);
      } finally {
        setCargando(false);
      }
    };

    cargarPrecios();
  }, []);

  // Función para guardar los cambios en Supabase
  const handleGuardar = async (e) => {
    e.preventDefault();
    setGuardando(true);

    try {
      if (configId) {
        // Actualizar los precios existentes
        const { error } = await supabase
          .from("precios_configuracion")
          .update({
            costo_adulto: Number(costoAdulto),
            costo_nino: Number(costoNino),
            actualizado_en: new Date().toISOString(),
          })
          .eq("id", configId);

        if (error) throw error;
      } else {
        // Por si acaso borraron la fila de la BD, la vuelve a crear
        const { data, error } = await supabase
          .from("precios_configuracion")
          .insert([{ costo_adulto: Number(costoAdulto), costo_nino: Number(costoNino) }])
          .select()
          .single();
          
        if (error) throw error;
        if (data) setConfigId(data.id);
      }

      Swal.fire({
        title: "¡Guardado!",
        text: "Los precios han sido actualizados correctamente.",
        icon: "success",
        confirmButtonColor: "#10b981",
      });
    } catch (error) {
      console.error("Error guardando:", error);
      Swal.fire({
        title: "Error",
        text: "No se pudieron guardar los precios.",
        icon: "error",
        confirmButtonColor: "#d33",
      });
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-700 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 w-full max-w-4xl mx-auto flex flex-col gap-8">
      <div>
        <H2>Configuración de Precios</H2>
        <p className="text-gray-500 text-sm mt-1">
          Establece el costo base para los boletos de adulto y niño. Al guardar, se actualizarán automáticamente todos los balances del panel principal.
        </p>
      </div>

      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200">
        <form onSubmit={handleGuardar} className="flex flex-col gap-6 max-w-md">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">
              Costo por Adulto ($)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={costoAdulto}
              onChange={(e) => setCostoAdulto(e.target.value)}
              className="w-full border-2 border-slate-200 p-3 rounded-lg focus:outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700 transition-all text-slate-800 font-medium bg-slate-50"
              placeholder="Ej. 1200.00"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">
              Costo por Niño ($)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={costoNino}
              onChange={(e) => setCostoNino(e.target.value)}
              className="w-full border-2 border-slate-200 p-3 rounded-lg focus:outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700 transition-all text-slate-800 font-medium bg-slate-50"
              placeholder="Ej. 600.00"
              required
            />
          </div>

          <div className="pt-4">
            <Button type="submit" disabled={guardando} className="w-full h-12 text-lg">
              {guardando ? "Guardando cambios..." : "Guardar Precios"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}