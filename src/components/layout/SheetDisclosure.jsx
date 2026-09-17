import React, { useEffect, useState } from "react";
import SheetIcon from "./SheetIcon.jsx";
export default function SheetDisclosure({title,icon,count,className='',children}) {
  const [desktop,setDesktop]=useState(()=>window.matchMedia('(min-width: 900px)').matches);
  const [expanded,setExpanded]=useState(false);
  useEffect(()=>{const media=window.matchMedia('(min-width: 900px)');const sync=()=>setDesktop(media.matches);media.addEventListener('change',sync);return()=>media.removeEventListener('change',sync);},[]);
  const open=desktop||expanded;
  return <section className={`pip-panel sheet-disclosure ${className}`}>
    <button className="sheet-card-heading sheet-disclosure-toggle" type="button" aria-expanded={open} onClick={()=>{if(!desktop)setExpanded(v=>!v);}}><SheetIcon name={icon}/><span>{title}</span>{count!=null&&<small className="sheet-count">{count}</small>}<SheetIcon name="chevron" className="sheet-disclosure-arrow"/></button>
    <div hidden={!open} className="sheet-disclosure-content">{children}</div>
  </section>;
}
