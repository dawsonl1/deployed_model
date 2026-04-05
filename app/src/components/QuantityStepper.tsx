"use client";

import { useState } from "react";

export default function QuantityStepper({ name, max = 99 }: { name: string; max?: number }) {
  const [qty, setQty] = useState(0);

  function decrement() {
    setQty((q) => Math.max(0, q - 1));
  }

  function increment() {
    setQty((q) => Math.min(max, q + 1));
  }

  return (
    <div className="qty-stepper" data-active={qty > 0 || undefined}>
      <button type="button" onClick={decrement} className="qty-btn qty-btn-minus" disabled={qty === 0}>
        &minus;
      </button>
      <input
        type="number"
        name={name}
        value={qty}
        onChange={(e) => {
          const v = parseInt(e.target.value);
          if (!isNaN(v) && v >= 0 && v <= max) setQty(v);
        }}
        min={0}
        max={max}
        className="qty-input"
      />
      <button type="button" onClick={increment} className="qty-btn qty-btn-plus" disabled={qty >= max}>
        +
      </button>
    </div>
  );
}
