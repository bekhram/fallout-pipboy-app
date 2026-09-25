import React from "react";
import { useTranslation } from "react-i18next";
import { WINTER_TERRAIN, WINTER_OBSTACLES, WINTER_CONDITIONS } from "../../utils/winterOfAtomRules.js";
import GmProceduralRoomDescriptionsV4 from "./GmProceduralRoomDescriptionsV4.jsx";
import "./gmReferenceScreen.css";

const COPY={
  en:{title:"GM REFERENCE",subtitle:"Quick rules, hazards and procedural room notes",terrain:"TERRAIN / OBSTACLES",conditions:"CONDITIONS",rooms:"ROOM DESCRIPTIONS"},
  ru:{title:"ПОДСКАЗКИ ГМУ",subtitle:"Быстрые правила, опасности и описания процедурных комнат",terrain:"МЕСТНОСТЬ / ПРЕПЯТСТВИЯ",conditions:"УСЛОВИЯ",rooms:"ОПИСАНИЕ КОМНАТ"},
  uk:{title:"ПІДКАЗКИ ГМУ",subtitle:"Швидкі правила, небезпеки та описи процедурних кімнат",terrain:"МІСЦЕВІСТЬ / ПЕРЕШКОДИ",conditions:"УМОВИ",rooms:"ОПИС КІМНАТ"},
  pl:{title:"ŚCIĄGA MG",subtitle:"Szybkie zasady, zagrożenia i opisy proceduralnych pomieszczeń",terrain:"TEREN / PRZESZKODY",conditions:"WARUNKI",rooms:"OPISY POMIESZCZEŃ"},
};
function lang(value){const code=String(value||"en").toLowerCase().split("-")[0];return COPY[code]?code:"en";}

export default function GmReferenceScreen({session}){
  const {i18n}=useTranslation();
  const text=COPY[lang(i18n.resolvedLanguage||i18n.language)];
  return <section className="gm-reference-screen">
    <header className="gm-reference-screen__head"><span>PIP / 2D20 // GM</span><h2>[ {text.title} ]</h2><p>{text.subtitle}</p></header>
    <div className="gm-reference-screen__grid">
      <article className="pip-panel gm-reference-card gm-reference-card--terrain">
        <h3>[ {text.terrain} ]</h3>
        {[...WINTER_TERRAIN,...WINTER_OBSTACLES].map(item=><div key={item.id} className="gm-reference-row"><span>{item.label}</span><b>{item.ap} AP</b></div>)}
      </article>
      <article className="pip-panel gm-reference-card gm-reference-card--conditions">
        <h3>[ {text.conditions} ]</h3>
        {WINTER_CONDITIONS.map(item=><div key={item.id} className="gm-reference-condition"><strong>{item.label}</strong><span>{item.effect}</span></div>)}
      </article>
      <article className="gm-reference-card gm-reference-card--rooms">
        <GmProceduralRoomDescriptionsV4 session={session}/>
      </article>
    </div>
  </section>;
}
