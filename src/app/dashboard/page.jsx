"use client";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/app/_lib/supabase/supabase";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  TrendingUp,
  Clock,
  Landmark,
  CheckCircle2,
  Baby,
  User,
  Target,
} from "lucide-react";

export default function Dashboard() {
  const [graduados, setGraduados] = useState([]);
  const [abonos, setAbonos] = useState([]);
  const [precios, setPrecios] = useState({
    costo_adulto: 0,
    costo_nino: 0,
    meta_adultos: 100,
  });
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const inicializar = async () => {
      try {
        const { data: configData } = await supabase
          .from("precios_configuracion")
          .select("*")
          .limit(1)
          .single();
        if (configData) setPrecios(configData);

        const { data: gradData } = await supabase
          .from("graduados")
          .select(`*, invitados (*)`);
        setGraduados(gradData || []);

        const { data: abonosData } = await supabase.from("abonos").select("*");
        setAbonos(abonosData || []);
      } catch (error) {
        console.error("Error cargando dashboard:", error);
      } finally {
        setCargando(false);
      }
    };
    inicializar();
  }, []);

  const metricas = useMemo(() => {
    let esperado = 0;
    let totalAdultos = 0;
    let totalNinos = 0;

    const costoAdulto = Number(precios.costo_adulto) || 0;
    const costoNino = Number(precios.costo_nino) || 0;
    const metaAdultos = Number(precios.meta_adultos) || 1;

    // 1. Agrupar el dinero real (Abonos) por Graduado
    const dineroPorGraduado = {};
    let recaudadoGlobal = 0;

    abonos.forEach((abono) => {
      const monto = Number(abono.monto);
      recaudadoGlobal += monto;
      if (!dineroPorGraduado[abono.graduado_id])
        dineroPorGraduado[abono.graduado_id] = 0;
      dineroPorGraduado[abono.graduado_id] += monto;
    });

    const graduadosStats = [];

    // 2. Calcular lo esperado y la asistencia
    graduados.forEach((graduado) => {
      let esperadoGrad = costoAdulto;
      totalAdultos += 1;
      esperado += costoAdulto;

      if (graduado.invitados) {
        graduado.invitados.forEach((inv) => {
          const costoInv = inv.es_nino ? costoNino : costoAdulto;
          esperado += costoInv;
          esperadoGrad += costoInv;

          if (inv.es_nino) totalNinos += 1;
          else totalAdultos += 1;
        });
      }

      const recaudadoGrad = dineroPorGraduado[graduado.id] || 0;

      // Agregamos la inicial del apellido por si hay dos con el mismo nombre (ej. "Juan P.")
      const nombresSplit = graduado.nombre_completo.split(" ");
      const nombreCorto =
        nombresSplit[0] +
        (nombresSplit[1] ? ` ${nombresSplit[1].charAt(0)}.` : "");

      graduadosStats.push({
        nombre: nombreCorto,
        esperado: esperadoGrad,
        pagado: recaudadoGrad,
        pendiente: esperadoGrad - recaudadoGrad,
      });
    });

    // Ordenamos de mayor a menor cuenta
    graduadosStats.sort((a, b) => b.esperado - a.esperado);

    let porcentajeMeta = (totalAdultos / metaAdultos) * 100;
    if (porcentajeMeta > 100) porcentajeMeta = 100;

    return {
      esperado,
      recaudado: recaudadoGlobal,
      pendiente: esperado - recaudadoGlobal,
      totalAdultos,
      totalNinos,
      metaAdultos,
      porcentajeMeta,
      // 🟢 AHORA MANDAMOS TODOS, YA NO USAMOS EL SLICE(0,7)
      estadisticasMesa: graduadosStats,
    };
  }, [graduados, abonos, precios]);

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount);

  const datosFinanzas = [
    { name: "Recaudado", value: metricas.recaudado, color: "#10b981" },
    {
      name: "Falta por Cobrar",
      value: Math.max(0, metricas.pendiente),
      color: "#f97316",
    },
  ];

  const datosAsistencia = [
    { name: "Adultos", value: metricas.totalAdultos, color: "#3b82f6" },
    { name: "Niños", value: metricas.totalNinos, color: "#a855f7" },
  ];

  if (cargando)
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-700 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );

  return (
    <div className="max-w-[90rem] mx-auto space-y-8">
      {/* Cabecera */}
      <div className="border-b border-slate-200 pb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <TrendingUp className="text-blue-700" /> Panel del Comité
            Organizador
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Resumen de recaudación real mediante abonos y estadísticas de
            asistentes.
          </p>
        </div>
      </div>

      {/* Tarjetas de Resumen Global (Finanzas) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-5">
          <div className="p-4 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 size={28} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
              Total Abonado
            </p>
            <p className="text-3xl font-black text-emerald-600 mt-1">
              {formatCurrency(metricas.recaudado)}
            </p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-5">
          <div className="p-4 bg-orange-50 text-orange-600 rounded-xl">
            <Clock size={28} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
              Falta por Cobrar
            </p>
            <p className="text-3xl font-black text-orange-600 mt-1">
              {formatCurrency(metricas.pendiente)}
            </p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-5">
          <div className="p-4 bg-slate-50 text-slate-700 rounded-xl">
            <Landmark size={28} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
              Cuenta Global Esperada
            </p>
            <p className="text-3xl font-black text-[#131b2e] mt-1">
              {formatCurrency(metricas.esperado)}
            </p>
          </div>
        </div>
      </div>

      {/* TARJETAS: ASISTENCIA Y META */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tarjeta Meta Adultos con Barra de Progreso */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-blue-200 bg-gradient-to-br from-white to-blue-50/30">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-600 text-white rounded-lg shadow-md">
                <Target size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-blue-600 uppercase tracking-widest">
                  Meta de Adultos
                </p>
                <p className="text-2xl font-black text-slate-800">
                  {metricas.totalAdultos}{" "}
                  <span className="text-sm text-slate-400 font-bold">
                    / {metricas.metaAdultos}
                  </span>
                </p>
              </div>
            </div>
            <span className="font-black text-blue-600 text-lg">
              {metricas.porcentajeMeta.toFixed(0)}%
            </span>
          </div>

          <div className="w-full bg-blue-100 rounded-full h-3.5 mb-1 overflow-hidden border border-blue-200">
            <div
              className="bg-blue-600 h-3.5 rounded-full transition-all duration-1000 ease-out relative"
              style={{ width: `${metricas.porcentajeMeta}%` }}
            >
              <div className="absolute top-0 right-0 bottom-0 left-0 bg-white/20 animate-pulse"></div>
            </div>
          </div>
          <p className="text-[10px] text-slate-500 font-bold text-right">
            Faltan {Math.max(0, metricas.metaAdultos - metricas.totalAdultos)}{" "}
            lugares para la meta.
          </p>
        </div>

        {/* Tarjeta Niños */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-purple-200 bg-gradient-to-br from-white to-purple-50/30 flex items-center gap-4">
          <div className="p-4 bg-purple-600 text-white rounded-xl shadow-md">
            <Baby size={32} />
          </div>
          <div>
            <p className="text-xs font-bold text-purple-600 uppercase tracking-widest">
              Asistencia Infantil
            </p>
            <p className="text-3xl font-black text-slate-800 mt-1">
              {metricas.totalNinos}{" "}
              <span className="text-sm font-bold text-slate-500">niños</span>
            </p>
          </div>
        </div>
      </div>

      {/* Gráficas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dona de Dinero */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
          <h3 className="font-bold text-slate-800 text-sm uppercase tracking-widest mb-4 border-b border-slate-100 pb-3">
            Gráfica de pagos y cobranza
          </h3>
          <div className="flex-1 w-full min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={datosFinanzas}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {datosFinanzas.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend verticalAlign="bottom" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Dona de Demografía */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
          <h3 className="font-bold text-slate-800 text-sm uppercase tracking-widest mb-4 border-b border-slate-100 pb-3">
            Gráfica de asistentes: Adultos vs Niños
          </h3>
          <div className="flex-1 w-full min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={datosAsistencia}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {datosAsistencia.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value} personas`} />
                <Legend verticalAlign="bottom" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 🟢 NUEVO: Barras de TODOS los Graduados con Scroll Dinámico */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-3 flex flex-col mt-4 md:mt-0 overflow-hidden">
          <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-widest">
              Estado de Cuentas (Todas las Mesas)
            </h3>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
              {metricas.estadisticasMesa.length} Graduados
            </span>
          </div>

          {/* Contenedor con Scroll Horizontal. El min-width crece según la cantidad de graduados */}
          <div className="flex-1 w-full min-h-[380px] overflow-x-auto overflow-y-hidden scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent pb-4">
            <div
              style={{
                minWidth: Math.max(800, metricas.estadisticasMesa.length * 85),
                height: "100%",
              }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={metricas.estadisticasMesa}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#e2e8f0"
                  />
                  <XAxis
                    dataKey="nombre"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "#64748b", fontWeight: "bold" }}
                    interval={0}
                  />
                  <YAxis
                    tickFormatter={(value) => `$${value}`}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "#64748b" }}
                  />
                  <Tooltip
                    formatter={(value) => formatCurrency(value)}
                    cursor={{ fill: "#f8fafc" }}
                  />
                  <Legend wrapperStyle={{ paddingTop: "20px" }} />
                  <Bar
                    dataKey="pagado"
                    name="Abonado"
                    stackId="a"
                    fill="#10b981"
                    radius={[0, 0, 6, 6]}
                    maxBarSize={50}
                  />
                  <Bar
                    dataKey="pendiente"
                    name="Deuda Restante"
                    stackId="a"
                    fill="#f97316"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={50}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
