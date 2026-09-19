import React,{useState} from 'react';
import { useTranslation } from 'react-i18next';
import MapScreenCore from './MapScreenCore.jsx';
import OfflineSettlementHub from '../settlement/OfflineSettlementHub.jsx';
import './mapSettlement.css';

const COPY={
  en:{menu:'SETTLEMENTS',open:'OPEN OFFLINE SETTLEMENTS',back:'BACK TO PERSONAL MAP',offline:'LOCAL ONLY'},
  ru:{menu:'ПОСЕЛЕНИЯ',open:'ОТКРЫТЬ ОФЛАЙН ПОСЕЛЕНИЯ',back:'НАЗАД К ЛИЧНОЙ КАРТЕ',offline:'ТОЛЬКО ЛОКАЛЬНО'},
  uk:{menu:'ПОСЕЛЕННЯ',open:'ВІДКРИТИ ОФЛАЙН ПОСЕЛЕННЯ',back:'НАЗАД ДО ОСОБИСТОЇ МАПИ',offline:'ЛИШЕ ЛОКАЛЬНО'},
  pl:{menu:'OSADY',open:'OTWÓRZ OSADY OFFLINE',back:'WRÓĆ DO MAPY OSOBISTEJ',offline:'TYLKO LOKALNIE'},
};

export default function MapScreen(props){
  const {i18n}=useTranslation();
  const language=String(i18n.resolvedLanguage||i18n.language||'en').split('-')[0];
  const text=COPY[language]||COPY.en;
  const [settlementsOpen,setSettlementsOpen]=useState(false);
  return <div className="pip-map-with-settlement-menu">
    <div className="pip-map-settlement-toolbar">
      <span className="pip-map-settlement-toolbar__title">⌂ {text.menu} <small className="pip-map-settlement-toolbar__offline">{text.offline}</small></span>
      <button type="button" className="pip-action-button pip-map-settlement-toolbar__button" onClick={()=>setSettlementsOpen(value=>!value)}>
        {settlementsOpen?`← ${text.back}`:text.open}
      </button>
    </div>
    {settlementsOpen?<OfflineSettlementHub character={props.character} onCharacterChange={props.onCharacterChange} onBack={()=>setSettlementsOpen(false)}/>:<MapScreenCore {...props}/>} 
  </div>;
}