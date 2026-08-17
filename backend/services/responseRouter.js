import { templates } from "./responseTemplates.js";

/**
 * Litha Response Routing Engine.
 * Selects the appropriate template builder based on intent and language, and runs it with context data.
 */
export const routeResponse = ({ intent, context, isHausa }) => {
  const lang = isHausa ? "ha" : "en";
  
  // Resolve template group for the detected intent (or fallback to general chat)
  const templateGroup = templates[intent] || templates.GENERAL_CHAT;
  const builder = templateGroup[lang] || templateGroup.en;
  
  // Execute template generator with live context data
  const text = builder(context);
  
  console.log("\n[RESPONSE TEMPLATE DEBUG]");
  console.log(`Intent: ${intent}`);
  console.log(`Selected Template: ${intent}_TEMPLATE`);
  console.log(`Power Status: ${context.feederStatus ? context.feederStatus.toUpperCase() : "UNKNOWN"}`);
  console.log(`Maintenance: ${context.maintenanceActive ? "ACTIVE" : "INACTIVE"}`);
  console.log(`Outages: ${context.activeOutages ? context.activeOutages.length : 0}`);
  console.log(`\nGenerated Template:\n${text}\n`);
  
  return text;
};

export default { routeResponse };
