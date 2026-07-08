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
  Cell
} from "recharts";
import {
  TrendingUp,
  Wallet,
  Clock,
  Landmark,
  Users,
  CheckCircle2,
} from "lucide-react";

export default function Dashboard() {
  const [usuarioActivo, setUsuarioActivo] = useState(null);
  const [graduados, setGraduados] = useState([]);
  const [precios, setPrecios] = useState({ costo_adulto: 0, costo_nino: 0 });
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const inicializar = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) return;

        // Traer perfil (para saber quién del comité está logueado)
        const { data: perfil } = await supabase
          .from("perfiles")
          .select("*")
          .eq("id", session.user.id)
          .single();
        setUsuarioActivo(perfil);

        // Traer precios configurados
        const { data: configData } = await supabase
          .from('precios_configuracion')
          .select('*')
          .limit(1)
          .single();
        if (configData) setPrecios(configData);

        // Traer graduados e invitados
        const { data: gradData } = await supabase
          .from('graduados')
          .select(`*, invitados (*)`);
        setGraduados(gradData || []);
        
      } catch (error) {
        console.error("Error cargando dashboard:", error);
      } finally {
        setCargando(false);
      }
    };
    inicializar();
  }, []);

  // --- LÓGICA DE CÁLCULOS MATEMÁTICOS ---
  const metricas = useMemo(() => {
    let esperado = 0;
    let recaudado = 0;
    let totalAdultos = 0;
    let totalNinos = 0;

    const costoAdulto = Number(precios.costo_adulto) || 0;
    const costoNino = Number(precios.costo_nino) || 0;

    // Arreglo para la gráfica de "Top Graduados"
    const graduadosStats = [];

    graduados.forEach((graduado) => {
      let esperadoGrad = costoAdulto;
      let recaudadoGrad = graduado.pagado ? costoAdulto : 0;
      let cantInvitados = graduado.invitados ? graduado.invitados.length : 0;
      
      totalAdultos += 1; // El graduado cuenta como adulto

      esperado += costoAdulto;
      if (graduado.pagado) recaudado += costoAdulto;

      if (graduado.invitados) {
        graduado.invitados.forEach((inv) => {
          const costoInv = inv.es_nino ? costoNino : costoAdulto;
          esperado += costoInv;
          esperadoGrad += costoInv;
          
          if (inv.es_nino) totalNinos += 1;
          else totalAdultos += 1;

          if (inv.pagado) {
            recaudado += costoInv;
            recaudadoGrad += costoInv;
          }
        });
      }

      graduadosStats.push({
        nombre: graduado.nombre_completo.split(" ")[0], // Solo el primer nombre para la gráfica
        esperado: esperadoGrad,
        pagado: recaudadoGrad,
        pendiente: esperadoGrad - recaudadoGrad,
        invitados: cantInvitados
      });
    });

    // Ordenar para tener a los graduados con cuentas más grandes primero
    graduadosStats.sort((a, b) => b.esperado - a.esperado);

    return {
      esperado,
      recaudado,
      pendiente: esperado - recaudado,
      totalAsistentes: totalAdultos + totalNinos,
      totalAdultos,
      totalNinos,
      topGraduados: graduadosStats.slice(0, 7) // Tomamos solo los top 7 para que la gráfica no se sature
    };
  }, [graduados, precios]);

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(amount);

  // Datos para la gráfica de pastel (Recaudado vs Pendiente)
  const datosPastel = [
    { name: "Recaudado", value: metricas.recaudado, color: "#10b981" },
    { name: "Falta por Cobrar", value: metricas.pendiente, color: "#f97316" }
  ];

  if (cargando) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-700 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-[90rem] mx-auto space-y-8">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-200 pb-6 gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <TrendingUp className="text-blue-700" /> Panel del Comité Organizador
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Resumen global de asistencia y recaudación para la graduación.
          </p>
        </div>
        <div className="bg-blue-50 text-blue-800 border border-blue-100 rounded-xl px-4 py-2 flex items-center shadow-sm gap-2 font-bold text-sm">
          <Users size={18} />
          {metricas.totalAsistentes} Asistentes Confirmados
        </div>
      </div>

      {/* Tarjetas de Resumen Global */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Recaudado */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-5 relative overflow-hidden group">
          <div className="absolute right-[-20px] top-[-20px] opacity-5 group-hover:opacity-10 transition-opacity">
            <Wallet size={120} />
          </div>
          <div className="p-4 bg-emerald-50 text-emerald-600 rounded-xl z-10">
            <CheckCircle2 size={28} />
          </div>
          <div className="z-10">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
              Total Recaudado (Llevamos)
            </p>
            <p className="text-3xl font-black text-emerald-600 mt-1">
              {formatCurrency(metricas.recaudado)}
            </p>
          </div>
        </div>

        {/* Pendiente */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-5 relative overflow-hidden group">
          <div className="absolute right-[-20px] top-[-20px] opacity-5 group-hover:opacity-10 transition-opacity">
            <Clock size={120} />
          </div>
          <div className="p-4 bg-orange-50 text-orange-600 rounded-xl z-10">
            <Clock size={28} />
          </div>
          <div className="z-10">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
              Falta por Cobrar (Deben)
            </p>
            <p className="text-3xl font-black text-orange-600 mt-1">
              {formatCurrency(metricas.pendiente)}
            </p>
          </div>
        </div>

        {/* Total Esperado */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-5 relative overflow-hidden group">
          <div className="absolute right-[-20px] top-[-20px] opacity-5 group-hover:opacity-10 transition-opacity">
            <Landmark size={120} />
          </div>
          <div className="p-4 bg-blue-50 text-blue-600 rounded-xl z-10">
            <Landmark size={28} />
          </div>
          <div className="z-10">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
              Meta Total Esperada
            </p>
            <p className="text-3xl font-black text-[#131b2e] mt-1">
              {formatCurrency(metricas.esperado)}
            </p>
          </div>
        </div>
      </div>

      {/* Gráficas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Gráfica de Pastel: Balance */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-1 flex flex-col">
          <h3 className="font-bold text-slate-800 text-sm uppercase tracking-widest mb-4 border-b border-slate-100 pb-3">
            Balance de Recaudación
          </h3>
          <div className="flex-1 w-full min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={datosPastel}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {datosPastel.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfica de Barras: Cuentas de Graduados */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-2 flex flex-col">
          <h3 className="font-bold text-slate-800 text-sm uppercase tracking-widest mb-4 border-b border-slate-100 pb-3 flex justify-between">
            <span>Cuentas por Graduado (Top 7)</span>
          </h3>
          <div className="flex-1 w-full min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={metricas.topGraduados}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis 
                  dataKey="nombre" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: "#64748b", fontSize: 12, fontWeight: "bold" }} 
                  dy={10} 
                />
                <YAxis 
                  tickFormatter={(value) => `$${value}`} 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: "#64748b", fontSize: 12 }} 
                />
                <Tooltip 
                  formatter={(value) => formatCurrency(value)}
                  cursor={{ fill: "#f8faf9" }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend wrapperStyle={{ paddingTop: "20px", fontSize: "12px", fontWeight: "bold" }} />
                <Bar dataKey="pagado" name="Ya Pagaron" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} maxBarSize={60} />
                <Bar dataKey="pendiente" name="Falta por Pagar" stackId="a" fill="#f97316" radius={[4, 4, 0, 0]} maxBarSize={60} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}