import React from 'react';
import StatusScreen from './StatusScreen.jsx';
import CharacterPrintActions from '../shared/CharacterPrintActions.jsx';

export default function PrintableStatusScreen(props) {
  return <>
    <CharacterPrintActions form={props.form} globalWeapons={props.globalWeapons} />
    <StatusScreen {...props} />
  </>;
}
