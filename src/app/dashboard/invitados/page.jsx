"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import Button from "@/app/_components/Button";
import H2 from "@/app/_components/H2";
import { supabase } from "@/app/_lib/supabase/supabase";
import GraduadoFormModal from "@/app/_components/GraduadoFormModal";
import CuentaDetalleModal from "@/app/_components/CuentaDetalleModal";
import Swal from "sweetalert2";
import { Eye, Trash2 } from "lucide-react"; // <-- Importamos los iconos

export default function InvitadosPage() {
  const [graduados, setGraduados] = useState([]);
  const [precios, setPrecios] = useState({ costo_adulto: 0, costo_nino: 0 });
  const [loading, setLoading] = useState(true);
  
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [cuentaSeleccionada, setCuentaSeleccionada] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const { data: configData } = await supabase.from('precios_configuracion').select('*').limit(1).single();
      if (configData) setPrecios(configData);

      const { data: gradData, error: gradError } = await supabase
        .from('graduados')
        .select(`*, invitados (*)`)
        .order('creado_en', { ascending: false });

      if (gradError) throw gradError;
      setGraduados(gradData);
    } catch (error) {
      console.error("Error cargando datos:", error);
    }
  }, []); 

  useEffect(() => {
    const loadInitialData = async () => {
      await fetchData();
      setLoading(false);
    };
    loadInitialData();
  }, [fetchData]);

  const handleRefreshData = useCallback(async () => {
    setLoading(true);
    await fetchData();
    setLoading(false);
  }, [fetchData]);

  const handleModalCloseAndRefresh = () => {
    setIsNewModalOpen(false);
    setCuentaSeleccionada(null);
    handleRefreshData();
  };

  // 🟢 NUEVA FUNCIÓN: Eliminar Graduado con SweetAlert2
  const handleDeleteGraduado = async (graduado) => {
    const confirmacion = await Swal.fire({
      title: `¿Borrar a ${graduado.nombre_completo.split(' ')[0]}?`,
      text: "Se eliminará su registro, todos sus invitados y el historial de pagos. ¡Esta acción no se puede deshacer!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444", // red-500 de Tailwind
      cancelButtonColor: "#94a3b8", // slate-400
      confirmButtonText: "Sí, borrar cuenta",
      cancelButtonText: "Cancelar"
    });

    if (confirmacion.isConfirmed) {
      setLoading(true);
      try {
        const { error } = await supabase
          .from('graduados')
          .delete()
          .eq('id', graduado.id);

        if (error) throw error;

        Swal.fire({
          title: "¡Eliminado!",
          text: "La cuenta y sus invitados fueron borrados correctamente.",
          icon: "success",
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000
        });

        handleRefreshData();
      } catch (error) {
        console.error("Error al borrar:", error);
        Swal.fire("Error", "No se pudo borrar la cuenta.", "error");
        setLoading(false);
      }
    }
  };

  const totales = useMemo(() => {
    let esperado = 0;
    let recaudado = 0;

    const costoAdulto = Number(precios.costo_adulto) || 0;
    const costoNino = Number(precios.costo_nino) || 0;

    graduados.forEach((graduado) => {
      esperado += costoAdulto;
      if (graduado.pagado) recaudado += costoAdulto;

      if (graduado.invitados && graduado.invitados.length > 0) {
        graduado.invitados.forEach((invitado) => {
          const costoInvitado = invitado.es_nino ? costoNino : costoAdulto;
          esperado += costoInvitado;
          if (invitado.pagado) recaudado += costoInvitado;
        });
      }
    });

    return { esperado, recaudado, porRecaudar: esperado - recaudado };
  }, [graduados, precios]);

  return (
    <div className="p-6 md:p-10 w-full max-w-7xl mx-auto flex flex-col gap-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <H2>Gestión de Graduados e Invitados</H2>
          <p className="text-gray-500 text-sm mt-1">Control general de asistencia y pagos.</p>
        </div>
        <Button onClick={() => setIsNewModalOpen(true)} className="!w-auto !m-0 !px-6">
          + Registrar Graduado
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center">
          <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Total Esperado</span>
          <span className="text-3xl font-bold text-gray-800 mt-2">
            ${totales.esperado.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-green-100 flex flex-col justify-center relative overflow-hidden">
          <span className="text-sm font-semibold text-green-600 uppercase tracking-wider relative z-10">Total Recaudado</span>
          <span className="text-3xl font-bold text-green-700 mt-2 relative z-10">
            ${totales.recaudado.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-red-100 flex flex-col justify-center relative overflow-hidden">
          <span className="text-sm font-semibold text-red-500 uppercase tracking-wider relative z-10">Por Recaudar</span>
          <span className="text-3xl font-bold text-red-600 mt-2 relative z-10">
            ${totales.porRecaudar.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-700 uppercase font-semibold">
              <tr>
                <th className="px-6 py-4">Graduado</th>
                <th className="px-6 py-4">Invitados</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="3" className="text-center py-8 text-gray-400">Cargando datos...</td>
                </tr>
              ) : graduados.length === 0 ? (
                <tr>
                  <td colSpan="3" className="text-center py-8 text-gray-400">No hay graduados registrados.</td>
                </tr>
              ) : (
                graduados.map((graduado) => (
                  <tr key={graduado.id} className="border-t border-gray-100 hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-black text-slate-800">{graduado.nombre_completo}</td>
                    <td className="px-6 py-4 font-medium text-slate-500">
                      {graduado.invitados?.length || 0} personas
                    </td>
                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                      {/* Botón de VER CUENTA (Ojo) */}
                      <button 
                        onClick={() => setCuentaSeleccionada(graduado)}
                        className="bg-blue-50 text-blue-600 hover:bg-blue-100 p-2.5 rounded-lg transition-colors"
                        title="Ver detalles de la cuenta"
                      >
                        <Eye size={20} />
                      </button>
                      
                      {/* Botón de BORRAR (Basura) */}
                      <button 
                        onClick={() => handleDeleteGraduado(graduado)}
                        className="bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 p-2.5 rounded-lg transition-colors"
                        title="Eliminar graduado"
                      >
                        <Trash2 size={20} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isNewModalOpen && (
        <GraduadoFormModal 
          onClose={() => setIsNewModalOpen(false)} 
          onSaved={handleModalCloseAndRefresh}
          precios={precios}
        />
      )}

      {cuentaSeleccionada && (
        <CuentaDetalleModal
          graduado={cuentaSeleccionada}
          onClose={() => setCuentaSeleccionada(null)}
          onSaved={handleModalCloseAndRefresh}
          precios={precios}
        />
      )}
    </div>
  );
}