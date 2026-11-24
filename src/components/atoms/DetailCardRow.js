export default function DetailCardRow({ label, value }) {
  return (
    <div className="flex">
      <div className="w-[100px] text-[12px] text-[var(--muted)]">{label}</div>
      <div className="flex-1 text-[12px] font-bold text-[color:var(--fg)]">{value}</div>
    </div>
  );
}