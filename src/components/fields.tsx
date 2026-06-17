import { ReactNode } from "react";

export function TextField(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  placeholder?: string;
}) {
  return (
    <label className="field">
      <span className="field-label">{props.label}</span>
      <input
        type="text"
        value={props.value}
        placeholder={props.placeholder}
        onChange={(e) => props.onChange(e.target.value)}
      />
      {props.hint && <span className="field-hint">{props.hint}</span>}
    </label>
  );
}

export function NumberField(props: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  hint?: string;
}) {
  return (
    <label className="field">
      <span className="field-label">{props.label}</span>
      <input
        type="number"
        value={Number.isFinite(props.value) ? props.value : ""}
        step={props.step ?? "any"}
        onChange={(e) => props.onChange(e.target.value === "" ? 0 : Number(e.target.value))}
      />
      {props.hint && <span className="field-hint">{props.hint}</span>}
    </label>
  );
}

export function CheckboxField(props: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="field field-check">
      <input
        type="checkbox"
        checked={props.value}
        onChange={(e) => props.onChange(e.target.checked)}
      />
      <span className="field-label">{props.label}</span>
    </label>
  );
}

export function SelectField(props: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="field">
      <span className="field-label">{props.label}</span>
      <select value={props.value} onChange={(e) => props.onChange(e.target.value)}>
        {props.options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Section(props: { title: string; children: ReactNode; subtitle?: string }) {
  return (
    <section className="section">
      <h2>{props.title}</h2>
      {props.subtitle && <p className="section-sub">{props.subtitle}</p>}
      <div className="section-body">{props.children}</div>
    </section>
  );
}
