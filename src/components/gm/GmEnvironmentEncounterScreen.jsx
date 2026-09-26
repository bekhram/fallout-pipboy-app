import React from "react";
import TacticalEnvironmentPanel from "./TacticalEnvironmentPanel.jsx";
import {WINTER_TERRAIN,WINTER_OBSTACLES,WINTER_CONDITIONS} from "../../utils/winterOfAtomRules.js";
import "./gmEnvironmentEncounterScreen.css";

const COPY={
 en:{terrain:"TERRAIN / OBSTACLES",conditions:"CONDITIONS"},
 ru:{terrain:"МЕСТНОСТЬ И ПРЕПЯТСТВИЯ",conditions:"УСЛОВИЯ"},
 uk:{terrain:"МІСЦЕВІСТЬ І ПЕРЕШКОДИ",conditions:"УМОВИ"},
 pl:{terrain:"TEREN / PRZESZKODY",conditions:"WARUNKI"}
};

function lang(v){
 const c=String(v||"en").toLowerCase().split("-")[0];
 return COPY[c]?c:"en";
}

export default function GmEnvironmentEncounterScreen({session}){
 const language=lang(session?.language || document?.documentElement?.lang || "en");
 const text=COPY[language];
 const scene=session?.tacticalScene||null;

 return <section className="gm-environment-screen">
   <div className="gm-environment-screen__environment">
     <TacticalEnvironmentPanel scene={scene} session={session}/>
   </div>

   <div className="gm-environment-screen__references">
     <section className="pip-panel gm-environment-reference">
       <h3>{text.terrain}</h3>
       {[...WINTER_TERRAIN,...WINTER_OBSTACLES].slice(0,6).map(item=>
         <div className="gm-environment-reference__row" key={item.id}>
           <span>{item.label}</span><b>{item.ap} AP</b>
         </div>
       )}
     </section>
     <section className="pip-panel gm-environment-reference">
       <h3>{text.conditions}</h3>
       {WINTER_CONDITIONS.slice(0,5).map(item=>
         <div className="gm-environment-condition" key={item.id}>
           <b>{item.label}</b><span>{item.effect}</span>
         </div>
       )}
     </section>
   </div>
 </section>;
}
