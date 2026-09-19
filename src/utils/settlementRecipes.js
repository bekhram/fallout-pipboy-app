export function knownSettlementRecipes(character){
  return Array.isArray(character?.settlementRecipes)?character.settlementRecipes.filter(Boolean):[];
}
export function knowsSettlementRecipe(character,recipeId){
  return Boolean(recipeId && knownSettlementRecipes(character).includes(recipeId));
}
export function setSettlementRecipeKnown(character,recipeId,known=true){
  if(!recipeId)throw new Error('INVALID_RECIPE');
  const recipes=new Set(knownSettlementRecipes(character));
  if(known)recipes.add(recipeId);else recipes.delete(recipeId);
  return {...character,settlementRecipes:[...recipes].sort()};
}
