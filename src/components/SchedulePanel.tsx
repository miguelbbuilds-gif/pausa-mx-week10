import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { buildSchedule } from '../domain/schedule';
import { formatMXN } from '../domain/money';
import type { Obligation, PurchaseInput } from '../domain/types';

export function SchedulePanel({
  obligations,
  purchase,
  referenceMonth,
}: {
  obligations: Obligation[];
  purchase: PurchaseInput | null;
  referenceMonth: string;
}) {
  const schedule = buildSchedule(obligations, purchase, referenceMonth);
  const chartData = schedule.months.map((month) => ({
    name: month.shortLabel,
    anotados: month.existingTotal,
    propuesta: month.proposedInstallment,
  }));
  const hasRows = schedule.months.some((month) => month.rows.length > 0 || month.proposedCash > 0);
  const hasCash = schedule.months.some((month) => month.proposedCash > 0);

  if (!hasRows) {
    return (
      <div className="rounded-3xl border border-dashed border-line bg-white px-4 py-8 text-center">
        <p className="font-semibold text-navy">Todavía no hay pagos en los próximos 12 meses.</p>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Anota una obligación o arma una compra en Evaluar. El calendario no consulta otras apps de meses.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {schedule.warnings.length > 0 ? (
        <ul className="grid gap-2 text-sm text-amber">
          {schedule.warnings.map((warning) => <li key={warning}>{warning}</li>)}
        </ul>
      ) : null}
      <div
        className="h-80 w-full min-w-0 rounded-3xl border border-line bg-white p-3"
        role="img"
        aria-label="Gráfica de pagos de los próximos 12 meses. La tabla siguiente tiene los mismos datos."
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid stroke="#e3d9cc" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: '#4e5d6c', fontSize: 12 }} interval={0} angle={-35} height={60} textAnchor="end" />
            <YAxis tick={{ fill: '#4e5d6c', fontSize: 12 }} width={72} />
            <Tooltip formatter={(value) => formatMXN(typeof value === 'number' ? value : Number(value))} />
            <Legend />
            <Bar dataKey="anotados" name="Ya anotados" fill="#10243e" radius={[4, 4, 0, 0]} />
            <Bar dataKey="propuesta" name="Mensualidad propuesta" fill="#0f766e" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {hasCash ? (
        <p className="text-sm leading-relaxed text-muted">
          El pago de contado aparece en la tabla y no en las barras de mensualidad. No es una deuda mensual.
        </p>
      ) : null}
      <div className="overflow-x-auto rounded-3xl border border-line bg-white">
        <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
          <caption className="px-4 py-3 text-left font-semibold text-navy">
            Calendario de 12 meses. Lo ya anotado y la compra propuesta van por separado.
          </caption>
          <thead className="bg-paper text-navy">
            <tr>
              <th scope="col" className="px-3 py-2">Mes</th>
              <th scope="col" className="px-3 py-2">Ya anotados</th>
              <th scope="col" className="px-3 py-2">Mensualidad propuesta</th>
              <th scope="col" className="px-3 py-2">Contado propuesto</th>
              <th scope="col" className="px-3 py-2">Detalle</th>
            </tr>
          </thead>
          <tbody>
            {schedule.months.map((month) => (
              <tr key={month.month} className="border-t border-line">
                <th scope="row" className="px-3 py-2 font-semibold">{month.label}</th>
                <td className="px-3 py-2">{formatMXN(month.existingTotal)}</td>
                <td className="px-3 py-2">{formatMXN(month.proposedInstallment)}</td>
                <td className="px-3 py-2">{formatMXN(month.proposedCash)}</td>
                <td className="px-3 py-2 text-muted">
                  {month.rows.length === 0
                    ? 'Sin pagos'
                    : month.rows.map((row) => `${row.description}: ${formatMXN(row.amount)}`).join(' · ')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
