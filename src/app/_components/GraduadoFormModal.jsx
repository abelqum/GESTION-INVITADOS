import { useState } from "react";
import Button from "@/app/_components/Button";
import { supabase } from "@/app/_lib/supabase/supabase";
import Swal from "sweetalert2"; // <-- Importamos SweetAlert2

export default function GraduadoFormModal({ onClose, onSaved, precios }) {
  const [loading, setLoading] = useState(false);
  const [nombreGraduado, setNombreGraduado] = useState("");
  const [graduadoPagado, setGraduadoPagado] = useState(false);
  const [invitados, setInvitados] = useState([]);

  const handleAddInvitado = () => {
    setInvitados([
      ...invitados,
      { id: Date.now(), nombre_completo: "", es_nino: false, pagado: false }
    ]);
  };

  const handleInvitadoChange = (id, field, value) => {
    setInvitados(invitados.map(inv => 
      inv.id === id ? { ...inv, [field]: value } : inv
    ));
  };

  const removeInvitado = (id) => {
    setInvitados(invitados.filter(inv => inv.id !== id));
  };

  const costoGraduado = Number(precios.costo_adulto); 
  
  const totalEsperado = costoGraduado + invitados.reduce((acc, inv) => {
    return acc + (inv.es_nino ? Number(precios.costo_nino) : Number(precios.costo_adulto));
  }, 0);

  const totalPagado = (graduadoPagado ? costoGraduado : 0) + invitados.reduce((acc, inv) => {
    if (!inv.pagado) return acc;
    return acc + (inv.es_nino ? Number(precios.costo_nino) : Number(precios.costo_adulto));
  }, 0);

  const deuda = totalEsperado - totalPagado;

  const handleSave = async () => {
    if (!nombreGraduado.trim()) {
      Swal.fire({
        title: "Atención",
        text: "El nombre del graduado es obligatorio.",
        icon: "warning",
        confirmButtonColor: "#3b82f6"
      });
      return;
    }
    setLoading(true);

    try {
      const { data: gradData, error: gradError } = await supabase
        .from('graduados')
        .insert([{ nombre_completo: nombreGraduado, pagado: graduadoPagado }])
        .select()
        .single();

      if (gradError) throw gradError;

      if (invitados.length > 0) {
        const invitadosToInsert = invitados.map(inv => ({
          graduado_id: gradData.id,
          nombre_completo: inv.nombre_completo,
          es_nino: inv.es_nino,
          pagado: inv.pagado
        }));
        const { error: invError } = await supabase.from('invitados').insert(invitadosToInsert);
        if (invError) throw invError;
      }
      
      Swal.fire({
        title: "¡Registrado!",
        text: "El graduado y sus invitados se guardaron correctamente.",
        icon: "success",
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000
      });
      
      onSaved(); 
    } catch (error) {
      console.error("Error guardando:", error);
      Swal.fire("Error", "Hubo un problema al guardar los datos.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-4xl my-8 shadow-2xl flex flex-col max-h-[95vh] animate-in fade-in zoom-in duration-200 border border-slate-200">
        
        {/* Cabecera Modal */}
        <div className="p-6 border-b border-slate-100 bg-white flex justify-between items-center rounded-t-2xl">
          <h3 className="text-2xl font-black text-slate-800 uppercase tracking-widest">Registrar Nuevo Graduado</h3>
          <button onClick={onClose} className="bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 w-10 h-10 rounded-full flex items-center justify-center transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        {/* Cuerpo Scrolleable */}
        <div className="p-6 md:p-8 overflow-y-auto flex-1 bg-slate-50/50">
          <div className="mb-8 bg-white p-6 rounded-xl shadow-sm border border-slate-200 relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-600"></div>
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Datos del Graduado</h4>
            <div className="flex flex-col md:flex-row gap-6 items-center">
              <div className="flex-1 w-full">
                <label className="block text-xs font-bold text-slate-600 mb-2 uppercase">Nombre Completo</label>
                <input 
                  type="text" 
                  value={nombreGraduado}
                  onChange={(e) => setNombreGraduado(e.target.value)}
                  className="w-full p-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 font-bold text-slate-800 bg-slate-50 transition-colors"
                  placeholder="Ej. Pablito Pérez"
                />
              </div>
              <div className="flex items-center gap-3 w-full md:w-auto bg-slate-50 p-3 rounded-lg border-2 border-slate-100">
                <input 
                  type="checkbox" 
                  id="gradPagado"
                  checked={graduadoPagado}
                  onChange={(e) => setGraduadoPagado(e.target.checked)}
                  className="w-6 h-6 text-blue-600 rounded focus:ring-blue-500 border-slate-300 cursor-pointer accent-blue-600"
                />
                <label htmlFor="gradPagado" className="text-sm font-bold text-slate-800 cursor-pointer select-none">
                  Boleto Graduado Pagado
                </label>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                Invitados <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">{invitados.length}</span>
              </h4>
              <button 
                onClick={handleAddInvitado}
                className="text-sm bg-blue-50 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-100 font-bold transition flex items-center gap-2 border border-blue-100"
              >
                + Añadir Invitado
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {invitados.length === 0 && (
                <div className="text-center py-8 bg-white rounded-xl border-2 border-dashed border-slate-200">
                  <p className="text-sm text-slate-400 font-medium">Sin invitados registrados aún.</p>
                </div>
              )}
              {invitados.map((inv, index) => (
                <div key={inv.id} className="flex flex-col md:flex-row gap-3 items-center p-3 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-blue-300 transition-colors">
                  <span className="text-xs font-black text-slate-400 w-6 text-center">{index + 1}</span>
                  
                  <input 
                    type="text" 
                    value={inv.nombre_completo}
                    onChange={(e) => handleInvitadoChange(inv.id, 'nombre_completo', e.target.value)}
                    placeholder="Nombre del invitado"
                    className="flex-1 w-full p-2.5 border-2 border-slate-100 rounded-lg text-sm font-bold text-slate-800 focus:outline-none focus:border-blue-500 bg-slate-50"
                  />
                  
                  <select 
                    value={inv.es_nino} 
                    onChange={(e) => handleInvitadoChange(inv.id, 'es_nino', e.target.value === 'true')}
                    className="p-2.5 border-2 border-slate-100 rounded-lg text-sm font-bold text-slate-800 bg-slate-50 min-w-[110px] outline-none cursor-pointer focus:border-blue-500"
                  >
                    <option value={false}>👨 Adulto</option>
                    <option value={true}>👦 Niño</option>
                  </select>

                  <label className={`flex items-center gap-2 cursor-pointer px-4 py-2.5 border-2 rounded-lg transition-colors select-none w-full md:w-auto justify-center ${inv.pagado ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
                    <input 
                      type="checkbox" 
                      checked={inv.pagado}
                      onChange={(e) => handleInvitadoChange(inv.id, 'pagado', e.target.checked)}
                      className="w-5 h-5 rounded cursor-pointer accent-emerald-600"
                    />
                    <span className="text-sm font-bold">{inv.pagado ? "¡Pagado!" : "Falta Pago"}</span>
                  </label>

                  <button 
                    onClick={() => removeInvitado(inv.id)}
                    className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors w-full md:w-auto flex justify-center"
                    title="Eliminar invitado"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Modal - Resumen Claro y Elegante (Sin overflow-x-auto) */}
        <div className="p-6 md:p-8 bg-slate-100 rounded-b-2xl flex flex-col md:flex-row justify-between items-center gap-6 border-t border-slate-200">
          <div className="flex flex-wrap justify-center md:justify-start gap-6 md:gap-10 w-full md:w-auto text-sm">
            <div className="flex flex-col min-w-max text-center md:text-left">
              <span className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Cuenta Total</span>
              <span className="font-black text-xl md:text-2xl text-slate-800">${totalEsperado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex flex-col min-w-max text-center md:text-left">
              <span className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Abonado</span>
              <span className="font-black text-xl md:text-2xl text-emerald-600">${totalPagado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex flex-col min-w-max text-center md:text-left">
              <span className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Deuda Restante</span>
              <span className={`font-black text-xl md:text-2xl ${deuda > 0 ? 'text-orange-500' : 'text-slate-400'}`}>
                ${deuda.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
          
          <div className="flex gap-3 w-full md:w-auto shrink-0 mt-4 md:mt-0">
            <button 
              onClick={onClose}
              className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors w-full md:w-auto"
            >
              Cancelar
            </button>
            <Button 
              onClick={handleSave} 
              type="button"
              disabled={loading}
              className="w-full md:w-auto border-none !p-3 !px-8 text-base bg-blue-600 hover:bg-blue-700 shadow-md"
            >
              {loading ? "Guardando..." : "Guardar Cuenta"}
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}