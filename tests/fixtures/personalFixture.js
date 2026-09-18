import { newCampaign, publicCampaign } from '../../server/campaignState.js';
import { createSettlement } from '../../src/utils/settlementState.js';
import { newRecord, mergeSnapshot } from '../../src/cloud/settlementOfflineProtocol.js';
import { newLocalCharacter } from '../../src/cloud/characterReservationState.js';
import { personalQuote } from '../../src/utils/personalConstruction.js';
export const personalUid='personal_player_1', personalCampaignId='campaign_111122223333444455556666', sourceId='personal_source_123', deviceId='personal_device_123';
export function personalFixture() {
  const now=Date.now();
  const form={_localCharacterId:sourceId,name:'Personal fixture',caps:'1000',inventoryItems:[
    {sourceType:'crafting_material',materialTier:'common',quantity:'100',name:'Common Materials',category:'junk',weight:'1',customNote:'retain metadata'},
    {sourceType:'crafting_material',materialTier:'uncommon',quantity:'100',name:'Uncommon Materials',category:'junk',weight:'1'},
    {sourceType:'crafting_material',materialTier:'rare',quantity:'100',name:'Rare Materials',category:'junk',weight:'1'},
    {name:'Ordinary item',quantity:'1',category:'misc',sourceType:'other'},
  ],skills:{Repair:{rank:6},Science:{rank:6}},perksAndTraits:[],special:{charisma:4}};
  const c=newCampaign(personalCampaignId,personalUid,'Personal fixture',now);
  c.accounts[personalUid]={...structuredClone(form),id:personalUid,constructionSource:{characterId:sourceId,deviceId,credits:{caps:0,common:0,uncommon:0,rare:0}}};
  const s=createSettlement({name:'Shared fixture',regionId:'commonwealth',worldX:1,worldY:1,ownerCharacterId:personalUid});
  s.id='settlement_personal_fixture';s.campaignId=c.id;s.constructionUpdatedAt=now;c.settlements=[s];
  const record=mergeSnapshot(newRecord(personalUid,c.id,deviceId),publicCampaign(c,personalUid),now);
  record.lastSyncAt=now;record.sourceCharacterId=sourceId;
  const character=newLocalCharacter(form);character.boundUid=personalUid;character.boundCampaignId=c.id;
  return {c,s,record,character,form,now};
}
export function personalBuild(s,buildingType='small_house',x=0,y=0) {
  const command={type:'buildPersonal',sourceId,buildingType,x,y};
  command.quote=personalQuote(s,command).amounts;
  return {type:'settlement',settlementId:s.id,command};
}
