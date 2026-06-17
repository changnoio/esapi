import { Arc, SetupField, StructureMatch, TargetLevel, newArc, newSetupField } from "../lib/types";

function num(v: string): number {
  return v === "" ? 0 : Number(v);
}

export function ArcsEditor(props: { arcs: Arc[]; onChange: (a: Arc[]) => void }) {
  const { arcs, onChange } = props;
  const update = (i: number, patch: Partial<Arc>) =>
    onChange(arcs.map((a, idx) => (idx === i ? { ...a, ...patch } : a)));
  const remove = (i: number) => onChange(arcs.filter((_, idx) => idx !== i));
  const add = () => onChange([...arcs, newArc(`A${arcs.length + 1}`)]);

  const sectorsToText = (s: Array<[number, number]>) =>
    s.map(([a, b]) => `${a}-${b}`).join(", ");
  const textToSectors = (t: string): Array<[number, number]> =>
    t
      .split(/[,;]/)
      .map((p) => p.trim())
      .filter((p) => p && !/^no$/i.test(p))
      .map((p) => p.split("-").map((x) => Number(x.trim())))
      .filter((arr) => arr.length === 2 && arr.every(Number.isFinite))
      .map((arr) => [arr[0], arr[1]] as [number, number]);

  return (
    <div className="table-editor">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Coll°</th>
            <th>Gantry start</th>
            <th>Gantry stop</th>
            <th>Dir</th>
            <th>Dose rate</th>
            <th>X1</th>
            <th>Y1</th>
            <th>X2</th>
            <th>Y2</th>
            <th>Avoid sectors</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {arcs.map((a, i) => (
            <tr key={i}>
              <td><input className="w-sm" value={a.id} onChange={(e) => update(i, { id: e.target.value })} /></td>
              <td><input className="w-xs" type="number" value={a.collimatorAngle} onChange={(e) => update(i, { collimatorAngle: num(e.target.value) })} /></td>
              <td><input className="w-xs" type="number" value={a.gantryStart} onChange={(e) => update(i, { gantryStart: num(e.target.value) })} /></td>
              <td><input className="w-xs" type="number" value={a.gantryStop} onChange={(e) => update(i, { gantryStop: num(e.target.value) })} /></td>
              <td>
                <select value={a.direction} onChange={(e) => update(i, { direction: e.target.value as Arc["direction"] })}>
                  <option value="CW">CW</option>
                  <option value="CCW">CCW</option>
                </select>
              </td>
              <td><input className="w-xs" type="number" value={a.doseRate} onChange={(e) => update(i, { doseRate: num(e.target.value) })} /></td>
              <td><input className="w-xs" type="number" value={a.x1} onChange={(e) => update(i, { x1: num(e.target.value) })} /></td>
              <td><input className="w-xs" type="number" value={a.y1} onChange={(e) => update(i, { y1: num(e.target.value) })} /></td>
              <td><input className="w-xs" type="number" value={a.x2} onChange={(e) => update(i, { x2: num(e.target.value) })} /></td>
              <td><input className="w-xs" type="number" value={a.y2} onChange={(e) => update(i, { y2: num(e.target.value) })} /></td>
              <td><input className="w-md" value={sectorsToText(a.avoidSectors)} placeholder="e.g. 300-250, 70-110" onChange={(e) => update(i, { avoidSectors: textToSectors(e.target.value) })} /></td>
              <td><button className="btn-del" onClick={() => remove(i)} title="Remove arc">×</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className="btn-add" onClick={add}>+ Add arc</button>
    </div>
  );
}

export function SetupEditor(props: { fields: SetupField[]; onChange: (f: SetupField[]) => void }) {
  const { fields, onChange } = props;
  const update = (i: number, patch: Partial<SetupField>) =>
    onChange(fields.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  const remove = (i: number) => onChange(fields.filter((_, idx) => idx !== i));
  const add = () => onChange([...fields, newSetupField(`Setup ${fields.length + 1}`)]);

  return (
    <div className="table-editor">
      <table>
        <thead>
          <tr><th>ID</th><th>Gantry°</th><th>X1</th><th>Y1</th><th>X2</th><th>Y2</th><th></th></tr>
        </thead>
        <tbody>
          {fields.map((f, i) => (
            <tr key={i}>
              <td><input className="w-lg" value={f.id} onChange={(e) => update(i, { id: e.target.value })} /></td>
              <td><input className="w-xs" type="number" value={f.gantry} onChange={(e) => update(i, { gantry: num(e.target.value) })} /></td>
              <td><input className="w-xs" type="number" value={f.x1} onChange={(e) => update(i, { x1: num(e.target.value) })} /></td>
              <td><input className="w-xs" type="number" value={f.y1} onChange={(e) => update(i, { y1: num(e.target.value) })} /></td>
              <td><input className="w-xs" type="number" value={f.x2} onChange={(e) => update(i, { x2: num(e.target.value) })} /></td>
              <td><input className="w-xs" type="number" value={f.y2} onChange={(e) => update(i, { y2: num(e.target.value) })} /></td>
              <td><button className="btn-del" onClick={() => remove(i)} title="Remove field">×</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className="btn-add" onClick={add}>+ Add setup field</button>
    </div>
  );
}

export function TargetLevelsEditor(props: { levels: TargetLevel[]; onChange: (l: TargetLevel[]) => void }) {
  const { levels, onChange } = props;
  const update = (i: number, patch: Partial<TargetLevel>) =>
    onChange(levels.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const remove = (i: number) => onChange(levels.filter((_, idx) => idx !== i));
  const add = () => onChange([...levels, { structureId: "", dose: 0, unit: "Gy" }]);

  return (
    <div className="table-editor">
      <table>
        <thead>
          <tr><th>Patient structure ID</th><th>Dose</th><th>Unit</th><th></th></tr>
        </thead>
        <tbody>
          {levels.map((l, i) => (
            <tr key={i}>
              <td><input className="w-lg" value={l.structureId} onChange={(e) => update(i, { structureId: e.target.value })} /></td>
              <td><input className="w-sm" type="number" value={l.dose} onChange={(e) => update(i, { dose: num(e.target.value) })} /></td>
              <td><input className="w-xs" value={l.unit} onChange={(e) => update(i, { unit: e.target.value })} /></td>
              <td><button className="btn-del" onClick={() => remove(i)} title="Remove">×</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className="btn-add" onClick={add}>+ Add target level</button>
    </div>
  );
}

export function StructureMatchesEditor(props: { matches: StructureMatch[]; onChange: (m: StructureMatch[]) => void }) {
  const { matches, onChange } = props;
  const update = (i: number, patch: Partial<StructureMatch>) =>
    onChange(matches.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));
  const remove = (i: number) => onChange(matches.filter((_, idx) => idx !== i));
  const add = () => onChange([...matches, { patientId: "", modelId: "" }]);

  return (
    <div className="table-editor">
      <table>
        <thead>
          <tr><th>Patient structure ID</th><th>RapidPlan model structure ID</th><th></th></tr>
        </thead>
        <tbody>
          {matches.map((m, i) => (
            <tr key={i}>
              <td><input className="w-lg" value={m.patientId} onChange={(e) => update(i, { patientId: e.target.value })} /></td>
              <td><input className="w-lg" value={m.modelId} onChange={(e) => update(i, { modelId: e.target.value })} /></td>
              <td><button className="btn-del" onClick={() => remove(i)} title="Remove">×</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className="btn-add" onClick={add}>+ Add structure match</button>
    </div>
  );
}

export function SuggestedEditor(props: { items: string[]; onChange: (s: string[]) => void }) {
  return (
    <textarea
      className="suggested"
      rows={4}
      value={props.items.join("\n")}
      placeholder="One patient structure ID per line"
      onChange={(e) =>
        props.onChange(
          e.target.value
            .split("\n")
            .map((s) => s.trim())
            .filter((s) => s !== "")
        )
      }
    />
  );
}
