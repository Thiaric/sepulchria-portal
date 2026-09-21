"use client";

import { useEffect,useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { WarpingPriceDefinition } from "@/lib/warping/warping-price-types";

let cache:WarpingPriceDefinition[]|null=null;
let loadedAt=0;
let pending:Promise<WarpingPriceDefinition[]>|null=null;

async function loadPrices(){
  if(cache&&Date.now()-loadedAt<30000)return cache;
  if(pending)return pending;

  pending=(async()=>{
    const db=createClient();
    const {data,error}=await db
      .from("warping_prices")
      .select("key,number,name,stage,duration_days,manifestation")
      .order("number");

    if(error)throw new Error(error.message);

    cache=(data??[]).map((row)=>({
      key:String(row.key),
      number:Number(row.number),
      name:String(row.name),
      stage:Number(row.stage),
      durationDays:Number(row.duration_days),
      manifestation:String(row.manifestation??""),
    }));

    loadedAt=Date.now();
    return cache;
  })();

  try{
    return await pending;
  }finally{
    pending=null;
  }
}

export function useWarpingPrices(){
  const [prices,setPrices]=useState<WarpingPriceDefinition[]>(cache??[]);

  useEffect(()=>{
    let active=true;

    void loadPrices()
      .then((next)=>{
        if(active)setPrices(next);
      })
      .catch((error)=>{
        console.error("Unable to load Warping Prices:",error);
      });

    return()=>{active=false;};
  },[]);

  return prices;
}
