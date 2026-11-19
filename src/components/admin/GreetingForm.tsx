"use client";

import Link from "next/link";
import { useActionState } from "react";
import { saveGreeting, type GreetingFormState } from "@/app/admin/greetings/actions";
import { GREETING_STYLES, greetingStyleLabel, type Greeting } from "@/lib/greetings";

function Err({ list }: { list?: string[] }) {
  return list?.length ? <span className="error">{list.join(" ")}</span> : null;
}

/** ISO → "YYYY-MM-DDTHH:MM" in Pakistan time, for datetime-local inputs. */
const toLocal = (iso: string) => new Date(Date.parse(iso) + 5 * 3_600_000).toISOString().slice(0, 16);

/** Create or edit a greeting (lib/greetings.ts). */
export default function GreetingForm({ greeting }: { greeting?: Greeting }) {
  const [state, action, pending] = useActionState<GreetingFormState, FormData>(saveGreeting, undefined);
  const e = state?.errors ?? {};
  return (
    <form action={action} className="panel p-4 flex flex-col gap-4 max-w-2xl" noValidate>
      {greeting && <input name="id" type="hidden" value={greeting.id} />}
      {state?.message && (
        <p className="notice notice-bad" role="alert">
          {state.message}
        </p>
      )}
      <label className="field">
        Greeting
        <input className="input" defaultValue={greeting?.message} maxLength={40} name="message" placeholder="Eid Mubarak" />
        <Err list={e.message} />
      </label>
      <label className="field">
        Short line under it <span className="muted font-normal">(optional, shown when no sale is running)</span>
        <input className="input" defaultValue={greeting?.line} maxLength={100} name="line" placeholder="Wishing you and your family joy and peace." />
        <Err list={e.line} />
      </label>
      <label className="field">
        Occasion
        <select defaultValue={greeting?.style ?? "eid"} name="style">
          {GREETING_STYLES.map((s) => (
            <option key={s} value={s}>
              {greetingStyleLabel[s]}
            </option>
          ))}
        </select>
        <span className="muted text-xs">Sets what falls gently inside the plaque. During a sale it wins over the sale&apos;s motif; choose None to show the sale&apos;s instead.</span>
        <Err list={e.style} />
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="field">
          Starts (Pakistan time)
          <input className="input" defaultValue={greeting ? toLocal(greeting.startsAt) : ""} name="startsAt" type="datetime-local" />
          <Err list={e.startsAt} />
        </label>
        <label className="field">
          Ends (Pakistan time)
          <input className="input" defaultValue={greeting ? toLocal(greeting.endsAt) : ""} name="endsAt" type="datetime-local" />
          <Err list={e.endsAt} />
        </label>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="field">
          Link text <span className="muted font-normal">(optional)</span>
          <input className="input" defaultValue={greeting?.linkLabel} maxLength={30} name="linkLabel" placeholder="Shop the Eid Edit" />
          <Err list={e.linkLabel} />
        </label>
        <label className="field">
          Link page <span className="muted font-normal">(optional)</span>
          <input className="input" defaultValue={greeting?.linkHref} name="linkHref" placeholder="/collections" />
          <Err list={e.linkHref} />
        </label>
      </div>
      <p className="muted text-[13px]">
        With no sale running, the greeting fills the hanging plaque on the home page. During a sale, it sits on a small gold scroll above the sale
        plaque. One greeting shows at a time: if two overlap, the newest wins.
      </p>
      <div className="flex gap-2">
        <button className="btn btn-primary" disabled={pending} type="submit">
          {pending ? "Saving…" : greeting ? "Save changes" : "Create greeting"}
        </button>
        <Link className="btn" href="/admin/greetings">
          Cancel
        </Link>
      </div>
    </form>
  );
}
