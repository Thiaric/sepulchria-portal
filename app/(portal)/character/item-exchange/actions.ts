"use server";
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";

const val=(f:FormData,n:string)=>String(f.get(n)??"").trim();
const choice=(f:FormData)=>{const [kind,id]=val(f,"recordChoice").split("|");return {kind,id};};
const quantity=(f:FormData)=>Math.max(1,Number.parseInt(val(f,"quantity")||"1",10)||1);
function refresh(){["/character", "/character/item-exchange", "/characters", "/game"].forEach(
  (path) => revalidatePath(path),
);}
function go(error?:string,success?:string,trade?:string):never{const p=new URLSearchParams();if(error)p.set("error",error);if(success)p.set("success",success);if(trade)p.set("trade",trade);redirect(`/character/item-exchange?${p}`);}
async function call(name:string,args:Record<string,unknown>){const s=await createClient();const {data,error}=await s.rpc(name,args);if(error)throw new Error(error.message);return data;}

export async function giveItem(f:FormData){try{const x=choice(f);await call("give_own_inventory_record",{k:x.kind,r:x.id,target:val(f,"targetCharacterId"),q:quantity(f)});refresh();}catch(e){go(e instanceof Error?e.message:"Unable to give Item.");}go(undefined,"Item given successfully.");}
export async function discardItem(f:FormData){try{const x=choice(f);await call("discard_own_inventory_record",{k:x.kind,r:x.id,q:quantity(f)});refresh();}catch(e){go(e instanceof Error?e.message:"Unable to discard Item.");}go(undefined,"Item discarded.");}
export async function createTrade(
  f: FormData,
) {
  let tradeId: string;

  try {
    const id = await call(
      "create_item_trade",
      {
        other: val(
          f,
          "otherCharacterId",
        ),
      },
    );

    tradeId = String(id);

    refresh();
  } catch (e) {
    go(
      e instanceof Error
        ? e.message
        : "Unable to start exchange.",
    );
  }

  go(
    undefined,
    undefined,
    tradeId,
  );
}
export async function addOffer(f:FormData){const trade=val(f,"tradeId");try{const x=choice(f);await call("add_item_trade_offer",{tid:trade,k:x.kind,r:x.id,q:quantity(f)});refresh();}catch(e){go(e instanceof Error?e.message:"Unable to add Item.",undefined,trade);}go(undefined,undefined,trade);}
export async function removeOffer(f:FormData){const trade=val(f,"tradeId");try{await call("remove_item_trade_offer",{tid:trade,oid:val(f,"offerId")});refresh();}catch(e){go(e instanceof Error?e.message:"Unable to remove Item.",undefined,trade);}go(undefined,undefined,trade);}
export async function confirmTrade(
  f: FormData,
) {
  const trade = val(
    f,
    "tradeId",
  );

  let completed = false;

  try {
    completed = Boolean(
      await call(
        "confirm_item_trade",
        {
          tid: trade,
        },
      ),
    );

    refresh();
  } catch (e) {
    go(
      e instanceof Error
        ? e.message
        : "Unable to confirm exchange.",
      undefined,
      trade,
    );
  }

  if (completed) {
    go(
      undefined,
      "Exchange completed successfully.",
    );
  }

  go(
    undefined,
    "Your side is confirmed. Waiting for the other character.",
    trade,
  );
}
export async function cancelTrade(f:FormData){try{await call("cancel_item_trade",{tid:val(f,"tradeId")});refresh();}catch(e){go(e instanceof Error?e.message:"Unable to cancel exchange.");}go(undefined,"Exchange cancelled.");}
