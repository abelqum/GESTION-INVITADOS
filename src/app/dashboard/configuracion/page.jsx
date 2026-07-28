"use client";
import { useState, useEffect } from "react";
import Button from "@/app/_components/Button";
import H2 from "@/app/_components/H2";
import { supabase } from "@/app/_lib/supabase/supabase";
import Swal from "sweetalert2";
import { Users, DollarSign, Target } from "lucide-react";

export default function ConfiguracionPrecios() {
  const [configId, setConfigId] = useState(null);
  const [costoAdulto, setCostoAdulto] = useState("");
  const [costoNino, setCostoNino] = useState("");
  const [metaAdultos, setMetaAdultos] = useState(""); // 🟢 NUEVO ESTADO
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const cargarPrecios = async () => {
      try {
        const { data } = await supabase
          .from("precios_configuracion")
          .select("*")
          .limit(1)
          .single();
        if (data) {
          setConfigId(data.id);
          setCostoAdulto(data.costo_adulto);
          setCostoNino(data.costo_nino);
          setMetaAdultos(data.meta_adultos || ""); // 🟢 CARGAMOS LA META
        }
      } catch (error) {
        console.error("Error cargando configuración:", error);
      } finally {
        setCargando(false);
      }
    };
    cargarPrecios();
  }, []);

  const handleGuardar = async (e) => {
    e.preventDefault();
    setGuardando(true);

    try {
      if (configId) {
        const { error } = await supabase
          .from("precios_configuracion")
          .update({
            costo_adulto: Number(costoAdulto),
            costo_nino: Number(costoNino),
            meta_adultos: Number(metaAdultos), // 🟢 GUARDAMOS LA META
            actualizado_en: new Date().toISOString(),
          })
          .eq("id", configId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("precios_configuracion")
          .insert([
            {
              costo_adulto: Number(costoAdulto),
              costo_nino: Number(costoNino),
              meta_adultos: Number(metaAdultos),
            },
          ])
          .select()
          .single();
        if (error) throw error;
        if (data) setConfigId(data.id);
      }
      Swal.fire({
        title: "¡Guardado!",
        text: "La configuración ha sido actualizada.",
        icon: "success",
        confirmButtonColor: "#10b981",
      });
    } catch (error) {
      Swal.fire({
        title: "Error",
        text: "No se pudieron guardar los datos.",
        icon: "error",
        confirmButtonColor: "#d33",
      });
    } finally {
      setGuardando(false);
    }
  };

  if (cargando)
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-700 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );

  return (
    <div className="p-6 md:p-10 w-full max-w-4xl mx-auto flex flex-col gap-8">
      <div>
        <H2>Configuración General</H2>
        <p className="text-slate-500 text-sm mt-1">
          Establece los costos de los boletos y la meta de asistencia.
        </p>
      </div>

      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200">
        <form onSubmit={handleGuardar} className="flex flex-col gap-6 max-w-md">
          <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl space-y-4">
            <h3 className="font-bold text-blue-800 flex items-center gap-2 text-sm uppercase tracking-widest">
              <DollarSign size={16} /> Precios Base
            </h3>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Costo por Adulto ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={costoAdulto}
                onChange={(e) => setCostoAdulto(e.target.value)}
                className="w-full border-2 p-2.5 rounded-lg focus:border-blue-600 outline-none font-bold text-slate-800 bg-white"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Costo por Niño ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={costoNino}
                onChange={(e) => setCostoNino(e.target.value)}
                className="w-full border-2 p-2.5 rounded-lg focus:border-blue-600 outline-none font-bold text-slate-800 bg-white"
                required
              />
            </div>
          </div>

          <div className="p-4 bg-purple-50 border border-purple-100 rounded-xl space-y-4">
            <h3 className="font-bold text-purple-800 flex items-center gap-2 text-sm uppercase tracking-widest">
              <Target size={16} /> Objetivos del Evento
            </h3>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Meta Total de Adultos (Lugares)
              </label>
              <input
                type="number"
                min="1"
                value={metaAdultos}
                onChange={(e) => setMetaAdultos(e.target.value)}
                className="w-full border-2 p-2.5 rounded-lg focus:border-purple-600 outline-none font-bold text-slate-800 bg-white"
                required
                placeholder="Ej. 200"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={guardando}
            className="w-full h-12 text-lg"
          >
            {guardando ? "Guardando..." : "Guardar Configuración"}
          </Button>
        </form>
      </div>
    </div>
  );
}
