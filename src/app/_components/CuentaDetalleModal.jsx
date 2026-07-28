import { useState, useEffect } from "react";
import Button from "@/app/_components/Button";
import { supabase } from "@/app/_lib/supabase/supabase";
import Swal from "sweetalert2";
import {
  Trash2,
  Plus,
  DollarSign,
  Calendar,
  User,
  Baby,
  ShieldCheck,
} from "lucide-react";

export default function CuentaDetalleModal({
  graduado,
  onClose,
  onSaved,
  precios,
}) {
  const [loading, setLoading] = useState(false);

  const [nombreGraduado, setNombreGraduado] = useState(
    graduado.nombre_completo,
  );
  const [graduadoPagado, setGraduadoPagado] = useState(graduado.pagado);
  const [invitados, setInvitados] = useState(graduado.invitados || []);
  const [invitadosEliminados, setInvitadosEliminados] = useState([]);

  const [abonos, setAbonos] = useState([]);
  const [nuevoAbonoMonto, setNuevoAbonoMonto] = useState("");
  const [nuevoAbonoDesc, setNuevoAbonoDesc] = useState("");
  const [cargandoAbonos, setCargandoAbonos] = useState(true);

  // 🟢 NUEVO: Estado para guardar quién es el administrador actual
  const [adminActual, setAdminActual] = useState("Administrador");

  useEffect(() => {
    const fetchDatosIniciales = async () => {
      // 1. Cargar abonos de la persona
      const { data: abonosData, error: abonosError } = await supabase
        .from("abonos")
        .select("*")
        .eq("graduado_id", graduado.id)
        .order("fecha", { ascending: false });

      if (!abonosError && abonosData) setAbonos(abonosData);
      setCargandoAbonos(false);

      // 2. 🟢 NUEVO: Cargar el nombre del usuario (admin) que tiene la sesión iniciada
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: perfil } = await supabase
          .from("perfiles")
          .select("nombre")
          .eq("id", user.id)
          .single();
        if (perfil) {
          // Extraemos solo el primer nombre y apellido para que no sea tan largo
          const nombreCorto = perfil.nombre.split(" ").slice(0, 2).join(" ");
          setAdminActual(nombreCorto);
        }
      }
    };

    fetchDatosIniciales();
  }, [graduado.id]);

  const handleAddInvitado = () => {
    setInvitados([
      ...invitados,
      { id: Date.now(), nombre_completo: "", es_nino: false, pagado: false },
    ]);
  };

  const handleInvitadoChange = (id, field, value) => {
    setInvitados(
      invitados.map((inv) =>
        inv.id === id ? { ...inv, [field]: value } : inv,
      ),
    );
  };

  const removeInvitado = (id) => {
    if (typeof id === "string" && id.length > 15) {
      setInvitadosEliminados([...invitadosEliminados, id]);
    }
    setInvitados(invitados.filter((inv) => inv.id !== id));
  };

  const handleRegistrarAbono = async () => {
    if (
      !nuevoAbonoMonto ||
      isNaN(nuevoAbonoMonto) ||
      Number(nuevoAbonoMonto) <= 0
    ) {
      Swal.fire(
        "Monto inválido",
        "Por favor ingresa una cantidad válida.",
        "warning",
      );
      return;
    }
    setLoading(true);
    try {
      // 🟢 NUEVO: Mandamos el nombre del admin al registrar el abono
      const { data, error } = await supabase
        .from("abonos")
        .insert([
          {
            graduado_id: graduado.id,
            monto: Number(nuevoAbonoMonto),
            descripcion: nuevoAbonoDesc.trim() || "Abono a cuenta",
            registrado_por_nombre: adminActual,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      setAbonos([data, ...abonos]);
      setNuevoAbonoMonto("");
      setNuevoAbonoDesc("");
      Swal.fire({
        title: "Abono registrado",
        icon: "success",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 2500,
      });
    } catch (err) {
      Swal.fire("Error", "No se pudo registrar el abono", "error");
    }
    setLoading(false);
  };

  const handleEliminarAbono = async (id) => {
    const confirm = await Swal.fire({
      title: "¿Borrar este abono?",
      text: "Esta cantidad se restará de lo pagado.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#94a3b8",
      confirmButtonText: "Sí, borrar",
      cancelButtonText: "Cancelar",
    });

    if (confirm.isConfirmed) {
      setLoading(true);
      const { error } = await supabase.from("abonos").delete().eq("id", id);
      if (!error) {
        setAbonos(abonos.filter((a) => a.id !== id));
      }
      setLoading(false);
    }
  };

  // CÁLCULOS MATEMÁTICOS INTEGRADOS
  const costoAdulto = Number(precios.costo_adulto);
  const costoNino = Number(precios.costo_nino);

  const totalAdultosMesa = 1 + invitados.filter((inv) => !inv.es_nino).length;
  const totalNinosMesa = invitados.filter((inv) => inv.es_nino).length;

  const totalEsperado =
    costoAdulto +
    invitados.reduce(
      (acc, inv) => acc + (inv.es_nino ? costoNino : costoAdulto),
      0,
    );
  const totalPagadoReal = abonos.reduce(
    (acc, abono) => acc + Number(abono.monto),
    0,
  );
  const deuda = totalEsperado - totalPagadoReal;

  const handleSave = async () => {
    if (!nombreGraduado.trim()) {
      alert("El nombre del graduado es obligatorio");
      return;
    }
    setLoading(true);

    try {
      const { error: gradError } = await supabase
        .from("graduados")
        .update({ nombre_completo: nombreGraduado, pagado: graduadoPagado })
        .eq("id", graduado.id);
      if (gradError) throw gradError;

      if (invitadosEliminados.length > 0) {
        const { error: deleteError } = await supabase
          .from("invitados")
          .delete()
          .in("id", invitadosEliminados);
        if (deleteError) throw deleteError;
      }

      const nuevosInvitados = [];
      const invitadosExistentes = [];

      invitados.forEach((inv) => {
        if (typeof inv.id === "string" && inv.id.length > 15) {
          invitadosExistentes.push({
            id: inv.id,
            graduado_id: graduado.id,
            nombre_completo: inv.nombre_completo,
            es_nino: inv.es_nino,
            pagado: inv.pagado,
          });
        } else {
          nuevosInvitados.push({
            graduado_id: graduado.id,
            nombre_completo: inv.nombre_completo,
            es_nino: inv.es_nino,
            pagado: inv.pagado,
          });
        }
      });

      if (nuevosInvitados.length > 0)
        await supabase.from("invitados").insert(nuevosInvitados);
      if (invitadosExistentes.length > 0)
        await supabase.from("invitados").upsert(invitadosExistentes);

      Swal.fire({
        title: "Cuenta Actualizada",
        text: "Los cambios se guardaron correctamente.",
        icon: "success",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 3000,
      });
      onSaved();
    } catch (error) {
      console.error("Error guardando:", error);
      Swal.fire("Error", "Hubo un problema al guardar los cambios.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-5xl my-8 shadow-2xl flex flex-col max-h-[95vh] animate-in fade-in zoom-in duration-200 border border-slate-200">
        {/* Cabecera Modal */}
        <div className="p-6 border-b border-slate-100 bg-white flex justify-between items-center rounded-t-2xl shrink-0">
          <div>
            <h3 className="text-2xl font-black text-slate-800 uppercase tracking-widest">
              Cuenta de {nombreGraduado.split(" ")[0]}
            </h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">
              Gestión de invitados y pagos
            </p>
          </div>
          <button
            onClick={onClose}
            className="bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 w-10 h-10 rounded-full flex items-center justify-center transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Cuerpo Scrolleable */}
        <div className="p-6 md:p-8 overflow-y-auto flex-1 bg-slate-50/50">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <div className="xl:col-span-2 space-y-8">
              {/* Sección Graduado */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-600"></div>
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">
                  Información del Graduado
                </h4>
                <div className="flex flex-col md:flex-row gap-6 items-center">
                  <div className="flex-1 w-full">
                    <label className="block text-xs font-bold text-slate-600 mb-2 uppercase">
                      Nombre Completo
                    </label>
                    <input
                      type="text"
                      value={nombreGraduado}
                      onChange={(e) => setNombreGraduado(e.target.value)}
                      className="w-full p-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 font-bold text-slate-800 bg-slate-50 transition-colors"
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
                    <label
                      htmlFor="gradPagado"
                      className="text-sm font-bold text-slate-800 cursor-pointer select-none"
                    >
                      Boleto Confirmado
                    </label>
                  </div>
                </div>
              </div>

              {/* Sección Invitados */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                      Lista de Invitados
                    </h4>
                    <div className="flex gap-2">
                      <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-md text-xs font-bold flex items-center gap-1.5 border border-blue-100">
                        <User size={14} /> {totalAdultosMesa} Adultos
                      </span>
                      <span className="bg-purple-50 text-purple-700 px-3 py-1 rounded-md text-xs font-bold flex items-center gap-1.5 border border-purple-100">
                        <Baby size={14} /> {totalNinosMesa} Niños
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={handleAddInvitado}
                    className="text-sm bg-blue-50 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-100 font-bold transition flex items-center gap-2 border border-blue-100 shrink-0"
                  >
                    <Plus size={16} /> Añadir
                  </button>
                </div>

                <div className="flex flex-col gap-3">
                  {invitados.length === 0 && (
                    <div className="text-center py-8 bg-white rounded-xl border-2 border-dashed border-slate-200">
                      <p className="text-sm text-slate-400 font-medium">
                        No tiene invitados registrados.
                      </p>
                    </div>
                  )}
                  {invitados.map((inv, index) => (
                    <div
                      key={inv.id}
                      className="flex flex-col md:flex-row gap-3 items-center p-3 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-blue-300 transition-colors"
                    >
                      <span className="text-xs font-black text-slate-400 w-6 text-center">
                        {index + 1}
                      </span>

                      <input
                        type="text"
                        value={inv.nombre_completo}
                        onChange={(e) =>
                          handleInvitadoChange(
                            inv.id,
                            "nombre_completo",
                            e.target.value,
                          )
                        }
                        placeholder="Nombre del invitado"
                        className="flex-1 w-full p-2.5 border-2 border-slate-100 rounded-lg text-sm font-bold text-slate-800 focus:outline-none focus:border-blue-500 bg-slate-50"
                      />

                      <select
                        value={inv.es_nino}
                        onChange={(e) =>
                          handleInvitadoChange(
                            inv.id,
                            "es_nino",
                            e.target.value === "true",
                          )
                        }
                        className="p-2.5 border-2 border-slate-100 rounded-lg text-sm font-bold text-slate-800 bg-slate-50 min-w-[110px] outline-none cursor-pointer focus:border-blue-500"
                      >
                        <option value={false}>👨 Adulto</option>
                        <option value={true}>👦 Niño</option>
                      </select>

                      <label
                        className={`flex items-center gap-2 cursor-pointer px-4 py-2.5 border-2 rounded-lg transition-colors select-none w-full md:w-auto justify-center ${inv.pagado ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"}`}
                      >
                        <input
                          type="checkbox"
                          checked={inv.pagado}
                          onChange={(e) =>
                            handleInvitadoChange(
                              inv.id,
                              "pagado",
                              e.target.checked,
                            )
                          }
                          className="w-5 h-5 rounded cursor-pointer accent-emerald-600"
                        />
                        <span className="text-sm font-bold">
                          {inv.pagado ? "Confirmado" : "Pendiente"}
                        </span>
                      </label>

                      <button
                        onClick={() => removeInvitado(inv.id)}
                        className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors w-full md:w-auto flex justify-center"
                        title="Eliminar invitado"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Columna Derecha: Abonos Parciales */}
            <div className="xl:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <DollarSign size={16} className="text-emerald-500" /> Abonos
                Parciales
              </h4>

              <div className="flex flex-col gap-3 mb-6">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
                    Monto a abonar
                  </label>
                  <input
                    type="number"
                    value={nuevoAbonoMonto}
                    onChange={(e) => setNuevoAbonoMonto(e.target.value)}
                    placeholder="$0.00"
                    className="w-full p-2.5 border-2 border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 font-bold text-slate-800 bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
                    Concepto (Opcional)
                  </label>
                  <input
                    type="text"
                    value={nuevoAbonoDesc}
                    onChange={(e) => setNuevoAbonoDesc(e.target.value)}
                    placeholder="Ej. Transferencia..."
                    className="w-full p-2.5 border-2 border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 text-sm font-medium text-slate-800 bg-slate-50"
                  />
                </div>
                <button
                  onClick={handleRegistrarAbono}
                  disabled={loading}
                  className="w-full bg-emerald-100 text-emerald-700 font-bold py-2.5 rounded-lg hover:bg-emerald-200 transition border border-emerald-200 disabled:opacity-50"
                >
                  Registrar Abono
                </button>
              </div>

              {/* Historial de Abonos */}
              <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 scrollbar-thin">
                {cargandoAbonos ? (
                  <p className="text-xs text-slate-400 text-center py-4">
                    Cargando abonos...
                  </p>
                ) : abonos.length === 0 ? (
                  <p className="text-xs text-slate-400 font-medium text-center py-6 border-2 border-dashed border-slate-100 rounded-lg">
                    No hay abonos registrados.
                  </p>
                ) : (
                  abonos.map((abono) => (
                    <div
                      key={abono.id}
                      className="p-3 bg-slate-50 border border-slate-100 rounded-lg group hover:border-slate-300 transition relative"
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-black text-emerald-600">
                          $
                          {Number(abono.monto).toLocaleString("es-MX", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                        <button
                          onClick={() => handleEliminarAbono(abono.id)}
                          className="text-slate-300 hover:text-red-500 transition"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <p className="text-xs font-bold text-slate-700">
                        {abono.descripcion}
                      </p>

                      {/* 🟢 NUEVO: UI para mostrar Fecha y Quién lo registró */}
                      <div className="flex items-center gap-2 mt-2">
                        <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-slate-200">
                          <Calendar size={10} />{" "}
                          {new Date(abono.fecha).toLocaleDateString()}
                        </p>
                        <p
                          className="text-[10px] font-bold text-blue-500 flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded border border-blue-100"
                          title="Registrado por"
                        >
                          <ShieldCheck size={10} />{" "}
                          {abono.registrado_por_nombre || "Admin"}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Modal - Resumen Claro */}
        <div className="p-6 md:p-8 bg-slate-100 rounded-b-2xl flex flex-col md:flex-row justify-between items-center gap-6 border-t border-slate-200 shrink-0">
          <div className="flex flex-wrap justify-center md:justify-start gap-6 md:gap-10 w-full md:w-auto text-sm">
            <div className="flex flex-col min-w-max text-center md:text-left">
              <span className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">
                Cuenta Total
              </span>
              <span className="font-black text-xl md:text-2xl text-slate-800">
                $
                {totalEsperado.toLocaleString("es-MX", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
            <div className="flex flex-col min-w-max text-center md:text-left">
              <span className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">
                Total Pagado
              </span>
              <span className="font-black text-xl md:text-2xl text-emerald-600">
                $
                {totalPagadoReal.toLocaleString("es-MX", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
            <div className="flex flex-col min-w-max text-center md:text-left">
              <span className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">
                Deuda Actual
              </span>
              <span
                className={`font-black text-xl md:text-2xl ${deuda > 0 ? "text-orange-500" : deuda < 0 ? "text-blue-500" : "text-slate-400"}`}
              >
                $
                {Math.abs(deuda).toLocaleString("es-MX", {
                  minimumFractionDigits: 2,
                })}{" "}
                {deuda < 0 && (
                  <span className="text-xs font-bold uppercase ml-1">
                    (A favor)
                  </span>
                )}
              </span>
            </div>
          </div>

          <div className="flex gap-3 w-full md:w-auto shrink-0 mt-4 md:mt-0">
            <button
              onClick={onClose}
              className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors w-full md:w-auto"
            >
              Cerrar
            </button>
            <Button
              onClick={handleSave}
              type="button"
              disabled={loading}
              className="w-full md:w-auto border-none !p-3 !px-8 text-base bg-blue-600 hover:bg-blue-700 shadow-md"
            >
              {loading ? "Actualizando..." : "Guardar Lista"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
