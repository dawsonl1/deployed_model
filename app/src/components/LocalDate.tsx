"use client";

export function LocalDate({ date, showTime = false }: { date: string; showTime?: boolean }) {
  const d = new Date(date);
  return <>{showTime ? d.toLocaleString() : d.toLocaleDateString()}</>;
}
