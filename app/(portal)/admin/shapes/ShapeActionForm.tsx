"use client";

import {
  useActionState,
  useEffect,
} from "react";
import {
  useRouter,
} from "next/navigation";

import type {
  ShapeActionState,
} from "./actions";

const initialState:ShapeActionState={
  ok:false,
  message:"",
};

export function ShapeActionForm({
  action,
  children,
  submitLabel,
}:{
  action:(
    previous:ShapeActionState,
    formData:FormData,
  )=>Promise<ShapeActionState>;
  children:React.ReactNode;
  submitLabel:string;
}){
  const router=useRouter();

  const [
    state,
    formAction,
    pending,
  ]=useActionState(
    action,
    initialState,
  );

  useEffect(()=>{
    if(
      state.ok&&
      state.submittedAt
    ){
      router.refresh();
    }
  },[
    router,
    state.ok,
    state.submittedAt,
  ]);

  return(
    <form
      action={formAction}
      className="mt-4"
      data-shape-form
    >
      {children}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          disabled={pending}
          className="border border-[rgb(var(--sep-colour-9b7446))] bg-[rgb(var(--sep-colour-2a1d12))] px-4 py-2 text-[9px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-ead1a3))] disabled:opacity-40"
        >
          {pending
            ?"Saving..."
            :submitLabel}
        </button>

        {state.message?(
          <span
            className={
              state.ok
                ?"text-[10px] text-emerald-400"
                :"text-[10px] text-red-400"
            }
          >
            {state.message}
          </span>
        ):null}
      </div>
    </form>
  );
}
